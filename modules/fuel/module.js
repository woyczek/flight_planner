// V3 fuel — module Carburant et niveau de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ;
// modules/fuel/SPEC.md, INTEGRATION.md). Deux écrans dans le module :
//   · Devis : cinq blocs visibles sur téléphone (appareil, route, niveau et vent, décision du niveau, résultat
//     collant en bas), le reste replié (détail du devis, consignes de montée, réglages du devis) ;
//   · Fiches : la liste des fiches de performances en lecture seule (famille, ce qui manque, la fiche du vol, « Utiliser ») ;
//     elles se modifient dans Maintenance › Appareils (modules/aircraft/, liens `?app=maintenance#aircraft?sheet=<id>`).
// Calcul pur dans performance_model.js, model.js, levels.js, sheets.js (chargés à la demande, une fois) ; ici seulement
// l'écran, les lectures et écritures par ctx.data, SimBrief par ctx.net, l'identité par ctx.identity. Styles limités au
// module ([data-module="fuel"]) sur les jetons --sog-… du cadre ; aucune feuille globale.
import {
  isIcao,
  isIcaoAlpha
} from '../../frame/lib/ad_field.js'; // SOG-0468 (2) : les règles nommées du code de terrain
import * as XL from '../../frame/lib/external_links.js';
import * as WX from './weather.js';
import * as FPL from './fpl.js'; // SOG-0402 : le message de plan de vol OACI pour la validation d'Eurocontrol
import * as AC from './altn_check.js'; // SOG-0398 : la vérification du terrain de dégagement (piste, moyens, météo)
import * as WIND from '../../frame/lib/wind.js'; // le vent sur une piste : une règle pour Carburant et la Carte (refonte § 10.33 R-F1)
import * as WD from './winds.js';
import * as PG from './progress.js';
import * as RT from '../../frame/lib/route_text.js';
import {
  gcNm,
  rhumbCourse,
  rhumbNm
} from '../../frame/lib/geo.js'; // un direct se vole au compas : distance et cap de chaque tronçon (SOG-0243, Q-0019) ; la distance
// orthodromique, une seule fonction du cadre (SOG-0468 (2))
import * as RM from '../../frame/lib/route_model.js'; // la route lue depuis son texte (refonte § 10.33 R-F4)
import * as RG from '../../frame/lib/routing.js'; // voies aériennes du bouton « Auto » (bibliothèque du cadre)
import * as CF from '../../frame/lib/current_flight.js';
import * as MS from '../../frame/lib/mission.js'; // le vol qu'une mission donne (modules/missions SPEC § 4)
import * as MT from '../../frame/lib/mission_themes.js'; // thème et sous-thème du vol (SOG-0202 T2, § 10.48)
import {
  kindOf
} from '../../frame/lib/airline.js';
import * as ZG from './zone_gap.js'; // « zone manquante » : ce qui manque, le geste, les replis externes (SOG-0143)
import * as RE from './route_engine.js'; // le calcul et le contrôle de route du lanceur (RouteSim, SOG-0080, SOG-0081)
import * as RR from './route_reasons.js'; // SOG-0532 : les raisons du moteur composées dans la langue de l'écran
import * as RL from '../../frame/lib/route_legend.js'; // la légende commune des itinéraires avec la Carte (SOG-0134)
import * as FU from '../../frame/lib/fuel_units.js'; // les unités du carburant du cadre (SOG-0059 : « débit de ce vol »)
import * as PR from '../../frame/lib/procedures.js'; // noms, sortie et entrée des procédures pour le texte de route (§ 10.31)
import * as RA from '../../frame/lib/route_alts.js'; // la règle de péremption des propositions, partagée avec la Carte (SOG-0224)
import * as FMS from '../../frame/lib/fms.js'; // plan de vol écrit pour X-Plane (.fms) et MSFS (.pln), V3 § 10.28
// la piste en service d'après l'ATIS des réseaux du vol (SOG-0090, second lot) ; un direct vers un point sur instruction du contrôle
// (SOG-0088, calcul pur)
import * as ATIS from './atis.js';
import * as DIR from './direct.js';
import {
  copyAndTell,
  copyText
} from '../../frame/lib/clipboard.js'; // « Copier le diagnostic » du calcul de route (SOG-0134) ; le plan de vol (SOG-0402) ; SOG-0468 (1)
import {
  createProcedures,
  sideChosen,
  cleanSide,
  PROC_STYLE
} from './procedures.js'; // la carte « Procédures » (choix, lecture, OFP) : voir l'interface en tête de ce fichier
import {
  createAdNames
} from './adnames.js'; // le nom du terrain sous son code et la complétion des champs de l'étape Vol (§ 10.27)
import {
  createRouteComplete
} from './routecomplete.js'; // la complétion au curseur du champ de route (§ 10.31)
import {
  svg
} from '../../frame/lib/icons.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  plural
} from '../../frame/lib/plural.js'; // SOG-0468 : la règle du pluriel du cadre (fr : 0 et 1 au singulier), jamais « n === 1 » écrit ici
import {
  fmtZ,
  fmtZLocal,
  fmtDateZ,
  fmtDayZ,
  fmtHm,
  fmtDur
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »), l'heure locale seulement au départ et à l'arrivée

export const meta = {
  id: 'fuel',
  title: ['Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel'], // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 1,
  // titre lisible d'un document de Carburant en attente de synchronisation (la carte Synchronisation des Réglages, Simplification
  // 1er nov. 2026) : [fr, en, de, es], ou null (valeur absente ou illisible : le chemin en repli) ; pur, sans lecture
  titleOf: (path, v) => {
    if (/^pilot\/[^/]+\/fuel\.json$/.test(path)) return ['Réglages du devis', 'Quote settings', 'Einstellungen der Berechnung',
      'Ajustes del cálculo'
    ];
    if (!/^pilot\/[^/]+\/current_flight\.json$/.test(path) || !v || typeof v !== 'object') return null;
    const leg = [v.route?.dep, v.route?.arr].filter(x => typeof x === 'string' && x).join(' → ');
    if (!leg) return null;
    const ms = Date.parse(v.planned_at || v.updated_at || ''),
      d = Number.isFinite(ms) ? `${new Date(ms).getUTCDate()}/${new Date(ms).getUTCMonth() + 1}` : '';
    return d ? [`Vol ${leg} du ${d}`, `Flight ${leg} of ${d}`, `Flug ${leg} vom ${d}`, `Vuelo ${leg} del ${d}`] : [`Vol ${leg}`, `Flight ${leg}`,
      `Flug ${leg}`, `Vuelo ${leg}`
    ];
  },
  // missions/ : « Préparer ce vol » du module Missions (#fuel?mission=<id>) ; cache/data/personal.json : la coche « usage personnel »
  // de ce poste (module Données), lue seulement avant « Lire depuis Little Navmap » (SOG-0210)
  reads: ['pilot/', 'cache/fuel/', 'missions/', 'cache/data/personal.json'],
  // « Calculer A → B » et « Contrôler » (SOG-0080) : le travail route/compute du lanceur (AeroDB, RouteSim), détecté par regen/verbs
  launcher: {
    routes: ['regen/job', 'regen/job/cancel', 'regen/verbs', 'folders'],
    read: []
  },
  // fiches, flotte et référence : par aerodb (aircraft()), qui seul écrit aircraft/sheets/ et le miroir V2
  writes: [{
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/fuel/',
    policy: 'cache'
  }],
  // gardés hors ligne dès la première visite (service worker du cadre) ; ../data/model_sets.js et model_kit.js : la règle de la coche
  // « usage personnel » du module Données (SOG-0210)
  files: ['performance_model.js', 'model.js', 'levels.js', 'weather.js', 'winds.js', 'progress.js', 'procedures.js',
    'procedures_texts.js', 'atis.js', 'direct.js', '../data/model_sets.js', '../data/model_kit.js', 'adnames.js', 'routecomplete.js',
    'suggest.js',
    '../../frame/lib/weather_store.js', '../../frame/lib/fuel_units.js', 'route_engine.js', 'route_reasons.js', 'zone_gap.js', 'fpl.js',
    'altn_check.js',
    '../../frame/lib/route_text.js', '../../frame/lib/current_flight.js', '../../frame/lib/flight_time.js',
    '../../frame/lib/flight_path.js', '../../frame/lib/procedures.js', '../../frame/lib/routing.js', '../../frame/lib/fms.js',
    '../../frame/lib/route_alts.js',
    '../../frame/lib/external_links.js', '../../frame/lib/icons.js', '../../frame/lib/dom.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/time.js', '../../frame/lib/geo.js', '../../frame/lib/mission_themes.js', '../../frame/lib/airline.js',
    '../../frame/lib/plural.js', // SOG-0468
    '../../frame/lib/untrusted.js', // SOG-0468 (c) : importé par route_engine.js et par ../data/model_sets.js
    // importés depuis (R-F1, R-F4a, § 10.27, la météo du cadre) : gardés hors ligne eux aussi dès l’installation
    '../../frame/lib/wind.js', '../../frame/lib/route_model.js', '../../frame/lib/adnames.js', '../../frame/lib/ad_field.js',
    '../../frame/lib/text.js',
    '../../frame/lib/suggest_list.js', '../../frame/lib/metar.js',
    '../../frame/lib/mission.js', '../../frame/lib/js-yaml.min.js', '../../frame/lib/route_legend.js'
  ]
};

const OFP_PATH = 'cache/fuel/last_ofp.json',
  // anciennes réserves de fuel (avant la couche météo du cadre, ctx.weather) : retirées une fois de l'appareil
  OLD_WEATHER = ['cache/fuel/weather.json', 'cache/fuel/aloft.json'],
  UI_PATH = 'cache/fuel/ui.json',
  LAST_AC_PATH = 'cache/fuel/last_aircraft.json', // dernier appareil choisi sur cet appareil : proposé, repris d'office
  LIBS = [
    ['FlightPerfModel', 'performance_model.js'],
    ['FuelModel', 'model.js'],
    ['FuelLevels', 'levels.js']
  ];

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  plan: ['Devis', 'Quote', 'Berechnung', 'Cálculo'],
  sheets: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
  aircraft: ['Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  acSearch: ['Fiche, immatriculation, indicatif ou type', 'Sheet, registration, callsign or type',
    'Datenblatt, Kennzeichen, Rufzeichen oder Typ',
    'Ficha, matrícula, indicativo o tipo'
  ],
  acChange: ['Changer d’aéronef', 'Change aircraft', 'Luftfahrzeug wechseln', 'Cambiar de aeronave'],
  acChangeShort: ['Changer', 'Change', 'Wechseln', 'Cambiar'],
  loadingRefs: ['Chargement des aéronefs et des fiches…', 'Loading aircraft and sheets…',
    'Luftfahrzeuge und Datenblätter werden geladen…', 'Cargando aeronaves y fichas…'
  ],
  loadingFlight: ['Chargement du vol…', 'Loading the flight…', 'Flug wird geladen…', 'Cargando el vuelo…'],
  // appareil neuf : le vol courant attend la première synchronisation (dit dans l'écran, au-dessus du pas affiché)
  // SOG-0337 : aucune durée promise — une limite de GitLab peut retenir la première synchronisation (la bande du cadre dit la reprise)
  waitFlight: ['Lecture du vol courant : en attente de la première synchronisation.',
    'Reading the current flight: waiting for the first synchronisation.',
    'Aktueller Flug wird gelesen: Warten auf die erste Synchronisierung.',
    'Leyendo el vuelo actual: esperando la primera sincronización.'
  ],
  lateFlight: ['Données pas encore synchronisées : vous préparez un vol neuf ; votre vol enregistré sera repris dès qu’il arrive.',
    'Data not synchronised yet: you are preparing a new flight; your saved flight is taken back as soon as it arrives.',
    'Daten noch nicht synchronisiert: Sie bereiten einen neuen Flug vor; Ihr gespeicherter Flug wird übernommen, sobald er ankommt.',
    'Datos aún no sincronizados: prepara un vuelo nuevo; su vuelo guardado se recupera en cuanto llegue.'
  ],
  syncLink: ['Réglages › Synchronisation', 'Settings › Synchronisation', 'Einstellungen › Synchronisierung', 'Ajustes › Sincronización'],
  acNone: ['Aucun aéronef : cherchez-le.', 'No aircraft: search for it.', 'Kein Luftfahrzeug: suchen.', 'Ninguna aeronave: búsquela.'],
  acNoRegistry: ['Base des aéronefs indisponible (aerodb).', 'Aircraft base unavailable (aerodb).',
    'Luftfahrzeugbasis nicht verfügbar (aerodb).',
    'Base de aeronaves no disponible (aerodb).'
  ],
  origins: {
    last: ['dernier choisi', 'last chosen', 'zuletzt gewählt', 'último elegido'],
    sheet: ['ma fiche', 'my sheet', 'mein Datenblatt', 'mi ficha'],
    fleet: ['flotte de la compagnie', 'airline fleet', 'Flotte der Fluggesellschaft', 'flota de la aerolínea'],
    reference: ['aéronef connu (journal)', 'known aircraft (log)', 'bekanntes Luftfahrzeug (Flugbuch)', 'aeronave conocida (diario)'],
    type: ['type publié', 'published type', 'veröffentlichter Typ', 'tipo publicado'],
    free: ['code libre', 'free code', 'freier Code', 'código libre']
  },
  via: {
    own: ['sa fiche', 'its sheet', 'eigenes Datenblatt', 'su ficha'],
    type: ['fiche de son type', 'its type’s sheet', 'Datenblatt des Typs', 'ficha de su tipo'],
    estimate: ['estimation du type', 'type estimate', 'Typschätzung', 'estimación del tipo']
  },
  otherType: ['Autre type (code OACI)…', 'Other type (ICAO code)…', 'Anderer Typ (ICAO-Code)…', 'Otro tipo (código OACI)…'],
  noSheet: ['Aucune fiche : créez-en une dans Maintenance › Aéronefs, ou choisissez un type (estimation).',
    'No sheet: create one in Maintenance › Aircraft, or choose a type (estimate).',
    'Kein Datenblatt: eines in Wartung › Luftfahrzeuge anlegen oder einen Typ wählen (Schätzung).',
    'Ninguna ficha: cree una en Mantenimiento › Aeronaves o elija un tipo (estimación).'
  ],
  source: ['Croisière : {s}', 'Cruise: {s}', 'Reiseflug: {s}', 'Crucero: {s}'],
  approx: ['approché', 'approximate', 'ungefähr', 'aproximado'],
  // ce que la table régime / débit a servi à lire (SOG-0028) : le régime de croisière entre deux lignes, le niveau entre deux courbes
  usedRpm: ['{r} rpm entre {a} et {b} rpm', '{r} rpm between {a} and {b} rpm', '{r} U/min zwischen {a} und {b} U/min',
    '{r} rpm entre {a} y {b} rpm'
  ],
  usedRpm1: ['{r} rpm, ligne {a} rpm', '{r} rpm, row {a} rpm', '{r} U/min, Zeile {a} U/min', '{r} rpm, fila {a} rpm'],
  usedAlt: ['entre les courbes de {a} et {b} ft', 'between the curves of {a} and {b} ft', 'zwischen den Kurven {a} und {b} ft',
    'entre las curvas de {a} y {b} ft'
  ],
  usedAlt1: ['courbe de {a} ft', 'curve of {a} ft', 'Kurve {a} ft', 'curva de {a} ft'],
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
  routeText: ['Route (points, voies, niveaux : LFBO/32L TOU UN460 NTS/F280 LFRN/28)',
    'Route (points, airways, levels: LFBO/32L TOU UN460 NTS/F280 LFRN/28)',
    'Route (Punkte, Luftstraßen, Flugflächen: LFBO/32L TOU UN460 NTS/F280 LFRN/28)',
    'Ruta (puntos, aerovías, niveles: LFBO/32L TOU UN460 NTS/F280 LFRN/28)'
  ],
  rinfo: ['{d} · route vraie {t}° · {s}', '{d} · true track {t}° · {s}', '{d} · rechtweisender Kurs {t}° · {s}',
    '{d} · rumbo verdadero {t}° · {s}'
  ],
  rsrc: {
    route: ['d’après la route', 'from the route', 'aus der Route', 'según la ruta'],
    // la distance du chemin étendu, celle du devis et de la coupe (§ 10.20) : le dire
    procs: ['d’après la route, procédures comprises', 'from the route, procedures included', 'aus der Route, Verfahren inbegriffen',
      'según la ruta, procedimientos incluidos'
    ],
    ofp: ['d’après l’OFP SimBrief', 'from the SimBrief OFP', 'aus dem SimBrief-OFP', 'según el OFP de SimBrief'],
    manual: ['saisies à la main', 'typed by hand', 'von Hand eingegeben', 'introducidas a mano']
  },
  rnone: ['Distance et route vraie : la route ne se résout pas encore.', 'Distance and true track: the route does not resolve yet.',
    'Entfernung und Kurs: die Route lässt sich noch nicht auflösen.', 'Distancia y rumbo: la ruta aún no se resuelve.'
  ],
  rmanual: ['Saisir à la main', 'Type them by hand', 'Von Hand eingeben', 'Introducir a mano'],
  rauto: ['Auto', 'Auto', 'Auto', 'Auto'],
  // le moteur de route du lanceur (SOG-0080) : calculer la route d'un terrain à l'autre (les points saisis imposés), contrôler la saisie
  rCompute: ['Calculer A → B', 'Compute A → B', 'A → B berechnen', 'Calcular A → B'],
  rCheck: ['Contrôler', 'Check', 'Prüfen', 'Comprobar'],
  rBusy: ['Calcul en cours…', 'Computing…', 'Berechnung läuft…', 'Calculando…'],
  // SOG-0134 : la durée d'un calcul de route, dite au-delà de 3 s, et où elle est passée
  // SOG-0354 (L2b 3) : la preuve de chaque section de l'itinéraire calculé (view.sections d'AeroDB)
  rProofPub: ['{a}–{b} : publiée, route NAT {t} du {d}', '{a}–{b}: published, NAT track {t} of {d}',
    '{a}–{b}: veröffentlicht, NAT-Route {t} vom {d}',
    '{a}–{b}: publicada, ruta NAT {t} del {d}'
  ],
  rProofPubNoDay: ['{a}–{b} : publiée, route NAT {t}', '{a}–{b}: published, NAT track {t}', '{a}–{b}: veröffentlicht, NAT-Route {t}',
    '{a}–{b}: publicada, ruta NAT {t}'
  ],
  rProofComp: ['{a}–{b} : calculée', '{a}–{b}: computed', '{a}–{b}: berechnet', '{a}–{b}: calculada'],
  // la route libre créée quand aucune route NAT du jour ne convient ; les routes écartées ; le départ pris maintenant (suite du moteur)
  rProofFree: ['{a}–{b} : route libre, créée', '{a}–{b}: free route, created', '{a}–{b}: freie Route, erstellt',
    '{a}–{b}: ruta libre, creada'
  ],
  rProofRejected: ['Route NAT {t} écartée : {w}', 'NAT track {t} set aside: {w}', 'NAT-Route {t} verworfen: {w}',
    'Ruta NAT {t} descartada: {w}'
  ],
  // SOG-0411 (E) : écartée pour l'heure à une heure près — de combien, et l'heure de départ limite
  rProofNear: {
    late: ['à {m} min près : partir au plus tard à {t}', 'by {m} min: leave at or before {t}', 'um {m} min: spätestens um {t} abfliegen',
      'por {m} min: salir a más tardar a las {t}'
    ],
    early: ['à {m} min près : partir au plus tôt à {t}', 'by {m} min: leave at or after {t}', 'um {m} min: frühestens um {t} abfliegen',
      'por {m} min: salir no antes de las {t}'
    ]
  },
  // un pli fermé (l'utilisateur : « trop d'infos tue l'info ») : « 6 routes NAT du jour écartées », une raison par route une fois ouvert
  rProofRejN: ['{n} routes NAT du jour écartées', '{n} NAT tracks of the day set aside', '{n} NAT-Routen des Tages verworfen',
    '{n} rutas NAT del día descartadas'
  ],
  rProofRej1: ['1 route NAT du jour écartée', '1 NAT track of the day set aside', '1 NAT-Route des Tages verworfen',
    '1 ruta NAT del día descartada'
  ],
  // décision du 16/11 au soir (la règle de l'utilisateur du 13/11) : sans heure de départ, la validité horaire n'est pas vérifiée — dit
  rProofNoTime: ['Heure de départ non donnée : validité horaire des routes NAT non vérifiée',
    'Departure time not given: time validity of the NAT tracks not checked',
    'Abflugzeit nicht angegeben: zeitliche Gültigkeit der NAT-Routen nicht geprüft',
    'Hora de salida no indicada: validez horaria de las rutas NAT no comprobada'
  ],
  rBusyOcean: ['Vol transocéanique : la recherche peut prendre jusqu’à 20 secondes',
    'Transoceanic flight: the search can take up to 20 seconds', 'Transozeanischer Flug: die Suche kann bis zu 20 Sekunden dauern',
    'Vuelo transoceánico: la búsqueda puede tardar hasta 20 segundos'
  ],
  rBusyS: ['Calcul en cours… {s} s', 'Computing… {s} s', 'Berechnung läuft… {s} s', 'Calculando… {s} s'],
  rTimeLauncher: ['Calculé en {t} s — dont {p} s chez le lanceur.', 'Computed in {t} s — {p} s of it at the launcher.',
    'Berechnet in {t} s — davon {p} s beim Starter.', 'Calculado en {t} s — de ellos {p} s en el lanzador.'
  ],
  rTimeDraw: ['Calculé en {t} s — dont {p} s de dessin.', 'Computed in {t} s — {p} s of it drawing.',
    'Berechnet in {t} s — davon {p} s Zeichnen.',
    'Calculado en {t} s — de ellos {p} s de dibujo.'
  ],
  rTimeMap: ['Calculé en {t} s — dont {p} s de dessin sur la Carte.', 'Computed in {t} s — {p} s of it drawing on the Map.',
    'Berechnet in {t} s — davon {p} s Zeichnen auf der Karte.', 'Calculado en {t} s — de ellos {p} s de dibujo en el Mapa.'
  ],
  rTimeCheck: ['Calculé en {t} s — dont {p} s pour joindre le lanceur.', 'Computed in {t} s — {p} s of it to reach the launcher.',
    'Berechnet in {t} s — davon {p} s, um den Starter zu erreichen.', 'Calculado en {t} s — de ellos {p} s para alcanzar el lanzador.'
  ],
  rTimeCopy: ['Copier le diagnostic', 'Copy the diagnostic', 'Diagnose kopieren', 'Copiar el diagnóstico'],
  // SOG-0514 : sans devis, la route est calculée et contrôlée avec les vitesses par défaut du moteur
  rDefaultPerf: [
    'Vitesses par défaut du moteur (450 kt, 2 000 ft/min) : aucune performance connue pour cet aéronef, ses niveaux sont jugés comme ceux d’un avion rapide.',
    'Engine default speeds (450 kt, 2,000 ft/min): no performance known for this aircraft, its levels are judged as those of a fast aeroplane.',
    'Standardgeschwindigkeiten der Engine (450 kt, 2 000 ft/min): keine Leistung für dieses Luftfahrzeug bekannt, seine Höhen werden wie die eines schnellen Flugzeugs beurteilt.',
    'Velocidades por defecto del motor (450 kt, 2 000 ft/min): ninguna prestación conocida para esta aeronave, sus niveles se juzgan como los de un avión rápido.'
  ],
  // SOG-0468 (1) : la copie n'a pu que MONTRER le texte (ni presse-papiers ni copie de secours : une tablette hors contexte sûr)
  copyManual: ['Copie impossible ici : le texte est affiché, copiez-le à la main.',
    'Copying is not possible here: the text is shown, copy it by hand.',
    'Kopieren ist hier nicht möglich: Der Text wird angezeigt, kopieren Sie ihn von Hand.',
    'No se puede copiar aquí: el texto se muestra, cópielo a mano.'
  ],
  rTimeCopied: ['Diagnostic du calcul copié.', 'Diagnostic of the computation copied.', 'Diagnose der Berechnung kopiert.',
    'Diagnóstico del cálculo copiado.'
  ],
  // SOG-0208 : un bouton qui ne fait rien sans le dire est un défaut ; le lanceur est vérifié à l'appui
  // SOG-0322 : le site publié (sans lanceur) dit pourquoi il n'y a pas de calcul d'itinéraire, au lieu de ne rien proposer
  rNeedLauncher: ['Le calcul d’itinéraire demande le lanceur du poste.', 'Route computation needs the workstation’s launcher.',
    'Die Routenberechnung braucht den Launcher des Arbeitsplatzes.', 'El cálculo de ruta necesita el lanzador del puesto.'
  ],
  // SOG-0352 : les routes NAT d'un vol qui traverse l'Atlantique nord, dites à l'étape Route avant le calcul
  natValid: ['Routes NAT du {d}, valides jusqu’à {t}', 'NAT tracks of {d}, valid until {t}', 'NAT-Tracks vom {d}, gültig bis {t}',
    'Rutas NAT del {d}, válidas hasta las {t}'
  ],
  natNone: ['Routes NAT pas lues aujourd’hui', 'NAT tracks not read today', 'NAT-Tracks heute nicht gelesen', 'Rutas NAT no leídas hoy'],
  natStale: ['Routes NAT du {d} : périmées', 'NAT tracks of {d}: stale', 'NAT-Tracks vom {d}: veraltet', 'Rutas NAT del {d}: caducadas'],
  natStaleCopy: ['Routes NAT du {d}, publiées depuis le poste : périmées', 'NAT tracks of {d}, published from the workstation: stale',
    'NAT-Tracks vom {d}, vom Arbeitsplatz veröffentlicht: veraltet', 'Rutas NAT del {d}, publicadas desde el puesto: caducadas'
  ],
  natNoCopy: ['Routes NAT : aucune copie publiée depuis le poste', 'NAT tracks: no copy published from the workstation',
    'NAT-Tracks: keine vom Arbeitsplatz veröffentlichte Kopie', 'Rutas NAT: ninguna copia publicada desde el puesto'
  ],
  natRead: ['Lire les routes NAT du jour', 'Read the day’s NAT tracks', 'NAT-Tracks des Tages lesen', 'Leer las rutas NAT del día'],
  // SOG-0413 : les sens présents et leur fenêtre ; la relecture forcée et ce qu'elle a apporté
  natReread: ['Relire les routes NAT', 'Read the NAT tracks again', 'NAT-Tracks erneut lesen', 'Releer las rutas NAT'],
  natDirs: ['Routes NAT du {d} : {w} ; {e}', 'NAT tracks of {d}: {w}; {e}', 'NAT-Tracks vom {d}: {w}; {e}',
    'Rutas NAT del {d}: {w}; {e}'
  ],
  natW: ['vers l’ouest {t}', 'westbound {t}', 'nach Westen {t}', 'hacia el oeste {t}'],
  natE: ['vers l’est {t}', 'eastbound {t}', 'nach Osten {t}', 'hacia el este {t}'],
  natW0: ['aucune vers l’ouest', 'none westbound', 'keine nach Westen', 'ninguna hacia el oeste'],
  natE0: ['aucune vers l’est', 'none eastbound', 'keine nach Osten', 'ninguna hacia el este'],
  natAddedW: ['{n} route(s) ajoutée(s) vers l’ouest', '{n} westbound track(s) added', '{n} Track(s) nach Westen hinzugefügt',
    '{n} ruta(s) añadida(s) hacia el oeste'
  ],
  natAddedE: ['{n} route(s) ajoutée(s) vers l’est', '{n} eastbound track(s) added', '{n} Track(s) nach Osten hinzugefügt',
    '{n} ruta(s) añadida(s) hacia el este'
  ],
  natAdded: ['Relu à {t} : {l}.', 'Read again at {t}: {l}.', 'Erneut gelesen um {t}: {l}.', 'Releído a las {t}: {l}.'],
  natNothing: ['Relu : rien de nouveau à la source.', 'Read again: nothing new at the source.',
    'Erneut gelesen: nichts Neues an der Quelle.',
    'Releído: nada nuevo en la fuente.'
  ],
  natSoon: ['Relu à {t} : nouvelle relecture possible dans une minute.', 'Read again at {t}: next reread possible in one minute.',
    'Erneut gelesen um {t}: nächstes Lesen in einer Minute möglich.', 'Releído a las {t}: nueva relectura posible dentro de un minuto.'
  ],
  natUnchanged: ['Relu à {t} : message du {d} inchangé.', 'Read again at {t}: message of {d} unchanged.',
    'Erneut gelesen um {t}: Meldung vom {d} unverändert.', 'Releído a las {t}: mensaje del {d} sin cambios.'
  ],
  natRenewed: ['Relu à {t} : message du {d}.', 'Read again at {t}: message of {d}.', 'Erneut gelesen um {t}: Meldung vom {d}.',
    'Releído a las {t}: mensaje del {d}.'
  ],
  natReadAt: ['lues à {t}', 'read at {t}', 'gelesen um {t}', 'leídas a las {t}'],
  natReading: ['Lecture des routes NAT…', 'Reading the NAT tracks…', 'NAT-Tracks werden gelesen…', 'Leyendo las rutas NAT…'],
  natBusyL: ['Le poste fait une autre opération : réessayez dans un instant.',
    'The workstation is busy with another operation: try again in a moment.',
    'Der Arbeitsplatz führt einen anderen Vorgang aus: gleich noch einmal versuchen.',
    'El puesto está ocupado con otra operación: vuelva a intentarlo en un momento.'
  ],
  natFail: ['Les routes NAT n’ont pas pu être lues.', 'The NAT tracks could not be read.', 'Die NAT-Tracks konnten nicht gelesen werden.',
    'No se pudieron leer las rutas NAT.'
  ],
  // SOG-0372 : ce que dit la ligne quand la lecture n'a pas rendu des routes valides (jamais l'ancienne phrase seule)
  natRetry: ['La dernière lecture a échoué : nouvel essai possible à {t}.', 'The last read failed: next try possible at {t}.',
    'Das letzte Lesen ist fehlgeschlagen: neuer Versuch ab {t} möglich.', 'La última lectura falló: nuevo intento posible a las {t}.'
  ],
  natSame: ['Lu, mais le message ne porte pas de routes plus récentes que celles du {d}.',
    'Read, but the message carries no tracks newer than those of {d}.',
    'Gelesen, aber die Meldung enthält keine neueren Tracks als die vom {d}.',
    'Leído, pero el mensaje no trae rutas más recientes que las del {d}.'
  ],
  natUnread: ['Route NAT {l} : routes du jour non lues, traversée tracée en direct',
    'NAT track {l}: the day\'s tracks not read, the crossing drawn direct',
    'NAT-Route {l}: Tagesrouten nicht gelesen, Überquerung direkt gezeichnet',
    'Ruta NAT {l}: rutas del día no leídas, travesía trazada en directo'
  ],
  natEnds: ['Route NAT {l} : entrée ou sortie hors de la route du {d}, traversée tracée en direct',
    'NAT track {l}: entry or exit not on the track of {d}, the crossing drawn direct',
    'NAT-Route {l}: Ein- oder Austritt nicht auf der Route vom {d}, Überquerung direkt gezeichnet',
    'Ruta NAT {l}: entrada o salida fuera de la ruta del {d}, travesía trazada en directo'
  ],
  natTrackGone: ['Route NAT {l} : absente des routes du {d}', 'NAT track {l}: not in the tracks of {d}',
    'NAT-Track {l}: nicht in den Tracks vom {d}',
    'Ruta NAT {l}: ausente de las rutas del {d}'
  ],
  natDropped: ['Routes NAT du {d} lues : les propositions par des routes NAT d’un autre jour sont retirées.',
    'NAT tracks of {d} read: the proposals through NAT tracks of another day are removed.',
    'NAT-Tracks vom {d} gelesen: die Vorschläge über NAT-Tracks eines anderen Tages sind entfernt.',
    'Rutas NAT del {d} leídas: se retiran las propuestas por rutas NAT de otro día.'
  ],
  rNoLauncher: ['Disponible avec le lanceur du poste (il ne répond pas).',
    'Available with the workstation’s launcher (it does not answer).',
    'Mit dem Launcher des Arbeitsplatzes verfügbar (er antwortet nicht).', 'Disponible con el lanzador del puesto (no responde).'
  ],
  rNeedAds: ['Renseignez le départ et l’arrivée.', 'Fill in the departure and the arrival.', 'Abflug und Ankunft eingeben.',
    'Indique la salida y la llegada.'
  ],
  rNone: ['Aucun itinéraire proposé.', 'No route proposed.', 'Keine Route vorgeschlagen.', 'Ningún itinerario propuesto.'],
  rPrimary: ['Route calculée', 'Computed route', 'Berechnete Route', 'Ruta calculada'],
  rVariant: ['Variante {n}', 'Alternative {n}', 'Variante {n}', 'Variante {n}'],
  rLimits: ['Ce que le contrôle ne couvre pas', 'What the check does not cover', 'Was die Prüfung nicht abdeckt',
    'Lo que la comprobación no cubre'
  ],
  rNoRad: ['Aucun RAD importé', 'No RAD imported', 'Kein RAD importiert', 'Ningún RAD importado'],
  rNoRadGo: ['Importer dans Données', 'Import in Data', 'In Daten importieren', 'Importar en Datos'],
  rFail: ['Le calcul de route n’a pas répondu.', 'The route computation did not answer.', 'Die Routenberechnung hat nicht geantwortet.',
    'El cálculo de ruta no ha respondido.'
  ],
  // SOG-0206 : la cause quand le travail n'a rien rendu (jamais « n'a pas répondu » sans raison), avec « Réessayer »
  rWhy: {
    busy: ['Le poste termine une autre opération (lecture du sol, mise à jour des données…) : réessayez dans un instant.',
      'The workstation is finishing another operation (ground reading, data update…): try again in a moment.',
      'Der Rechner beendet gerade einen anderen Vorgang (Bodenlesung, Datenaktualisierung…): gleich noch einmal versuchen.',
      'El puesto está terminando otra operación (lectura del suelo, actualización de datos…): inténtelo de nuevo en un momento.'
    ],
    offline: ['Le lanceur du poste ne répond pas : vérifiez qu’il tourne, puis réessayez.',
      'The workstation launcher does not answer: check that it is running, then try again.',
      'Der Launcher des Rechners antwortet nicht: prüfen, ob er läuft, dann erneut versuchen.',
      'El lanzador del puesto no responde: compruebe que está en marcha y vuelva a intentarlo.'
    ],
    stopped: ['Le calcul a été arrêté avant la fin (lanceur relancé ou travail annulé) : réessayez.',
      'The computation was stopped before the end (launcher restarted or job cancelled): try again.',
      'Die Berechnung wurde vor dem Ende abgebrochen (Launcher neu gestartet oder Job abgebrochen): erneut versuchen.',
      'El cálculo se detuvo antes del final (lanzador reiniciado o trabajo cancelado): inténtelo de nuevo.'
    ],
    failed: ['Le calcul a échoué sans donner de résultat (le journal du lanceur en dit la cause) : réessayez.',
      'The computation failed without a result (the launcher log says why): try again.',
      'Die Berechnung ist ohne Ergebnis fehlgeschlagen (das Launcher-Protokoll nennt die Ursache): erneut versuchen.',
      'El cálculo falló sin resultado (el registro del lanzador dice por qué): inténtelo de nuevo.'
    ]
  },
  rRetry: ['Réessayer', 'Try again', 'Erneut versuchen', 'Reintentar'],
  rTake: ['Choisir', 'Choose', 'Auswählen', 'Elegir'], // SOG-0134 : un appui montre, « Choisir » prend
  // SOG-0224 : après « Choisir », les autres itinéraires disparaissent ; cette ligne dit celui qui a été pris
  // SOG-0545 (l'ergonome) : « choisi », le mot du bouton « Choisir » (plus « pris »)
  rTakenLine: ['Itinéraire choisi : {name}. La route est modifiée.', 'Route chosen: {name}. The route is changed.',
    'Route gewählt: {name}. Die Route ist geändert.', 'Itinerario elegido: {name}. La ruta se ha cambiado.'
  ],
  rTakenLine0: ['Itinéraire choisi. La route est modifiée.', 'Route chosen. The route is changed.',
    'Route gewählt. Die Route ist geändert.',
    'Itinerario elegido. La ruta se ha cambiado.'
  ],
  // le bloc « Aides radio » de l'étape Départ (SOG-0200)
  aidsTitle: ['Aides radio', 'Radio aids', 'Funknavigationshilfen', 'Radioayudas'],
  // le temps sur zone par point (CONCEPTION 11/11 § 1 bis)
  holdField: ['Sur zone à {id} (min)', 'Time on area at {id} (min)', 'Zeit im Gebiet bei {id} (min)', 'Tiempo en zona en {id} (min)'],
  holdLabel: ['Sur zone', 'On area', 'Im Gebiet', 'En zona'],
  holdMission: ['mission : {min} à {max}', 'mission: {min} to {max}', 'Einsatz: {min} bis {max}', 'misión: {min} a {max}'],
  holdAdd: ['Ajouter un temps sur zone à {id}', 'Add a time on area at {id}', 'Zeit im Gebiet bei {id} hinzufügen',
    'Añadir un tiempo en zona en {id}'
  ],
  holdLine: ['Sur zone · {id} · {n} min', 'On area · {id} · {n} min', 'Im Gebiet · {id} · {n} min', 'En zona · {id} · {n} min'],
  holdLineRange: ['Sur zone · {id} · {min} à {max} min, {n} comptées', 'On area · {id} · {min} to {max} min, {n} counted',
    'Im Gebiet · {id} · {min} bis {max} min, {n} gezählt', 'En zona · {id} · {min} a {max} min, {n} contados'
  ],
  holdUnread: ['Mission : durée non lue — {l}.', 'Mission: duration not read — {l}.', 'Mission: Dauer nicht gelesen — {l}.',
    'Misión: duración no leída — {l}.'
  ],
  // Q-0019 : un direct au compas plus long de 2 % que son grand cercle
  rhumbLong: ['{a} → {b} : {r} NM au compas, {g} par le grand cercle (+{p} %) : ajoutez des points intermédiaires.',
    '{a} → {b}: {r} NM by compass, {g} by the great circle (+{p} %): add intermediate points.',
    '{a} → {b}: {r} NM nach Kompass, {g} über den Großkreis (+{p} %): fügen Sie Zwischenpunkte hinzu.',
    '{a} → {b}: {r} NM a rumbo, {g} por el círculo máximo (+{p} %): añada puntos intermedios.'
  ],
  aidsRoute: ['VOR / DME de la route ({n})', 'VOR / DME of the route ({n})', 'VOR / DME der Route ({n})', 'VOR / DME de la ruta ({n})'],
  aidsNone: ['Aucune aide radio en base pour ce vol.', 'No radio aid in the base for this flight.',
    'Keine Funknavigationshilfe in der Basis für diesen Flug.',
    'Ninguna radioayuda en la base para este vuelo.'
  ],
  aidsLeg: ['{a} → {b}', '{a} → {b}', '{a} → {b}', '{a} → {b}'],
  // le carburant de dégagement (SOG-0225)
  // SOG-0399 : le total du dégagement, puis ses trois parts au-dessus de lui (remise des gaz, trajet, approche)
  altnLine: ['Dégagement {id}', 'Alternate {id}', 'Ausweich {id}', 'Alternativo {id}'],
  altnLeg: ['Trajet {a} → {id} · {nm} NM{fl} · {src} · {w}', 'Leg {a} → {id} · {nm} NM{fl} · {src} · {w}',
    'Strecke {a} → {id} · {nm} NM{fl} · {src} · {w}', 'Trayecto {a} → {id} · {nm} NM{fl} · {src} · {w}'
  ],
  altnGoAround: ['Remise des gaz à {a} : {m} min au débit de montée, {k}', 'Go-around at {a}: {m} min at the climb flow, {k}',
    'Durchstarten in {a}: {m} min mit dem Steigflugverbrauch, {k}', 'Motor y al aire en {a}: {m} min al consumo de subida, {k}'
  ],
  altnApproach: ['Approche à {id} : {m} min au débit d’attente, {k}', 'Approach at {id}: {m} min at the holding flow, {k}',
    'Anflug in {id}: {m} min mit dem Warteverbrauch, {k}', 'Aproximación en {id}: {m} min al consumo de espera, {k}'
  ],
  altnFlat: ['forfait', 'flat allowance', 'Pauschale', 'tanto alzado'],
  altnFlatSheet: ['forfait de la fiche', 'flat allowance of the sheet', 'Pauschale des Datenblatts', 'tanto alzado de la ficha'],
  altnNone: ['Dégagement : aucun terrain saisi', 'Alternate: no aerodrome entered', 'Ausweich: kein Flugplatz eingegeben',
    'Alternativo: ningún aeródromo introducido'
  ],
  altnUnknown: ['Dégagement {id} : position inconnue, non compté', 'Alternate {id}: position unknown, not counted',
    'Ausweich {id}: Position unbekannt, nicht gezählt',
    'Alternativo {id}: posición desconocida, no contado'
  ],
  altnPending: ['Dégagement {id} : position en lecture…', 'Alternate {id}: reading its position…',
    'Ausweich {id}: Position wird gelesen…', 'Alternativo {id}: leyendo su posición…'
  ],
  altnSheet: ['moyenne de la fiche', 'average of the sheet', 'Mittelwert des Datenblatts', 'media de la ficha'],
  altnModel: ['montée, croisière, descente calculées', 'climb, cruise, descent computed', 'Steigflug, Reiseflug, Sinkflug berechnet',
    'subida, crucero, descenso calculados'
  ],
  altnWind: ['vent {d}/{s} kt', 'wind {d}/{s} kt', 'Wind {d}/{s} kt', 'viento {d}/{s} kt'],
  altnNoWind: ['vent inconnu', 'wind unknown', 'Wind unbekannt', 'viento desconocido'],
  // la famille et la série du vol (SOG-0202 T2) ; les mots du compte rendu (l'utilisateur, 10 nov. : « famille / série »)
  theme: ['Famille', 'Family', 'Familie', 'Familia'],
  series: ['Série', 'Series', 'Serie', 'Serie'],
  themeNone: ['— aucune —', '— none —', '— keine —', '— ninguna —'],
  // SOG-0545 (l'ergonome, maquette v2) : « choisie », puisque le bouton dit « Choisir »
  rTaken: ['choisie', 'chosen', 'gewählt', 'elegida'],
  // SOG-0545 : les deux mentions (au meilleur temps, au moindre carburant d'étape) ; SOG-0552 (l'ergonome, 23/11) : le verdict
  // `conform` du moteur dit « Aucune infraction trouvée » (« conforme » affirmait ce que le moteur ne sait pas)
  rFastest: ['la plus rapide', 'fastest', 'die schnellste', 'la más rápida'],
  rCheapest: ['la plus économe', 'most economical', 'die sparsamste', 'la más económica'],
  rConformShort: ['Aucune infraction trouvée', 'No violation found', 'Keine Verstöße gefunden', 'No se encontró ninguna infracción'],
  // SOG-0554 (l'ergonome) : le pli « Non vérifiable » d'une carte dit ce qu'il ouvre (le verdict est déjà dit en gras au-dessus)
  rSeeWhy: ['Voir pourquoi', 'See why', 'Gründe anzeigen', 'Ver por qué'],
  // SOG-0548 (l'ergonome) : sur la ligne « enfreint » d'un raccord au-delà de sa limite, ce qui manque pour le terrain
  rNoArrRead: ['aucune arrivée lue pour {ad}', 'no arrival read for {ad}', 'keine Ankunft für {ad} gelesen',
    'ninguna llegada leída para {ad}'
  ],
  rNoDepRead: ['aucun départ lu pour {ad}', 'no departure read for {ad}', 'kein Abflug für {ad} gelesen',
    'ninguna salida leída para {ad}'
  ],
  // insécable : jamais « 0 » en fin de ligne et « écart » sur la suivante (capture F241 à 390 px)
  rFaults: ['{n} écart(s)', '{n} deviation(s)', '{n} Abweichung(en)', '{n} desviación(es)'],
  // le genre d'un écart (SOG-0134), quand le moteur ne donne pas l'identifiant de la règle
  rKinds: {
    RAD: ['RAD', 'RAD', 'RAD', 'RAD'],
    FRA: ['FRA', 'FRA', 'FRA', 'FRA'],
    direction: ['sens', 'direction', 'Richtung', 'sentido'],
    floor: ['plancher', 'floor', 'Untergrenze', 'suelo'],
    ceiling: ['plafond', 'ceiling', 'Obergrenze', 'techo'],
    continuity: ['continuité', 'continuity', 'Kontinuität', 'continuidad'],
    altitude: ['altitude', 'altitude', 'Höhe', 'altitud']
  },
  rMore: ['{n} autre(s)', '{n} more', '{n} weitere', '{n} más'], // SOG-0468 : accordé par le cadre (« 1 autre », jamais « 1 autres »)
  // le contrôle par tronçon (SOG-0161) : trois mots et trois nombres, jamais « contrôlé » seul avant 100 %
  // SOG-0532 (l'ergonome) : le partage sous un itinéraire, chaque nombre avec son mot, les parts nulles omises ; montré sous 100 %
  rShare: {
    controlled: ['distance contrôlée : {v} %', 'distance checked: {v} %', 'geprüfte Strecke: {v} %', 'distancia controlada: {v} %'],
    incomplete: ['données incomplètes : {v} %', 'incomplete data: {v} %', 'unvollständige Daten: {v} %', 'datos incompletos: {v} %'],
    fallback: ['sans réseau : {v} %', 'no network: {v} %', 'ohne Netz: {v} %', 'sin red: {v} %'],
    error: ['en infraction : {v} %', 'in breach: {v} %', 'regelwidrig: {v} %',
      'en infracción: {v} %'
    ] // le mot de l'ergonome (20/11), en premier sur la ligne
  },
  rCtrl: {
    controlled: ['contrôlé', 'checked', 'geprüft', 'controlado'],
    incomplete: ['incomplet', 'incomplete', 'unvollständig', 'incompleto'],
    fallback: ['repli', 'fallback', 'Ersatz', 'respaldo'],
    error: ['erreur', 'error', 'Fehler', 'error']
  },
  rSections: ['Tronçons ({n})', 'Sections ({n})', 'Abschnitte ({n})', 'Tramos ({n})'],
  rLegend: ['Légende', 'Legend', 'Legende', 'Leyenda'], // les natures des tronçons, mêmes mots et mêmes traits que la Carte (SOG-0134)
  rTakenShare: ['Itinéraire pris — {share}.', 'Route taken — {share}.', 'Route übernommen — {share}.', 'Itinerario tomado: {share}.'],
  // un plan impossible : les propositions de repli du moteur, à part (AeroDB 9a7f1dde3), jamais dites contrôlées
  // SOG-0224 : l'objet « propositions en cours » dit son âge, se dit périmé, se ferme
  rAge: ['Calculé à {t}', 'Computed at {t}', 'Berechnet um {t}', 'Calculado a las {t}'],
  rStale: ['Périmé (calculé à {t}) : nouvel AIRAC, base changée, ou routes NAT d’un autre jour',
    'Stale (computed at {t}): new AIRAC, database changed, or NAT tracks of another day',
    'Veraltet (berechnet um {t}): neuer AIRAC, Datenbank geändert oder NAT-Tracks eines anderen Tages',
    'Caducado (calculado a las {t}): nuevo AIRAC, base cambiada o rutas NAT de otro día'
  ],
  rRecompute: ['Recalculer', 'Compute again', 'Neu berechnen', 'Recalcular'],
  // SOG-0389 (b) : un vol sans niveau — le moteur calcule à son niveau par défaut ; dit en tête de la route, avec le chemin du champ Niveau
  rNoLevel: ['Niveau non donné : route calculée à FL{fl} par défaut', 'Level not given: route computed at FL{fl} by default',
    'Flugfläche nicht angegeben: Route standardmäßig auf FL{fl} berechnet', 'Nivel no indicado: ruta calculada a FL{fl} por defecto'
  ],
  rNoLevel0: ['Niveau non donné : route calculée au niveau par défaut du moteur',
    'Level not given: route computed at the engine’s default level',
    'Flugfläche nicht angegeben: Route auf der Standardflugfläche des Rechners berechnet',
    'Nivel no indicado: ruta calculada al nivel por defecto del motor'
  ],
  rNoLevelGo: ['Donner le niveau', 'Give the level', 'Flugfläche angeben', 'Indicar el nivel'],
  // SOG-0391 (b) : la route libre créée, dite en tête avec sa cause (celle des routes NAT du sens du vol : l'heure, le niveau, les deux)
  rFreeTime: ['Route libre : aucune route NAT valable à l’entrée de l’océan vers {at}{dw}',
    'Free route: no NAT track valid at the ocean entry about {at}{dw}',
    'Freie Route: keine NAT-Route gültig am Ozeaneintritt gegen {at}{dw}',
    'Ruta libre: ninguna ruta NAT válida en la entrada al océano hacia las {at}{dw}'
  ],
  rFreeTime0: ['Route libre : aucune route NAT valable à l’heure du passage{dw}',
    'Free route: no NAT track valid at the time of passage{dw}',
    'Freie Route: keine NAT-Route gültig zur Durchflugzeit{dw}', 'Ruta libre: ninguna ruta NAT válida a la hora del paso{dw}'
  ],
  rFreeLevel: ['Route libre : aucune route NAT n’offre le FL{fl}{dir}', 'Free route: no NAT track offers FL{fl}{dir}',
    'Freie Route: keine NAT-Route bietet FL{fl}{dir}', 'Ruta libre: ninguna ruta NAT ofrece el FL{fl}{dir}'
  ],
  rFreeLevel0: ['Route libre : aucune route NAT n’offre le niveau du calcul{dir}',
    'Free route: no NAT track offers the level computed{dir}',
    'Freie Route: keine NAT-Route bietet die berechnete Flugfläche{dir}',
    'Ruta libre: ninguna ruta NAT ofrece el nivel calculado{dir}'
  ],
  rFreeBoth: ['Route libre : {dir} écartées, {nt} pour l’heure{tp}, {nl} pour le niveau (FL{fl} non offert)',
    'Free route: {dir} set aside, {nt} for the time{tp}, {nl} for the level (FL{fl} not offered)',
    'Freie Route: {dir} verworfen, {nt} wegen der Zeit{tp}, {nl} wegen der Flugfläche (FL{fl} nicht angeboten)',
    'Ruta libre: {dir} descartadas, {nt} por la hora{tp}, {nl} por el nivel (FL{fl} no ofrecido)'
  ],
  rFree0: ['Route libre : aucune route NAT du jour ne convient', 'Free route: no NAT track of the day suits',
    'Freie Route: keine NAT-Route des Tages passt', 'Ruta libre: ninguna ruta NAT del día conviene'
  ],
  rFreeDir: {
    east: ['routes vers l’est', 'eastbound tracks', 'Routen nach Osten', 'rutas hacia el este'],
    west: ['routes vers l’ouest', 'westbound tracks', 'Routen nach Westen', 'rutas hacia el oeste'],
    none: ['routes NAT', 'NAT tracks', 'NAT-Routen', 'rutas NAT'] // le sens non dit par le moteur : rien n'est deviné
  },
  rFreeWin: ['{dir} : {win}', '{dir}: {win}', '{dir}: {win}', '{dir}: {win}'],
  rFreeAt: ['entrée de l’océan vers {at}', 'ocean entry about {at}', 'Ozeaneintritt gegen {at}', 'entrada al océano hacia las {at}'],
  // SOG-0403 R1 : l'heure jugée au 30° ouest (NAT Doc 007 § 2.1.3)
  rFreeTime30: ['Route libre : aucune route NAT valable au 30° ouest vers {at}{dw}',
    'Free route: no NAT track valid at 30° west about {at}{dw}',
    'Freie Route: keine NAT-Route gültig bei 30° West gegen {at}{dw}',
    'Ruta libre: ninguna ruta NAT válida a 30° oeste hacia las {at}{dw}'
  ],
  rFreeAt30: ['passage au 30° ouest vers {at}', 'crossing 30° west about {at}', 'Überflug von 30° West gegen {at}',
    'paso por 30° oeste hacia las {at}'
  ],
  // SOG-0401 : ce qui a été vérifié, et ce qui ne l'a pas été, en tête des itinéraires ; le détail dans le pli
  // insécables : « 0 écart contrôlé » d'un bloc (l'ergonome, capture F250 : coupé après « écart »)
  rFaults0: ['0 écart contrôlé', '0 checked deviations', '0 geprüfte Abweichungen', '0 desviaciones controladas'],
  // SOG-0532 (3), (4) : une route qui enfreint une règle connue — sur sa ligne, à sa prise, et avant « Copier pour Eurocontrol »
  rFaulty: ['enfreint {n} règle(s) connue(s)', 'breaks {n} known rule(s)', 'verletzt {n} bekannte Regel(n)',
    'infringe {n} regla(s) conocida(s)'
  ],
  rTakenFaulty: ['Itinéraire pris — il enfreint {n} règle(s) connue(s) : Eurocontrol refusera ce plan.',
    'Route taken — it breaks {n} known rule(s): Eurocontrol will refuse this plan.',
    'Route übernommen — sie verletzt {n} bekannte Regel(n): Eurocontrol wird diesen Plan ablehnen.',
    'Itinerario tomado: infringe {n} regla(s) conocida(s); Eurocontrol rechazará este plan.'
  ],
  fplViolations: ['{n} règle(s) connue(s) enfreinte(s) — Eurocontrol refusera ce plan',
    '{n} known rule(s) broken — Eurocontrol will refuse this plan',
    '{n} bekannte Regel(n) verletzt — Eurocontrol wird diesen Plan ablehnen',
    '{n} regla(s) conocida(s) infringida(s): Eurocontrol rechazará este plan'
  ],
  rRadSpaces: ['Espaces inconnus de la base : leurs règles RAD ne sont pas vérifiées',
    'Spaces unknown to the base: their RAD rules are not checked',
    'Der Basis unbekannte Lufträume: ihre RAD-Regeln werden nicht geprüft',
    'Espacios desconocidos de la base: sus reglas RAD no se comprueban'
  ],
  rRadReview: ['Conditions RAD laissées à examiner', 'RAD conditions left to examine', 'Zu prüfende RAD-Bedingungen',
    'Condiciones RAD por examinar'
  ],
  rRadCut: ['liste bornée : {n} sur {t}', 'list bounded: {n} of {t}', 'Liste begrenzt: {n} von {t}', 'lista limitada: {n} de {t}'],
  rFreeValid: ['valables {win}', 'valid {win}', 'gültig {win}', 'válidas {win}'],
  // SOG-0402 : « Copier pour Eurocontrol » et son pli de relecture
  fplCopy: ['Copier pour Eurocontrol', 'Copy for Eurocontrol', 'Für Eurocontrol kopieren', 'Copiar para Eurocontrol'],
  // SOG-0533 : le niveau changé après le calcul de la route prise — sous la route, puis au-dessus de « Copier pour Eurocontrol » ;
  // SOG-0548 : son propre nom (« rStale » deux fois : celle-ci écrasait la ligne de la liste périmée, « Périmé (calculé à {t}) … »)
  rFlStale: ['Route calculée pour le FL{c} — à recalculer : le vol est au FL{f}',
    'Route computed for FL{c} — compute again: the flight is at FL{f}',
    'Route für FL{c} berechnet — neu berechnen: der Flug ist auf FL{f}',
    'Ruta calculada para el FL{c} — volver a calcular: el vuelo está en el FL{f}'
  ],
  fplStale: ['Plan de vol au FL{f} sur une route calculée pour le FL{c} : recalculez la route avant de copier',
    'Flight plan at FL{f} on a route computed for FL{c}: compute the route again before copying',
    'Flugplan auf FL{f} mit einer für FL{c} berechneten Route: Route vor dem Kopieren neu berechnen',
    'Plan de vuelo en el FL{f} con una ruta calculada para el FL{c}: vuelva a calcular la ruta antes de copiar'
  ],
  // SOG-0529 (2) : une route qui n'est qu'un direct (case 15 « DCT ») — ce qu'il faut faire ; puis sa longueur
  fplDirect: ['Aucune route calculée entre {dep} et {arr} : calculez-en une ou saisissez-la (la case 15 porte « DCT »).',
    'No route computed between {dep} and {arr}: compute one or type it (item 15 carries « DCT »).',
    'Keine Route zwischen {dep} und {arr} berechnet: berechnen oder eingeben (Feld 15 enthält „DCT“).',
    'Ninguna ruta calculada entre {dep} y {arr}: calcule una o escríbala (la casilla 15 lleva «DCT»).'
  ],
  // sa longueur seulement, sans prédiction (le relais : rien d'inventé) ; le jugement, s'il existe, est celui du contrôle de route
  fplDirectLong: ['Un direct de {d} NM ; les directs sont limités par Eurocontrol selon la région.',
    'A direct of {d} NM; directs are limited by Eurocontrol according to the region.',
    'Ein Direktflug von {d} NM; Direktflüge sind von Eurocontrol je nach Region begrenzt.',
    'Un directo de {d} NM; Eurocontrol limita los directos según la región.'
  ],
  fplFold: ['Plan de vol OACI (relecture)', 'ICAO flight plan (review)', 'ICAO-Flugplan (Durchsicht)', 'Plan de vuelo OACI (revisión)'],
  fplId: ['Identifiant', 'Identification', 'Kennung', 'Identificación'],
  fplNeutral: [
    'Identifiant neutre par défaut ({id}) ; l’immatriculation, exigée par Eurocontrol, est en case 18 (REG/) ; rien ne part sans votre geste.',
    'Neutral identification by default ({id}); the registration, required by Eurocontrol, is in item 18 (REG/); nothing leaves without your gesture.',
    'Standardmäßig neutrale Kennung ({id}); das von Eurocontrol verlangte Kennzeichen steht in Feld 18 (REG/); nichts geht ohne Ihr Zutun hinaus.',
    'Identificación neutra por defecto ({id}); la matrícula, exigida por Eurocontrol, va en la casilla 18 (REG/); nada sale sin su gesto.'
  ],
  fplEquip: [
    'Équipement supposé, pour ne contrôler que la route : {e} et PBN/{p} ; sans liaison de données, une erreur CPDLC peut rester.',
    'Equipment assumed, to check the route only: {e} and PBN/{p}; without data link, a CPDLC error may remain.',
    'Angenommene Ausrüstung, nur um die Route zu prüfen: {e} und PBN/{p}; ohne Datenlink kann ein CPDLC-Fehler bleiben.',
    'Equipo supuesto, para comprobar solo la ruta: {e} y PBN/{p}; sin enlace de datos, puede quedar un error CPDLC.'
  ],
  fplNow: ['Départ : maintenant, arrondi aux cinq minutes suivantes ({t}).', 'Departure: now, rounded up to the next five minutes ({t}).',
    'Abflug: jetzt, auf die nächsten fünf Minuten aufgerundet ({t}).', 'Salida: ahora, redondeada a los cinco minutos siguientes ({t}).'
  ],
  fplAt: ['Départ : l’heure du vol ({t}).', 'Departure: the flight’s time ({t}).', 'Abflug: die Zeit des Flugs ({t}).',
    'Salida: la hora del vuelo ({t}).'
  ],
  fplNoSid: ['Aucune SID écrite : le raccord direct depuis {ad} est jugé par Eurocontrol.',
    'No SID written: the direct connection from {ad} is judged by Eurocontrol.',
    'Keine SID geschrieben: die Direktverbindung ab {ad} beurteilt Eurocontrol.',
    'Ninguna SID escrita: la conexión directa desde {ad} la juzga Eurocontrol.'
  ],
  fplNoStar: ['Aucune STAR écrite : le raccord direct vers {ad} est jugé par Eurocontrol.',
    'No STAR written: the direct connection to {ad} is judged by Eurocontrol.',
    'Keine STAR geschrieben: die Direktverbindung nach {ad} beurteilt Eurocontrol.',
    'Ninguna STAR escrita: la conexión directa hacia {ad} la juzga Eurocontrol.'
  ],
  fplOceanic: ['Routes NAT, voies nord-américaines et points de l’Atlantique Nord : non contrôlés par Eurocontrol.',
    'NAT tracks, North American routes and North Atlantic points: not checked by Eurocontrol.',
    'NAT-Routen, nordamerikanische Strecken und Punkte des Nordatlantiks: von Eurocontrol nicht geprüft.',
    'Rutas NAT, rutas norteamericanas y puntos del Atlántico Norte: no comprobados por Eurocontrol.'
  ],
  fplBad: ['Le message ne peut pas être copié : {l}.', 'The message cannot be copied: {l}.',
    'Die Nachricht kann nicht kopiert werden: {l}.',
    'El mensaje no puede copiarse: {l}.'
  ],
  fplErr: {
    id: ['identifiant (une lettre puis 6 lettres ou chiffres au plus)', 'identification (a letter then 6 letters or digits at most)',
      'Kennung (ein Buchstabe, dann höchstens 6 Buchstaben oder Ziffern)',
      'identificación (una letra y luego 6 letras o cifras como máximo)'
    ],
    type: ['type OACI de l’aéronef', 'ICAO aircraft type', 'ICAO-Luftfahrzeugmuster', 'tipo OACI de la aeronave'],
    dep: ['départ (quatre lettres)', 'departure (four letters)', 'Abflug (vier Buchstaben)', 'salida (cuatro letras)'],
    arr: ['arrivée (quatre lettres)', 'arrival (four letters)', 'Ankunft (vier Buchstaben)', 'llegada (cuatro letras)'],
    altn: ['dégagement (quatre lettres)', 'alternate (four letters)', 'Ausweich (vier Buchstaben)', 'alternativo (cuatro letras)'],
    speed: ['vitesse de croisière', 'cruise speed', 'Reisegeschwindigkeit', 'velocidad de crucero'],
    level: ['niveau de croisière (FL010 à FL660)', 'cruise level (FL010 to FL660)', 'Reiseflugfläche (FL010 bis FL660)',
      'nivel de crucero (FL010 a FL660)'
    ],
    route: ['route vide', 'empty route', 'leere Route', 'ruta vacía'],
    reg: ['immatriculation de la fiche hors de la forme OACI (2 à 7 lettres et chiffres)',
      'registration of the sheet not in ICAO form (2 to 7 letters and digits)',
      'Kennzeichen des Blatts nicht in ICAO-Form (2 bis 7 Buchstaben und Ziffern)',
      'matrícula de la ficha fuera de la forma OACI (2 a 7 letras y cifras)'
    ],
    routeword: ['route : élément hors de la forme OACI « {t} »', 'route: element not in ICAO form “{t}”',
      'Route: Element nicht in ICAO-Form „{t}“', 'ruta: elemento fuera de la forma OACI «{t}»'
    ],
    eet: ['durée estimée', 'estimated time', 'geschätzte Dauer', 'duración estimada'],
    alphabet: ['caractère hors de l’alphabet du message', 'character outside the message alphabet',
      'Zeichen außerhalb des Nachrichtenalphabets',
      'carácter fuera del alfabeto del mensaje'
    ]
  },
  // SOG-0398 : la ligne sous les terrains — l'état du dégagement, ses critères dans un pli
  altnChk: {
    ok: ['Dégagement {id} : piste, moyens et météo bons', 'Alternate {id}: runway, aids and weather good',
      'Ausweichflugplatz {id}: Piste, Navigationshilfen und Wetter gut', 'Alternativo {id}: pista, medios y meteorología buenos'
    ],
    warn: ['Dégagement {id} : utilisable, avec réserve ({w})', 'Alternate {id}: usable, with a reservation ({w})',
      'Ausweichflugplatz {id}: nutzbar, mit Vorbehalt ({w})', 'Alternativo {id}: utilizable, con reserva ({w})'
    ],
    err: ['Dégagement {id} : ne convient pas ({w})', 'Alternate {id}: not suitable ({w})', 'Ausweichflugplatz {id}: nicht geeignet ({w})',
      'Alternativo {id}: no conviene ({w})'
    ],
    grey: ['Dégagement {id} : non vérifié ({w})', 'Alternate {id}: not checked ({w})', 'Ausweichflugplatz {id}: nicht geprüft ({w})',
      'Alternativo {id}: no comprobado ({w})'
    ]
  },
  altnCount: ['{ok} bon(s), {g} non vérifié(s)', '{ok} good, {g} not checked', '{ok} gut, {g} nicht geprüft',
    '{ok} bueno(s), {g} no comprobado(s)'
  ],
  altnCountOk: ['{ok} bon(s)', '{ok} good', '{ok} gut', '{ok} bueno(s)'],
  altnK: {
    rwy: ['piste', 'runway', 'Piste', 'pista'],
    aids: ['moyens', 'aids', 'Navigationshilfen', 'medios'],
    wx: ['météo', 'weather', 'Wetter', 'meteorología'],
    dist: ['distance', 'distance', 'Entfernung', 'distancia'] // SOG-0528
  },
  altnFold: ['Critères du dégagement', 'Alternate criteria', 'Kriterien des Ausweichflugplatzes', 'Criterios del alternativo'],
  altnHard: ['en dur', 'hard', 'befestigte', 'pavimentada'],
  altnAny: ['hors plan d’eau', 'other than water', 'außer Wasser', 'fuera de lámina de agua'],
  altnWhy: {
    rwyOk: ['Piste : la plus longue piste {s} fait {l} ft ; la fiche demande {m} ft.',
      'Runway: the longest {s} runway is {l} ft; the sheet asks for {m} ft.',
      'Piste: die längste {s} Piste misst {l} ft; das Blatt verlangt {m} ft.',
      'Pista: la pista {s} más larga mide {l} ft; la ficha pide {m} ft.'
    ],
    rwyShort: ['Piste : la plus longue piste {s} fait {l} ft, sous les {m} ft de la fiche.',
      'Runway: the longest {s} runway is {l} ft, below the sheet’s {m} ft.',
      'Piste: die längste {s} Piste misst {l} ft, unter den {m} ft des Blatts.',
      'Pista: la pista {s} más larga mide {l} ft, por debajo de los {m} ft de la ficha.'
    ],
    rwyNoHard: ['Piste : aucune piste en dur ; la fiche en demande une de {m} ft.',
      'Runway: no hard runway; the sheet asks for one of {m} ft.',
      'Piste: keine befestigte Piste; das Blatt verlangt eine von {m} ft.',
      'Pista: ninguna pista pavimentada; la ficha pide una de {m} ft.'
    ],
    rwyNoSheet: ['Piste : non vérifiée — la fiche de l’aéronef ne donne pas de longueur de piste mini.',
      'Runway: not checked — the aircraft sheet gives no minimum runway length.',
      'Piste: nicht geprüft — das Luftfahrzeugblatt nennt keine Mindestpistenlänge.',
      'Pista: no comprobada — la ficha de la aeronave no da longitud mínima de pista.'
    ],
    rwyNoAd: ['Piste : non vérifiée — terrain inconnu de la base.', 'Runway: not checked — aerodrome unknown to the base.',
      'Piste: nicht geprüft — Flugplatz der Datenbank unbekannt.', 'Pista: no comprobada — aeródromo desconocido en la base.'
    ],
    rwyNoData: ['Piste : non vérifiée — la base ne donne pas la longueur des pistes de ce terrain.',
      'Runway: not checked — the base does not give this aerodrome’s runway lengths.',
      'Piste: nicht geprüft — die Datenbank nennt die Pistenlängen dieses Flugplatzes nicht.',
      'Pista: no comprobada — la base no da la longitud de las pistas de este aeródromo.'
    ],
    rwyType: ['Piste : non vérifiée — revêtement de la fiche ({t}) non lu dans la base.',
      'Runway: not checked — the sheet’s surface ({t}) is not read from the base.',
      'Piste: nicht geprüft — der Belag des Blatts ({t}) wird aus der Datenbank nicht gelesen.',
      'Pista: no comprobada — la superficie de la ficha ({t}) no se lee en la base.'
    ],
    aidsApp: ['Moyens : {n} approche(s) aux instruments dans la base.', 'Aids: {n} instrument approach(es) in the base.',
      'Navigationshilfen: {n} Instrumentenanflug/-anflüge in der Datenbank.',
      'Medios: {n} aproximación(es) instrumental(es) en la base.'
    ],
    aidsVisual: ['Moyens : aucune approche aux instruments dans la base — à vue seulement.',
      'Aids: no instrument approach in the base — visual only.',
      'Navigationshilfen: kein Instrumentenanflug in der Datenbank — nur Sichtanflug.',
      'Medios: ninguna aproximación instrumental en la base — solo visual.'
    ],
    aidsPartial: ['Moyens : non vérifiés — procédures du terrain lues en partie, sans approche parmi les pages lues.',
      'Aids: not checked — the aerodrome’s procedures partly read, no approach among the pages read.',
      'Navigationshilfen: nicht geprüft — Verfahren des Flugplatzes teilweise gelesen, kein Anflug in den gelesenen Seiten.',
      'Medios: no comprobados — procedimientos del aeródromo leídos en parte, sin aproximación en las páginas leídas.'
    ],
    // SOG-0528 : la distance de l'arrivée, la règle de la proposition (30 à 300 NM)
    distFar: ['Distance : {d} NM de l’arrivée, au-delà des {max} NM d’un dégagement.',
      'Distance: {d} NM from the arrival, beyond the {max} NM of an alternate.',
      'Entfernung: {d} NM vom Zielflugplatz, über den {max} NM eines Ausweichflugplatzes.',
      'Distancia: {d} NM de la llegada, más allá de los {max} NM de un alternativo.'
    ],
    distNear: ['Distance : {d} NM de l’arrivée, en deçà de {min} NM (même météo probable).',
      'Distance: {d} NM from the arrival, under {min} NM (likely the same weather).',
      'Entfernung: {d} NM vom Zielflugplatz, unter {min} NM (wahrscheinlich dasselbe Wetter).',
      'Distancia: {d} NM de la llegada, por debajo de {min} NM (probablemente el mismo tiempo).'
    ],
    aidsNoBase: ['Moyens : non vérifiés — la base ne tient pas les procédures de ce terrain.',
      'Aids: not checked — the base does not hold this aerodrome’s procedures.',
      'Navigationshilfen: nicht geprüft — die Datenbank hat die Verfahren dieses Flugplatzes nicht.',
      'Medios: no comprobados — la base no tiene los procedimientos de este aeródromo.'
    ],
    wxCat: ['Météo (indicateur) : {c} au pire entre {a} et {b}, d’après le TAF (TEMPO et PROB compris).',
      'Weather (indicator): {c} at worst between {a} and {b}, from the TAF (TEMPO and PROB included).',
      'Wetter (Indikator): schlimmstenfalls {c} zwischen {a} und {b}, laut TAF (TEMPO und PROB eingeschlossen).',
      'Meteorología (indicador): {c} en el peor caso entre {a} y {b}, según el TAF (TEMPO y PROB incluidos).'
    ],
    wxNoTime: ['Météo : non vérifiée — la date du vol ou sa durée manque (l’heure d’arrivée au dégagement est inconnue).',
      'Weather: not checked — the flight’s date or duration is missing (the time of arrival at the alternate is unknown).',
      'Wetter: nicht geprüft — Datum oder Dauer des Flugs fehlt (Ankunftszeit am Ausweichflugplatz unbekannt).',
      'Meteorología: no comprobada — falta la fecha o la duración del vuelo (hora de llegada al alternativo desconocida).'
    ],
    wxNotRead: ['Météo : non vérifiée — la météo des terrains n’est pas encore lue.',
      'Weather: not checked — the aerodromes’ weather is not read yet.',
      'Wetter: nicht geprüft — das Flugplatzwetter ist noch nicht gelesen.',
      'Meteorología: no comprobada — la meteorología de los aeródromos aún no se ha leído.'
    ],
    // SOG-0527 (2) : la page lit d'elle-même ce qui manque ; pendant la lecture, et quand elle échoue (sa cause)
    wxReading: ['Météo : lecture de la météo des terrains…', 'Weather: reading the aerodromes’ weather…',
      'Wetter: Flugplatzwetter wird gelesen…', 'Meteorología: leyendo la meteorología de los aeródromos…'
    ],
    wxUnreachable: ['source météo injoignable', 'weather source unreachable', 'Wetterquelle nicht erreichbar',
      'fuente meteorológica inaccesible'
    ],
    wxFailed: ['Météo : non vérifiée — lecture impossible ({why})', 'Weather: not checked — could not be read ({why})',
      'Wetter: nicht geprüft — konnte nicht gelesen werden ({why})', 'Meteorología: no comprobada — no se pudo leer ({why})'
    ],
    wxNoTaf: ['Météo : non vérifiée — aucun TAF lu pour ce terrain.', 'Weather: not checked — no TAF read for this aerodrome.',
      'Wetter: nicht geprüft — kein TAF für diesen Flugplatz gelesen.',
      'Meteorología: no comprobada — ningún TAF leído para este aeródromo.'
    ],
    wxNoKey: ['Météo : non vérifiée — TAF indisponible sur cet appareil (ni lanceur ni clé météo).',
      'Weather: not checked — TAF unavailable on this device (no launcher nor weather key).',
      'Wetter: nicht geprüft — TAF auf diesem Gerät nicht verfügbar (weder Starter noch Wetterschlüssel).',
      'Meteorología: no comprobada — TAF no disponible en este dispositivo (ni lanzador ni clave meteorológica).'
    ],
    wxOutside: ['Météo : non vérifiée — l’arrivée au dégagement ({at}) sort de la validité du TAF.',
      'Weather: not checked — the arrival at the alternate ({at}) is outside the TAF’s validity.',
      'Wetter: nicht geprüft — die Ankunft am Ausweichflugplatz ({at}) liegt außerhalb der Gültigkeit des TAF.',
      'Meteorología: no comprobada — la llegada al alternativo ({at}) queda fuera de la validez del TAF.'
    ],
    wxNoCat: ['Météo : non vérifiée — le TAF ne donne ni plafond ni visibilité entre {a} et {b}.',
      'Weather: not checked — the TAF gives neither ceiling nor visibility between {a} and {b}.',
      'Wetter: nicht geprüft — das TAF nennt weder Wolkenuntergrenze noch Sicht zwischen {a} und {b}.',
      'Meteorología: no comprobada — el TAF no da techo ni visibilidad entre {a} y {b}.'
    ]
  },
  // SOG-0398 lot 2 : « Proposer un dégagement »
  altnPropose: ['Proposer un dégagement', 'Suggest an alternate', 'Ausweichflugplatz vorschlagen', 'Proponer un alternativo'],
  altnPropBusy: ['Recherche des terrains de dégagement…', 'Looking for alternates…', 'Suche nach Ausweichflugplätzen…',
    'Buscando aeródromos alternativos…'
  ],
  altnPropMsg: {
    noSheet: ['Pas de proposition : la fiche de l’aéronef ne donne pas de longueur de piste mini.',
      'No suggestion: the aircraft sheet gives no minimum runway length.',
      'Kein Vorschlag: das Luftfahrzeugblatt nennt keine Mindestpistenlänge.',
      'Sin propuesta: la ficha de la aeronave no da longitud mínima de pista.'
    ],
    noArr: ['Pas de proposition : la position de l’arrivée est inconnue.', 'No suggestion: the arrival’s position is unknown.',
      'Kein Vorschlag: die Position des Zielflugplatzes ist unbekannt.', 'Sin propuesta: la posición de la llegada es desconocida.'
    ],
    // SOG-0494 : seule une piste trop courte (ou sans le bon revêtement) écarte encore un terrain
    none: ['Aucun terrain entre 30 et 300 NM de l’arrivée n’a de piste assez longue.',
      'No aerodrome between 30 and 300 NM from the arrival has a long enough runway.',
      'Kein Flugplatz zwischen 30 und 300 NM vom Ziel hat eine ausreichend lange Piste.',
      'Ningún aeródromo entre 30 y 300 NM de la llegada tiene una pista lo bastante larga.'
    ]
  },
  altnPropHead: ['Les plus proches de {arr} (piste et moyens vérifiés d’abord)', 'Closest to {arr} (runway and aids checked first)',
    'Am nächsten zu {arr} (geprüfte Piste und Navigationshilfen zuerst)',
    'Los más cercanos a {arr} (pista y medios comprobados primero)'
  ],
  altnPropWhy: {
    'rwy-unread': ['piste non vérifiée', 'runway not checked', 'Piste nicht geprüft', 'pista no comprobada'], // SOG-0494
    'aids-unread': ['moyens non vérifiés', 'aids not checked', 'Navigationshilfen nicht geprüft', 'medios no comprobados'],
    'aids-visual': ['à vue seulement', 'visual only', 'nur Sichtanflug', 'solo visual'],
    'wx-ifr': ['météo IFR', 'IFR weather', 'IFR-Wetter', 'meteorología IFR'],
    'wx-lifr': ['météo LIFR', 'LIFR weather', 'LIFR-Wetter', 'meteorología LIFR'],
    'wx-unread': ['météo non lue', 'weather not read', 'Wetter nicht gelesen', 'meteorología no leída']
  },
  altnPropMore: ['{n} autre(s) sur la Carte.', '{n} more on the Map.', '{n} weitere auf der Karte.', '{n} más en el mapa.'],
  altnProposed: ['Proposé : {icao}', 'Suggested: {icao}', 'Vorgeschlagen: {icao}', 'Propuesto: {icao}'],
  altnTake: ['Prendre', 'Take', 'Übernehmen', 'Tomar'],
  altnWxNote: ['La météo est un indicateur (catégories VFR, MVFR, IFR, LIFR de la FAA), jamais une conformité aux minima du terrain.',
    'The weather is an indicator (the FAA’s VFR, MVFR, IFR, LIFR categories), never compliance with the aerodrome’s minima.',
    'Das Wetter ist ein Indikator (FAA-Kategorien VFR, MVFR, IFR, LIFR), nie die Einhaltung der Minima des Flugplatzes.',
    'La meteorología es un indicador (categorías VFR, MVFR, IFR, LIFR de la FAA), nunca la conformidad con los mínimos del aeródromo.'
  ],
  fplJoined: ['Deux indicatifs pour le même tracé ({v}) : le premier est écrit.',
    'Two designators for the same track ({v}): the first is written.',
    'Zwei Bezeichner für dieselbe Strecke ({v}): der erste wird geschrieben.',
    'Dos designadores para el mismo trazado ({v}): se escribe el primero.'
  ],
  fplLevelTens: ['Niveau {a} écrit {b} : un niveau de croisière va de dix en dix.',
    'Level {a} written {b}: a cruise level goes in steps of ten.',
    'Flugfläche {a} als {b} geschrieben: eine Reiseflugfläche geht in Zehnerschritten.',
    'Nivel {a} escrito {b}: un nivel de crucero va de diez en diez.'
  ],
  fplRegNeutral: ['Immatriculation neutre ({r}) : la fiche de l’aéronef n’en donne pas.',
    'Neutral registration ({r}): the aircraft sheet gives none.',
    'Neutrales Kennzeichen ({r}): das Luftfahrzeugblatt nennt keines.',
    'Matrícula neutra ({r}): la ficha de la aeronave no da ninguna.'
  ],
  fplCopiedHf: ['Plan de vol copié. Attention : traversée océanique, radio HF exigée — l’équipement supposé ne la porte pas.',
    'Flight plan copied. Caution: oceanic crossing, HF radio required — the assumed equipment does not carry it.',
    'Flugplan kopiert. Achtung: Ozeanüberquerung, HF-Funk vorgeschrieben — die angenommene Ausrüstung hat ihn nicht.',
    'Plan de vuelo copiado. Atención: travesía oceánica, radio HF obligatoria; el equipo supuesto no la lleva.'
  ],
  fplNoHf: ['Route océanique : la radio HF y est exigée, et l’équipement supposé ne la porte pas — Eurocontrol refusera sans elle.',
    'Oceanic route: HF radio is required there, and the assumed equipment does not carry it — Eurocontrol will refuse without it.',
    'Ozeanische Route: dort ist HF-Funk vorgeschrieben, und die angenommene Ausrüstung hat ihn nicht — Eurocontrol lehnt ohne ihn ab.',
    'Ruta oceánica: la radio HF es obligatoria y el equipo supuesto no la lleva; Eurocontrol rechazará sin ella.'
  ],
  fplWake: ['Catégorie de turbulence de sillage inconnue du catalogue : « M » supposée.',
    'Wake turbulence category unknown to the catalogue: « M » assumed.',
    'Wirbelschleppenkategorie im Katalog unbekannt: „M“ angenommen.',
    'Categoría de estela turbulenta desconocida en el catálogo: «M» supuesta.'
  ],
  fplCopied: ['Plan de vol copié : collez-le dans la validation d’Eurocontrol.',
    'Flight plan copied: paste it into Eurocontrol’s validation.',
    'Flugplan kopiert: fügen Sie ihn in die Validierung von Eurocontrol ein.',
    'Plan de vuelo copiado: péguelo en la validación de Eurocontrol.'
  ],
  rFreeRecalc: ['Recalculer à FL{fl}', 'Recompute at FL{fl}', 'Neu berechnen auf FL{fl}', 'Recalcular a FL{fl}'],
  rFreeNow: ['Départ pris à {t} (maintenant).', 'Departure taken at {t} (now).', 'Abflug angenommen um {t} (jetzt).',
    'Salida tomada a las {t} (ahora).'
  ],
  // le FL gris de la ligne de route, quand c'est le niveau par défaut du moteur (jamais pris pour celui du vol)
  rFlDefault: ['FL{fl} par défaut', 'FL{fl} by default', 'FL{fl} (Standard)', 'FL{fl} por defecto'],
  // SOG-0517 : les passages que « Calculer A → B » doit passer : ceux que le pilote a tapés et ceux de la mission
  rViaImposed: ['Passages imposés au calcul : {list} — effacez-les du champ Route pour laisser le calcul libre.',
    'Passages imposed on the computation: {list} — erase them from the Route field to leave the computation free.',
    'Dem Rechner vorgegebene Durchgänge: {list} — löschen Sie sie aus dem Feld Route, um die Berechnung frei zu lassen.',
    'Pasos impuestos al cálculo: {list} — bórrelos del campo Ruta para dejar el cálculo libre.'
  ],
  // SOG-0517 : le vol sans niveau prend celui du calcul
  rLevelSet: ['Niveau du vol fixé à FL{fl}, celui du calcul de la route : le devis et le plan de vol le portent.',
    'Flight level set to FL{fl}, the one of the route computation: the quote and the flight plan carry it.',
    'Flughöhe auf FL{fl} gesetzt, die der Routenberechnung: Angebot und Flugplan übernehmen sie.',
    'Nivel del vuelo fijado en FL{fl}, el del cálculo de la ruta: el presupuesto y el plan de vuelo lo llevan.'
  ],
  rClose: ['Fermer les propositions', 'Close the proposals', 'Vorschläge schließen', 'Cerrar las propuestas'],
  // SOG-0545 : le pendant de « Fermer les propositions », sur la ligne « Itinéraire choisi » (la même liste, sans recalcul)
  rReview: ['Revoir les propositions', 'Review the proposals', 'Vorschläge erneut ansehen', 'Volver a ver las propuestas'],
  // SOG-0545 (l'ergonome) : sur la ligne d'un niveau d'« Auto » dont l'arrivée (ou le départ) se fait par un raccord direct
  rDirect: ['raccord direct', 'direct connector', 'Direktanschluss', 'enlace directo'],
  // SOG-0296 : deux demandes — la route de tête tout de suite, les variantes ensuite ; le cache du poste dit
  rMoreBusy: ['Variantes en recherche…', 'Searching for variants…', 'Varianten werden gesucht…', 'Buscando variantes…'],
  rMoreNone: ['Pas d’autre variante trouvée.', 'No other variant found.', 'Keine andere Variante gefunden.',
    'No se encontró otra variante.'
  ],
  rMoreFail: ['Variantes non trouvées : la route de tête reste.', 'Variants not found: the head route stays.',
    'Varianten nicht gefunden: die Hauptroute bleibt.', 'Variantes no encontradas: la ruta principal se queda.'
  ],
  rMoreStop: ['Recherche des variantes arrêtée : la route de tête reste.', 'Search for variants stopped: the head route stays.',
    'Variantensuche abgebrochen: die Hauptroute bleibt.', 'Búsqueda de variantes detenida: la ruta principal se queda.'
  ],
  rMoreCache: ['Variantes du cache, calculées à {t}', 'Variants from the cache, computed at {t}',
    'Varianten aus dem Cache, berechnet um {t}',
    'Variantes de la caché, calculadas a las {t}'
  ],
  rCache: ['Du cache, calculé à {t}', 'From the cache, computed at {t}', 'Aus dem Cache, berechnet um {t}',
    'De la caché, calculado a las {t}'
  ],
  rProposals: ['Propositions non validées', 'Unvalidated proposals', 'Nicht bestätigte Vorschläge', 'Propuestas no validadas'],
  // SOG-0161 (restes) : une réponse sans route calculée le dit en titre ; une proposition se prend comme telle
  rNoRoute: ['Pas de route calculée', 'No route computed', 'Keine Route berechnet', 'Ninguna ruta calculada'],
  rTakeProposal: ['Prendre cette proposition', 'Take this proposal', 'Diesen Vorschlag übernehmen', 'Tomar esta propuesta'],
  rProposal: ['Proposition {n}', 'Proposal {n}', 'Vorschlag {n}', 'Propuesta {n}'],
  rTakenProposal: ['Proposition non validée prise : à vérifier — {share}.', 'Unvalidated proposal taken: to be checked — {share}.',
    'Nicht bestätigter Vorschlag übernommen: zu prüfen — {share}.', 'Propuesta no validada tomada: a verificar — {share}.'
  ],
  // un itinéraire dont le contrôle est incomplet faute de données (SOG-0081, RouteSim du 9 nov. 17 h 05) : jamais présenté comme contrôlé
  // SOG-0263 : un itinéraire qui emprunte les routes NAT du jour le dit, et dit si elles sont périmées
  rNat: ['via NAT {t}', 'via NAT {t}', 'über NAT {t}', 'vía NAT {t}'],
  rNatStale: ['périmée : routes NAT du {d}', 'stale: NAT tracks of {d}', 'veraltet: NAT-Tracks vom {d}', 'caducada: rutas NAT del {d}'],
  rIncomplete: ['contrôle incomplet', 'incomplete check', 'unvollständige Prüfung', 'control incompleto'],
  rIncompleteWhy: ['Contrôle incomplet faute de données : ce qui n’a pas pu être vérifié n’est pas un écart, ni une route validée.',
    'Incomplete check for missing data: what could not be checked is neither a deviation nor a validated route.',
    'Unvollständige Prüfung mangels Daten: Was nicht geprüft werden konnte, ist weder eine Abweichung noch eine bestätigte Route.',
    'Control incompleto por falta de datos: lo que no pudo comprobarse no es una desviación ni una ruta validada.'
  ],
  rTakenIncomplete: ['Itinéraire pris — son contrôle est incomplet faute de données : à vérifier.',
    'Route taken — its check is incomplete for missing data: to be verified.',
    'Route übernommen — ihre Prüfung ist mangels Daten unvollständig: zu prüfen.',
    'Itinerario tomado: su control está incompleto por falta de datos, a comprobar.'
  ],
  rCheckOk: ['Contrôle : aucun écart détecté (précontrôle de simulation)', 'Check: no deviation found (simulation pre-check)',
    'Prüfung: keine Abweichung gefunden (Simulations-Vorprüfung)', 'Comprobación: ninguna desviación (precontrol de simulación)'
  ],
  rCheckN: ['{n} écart(s) aux règles', '{n} rule deviation(s)', '{n} Regelabweichung(en)', '{n} desviación(es) de las reglas'],
  rautoHint: ['Inscrire les voies aériennes entre les points au niveau prévu',
    'Write the airways between the points at the planned level',
    'Luftstraßen zwischen den Punkten auf der geplanten Flugfläche eintragen',
    'Inscribir las aerovías entre los puntos al nivel previsto'
  ],
  autoOne: ['1 voie inscrite, {d}', '1 airway written, {d}', '1 Luftstraße eingetragen, {d}', '1 aerovía inscrita, {d}'],
  autoMany: ['{n} voies inscrites, {d}', '{n} airways written, {d}', '{n} Luftstraßen eingetragen, {d}', '{n} aerovías inscritas, {d}'],
  autoNone: ['Aucune voie utile entre {a} et {b} ({why}){more}', 'No useful airway between {a} and {b} ({why}){more}',
    'Keine nutzbare Luftstraße zwischen {a} und {b} ({why}){more}', 'Ninguna aerovía útil entre {a} y {b} ({why}){more}'
  ],
  // la raison d'un tronçon resté direct (§ 10.31 : « route non trouvée » est un fait que le pilote lit, jamais un silence)
  autoWhyNone: ['pas de voie près de {a}', 'no airway near {a}', 'keine Luftstraße nahe {a}', 'ninguna aerovía cerca de {a}'],
  autoWhyFar: ['trop loin des voies', 'too far from the airways', 'zu weit von den Luftstraßen', 'demasiado lejos de las aerovías'],
  autoWhyDetour: ['détour de plus de {p} %', 'detour of more than {p} %', 'Umweg von mehr als {p} %', 'desvío de más del {p} %'],
  // une voie relie bien les deux points mais n'est pas ouverte au niveau du tronçon (§ 10.31 : la plage ouverte, le pilote décide)
  autoWhyClosed: ['{w} relie {a} à {b}, fermée au {lvl} (ouverte de {lo} au {hi}) : tronçon direct',
    '{w} joins {a} to {b}, closed at {lvl} (open from {lo} to {hi}): direct leg',
    '{w} verbindet {a} mit {b}, gesperrt auf {lvl} (offen von {lo} bis {hi}): direkter Abschnitt',
    '{w} une {a} con {b}, cerrada a {lvl} (abierta de {lo} a {hi}): tramo directo'
  ],
  autoWhyLoop: ['la route repasserait par un point', 'the route would pass a point twice',
    'die Route würde einen Punkt zweimal überfliegen',
    'la ruta pasaría dos veces por un punto'
  ],
  // « A VOIE B » où la voie ne relie pas A à B dans le couloir du tronçon (§ 10.31) : le tronçon reste direct
  awyBad: ['Voie {w} : non reliée dans la base, tronçon tracé en direct', 'Airway {w}: not joined in the base, leg drawn direct',
    'Luftstraße {w}: in der Basis nicht verbunden, Abschnitt direkt gezeichnet',
    'Aerovía {w}: no unida en la base, tramo trazado en directo'
  ],
  // la SID choisie rejoint la route tapée par un direct depuis sa sortie (§ 10.31)
  procExitDct: ['{sid} sort à {exit} : {exit} DCT {next}', '{sid} exits at {exit}: {exit} DCT {next}',
    '{sid} endet bei {exit}: {exit} DCT {next}',
    '{sid} sale por {exit}: {exit} DCT {next}'
  ],
  autoNoLeg: ['Aucun tronçon sans voie à compléter.', 'No leg without an airway to fill in.',
    'Kein Abschnitt ohne Luftstraße zu ergänzen.',
    'Ningún tramo sin aerovía por completar.'
  ],
  autoNoBase: ['Base aéronautique indisponible : voies non lues.', 'Aeronautical base unavailable: airways not read.',
    'Luftfahrtdatenbank nicht verfügbar: Luftstraßen nicht gelesen.', 'Base aeronáutica no disponible: aerovías sin leer.'
  ],
  autoNoLevel: ['Pas de niveau prévu : voies cherchées à {l}.', 'No planned level: airways looked up at {l}.',
    'Keine geplante Flugfläche: Luftstraßen auf {l} gesucht.', 'Sin nivel previsto: aerovías buscadas a {l}.'
  ],
  ptsN: ['Points ({n})', 'Points ({n})', 'Punkte ({n})', 'Puntos ({n})'],
  // une procédure choisie dans la liste des points : une ligne de groupe, ses repères dépliés au toucher (§ 10.31)
  ptsGroupN: ['{n} points', '{n} points', '{n} Punkte', '{n} puntos'],
  ptsGroup1: ['1 point', '1 point', '1 Punkt', '1 punto'],
  stepNames: [
    ['Vol', 'Flight', 'Flug', 'Vuelo'],
    ['Route', 'Route', 'Route', 'Ruta'],
    ['Météo', 'Weather', 'Wetter', 'Meteorología'],
    ['Résultat', 'Result', 'Ergebnis', 'Resultado'],
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
  // SOG-0089 : la piste écrite après le terrain (« LFPO/07 ») que le terrain n'a pas
  rwyRemoved: ['Piste de {side} retirée ({ad}).', '{side} runway removed ({ad}).', '{side} entfernt ({ad}).',
    'Pista de {side} retirada ({ad}).'
  ],
  rwySideDep: ['départ', 'Departure', 'Abflugpiste', 'salida'],
  rwySideArr: ['arrivée', 'Arrival', 'Landepiste', 'llegada'],
  groupIgnored: ['{g} : le groupe vitesse et niveau du plan de vol est ignoré ; le niveau du vol reste celui de l’étape Vol.',
    '{g}: the speed and level group of the flight plan is ignored; the flight level stays the one of the Flight step.',
    '{g}: Die Geschwindigkeits- und Höhengruppe des Flugplans wird ignoriert; die Flughöhe bleibt die des Schritts Flug.',
    '{g}: el grupo de velocidad y nivel del plan de vuelo se ignora; el nivel del vuelo sigue siendo el del paso Vuelo.'
  ],
  rwyUnknown: ['{ad}/{rwy} : piste inconnue de ce terrain, rien n’est choisi.',
    '{ad}/{rwy}: runway unknown at this aerodrome, nothing is chosen.',
    '{ad}/{rwy}: Piste an diesem Flugplatz unbekannt, nichts gewählt.',
    '{ad}/{rwy}: pista desconocida en este aeródromo, no se elige nada.'
  ],
  // SOG-0088 : un direct vers un point sur instruction du contrôle (vol démarré ; le panneau avant d'écrire)
  directTitle: ['Direct vers un point', 'Direct to a point', 'Direkt zu einem Punkt', 'Directo a un punto'],
  directField: ['Direct vers… (nom du point)', 'Direct to… (point name)', 'Direkt zu… (Punktname)', 'Directo a… (nombre del punto)'],
  directPrep: ['Préparer le direct', 'Prepare the direct', 'Direkt vorbereiten', 'Preparar el directo'],
  directLine: ['Direct {to} depuis {from} : {skipped} · {dnm} · ≈ {dmin} · ≈ {dfuel}',
    'Direct {to} from {from}: {skipped} · {dnm} · ≈ {dmin} · ≈ {dfuel}',
    'Direkt {to} ab {from}: {skipped} · {dnm} · ≈ {dmin} · ≈ {dfuel}',
    'Directo {to} desde {from}: {skipped} · {dnm} · ≈ {dmin} · ≈ {dfuel}'
  ],
  directFromActual: ['votre position ({t})', 'your position ({t})', 'Ihrer Position ({t})', 'su posición ({t})'],
  directFromPlanned: ['la position prévue', 'the planned position', 'der geplanten Position', 'la posición prevista'],
  directFromPassed: ['le dernier point passé selon le plan ({id})', 'the last point passed according to the plan ({id})',
    'dem laut Plan zuletzt überflogenen Punkt ({id})', 'el último punto pasado según el plan ({id})'
  ],
  directSkipped: ['{list} sautés', '{list} skipped', '{list} ausgelassen', '{list} omitidos'],
  directSkipped1: ['{list} sauté', '{list} skipped', '{list} ausgelassen', '{list} omitido'],
  directSkipped0: ['aucun point sauté', 'no point skipped', 'kein Punkt ausgelassen', 'ningún punto omitido'],
  directLock: ['Saute {id}, imposé par la mission.', 'Skips {id}, imposed by the mission.', 'Lässt {id} aus, von der Mission vorgegeben.',
    'Omite {id}, impuesto por la misión.'
  ],
  directHold: ['{id} : {n} min sur zone retirées du devis.', '{id}: {n} min on area removed from the quote.',
    '{id}: {n} Min. im Gebiet aus der Berechnung entfernt.', '{id}: {n} min en zona retiradas del cálculo.'
  ],
  directResume: ['Reprendre la route à', 'Resume the route at', 'Route fortsetzen bei', 'Reanudar la ruta en'],
  directApply: ['Appliquer le direct', 'Apply the direct', 'Direkt anwenden', 'Aplicar el directo'],
  directCancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  directAskLock: [
    'Ce direct saute {list}, imposé par la mission. L’appliquer quand même ? Le compte rendu le dira (« non survolé : direct du contrôle »).',
    'This direct skips {list}, imposed by the mission. Apply it anyway? The report will say so (“not overflown: direct from ATC”).',
    'Dieses Direkt lässt {list} aus, von der Mission vorgegeben. Trotzdem anwenden? Der Bericht vermerkt es („nicht überflogen: Direkt der Flugsicherung“).',
    'Este directo omite {list}, impuesto por la misión. ¿Aplicarlo de todos modos? El informe lo dirá («no sobrevolado: directo del control»).'
  ],
  directDone: ['Direct {to} appliqué.', 'Direct {to} applied.', 'Direkt {to} angewendet.', 'Directo {to} aplicado.'],
  directUndo: ['Annuler le direct', 'Undo the direct', 'Direkt rückgängig machen', 'Deshacer el directo'],
  directWhyPassed: ['{id} est déjà passé : direct refusé.', '{id} is already passed: direct refused.',
    '{id} ist bereits überflogen: Direkt abgelehnt.',
    '{id} ya está pasado: directo rechazado.'
  ],
  // SOG-0088 (refus du 13 nov.) : un point hors de la route est permis, sa distance à la route dite
  directOff: ['⚠ {id} est hors de la route : à {d} de la route.', '⚠ {id} is off the route: {d} from the route.',
    '⚠ {id} liegt abseits der Route: {d} von der Route.',
    '⚠ {id} está fuera de la ruta: a {d} de la ruta.'
  ],
  directWhyFar: ['{id} est plus loin que le reste de la route : direct refusé.',
    '{id} is farther than the rest of the route: direct refused.',
    '{id} ist weiter entfernt als der Rest der Route: Direkt abgelehnt.',
    '{id} está más lejos que el resto de la ruta: directo rechazado.'
  ],
  directWhyUnknown: ['{id} : point inconnu de la base.', '{id}: point unknown to the base.', '{id}: Punkt in der Basis unbekannt.',
    '{id}: punto desconocido en la base.'
  ],
  directWhyRoute: ['Pas de route à reprendre.', 'No route to resume.', 'Keine Route zum Fortsetzen.', 'No hay ruta que reanudar.'],
  directNotStarted: ['Le vol n’est pas démarré : ajoutez {id} à la route.', 'The flight is not started: add {id} to the route.',
    'Der Flug ist nicht gestartet: Fügen Sie {id} der Route hinzu.', 'El vuelo no ha empezado: añada {id} a la ruta.'
  ],
  // SOG-0279 : le vol en cours est RETENU sur l'appareil (jamais envoyé par l'envoi groupé) ; il part par ce geste ou « Synchroniser »
  sendHeld: ['Ce vol est enregistré sur cet appareil ; vos autres appareils ne le reçoivent qu’à son envoi.',
    'This flight is saved on this device; your other devices receive it only when you send it.',
    'Dieser Flug ist auf diesem Gerät gespeichert; Ihre anderen Geräte erhalten ihn erst, wenn Sie ihn senden.',
    'Este vuelo está guardado en este dispositivo; sus otros dispositivos solo lo reciben cuando lo envía.'
  ],
  sendBtn: ['Envoyer ce vol à mes appareils', 'Send this flight to my devices', 'Diesen Flug an meine Geräte senden',
    'Enviar este vuelo a mis dispositivos'
  ],
  sending: ['Envoi…', 'Sending…', 'Wird gesendet…', 'Enviando…'],
  sentAt: ['Vol envoyé à vos appareils à {t}.', 'Flight sent to your devices at {t}.', 'Flug um {t} an Ihre Geräte gesendet.',
    'Vuelo enviado a sus dispositivos a las {t}.'
  ],
  sendOffline: ['Pas encore envoyé : hors ligne. Le vol reste sur cet appareil ; renvoyez-le quand le réseau revient.',
    'Not sent yet: offline. The flight stays on this device; send it again when the network is back.',
    'Noch nicht gesendet: offline. Der Flug bleibt auf diesem Gerät; senden Sie ihn erneut, wenn das Netz zurück ist.',
    'Aún no enviado: sin conexión. El vuelo queda en este dispositivo; vuelva a enviarlo cuando vuelva la red.'
  ],
  sendLocal: ['Aucun dépôt réglé sur cet appareil : le vol y reste (rien ne part vers vos autres appareils).',
    'No repository set on this device: the flight stays here (nothing leaves for your other devices).',
    'Kein Repository auf diesem Gerät eingerichtet: Der Flug bleibt hier (nichts geht an Ihre anderen Geräte).',
    'Ningún repositorio configurado en este dispositivo: el vuelo se queda aquí (nada sale hacia sus otros dispositivos).'
  ],
  sendFail: ['Le vol n’est pas parti : il reste sur cet appareil. Réessayez quand le réseau revient.',
    'The flight did not leave: it stays on this device. Try again when the network is back.',
    'Der Flug wurde nicht gesendet: Er bleibt auf diesem Gerät. Versuchen Sie es erneut, wenn das Netz zurück ist.',
    'El vuelo no salió: queda en este dispositivo. Vuelva a intentarlo cuando vuelva la red.'
  ],
  startHint: ['La carte s’ouvre sur ce vol ; le compte rendu le reprendra.',
    'The map opens on this flight; the report will take it up.',
    'Die Karte öffnet sich mit diesem Flug; der Bericht übernimmt ihn.',
    'El mapa se abre con este vuelo; el informe lo retomará.'
  ],
  sumRoute: ['Route', 'Route', 'Route', 'Ruta'],
  sumLevel: ['Niveau', 'Level', 'Flugfläche', 'Nivel'],
  sumWind: ['Vent', 'Wind', 'Wind', 'Viento'],
  sumBlock: ['Carburant bloc', 'Block fuel', 'Blockkraftstoff', 'Combustible bloque'],
  sumAircraft: ['Aéronef', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
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
  // SOG-0193 L3 : un point imposé par la mission (rendez-vous, source, cible) : ni retiré ni déplacé
  ptLock: ['{id} · imposé par la mission', '{id} · imposed by the mission', '{id} · von der Mission vorgegeben',
    '{id} · impuesto por la misión'
  ],
  ptLocked: ['{id} est imposé par la mission : ni retiré ni déplacé.', '{id} is imposed by the mission: neither removed nor moved.',
    '{id} ist von der Mission vorgegeben: weder entfernt noch verschoben.', '{id} está impuesto por la misión: ni se quita ni se mueve.'
  ],
  locksBack: ['Points imposés par la mission remis dans la route : {ids}.', 'Points imposed by the mission put back in the route: {ids}.',
    'Von der Mission vorgegebene Punkte wieder in die Route gesetzt: {ids}.',
    'Puntos impuestos por la misión devueltos a la ruta: {ids}.'
  ],
  ptUnknown: ['Point inconnu : {id}', 'Unknown point: {id}', 'Unbekannter Punkt: {id}', 'Punto desconocido: {id}'],
  steps: ['Paliers', 'Steps', 'Stufen', 'Escalones'],
  unresolved: ['Points inconnus : {l}', 'Unknown points: {l}', 'Unbekannte Punkte: {l}', 'Puntos desconocidos: {l}'],
  // un nom de la route sans position, à sa place dans la liste des points, avec sa raison (SOG-0035 : jamais omis)
  ptUnres: ['inconnu de la base', 'unknown to the database', 'der Datenbank unbekannt', 'desconocido en la base'],
  // SOG-0142 : les homonymes (le plus proche gardé), les sauts, et la zone d'un point inconnu dite selon son état (§ « zone manquante »)
  homonyms: ['{id} : {n} homonymes, le plus proche gardé', '{id}: {n} homonyms, the nearest kept',
    '{id}: {n} Namensgleiche, der nächste behalten',
    '{id}: {n} homónimos, se conserva el más cercano'
  ],
  // SOG-0142 : un nom dont le seul lieu connu est loin de la route (la seule PAM du cycle aux États-Unis) : non placé
  farPt: ['{id} : le seul lieu connu est à {nm} NM de la route — non placé ; la base de sa zone est peut-être incomplète (Données).',
    '{id}: the only known place is {nm} NM from the route — not placed; the base of its zone may be incomplete (Data).',
    '{id}: der einzige bekannte Ort liegt {nm} NM von der Route entfernt — nicht gesetzt; die Basis seiner Zone ist vielleicht unvollständig (Daten).',
    '{id}: el único lugar conocido está a {nm} NM de la ruta — no colocado; la base de su zona quizá esté incompleta (Datos).'
  ],
  jump: ['{a} → {b} : {nm} NM d’un point au suivant, à vérifier', '{a} → {b}: {nm} NM from one point to the next, to check',
    '{a} → {b}: {nm} NM von einem Punkt zum nächsten, zu prüfen', '{a} → {b}: {nm} NM de un punto al siguiente, a comprobar'
  ],
  ptUnresZone: ['inconnu : aucun point publié autour de {icao} (État {st})', 'unknown: no published point around {icao} (state {st})',
    'unbekannt: kein veröffentlichter Punkt um {icao} (Staat {st})',
    'desconocido: ningún punto publicado alrededor de {icao} (Estado {st})'
  ],
  // un nom inconnu près d'un terrain dont la base n'a aucun point publié : la zone manque, pas le point (SOG-0012)
  noPointsNear: [' — la base n’a aucun point publié autour de {icao} (État {st}) : à compléter dans la base aéronautique.',
    ' — the database has no published point around {icao} (state {st}): to complete in the aeronautical database.',
    ' — die Datenbank hat keinen veröffentlichten Punkt um {icao} (Staat {st}): in der Luftfahrtdatenbank zu ergänzen.',
    ' — la base no tiene ningún punto publicado alrededor de {icao} (Estado {st}): por completar en la base aeronáutica.'
  ],
  simbrief: ['Dernier OFP SimBrief', 'Last SimBrief OFP', 'Letzter SimBrief-OFP', 'Último OFP de SimBrief'],
  noSimbrief: ['Identifiant SimBrief à régler (⚙).', 'SimBrief ID to set (⚙).', 'SimBrief-Kennung einstellen (⚙).',
    'Identificador SimBrief por ajustar (⚙).'
  ],
  // « Préparer ce vol » du module Missions (#fuel?mission=<id>)
  // la puce de la mission et son volet (SOG-0193 L2, § 10.47 b) : le retour direct à la mission, sans quitter l'étape
  mChip: ['Mission {id}', 'Mission {id}', 'Einsatz {id}', 'Misión {id}'],
  mChipTitle: ['La fiche de la mission, sans quitter l’étape', 'The mission sheet, without leaving the step',
    'Das Einsatzblatt, ohne den Schritt zu verlassen',
    'La ficha de la misión, sin salir del paso'
  ],
  mClose: ['Fermer la fiche de la mission', 'Close the mission sheet', 'Einsatzblatt schließen', 'Cerrar la ficha de la misión'],
  mRisks: ['Risques', 'Risks', 'Risiken', 'Riesgos'],
  mNoRisk: ['Aucun risque déclaré.', 'No risk declared.', 'Kein Risiko angegeben.', 'Ningún riesgo declarado.'],
  mObjectives: ['Objectifs', 'Objectives', 'Ziele', 'Objetivos'],
  mTeams: ['Équipes', 'Teams', 'Teams', 'Equipos'],
  mZones: ['Zones', 'Zones', 'Zonen', 'Zonas'],
  mOnMap: ['Sur la carte', 'On the map', 'Auf der Karte', 'En el mapa'],
  mDetails: ['Description', 'Description', 'Beschreibung', 'Descripción'],
  mReading: ['Lecture de la mission…', 'Reading the mission…', 'Einsatz wird gelesen…', 'Leyendo la misión…'],
  missionLoaded: ['Mission {id} : {dep} → {arr} ({n} points), à compléter.', 'Mission {id}: {dep} → {arr} ({n} points), to complete.',
    'Mission {id}: {dep} → {arr} ({n} Punkte), zu vervollständigen.', 'Misión {id}: {dep} → {arr} ({n} puntos), por completar.'
  ],
  missionReplace: ['Remplacer le vol en préparation par la mission {id} ?', 'Replace the flight being prepared with mission {id}?',
    'Den vorbereiteten Flug durch die Mission {id} ersetzen?', '¿Sustituir el vuelo en preparación por la misión {id}?'
  ],
  missionStarted: ['Vol démarré : la mission {id} n’est pas reprise (annulez le départ ou terminez le vol d’abord).',
    'Flight started: mission {id} is not loaded (cancel the start or finish the flight first).',
    'Flug gestartet: Mission {id} wird nicht übernommen (erst den Start abbrechen oder den Flug beenden).',
    'Vuelo iniciado: la misión {id} no se carga (anule la salida o termine el vuelo primero).'
  ],
  missionUnread: ['Mission {id} introuvable ou illisible dans missions/.', 'Mission {id} not found or unreadable in missions/.',
    'Mission {id} in missions/ nicht gefunden oder unlesbar.', 'Misión {id} no encontrada o ilegible en missions/.'
  ],
  // « Nouveau vol » et le nouveau couple de terrains (retour de l'utilisateur du 1er nov. 2026 : un KSET → KDOV gardait la route de France)
  newFlight: ['Nouveau vol', 'New flight', 'Neuer Flug', 'Nuevo vuelo'],
  newFlightAsk: [
    'Commencer un nouveau vol ? Le départ, l’arrivée, la route, les procédures et le niveau du vol en préparation sont effacés ; l’aéronef reste.',
    'Start a new flight? The departure, arrival, route, procedures and level of the flight being prepared are cleared; the aircraft stays.',
    'Einen neuen Flug beginnen? Abflug, Ankunft, Strecke, Verfahren und Flugfläche des vorbereiteten Flugs werden gelöscht; das Luftfahrzeug bleibt.',
    '¿Empezar un vuelo nuevo? Se borran la salida, la llegada, la ruta, los procedimientos y el nivel del vuelo en preparación; la aeronave se queda.'
  ],
  newFlightStarted: [
    'Le vol est démarré. Commencer un nouveau vol l’abandonne (il n’est plus proposé au compte rendu comme démarré) ; l’aéronef reste.',
    'The flight is started. Starting a new flight abandons it (no longer offered to the report as started); the aircraft stays.',
    'Der Flug ist gestartet. Ein neuer Flug gibt ihn auf (er wird dem Bericht nicht mehr als gestartet angeboten); das Luftfahrzeug bleibt.',
    'El vuelo está iniciado. Empezar uno nuevo lo abandona (ya no se propone al informe como iniciado); la aeronave se queda.'
  ],
  // SOG-0194 : un appui pendant la lecture du vol n'est jamais ignoré : le bouton le dit, le geste se fait dès que le vol est lu
  newWaiting: ['Vol en cours de lecture…', 'Reading the flight…', 'Flug wird gelesen…', 'Leyendo el vuelo…'],
  newFlightDone: ['Nouveau vol : tout est à saisir, l’aéronef est gardé.', 'New flight: everything to enter, the aircraft is kept.',
    'Neuer Flug: alles einzugeben, das Luftfahrzeug bleibt.', 'Vuelo nuevo: todo por introducir, la aeronave se conserva.'
  ],
  adSwap: ['Inverser départ et arrivée', 'Swap departure and arrival', 'Abflug und Ankunft tauschen', 'Invertir salida y llegada'],
  newPair: ['Nouveau couple de terrains ({dep} → {arr}) : la route, les procédures et l’OFP de l’ancien vol sont effacés.',
    'New pair of aerodromes ({dep} → {arr}): the route, procedures and OFP of the previous flight are cleared.',
    'Neues Flugplatzpaar ({dep} → {arr}): Strecke, Verfahren und OFP des vorigen Flugs sind gelöscht.',
    'Nuevo par de aeródromos ({dep} → {arr}): se borran la ruta, los procedimientos y el OFP del vuelo anterior.'
  ],
  // les niveaux des points et celui du plan différents (SOG-0020 : « 5 min de vol » — la montée vers le plan mangeait la route)
  lvlMix: ['Points à {p}, plan à {l}', 'Points at {p}, plan at {l}', 'Punkte auf {p}, Plan auf {l}', 'Puntos a {p}, plan a {l}'],
  lvlMixTimes: [' : {c} de montée pour {k} de croisière', ': {c} of climb for {k} of cruise', ': {c} Steigflug für {k} Reiseflug',
    ': {c} de ascenso para {k} de crucero'
  ],
  lvlAlign: ['Aligner les points sur le plan', 'Align the points on the plan', 'Punkte an den Plan angleichen',
    'Alinear los puntos con el plan'
  ],
  // un niveau imposé sur un point d'une procédure choisie (SOG-0003, niveau seul : une vitesse publiée vient de la donnée)
  pconLabel: ['Niveau imposé à {id} (FL)', 'Level forced at {id} (FL)', 'Vorgegebene Flugfläche bei {id} (FL)',
    'Nivel impuesto en {id} (FL)'
  ],
  pconCeiling: ['{id} : FL{fl} au-dessus du plafond de la fiche (FL{c}) ; le niveau n’est pas posé.',
    '{id}: FL{fl} above the sheet’s ceiling (FL{c}); the level is not set.',
    '{id}: FL{fl} über der Dienstgipfelhöhe des Datenblatts (FL{c}); die Flugfläche wird nicht gesetzt.',
    '{id}: FL{fl} por encima del techo de la ficha (FL{c}); el nivel no se impone.'
  ],
  pconSlope: [
    '{id} : FL{fl} à {nm} NM du terrain demande {g} ft/NM, plus que la pente de la fiche ({m} ft/NM) ; le niveau n’est pas posé.',
    '{id}: FL{fl} at {nm} NM from the aerodrome needs {g} ft/NM, more than the sheet’s gradient ({m} ft/NM); the level is not set.',
    '{id}: FL{fl} {nm} NM vom Flugplatz verlangt {g} ft/NM, mehr als der Gradient des Datenblatts ({m} ft/NM); die Flugfläche wird nicht gesetzt.',
    '{id}: FL{fl} a {nm} NM del aeródromo exige {g} ft/NM, más que la pendiente de la ficha ({m} ft/NM); el nivel no se impone.'
  ],
  ofpLoaded: ['OFP {dep} → {arr} repris ({n} points).', 'OFP {dep} → {arr} loaded ({n} points).',
    'OFP {dep} → {arr} übernommen ({n} Punkte).',
    'OFP {dep} → {arr} cargado ({n} puntos).'
  ],
  // piste, SID, STAR et approche choisies dans la préparation (V3_SPECIFICATION § 10.20)
  procTitle: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
  offline: ['Hors ligne : rien n’a été demandé.', 'Offline: nothing was requested.', 'Offline: nichts wurde angefragt.',
    'Sin conexión: no se pidió nada.'
  ],
  sbError: ['SimBrief n’a pas répondu ({e}).', 'SimBrief did not answer ({e}).', 'SimBrief hat nicht geantwortet ({e}).',
    'SimBrief no respondió ({e}).'
  ],
  levelWind: ['Niveau et vent', 'Level and wind', 'Flugfläche und Wind', 'Nivel y viento'],
  level: ['Niveau (FL)', 'Level (FL)', 'Flugfläche (FL)', 'Nivel (FL)'],
  // le niveau « Auto » (SOG-0056) : celui qui brûle le moins sur la route (règle semi-circulaire), recalculé tant qu'aucun niveau n'est saisi
  levelAuto: ['Auto', 'Auto', 'Auto', 'Auto'],
  levelAutoHint: [
    'Le niveau qui brûle le moins de carburant sur cette route (règle semi-circulaire), recalculé tant que vous n’en saisissez pas',
    'The level that burns the least fuel on this route (semicircular rule), computed again as long as you type none',
    'Die Flugfläche mit dem geringsten Verbrauch auf dieser Route (Halbkreisregel), neu berechnet, solange Sie keine eingeben',
    'El nivel que menos combustible consume en esta ruta (regla semicircular), recalculado mientras no escriba ninguno'
  ],
  levelAutoNoRoute: ['Auto : il faut une route (au moins deux points)', 'Auto: a route is needed (two points at least)',
    'Auto: eine Route ist nötig (mindestens zwei Punkte)', 'Auto: hace falta una ruta (al menos dos puntos)'
  ],
  levelAutoNoSheet: ['Auto : il faut une fiche de l’aéronef (pas une estimation du type)',
    'Auto: an aircraft sheet is needed (not a type estimate)',
    'Auto: ein Datenblatt des Luftfahrzeugs ist nötig (keine Typschätzung)',
    'Auto: hace falta una ficha de la aeronave (no una estimación del tipo)'
  ],
  // SOG-0529 : « Auto » ne retient qu'un niveau où le moteur de route (route/levels d'AeroDB) trouve une route VALIDE, et dit pourquoi
  levelAutoValid: ['{fl} (auto) · {t} — le moins gourmand avec une route valide',
    '{fl} (auto) · {t} — the lowest burn with a valid route',
    '{fl} (auto) · {t} — geringster Verbrauch mit gültiger Route', '{fl} (auto) · {t} — el de menor consumo con ruta válida'
  ],
  levelAutoDirect: [' ; raccord direct (aucune procédure volable à ce niveau)', '; direct connector (no procedure flyable at this level)',
    '; Direktanschluss (kein Verfahren auf dieser Fläche fliegbar)', '; enlace directo (ningún procedimiento volable a este nivel)'
  ],
  levelAutoSkip: [' ; {fl} écarté', '; {fl} set aside', '; {fl} verworfen', '; {fl} descartado'],
  // SOG-0530 (l'ergonome, 21/11) : le niveau retenu est hors de la règle semi-circulaire (le moteur le dit : route/levels) — jusqu'au
  // lot C d'AeroDB, ce suffixe ; le choix ne change pas
  levelAutoSemi: [' — hors règle semi-circulaire', ' — outside the semicircular rule', ' — außerhalb der Halbkreisregel',
    ' — fuera de la regla semicircular'
  ],
  // SOG-0530 lot C (l'ergonome) : le moteur dit qu'aucun niveau conforme essayé n'a de route valide (no_conforming_valid) : la phrase
  // claire, au lieu du suffixe
  levelAutoNoConform: [' — aucun niveau conforme à la règle semi-circulaire n’a de route valide',
    ' — no level that follows the semicircular rule has a valid route',
    ' — keine Flugfläche nach der Halbkreisregel hat eine gültige Route',
    ' — ningún nivel conforme a la regla semicircular tiene ruta válida'
  ],
  // le pli de la raison du moteur (le bloc des critères du dégagement) : la phrase reste courte, la raison se déplie au toucher
  levelAutoWhyFold: ['Raison du moteur de route', 'Route engine’s reason', 'Begründung der Routenberechnung',
    'Motivo del motor de rutas'
  ],
  levelAutoPartial: [' ({n} niveaux jugés sur {m} : temps dépassé)', ' ({n} of {m} levels judged: time exceeded)',
    ' ({n} von {m} Flächen bewertet: Zeit überschritten)', ' ({n} de {m} niveles evaluados: tiempo excedido)'
  ],
  levelAutoNone: ['Auto : aucun niveau avec une route valide de {lo} à {hi}', 'Auto: no level with a valid route from {lo} to {hi}',
    'Auto: keine Fläche mit gültiger Route von {lo} bis {hi}', 'Auto: ningún nivel con ruta válida de {lo} a {hi}'
  ],
  levelAutoBusy: ['Auto : recherche d’un niveau avec une route valide…', 'Auto: looking for a level with a valid route…',
    'Auto: Suche nach einer Fläche mit gültiger Route…', 'Auto: buscando un nivel con una ruta válida…'
  ],
  levelAutoUnchecked: ['{fl} (auto) · {t} — route non vérifiée ({why})', '{fl} (auto) · {t} — route not checked ({why})',
    '{fl} (auto) · {t} — Route nicht geprüft ({why})', '{fl} (auto) · {t} — ruta no comprobada ({why})'
  ],
  levelAutoCause: {
    nolauncher: ['pas de lanceur', 'no launcher', 'kein Launcher', 'sin lanzador'],
    busy: ['poste occupé', 'workstation busy', 'Rechner beschäftigt', 'puesto ocupado'],
    offline: ['lanceur injoignable', 'launcher unreachable', 'Launcher nicht erreichbar', 'lanzador inaccesible'],
    stopped: ['calcul arrêté', 'computation stopped', 'Berechnung abgebrochen', 'cálculo detenido'],
    failed: ['calcul en échec', 'computation failed', 'Berechnung fehlgeschlagen', 'cálculo fallido'],
    'no-rad': ['RAD non importé', 'RAD not imported', 'RAD nicht importiert', 'RAD no importado'],
    invalid: ['demande refusée', 'request refused', 'Anfrage abgelehnt', 'solicitud rechazada']
  },
  levelAutoSaid: ['auto · {t}', 'auto · {t}', 'auto · {t}', 'auto · {t}'], // une ligne sous le champ (le niveau est dans le champ)
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
  planPt: ['Plan : {fl}, {f}, {t}', 'Plan: {fl}, {f}, {t}', 'Plan: {fl}, {f}, {t}', 'Plan: {fl}, {f}, {t}'],
  planPtHint: ['Devis réel du plan (paliers de la route, vent du plan) ; les courbes sont un vol à plat à chaque niveau.',
    'The plan\'s real quote (route steps, the plan\'s wind); the curves are a flat flight at each level.',
    'Echter Plan-Wert (Streckenstufen, Planwind); die Kurven zeigen einen Horizontalflug auf jeder Flugfläche.',
    'Presupuesto real del plan (escalones de la ruta, viento del plan); las curvas son un vuelo a nivel constante en cada nivel.'
  ],
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
  // barre de résultat compacte (téléphone) : libellés courts, le texte entier va dans l'infobulle
  blockS: ['Bloc', 'Block', 'Block', 'Bloque'],
  tripS: ['Étape', 'Trip', 'Reise', 'Etapa'],
  // la distance du début de descente AVANT l'arrivée : une autre grandeur que la distance de la route (le libellé le dit)
  todS: ['TOD avant l’arrivée', 'TOD before arrival', 'TOD vor Ankunft', 'TOD antes de la llegada'],
  windRangeS: ['vent inconnu', 'unknown wind', 'Wind unbekannt', 'viento desconocido'],
  windByLeg: ['vent par tronçon', 'wind leg by leg', 'Wind je Abschnitt', 'viento por tramo'], // SOG-0281
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
  // le régime de montée de la fiche (SOG-0061 : « on a les yeux rivés sur les rpms ») ; jamais inventé : rien sans climb.rpmNominal
  climbRpm: ['Montée : {r} rpm', 'Climb: {r} rpm', 'Steigflug: {r} U/min', 'Ascenso: {r} rpm'],
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
  wxDate: ['Date du vol (heure locale de l’appareil)', 'Flight date (device’s local time)', 'Flugdatum (Ortszeit des Geräts)',
    'Fecha del vuelo (hora local del dispositivo)'
  ],
  // date du vol passée (V3 § 10.28) : un avertissement, jamais un blocage
  pastDate: ['Vol daté du {d}, dans le passé : météo et NOTAM ne valent plus.',
    'Flight dated {d}, in the past: weather and NOTAMs no longer apply.',
    'Flug datiert auf {d}, in der Vergangenheit: Wetter und NOTAM gelten nicht mehr.',
    'Vuelo fechado el {d}, en el pasado: la meteorología y los NOTAM ya no valen.'
  ],
  // export du plan de vol vers les simulateurs (V3 § 10.28) : trois boutons à l'étape Départ
  fmsTitle: ['Plan de vol pour le simulateur', 'Flight plan for the simulator', 'Flugplan für den Simulator',
    'Plan de vuelo para el simulador'
  ],
  fmsHint: ['La route et les procédures choisies, écrites pour X-Plane ou Microsoft Flight Simulator ; le fichier est téléchargé.',
    'The route and the chosen procedures, written for X-Plane or Microsoft Flight Simulator; the file is downloaded.',
    'Die Route und die gewählten Verfahren, geschrieben für X-Plane oder Microsoft Flight Simulator; die Datei wird heruntergeladen.',
    'La ruta y los procedimientos elegidos, escritos para X-Plane o Microsoft Flight Simulator; se descarga el archivo.'
  ],
  fmsXp11: ['.fms (XP 11/12)', '.fms (XP 11/12)', '.fms (XP 11/12)', '.fms (XP 11/12)'],
  fmsXp10: ['.fms (XP 10)', '.fms (XP 10)', '.fms (XP 10)', '.fms (XP 10)'],
  fmsPln: ['.pln (MSFS)', '.pln (MSFS)', '.pln (MSFS)', '.pln (MSFS)'],
  fmsNeed: ['Il faut une route d’au moins deux points placés.', 'The route needs at least two placed points.',
    'Die Route braucht mindestens zwei gesetzte Punkte.', 'La ruta necesita al menos dos puntos situados.'
  ],
  fmsFailed: ['Le plan de vol n’a pas pu être écrit.', 'The flight plan could not be written.',
    'Der Flugplan konnte nicht geschrieben werden.',
    'No se pudo escribir el plan de vuelo.'
  ],
  wxDateHint: ['La météo du devis (TAF, vents en altitude) et la Carte sont lues à cette date ; vide : maintenant.',
    'The quote’s weather (TAF, winds aloft) and the Map are read at this date; empty: now.',
    'Das Wetter der Kalkulation (TAF, Höhenwinde) und die Karte werden für dieses Datum gelesen; leer: jetzt.',
    'La meteorología del cálculo (TAF, vientos en altura) y el mapa se leen a esta fecha; vacío: ahora.'
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
  // SOG-0527 (3) : l'âge de toute donnée de vent ou de météo affichée, en alerte au-delà de 12 h
  ageAgo: ['il y a {d}', '{d} ago', 'vor {d}', 'hace {d}'],
  ageOld: ['plus de 12 h', 'over 12 h', 'über 12 h', 'más de 12 h'],
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
  windByS: { // la même source, en court (ligne de contexte du résultat) ; « saisi » ne change pas
    weather: ['vent {l}', 'wind {l}', 'Wind {l}', 'viento {l}'],
    aloft: ['vent {m} {l}', 'wind {m} {l}', 'Wind {m} {l}', 'viento {m} {l}']
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
  entry: ['Débit de croisière de ce vol ({u}, vide : la fiche)', 'Cruise fuel flow for this flight ({u}, empty: the sheet)',
    'Reiseverbrauch für diesen Flug ({u}, leer: Datenblatt)', 'Consumo de crucero de este vuelo ({u}, vacío: la ficha)'
  ],
  // écran des fiches
  sheetCats: {
    helico: ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros'],
    turboprop: ['Turbopropulseurs', 'Turboprops', 'Turboprops', 'Turbohélices'],
    jet: ['Réacteurs', 'Jets', 'Strahlflugzeuge', 'Reactores'],
    piston: ['Pistons', 'Piston engines', 'Kolbenmotoren', 'Pistón'],
    other: ['Autres', 'Others', 'Andere', 'Otros']
  },
  coType: ['Type de la compagnie ({n} aéronef(s)) : performances à renseigner',
    'Company type ({n} aircraft): performance to fill in', 'Typ der Fluggesellschaft ({n} Luftfahrzeug(e)): Leistungen einzutragen',
    'Tipo de la compañía ({n} aeronave(s)): rendimientos por completar'
  ],
  // § 10.38 : la vue Fiches range d'abord les fiches des types de la flotte de la compagnie courante
  coSheets: ['Flotte de {a}', 'Fleet of {a}', 'Flotte von {a}', 'Flota de {a}'],
  otherSheets: ['Autres fiches ({n})', 'Other sheets ({n})', 'Weitere Datenblätter ({n})', 'Otras fichas ({n})'],
  sheetsIntro: ['Fiches de la base partagée, lues ici ; elles se modifient dans Maintenance › Aéronefs.',
    'Sheets of the shared database, read here; they are edited in Maintenance › Aircraft.',
    'Datenblätter der gemeinsamen Datenbank, hier nur lesbar; bearbeitet wird in Wartung › Luftfahrzeuge.',
    'Fichas de la base compartida, leídas aquí; se modifican en Mantenimiento › Aeronaves.'
  ],
  editInMaint: ['Modifier dans Maintenance', 'Edit in Maintenance', 'In der Wartung bearbeiten', 'Modificar en Mantenimiento'],
  createInMaint: ['Créer dans Maintenance', 'Create in Maintenance', 'In der Wartung anlegen', 'Crear en Mantenimiento'],
  sheetUsed: ['utilisée pour ce vol', 'used for this flight', 'für diesen Flug verwendet', 'usada para este vuelo'],
  missing: ['À compléter : {list}', 'To complete: {list}', 'Zu ergänzen: {list}', 'Por completar: {list}'],
  // familles de champs vides nommées par la liste des fiches (F.sheetMissingFamilies), dans l'ordre de la liste
  missingFamily: {
    rpm: ['régimes', 'rpm', 'Drehzahlen', 'regímenes'],
    speeds: ['vitesses', 'speeds', 'Geschwindigkeiten', 'velocidades'],
    cruise: ['croisière', 'cruise', 'Reiseflug', 'crucero'],
    rates: ['varios', 'rates', 'Steigraten', 'velocidades verticales'],
    flows: ['débits', 'fuel flows', 'Verbräuche', 'consumos'],
    taxi: ['roulage', 'taxi', 'Rollen', 'rodaje'],
    runway: ['piste', 'runway', 'Piste', 'pista'],
    fuel: ['carburant', 'fuel', 'Kraftstoff', 'combustible'],
    aircraft: ['aéronef', 'aircraft', 'Luftfahrzeug', 'aeronave'],
    other: ['divers', 'other', 'Sonstiges', 'otros']
  },
  complete: ['complète', 'complete', 'vollständig', 'completa'],
  updated: ['mise à jour {d}', 'updated {d}', 'aktualisiert {d}', 'actualizada {d}'],
  useSheet: ['Utiliser', 'Use', 'Verwenden', 'Usar'],
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
// SOG-0468 (4) : « 1:05 », le formateur du cadre (négatif ou illisible : « 0:00 »)
const hmm = m => fmtHm(+m || 0);

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
/** SOG-0468 : la forme de n (singulier, pluriel) selon la règle du cadre, dans la langue de l'écran. */
const pl = (n, one, many) => plural(S.ctx.lang?.() || 'fr', n, [one, many]);

// ---------------------------------------------------------------- unités et formats
/** Unité de carburant affichée (réglage « Carburant »), à défaut celle de la fiche. */
const fuelUnitOf = unit => S.settings.displayUnit || unit || 'kg';
/** Carburant v (unité de la fiche) dans l'unité affichée, arrondi et formaté. */
function fuelTxt(v, unit) {
  if (!Number.isFinite(v)) return '—';
  const to = fuelUnitOf(unit),
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
// la distance orthodromique (NM) entre deux points { lat, lon } : gcNm de frame/lib/geo.js (importée en tête, SOG-0468 (2))
/** Route vraie initiale (°) de a vers b. */
function bearing(a, b) {
  const r = Math.PI / 180,
    y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r),
    x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/** Texte normalisé de la route : « DEP PT1 UN460 PT2/F280 … ARR » — points par leur identifiant (niveau en /Fnnn là
 *  où il change), voies, procédures et mots inconnus gardés à leur place, une seule ligne (frame/lib/route_text.js). */
/** Texte normalisé du champ de route, en forme OACI avec ses « DCT » (V3 § 10.31). */
const routeText = tokens => RT.textFromTokens(tokens, {
  dct: true
});
/** SOG-0089 (l'ergonome) : à l'ouverture, un texte qui ne porte pas la piste que le modèle a est refait depuis lui, avant toute frappe :
 *  effacer « /07 » ensuite est un geste voulu (la piste est retirée). UNE réécriture, synchrone avec la lecture du vol (avant le premier
 *  dessin de l'étape Route : le champ n'existe pas encore), en mémoire seulement : elle n'écrit pas le vol à elle seule (elle part avec la
 *  prochaine écriture d'un geste) ; jamais quand le champ a le focus. */
function rwyTextSync() {
  const r = S.flight?.route,
    ta = S.body?.querySelector('[data-k="rtext"]');
  if (!r?.text || S.flightPending || (ta && document.activeElement === ta)) return;
  const t = withRwys(r.text);
  if (sameRoute(t, r.text)) return;
  r.text = t;
  if (ta) ta.value = t;
}
/** SOG-0089 : le texte avec les pistes choisies écrites après le départ et l'arrivée (« LFPO/07 … LFML/31R »), le terrain seul sans
 *  piste ; partout où Carburant écrit le texte (normalisation, « Auto », points changés, procédures), pour qu'aucune réécriture ne la
 *  perde. */
function withRwys(text) {
  const f = S.flight,
    o = CF.proceduresOf(f),
    str = v => typeof v === 'string' ? v : '';
  return RT.withRunways(text, {
    dep: f.route?.dep,
    arr: f.route?.arr,
    depRwy: str(o.dep?.rwy),
    arrRwy: str(o.arr?.rwy)
  });
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
  planned_at: null,
  ofp: null,
  theme: '',
  series: ''
});
/** Heure de l'appareil du champ datetime-local (« 2026-10-24T14:30 ») → ISO UTC (« 2026-10-24T12:30:00Z ») ; null si
 *  vide ou illisible. */
const whenToIso = local => {
  const t = Date.parse(local || '');
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 19) + 'Z' : null;
};
/** ISO UTC → heure de l'appareil du champ datetime-local ; '' si absent ou illisible. */
const isoToWhen = iso => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
};
/** Avertissement d'un vol pas démarré daté dans le passé (planned_at plus d'une minute avant maintenant) : « Vol daté du 26/10 14:00Z,
 *  dans le passé : météo et NOTAM ne valent plus. » ; '' sinon. Jamais bloquant (V3 § 10.28). */
function pastDateText() {
  const f = S?.flight,
    t = Date.parse(f?.planned_at || '');
  return !f?.started?.at && Number.isFinite(t) && t < Date.now() - 60000 ? tt(TX.pastDate, {
    d: fmtDayZ(f.planned_at)
  }) : '';
}
/** Valeur du champ de la date du vol : planned_at à l'heure de l'appareil, ou l'heure présente quand le vol part maintenant
 *  (planned_at null) — jamais un champ vide, que le navigateur montre « jj/mm/aaaa » (bouton « Maintenant », 29/10/2026). */
const whenField = iso => isoToWhen(iso ?? new Date().toISOString());
/** La date du vol n'a qu'une valeur : current_flight.planned_at (ISO UTC, null = maintenant) ; le champ de saisie en
 *  montre l'heure de l'appareil (isoToWhen). Un vol écrit avant planned_at (weather.when seul, l'ancienne copie) en reçoit
 *  un ; la copie est retirée (fuel ne l'écrit plus : une copie périmée tromperait ses lecteurs). */
function syncPlanned(f) {
  f.planned_at = Number.isFinite(Date.parse(f.planned_at || '')) ? f.planned_at : whenToIso(f.weather?.when);
  if (f.weather && 'when' in f.weather) {
    const {
      when,
      ...rest
    } = f.weather;
    f.weather = rest;
  }
  return f;
}
/** Vol courant lu (enregistrement gardé ou reçu) : les champs vides du schéma complétés, la date du vol accordée. */
const flightOf = rec => syncPlanned(xpRestore({
  ...emptyFlight(),
  ...rec
}));
/** Logique des fiches (lecture des formats, fusion, ChatGPT, .lnmperf) : celle d'aerodb (AeroDBSheets). */
const SH = () => S.A?.lib || window.AeroDBSheets;
/** Fiches du registre d'aerodb (les plus récentes d'abord) ; aucune sans aerodb. */
async function readSheets() {
  const s = S,
    // types de la compagnie (flotte, référence) : ceux sans fiche sont proposés « à compléter » (comme la V2) ; les deux
    // lectures ensemble
    [list, co, fleet] = await Promise.all([S.A?.sheets ? S.A.sheets.list().catch(() => []) : [], S.A?.fleetTypes ? S.A.fleetTypes()
      .catch(() => []) : [], readCoFleet()
    ]);
  if (gone(s)) return;
  S.sheets = list;
  S.coTypes = co;
  S.coFleet = fleet; // § 10.38 : la flotte de la compagnie courante (choix de l'appareil, vue Fiches)
}
/** Écrit le vol courant (après un temps calme) : relu juste avant, seuls les champs de fuel remplacés (et dans progress
 *  ses seules clés : progress.actual appartient au cadre), le reste gardé tel qu'il est (frame/lib/current_flight.js). */
function saveFlight() {
  if (S.flightPending) return; // vol courant pas encore lu : l'écrire effacerait le vrai
  clearTimeout(S.flightTimer);
  const s = S; // gardé : l'écriture part même si le module est démonté entre-temps
  // les écritures de Carburant à la file : une écriture relit l'enregistrement après la fin de la précédente (deux écritures qui se
  // chevauchaient relisaient le même état d'avant, et la seconde reprenait un niveau périmé : F7 avec des lectures lentes)
  s.flightTimer = setTimeout(() => s.saving = (s.saving || Promise.resolve()).then(() => writeFlight(s)).then(() => S === s && (
      altsMoreCheck(), reviewSync()))
    .catch(() => {}), 300); // SOG-0296 (c) : une entrée changée pendant la recherche des variantes
}
// ---------------------------------------------------------------- SOG-0375 : une position lue dans X-Plane n'est jamais écrite avec le vol
// Le dossier X-Plane de l'utilisateur peut porter des données Navigraph ou Jeppesen (SOG-0153 : lues sur le poste, en mémoire, jamais
// écrites ni exportées). Le vol écrit dans le dépôt du groupe garde le NOM d'un tel point (`local: 'xplane'`, sans latitude ni longitude) ;
// sa position reste dans la mémoire de cette page. Décision de l'utilisateur (Q-0061, 16/11). Le classeur FRA d'EUROCONTROL n'est pas visé.
/** Les positions qu'aerodb a rendues `local: true, source: 'xplane'`, et celles des procédures lues dans X-Plane ou Little Navmap sur ce
 *  poste : clés « ID|lat|lon », en mémoire de la page (20 000 au plus). */
const XP_SEEN = new Set();
/** ID → { lat, lon } : la position d'un point d'X-Plane retirée à l'écriture, remise au vol relu sur ce poste (mémoire de la page). */
const XP_KEPT = new Map();
/** La clé d'une position : identifiant en majuscules, latitude et longitude telles quelles. */
const xpKey = (id, lat, lon) => `${String(id ?? '').trim().toUpperCase()}|${+lat}|${+lon}`;
/** Une réponse d'aerodb lue dans le dossier X-Plane du poste. */
const fromXp = x => !!x && x.local === true && x.source === 'xplane';
/** Note une position venue d'X-Plane (nombres finis seulement). */
function xpNote(id, lat, lon) {
  if (id && Number.isFinite(+lat) && Number.isFinite(+lon) && XP_SEEN.size < 20000) XP_SEEN.add(xpKey(id, lat, lon));
}
/** Les points d'une procédure lue sur ce poste (repli X-Plane, Little Navmap) : leurs positions notées. */
function xpNoteProcs(procs) {
  for (const rec of Object.values(procs || {}))
    if (rec && typeof rec === 'object' && (rec.local === true || rec.status === 'xplane' || rec.status === 'lnm' || rec.lnm === true))
      for (const q of Array.isArray(rec.points) ? rec.points.slice(0, 400) : []) xpNote(q?.id, q?.lat, q?.lon);
}
/** aerodb tel que Carburant le lit pour placer un point : coords et coordsAll notent ce qui vient d'X-Plane ; le reste est celui d'aerodb. */
const XP_BASES = new WeakMap();

function xpBase(base) {
  if (!base || typeof base !== 'object') return base;
  if (XP_BASES.has(base)) return XP_BASES.get(base);
  const w = Object.create(base);
  if (typeof base.coords === 'function') w.coords = async (id, o) => {
    const c = await base.coords(id, o);
    for (const x of c ? [c, ...(Array.isArray(c.homonyms) ? c.homonyms : [])] : [])
      if (fromXp(x)) xpNote(id, x.lat, x.lon);
    return c;
  };
  if (typeof base.coordsAll === 'function') w.coordsAll = async (id, o) => {
    const all = await base.coordsAll(id, o);
    for (const x of Array.isArray(all) ? all : [])
      if (fromXp(x)) xpNote(id, x.item?.lat, x.item?.lon);
    return all;
  };
  XP_BASES.set(base, w);
  return w;
}
/** SOG-0397 (Q-0079, repli X-Plane du moteur de route) : la réponse d'un calcul marque `local: 'xplane'` (chaîne, vocabulaire fermé) chaque
 *  point dont la POSITION vient du X-Plane du poste — alternatives[].points, sections.taken.points, primary.legs[].start / .end ; ces
 *  positions sont notées AVANT toute écriture, telles quelles et arrondies comme RE.normalize les garde (cinq décimales), pour que xpStrip
 *  les retire du vol écrit. Une réponse est une entrée non sûre : 600 points au plus par liste, nombres finis seulement (xpNote). */
function xpNoteAnswer(res) {
  const r5 = v => Math.round(+v * 1e5) / 1e5,
    list = x => Array.isArray(x) ? x.slice(0, 600) : [],
    note = p => {
      if (!p || typeof p !== 'object' || p.local !== 'xplane') return;
      xpNote(p.id, p.lat, p.lon);
      xpNote(p.id, r5(p.lat), r5(p.lon));
    };
  for (const a of list(res?.alternatives).slice(0, 8)) list(a?.points).forEach(note);
  for (const l of list(res?.levels).slice(0, 12)) list(l?.points).forEach(note); // SOG-0545 : les points de route/levels
  list(res?.sections?.taken?.points).forEach(note);
  for (const l of list(res?.primary?.legs)) {
    note(l?.start);
    note(l?.end);
  }
}
/** Un point du vol placé à une position venue d'X-Plane. */
const isXpPoint = p => !!p?.id && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && XP_SEEN.has(xpKey(p.id, p.lat, p.lon));
/** Le vol tel qu'il s'écrit : chaque point placé d'après X-Plane sans latitude ni longitude, marqué `local: 'xplane'` (sa position gardée
 *  dans XP_KEPT) ; le vol lui-même n'est pas modifié. Sans tel point : le vol tel quel. */
function xpStrip(f) {
  const pts = f?.route?.points;
  if (!Array.isArray(pts) || !XP_SEEN.size || !pts.some(isXpPoint)) return f;
  return {
    ...f,
    route: {
      ...f.route,
      points: pts.map(p => {
        if (!isXpPoint(p)) return p;
        const {
          lat,
          lon,
          ...rest
        } = p;
        XP_KEPT.set(String(p.id).toUpperCase(), {
          lat: +lat,
          lon: +lon
        });
        return {
          ...rest,
          local: 'xplane'
        };
      })
    }
  };
}
/** Un vol relu (dépôt, autre écrivain) : chaque point `local: 'xplane'` sans position reprend celle gardée sur ce poste ; un nouvel objet
 *  (l'enregistrement lu n'est jamais modifié). Sans position gardée (autre appareil, page rouverte), le point reste un nom : la relecture
 *  de la route le replace (aerodb). */
function xpRestore(f) {
  const pts = f?.route?.points;
  if (!Array.isArray(pts) || !XP_KEPT.size || !pts.some(p => p?.local === 'xplane' && !Number.isFinite(+p.lat))) return f;
  return {
    ...f,
    route: {
      ...f.route,
      points: pts.map(p => {
        const k = p?.local === 'xplane' && !Number.isFinite(+p.lat) ? XP_KEPT.get(String(p.id ?? '').toUpperCase()) : null;
        return k ? {
          ...p,
          lat: k.lat,
          lon: k.lon
        } : p;
      })
    }
  };
}
/** Une écriture du vol courant (saveFlight, à la file) : voir saveFlight. */
async function writeFlight(s) {
  const path = `pilot/${s.ctx.identity.trigram || 'ANON'}/current_flight.json`,
    cur = (await s.ctx.data.get(path)) || {};
  normProcedures(s.flight); // route.procedures au schéma v2 (un ancien { sid, star } migré, un côté d'un autre terrain retiré)
  // route et niveau : seulement ce que Carburant a changé depuis sa dernière lecture (R-F4) ; un geste de la Carte écrit entre-temps
  // reste (SOG-0013) ; le reste des champs de Carburant comme avant
  // le cadre n'écrit que progress (R-F4) : un enregistrement qu'il a écrit en dernier n'a pas de route à faire valoir (une
  // lecture d'avant une écriture de Carburant la ramenait) ; la route et le niveau de Carburant y sont remis
  const ch = CF.changesOf(cur.by === 'frame' ? CF.routeBase(cur) : s.base, s.flight);
  // SOG-0375 : une route reprise de l'enregistrement retrouve les positions d'X-Plane gardées sur ce poste
  s.flight = xpRestore(CF.applyChanges(CF.merge(cur, s.flight, {
    fields: CF.FUEL_FIELDS.filter(k => k !== 'route' && k !== 'level'),
    progressKeys: CF.FUEL_PROGRESS,
    by: 'fuel'
  }), ch));
  s.base = CF.routeBase(s.flight);
  const out = xpStrip(s.flight); // SOG-0375 : ce qui part au dépôt, sans position venue d'X-Plane
  // SOG-0209 : une écriture dont seuls updated_at et by changeraient n'est pas faite (chaque écriture part en synchronisation : 50
  // commits « current_flight.json » en rafale, sans rien de neuf, chez l'utilisateur le 10 nov.) ; le vol reste celui de l'enregistrement
  const bare = x => JSON.stringify({
    ...x,
    updated_at: undefined,
    by: undefined
  });
  if (cur.updated_at && bare(out) === bare(cur)) {
    s.flight = xpRestore(cur);
    return;
  }
  s.writing = s.flight.updated_at;
  await s.ctx.data.put(path, out);
}
// ---------------------------------------------------------------- réglages d'affichage de l'appareil (SOG-0279 (3))
/** Les réglages d'affichage : un réglage de l'APPAREIL (cache/fuel/display.json, jamais envoyé), plus dans pilot/<tri>/fuel.json (contrat
 *  de V3 Frame, frame/DECISIONS.md). La Carte lit displayAlt dans ce document (BUGS SOG a9758e03a). */
const DISPLAY_PATH = 'cache/fuel/display.json';
/** Chaque clé d'affichage et ses valeurs permises (une valeur hors liste n'est pas reprise : la valeur par défaut s'applique). */
const DISPLAY_KEYS = {
  displayUnit: v => ['kg', 'lb'].includes(v),
  displaySpeed: v => UNITS.speed.list.includes(v),
  displayAlt: v => UNITS.alt.list.includes(v),
  displayDist: v => UNITS.dist.list.includes(v),
  wxRadiusNm: v => typeof v === 'number' && v >= 0 && v <= 50
};
/** Les clés d'affichage valides d'un document (celui de l'appareil, ou fuel.json pour la copie de la première lecture). */
function displayOf(doc) {
  const out = {};
  for (const [k, ok] of Object.entries(DISPLAY_KEYS))
    if (doc && typeof doc === 'object' && ok(doc[k])) out[k] = doc[k];
  return out;
}
/** fuel.json sans ses clés d'affichage (celles qu'il porte encore disparaissent à sa prochaine écriture). */
function withoutDisplay(doc) {
  const out = {
    ...(doc && typeof doc === 'object' ? doc : {})
  };
  for (const k of Object.keys(DISPLAY_KEYS)) delete out[k];
  return out;
}
/** Les réglages d'après fuel.json et le document de l'appareil ; sans document de l'appareil, les valeurs de fuel.json y sont copiées
 *  (une fois, sans rien inventer : seulement celles qu'il porte). */
function settingsFrom(fuel, display) {
  const disp = display && typeof display === 'object' ? displayOf(display) : displayOf(fuel);
  if (!display && Object.keys(disp).length) S.ctx.data.put(DISPLAY_PATH, {
    schema: 1,
    ...disp,
    updated_at: new Date().toISOString()
  })?.catch?.(() => {});
  return {
    ...withoutDisplay(fuel),
    ...disp
  };
}
/** Écrit les réglages (après un temps calme) : ceux du devis dans fuel.json (le dépôt), ceux d'affichage dans le document de l'appareil ;
 *  chacun seulement s'il a changé depuis sa dernière écriture. */
function saveSettings() {
  clearTimeout(S.setTimer);
  const s = S;
  s.setTimer = setTimeout(() => {
    const fuel = withoutDisplay(s.settings),
      disp = displayOf(s.settings),
      fk = JSON.stringify(fuel),
      dk = JSON.stringify(disp),
      at = new Date().toISOString();
    if (fk !== s.savedFuel) {
      s.savedFuel = fk;
      s.ctx.data.put(`pilot/${s.ctx.identity.trigram || 'ANON'}/fuel.json`, {
        ...fuel,
        schema: 1,
        updated_at: at
      });
    }
    if (dk !== s.savedDisplay) {
      s.savedDisplay = dk;
      s.ctx.data.put(DISPLAY_PATH, {
        schema: 1,
        ...disp,
        updated_at: at
      });
    }
  }, 800);
}

// ---------------------------------------------------------------- procédures choisies et chemin du devis (§ 10.20)
// route.procedures v2 = { dep: { rwy, sid, trans }, arr: { rwy, star, trans, app, appTrans }, by: 'fuel', at } : identifiants du
// schéma d'aerodb, null = « aucune » (choix du pilote), champ absent = pas choisi. Fuel est seul à l'écrire ; il ne la lit que
// par CF.proceduresOf. Avant le départ, le devis court sur le chemin « route + procédures » (CF.expandedPath, CF.flownPath) ;
// après, un changement de procédure ne réécrit que les legs, le chemin vertical et la longueur (rewriteLegs).

/** Clé des entrées de la lecture des procédures : les choix et les terrains (une autre clé, le chemin est relu). */
const procsKey = (f = S.flight) => JSON.stringify([CF.proceduresOf(f).dep, CF.proceduresOf(f).arr, f.route?.dep || '', f.route?.arr || '']);

/** Chemin volé du vol (CF.flownPath d'expandedPath) : null sans procédure choisie, sans route de deux points, avec une
 *  distance saisie à la main, ou tant que les procédures choisies ne sont pas lues par aerodb (ensureProcs). */
function fpNow() {
  const f = S.flight,
    r = f.route || {},
    v = CF.proceduresOf(f);
  if (r.manual || (r.points || []).length < 2 || !sideChosen(v.dep) && !sideChosen(v.arr) || S.procs?.key !== procsKey(f)) return null;
  const fp = CF.flownPath(CF.expandedPath(f, S.procs.procs || {})),
    cons = r.constraints && typeof r.constraints === 'object' ? r.constraints : {};
  // un niveau imposé par le pilote sur un point d'une procédure (SOG-0003) : « à » ce niveau, à la place de la contrainte publiée
  for (const p of fp)
    if (p.origin !== 'route' && Object.hasOwn(cons, String(p.id || '').toUpperCase()) && +cons[String(p.id).toUpperCase()] > 0) p.alt = {
      type: 'at',
      ft: +cons[String(p.id).toUpperCase()],
      pilot: true
    };
  return fp.length >= 2 ? fp : null;
}
/** Vrai si des procédures sont choisies mais pas encore lues : le devis attend (aucune écriture d'un devis passager). */
function procsPending() {
  const v = CF.proceduresOf(S.flight);
  return (sideChosen(v.dep) || sideChosen(v.arr)) && S.procs?.key !== procsKey();
}
/** Lit les procédures choisies par aerodb (CF.loadProcedures : enregistrements et pistes) quand les choix ou les terrains ont
 *  changé, puis redessine ; sans procédure choisie, rien à lire. Une lecture à la fois par clé. */
function ensureProcs() {
  const key = procsKey(),
    v = CF.proceduresOf(S.flight),
    s = S;
  if (S.procs?.key === key) return;
  if (!sideChosen(v.dep) && !sideChosen(v.arr)) {
    S.procs = {
      key,
      procs: null
    };
    renderPts(); // plus de groupe de procédure dans la liste des points
    return;
  }
  if (S.procsBusy === key) return;
  S.procsBusy = key;
  Promise.resolve().then(() => CF.loadProcedures(s.ctx.aerodb, s.flight)).catch(() => ({})).then(procs => {
    if (gone(s)) return;
    if (s.procsBusy === key) s.procsBusy = null;
    xpNoteProcs(procs); // SOG-0375 : les points d'une procédure lue dans X-Plane (repli du poste) ne s'écrivent pas avec leur position
    s.procs = {
      key,
      procs: procs || {}
    };
    if (S === s) {
      renderPts(); // les groupes de procédure de la liste des points (§ 10.31)
      renderRinfo(); // la distance, procédures comprises
      if (S.unresolvedNames?.length) resolveRoute(false); // un nom inconnu peut être un point des procédures enfin lues (SOG-0012)
    }
    refresh();
    if (s.writeAfterProcs) { // une série de choix attendait cette lecture : le vol est écrit avec le devis, en une seule écriture
      s.writeAfterProcs = false;
      saveFlight();
    }
  });
}
/** Fin d'une série de choix de procédures (400 ms sans nouveau choix, procedures.js) : un seul devis et une seule écriture du vol.
 *  Les procédures choisies sont lues par aerodb (ensureProcs) avant le devis ; le vol est alors écrit avec lui, sinon tout de suite. */
function procsSettled() {
  // le texte de route suit le choix (§ 10.31) ; changé, la route est relue et c'est cette relecture qui écrit le vol (SOG-0377 (a) : une
  // écriture par choix, plus deux à 0,5 s d'écart)
  if (!procsToText(true)) {
    if (procsPending()) S.writeAfterProcs = true;
    else saveFlight();
  }
  refresh();
}
// ---------------------------------------------------------------- le texte de route, vue du modèle (V3 § 10.31)
/** Même texte de route, aux « DCT » et à la casse près. */
const sameRoute = (a, b) => [a, b].map(t => String(t || '').toUpperCase().split(/\s+/).filter(w => w && w !== 'DCT').join(' ')).reduce((x,
    y) =>
  x === y);
/** Le texte de route suit le choix des procédures (RT.withProcedures) : le nom de la SID et sa sortie après le départ, l'entrée et le
 *  nom de la STAR avant l'arrivée ; jamais l'approche (elle n'est pas un élément du plan de vol). La sortie (l'entrée) n'est écrite
 *  que si aucun point de la procédure n'est déjà dans la route ; quand elle l'est et que say est vrai, une ligne dit la jonction par
 *  un direct (« NTS1A sort à NT102 : NT102 DCT LUGEN »). Rien tant que les fiches ne sont pas lues, ni pendant la frappe dans le
 *  champ, ni quand le texte est déjà le bon. */
/** SOG-0372 (c) : les noms (indicatif compact, « PARCH4 ») de la SID et de la STAR choisies dans Procédures, pour que le champ Route
 *  les garde comme procédures ; la fiche lue quand le modèle des procédures l'a, sinon le nom tiré de l'identifiant. [] sans choix. */
function chosenProcNames() {
  const o = CF.proceduresOf(S?.flight || {}),
    recs = S?.P?.textModel?.()?.recs,
    nm = id => typeof id === 'string' && id ? RT.compactName(PR.nameOf(recs?.get?.(id) || null, id)) : '';
  return [nm(o.dep?.sid), nm(o.arr?.star)].filter(Boolean);
}

/** Rend vrai quand le texte a changé et que la route est relue (resolveRoute écrit alors le vol). */
function procsToText(say) {
  const m = S?.P?.textModel?.(),
    r = S?.flight?.route,
    ta = S?.body?.querySelector('[data-k="rtext"]');
  if (!m || !r || (ta && document.activeElement === ta)) return;
  // SOG-0517 : le texte d'un itinéraire pris porte déjà la SID et la STAR du moteur, à leur place : il n'est pas réécrit (les points que
  // la procédure couvre en disparaissaient, « LUGEN UN10 »)
  if (r.from === 'engine') return;
  const o = CF.proceduresOf(S.flight),
    rec = id => typeof id === 'string' ? m.recs.get(id) || null : null,
    name = (id, x) => typeof id === 'string' ? RT.compactName(PR.nameOf(x, id)) || null : null,
    sid = rec(o.dep?.sid),
    sidT = rec(o.dep?.trans),
    star = rec(o.arr?.star),
    starT = rec(o.arr?.trans),
    sidName = name(o.dep?.sid, sid),
    // la sortie et l'entrée de la règle commune avec « Auto » (PR.endsOf, refonte § 10.33 R-F4b) ; le texte juge seul s'il les écrit
    ends = PR.endsOf({
      sid,
      sidTrans: sidT,
      star,
      starTrans: starT
    }, [], r),
    exit = ends.exit?.id || null,
    res = RT.withProcedures(r.text || '', {
      dep: r.dep,
      arr: r.arr,
      sid: sidName,
      star: name(o.arr?.star, star),
      exit,
      entry: ends.entry?.id || null,
      sidPoints: [...PR.pointsOf(sid), ...PR.pointsOf(sidT)],
      starPoints: [...PR.pointsOf(starT), ...PR.pointsOf(star)],
      sidNames: [...m.sid.keys()],
      starNames: [...m.star.keys()]
    });
  const text = withRwys(res.text); // SOG-0089 : la piste choisie après le terrain
  if (sameRoute(text, r.text)) return;
  r.text = text;
  r.from = 'route';
  if (ta) ta.value = r.text;
  resolveRoute(true); // relu et normalisé (forme OACI, « DCT »), écrit, devis refait
  if (say && res.exitAdded && res.next) S.ctx.notify(tt(TX.procExitDct, {
    sid: sidName,
    exit,
    next: res.next
  }), 'ok');
  return true;
}
/** Relecture d'un texte de route que le pilote a édité (V3 § 10.31) : le premier nom d'une SID de route.dep pose cette SID (la fiche
 *  qui dessert la piste choisie, sinon la première), le dernier nom d'une STAR de route.arr pose cette STAR ; l'absence du nom d'une
 *  procédure choisie la retire (« Aucune » reste « Aucune ») ; un mot inconnu reste un point nommé (la ligne des points non reconnus le
 *  dit). Le choix passe par le même chemin qu'une liste de la carte des procédures ; sans changement, le texte reprend sa forme. */
function textToProcs() {
  const m = S.P?.textModel?.(),
    r = S.flight?.route;
  if (!m || !r) return;
  let o = CF.proceduresOf(S.flight);
  // SOG-0089 : « LFPO/07 » (premier mot) et « LFML/31R » (dernier) posent la piste de leur côté, d'abord (la SID suit la piste) ; une
  // piste que le terrain n'a pas est dite, rien n'est choisi ; le terrain écrit sans la piste choisie la retire (une seule
  // règle pour ce que porte le texte ; un texte d'avant ce lot est refait à l'ouverture : rwyTextSync)
  const rw = RT.runwaysOfText(r.text, {
    dep: r.dep,
    arr: r.arr
  });
  let rwChanged = false;
  // un groupe vitesse-niveau collé en tête (« N0450F350 LFPO/07 … ») : ignoré, et dit une fois par texte (jamais perdu sans un mot)
  const g = RT.leadingGroup(r.text);
  if (g && S.groupSaid !== r.text) {
    S.groupSaid = r.text;
    S.ctx.notify(tt(TX.groupIgnored, {
      g
    }), 'info');
  }
  for (const side of ['dep', 'arr']) {
    const want = rw[side];
    // le terrain écrit sans sa piste alors qu'une est choisie : le pilote l'a effacée (le texte la porte depuis l'ouverture) : retirée, dit
    if (want === '' && typeof o[side]?.rwy === 'string') {
      S.P.choose(`p-${side}-rwy`, '');
      rwChanged = true;
      S.ctx.notify(tt(TX.rwyRemoved, {
        side: tt(side === 'dep' ? TX.rwySideDep : TX.rwySideArr),
        ad: String(r[side] || '').toUpperCase()
      }), 'info');
      continue;
    }
    if (!want) continue;
    const ids = (side === 'dep' ? m.depRwys : m.arrRwys) || [],
      id = ids.find(x => PR.rwNum(x) === want);
    if (!id) {
      S.ctx.notify(tt(TX.rwyUnknown, {
        ad: String(r[side] || '').toUpperCase(),
        rwy: want
      }), 'warn');
      continue;
    }
    if (PR.rwNum(o[side]?.rwy) !== want) {
      S.P.choose(`p-${side}-rwy`, id);
      rwChanged = true;
    }
  }
  if (rwChanged) o = CF.proceduresOf(S.flight);
  const found = RT.proceduresOfText(r.text, {
      sidNames: [...m.sid.keys()],
      starNames: [...m.star.keys()]
    }),
    nameOf = id => typeof id === 'string' ? RT.compactName(PR.nameOf(m.recs.get(id), id)) : null;
  let changed = false;
  const set = (side, k, byName, want) => {
    const cur = o[side]?.[k];
    if (want && nameOf(cur) !== want) {
      const list = byName.get(want) || [],
        pick = PR.firstServing(list, o[side]?.rwy) || list[0];
      if (pick) {
        S.P.choose(`p-${side}-${k}`, pick.id);
        changed = true;
      }
    } else if (!want && typeof cur === 'string') {
      S.P.choose(`p-${side}-${k}`, '');
      changed = true;
    }
  };
  set('dep', 'sid', m.sid, found.sid);
  set('arr', 'star', m.star, found.star);
  if (!changed && !rwChanged) procsToText(true);
}
/** Signature de la route (points, distance saisie à la main) : ce qui, changé après le départ, refait tout le devis. Les points des
 *  procédures choisies n'y comptent pas (depuis SOG-0012 un nom de la route que porte une procédure prend sa position : choisir ou
 *  retirer une procédure après le départ ne doit refaire que les legs, § 10.20 ; F16), ni la distance calculée qui en suit. */
const routeSig = () => {
  const r = S.flight.route || {},
    procs = S.procs?.procs || {},
    inProcs = new Set(Object.values(procs).flatMap(x => Array.isArray(x) ? x : [x]).flatMap(rec => (rec?.points || []).map(q => String(q
      ?.id || '').toUpperCase())));
  return JSON.stringify([(r.points || []).filter(p => !inProcs.has(String(p.id || '').toUpperCase())).map(p => [p.id, p.lat, p.lon]), r
    .manual ? r.distanceNm : null, !!r.manual
  ]);
};
/** Distance (NM) sur laquelle court le devis. Avant le départ, celle du chemin (ou de la route) ; après, celle de l'ouverture du vol
 *  (quote.distanceNm) tant que la route ne change pas : un changement de procédure ne bouge ni le carburant ni le temps du
 *  devis (V3_SPECIFICATION § 10.20), seulement les legs, le chemin vertical et la longueur de progression. */
function quoteNm(cur) {
  const f = S.flight;
  if (!f.started?.at) {
    S.froze = undefined;
    return cur;
  }
  if (procsPending()) return cur; // les procédures choisies ne sont pas lues : pas de longueur à garder (rien n'est écrit non plus)
  const sig = routeSig();
  if (S.froze === undefined) S.froze = {
    sig,
    nm: +f.quote?.distanceNm > 0 ? +f.quote.distanceNm : cur
  };
  else if (S.froze === false || S.froze.sig !== sig) S.froze = {
    sig,
    nm: cur
  };
  return S.froze.nm;
}
/** Paliers du devis sur le chemin volé : le niveau (alt_ft) des points de la route à leur distance cumulée du chemin, ramenée à
 *  la distance du devis. Les contraintes des procédures n'y entrent pas (voir DECISIONS, 28 oct. 2026). */
function pathSteps(fp, distanceNm) {
  const k = fp.at(-1).nm > 0 ? distanceNm / fp.at(-1).nm : 1,
    out = fp.slice(1, -1).filter(p => p.origin === 'route' && p.alt_ft > 0).map(p => ({
      nm: p.nm * k,
      ft: +p.alt_ft
    }));
  return out.length ? out : null;
}
/** Points suivis par l'horaire et la progression : le chemin volé quand les procédures sont lues, sinon les points de la route ;
 *  nm : sa longueur (celle de la route sans chemin). */
function progPath() {
  const fp = fpNow();
  return {
    pts: fp || S.flight.route?.points || [],
    nm: fp ? fp.at(-1).nm : +S.flight.route?.distanceNm || 0
  };
}
/** Procédures de l'enregistrement mises au schéma v2 avant d'écrire : un ancien { sid, star } devient dep / arr, un côté dont le
 *  terrain a changé (CF.proceduresOf le rend vide) est retiré. Rien n'est réécrit quand l'enregistrement est déjà v2 et à jour ;
 *  jamais appelée au montage : la migration part avec la prochaine écriture ordinaire. */
function normProcedures(f) {
  const pr = f?.route?.procedures;
  if (!pr || typeof pr !== 'object') return;
  const v = CF.proceduresOf(f),
    dep = v.dep === null ? null : cleanSide(v.dep),
    arr = v.arr === null ? null : cleanSide(v.arr);
  if (('dep' in pr || 'arr' in pr) && JSON.stringify([dep, arr]) === JSON.stringify([pr.dep ?? null, pr.arr ?? null].map(x => x === null ?
      null :
      cleanSide(x)))) return;
  if (!sideChosen(dep) && !sideChosen(arr) && dep !== null && arr !== null) delete f.route.procedures;
  else f.route.procedures = {
    dep: dep ?? null,
    arr: arr ?? null,
    by: 'fuel',
    at: pr.at || new Date().toISOString()
  };
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
    fp = fpNow(), // chemin « route + procédures » quand des procédures sont choisies et lues
    distanceNm = quoteNm(fp ? fp.at(-1).nm : +f.route?.distanceNm || 0),
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
      steps: fp ? pathSteps(fp, distanceNm) : routeSteps(f.route, distanceNm),
      holds: holdsOf(f.route, levelFt), // le temps sur zone par point (§ 1 bis)
      legs: quoteLegs(distanceNm) // SOG-0281 : le vent tronçon par tronçon
    },
    // SOG-0435 : la signature des entrées de la suite (toutes des fonctions pures de ces données) : le devis, la série des niveaux et
    // le guide de montée — l'intégrale de la montée à chaque niveau, 85 % d'un refresh mesuré par V3 Frame — ne sont refaits que si
    // elle change. Elle porte tout ce que lisent quote, altnAdd (dégagement : terrain, position, vent), decisionSeries / requoteSeries
    // (le vent prévu par niveau : aloftMeanAt) et climbGuide ; les fonctions des objets (lois) viennent de ces données.
    A0 = S.aloft,
    r0 = f.route || {},
    sig = (() => {
      try {
        // hors de qIn, lus par la suite : la langue (textes du modèle de performances), le catalogue des aéronefs une fois chargé
        // (classe de motorisation), la description du type donnée à perfModel, et la clé des vents prévus d'aujourd'hui (aloftKey :
        // les points de la route et l'heure du vol, ou l'heure présente sans date) contre laquelle altnAdd et aloftMeanAt les acceptent
        return JSON.stringify([qIn, goal, o, +f.isaDev || 0, r0.arr || '', r0.altn || '', S.altnGeo?.key || '', S.altnGeo?.state || '',
          f.weather?.real || false, f.windSource?.kind || '', A0?.key || '', A0?.profiles?.length || 0, A0?.at || '', aloftKey(), S
          .ctx.lang(),
          !!window.AircraftCatalog?.classify, A?.record?.(code)?.description || ''
        ]);
      } catch {
        return null; // une entrée non sérialisable : pas de signature, le calcul est refait (jamais un devis gardé à tort)
      }
    })();
  if (sig && S.computeMemo?.sig === sig) return S.computeMemo.out;
  const q = distanceNm > 0 ? altnAdd(M.quote(qIn), qIn, sheet, levelFt) : null,
    D = perf && q ? L.requoteSeries(L.decisionSeries(perf, {
      distanceNm,
      wc: q.windKnown ? q.wc : 0
    }, goal, o), h => M.quote({
      ...qIn,
      levelFt: h,
      // une seule base pour tous les points de la courbe, le niveau du plan compris : vol à plat à ce niveau, avec le vent
      // de la prévision à ce niveau quand la météo réelle le donne, sans les paliers de la route (un point calculé
      // autrement que ses voisins fait un pic) ; le devis réel du plan est le repère à part (D.plan)
      wind: aloftMeanAt(h) || qIn.wind,
      steps: null
    }), {
      h: levelFt,
      quote: q
    }) : null,
    G = perf && levelFt > 0 ? L.climbGuide(perf, levelFt, goal, o) : null;
  const out = {
    sheet,
    source,
    perf,
    q,
    D,
    G,
    goal,
    levelFt,
    nm: distanceNm, // la distance du devis (quote.distanceNm)
    qIn // SOG-0545 : les entrées du devis, la base du chiffrage de chaque route proposée (routeFigures)
  };
  S.computeMemo = {
    sig,
    out
  };
  return out;
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
/** Courbes de la décision du niveau : carburant (trait plein) et temps (tirets) du trajet entier selon le niveau, partie
 *  extrapolée au-delà du plafond en pointillés, zone non tenable grisée, plafond, moins de carburant (rond), plus rapide
 *  (carré), niveau du plan (trait vertical) et devis réel du plan (losanges, avec les paliers de la route). Axe du
 *  carburant dans l'unité affichée. */
function decisionSvg(C, box) {
  const {
    D,
    sheet,
    levelFt
  } = C, [W, H] = svgSize(box), pl = 48, pr = 44, pt = 24, pb = 30,
    to = fuelUnitOf(sheet.unit),
    cf = v => sheet.unit && to !== sheet.unit ? window.FuelModel.convertFuel(v, sheet.unit, to) : v,
    rows = D.rows.filter(r => r && Number.isFinite(r.fuel) && Number.isFinite(r.minutes)),
    fuels = [...rows.map(r => cf(r.fuel)), ...(D.plan ? [cf(D.plan.fuel)] : [])],
    mins = [...rows.map(r => r.minutes), ...(D.plan ? [D.plan.minutes] : [])],
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
      if (ok) d += `${on ? 'L' : 'M'}${x(r.h).toFixed(1)},${y(k === 'fuel' ? cf(r[k]) : r[k]).toFixed(1)}`;
      on = ok;
    }
    return d;
  };
  const xt = ticks(0, D.xmax, W < 420 ? 6 : 10).filter(v => v > 0),
    ft = ticks(fMin, fMax, 4),
    tm = ticks(tMin, tMax, 4),
    gap = D.gap ? `<rect x="${x(D.gap.from)}" y="${pt}" width="${Math.max(0, x(Math.min(ceil, D.xmax)) - x(D.gap.from))}" height="${H - pt - pb}" class="fu-gap"/>` : '',
    mk = (r, cls, sq) => r ? sq ? `<rect x="${x(r.h) - 5}" y="${yt(r.minutes) - 5}" width="10" height="10" class="${cls}"/>` : `<circle cx="${x(r.h)}" cy="${yf(cf(r.fuel))}" r="5.5" class="${cls}"/>` : '',
    /** Losange du devis réel du plan, sur chacune des deux courbes ; plus petit sans paliers (il coïncide avec la courbe). */
    dia = (cx, cy, rad) => `<path d="M${cx},${cy - rad}L${cx + rad},${cy}L${cx},${cy + rad}L${cx - rad},${cy}Z" class="fu-planpt"/>`,
    prad = D.plan && D.plan.h <= D.xmax ? D.plan.stepped ? 6.5 : 4 : 0;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tt(TX.decision))}" class="fu-svg" data-chart="decision">
    ${gap}
    ${xt.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pt}" y2="${H - pb}" class="fu-grid"/><text x="${x(v)}" y="${H - pb + 16}" text-anchor="middle">${flTxt(v)}</text>`).join('')}
    ${ft.map(v => `<text x="${pl - 6}" y="${yf(v) + 4}" text-anchor="end" class="fu-fuel">${Math.round(v / (v >= 10000 ? 1000 : 1)).toLocaleString(S.ctx.lang())}${v >= 10000 ? 'k' : ''}</text>`).join('')}
    ${tm.map(v => `<text x="${W - pr + 6}" y="${yt(v) + 4}" class="fu-time">${hmm(v)}</text>`).join('')}
    <text x="${pl - 6}" y="12" text-anchor="end" class="fu-fuel fu-unit">${esc(to)}</text>
    ${ceil < D.xmax ? `<line x1="${x(ceil)}" x2="${x(ceil)}" y1="${pt}" y2="${H - pb}" class="fu-ceil"/>` : ''}
    <path d="${path(yt, 'minutes', false)}" class="fu-line-t"/><path d="${path(yt, 'minutes', true)}" class="fu-line-t fu-ext"/>
    <path d="${path(yf, 'fuel', false)}" class="fu-line-f"/><path d="${path(yf, 'fuel', true)}" class="fu-line-f fu-ext"/>
    ${levelFt > 0 && levelFt <= D.xmax ? `<line x1="${x(levelFt)}" x2="${x(levelFt)}" y1="${pt}" y2="${H - pb}" class="fu-plan"/>` : ''}
    ${mk(D.best, 'fu-best')}${mk(D.fast, 'fu-fast', true)}
    ${prad ? `${dia(x(D.plan.h), yf(cf(D.plan.fuel)), prad)}${dia(x(D.plan.h), yt(D.plan.minutes), prad)}` : ''}
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
/* SOG-0080 / 0081 : les itinéraires proposés, un segment fautif dans la liste des points */
[data-module="fuel"] .fu-ralts .f-item[aria-current]{border-color:var(--sog-accent);box-shadow:inset 3px 0 0 var(--sog-accent)}
/* SOG-0545 (l'ergonome) : le verdict qui n'est pas bon, puis les motifs, chacun sur sa ligne sous le niveau */
[data-module="fuel"] .fu-rhead>.fu-rh2,[data-module="fuel"] .fu-rhead>.fu-rh3{display:block}
[data-module="fuel"] .fu-ralts .f-item.fu-raltshown{box-shadow:inset 0 0 0 2px var(--sog-accent);cursor:default} /* la ligne montrée (SOG-0134) */
[data-module="fuel"] .fu-ralts .f-item[data-alt]{cursor:pointer}
[data-module="fuel"] .fu-ralts .fu-raltroute,[data-module="fuel"] .fu-ralts .fu-rproof{display:block;word-break:break-word}
/* SOG-0545 (maquette v2) : la carte d'une route — mentions et tête en colonne 1, le geste en colonne 2 ; les trois nombres et le reste sur
   toute la largeur au téléphone ; à partir de 440 px (la colonne de Carburant à côté de la Carte) le geste tient sur la hauteur de la tête
   et des nombres (pas de vide sous le titre) */
[data-module="fuel"] .fu-ralts .f-item.fu-ralt{align-items:start}
[data-module="fuel"] .fu-ralt>.fu-rmarks,[data-module="fuel"] .fu-ralt>.fu-rhead{grid-column:1}
[data-module="fuel"] .fu-ralt>.fu-ract{grid-column:2;grid-row:1;align-self:center}
/* SOG-0545 : la ligne qu'« Auto » garde — la pastille « Auto » au-dessus de « Choisir » */
[data-module="fuel"] .fu-ralt>.fu-rgest{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
[data-module="fuel"] .fu-ralt.fu-raltmark>.fu-ract{grid-row:1 / span 2}
[data-module="fuel"] .fu-ralt>.fu-rfigs,[data-module="fuel"] .fu-ralt>.fu-rrest{grid-column:1 / -1;min-width:0}
[data-module="fuel"] .fu-rmarks{display:flex;flex-wrap:wrap;gap:6px}
[data-module="fuel"] .fu-rfigs{display:grid;grid-template-columns:68px 112px minmax(0,1fr);gap:0 10px;font-variant-numeric:tabular-nums}
[data-module="fuel"] .fu-rfigs>span{white-space:nowrap}
[data-module="fuel"] .fu-rfigs .fu-rhi{font-weight:700}
[data-module="fuel"] .fu-rcols{padding:0 13px;margin:.4em 0 -.1em;font-size:.85em}
[data-module="fuel"] .fu-rconform{margin:.1em 0 .4em;font-size:.85em}
[data-module="fuel"] .fu-ralts .fu-raltroute{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;word-break:normal}
/* une proposition de repli garde sa mise en page (SOG-0161) : texte sur toute la largeur, son bouton dessous au téléphone */
[data-module="fuel"] [data-proposals]>.f-item.fu-ralt>.fu-ract{grid-column:1 / -1;grid-row:auto;justify-self:start}
[data-module="fuel"] [data-proposals] .fu-raltroute{white-space:normal;word-break:break-word}
[data-module="fuel"] .fu-rhead [data-verdict]{white-space:nowrap} /* un verdict long passe à la ligne entier */
@container (min-width: 440px){
  [data-module="fuel"] .fu-ralt>.fu-rfigs{grid-column:1}
  [data-module="fuel"] .fu-ralt>.fu-ract{grid-row:1 / span 2}
  [data-module="fuel"] .fu-ralt.fu-raltmark>.fu-ract{grid-row:1 / span 3}
  [data-module="fuel"] .fu-ralts .fu-raltroute{white-space:normal;word-break:break-word}
}
[data-module="fuel"] .fu-pt.fu-pterr{border-color:var(--sog-err);flex-wrap:wrap}
[data-module="fuel"] .fu-pt .fu-segwhy{flex-basis:100%;order:9;color:var(--sog-err)}
[data-module="fuel"] .fu-faultlist{margin:.2em 0 .3em;padding-left:1.1em}
[data-module="fuel"] .fu-faultlist li{margin:.15em 0;overflow-wrap:anywhere} /* un écart par ligne (SOG-0134) : segment · règle · phrase */
/* SOG-0539 (l'ergonome) : un repli dans un repli — le chevron seul, sans puce devant */
[data-module="fuel"] .fu-faultlist>li:has(>details){list-style:none;margin-left:-1.1em}
[data-module="fuel"] .fu-rterrain [data-terrainrefs]{margin:.2em 0 .4em;overflow-wrap:anywhere}
[data-module="fuel"] .fu-faultrule{color:var(--sog-err)}
[data-module="fuel"] .fu-rprophead{margin:.8em 0 .2em;font-size:.95em;color:var(--sog-warn)} /* « Propositions non validées » (plan impossible) */
/* SOG-0161 : « Prendre cette proposition » sous le texte d'une proposition sur un module étroit (le texte jamais écrasé, comme SOG-0344) */
[data-module="fuel"] [data-proposals]>.f-item{grid-template-columns:minmax(0,1fr)}
[data-module="fuel"] [data-proposals]>.f-item>button{justify-self:start}
@container (min-width: 600px){[data-module="fuel"] [data-proposals]>.f-item{grid-template-columns:minmax(0,1fr) auto}
  [data-module="fuel"] [data-proposals]>.f-item.fu-ralt>.fu-ract{grid-column:2;grid-row:1 / span 2;justify-self:end}}
[data-module="fuel"] .fu-rshare{display:block}
/* la légende commune des itinéraires (SOG-0134, frame/lib/route_legend.js) : un trait à son motif puis son mot */
[data-module="fuel"] .rl-legend{display:flex;flex-wrap:wrap;gap:.25em 1em;align-items:center}
[data-module="fuel"] .rl-item{display:inline-flex;align-items:center;gap:.35em;white-space:nowrap}
[data-module="fuel"] .rl-hint{color:var(--sog-muted);white-space:normal}
[data-module="fuel"] .rl-route{color:var(--sog-fg)}
[data-module="fuel"] .rl-sid{color:var(--sog-ok)}
[data-module="fuel"] .rl-star{color:var(--sog-warn)}
[data-module="fuel"] .rl-app{color:var(--sog-accent)}
[data-module="fuel"] .rl-err{color:var(--sog-err)}
[data-module="fuel"] .fu-rsections .rl-legend{display:inline-flex} /* le partage contrôlé / incomplet / repli, sous la route de l'itinéraire (SOG-0161) */
[data-module="fuel"] .fu-ctrl-controlled{color:var(--sog-ok)}
[data-module="fuel"] .fu-ctrl-incomplete,[data-module="fuel"] .fu-ctrl-fallback{color:var(--sog-warn)}
[data-module="fuel"] .fu-ctrl-error{color:var(--sog-err)}
[data-module="fuel"] .fu-procgroundfail{color:var(--sog-err)} /* « Sol non lu : <raison> » sur la ligne discrète (SOG-0135) */
[data-module="fuel"] .fu-raltinc{opacity:.72} /* contrôle incomplet (SOG-0081) : teinte atténuée, jamais l'air d'une route contrôlée */
/* « zone manquante » (SOG-0143) : ce qui manque, le geste, les replis externes — trois éléments sur une ou deux lignes */
[data-module="fuel"] .fu-zonegap{display:flex;flex-wrap:wrap;gap:.2em .8em;align-items:center;margin:.3em 0}
[data-module="fuel"] .fu-zonegap a[data-zonelink]{min-height:44px;display:inline-flex;align-items:center}
[data-module="fuel"] .fu-rfaults>summary,[data-module="fuel"] .fu-faultmore>summary,[data-module="fuel"] .fu-rverdicts>summary{min-height:44px;display:flex;align-items:center}
[data-module="fuel"] details.fu-others>summary{cursor:pointer;margin:10px 0 4px;font-weight:600}
/* SOG-0058 : libellé à gauche dans une colonne fixe, valeur à droite (l'unité dans le libellé) ; la même grille sur la carte Météo et
   les réglages du devis : un libellé long passe à la ligne sans décaler les champs ; plusieurs couples par ligne sur un grand écran */
[data-module="fuel"] .fu-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,20em),1fr));gap:6px 16px}
[data-module="fuel"] .fu-pairs>label.f-field{display:grid;grid-template-columns:minmax(0,11em) minmax(0,1fr);align-items:center;column-gap:8px;margin:0}
[data-module="fuel"] .fu-pairs>label.f-field>:is(input,select){min-width:0;width:100%}
[data-module="fuel"] .fu-ads{grid-template-columns:minmax(0,12em) 44px minmax(0,12em) minmax(0,12em);position:relative} /* départ, ⇄, arrivée, dégagement ; position:relative : la liste de propositions s'y pose */
/* SOG-0393 : la colonne intérieure d'un champ bornée à sa cellule — une étiquette plus large que la colonne (« Dégagement » à 390 px en
   cupertino) élargissait le champ de 2 px ; l'étiquette déborde dans l'espace entre les colonnes, le champ garde la largeur des autres */
[data-module="fuel"] .fu-ads>.f-field{grid-template-columns:minmax(0,1fr);min-width:0}
/* ⇄ (SOG-0127, allégé SOG-0140 : « tellement trop gros ») : un bouton icône de la taille du texte, 24 px dessinés, sans bordure ni fond,
   teinte atténuée ; la cible reste de 44 px par un pseudo-élément, dans sa colonne de 44 px (rien d'autre ne bouge dans la rangée) */
[data-module="fuel"] .fu-ads button.fu-adswap{position:relative;align-self:center;justify-self:center;width:24px;height:24px;min-width:0;min-height:0;padding:0;margin:0;border:0;border-radius:0;background:none;box-shadow:none;color:var(--sog-muted);font-size:1.05em;line-height:1}
[data-module="fuel"] .fu-ads button.fu-adswap::before{content:'';position:absolute;inset:-10px}
[data-module="fuel"] .fu-ads button.fu-adswap:hover,[data-module="fuel"] .fu-ads button.fu-adswap:focus-visible{color:var(--sog-fg)}
[data-module="fuel"] .fu-adname{display:block;height:1.4em;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--sog-size-s);color:var(--sog-muted)} /* hauteur réservée, même vide : rien ne bouge */
[data-module="fuel"] .fu-adname[data-state="unknown"]{font-style:italic}
/* SOG-0398 : la ligne du dégagement sous les terrains — un signe coloré, une phrase ; le détail des critères dans un pli */
[data-module="fuel"] .fu-altnchk:empty{display:none}
[data-module="fuel"] .fu-altnchk{margin:-4px 0 8px}
[data-module="fuel"] .fu-altnline{display:flex;gap:6px;align-items:baseline;margin:0}
[data-module="fuel"] .fu-altnsign{flex:0 0 1.1em;text-align:center;font-weight:700}
[data-module="fuel"] :is(.fu-altnline,.fu-altnfold li)[data-state="ok"]>.fu-altnsign{color:var(--sog-ok)}
[data-module="fuel"] :is(.fu-altnline,.fu-altnfold li)[data-state="warn"]>.fu-altnsign{color:var(--sog-warn)}
[data-module="fuel"] :is(.fu-altnline,.fu-altnfold li)[data-state="err"]>.fu-altnsign{color:var(--sog-err)}
[data-module="fuel"] :is(.fu-altnline,.fu-altnfold li)[data-state="grey"]>.fu-altnsign{color:var(--sog-muted)}
[data-module="fuel"] .fu-altnfold ul{list-style:none;margin:4px 0 0;padding:0}
[data-module="fuel"] .fu-altnfold li{display:flex;gap:6px;align-items:baseline;margin:2px 0}
/* SOG-0398 lot 2 : la proposition — le bouton, puis les trois plus proches dans un repli, chacun avec « Prendre » à droite (cible de 44 px) ;
   l'en-tête du repli serré contre la liste ; une réserve (« à vue seulement »), une distance, un carburant ne se coupent pas */
[data-module="fuel"] .fu-altnprop{margin:4px 0 0}
[data-module="fuel"] details.fu-altnprop>summary{margin:0;padding:2px 0}
[data-module="fuel"] .fu-altnprop ul{list-style:none;margin:0;padding:0}
[data-module="fuel"] .fu-altnprop [data-altnmore]{margin:2px 0 0}
[data-module="fuel"] .fu-nowrap{white-space:nowrap}
[data-module="fuel"] .fu-altnprop li{display:flex;gap:6px;align-items:baseline;margin:4px 0}
[data-module="fuel"] .fu-altnprop li>span:nth-child(2){flex:1;min-width:0}
[data-module="fuel"] .fu-altnprop li[data-state="ok"]>.fu-altnsign{color:var(--sog-ok)}
[data-module="fuel"] .fu-altnprop li[data-state="warn"]>.fu-altnsign{color:var(--sog-warn)}
[data-module="fuel"] .fu-altnprop li[data-state="err"]>.fu-altnsign{color:var(--sog-err)}
[data-module="fuel"] .fu-altnprop li[data-state="grey"]>.fu-altnsign{color:var(--sog-muted)}
[data-module="fuel"] .fu-sug{position:absolute;left:0;right:0;max-width:26em;z-index:30;display:grid;gap:0;margin:0;background:var(--sog-surface);border:1px solid var(--sog-border);border-radius:var(--sog-radius);box-shadow:var(--sog-shadow)} /* par-dessus la page, jamais dans la mise en page */
[data-module="fuel"] .fu-sug[hidden]{display:none}
[data-module="fuel"] [data-rstale][hidden]{display:none} /* SOG-0533 : la ligne « à recalculer » est un .f-row (display:flex) */
[data-module="fuel"] .fu-sugitem{display:block;width:100%;min-height:44px;text-align:left;border-width:0 0 1px;border-radius:0;background:transparent}
[data-module="fuel"] .fu-sugitem:last-child{border-bottom-width:0}
[data-module="fuel"] .fu-sugitem[aria-selected="true"]{background:var(--sog-surface-2);box-shadow:inset 3px 0 0 var(--sog-accent)}
[data-module="fuel"] .fu-sugitem span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* l'étape Vol, rangée 2 (SOG-0056, refus de recette : « mauvais placement du label, écran devenu brouillon ») : Niveau | Date du vol, alignés
   par le haut (les deux libellés sur la même ligne de base), « Auto » collé à droite du champ Niveau dans sa rangée, sous lui une seule
   ligne d'aide comme le nom d'un terrain sous son champ ; la date garde sa place même à 390 px */
[data-module="fuel"] .fu-flight{display:flex;flex-wrap:wrap;align-items:flex-start}
[data-module="fuel"] .fu-flight>.f-field:first-child{flex:0 0 auto;min-width:0} /* SOG-0393 : la largeur du champ et de « Auto » (une colonne de 7,5 em : « Auto » débordait sur la date, sans espace) */
[data-module="fuel"] .fu-flight>.f-field:first-child .fu-when button{padding:0 8px}
[data-module="fuel"] .fu-flight>.f-field:first-child .fu-when{flex-wrap:nowrap}
[data-module="fuel"] .fu-flight>.f-field:first-child .fu-when input{flex:0 0 3.5em;width:3.5em;min-width:3.5em}
[data-module="fuel"] .fu-flight>.f-field:last-child{flex:1 1 11em;max-width:26em;min-width:0} /* min-width:0 : la date ne pousse pas la ligne au-delà de l'écran */
/* F4 à 360 px (SOG-0056 retouché) : la largeur naturelle du champ date-heure (≈ 190 px) poussait la rangée de 3 px ; le conteneur et le
   champ rétrécissent à la cellule */
[data-module="fuel"] .fu-flight>.f-field:last-child .fu-when{min-width:0;max-width:100%}
[data-module="fuel"] .fu-flight>.f-field:last-child .fu-when input{width:0;min-width:0}
/* SOG-0393 (l'utilisateur, metro, ordinateur : « arranger les champs décalés ») : sous chaque champ de la rangée, une seule ligne d'aide
   de hauteur réservée — « auto · 1:49 » sous le niveau, « heure locale de l'appareil » sous la date (elle passait sous l'étiquette et
   poussait le champ) ; les deux étiquettes sur une ligne, les deux champs à la même hauteur */
[data-module="fuel"] .fu-flight :is([data-lvlauto],[data-datenote]){display:block;height:1.4em;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} /* une ligne, hauteur réservée */
/* un espace entre les rangées de l'étape (terrains, niveau et date, famille et série) : « auto · 1:49 » ne colle plus à « Famille » */
[data-module="fuel"] :is(.fu-ads,.fu-flight){margin-bottom:8px}
[data-module="fuel"] .fu-when{display:flex;flex-wrap:wrap;gap:4px;align-items:stretch} /* champ d'abord, les deux boutons passent dessous quand la place manque */
[data-module="fuel"] .fu-when input{flex:1 1 11em;min-width:0}
[data-module="fuel"] .fu-when button{flex:none;min-width:44px;min-height:44px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;gap:2px}
[data-module="fuel"] .fu-when button b{font-size:.8em}
[data-module="fuel"] input.fu-code{text-transform:uppercase}
[data-module="fuel"] .fu-hide{display:none}
[data-module="fuel"] .fu-cat{margin:var(--sog-gap) 0 4px;font-size:1em;color:var(--sog-muted)}
/* une ligne de la liste des fiches : le texte prend la largeur restante, le nom en une ligne ; sous 480 px, les actions sous le texte,
   à droite, le chevron du design avec elles (retour de l'utilisateur, 30/10 : sur iPhone, le texte écrasé à la largeur d'un mot) */
[data-module="fuel"] .f-list[data-sheets] .f-item>div:first-child{min-width:0}
[data-module="fuel"] .f-list[data-sheets] .f-item>div:first-child>:is(a,b):first-child{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
[data-module="fuel"] .f-list[data-sheets] .f-item>.f-row{justify-content:flex-end}
@container (max-width: 479px){[data-module="fuel"] .f-list[data-sheets] .f-item>div:first-child{grid-column:1/-1} [data-module="fuel"] .f-list[data-sheets] .f-item>.f-row{grid-column:1/3;grid-row:2} [data-module="fuel"] .f-list[data-sheets] .f-item::after{grid-row:2}}
[data-module="fuel"] .fu-block{display:block}
[data-module="fuel"] [data-acsel]{flex-wrap:wrap;row-gap:4px} /* la ligne passe à la ligne plutôt que de couper le nom (SOG-0060) */
[data-module="fuel"] [data-acsel]>b{white-space:nowrap}
[data-module="fuel"] [data-acsel] .f-muted{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* la ligne de l'appareil porte son geste dans son flux (SOG-0060, refus de recette : « le bouton de recherche est au bout du monde ») :
   « Changer » suit le texte, rien n'est aligné seul à droite */
/* dessiné à la taille du texte comme ⇄ (retouche de recette : « un bouton collé à du texte ne devrait pas dépasser autant de la ligne ») :
   loupe + « Changer » sans cadre, teinte d'accent, 26 px de haut ; la cible de 44 px est un pseudo-élément */
[data-module="fuel"] [data-acsel] button[data-do="acopen"]{position:relative;flex:none;display:inline-flex;align-items:center;gap:4px;height:26px;min-height:0;min-width:0;padding:0 2px;margin:0;border:0;border-radius:0;background:none;box-shadow:none;color:var(--sog-accent);font:inherit;line-height:1}
[data-module="fuel"] [data-acsel] button[data-do="acopen"]::before{content:'';position:absolute;inset:-9px -4px}
[data-module="fuel"] [data-acsel] button[data-do="acopen"] svg{width:16px;height:16px;flex:none}
[data-module="fuel"] [data-acsel] button[data-do="acopen"]:hover span,[data-module="fuel"] [data-acsel] button[data-do="acopen"]:focus-visible span{text-decoration:underline}
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
[data-module="fuel"] .fu-natout{display:block} /* SOG-0413 : le résultat d'une lecture des routes NAT sur sa ligne, jamais collé à la phrase */
[data-module="fuel"] .fu-fpltext{white-space:pre-wrap;word-break:break-all;font-family:var(--sog-mono, ui-monospace, monospace);font-size:var(--sog-size-s);margin:6px 0;user-select:all} /* SOG-0402 : le message à relire */
[data-module="fuel"] .fu-fplnotes{margin:4px 0;padding-left:1.2em}
[data-module="fuel"] tr[data-altnpart]>td:first-child{padding-left:1.2em;color:var(--sog-muted)} /* SOG-0399 : les parts du dégagement, en retrait */
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
@container (min-width: 850px){ /* SOG-0331 : 850 comme .f-cols du cadre, gardé quand la barre de gauche s'élargit à 1 100 px ; module large : tous les pas visibles, sans barre de pas ni « Suivant » */
  [data-module="fuel"] .fu-steps,[data-module="fuel"] .fu-next{display:none}
  [data-module="fuel"] .fu-step[hidden]{display:block}
}
${PROC_STYLE}
/* groupes de procédure de la liste des points (§ 10.31) : la teinte de la Carte, jetons du design (refonte § 10.33 R-F3) */
[data-module="fuel"] .fu-ptgrp{border-left:3px solid currentColor;padding-left:8px;display:block}
[data-module="fuel"] .fu-ptgrp>summary{cursor:pointer;min-height:44px;display:flex;align-items:center}
[data-module="fuel"] .fu-ptgrp[data-kind="sid"]{border-left-color:var(--sog-map-sid)}
[data-module="fuel"] .fu-ptgrp[data-kind="star"]{border-left-color:var(--sog-map-star)}
[data-module="fuel"] .fu-ptgrp[data-kind="app"]{border-left-color:var(--sog-map-app)}
[data-module="fuel"] .fu-rrow>label{position:relative} /* la liste de complétion du champ de route s'y pose (§ 10.31) */
[data-module="fuel"] .fu-rrow{display:flex;gap:8px;align-items:flex-end} /* champ de la route + « Auto » : le champ prend la place restante */
[data-module="fuel"] .fu-rrow>.f-field{flex:1 1 0;min-width:0}
[data-module="fuel"] .fu-rrow>button{flex:none;min-width:56px;min-height:44px;margin-bottom:2px}
[data-module="fuel"] .fu-rinfo{flex-wrap:wrap;gap:4px 12px;margin:4px 0}
[data-module="fuel"] .fu-top{justify-content:space-between;align-items:center;gap:8px}
[data-module="fuel"] .fu-top>.f-tabs{margin:0}
/* la puce de la mission (SOG-0193 L2) : à la taille du texte, teinte d'accent, cible de 44 px ; son volet par-dessus l'étape, à droite
   sur un ordinateur, en bas sur un téléphone, sans rien déplacer dessous */
[data-module="fuel"] .fu-mchipslot:empty{display:none}
[data-module="fuel"] .fu-mchip{position:relative;min-height:0;height:28px;padding:0 10px;border:1px solid var(--sog-accent);background:none;color:var(--sog-accent);font:inherit;font-size:var(--sog-size-s);font-weight:600;white-space:nowrap}
[data-module="fuel"] .fu-mchip::before{content:'';position:absolute;inset:-8px -2px}
[data-module="fuel"] .fu-mchip[aria-expanded="true"]{background:var(--sog-accent);color:var(--sog-surface)}
[data-module="fuel"]:has(> .fu-mpane:not([hidden])){position:relative} /* le volet dans la colonne de Carburant : la Carte à côté reste libre */
[data-module="fuel"] .fu-mpane{position:absolute;z-index:30;right:0;top:88px;width:min(420px,100%);max-height:calc(100vh - 128px);overflow:auto;margin:0;box-shadow:var(--sog-shadow)}
[data-module="fuel"] .fu-mpane[hidden]{display:none}
[data-module="fuel"] .fu-mhead{align-items:flex-start;justify-content:space-between;gap:8px}
[data-module="fuel"] .fu-mhead h2{margin:0;font-size:var(--sog-size-s)}
[data-module="fuel"] .fu-mx{flex:none;min-width:44px;min-height:44px;padding:0}
[data-module="fuel"] .fu-mpane h3{margin:.6em 0 .2em;font-size:var(--sog-size-s)}
[data-module="fuel"] .fu-mlist{margin:.2em 0;padding-left:1.1em}
@media (max-width:599px){[data-module="fuel"] .fu-mpane{position:fixed;left:0;right:0;top:auto;bottom:0;width:auto;max-height:70vh}} /* téléphone : le volet en bas de l'écran */
[data-module="fuel"] .fu-linkbtn{min-height:44px;padding:0 4px;border:0;border-radius:0;background:none;box-shadow:none;text-shadow:none;color:var(--sog-link);text-decoration:underline;font:inherit;cursor:pointer}
[data-module="fuel"] .fu-linkbtn:is(:hover,:focus,:active,:disabled){background:none;box-shadow:none;border:0}
[data-module="fuel"] .fu-pt{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
[data-module="fuel"] .fu-ptid{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
[data-module="fuel"] .fu-ptid small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-module="fuel"] .fu-doubtline{margin:.3em 0 0;color:var(--sog-warn)} /* la raison d'une approche en doute choisie (F139) */
[data-module="fuel"] .fu-ptid small.fu-ptlock{display:block;font-weight:600;white-space:normal} /* un point imposé par la mission (SOG-0193 L3) */
[data-module="fuel"] .fu-ptlock svg{width:1em;height:1em;vertical-align:-.15em;margin-right:.2em}
[data-module="fuel"] .f-card .fu-pt input[data-k]{width:4.2em;flex:none;text-align:center}
[data-module="fuel"] .fu-ptgap{width:4.2em;flex:none}
[data-module="fuel"] .fu-rwyprob .fu-rwyline{display:block} /* l'ATIS de chaque réseau, puis le METAR : une ligne chacun (SOG-0090) */
[data-module="fuel"] .fu-chartonly .fu-chartline{display:block} /* une approche « carte seulement » par ligne (SOG-0248) */
[data-module="fuel"] .fu-pt.fu-pthas{flex-wrap:wrap}
[data-module="fuel"] .fu-pt.fu-pthas > .fu-ptid{flex:1 1 0}
@media (max-width:420px){[data-module="fuel"] .f-card .fu-pt input[data-k="ptalt"]{width:3.4em}} /* un identifiant en coordonnées (11 caractères) tient à côté */
[data-module="fuel"] .fu-pt .fu-pthl{flex-basis:100%;order:9;display:flex;align-items:center;gap:.4em;white-space:nowrap;font-size:.95em}
[data-module="fuel"] .f-card .fu-pt .fu-pthl input.fu-pthold{width:3.6em;min-height:36px;text-align:center;flex:none}
[data-module="fuel"] .fu-ptid .fu-holdadd{align-self:flex-start;padding:2px 0;font-size:.9em} /* le temps sur zone d'un point (§ 1 bis) */
[data-module="fuel"] .fu-pt button{flex:none;min-width:44px;padding:0;display:inline-flex;align-items:center;justify-content:center}
[data-module="fuel"] .fu-addpt{flex-wrap:nowrap}
[data-module="fuel"] .fu-addpt input{flex:1;min-width:0}
[data-module="fuel"] .fu-addpt button{flex:none;min-width:44px}
[data-module="fuel"] .fu-isa{fill:none;stroke:var(--sog-muted);stroke-width:1.2;stroke-dasharray:5 4}
[data-module="fuel"] .fu-inv{fill:var(--sog-chart-4);opacity:.18}
[data-module="fuel"] .fu-now{stroke:var(--sog-chart-2);stroke-width:1.5;stroke-dasharray:5 3}
[data-module="fuel"] .fu-best{fill:var(--sog-chart-3)}
[data-module="fuel"] .fu-fast{fill:var(--sog-chart-4)}
[data-module="fuel"] .fu-planpt{fill:var(--sog-fg);stroke:var(--sog-surface);stroke-width:1.5}
[data-module="fuel"] .fu-legend .fu-dia{display:inline-block;width:9px;height:9px;margin-right:7px;background:var(--sog-fg);transform:rotate(45deg) scale(.85)}
[data-module="fuel"] .fu-legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}
[data-module="fuel"] .fu-legend .f-dot{margin-right:6px}
[data-module="fuel"] .fu-legend .fu-sq{border-radius:0}
/* barre de résultat compacte (module étroit : téléphone, volet de la vue double) : le contexte sur une ligne, le chiffre,
   puis trois tuiles sur une rangée, libellé et valeur chacun sur une ligne. Règles du module sur .f-bar et .f-tiles
   (primitives du cadre inchangées). */
[data-module="fuel"] .fu-result{display:block;padding:8px 12px}
[data-module="fuel"] .fu-result .fu-ctx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--sog-size-s)}
[data-module="fuel"] .fu-result .fu-acline{display:inline;padding:0;min-height:0;font:inherit;font-weight:600;vertical-align:baseline}
[data-module="fuel"] .fu-big{font-size:var(--sog-h1);font-weight:700;line-height:1.2}
@container (max-width: 759px){
  [data-module="fuel"] .fu-big{font-size:var(--sog-h2)}
}
[data-module="fuel"] .fu-result .f-tiles{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:4px 0 0}
[data-module="fuel"] .fu-result .f-tiles>*{padding:3px 8px;font-size:var(--sog-size-xs);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-module="fuel"] .fu-result .f-tiles b{font-size:var(--sog-h3);overflow:hidden;text-overflow:ellipsis}
[data-module="fuel"] .fu-links .f-item{display:block}
[data-module="fuel"] .fu-links small{display:block}
[data-module="fuel"] .fu-links .fu-off{opacity:.55}
[data-module="fuel"] .f-list .f-row{justify-content:flex-end}
[data-module="fuel"] .fu-wx{padding:8px 0;border-bottom:1px solid var(--sog-border)}
[data-module="fuel"] .fu-wx:last-child{border-bottom:0}`;

// ---------------------------------------------------------------- écran Devis
/** Redessine l'écran Devis en gardant le champ en cours de frappe et le défilement (renderPlanBody fait le dessin). */
function renderPlan() {
  // champ en cours de frappe (data-k, et data-i pour les niveaux des points) : valeur, focus et sélection rendus par
  // keepScroll du cadre (frame/lib/dom.js) — un rendu ne réécrit jamais ce que l'on tape
  keepScroll(S.body, renderPlanBody);
  mChipDraw(); // la puce suit la mission du vol, même écrite ailleurs (SOG-0193 L2)
}
/** Dessine l'écran Devis (champs une fois ; résultats redessinés par refresh). */
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
      <!-- SOG-0131 (a) : l'aéronef en premier (rien ne se calcule sans lui) -->
      <div data-block="aircraft">
      <div class="f-row" data-acsel></div>
      <div class="fu-hide" data-acpanel>
        <label class="f-field"><input type="search" data-k="acsearch" placeholder="${esc(tt(TX.acSearch))}" aria-label="${esc(tt(TX.acSearch))}" autocomplete="off"></label>
        <div class="f-list" data-acres></div>
      </div>
      <p class="f-muted" data-src></p>
      </div>
      <div class="f-grid fu-ads">${[['dep', TX.dep], ['arr', TX.arr], ['altn', TX.altn]].map(([k, label]) => `${k === 'arr' ? `<button type="button" class="fu-adswap" data-do="adswap" title="${esc(tt(TX.adSwap))}" aria-label="${esc(tt(TX.adSwap))}">⇄</button>` : ''}<label class="f-field">${esc(tt(label))}<input data-k="${k}" value="${esc(r[k] ?? '')}" class="fu-code" autocapitalize="characters" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="fu-adsug"><small class="fu-adname" data-adline="${k}"></small></label>`).join('')}<div class="fu-sug" id="fu-adsug" data-adsug role="listbox" aria-label="${esc(tt(S.AD.texts.listLabel))}" hidden></div></div>
      <div class="fu-altnchk" data-altnchk aria-live="polite"></div>
      <div class="f-grid fu-flight"><label class="f-field">${esc(tt(TX.level))}<span class="fu-when"><input data-k="fl" value="${esc(f.level?.ft ? Math.round(f.level.ft / 100) : '')}" inputmode="numeric"><button type="button" data-do="levelauto" aria-pressed="${!!f.level?.auto}" title="${esc(tt(TX.levelAutoHint))}">${esc(tt(TX.levelAuto))}</button></span><small class="f-muted" data-lvlauto></small></label><p class="f-muted fu-lvlmix" data-lvlmix hidden></p><label class="f-field" title="${esc(tt(TX.wxDateHint))}">${esc(wxDateParts()[0])}<span class="fu-when"><input data-k="wxdate" type="datetime-local" value="${esc(whenField(f.planned_at))}"><button type="button" data-do="when30" aria-label="${esc(tt(TX.when30))}" title="${esc(tt(TX.when30))}">${svg('clock')}<b>+30</b></button><button type="button" data-do="whennow" aria-label="${esc(tt(TX.whenNowLong))}" title="${esc(tt(TX.whenNowLong))}">${esc(tt(TX.whenNow))}</button></span><small class="f-muted" data-datenote>${esc(wxDateParts()[1])}</small></label></div>
      <div class="fu-lvlwhy" data-lvlwhy hidden><p class="f-muted" data-lvlmain></p><details class="fu-altnfold" data-lvlfold hidden><summary class="f-muted">${esc(tt(TX.levelAutoWhyFold))}</summary><p class="f-muted" data-lvlreason></p></details></div>
      <p class="f-warn" data-pastdate hidden></p>
      <div class="f-grid fu-themes" data-themes></div>
    </div>`)}
  ${sec(1, `<div class="f-card" data-block="route"><h2>${esc(tt(TX.route))}</h2>
      <div class="fu-rrow"><label class="f-field">${esc(tt(TX.routeText))}<textarea data-k="rtext" rows="3" autocapitalize="characters" spellcheck="false" aria-autocomplete="list" aria-expanded="false" aria-controls="fu-rtsug">${esc(r.text || '')}</textarea><div class="fu-sug" id="fu-rtsug" data-rtsug role="listbox" aria-label="${esc(tt(S.RC.texts.listLabel))}" hidden></div></label><button type="button" data-do="rauto" title="${esc(tt(TX.rautoHint))}" aria-label="${esc(tt(TX.rautoHint))}">${esc(tt(TX.rauto))}</button></div>
      <p class="fu-natline" data-natline hidden></p><div class="f-row fu-reng" data-reng${S.routeEngine ? '' : ' hidden'}><button type="button" data-do="rcompute">${esc(tt(TX.rCompute))}</button><button type="button" data-do="rcheck">${esc(tt(TX.rCheck))}</button></div><p class="f-muted" data-rvia hidden></p><p class="f-muted" data-rengnone${S.routeEngine === false ? '' : ' hidden'}>${esc(tt(TX.rNeedLauncher))}</p>
      <div data-routealts></div><p class="f-row f-warn fu-rage" data-rstale hidden><span data-rstaletext></span><button type="button" class="fu-linkbtn" data-do="rcompute">${esc(tt(TX.rRecompute))}</button></p><p class="f-muted" data-rtime hidden aria-live="polite"></p>
      <p class="f-warn" data-unres></p>
      <p class="f-warn" data-rwarn></p>
      <p class="f-muted" data-natwarn hidden></p><p class="f-muted" data-awywarn hidden></p>
      <p class="f-warn" data-rhumb hidden></p>
      <div data-zonegaps></div>
      <p class="f-row fu-rinfo"><span class="f-muted" data-rinfo></span><button type="button" class="fu-linkbtn" data-do="rmanual">${esc(tt(TX.rmanual))}</button></p>
      <div class="f-grid fu-g3 fu-hide" data-rmanual>${fld('dist', TX.distance, distField(r.distanceNm), 'inputmode="decimal"', { u: distLabel() })}${fld('trk', TX.track, r.trackDeg != null ? Math.round(r.trackDeg) : '', 'inputmode="numeric"')}</div>
      <details data-fold="pts"><summary data-ptsn>${esc(tt(TX.ptsN, { n: (r.points || []).length }))}</summary>
      <div class="f-list fu-pts" data-pts></div>
      <div class="f-row fu-addpt"><input data-k="addpt" autocapitalize="characters" autocomplete="off" placeholder="${esc(tt(TX.addPt))}" aria-label="${esc(tt(TX.addPt))}"><button type="button" data-do="addpt" aria-label="${esc(tt(TX.add))}">${svg('plus')}</button></div>
      <p class="f-muted">${esc(tt(TX.ptsHint))}</p></details>
      <div data-fpl></div>
      <div class="f-row">${S.ctx.identity.simbrief ? `<button type="button" data-do="simbrief">${esc(tt(TX.simbrief))}</button>` : `<span class="f-muted">${esc(tt(TX.noSimbrief))}</span>`}<button type="button" data-do="showmap"${S.ctx.layout?.with === 'maps' ? ' class="fu-hide"' : ''}>${svg('map')} ${esc(tt(TX.showMap))}</button></div>
    </div>
    <div class="f-card" data-block="procrows"><h2>${esc(tt(TX.procTitle))}</h2><div class="fu-procbox" data-procbox="route"></div></div>`)}
  ${sec(2, `<div class="f-card" data-block="level"><h2>${esc(tt(TX.stepNames[2]))}</h2>
      <div class="f-grid fu-g3 fu-pairs">${fld('wdir', TX.windDir, f.wind?.dirDeg ?? '', 'inputmode="numeric"')}${fld('wkt', TX.windKt, speedField(f.wind?.speedKt), 'inputmode="numeric"', { u: speedLabel() })}${fld('isa', TX.isa, f.isaDev || '', 'inputmode="numeric"')}</div>
      <p class="f-muted" data-windsrc></p>
      <div class="f-row" data-isahint></div>
      <label class="f-check"><input type="checkbox" data-k="wxreal"${f.weather?.real ? ' checked' : ''}>${esc(tt(TX.wxReal))}</label>
      <div class="f-row"><button type="button" data-do="wx">${esc(tt(TX.wxRead))}</button></div>
    </div>
  <div class="f-card"><h2>${esc(tt(TX.wxTitle))}</h2><div data-wx></div></div>
  <div class="f-card"><h2>${esc(tt(TX.aloftTitle))}</h2><div data-aloft></div></div>`)}
  ${sec(3, `<details class="f-card" data-fold="settings"><summary data-settingssum>${esc(`${tt(TX.settings)} · ${S.settings.displayUnit || 'kg'}/h`)}</summary>
    <div class="f-grid fu-g3 fu-pairs">${fld('taxiMin', TX.taxiMin, S.settings.taxiMin, 'inputmode="numeric"')}${fld('reserveMin', TX.reserveMin, S.settings.reserveMin, 'inputmode="numeric"')}${fld('contPct', TX.contPct, S.settings.contingencyPct, 'inputmode="decimal"')}${fld('wxRadius', TX.wxRadius, S.settings.wxRadiusNm ?? 10, 'inputmode="numeric"')}
    </div>
    <p class="f-muted" style="margin:8px 0 4px">${esc(tt(TX.units))}</p>
    <div class="f-grid fu-g3 fu-pairs" data-units>
      <label class="f-field">${esc(tt(TX.unitFuel))}<select data-k="unit">${['kg', 'lb'].map(u => opt(u, u, (S.settings.displayUnit || 'kg') === u)).join('')}</select></label>
      ${[['speed', TX.unitSpeed, 'unitSpeed'], ['alt', TX.unitAlt, 'unitAlt'], ['dist', TX.unitDist, 'unitDist']].map(([kind, row, k]) => `<label class="f-field">${esc(tt(row))}<select data-k="${k}">${UNITS[kind].list.map(u => opt(u, UNITS[kind].label[u], unitOf(kind) === u)).join('')}</select></label>`).join('')}</div>
    <div class="fu-pairs" data-entrybox></div>
  </details>
  <details class="f-card" data-fold="da"><summary>${esc(tt(TX.da))}</summary><div data-da></div></details>
  <div class="f-card" data-block="decision"><h2>${esc(tt(TX.decision))}</h2><div data-dec></div>      <div class="f-grid fu-g3"><label class="f-field">${esc(tt(TX.goal))}<select data-k="goal">${window.FuelLevels.GOALS.map(g => opt(g, tt(TX.goals[g]), (S.settings.goal || 'prof') === g)).join('')}</select></label></div>
      <div class="f-grid fu-g3 ${(S.settings.goal || 'prof') === 'man' ? '' : 'fu-hide'}" data-manbox>${fld('mias', TX.manIas, speedField(S.manualIn?.ias), 'inputmode="numeric"', { u: speedLabel() })}${fld('mvs', TX.manVs, vsField(S.manualIn?.vs), 'inputmode="numeric"', { u: vsLabel() })}</div>
</div>
  <details class="f-card" data-fold="openin"><summary>${esc(tt(TX.openIn))}</summary><p class="f-muted">${esc(tt(TX.openInHint))}</p><div class="f-list fu-links" data-openin></div></details>
  <details class="f-card" data-fold="details"><summary>${esc(tt(TX.details))}</summary><div data-details></div></details>
  <details class="f-card" data-fold="climb"><summary>${esc(tt(TX.climbGuide))}</summary><div data-climb></div></details>
`)}
  ${sec(4, `<div class="f-card" data-block="summary"><h2>${esc(tt(TX.stepNames[4]))}</h2><div data-sum></div>
      <div class="f-row" data-startrow></div>
      <p class="fu-startnote" data-startnote aria-live="polite"></p>
      <p class="f-muted">${esc(tt(TX.startHint))}</p>
      <div class="fu-send" data-send hidden aria-live="polite"></div></div>
    <div class="f-card" data-block="direct" hidden><h2>${esc(tt(TX.directTitle))}</h2><div class="f-row fu-directrow"><label class="f-field">${esc(tt(TX.directField))}<input data-k="direct" list="fu-directlist" autocapitalize="characters" spellcheck="false" autocomplete="off" maxlength="11"></label><button type="button" data-do="directprep">${esc(tt(TX.directPrep))}</button></div><datalist id="fu-directlist"></datalist><div data-directpanel aria-live="polite"></div></div>
    <div class="f-card" data-block="aids"><h2>${esc(tt(TX.aidsTitle))}</h2><div data-aids></div></div>
    <div class="f-card fu-hide" data-block="procs"><h2>${esc(tt(TX.procTitle))}</h2><div class="fu-procbox" data-procbox="start"></div></div>
    <div class="f-card fu-hide" data-progcard><h2>${esc(tt(TX.progTitle))}</h2><div data-prog></div><p class="f-muted">${esc(tt(TX.progHint))}</p></div>
    <div class="f-card" data-block="fms"><h2>${esc(tt(TX.fmsTitle))}</h2><p class="f-muted">${esc(tt(TX.fmsHint))}</p><div class="f-row">${[['xp11', TX.fmsXp11], ['xp10', TX.fmsXp10], ['pln', TX.fmsPln]].map(([k, t]) => `<button type="button" data-do="fms" data-fms="${k}" disabled>${esc(tt(t))}</button>`).join('')}</div></div>`, true)}
  <div class="f-bar fu-result" data-block="result" aria-live="polite"></div>`;
  for (const d of S.body.querySelectorAll('details[data-fold]')) {
    // SOG-0222 (« « points » fermé par défaut. c'était le cas « avant » ») : la liste des points n'est pas mémorisée — fermée à chaque
    // ouverture ; les autres plis gardent leur état sur l'appareil (depuis f917841cd, 23/10, ils l'étaient tous)
    const kept = d.dataset.fold !== 'pts';
    d.open = kept && !!S.ui.open?.[d.dataset.fold];
    d.ontoggle = () => {
      if (!kept) return;
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
    if (S.AD.onKey(e) || S.RC.onKey(e)) return; // liste de terrains ou de route ouverte : ↑ ↓ Entrée Échap sont à elle
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
  rhumbWarn(S.flight.route); // Q-0019 : la ligne des directs trop longs au compas, dès le dessin
  renderRinfo();
  S.body.onclick = e => S.AD.onClick(e) || S.RC.onClick(e) || onPlanClick(e);
  S.AD.paint();
  S.P.reset(); // le corps est neuf : refresh dessine la carte des procédures
  refresh();
  renderWx();
  renderAloft();
  windSourceLine();
  // météo lue une fois par montage quand l'appareil est en ligne et la route a ses terrains
  if (!S.wxTried && wxIds().length) { // hors ligne aussi : la couche répond de sa réserve
    S.wxTried = true;
    wxFetch(false);
  }
  themesDraw();
  // les itinéraires proposés redessinés avec le corps (SOG-0134, refus du 10 nov. : « ça fait disparaître leur version texte à
  // gauche » — le corps redessiné, après un choix ou un vol relu, laissait leur boîte vide)
  if (S.ralts) routeAltsDraw();
}
/** Champ changé dans Devis : vol courant ou réglages mis à jour, route relue si elle change, résultats redessinés. */
function onPlanInput(e) {
  const k = e.target.dataset?.k,
    v = e.target.value,
    f = S.flight;
  if (!k) return;
  if (e.type === 'input' && e.target.tagName === 'SELECT') return;
  if (k.startsWith('p-') && !S.flightPending) return S.P.choose(k, v); // piste, SID, STAR, approche (§ 10.20)
  // vol courant pas encore lu : l'écran est inerte (refresh), un champ changé quand même (saisie programmée, remplissage
  // automatique) n'écrit pas dans le vol d'attente — completeMount le remplace par le vol lu, et le niveau, le départ ou
  // l'appareil tapés là disparaîtraient en laissant un devis « 0 ft » ; le dernier état lu gagne, les champs sont redessinés
  if (S.flightPending) return;
  const r = f.route ||= emptyFlight().route;
  if (k === 'theme' || k === 'series') return themeSet(k, v);
  if (k === 'direct') return; // SOG-0088 : le champ du direct ne touche pas le vol (« Préparer le direct » le lit)
  if (k === 'directresume') return S.direct && directPrepare(S.direct.to, null, +v); // le point où la route reprend
  switch (k) {
    case 'acsearch':
      return acResults(v);
    case 'dep':
    case 'arr':
    case 'altn': {
      // le champ est une saisie de recherche (« orly », « toulouse ») : la route ne prend qu'un champ vidé, un choix de la liste, ou
      // un code complet qu'aerodb connaît (V3 § 10.27, décision du 29/10 ; quatre signes, ou « LF418 » d'une hélistation depuis
      // SOG-0465 : S.AD.isCode) ; un nom tapé n'y entre jamais
      const code = v.trim().toUpperCase(),
        s = S;
      S.AD.onInput(e); // la ligne du nom et la liste des terrains proposés
      if (!code) return; // vidé pour chercher : rien n'est écrit tant que le champ a le focus (revertAd l'écrit vide en le quittant)
      if (!S.AD.isPicking()) {
        // un code de quatre caractères n'entre qu'une fois connu d'aerodb (et si le champ le porte encore) ; un texte de recherche
        // n'écrit rien
        if (S.AD.isCode(code)) S.AD.known(code).then(ok => {
          const el = !gone(s) && S.body?.querySelector(`[data-k="${k}"]`);
          if (!ok || !el || el.value.trim().toUpperCase() !== code) return;
          setAd(k, code);
          saveFlight();
          refresh();
        });
        return;
      }
      setAd(k, code);
      break;
    }
    case 'rtext':
      if (e.type === 'input') r.typed = typedNames(r, r.text, v); // SOG-0517 : les passages que le pilote tape
      r.text = v;
      if (e.type === 'input') r.from = 'route';
      markEnds(); // la route écrite l'est pour les terrains du moment
      resolveRoute(e.type === 'change'); // pendant la frappe : points relus ; à la sortie : texte normalisé
      if (e.type === 'change') textToProcs(); // à la sortie : les noms de SID et de STAR du texte posent ou retirent le choix (§ 10.31)
      else S.RC.onInput(e); // pendant la frappe : la complétion au curseur (§ 10.31)
      break;
    case 'addpt':
      return; // ajouté par « Ajouter » ou Entrée
    case 'fplid': // SOG-0402 : l'identifiant du message, le temps de la page seulement (rien de personnel n'est gardé)
      S.fplId = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
      fplDraw(S.C, true);
      return;
    case 'pcon': { // un niveau imposé sur un point de procédure (SOG-0003), posé à la sortie du champ
      if (e.type !== 'change') return;
      return setConstraint(e.target);
    }
    case 'pthold': { // le temps sur zone d'un point (§ 1 bis) : les minutes comptées ; vide, plus rien
      const p = r.points?.[+e.target.dataset.i];
      if (!p || e.type !== 'change') return;
      setHold(r, p.id, num(v));
      saveFlight();
      renderPts();
      return refresh();
    }
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
      autoStop(); // SOG-0529 : un niveau saisi arrête la recherche de « Auto » ; il n'est jamais remplacé
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
      setPlanned(whenToIso(v));
      whenChanged();
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
      if (S.altnProp && !S.altnProp.pending) altnDocWrite(); // SOG-0549 : la Carte dit la même unité que Carburant
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
      // saisi dans l'unité du devis (SOG-0059), gardé en kg/h (la clé de toujours) : la conversion est celle du cadre
      const kg = num(v) ? FU.toKg(num(v), fuelUnitOf(S.C?.sheet?.unit)) : null;
      kg > 0 ? S.settings.entries[id] = Math.round(kg * 1000) / 1000 : delete S.settings.entries[id];
      saveSettings();
      return refresh();
    }
  }
  saveFlight();
  refresh();
}
/** Écrit un terrain de l'étape Vol (dep, arr, altn) dans la route : départ changé d'un vol démarré = autre vol, arrivée changée =
 *  déroutement ; le texte de la route suit, puis la route est relue et la météo demandée. code : quatre caractères connus d'aerodb, un
 *  choix de la liste, un code tapé exprès (revertAd), ou '' (champ quitté vide). */
function setAd(k, code) {
  const f = S.flight,
    r = f.route ||= emptyFlight().route,
    was = r[k];
  r[k] = code;
  // vol démarré : un autre départ, c'est un autre vol ; une autre arrivée, un déroutement (gardé et noté)
  if (f.started?.at && was && r[k] !== was) {
    if (k === 'dep') f.started = null; // null et non delete : l'écriture fusionne avec le vol gardé
    else if (k === 'arr') f.started = {
      ...f.started,
      diverted: true
    };
  }
  if (k !== 'altn' && was && r[k] !== was && (r.text || r.points?.length)) {
    // un nouveau couple de terrains (les deux bouts changés depuis l'écriture de la route, ou un terrain à plus de NEW_PAIR_NM de
    // l'ancien) : rien de l'ancien vol ne survit (route, procédures, OFP) ; en deçà, le terrain remplacé dans le texte (ci-dessous)
    const other = k === 'dep' ? 'arr' : 'dep',
      old = (r.points || []).find(p => p.id === was && Number.isFinite(+p.lat)),
      s = S;
    if (S.routeEnds?.[other] && r[other] && r[other] !== S.routeEnds[other]) return newPair();
    if (old && S.ctx.aerodb?.coords) Promise.resolve(S.ctx.aerodb.coords(code)).then(c => {
      if (!gone(s) && S.flight.route === r && r[k] === code && c && Number.isFinite(+c.lat) && gcNm(old, c) > NEW_PAIR_NM)
        newPair();
    }).catch(() => {});
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
  } else if (r[k] !== was) scheduleWx(); // SOG-0205 : le dégagement saisi est pris tout de suite : sa météo relue (l'étape Météo le montre)
}
/** ⇄ (SOG-0127, comme RouteSim) : le départ et l'arrivée échangés. Les deux bouts changent : c'est un nouveau couple (newPair : la route,
 *  les procédures et l'OFP de l'aller sont effacés, jamais relus à rebours : les voies, la SID et la STAR ne se lisent pas dans l'autre
 *  sens) ; un vol démarré devient un autre vol. Sans terrain, rien. */
function swapAds() {
  const f = S.flight,
    r = f.route ||= emptyFlight().route,
    dep = r.dep || '',
    arr = r.arr || '';
  if (!dep && !arr) return;
  if (f.started?.at) f.started = null; // un autre départ : un autre vol (null et non delete, comme setAd)
  r.dep = arr;
  r.arr = dep;
  for (const k of ['dep', 'arr']) {
    const el = S.body?.querySelector(`input[data-k="${k}"]`);
    if (el) el.value = r[k];
  }
  S.AD?.paint();
  if (r.text || r.points?.length) return newPair();
  markEnds();
  saveFlight();
  refresh();
  resolveRoute();
  scheduleWx();
}
// ---------------------------------------------------------------- nouveau vol, nouveau couple de terrains
const NEW_PAIR_NM = 150; // au-delà, un terrain changé fait un autre vol (Simplification, 1er nov. 2026)

/** Le couple de terrains pour lequel la route est écrite (départ, arrivée) : posé quand le vol est lu, repris d'ailleurs, écrit
 *  dans le champ de route, ou remis à neuf ; un changement de terrain proche ne le change pas. */
function markEnds() {
  const r = S.flight.route || {};
  S.routeEnds = {
    dep: r.dep || '',
    arr: r.arr || ''
  };
}
/** Un nouveau couple de terrains : la route (texte, points, distance, voies d'Auto), les procédures et l'OFP de l'ancien vol effacés,
 *  dit en une ligne ; le reste du vol (appareil, niveau, date) gardé. */
function newPair() {
  altsClear(); // un nouveau couple : les itinéraires de l'ancien ne se dessinent plus (INTEGRATION § 3 bis)
  const f = S.flight,
    r = f.route;
  Object.assign(r, {
    text: '',
    points: [],
    distanceNm: null,
    trackDeg: null,
    manual: false,
    from: 'route'
  });
  delete r.procedures;
  delete r.auto;
  delete r.constraints;
  f.ofp = null;
  S.ofp = null;
  S.procs = null;
  markEnds();
  const ta = S.body?.querySelector('[data-k="rtext"]');
  if (ta) ta.value = '';
  S.ctx.notify(tt(TX.newPair, {
    dep: r.dep || '?',
    arr: r.arr || '?'
  }), 'ok');
  saveFlight();
  renderPlan();
  resolveRoute();
  scheduleWx();
}
/** « Nouveau vol » : après la question (si le vol est démarré ou porte déjà quelque chose), le vol courant remis à vide — départ,
 *  arrivée, route, procédures, niveau, OFP, devis, départ et mission — ; l'appareil reste (un choix de l'appareil, pas du vol). */
/** Le bouton « Nouveau vol » de l'en-tête (hors du corps inerte pendant la lecture du vol) : occupé, il dit l'attente (SOG-0194). */
function newBusy(on) {
  const b = S?.body?.parentElement?.querySelector('[data-do="newflight"]');
  if (!b) return;
  if (on && !b.dataset.label) b.dataset.label = b.textContent;
  b.disabled = !!on;
  b.toggleAttribute('aria-busy', !!on);
  b.textContent = on ? tt(TX.newWaiting) : b.dataset.label || tt(TX.newFlight);
  if (!on) delete b.dataset.label;
}
async function newFlight() {
  const s = S,
    f = S.flight,
    r = f.route || {},
    started = !!f.started?.at;
  // SOG-0194 : pendant la lecture du vol courant, l'appui n'est pas perdu : le bouton dit l'attente et flightReady fait le geste dès
  // que le vol est lu (la question posée à ce moment, une seule fois)
  if (S.flightPending) {
    S.newAsked = true;
    return newBusy(true);
  }
  newBusy(false);
  if ((started || r.text || r.dep || r.arr || r.points?.length || f.level?.ft || f.mission) && !(await S.ctx.ask(tt(started ? TX
      .newFlightStarted : TX.newFlightAsk)))) return;
  if (gone(s)) return;
  S.flight = {
    ...f,
    ...emptyFlight(),
    aircraft: f.aircraft || {},
    isaDev: f.isaDev ?? 0,
    started: null,
    progress: null,
    quote: null,
    profile: null,
    weather: null,
    windSource: null,
    mission: null,
    missionCategory: '',
    theme: '',
    series: ''
  };
  S.ofp = null;
  S.procs = null;
  S.step = 0;
  // SOG-0194 : rien de l'ancien vol ne reste à l'écran ni pour la Carte — la météo lue et les vents (le ✓ de l'étape Météo), les
  // itinéraires proposés (route_alts.json vidé : la Carte ne les dessine plus), le contrôle de la route, les points non reconnus
  S.wx = null;
  S.aloft = null;
  altsClear();
  S.ralts = null;
  S.rcheck = null;
  S.unres = null;
  markEnds();
  mChipDraw(); // la mission déliée : plus de puce, le volet fermé
  S.ctx.notify(tt(TX.newFlightDone), 'ok');
  saveFlight();
  if (S.view === 'plan') renderPlan();
  else show('plan');
}
/** Champ de terrain quitté sans choix (hits : terrains proposés pour son texte) : un code de quatre caractères qu'aerodb ne connaît pas
 *  et qui ne proposait rien est un terrain tapé exprès (absent de la base) : il est écrit ; un texte de recherche (« toulouse »,
 *  « orly » quand il proposait des terrains) fait revenir le champ au code enregistré ; un code connu ou encore vérifié reste (setAd
 *  l'écrit). */
function revertAd(el, hits = 0) {
  const k = el?.dataset?.k;
  if (!S || !['dep', 'arr', 'altn'].includes(k)) return;
  const v = el.value.trim().toUpperCase(),
    saved = S.flight?.route?.[k] || '';
  if (v === saved) return;
  if (!v) { // quitté vide : le terrain est retiré (un dégagement qu'on ne veut plus, par exemple)
    setAd(k, '');
    saveFlight();
    return refresh();
  }
  const code = S.AD.isCode(v), // quatre signes, ou le code de liste d'une hélistation (SOG-0465)
    n = code ? S.AD.nameKnown(v) : null;
  if (code && n !== null) return; // connu (ou en cours) : la saisie l'a écrit, ou l'écrira
  if (code && !hits) {
    el.value = v;
    setAd(k, v);
    saveFlight();
    return refresh();
  }
  el.value = saved;
  S.AD.paint();
}
/** Clic dans Devis : SimBrief, niveau pris sur la courbe ou par un bouton. */
function onPlanClick(e) {
  const st = e.target.closest('[data-step]');
  if (st) return goStep(+st.dataset.step);
  if (e.target.closest('[data-do="showmap"]')) return showMap();
  const pf = e.target.closest('[data-do="procfetch"]');
  if (pf) { // « Lire » et « Relire » : un seul geste ; SOG-0325
    const k = String(pf.dataset.icao || '').toUpperCase(),
      altn = () => k === String(S.flight.route?.altn || '').toUpperCase().trim(),
      run = Promise.resolve(S.P.read(k));
    if (altn()) altnChkDraw(S.C); // SOG-0527 (1) : le geste sous le dégagement dit aussitôt sa lecture en cours
    return run.then(() => {
      // la couverture du dégagement relue : son critère Moyens se refait sur ce qui vient d'être lu
      if (S && altn()) {
        S.altnData = null;
        altnChkDraw(S.C);
      }
      routeReadDone(k); // SOG-0548 : la ligne d'un raccord faute de procédure suit la lecture ; la liste périmée si elle l'a apportée
      return arrInfoKeep();
    });
  }
  const ho = e.target.closest('[data-do="holdopen"]');
  if (ho) { // le temps sur zone d'un point sans temps : « ⏱ + » ouvre sa ligne, le champ prêt à la frappe
    (S.holdOpen ||= new Set()).add(String(ho.dataset.id || '').toUpperCase());
    renderPts();
    return S.body?.querySelector(`[data-k="pthold"][data-i="${CSS.escape(String(ho.dataset.i))}"]`)?.focus();
  }
  const rp = e.target.closest('[data-do="rwyprob"]');
  if (rp) return S.P.choose(`p-${rp.dataset.side}-rwy`, rp.dataset.rwy); // SOG-0090 : « Prendre la piste probable », un geste du pilote
  const pl = e.target.closest('[data-do="proclnm"]');
  if (pl) return S.P.readLnm(pl.dataset.icao); // « Lire depuis Little Navmap » (SOG-0210)
  const uk = e.target.closest('[data-do="procukpkg"]');
  if (uk) return S.P.readUk(uk.dataset.icao); // SOG-0374 : « Lire les départs dans le paquet du Royaume-Uni »
  const gr = e.target.closest('[data-do="groundretry"]');
  if (gr) return S.P.groundRetry(gr.dataset.icao); // « Réessayer » : le sol seul (SOG-0135)
  // « Sur la carte » : le mode choix de la Carte pour ce côté (§ 10.23) ; elle revient par location.replace avec son choix
  const om = e.target.closest('[data-do="onmap"]');
  if (om) {
    // SOG-0306 : la Carte dit le vent de face et de travers de chaque piste depuis le METAR que la couche météo du cadre a GARDÉ (elle
    // ne demande rien au réseau) ; s'il n'est pas encore là (la lecture du montage a échoué ou n'est pas finie), il est lu ici d'abord,
    // trois secondes au plus, puis la Carte s'ouvre — avec ou sans lui
    const icao = om.dataset.icao,
      go = () => {
        if (S) location.hash = `#maps?choose=${om.dataset.side}&icao=${encodeURIComponent(icao)}`;
      };
    if (S.wx?.metar?.[icao] || S.ctx.net?.online?.() === false || !S.ctx.weather?.metar) return go();
    om.disabled = true;
    Promise.race([Promise.resolve().then(() => S.ctx.weather.metar([icao])).catch(() => null), new Promise(r => setTimeout(r, 3000))])
      .finally(go);
    return;
  }
  // une tape sur la ligne de résumé d'un côté (ou son bouton ▸) le déplie (§ 10.31) ; les autres boutons de la ligne gardent leur geste
  const pch = e.target.closest('[data-do="procchange"]');
  if (pch) return S.P.change(pch.dataset.side, pch.dataset.row); // SOG-0308 : la liste de CETTE ligne, à sa place
  const pfold = e.target.closest('[data-do="procfold"]');
  if (pfold && (pfold.matches('button') || !e.target.closest('button, a'))) return S.P.fold(pfold.dataset.side);
  const fm = e.target.closest('[data-do="fms"]');
  if (fm) return fm.disabled ? undefined : exportFms(fm.dataset.fms);
  if (e.target.closest('[data-do="sendflight"]')) return sendFlight();
  if (e.target.closest('[data-do="directprep"]')) return directPrepare(S.body.querySelector('[data-k="direct"]')?.value); // SOG-0088
  if (e.target.closest('[data-do="directapply"]')) return directApply();
  if (e.target.closest('[data-do="directcancel"]')) {
    S.direct = null;
    return directDraw();
  }
  if (e.target.closest('[data-do="directundo"]')) return directUndo();
  if (e.target.closest('[data-do="start"]')) return startFlight();
  if (e.target.closest('[data-do="cancelstart"]')) return cancelStart();
  const iu = e.target.closest('[data-do="isause"]');
  if (iu) return useIsa(iu.dataset.v != null ? +iu.dataset.v : undefined);
  if (e.target.closest('[data-do="rauto"]')) return autoAirways();
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
  if (e.target.closest('[data-do="acgo"]')) return acGo();
  if (e.target.closest('[data-do="rtimecopy"]')) return routeTimingCopy(); // SOG-0134
  if (e.target.closest('[data-do="rclose"]')) return proposalsEnd(); // SOG-0224 : « Fermer les propositions »
  if (e.target.closest('[data-do="rreview"]')) return reviewOpen(); // SOG-0545 : « Revoir les propositions »
  if (e.target.closest('[data-do="rgolevel"]')) return goLevel(); // SOG-0389 (b) : « Donner le niveau »
  const limits = e.target.closest('details[data-rlimits] > summary');
  if (limits) radListFill(limits.parentElement); // SOG-0401 : le détail du RAD, écrit à l'ouverture du pli
  if (e.target.closest('[data-do="fplcopy"]')) return fplCopy(); // SOG-0402 : « Copier pour Eurocontrol »
  const gf = e.target.closest('[data-do="rgofl"]');
  if (gf) return recomputeAt(+gf.dataset.fl); // SOG-0391 (b bis) : « Recalculer à FLxxx »
  const rb = e.target.closest('[data-do="rcompute"],[data-do="rcheck"],[data-do="rtake"]');
  if (rb) return rb.dataset.do === 'rtake' ? routeTake(+rb.dataset.i) : routeAsk(rb.dataset.do === 'rcompute' ? 'compute' : 'check');
  const ar = e.target.closest('[data-altlist] [data-alt]');
  if (ar && !e.target.closest('summary, a, button, input')) return altsShow(+ar.dataset.alt);
  if (e.target.closest('[data-do="natread"]')) return natRead(); // SOG-0352
  if (e.target.closest('[data-do="natreread"]')) return natRead(true); // SOG-0413 : relire, même des routes valides
  if (e.target.closest('[data-do="when30"]')) return setWhen(30);
  if (e.target.closest('[data-do="whennow"]')) return setWhen(0);
  const wb = e.target.closest('[data-do="wx"]');
  if (wb) // « Lire la météo » relit aussi l'ATIS (SOG-0090) ; puis les données d'arrivée gardées dans le vol (SOG-0325 : un geste)
    return Promise.all([atisRead(true), wxRead(wb)]).then(() => arrInfoKeep());
  const b = e.target.closest('[data-do]'),
    pick = e.target.closest('[data-pick]');
  if (b?.dataset.do === 'simbrief') return loadSimbrief();
  if (b?.dataset.do === 'level') return setLevel(+b.dataset.ft);
  if (b?.dataset.do === 'levelauto') return levelAutoOn();
  if (b?.dataset.do === 'adswap') return swapAds();
  // SOG-0398 lot 2 : « Proposer un dégagement », « Prendre »
  if (b?.dataset.do === 'altnpropose') return altnProposeRun();
  if (b?.dataset.do === 'altntake') return altnTake(String(b.dataset.icao || ''));
  if (b?.dataset.do === 'alignlvl') return alignLevels();
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
  return [...new Set([r.dep, ...corr, r.arr, r.altn].map(x => String(x || '').toUpperCase()).filter(x => isIcaoAlpha(x)))];
};
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
        if (isIcaoAlpha(id) && Number.isFinite(+ad.lat) && Number.isFinite(+ad.lon)) seen.set(id, ad);
      }
    }
    for (const [id, ad] of seen) {
      if (id === r.dep || id === r.arr) continue;
      const pos = PG.alongRoute(pts, { // SOG-0243 : sur la loxodromie de chaque tronçon
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
/** Relit la météo un peu après un changement de terrain, si elle a déjà été lue ou si la météo réelle est cochée (avant toute lecture,
 *  la lecture d'ouverture — S.wxTried, retentée à chaque dessin jusqu'à ce que la route ait ses terrains — s'en charge ; SOG-0527 (2) :
 *  sans cette garde, l'ouverture d'un vol lisait deux fois et gênait les travaux du lanceur). */
function scheduleWx() {
  clearTimeout(S.wxTimer);
  if (!S.wx && !S.flight.weather?.real) return;
  S.wxTimer = setTimeout(() => wxFetch(false), 1200);
}
/** SOG-0527 (2) : après un dessin ou une lecture, un temps calme puis wxAuto (ce qui MANQUE ou a VIEILLI, une fois par heure) ; un appel
 *  déjà prévu est gardé — les dessins rapprochés ne le repoussent jamais (F133). */
function wxAutoSoon() {
  if (S.wxAutoTimer) return;
  const s = S;
  S.wxAutoTimer = setTimeout(() => {
    s.wxAutoTimer = null;
    if (!gone(s)) wxAuto();
  }, 1200);
}
/** SOG-0527 (2) : ce qui MANQUE ou a VIEILLI pour le départ, l'arrivée et le dégagement du vol : [{ id, kind: 'metar' | 'taf' }] — un
 *  METAR absent ou de plus de WX_METAR_OLD_S ; un TAF absent ou ancien (valide depuis plus de WX_TAF_OLD_S) quand le vol a une date (un TAF
 *  ne sert qu'à une heure donnée). Terrains au code OACI seulement. */
function wxNeeds() {
  const r = S.flight.route || {},
    now = Date.now() / 1000,
    dated = wxWhen() != null,
    out = [];
  for (const id of [...new Set([r.dep, r.arr, r.altn].map(x => String(x || '').toUpperCase().trim()).filter(isIcaoAlpha))]) {
    const m = S.wx?.metar?.[id],
      t = S.wx?.taf?.[id];
    if (!m || !(now - +m.obsTime <= WX_METAR_OLD_S)) out.push({
      id,
      kind: 'metar'
    });
    if (dated && (!t || !(now - +t.validTimeFrom <= WX_TAF_OLD_S))) out.push({
      id,
      kind: 'taf'
    });
  }
  return out;
}
/** SOG-0527 (2) : lit la météo des terrains quand quelque chose manque ou a vieilli (wxNeeds) — UNE tentative par terrain, par sorte et
 *  par heure (S.wxAsked), jamais en boucle ; la lecture passe par la couche météo du cadre (ctx.weather : son cache et ses sources, la clé
 *  de l'appareil jamais vue ici). Hors ligne : rien n'est demandé. */
function wxAuto() {
  if (!S?.flight || S.wxBusy || S.ctx.net?.online?.() === false) return;
  const hour = Math.floor(Date.now() / 3600e3),
    asked = S.wxAsked ||= new Set(),
    fresh = wxNeeds().filter(n => !asked.has(`${n.id}|${n.kind}|${hour}`));
  if (!fresh.length) return;
  for (const n of fresh) asked.add(`${n.id}|${n.kind}|${hour}`);
  if (asked.size > 200) S.wxAsked = new Set(fresh.map(n => `${n.id}|${n.kind}|${hour}`)); // borné : seule l'heure en cours compte
  return wxFetch(false);
}
/** SOG-0527 (2) : les besoins du moment (wxNeeds) posés comme demandés pour l'heure — appelé par TOUTE lecture (wxFetch), celle de
 *  l'ouverture et le geste compris : wxAuto ne redemande pas aussitôt ce qu'une lecture vient d'aller chercher. */
function wxMarkAsked() {
  const hour = Math.floor(Date.now() / 3600e3),
    asked = S.wxAsked ||= new Set();
  for (const n of wxNeeds()) asked.add(`${n.id}|${n.kind}|${hour}`);
}
/** SOG-0527 (2) : un METAR plus vieux est relu (une heure : une observation par heure au moins) ; un TAF valide depuis plus longtemps est
 *  relu (sept heures : un TAF s'émet toutes les six heures). */
const WX_METAR_OLD_S = 3600,
  WX_TAF_OLD_S = 7 * 3600;
/** METAR et TAF des terrains du couloir par la couche météo du cadre (ctx.weather.metar / taf : aviationweather.gov
 *  relayé par le lanceur, sinon metar.vatsim.net et avwx.rest avec la clé de l'appareil ; gardés 30 min par terrain) ;
 *  hors ligne, sa réserve. Les TAF seulement quand une date de vol les rend utiles (terrains avec METAR, départ,
 *  arrivée, dégagement). Fiche des terrains (axe de piste) par aerodb. loud : les refus sont dits. */
async function wxFetch(loud = false) {
  // lecture programmée (scheduleWx) partie après le démontage ; SOG-0493 : ou un montage dont le vol n'est pas encore lu (completeMount)
  if (!S?.flight) return;
  const s = S,
    when = wxWhen();
  await wxCorridor();
  if (gone(s)) return;
  const ids = wxIds();
  if (!ids.length) {
    if (loud) S.ctx.notify(tt(TX.wxNone), 'warn');
    return renderWx();
  }
  const W = s.ctx.weather,
    cacheOnly = s.ctx.net?.online?.() === false;
  // SOG-0527 (2) : la ligne du dégagement dit la lecture en cours, puis son échec et sa cause (jamais « allez à l'étape Météo »)
  s.wxBusy = true;
  s.wxFail = null;
  wxMarkAsked(); // toute lecture compte : ce qu'elle va chercher n'est pas redemandé dans l'heure (pas de seconde lecture à l'ouverture)
  if (s.C) altnChkDraw(s.C);
  try {
    if (!W) throw Object.assign(new Error('ctx.weather'), {
      unreachable: true
    });
    const m = await W.metar(ids, {
        cacheOnly
      }),
      r = s.flight.route || {},
      tafIds = when == null ? [] : ids.filter(id => m.items[id] || [r.dep, r.arr, r.altn].includes(id)),
      t = tafIds.length ? await W.taf(tafIds, {
        cacheOnly
      }) : null;
    if (gone(s)) return;
    // une source qui ne répond pas rend un résultat « offline » (aucune exception) : un échec, dit avec sa cause, jamais « pas encore lue »
    if (!cacheOnly && (m.offline || t?.offline)) s.wxFail = tt(TX.altnWhy.wxUnreachable);
    const newest = Math.max(0, ...Object.values(m.items).map(x => +x?.obsTime || 0)); // heure du plus récent METAR gardé
    S.wx = {
      metar: m.items,
      taf: t?.items || {},
      at: m.offline || cacheOnly ? newest ? new Date(newest * 1000).toISOString() : null : new Date().toISOString(),
      source: m.source === 'cache' ? S.wx?.source || 'cache' : m.source,
      noTaf: !!t?.noTaf,
      cached: !!(m.offline || cacheOnly)
    };
  } catch (e) {
    if (gone(s)) return;
    if (S.wx) S.wx.cached = true;
    s.wxFail = String(e.offline ? tt(TX.offline) : e.unreachable ? tt(TX.wxRelay) : e?.message || '?').slice(0, 160);
    if (loud) S.ctx.notify(e.offline ? tt(TX.offline) : e.unreachable ? tt(TX.wxRelay) : tt(TX.sbError, {
      e: e.message
    }), 'warn');
  } finally {
    s.wxBusy = false;
  }
  if (!gone(s)) wxAutoSoon(); // ce qui a changé pendant la lecture (un terrain saisi) est revu ensuite, une fois par heure au plus
  s.wxAd = s.wxAd || {};
  for (const id of ids)
    if (!(id in s.wxAd)) s.wxAd[id] = ((await s.ctx.aerodb?.aerodromes?.({
      icao: id
    }).catch(() => null)) || [])[0] || null;
  if (gone(s)) return;
  await aloftFetch(loud);
  if (gone(s) || !S.body) return;
  renderWx();
  altnChkDraw(S.C); // SOG-0398 : la météo lue : le critère météo du dégagement
  S.P
    .windSync(); // le vent de chaque piste de la carte des procédures suit le METAR (§ 10.30) ; rien de redessiné s'il n'a pas changé (SOG-0377)
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
/** Prévision par niveaux aux lieux de la route (points, plus un lieu tous les 50 NM environ, 24 au plus) par la couche
 *  météo du cadre (ctx.weather.aloft : modèle selon la région, heure la plus proche de la date du vol, sinon maintenant ;
 *  sa réserve d'abord, Open-Meteo pour ce qui manque, appels comptés pour l'appareil). Hors ligne, sa réserve seulement.
 *  Puis appliquée au vol (aloftApply). */
async function aloftFetch(loud = false) {
  const s = S,
    pts = (S.flight.route?.points || []).filter(p => Number.isFinite(+p.lat));
  if (pts.length < 2) return;
  const key = aloftKey();
  if (S.aloft?.key === key && !S.aloft.cached) return aloftApply();
  S.aloftState = 'loading';
  const smp = WD.samples(pts),
    t = wxWhen() ?? Math.round(Date.now() / 1000),
    W = s.ctx.weather,
    offline = s.ctx.net?.online?.() === false,
    ask = cacheOnly => W.aloft(smp, t, {
      cacheOnly,
      stale: () => gone(s)
    });
  try {
    if (!W) throw Object.assign(new Error('ctx.weather'), {
      unreachable: true
    });
    let r = null,
      cached = offline;
    try {
      r = await ask(offline);
    } catch (e) {
      if (!e.offline) throw e;
      r = await ask(true); // le réseau est tombé en route : la réserve de la couche
      cached = true;
    }
    if (gone(s)) return;
    if (!r) throw Object.assign(new Error('offline'), {
      offline: true
    });
    S.aloftState = 'ok';
    S.aloft = {
      key,
      model: r.model.name,
      short: r.model.short,
      run: r.run,
      time: r.time ?? t,
      at: new Date().toISOString(),
      samples: smp,
      profiles: r.profiles,
      ...(cached ? {
        cached: true
      } : {})
    };
  } catch (e) {
    if (gone(s)) return;
    S.aloftState = 'failed'; // le vent au sol des METAR prend le relais, et c'est dit
    if (loud && !e.offline && !e.stale) S.ctx.notify(tt(TX.sbError, {
      e: e.message
    }), 'warn');
    if (S.aloft) S.aloft.cached = true;
  }
  if (!gone(s)) aloftApply();
}
/** Vents et températures à l'altitude prévue (profil : montée, paliers, descente) : aux lieux de lecture et aux points de la route ;
 *  null sans prévision pour cette route. */
function aloftCalc() {
  const A = S.aloft,
    pts = S.flight.route?.points || [],
    plan = +S.flight.level?.ft || 0;
  if (!A?.profiles?.length || A.key !== aloftKey() || !(plan > 0) || pts.length < 2) return null;
  const nmPts = [0];
  for (let i = 1; i < pts.length; i++) nmPts.push(nmPts[i - 1] + rhumbNm(pts[i - 1], pts[i]));
  // l'altitude du profil à chaque lieu (montée, paliers, descente : profile.path, sinon tocNm / todNm), pas le niveau de croisière
  // partout (utilisateur, 29 octobre) ; les distances de la route ramenées sur le chemin volé des procédures
  const fp = fpNow(),
    toF = CF.routeNmToFlown(S.flight, fp),
    lvAt = n => {
      const c = WD.levelAt(pts, nmPts, plan, n),
        a = CF.altitudeAt(S.flight, toF(n), {
          cruiseFt: c,
          flown: fp
        });
      return a == null ? c : Math.round(a / 100) * 100;
    },
    at = new Date(A.time * 1000).toISOString(),
    winds = A.samples.map((smp, i) => WD.atLevel(A.profiles[i], lvAt(smp.nm)));
  return {
    winds,
    nms: A.samples.map(x => x.nm),
    points: pts.map((p, i) => {
      const k = A.samples.findIndex(x => x.point === i),
        lv = lvAt(nmPts[i]),
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
  box.innerHTML = `<p class="f-muted" data-aloftat>${esc(tt(TX.aloftAt, { m: A.model, t: hh(A.time), run: A.run ? tt(TX.aloftRun, { r: hh(A.run) }) : '', r: fmtDateZ(A.at, S.ctx.lang()) }))}${ageHtml(A.run || Date.parse(A.at) / 1000)}</p>
    <div class="f-scroll"><table class="f-table"><thead><tr>${TX.aloftCols.map((h, i) => `<th${i ? ' class="f-num"' : ''}>${esc(tt(h))}</th>`).join('')}</tr></thead><tbody>
    ${c.points.map((w, i) => w ? `<tr><td>${esc(pts[i].id || '')}</td><td class="f-num">${flTxt(w.levelFt)}</td><td class="f-num">${String(w.dirDeg).padStart(3, '0')}° ${esc(speedTxt(w.kt))}</td><td class="f-num">${w.tempC} °C</td><td class="f-num">${w.isaDev > 0 ? '+' : ''}${w.isaDev}</td></tr>` : '').join('')}
    </tbody></table></div>`;
}
/** Source du vent du devis, en court : « vent : METAR LFRS, TAF LFML », « vent : prévision ICON FL060 », « vent saisi » ;
 *  vide sans vent. */
function windShort(short = false) {
  const f = S.flight,
    src = f.windSource,
    by = short ? {
      ...TX.windBy,
      ...TX.windByS
    } : TX.windBy;
  if (src?.kind === 'weather') return tt(by.weather, {
    l: (src.ids || []).map(x => {
      const m = /^(\S+) \((\w+)\)$/.exec(x);
      return m ? `${m[2]} ${m[1]}` : x;
    }).join(', ')
  }) + (src.aloftFailed ? ` · ${tt(TX.aloftDown)}` : '');
  if (src?.kind === 'aloft') return tt(by.aloft, {
    m: src.short || src.model || '',
    l: flTxt(src.levelFt)
  }) + (src.pending ? ` · ${tt(TX.aloftPending)}` : '');
  return Number.isFinite(+f.wind?.speedKt) ? tt(by.typed) : '';
}
/** Ligne de contexte de la barre de résultat : « Bloc · FL060→090→110→070 · vent ARPEGE FL060 » (court : une ligne sur
 *  un téléphone) ou son texte entier « Carburant bloc · FL060 → FL090 → FL110 → FL070 · vent : prévision ARPEGE FL060 »
 *  (infobulle). Court : les niveaux sont joints par → sans espace, « FL » n'est écrit qu'une fois en tête. */
function resultContext(q, range, short) {
  const lv = q.steps ? q.steps.levels.map(l => l.ft) : [q.levelFt],
    fl = lv.map((ft, i) => {
      const t = flTxt(ft);
      return short && i && /^FL\d+$/.test(t) ? t.slice(2) : t;
    }).join(short ? '→' : ' → '),
    wind = range ? tt(short ? TX.windRangeS : TX.windRange) : windShort(short);
  return `${tt(short ? TX.blockS : TX.block)} · ${fl}${unitOf('alt') !== 'ft' ? ` (${altTxt(q.levelFt)})` : ''}${q.approx ? ` · ${tt(TX.approx)}` : ''}${wind ? ` · ${wind}` : ''}${q.cruise?.byLeg ? ` · ${tt(TX.windByLeg)}` : ''}`;
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
  const now = Date.now(),
    set = Date.parse(S.flight.planned_at || ''),
    base = Number.isFinite(set) && set > now ? set : now,
    step = 5 * 60000,
    t = plus ? Math.ceil((base + plus * 60000) / step) * step : null;
  setPlanned(t ? new Date(t).toISOString().slice(0, 19) + 'Z' : null);
  saveFlight();
  whenChanged();
}
/** Pose la date du vol : current_flight.planned_at (ISO UTC, null = maintenant), et le champ à l'écran (heure de
 *  l'appareil) seulement si sa valeur change. L'écriture du vol et le calcul suivent (saveFlight, whenChanged). */
function setPlanned(iso) {
  const local = whenField(iso);
  S.flight.planned_at = iso;
  const wd = S.body?.querySelector('[data-k="wxdate"]');
  if (wd && wd.value !== local) wd.value = local;
}
/** La date du vol a changé : la météo des terrains (TAF si la date tombe dans sa validité) et les vents en altitude sont
 *  relus pour cette heure après un court temps calme (plusieurs appuis ou frappes, une lecture). */
function whenChanged() {
  renderWx();
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
/** Heure visée (secondes) : la date du vol (current_flight.planned_at), sinon aucune (METAR, prévision de maintenant). La
 *  météo des terrains (TAF) et les vents et températures en altitude du devis sont lus à cette heure. */
const wxWhen = () => {
  const t = Date.parse(S?.flight?.planned_at || ''); // SOG-0493 : un montage dont le vol n'est pas encore lu n'a pas de date
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
};
/** Résumés des terrains (METAR, ou TAF si la date du vol tombe dans sa validité). */
const wxStations = () => {
  const r = S.flight.route || {},
    corr = new Map((S.wxCorr?.list || []).map(x => [x.id, x])),
    pts = S.wxCorr?.pts || [],
    total = pts.length >= 2 ? pts.slice(1).reduce((t, p, i) => t + rhumbNm(pts[i], p), 0) : null;
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
      const rw = ad ? WIND.bestRunwayEnd(ad.bearing, ad.magVar, st.wdir, st.wspd) : null;
      return `<div class="fu-wx"><div class="f-row"><b>${esc(id)}</b><span class="f-muted">${esc([ad?.name, where(x), `${st.source} ${hhmm(st.at)}`].filter(Boolean).join(' · '))}</span>${ageHtml(st.source === 'TAF' ? +S.wx?.taf?.[id]?.validTimeFrom : st.at)}${st.cat ? `<span class="f-badge" data-kind="${kinds[st.cat] || 'accent'}">${esc(st.cat)}</span>` : ''}</div>
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
    // un terrain sans vent dirigé (VRB, direction absente) n'entre pas dans la moyenne : elle vient des autres, la source les nomme
    list = wxStations().filter(x => x.role !== 'altn' && x.st && x.along != null && WX.hasWind(x.st)),
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
  const src = S.flight.windSource,
    line = text || (src?.kind === 'weather' ? tt(TX.wxSrc, {
      l: src.ids.join(', ')
    }) + (src.aloftFailed ? ` ${tt(TX.aloftFailed)}` : '') : src?.kind === 'aloft' ? tt(TX.aloftSrc, {
      m: src.model
    }) + (src.pending ? ` (${tt(TX.aloftPending)})` : '') : ''),
    // SOG-0527 (3) : l'âge de ce qui donne le vent — la sortie de la prévision (sinon sa lecture), le plus vieux des METAR moyennés
    obs = src?.kind === 'weather' ? (src.ids || []).map(id => +S.wx?.metar?.[id]?.obsTime).filter(t => t > 0) : [],
    t = text ? null : src?.kind === 'aloft' ? +S.aloft?.run || Date.parse(S.aloft?.at || '') / 1000 : obs.length ? Math.min(...obs) : null;
  el.innerHTML = esc(line) + ageHtml(t);
}
/** SOG-0527 (3) (l'ergonome : « toute valeur de vent ou de météo affichée dit sa source et son âge, en alerte au-delà de 12 h ») : « il y
 *  a 35 min » après une donnée datée (t : secondes depuis 1970), discret ; au-delà d'AGE_OLD_S, en alerte avec « plus de 12 h ». '' sans
 *  date lisible. */
function ageHtml(t) {
  const sec = +t;
  if (!(sec > 0)) return '';
  const age = Math.max(0, Date.now() / 1000 - sec),
    old = age > AGE_OLD_S;
  return ` <span class="${old ? 'f-warn' : 'f-muted'}" data-age="${old ? 'old' : 'ok'}">${esc(tt(TX.ageAgo, {
    d: fmtDur(age / 60, {
      wholeHour: true
    })
  }) + (old ? ` · ${tt(TX.ageOld)}` : ''))}</span>`;
}
/** SOG-0527 (3) : au-delà, une donnée de vent ou de météo est dite en alerte. */
const AGE_OLD_S = 12 * 3600;

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
    found = await S.A.search(text, 30).catch(() => []);
  if (gone(s) || seq !== S.acSeq || !S.body) return;
  // § 10.38 : les appareils de la flotte de la compagnie courante d'abord (la ligne d'aerodb s'il connaît l'immatriculation, sinon une
  // ligne faite de la flotte : son type, la fiche de ce type s'il y en a une) ; flotte vide : la recherche comme avant
  const fold = v => String(v || '').toUpperCase(),
    q = fold(text).trim(),
    canon = c => fold(S.A?.canonical?.(c) || c),
    co = (S.coFleet?.aircraft || []).filter(a => !q || [a.registration, a.type, a.callsign].some(v => fold(v).includes(q))),
    regs = new Set(co.map(a => a.registration)),
    coHits = co.map(a => found.find(h => h.registration === a.registration) || {
      kind: 'aircraft',
      source: 'fleet',
      key: `co:${a.registration}`,
      label: [a.registration, a.type, a.callsign].filter(Boolean).join(' — '),
      sheetId: S.sheets.find(x => canon(x.icao || x.type || x.id) === canon(a.type))?.id || '',
      type: a.type,
      registration: a.registration,
      callsign: a.callsign,
      name: a.type || a.registration
    }),
    hits = [...coHits, ...found.filter(h => !regs.has(h.registration))].slice(0, 30);
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
  if (S.ralts?.ac !== undefined && S.ralts.ac !== acKey()) proposalsEnd(); // SOG-0224 : un autre aéronef finit les propositions
  const panel = S.body.querySelector('[data-acpanel]'), // absent de la vue Fiches (sa recherche est redessinée par refresh)
    field = S.body.querySelector('input[data-k="acsearch"]');
  panel?.classList.add('fu-hide');
  if (field) field.value = '';
  saveFlight();
  refresh();
}
/** L'appareil du devis dit en clair en tête de la barre de résultat (SOG-0060 : « j'ai planifié un vol en F50 ? Où est-ce
 *  écrit !? ») : type et immatriculation (« FA50 · F-GXXX »), « estimation du type » quand aucune fiche ne sert ; un bouton qui mène
 *  au choix de l'appareil. '' sans appareil. */
function acLineHtml() {
  const a = S.flight.aircraft || {},
    sheet = S.C?.sheet,
    type = a.type || sheet?.icao || '',
    est = !!sheet && String(sheet.id || '').startsWith('TYPE_'),
    text = [type, a.registration, est ? tt(TX.via.estimate) : ''].filter(Boolean).join(' · ');
  return text ? `<button type="button" class="fu-linkbtn fu-acline" data-do="acgo" title="${esc(tt(TX.acChange))}">${esc(text)}</button><span aria-hidden="true"> · </span>` : '';
}
/** La ligne de l'appareil touchée : le pas Vol, la recherche d'appareil ouverte, le focus dans son champ. */
function acGo() {
  goStep(0);
  const panel = S.body?.querySelector('[data-acpanel]');
  if (!panel) return;
  if (panel.classList.contains('fu-hide')) acOpen();
  else panel.querySelector('input')?.focus();
}
/** Ligne de l'appareil retenu : nom, immatriculation, indicatif, type, badge d'origine, bouton de recherche. */
function acSelected() {
  const box = S.body?.querySelector('[data-acsel]');
  if (!box) return;
  const a = S.flight.aircraft || {},
    sheet = S.C?.sheet,
    origin = a.source || (a.sheetId ? 'sheet' : a.type ? 'free' : '');
  box.innerHTML = `${sheet ? `<b>${esc(a.name || sheet.name || sheet.id)}</b><span class="f-muted">${esc([...new Set([a.registration, a.callsign, a.type || sheet.icao].filter(Boolean))].join(' · '))}</span>${origin ? `<span class="f-badge" data-kind="accent">${esc(tt(TX.origins[origin] || TX.origins.free))}</span>` : ''}` : `<span class="f-muted">${esc(tt(TX.acNone))}</span>`}
    <button type="button" data-do="acopen" title="${esc(tt(TX.acChange))}">${svg('search')}<span>${esc(tt(TX.acChangeShort))}</span></button>`;
}

/** Le libellé de la date du vol : « Date du vol » et sa précision « (heure locale de l'appareil) » dans un span que le module étroit ne
 *  montre pas (SOG-0056 : à 390 px le libellé sur deux lignes décalait le champ ; le title du champ garde l'explication). */
/** SOG-0393 : le libellé de la date du vol en deux parts — [l'étiquette, la précision] (« Date du vol », « heure locale de l'appareil ») :
 *  l'étiquette tient sur une ligne, à la hauteur de celle du niveau, et la précision passe sous le champ, comme « auto · 1:49 » sous
 *  le niveau ; sans parenthèse dans le texte, la précision est vide. */
function wxDateParts() {
  const t = tt(TX.wxDate),
    k = t.indexOf(' (');
  return k > 0 ? [t.slice(0, k), t.slice(k + 2).replace(/\)\s*$/, '')] : [t, ''];
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
// ---------------------------------------------------------------- calcul et contrôle de route (SOG-0080, SOG-0081)
/** « Calculer A → B » (compute : les points saisis sont des passages imposés) ou « Contrôler » (check : la route saisie telle
 *  quelle), par le travail route/compute du lanceur dans la forme de l'écran (contrat d'AeroDB, frame/aerodb/INTEGRATION.md) ; la réponse, nettoyée
 *  (RE.normalize), donne la liste des itinéraires (calculate) ou les segments fautifs marqués dans la liste des points (validate). Un
 *  refus du moteur est dit avec sa phrase. La saisie n'est jamais touchée ici. */
async function routeAsk(action) {
  // SOG-0134 : un second appui pendant un calcul ne lance rien ; le temps de chaque étape est gardé (routeTiming)
  if (S.routeBusy) return;
  const s = S,
    r = S.flight.route || {},
    o = CF.proceduresOf(S.flight),
    box = S.body?.querySelector('[data-routealts]'),
    act = action === 'compute' ? 'compute' : 'check';
  if (!S.routeEngine) return; // sans moteur au montage, les boutons ne sont pas montrés
  // SOG-0208 : jamais un appui sans suite — les terrains manquants, puis le lanceur vérifié à l'appui, dits à la place des itinéraires
  const retry = `<button type="button" class="fu-linkbtn" data-do="${act === 'compute' ? 'rcompute' : 'rcheck'}" data-rretry>${esc(tt(TX.rRetry))}</button>`;
  if (!r.dep || !r.arr) {
    if (box) box.innerHTML = `<p class="f-warn" data-rneed>${esc(tt(TX.rNeedAds))}</p>`;
    return;
  }
  // SOG-0354 : un vol qui traverse l'océan (le critère du moteur) peut demander jusqu'à 20 s de recherche : la ligne d'attente le dit ;
  // la réponse la remplace (rien de plus quand c'est une route)
  if (box) box.innerHTML = `<p class="f-muted" data-rbusy>${esc(tt(TX.rBusy))}</p>${oceanCrossing(r) ? `<p class="f-muted" data-rocean>${esc(tt(TX.rBusyOcean))}</p>` : ''}`;
  routeBusy(s, true, act);
  try {
    await routeAskRun(s, act, r, o, box, retry);
  } finally {
    routeBusy(s, false);
  }
}
/** La demande elle-même (routeAsk), mesurée : appui (t0), départ de la demande au lanceur (t1), réponse (t2), liste dessinée (t3). */
async function routeAskRun(s, act, r, o, box, retry) {
  // SOG-0529 (Sécurisation) : le geste de l'utilisateur passe avant la recherche d'« Auto » en cours (la place unique du lanceur) ;
  // SOG-0545 : une réponse déjà là reste (elle fait la liste des routes par niveau)
  if (S.autoLv?.busy) autoStop();
  S.rkeep = null; // SOG-0545 : un nouveau calcul, plus de « Revoir les propositions »
  await altsMoreStop(); // SOG-0296 : une nouvelle demande arrête la recherche des variantes de la précédente
  if (!(await RE.answers(S.ctx.launcher))) {
    if (!gone(s) && box) box.innerHTML = `<p class="f-warn" data-rnolauncher>${esc(tt(TX.rNoLauncher))} ${retry}</p>`;
    return;
  }
  if (gone(s) || !S.body) return;
  altsClear(); // une nouvelle demande : la Carte n'a plus d'itinéraires à dessiner
  const args = routeArgs(act, r, o);
  s.rtime.t1 = performance.now();
  const res = await RE.run(S.ctx.launcher, args);
  xpNoteAnswer(res); // SOG-0397 : les positions venues d'X-Plane notées avant toute écriture
  s.rtime.t2 = performance.now();
  if (gone(s) || !S.body) return;
  if (!res) { // le lanceur a répondu à l'appui puis pas au calcul : dit en place, avec « Réessayer »
    if (box) box.innerHTML = `<p class="f-warn" data-rfail>${esc(tt(TX.rFail))} ${retry}</p>`;
    return;
  }
  // la demande : sans `fl`, le niveau du calcul est celui du moteur (SOG-0389) ; sans heure du vol, l'heure présente (SOG-0391 b : « now »,
  // pour la lecture de la réponse seulement, jamais envoyé au lanceur)
  const n = RE.normalize(res, act, {
    ...args,
    now: !Number.isFinite(Date.parse(S.flight.planned_at || ''))
  });
  if (!n.ok) {
    // SOG-0125 : sans RAD, la phrase et le lien vers sa ligne de Données (l'import se fait là, jamais depuis Carburant) ; le message du
    // lanceur, qui nomme un travail, n'est pas montré au pilote
    if (box) box.innerHTML = n.reason === 'no-rad' ? `<p class="f-warn" data-rrefused="no-rad">${esc(tt(TX.rNoRad))} · <a href="${RAD_DATA_HREF}" data-radlink>${esc(tt(TX.rNoRadGo))}</a></p>` :
      `<p class="f-warn" data-rrefused="${esc(n.reason)}">${esc(!n.message && TX.rWhy[n.reason] ? tt(TX.rWhy[n.reason]) : n.message || tt(TX.rFail))}${!n.message && ['busy', 'offline', 'stopped', 'failed'].includes(n.reason) ? ` <button type="button" data-do="${act === 'compute' ? 'rcompute' : 'rcheck'}" data-rretry>${esc(tt(TX.rRetry))}</button>` : ''}</p>`;
    return;
  }
  if (act === 'check') {
    const a = n.plans[0];
    S.rcheck = {
      text: String(r.text || ''),
      segments: a?.segments || [],
      faults: a?.faults || 0,
      errors: a?.errors || [],
      violations: a?.faulty ? a.violations : 0 // SOG-0532 (4)
    };
    // SOG-0532 (3) : les règles enfreintes dites par leurs codes (le groupe « Règles connues enfreintes ») ne repassent pas en texte
    const lines = RE.faultLines(a?.reasons?.violates?.length ? {
        ...a,
        errors: []
      } : a),
      ok = !a?.verdict || a.verdict === 'conform' ? `<p class="f-muted" data-rcheck>${esc(tt(TX.rCheckOk))}</p>` : '';
    if (box) box.innerHTML = `${lines.length || a?.incomplete ? faultsHtml(lines, a) : ok}${a ? verdictsHtml(a, true) : ''}${limitsHtml(n)}`;
    S.ralts = null;
    if (a) altsPublish('check', [a], [r.points || []]); // la route tapée est déjà lue : ses points (INTEGRATION § 3 bis)
    renderPts();
    refresh();
    return routeDrawn(s);
  }
  S.ralts = {
    list: n.plans,
    chosen: -1,
    n,
    // SOG-0224 : ce qui fait survivre la liste et son détail (route_alts.json, schéma 2) ; la réponse elle-même, relue par
    // RE.normalize à chaque lecture (une entrée non fiable, bornée au même endroit que la réponse du lanceur)
    answer: answerOf(res, n),
    // SOG-0296 : un résultat du cache du poste garde l'heure de SON calcul (« du cache, calculé à … ») ; la règle « périmé » la lit
    computed_at: n.cache?.at || new Date().toISOString(),
    cache: n.cache,
    // SOG-0296 : les variantes, demandées ensuite (altsMore) ; un plan impossible a déjà ses propositions
    more: n.plans.length && !n.plans[0].proposal ? 'busy' : '',
    ac: acKey(),
    base: await baseStamp()
  };
  if (gone(s) || !S.body) return;
  // SOG-0545 (l'ergonome) : en « Auto », la route de chaque niveau jugé (cinq au plus) remplace les variantes, « Calculé à » prend
  // l'heure de cette réponse ; pas de recherche de variantes, pas de réponse gardée sur l'appareil (le schéma 1 du document)
  const lvl = autoList(n);
  if (lvl) Object.assign(S.ralts, {
    list: lvl.list,
    answer: null,
    computed_at: lvl.at || S.ralts.computed_at,
    cache: null,
    more: '',
    mode: 'levels',
    kept: lvl.kept
  });
  routeAltsDraw();
  altsPublish('compute', S.ralts.list); // pour la Carte (INTEGRATION § 3 bis)
  // SOG-0517 : un vol sans niveau prend celui du calcul — écrit dans le vol (page 1), le devis, le profil et le plan de vol le portent, et
  // dit. Refus de recette (l'utilisateur : « j'ai vidé le niveau de vol. j'ai calculé. … le niveau de vol n'est pas renseigné dans la
  // page 1 ») : c'est le niveau ENVOYÉ (celui de la fiche, routeFl), sinon celui que le moteur a pris (« default » : FL180) ; la seconde
  // demande part avec lui (sinon elle se croirait d'une autre entrée et relancerait le calcul)
  const okFl = v => Number.isInteger(v) && v >= 10 && v <= 660,
    took = okFl(args.fl) ? args.fl : n.level?.basis === 'default' && okFl(n.level.fl) ? n.level.fl : null;
  if (took && !(+S.flight.level?.ft > 0)) {
    args.fl = took;
    // setLevel, le geste du champ Niveau : le champ de la page 1 le montre (il n'est dessiné qu'une fois), les niveaux des points et le
    // vent en altitude sont refaits à ce niveau (le profil), puis le vol écrit et le devis refait (F286, rouge : le vol portait le
    // niveau, le champ restait vide)
    setLevel(took * 100);
    S.ctx.notify(tt(TX.rLevelSet, {
      fl: String(took).padStart(3, '0')
    }), 'info');
  }
  S.ralts.fl = okFl(args.fl) ? args.fl : null; // SOG-0533 : le niveau de CE calcul (une route prise le garde)
  if (S.ralts.more === 'busy') altsMore(s, args); // SOG-0296 : la seconde demande, sans attendre
  return routeDrawn(s);
}
/** La demande du travail route/compute pour le vol courant (RE.request) : la première (sans variantes) ; `r`, `o` : la route et les
 *  procédures du vol. */
function routeArgs(act, r = S.flight.route || {}, o = CF.proceduresOf(S.flight)) {
  const when = Date.parse(S.flight.planned_at || '');
  return RE.request({
    action: act,
    dep: r.dep,
    arr: r.arr,
    points: imposedPoints(r), // SOG-0517 : les passages tapés par le pilote et les verrous de la mission, jamais toute la route
    text: r.text,
    fl: routeFl(), // SOG-0517 : le niveau du vol, sinon celui du devis ; sans niveau du tout, le moteur prend le sien (écrit ensuite)
    date: new Date(Number.isFinite(when) ? when : Date.now()).toISOString().slice(0, 16),
    depRunway: o.dep?.rwy,
    arrRunway: o.arr?.rwy,
    alternatives: false,
    sections: act === 'compute' && oceanCrossing(r), // SOG-0354 (L2b 3) : le découpage par sections, pour un vol qui traverse l'océan
    perf: routePerf() // SOG-0514 : les vitesses de l'avion (le devis), au calcul comme au contrôle
  });
}
/** SOG-0517 (l'utilisateur : « il faut le fixer, s'il est vide, puisque la route est calculée à ce niveau ») : le niveau du calcul de
 *  route, en centaines de pieds — celui du vol, sinon le niveau de référence de la fiche de l'avion (celui que le devis prend sans
 *  niveau, et que le plan de vol écrit) ; null sans l'un ni l'autre. Lu de la fiche, jamais du devis du moment (pas encore calculé à
 *  l'ouverture) : la même demande donne le même niveau. Le niveau du devis et celui de la route ne divergent jamais en silence. */
function routeFl() {
  const ref = +currentSheet()?.cruise?.refAltFt,
    ft = +S.flight?.level?.ft > 0 ? +S.flight.level.ft : ref > 0 ? ref : 0;
  return ft > 0 ? Math.round(ft / 100) : null;
}
/** SOG-0517 : les noms d'un texte de route (points et coordonnées, en capitales), sans les voies ni les groupes. */
function namesOfText(text) {
  return RT.tokenize(text).filter(t => t.kind === 'name' || t.kind === 'coord').map(t => String(t.id || '').toUpperCase()).filter(Boolean);
}
/** SOG-0517 : les passages TAPÉS par le pilote après un changement de texte : ceux qu'il avait tapés et qui restent, plus les noms
 *  nouveaux (absents du texte d'avant) ; le départ et l'arrivée n'en sont jamais. Quarante au plus. */
function typedNames(r, before, after) {
  const was = new Set(namesOfText(before)),
    now = namesOfText(after),
    ends = new Set([String(r?.dep || '').toUpperCase(), String(r?.arr || '').toUpperCase()]),
    keep = new Set((Array.isArray(r?.typed) ? r.typed : []).map(x => String(x).toUpperCase()));
  return [...new Set(now.filter(n => !ends.has(n) && (keep.has(n) || !was.has(n))))].slice(0, 40);
}
/** SOG-0517 (AeroDB : les points du champ Route envoyés en passages imposés reconduisaient une route ancienne) : les points que le calcul
 *  DOIT passer — ceux que le pilote a tapés ou ajoutés (r.typed) et ceux que la mission verrouille (lock) ; jamais ceux d'un itinéraire
 *  pris, d'un OFP ou d'une route de mission. Le départ et l'arrivée encadrent. Un vol d'avant ce changement (sans typed) : les verrous. */
function imposedPoints(r) {
  const pts = Array.isArray(r?.points) ? r.points : [],
    typed = new Set((Array.isArray(r?.typed) ? r.typed : []).map(x => String(x).toUpperCase()));
  if (pts.length < 2) return pts;
  return [pts[0], ...pts.slice(1, -1).filter(p => p && (p.lock || typed.has(String(p.id || '').toUpperCase()))), pts.at(-1)];
}
/** SOG-0517 : la ligne sous les boutons du calcul — les passages imposés, nommés ; cachée sans passage. Les retirer : les effacer du
 *  champ Route (le geste de toujours). */
function rviaDraw() {
  const line = S.body?.querySelector('[data-rvia]');
  if (!line) return;
  const ids = imposedPoints(S.flight?.route).slice(1, -1).map(p => String(p?.id || '')).filter(Boolean).slice(0, 12);
  line.hidden = !ids.length;
  line.textContent = ids.length ? tt(TX.rViaImposed, {
    list: ids.join(', ')
  }) : '';
}
/** SOG-0514 : les vitesses de l'avion pour le moteur de route (RE.perfFields) — le devis du vol courant et la fiche APD de son type ; null
 *  sans devis (profil incomplet) ou sans performance connue de l'avion : un type sans fiche d'avion (TYPE_…) ni fiche APD n'a qu'un devis
 *  par défaut (300 kt, 1 200 / 1 500 ft/min de normalizeSheet), jamais envoyé comme les chiffres de l'avion — le moteur prend ses
 *  défauts, et la ligne du calcul le dit (perfDefaultHtml). */
function routePerf() {
  const C = S?.C || {},
    sheet = C.sheet || currentSheet(),
    code = sheet ? sheet.icao || sheet.type || sheet.id : '',
    apd = code ? S.A?.perf?.(code) || null : null;
  if (!sheet || (String(sheet.id || '').startsWith('TYPE_') && !apd)) return null;
  return RE.perfFields(C.q, apd);
}
/** SOG-0514 : « Vitesses par défaut du moteur » quand le calcul ou le contrôle part sans les vitesses de l'avion ; '' sinon. */
const perfDefaultHtml = () => routePerf() ? '' : `<p class="f-muted" data-rdefperf>${esc(tt(TX.rDefaultPerf))}</p>`;
/** SOG-0296 : ce qui fait la demande (pour savoir si l'entrée a changé pendant la seconde) — ses champs, sans la date tirée de
 *  l'horloge (l'heure prévue du vol en tient lieu). */
const argsKey = a => JSON.stringify({
  ...a,
  date: undefined,
  at: S?.flight?.planned_at || ''
});
/** SOG-0296 (la cause, mesurée par AeroDB : LFOE → KDEN 3,0 s sans alternatives, 25,3 s avec, la même route de tête) : la seconde
 *  demande, les mêmes champs plus `alternatives` ; à son retour, les variantes AJOUTÉES sous la route de tête (jamais remplacée, trois
 *  itinéraires au plus, une route déjà là pas répétée) et le document route_alts.json suit ; un échec ou un arrêt garde la première
 *  et le dit. Arrêtée (signal → regen/job/cancel) par une nouvelle demande, la fin des propositions, ou l'entrée changée (altsMoreCheck). */
async function altsMore(s, args) {
  const R = S.ralts,
    ctl = new AbortController(),
    run = RE.run(S.ctx.launcher, {
      ...args,
      alternatives: true
    }, {
      signal: ctl.signal
    }).catch(() => null);
  S.raltsMore = {
    ctl,
    key: argsKey(args),
    run
  };
  const res = await run;
  xpNoteAnswer(res); // SOG-0397 : les variantes aussi
  if (S?.raltsMore?.ctl === ctl) S.raltsMore = null;
  if (gone(s) || !S.body || S.ralts !== R) return;
  if (ctl.signal.aborted) { // arrêtée pour une nouvelle demande : celle-ci dessine
    R.more = '';
    return;
  }
  const n = res ? RE.normalize(res, 'compute') : null;
  if (!n?.ok) {
    R.more = n?.reason === 'stopped' ? 'stop' : 'fail';
    return routeAltsDraw();
  }
  const key = p => `${p.route}|${p.fl}|${p.name}`, // la même route à un autre niveau ou sous un autre nom est une autre variante
    seen = new Set(R.list.map(key)),
    add = [];
  for (const a of (Array.isArray(res.alternatives) ? res.alternatives : []).slice(0, 3)) {
    const p = RE.normalize({
      ok: true,
      alternatives: [a]
    }, 'compute').plans[0];
    if (!p?.route || p.proposal || seen.has(key(p)) || R.list.length + add.length >= 3) continue;
    seen.add(key(p));
    add.push([{
      ...p,
      role: 'alternative'
    }, a]);
  }
  R.list = [...R.list, ...add.map(x => x[0])];
  R.answer = {
    ...R.answer,
    alternatives: [...R.answer.alternatives, ...add.map(x => x[1])].slice(0, 3)
  };
  R.more = !add.length ? 'none' : n.cache?.hit ? 'cache' : '';
  R.moreCache = n.cache;
  routeAltsDraw();
  altsPublish('compute', R.list);
}
/** SOG-0296 : arrête la seconde demande en cours (s'il y en a une) et attend sa fin (le poste libéré avant une autre demande). */
async function altsMoreStop() {
  const M = S?.raltsMore;
  if (!M) return;
  S.raltsMore = null;
  M.ctl.abort();
  await M.run;
}
/** SOG-0296 (c) : après une écriture du vol, une entrée changée pendant la seconde demande l'annule et relance la première. */
function altsMoreCheck() {
  const M = S?.raltsMore;
  if (!M || S.routeBusy || argsKey(routeArgs('compute')) === M.key) return;
  altsMoreStop().then(() => S && !S.routeBusy && routeAsk('compute'));
}
/** SOG-0296 : la ligne des variantes sous la route de tête — en recherche, aucune autre, l'échec ou l'arrêt (la première reste), ou
 *  « du cache ». */
function moreHtml(A) {
  const k = A?.more,
    t = k === 'busy' ? TX.rMoreBusy : k === 'none' ? TX.rMoreNone : k === 'fail' ? TX.rMoreFail : k === 'stop' ? TX.rMoreStop : k ===
    'cache' &&
    A.moreCache?.at ? TX.rMoreCache : null;
  return t ? `<p class="${k === 'fail' || k === 'stop' ? 'f-warn' : 'f-muted'}" data-rmore="${k}">${esc(tt(t, { t: k === 'cache' ? hhmmLocal(A.moreCache.at) : '' }))}</p>` : '';
}
// ---------------------------------------------------------------- les routes NAT à l'étape Route (SOG-0352)
/** Le départ et l'arrivée de part et d'autre de l'Atlantique nord : l'un à l'est de 25° W, l'autre à l'ouest de 50° W, tous deux au nord
 *  de 15° N (les deux bouts de la route du vol, avec leur position). */
function natCrossing(r) {
  const p = Array.isArray(r?.points) ? r.points : [],
    a = p[0],
    b = p.at(-1),
    v = [a?.lat, a?.lon, b?.lat, b?.lon].map(x => x === null || x === '' ? NaN : +x);
  if (!v.every(Number.isFinite) || v[0] < 15 || v[2] < 15) return false;
  return v[1] >= -25 && v[3] <= -50 || v[3] >= -25 && v[1] <= -50;
}
/** SOG-0354 : le critère du moteur pour un vol qui traverse l'océan (ses bornes de recherche plus longues) — un bout de la route à l'ouest
 *  de 35° W, l'autre à l'est de 15° W (les deux bouts de route.points, avec leur position). */
function oceanCrossing(r) {
  const p = Array.isArray(r?.points) ? r.points : [],
    a = p[0]?.lon == null ? NaN : +p[0].lon,
    b = p.at(-1)?.lon == null ? NaN : +p.at(-1).lon;
  if (p.length < 2 || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return a < -35 && b > -15 || b < -35 && a > -15;
}
/** SOG-0413 : à l'ouverture et au retour au premier plan, sur un poste avec lanceur, aerodb.natEnsure() — qui relit les routes NAT
 *  périmées ou lues il y a plus d'une heure, et rien sinon ; la ligne est redessinée si elles l'ont été. Silencieux : jamais pendant une
 *  lecture demandée, une demande à la fois. */
async function natAuto(s) {
  if (!s || gone(s) || s.natBusy || s.natAutoP || !natHere() || typeof s.ctx.aerodb?.natEnsure !== 'function') return;
  s.natAutoP = Promise.resolve().then(() => s.ctx.aerodb.natEnsure()).catch(() => null);
  const r = await s.natAutoP;
  s.natAutoP = null;
  if (!gone(s) && r?.refreshed) natLine();
}
/** SOG-0413 : les routes NAT détenues, par sens — { w: { n, from, to }, e: { n, from, to } } (une route offre des niveaux vers l'ouest ou
 *  vers l'est : `west` / `east` du message lu ; la fenêtre, le plus tôt et le plus tard de ses routes) ; null sans message lisible. */
async function natDirsNow(s) {
  const m = await Promise.resolve().then(() => s.ctx.aerodb?.nat?.()).catch(() => null),
    ts = Array.isArray(m?.tracks) ? m.tracks.slice(0, 60) : null;
  if (!ts) return null;
  const iso = v => Number.isFinite(Date.parse(v)) ? new Date(Date.parse(v)).toISOString() : '',
    g = key => {
      const xs = ts.filter(t => Array.isArray(t?.[key]) && t[key].length),
        f = xs.map(t => iso(t.from)).filter(Boolean).sort(),
        u = xs.map(t => iso(t.to)).filter(Boolean).sort();
      return {
        n: xs.length,
        from: f[0] || '',
        to: u.at(-1) || ''
      };
    };
  return {
    w: g('west'),
    e: g('east')
  };
}
/** Le lanceur de ce poste est là (pas une paire distante) : il peut lire le message NAT du jour (aerodb.natEnsure). */
const natHere = () => typeof S?.ctx?.launcher?.job === 'function' && !!S.ctx.launcher.info?.() && !S.ctx.launcher.info().lan;
/** SOG-0352 : la ligne des routes NAT de l'étape Route, avant le calcul — la date et la validité lues dans le message (aerodb.natState,
 *  jamais une durée en dur) ; avec le lanceur, « Lire les routes NAT du jour » quand elles ne sont pas valides ; sans lui, la date de
 *  la copie publiée depuis le poste, sans geste. Rien pour un vol qui ne traverse pas. Une demande à la fois. */
async function natLine() {
  const s = S,
    el = s?.body?.querySelector('[data-natline]');
  if (!el) return;
  if (!natCrossing(s.flight.route)) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  // SOG-0372 (a) : pendant la lecture, la ligne ne dit QUE la lecture, aussitôt (jamais l'ancienne phrase à côté)
  if (s.natBusy) {
    el.innerHTML = `<span class="f-muted" data-natstate="reading" aria-busy="true">${esc(tt(TX.natReading))}</span>`;
    el.hidden = false;
    return;
  }
  // une demande pendant une autre n'est pas perdue : refaite à la fin (la ligne après la lecture n'est jamais sautée)
  if (s.natAsking) {
    s.natAgain = true;
    return;
  }
  s.natAsking = true;
  const st = await Promise.resolve().then(() => s.ctx.aerodb?.natState?.()).catch(() => null);
  s.natAsking = false;
  if (s.natAgain && S === s && !gone(s)) {
    s.natAgain = false;
    return natLine();
  }
  const box = S === s && !gone(s) ? s.body?.querySelector('[data-natline]') : null;
  if (!box) return;
  const day = natDay,
    hm = iso => iso ? `${iso.slice(11, 16)}Z` : '?',
    fresh = !!st?.present && st.expired === false,
    here = natHere(),
    // SOG-0413 : les sens présents dans le message lu et leur fenêtre (« vers l'ouest 11 h 30 – 19 h 00 Z ; aucune vers l'est »)
    dirs = fresh ? await natDirsNow(s) : null,
    // SOG-0470 (Sécurisation) : une fenêtre sans ses deux heures n'est pas écrite (jamais « NaN h NaN ») — le sens seul est dit
    win = g => g.from && g.to ? `${zTime(g.from, true)} – ${zTime(g.to)}` : '',
    text = fresh && dirs ? tt(TX.natDirs, {
      d: day(st.from),
      w: dirs.w.n ? tt(TX.natW, {
        t: win(dirs.w)
      }).trim() : tt(TX.natW0),
      e: dirs.e.n ? tt(TX.natE, {
        t: win(dirs.e)
      }).trim() : tt(TX.natE0)
    }) : fresh ? tt(TX.natValid, {
      d: day(st.from),
      t: hm(st.validUntil)
    }) : here ? st?.present ? tt(TX.natStale, {
      d: day(st.from)
    }) : tt(TX.natNone) : st?.present ? tt(TX.natStaleCopy, {
      d: day(st.from)
    }) : tt(TX.natNoCopy);
  // SOG-0372 (a) : une lecture qui n'a pas rendu de routes valides le dit, avec sa raison, jusqu'à la suivante
  // SOG-0413 : le résultat d'une relecture forcée reste dit (ajoutées, rien de nouveau, trop tôt), même avec des routes valides
  const out = fresh && !s.natOut?.forced ? null : s.natOut,
    why = !out ? '' : out.why === 'busy' ? tt(TX.natBusyL) : out.why === 'retry' ? tt(TX.natRetry, {
      t: hm(out.t)
    }) : out.why === 'soon' ? tt(TX.natSoon, {
      t: zTime(out.t)
    }) : out.why === 'unchanged' ? tt(TX.natUnchanged, {
      t: zTime(out.t),
      d: day(out.d)
    }) : out.why === 'renewed' ? tt(TX.natRenewed, {
      t: zTime(out.t),
      d: day(out.d)
    }) : out.why === 'added' ? tt(TX.natAdded, {
      t: zTime(out.t),
      l: out.l
    }) : out.why === 'nothing' ? tt(TX.natNothing) : out.why === 'same' ? tt(TX.natSame, {
      d: day(out.d)
    }) : tt(TX.natFail);
  if (fresh && !s.natOut?.forced) s.natOut = null;
  box.innerHTML = `<span class="${fresh ? 'f-muted' : 'f-warn'}" data-natstate="${fresh ? 'ok' : st?.present ? 'old' : 'none'}">${esc(text)}</span>${st?.readAt ? ` <span class="f-muted" data-natreadat>(${esc(tt(TX.natReadAt, { t: zTime(st.readAt) }))})</span>` : ''}${out ? ` <span class="fu-natout ${['added', 'nothing', 'unchanged', 'renewed'].includes(out.why) ? 'f-muted' : 'f-warn'}" data-natfail="${esc(out.why)}">${esc(why)}</span>` : ''}${here && !fresh ? ` <button type="button" class="fu-linkbtn" data-do="natread">${esc(tt(TX.natRead))}</button>` : here ? ` <button type="button" class="fu-linkbtn" data-do="natreread">${esc(tt(TX.natReread))}</button>` : ''}`;
  box.hidden = false;
  // SOG-0372 (b) : des routes valides lues : les propositions par des routes NAT d'un autre jour partent
  s.natDay = fresh ? day(st.from) : '';
  s.natFrom = fresh ? st.from : ''; // SOG-0389 : le début du message lu (sa route la plus tôt), ce que natDrop compare
  if (fresh) natDrop(s.natDay, s.natFrom);
  natTrackWarn(s); // et les routes NAT du champ sont comparées aux routes lues
}
/** SOG-0372 (décision de 9 h 37) : une route NAT écrite dans le champ (« NATG », S.natLetters, routeModel natTracks) dont la lettre n'est
 *  pas dans les routes du jour LUES (natState valide, puis aerodb.nat) est dite par une ligne calme « Route NAT G : absente des routes du
 *  16/11 », jamais « point inconnu » ; routes non lues ou périmées : rien. Les lettres lues sont une entrée non sûre (60 au plus, une ou
 *  deux capitales). La dernière demande seule écrit. */
async function natTrackWarn(s) {
  if (!s || gone(s)) return;
  const letters = (s.natLetters || []).slice(0, 12),
    ask = s.natWarnAsk = (s.natWarnAsk || 0) + 1;
  let text = '';
  if (letters.length) {
    const st = await Promise.resolve().then(() => s.ctx.aerodb?.natState?.()).catch(() => null),
      direct = Array.isArray(s.natDirect) ? s.natDirect : [];
    if (st?.present && st.expired === false) {
      const got = await Promise.resolve().then(() => s.ctx.aerodb?.nat?.()).catch(() => null),
        ids = new Set((Array.isArray(got?.tracks) ? got.tracks : []).slice(0, 60).map(t => String(t?.id ?? '').toUpperCase()).filter(x =>
          /^[A-Z]{1,2}$/.test(x)));
      if (ids.size) text = [...letters.filter(l => !ids.has(l)).map(l => tt(TX.natTrackGone, {
        l,
        d: natDay(st.from)
      })), ...direct.filter(x => x.why === 'ends' && ids.has(x.l)).map(x => tt(TX
        .natEnds, { // SOG-0372 : la traversée restée en direct
          l: x.l,
          d: natDay(st.from)
        }))].join(' · ');
    } else // SOG-0372 : les routes du jour non lues (ou périmées) — la traversée est un direct, et la ligne le dit (jamais en silence)
      text = letters.map(l => tt(TX.natUnread, {
        l
      })).join(' · ');
  }
  const box = S === s && !gone(s) && ask === s.natWarnAsk ? s.body?.querySelector('[data-natwarn]') : null;
  if (!box) return;
  box.textContent = text;
  box.hidden = !text;
}
/** SOG-0372 : les routes NAT du jour lues et valides, placées par aerodb (natTracks), pour déplier « NATx » dans la route ; null sans
 *  routes valides. Gardées par lecture (la date et la fin de validité de l'état) : relues quand de nouvelles routes sont lues. */
async function natForModel(s) {
  const A = s?.ctx?.aerodb;
  if (typeof A?.natState !== 'function' || typeof A?.natTracks !== 'function') return null;
  const st = await Promise.resolve().then(() => A.natState()).catch(() => null);
  if (!st?.present || st.expired !== false) return null;
  const key = `${st.from || ''}|${st.validUntil || ''}`;
  if (s.natModel?.key === key) return s.natModel.tracks;
  const tracks = await Promise.resolve().then(() => A.natTracks()).catch(() => null);
  if (!Array.isArray(tracks)) return null;
  s.natModel = {
    key,
    tracks
  };
  return tracks;
}
/** Le jour d'un instant ISO, « JJ/MM » (la forme du `issued` des itinéraires, route_engine natOf) ; « ? » sans instant. */
const natDay = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '?';
/** SOG-0389 : le jour « JJ/MM » d'une route NAT (`issued`, le début de SA validité) est-il AVANT le jour où commence le message lu
 *  (`from`, ISO : sa route la plus tôt) ? L'année est celle du message, à six mois près (un 30/12 lu le 02/01 est de l'année d'avant).
 *  Faux sans jour lisible : rien n'est retiré sur un doute. */
function natBefore(issued, from) {
  const m = /^(\d{2})\/(\d{2})$/.exec(issued || ''),
    f = Date.parse(from || '');
  if (!m || !Number.isFinite(f)) return false;
  const F = new Date(f),
    y = F.getUTCFullYear(),
    mo = +m[2] - 1,
    yr = mo - F.getUTCMonth() > 6 ? y - 1 : F.getUTCMonth() - mo > 6 ? y + 1 : y;
  return Date.UTC(yr, mo, +m[1]) < Date.UTC(y, F.getUTCMonth(), F.getUTCDate());
}
/** SOG-0372 (b) : des routes NAT du jour `d` (« JJ/MM ») sont lues — un itinéraire affiché qui passe par des routes NAT d'un autre
 *  message (périmées, ou qui commencent avant le message lu) est retiré de la liste, de la réponse gardée et de la Carte ; la ligne le
 *  dit et propose de recalculer. Le choix et la ligne montrée suivent leur itinéraire. Rien si aucun n'est concerné.
 *  SOG-0389 : `issued` est le jour où commence la route NAT de l'itinéraire, pas celui du message — les routes vers l'est de la nuit
 *  commencent le lendemain (un vol de 21 h 35Z par la route V du 17/11, message du 16/11) : jamais comparé au jour du message (cela
 *  retirait les trois itinéraires d'un KABQ → EGLL et laissait le direct), seulement à son début `from`. */
function natDrop(d, from) {
  const R = S?.ralts;
  if (!R?.list?.length || !/^\d{2}\/\d{2}$/.test(d || '')) return;
  const other = a => !!a?.nat?.tracks?.length && (a.nat.stale || natBefore(a.nat.issued, from));
  if (!R.list.some(other)) return;
  const keep = R.list.map((a, i) => [a, i]).filter(([a]) => !other(a)),
    at = k => keep.findIndex(([, i]) => i === k);
  if (R.answer) R.answer = {
    ...R.answer,
    alternatives: keep.map(([, i]) => R.answer.alternatives?.[i]).filter(Boolean)
  };
  R.chosen = R.chosen >= 0 ? at(R.chosen) : -1;
  if (Number.isInteger(R.shown) && R.shown >= 0) R.shown = at(R.shown);
  R.list = keep.map(([a]) => a);
  R.natDropped = {
    d
  };
  routeAltsDraw();
  altsPublish('compute', R.list);
}
/** SOG-0352 : « Lire les routes NAT du jour » — le travail du lanceur (aerodb.natEnsure : base/update zones nat), puis la ligne relue ;
 *  un poste occupé ou un échec dits. */
async function natRead(force = false) {
  const s = S;
  if (!s || s.natBusy || !natHere()) return;
  // SOG-0413 (b, piège dit par AeroDB) : un lien toujours présent ne martèle pas la source — pas deux relectures réussies à moins d'une
  // minute ; dit, sans rien demander
  if (force && s.natOkAt && Date.now() - s.natOkAt < 60000) {
    s.natOut = {
      why: 'soon',
      t: new Date(s.natOkAt).toISOString(),
      forced: true
    };
    return natLine();
  }
  s.natBusy = true;
  s.natOut = null;
  // SOG-0413 : les routes détenues avant la relecture, par sens, pour dire ce qu'elle a apporté
  const before = force ? await natDirsNow(s) : null;
  natLine();
  const r = await Promise.resolve().then(() => s.ctx.aerodb?.natEnsure?.(force ? {
    force: true
  } : undefined)).catch(() => null);
  s.natBusy = false;
  if (gone(s)) return;
  if (force) {
    const after = r?.refreshed ? await natDirsNow(s) : null;
    if (gone(s)) return;
    const add = after && before ? [
      [after.e.n - before.e.n, TX.natAddedE],
      [after.w.n - before.w.n, TX.natAddedW]
    ].filter(([n]) => n > 0).map(([n, row]) => tt(row, {
      n
    })) : after ? [after.e.n ? tt(TX.natAddedE, {
      n: after.e.n
    }) : '', after.w.n ? tt(TX.natAddedW, {
      n: after.w.n
    }) : ''].filter(Boolean) : [];
    s.natOut = !r ? {
      why: 'fail',
      forced: true
    } : r.busy ? {
      why: 'busy',
      forced: true
    } : r.retryAt ? {
      why: 'retry',
      t: String(r.retryAt),
      forced: true
    } : r.ok === false ? {
      why: 'fail',
      forced: true
    } : r.unchanged ? {
      why: 'unchanged',
      t: new Date().toISOString(),
      d: r.from || '',
      forced: true
    } : add.length ? {
      why: 'added',
      t: new Date().toISOString(),
      l: add.join(', '),
      forced: true
    } : r.refreshed ? {
      why: 'renewed',
      t: new Date().toISOString(),
      d: r.from || '',
      forced: true
    } : {
      why: 'nothing',
      forced: true
    };
    if (r?.refreshed) s.natOkAt = Date.now();
    return natLine();
  }
  // SOG-0372 (a) : la raison d'une lecture sans routes valides, dite dans la ligne (le poste occupé, l'essai trop tôt après un échec,
  // l'échec, ou un message lu sans routes plus récentes) ; des routes valides : rien à dire
  s.natOut = r?.present && r.expired === false ? null : !r ? {
    why: 'fail'
  } : r.busy ? {
    why: 'busy'
  } : r.retryAt ? {
    why: 'retry',
    t: String(r.retryAt)
  } : r.ok === false ? {
    why: 'fail'
  } : {
    why: 'same',
    d: r.from || ''
  };
  natLine();
}
// ---------------------------------------------------------------- la durée d'un calcul de route (SOG-0134)
// Refusé en recette le 11/11 (« toujours pareil. instable, lent. ») sans un fait : le poste de l'utilisateur les donne lui-même. Quatre
// instants du dernier calcul (l'appui, le départ de la demande au lanceur, la réponse, la liste dessinée) et, la Carte à côté, son dessin
// des tracés (l'événement maps-route-alts-drawn) ; gardés sur l'appareil (cache/fuel/route_timing.json, jamais envoyé), en millisecondes,
// sans route ni adresse au-delà de départ → arrivée. Au-delà de 3 s, la ligne le dit en clair, avec « Copier le diagnostic ».
const ROUTE_TIMING = 'cache/fuel/route_timing.json',
  SLOW_MS = 3000;
/** SOG-0283 (Sécurisation, audit 170) : le vol est écrit par n'importe quel appareil ; du départ et de l'arrivée, seul un indicatif reconnu
 *  (lettres et chiffres, 12 signes au plus, la règle du nom d'un point du direct) entre dans le document de l'appareil et le diagnostic ;
 *  sinon « ? ». */
const codeOrQ = v => {
  const t = String(v ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{2,12}$/.test(t) ? t : '?';
};
/** L'attente visible dès l'appui : les deux boutons occupés, « Calcul en cours… » puis ses secondes au-delà de 2 s ; libérés à la fin. */
function routeBusy(s, on, act = '') {
  s.routeBusy = on;
  clearInterval(s.rbusyTimer);
  for (const b of s.body?.querySelectorAll('[data-do="rcompute"], [data-do="rcheck"]') || []) {
    b.disabled = on;
    b.setAttribute('aria-busy', on ? 'true' : 'false');
  }
  if (!on) return;
  s.rtime = {
    act,
    t0: performance.now(),
    at: new Date().toISOString(),
    dep: codeOrQ(s.flight.route?.dep),
    arr: codeOrQ(s.flight.route?.arr)
  };
  const line = s.body?.querySelector('[data-rtime]');
  if (line) line.hidden = true;
  s.rbusyTimer = setInterval(() => {
    const el = s.body?.querySelector('[data-rbusy]'),
      sec = Math.floor((performance.now() - s.rtime.t0) / 1000);
    if (!el || gone(s)) return clearInterval(s.rbusyTimer);
    if (sec >= 2) el.textContent = tt(TX.rBusyS, {
      s: sec
    });
  }, 500);
}
/** La liste dessinée (après la peinture de la page) : t3, puis la ligne et le document de l'appareil. */
function routeDrawn(s) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (gone(s) || !s.rtime) return;
    s.rtime.t3 = performance.now();
    routeTiming(s);
  }));
}
/** Les durées du dernier calcul (ms) : joindre le lanceur (l'appui → la demande), le lanceur (demande → réponse), le dessin de la liste,
 *  celui de la Carte s'il est arrivé, le total. */
function timingOf(T) {
  const ms = v => Number.isFinite(v) ? Math.max(0, Math.round(v)) : null;
  return {
    reach: ms(T.t1 - T.t0),
    launcher: ms(T.t2 - T.t1),
    draw: ms(T.t3 - T.t2),
    map: ms(T.t4 - T.t2),
    total: ms(Math.max(T.t3 || 0, T.t4 || 0) - T.t0)
  };
}
/** La ligne du calcul : rien sous 3 s ; au-delà, la durée et sa plus grande part (« Calculé en 7,4 s — dont 6,8 s chez le lanceur. »),
 *  avec « Copier le diagnostic » ; le document de l'appareil écrit. */
function routeTiming(s) {
  const T = s.rtime,
    d = timingOf(T),
    line = s.body?.querySelector('[data-rtime]');
  s.ctx.data.put(ROUTE_TIMING, {
    schema: 1,
    at: T.at,
    action: T.act,
    route: `${T.dep} → ${T.arr}`,
    ms: d
  })?.catch?.(() => {});
  if (!line) return;
  if (!(d.total > SLOW_MS)) return void(line.hidden = true);
  const sec = v => (v / 1000).toLocaleString(s.ctx.lang(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }),
    parts = [
      ['launcher', TX.rTimeLauncher],
      ['draw', TX.rTimeDraw],
      ['map', TX.rTimeMap],
      ['reach', TX.rTimeCheck]
    ].filter(([k]) => d[k] != null).sort((a, b) => d[b[0]] - d[a[0]]),
    [k, row] = parts[0];
  line.innerHTML = `${esc(tt(row, { t: sec(d.total), p: sec(d[k]) }))} <button type="button" class="fu-linkbtn" data-do="rtimecopy">${esc(tt(TX.rTimeCopy))}</button>`;
  line.dataset.part = k;
  line.hidden = false;
}
/** « Copier le diagnostic » : les durées du dernier calcul en une ligne, sans rien d'autre que départ → arrivée. */
async function routeTimingCopy() {
  const T = S.rtime;
  if (!T) return;
  const d = timingOf(T),
    text = `SOG route ${T.act} ${T.dep} → ${T.arr} · ${T.at} · reach ${d.reach} ms · launcher ${d.launcher} ms · draw ${d.draw} ms · map ${d.map ?? '—'} ms · total ${d.total} ms`;
  // SOG-0468 (1) : « copié » seulement s'il l'est ; le texte seulement montré : « copiez-le à la main »
  await copyAndTell(S.ctx, text, {
    ok: tt(TX.rTimeCopied),
    manual: tt(TX.copyManual)
  });
}
/** « N écarts aux règles » n'est jamais un nombre seul (SOG-0134) : un pli dont le titre dit le nombre et qui liste chaque écart — son
 *  segment, sa règle (l'identifiant du RAD ou du point FRA, sinon son genre), la phrase du moteur — sept lignes puis « N autres ». */
function faultsHtml(lines, plan = null) {
  const li = l => `<li data-fault>${[l.seg ? `<b>${esc(l.seg)}</b>` : '<b>—</b>', l.ruleId || l.kind ? `<span class="fu-faultrule">${esc(l.ruleId || tt(TX.rKinds[l.kind] || TX.rKinds.altitude))}</span>` : '', l.text ? esc(l.text) : ''].filter(Boolean).join(' · ')}</li>`;
  // SOG-0081 : un contrôle incomplet le dit en titre et en première ligne, avec ses raisons « revue » quand il en a
  const inc = plan?.incomplete ? `<li data-incomplete><b>${esc(tt(TX.rIncomplete))}</b> · ${esc(plan.reviews?.length ? plan.reviews.join(' · ') : tt(TX.rIncompleteWhy))}</li>` : '';
  return `<details class="fu-rfaults" data-faults data-rcheck><summary class="f-warn">${esc([lines.length ? tt(TX.rCheckN, { n: lines.length }) : '', plan?.incomplete ? tt(TX.rIncomplete) : ''].filter(Boolean).join(' · '))}</summary><ul class="fu-faultlist">${inc}${lines.slice(0, 7).map(li).join('')}</ul>${lines.length > 7 ? `<details class="fu-faultmore" data-faultmore><summary class="f-muted">${esc(tt(TX.rMore, { n: lines.length - 7 }))}</summary><ul class="fu-faultlist">${lines.slice(7).map(li).join('')}</ul></details>` : ''}</details>`;
}
/** Le partage d'un itinéraire (SOG-0161) : « contrôlé 22 % · incomplet 65 % · repli 14 % » (l'erreur si elle a une part) ; « contrôlé »
 *  seul seulement à 100 % ; '' sans contrôle. */
function shareText(c, proposal = false) {
  if (!c) return '';
  if (c.controlledPct >= 100 && !proposal) return tt(TX.rCtrl.controlled); // une proposition n'est jamais dite « contrôlé » seul
  return [
    ['error', c.errorPct], // SOG-0532 (l'ergonome) : la part en infraction d'abord, le plus grave
    ['controlled', c.controlledPct],
    ['incomplete', c.incompletePct],
    ['fallback', c.fallbackPct]
  ].filter(([, v]) => v > 0).map(([k, v]) => tt(TX.rShare[k], {
    v
  })).join(' · '); // SOG-0532 (l'ergonome) : chaque nombre porte son mot, les parts nulles omises (insécables : jamais « 14 / % »)
}
/** Le pli des tronçons d'un itinéraire, par couche (SOG-0161) : « SID · LFPO–ROTOX · repli · 12 NM · <raison> », sept puis « N autres ». */
function sectionsHtml(a) {
  const list = a?.control?.sections || [];
  if (!list.length) return '';
  // SOG-0134 : la nature du tronçon (voie, DCT, FRA, SID, STAR, approche), d'après la voie de son premier segment et sa couche, dite
  // avec le trait et le mot de la légende commune (frame/lib/route_legend.js, la même que la Carte)
  const natOf = x => RL.natureOf((a.segments || []).find(g => g.from === x.from)?.via, x.layer);
  // la nature connue : son trait et son mot, la couche entre parenthèses seulement quand elle ajoute (« Voie (HIGH) ») ; sinon la couche
  const head = x => {
    const n = natOf(x),
      word = RL.labelOf(n, S.ctx.lang());
    if (!n) return `<b>${esc(x.layer || '—')}</b>`;
    return `<b>${RL.legendHtml(S.ctx.lang(), [n], { hint: false })}</b>${x.layer && !word.startsWith(x.layer) ? ` <span class="f-muted">(${esc(x.layer)})</span>` : ''}`;
  };
  const li = x => `<li data-section="${esc(x.control)}" data-layer="${esc(x.layer)}" data-nature="${esc(natOf(x))}">${[head(x), esc(`${x.from}–${x.to}`), `<span class="fu-ctrl-${esc(x.control)}">${esc(tt(TX.rCtrl[x.control]))}</span>`, x.nm !== null ? esc(`${x.nm} NM`) : '', x.reason ? esc(x.reason) : ''].filter(Boolean).join(' · ')}</li>`;
  return `<details class="fu-rsections" data-sections><summary class="f-muted">${esc(tt(TX.rSections, { n: list.length }))}</summary><ul class="fu-faultlist">${list.slice(0, 7).map(li).join('')}</ul>${list.length > 7 ? `<details class="fu-faultmore"><summary class="f-muted">${esc(tt(TX.rMore, { n: list.length - 7 }))}</summary><ul class="fu-faultlist">${list.slice(7).map(li).join('')}</ul></details>` : ''}</details>`;
}
/** La ligne du RAD dans Données (application Maintenance, source eurocontrol_rad du catalogue d'AeroDB) : le lien du « no-rad ». */
const RAD_DATA_HREF = '?app=maintenance#data?source=eurocontrol_rad';
/** Ce que le contrôle ne couvre pas (le contrat le demande : « aucune incompatibilité » ne vaut que pour ce qui est contrôlé) : la phrase
 *  du moteur et ses domaines hors contrôle, repliés. */
const limitsHtml = n => perfDefaultHtml() + (n.limitation || n.gaps.length || n.rad ? `<details class="fu-rlimits" data-rlimits><summary class="f-muted">${esc(tt(TX.rLimits))}</summary>${n.limitation ? `<p class="f-muted">${esc(n.limitation)}</p>` : ''}${n.gaps.map(g => `<p class="f-muted"><b>${esc(g.name)}</b> ${esc(g.reason)}</p>`).join('')}${terrainHtml(n.rad?.terrain_rules)}${n.rad ? '<div data-radlist></div>' : ''}</details>` : '');
/** SOG-0539 (l'ergonome) : les règles du RAD qui citent un terrain du vol et un espace non lu — un fait du VOL, hors de tout verdict : une
 *  fois par écran, dans « Ce que le contrôle ne couvre pas » (liste et « Contrôler »), le départ d'abord, aucune ligne à 0 ; chaque ligne
 *  est un repli (le chevron seul) qui s'ouvre sur ses références à la suite (esc : elles viennent du RAD), 40 au plus, « et N autres » à
 *  la fin. */
function terrainHtml(list) {
  return (Array.isArray(list) ? list : []).filter(x => x.total > 0).map(x => `<details class="fu-faultmore fu-rterrain" data-terrainrules data-role="${esc(x.role)}"><summary>${esc(tt(x.total === 1 ? RR.ROWS.terrainRules1 : RR.ROWS.terrainRules, { ad: x.ad, n: x.total }))}</summary><p class="f-muted" data-terrainrefs>${esc(x.rules.slice(0, 40).join(', '))}${x.total > 40 ? ` <span data-terrainmore>${esc(tt(RR.ROWS.more, { n: x.total - 40 }))}</span>` : ''}</p></details>`).join('');
}
/** SOG-0401 : le détail du contrôle RAD, écrit à l'ouverture du pli seulement (la liste peut compter 1 500 conditions) — les espaces
 *  inconnus et leurs règles, puis les conditions laissées à examiner (cent au plus, puis leur nombre). */
function radListFill(fold) {
  const box = fold?.querySelector('[data-radlist]'),
    R = S.ralts?.n?.rad;
  if (!box || !R || box.dataset.filled) return;
  box.dataset.filled = '1';
  const rev = R.items.filter(x => /examin|review|interpr/i.test(x.assessment)),
    li = x => `<li><b>${esc(x.id)}</b>${x.reason ? ` · ${esc(x.reason)}` : ''}</li>`;
  box.innerHTML = `${R.unknown_spaces.length ? `<p class="f-muted"><b>${esc(tt(TX.rRadSpaces))}</b></p><ul class="fu-faultlist" data-radspaces>${R.unknown_spaces.map(u => `<li><b>${esc(u.space)}</b>${u.rules.length ? ` · ${esc(u.rules.join(', '))}` : ''}</li>`).join('')}</ul>` : ''}${rev.length ? `<p class="f-muted"><b>${esc(tt(TX.rRadReview))}</b></p><ul class="fu-faultlist" data-radreview>${rev.slice(0, 100).map(li).join('')}</ul>${rev.length > 100 ? `<p class="f-muted">${esc(tt(TX.rMore, { n: rev.length - 100 }))}</p>` : ''}` : ''}${R.cut ? `<p class="f-muted">${esc(tt(TX.rRadCut, { n: R.listed, t: R.total }))}</p>` : ''}`;
}
/** SOG-0402 : le message de plan de vol du vol courant (modules/fuel/fpl.js) — identifiant de la page (neutre par défaut), type OACI et
 *  sillage (catalogue d'aerodb), départ à l'heure du vol (sinon maintenant, arrondi), vitesse vraie et niveau du devis, route du
 *  vol, durée estimée (en vol), dégagement ; null sans départ, arrivée ni route. */
/** SOG-0483 : les lieux en clair du départ, de l'arrivée et du dégagement pour la case 18 (DEP/, DEST/, ALTN/) : le nom gardé par le
 *  champ de terrain (S.AD.nameKnown), la position du premier ou du dernier point de la route quand il porte ce code. */
function fplPlaces(r) {
  const pts = Array.isArray(r.points) ? r.points : [],
    at = (code, p) => ({
      name: (code && S.AD?.nameKnown?.(code)) || '',
      lat: p && String(p.id || '').toUpperCase() === code ? +p.lat : NaN,
      lon: p && String(p.id || '').toUpperCase() === code ? +p.lon : NaN
    }),
    up = v => String(v || '').toUpperCase();
  return {
    dep: at(up(r.dep), pts[0]),
    arr: at(up(r.arr), pts.at(-1)),
    altn: at(up(r.altn), null)
  };
}

function fplOf(C) {
  const f = S.flight,
    r = f.route || {},
    q = C?.q;
  if (!r.dep || !r.arr || !String(r.text || '').trim()) return null;
  const type = String(f.aircraft?.type || C?.sheet?.icao || '').toUpperCase(),
    eobt = FPL.eobtOf(f.planned_at);
  return {
    eobt,
    m: FPL.message({
      id: S.fplId || FPL.NEUTRAL_ID,
      type,
      wake: S.A?.classify?.(type)?.wtc || '',
      dep: r.dep,
      arr: r.arr,
      altn: r.altn,
      // SOG-0483 : le lieu d'une hélistation (pas d'indicateur OACI) — le nom que la base donne, la position du point de la route
      places: fplPlaces(r),
      reg: f.aircraft?.registration || '',
      eobt,
      speedKt: +q?.cruise?.tas || +C?.sheet?.cruise?.tasKt || 0,
      levelFt: +C?.levelFt || 0,
      routeText: r.text,
      eetMin: +q?.minutes || 0
    })
  };
}
/** SOG-0402 : « Copier pour Eurocontrol » et son pli : le texte à relire, l'identifiant à changer, ce qui est supposé (équipement,
 *  identifiant, heure), ce qui n'est pas contrôlé (procédures absentes, routes océaniques), et les règles de forme qui échouent.
 *  `textOnly` : le texte et les notes seulement (la saisie de l'identifiant garde son champ et son curseur). */
function fplDraw(C, textOnly = false) {
  const box = S.body?.querySelector('[data-fpl]');
  if (!box) return;
  const F = fplOf(C);
  if (!F) {
    box.innerHTML = '';
    return;
  }
  const r = S.flight.route || {},
    n = F.m.notes,
    when = zTime(F.eobt.at.toISOString().slice(0, 16) + 'Z'),
    notes = [...fplDirectNotes(F.m), tt(TX.fplNeutral, {
      id: FPL.NEUTRAL_ID
    }), tt(TX.fplEquip, {
      e: FPL.EQUIPMENT,
      p: FPL.PBN
    }), tt(n.now ? TX.fplNow : TX.fplAt, {
      t: when
    }), n.sid ? '' : tt(TX.fplNoSid, {
      ad: r.dep
    }), n.star ? '' : tt(TX.fplNoStar, {
      ad: r.arr
    }), n.oceanic ? tt(TX.fplOceanic) : '', n.hf ? tt(TX.fplNoHf) : '', ...(n.rounded || []).map(([a, b]) => tt(TX.fplLevelTens, {
      a,
      b
    })), n.regNeutral ? tt(TX.fplRegNeutral, {
      r: FPL.regWord(FPL.NEUTRAL_ID)
    }) : '', ...(n.joined || []).slice(0, 4).map(v => tt(TX.fplJoined, {
      v
    })), n.wake ? tt(TX.fplWake) : ''].filter(Boolean),
    bad = F.m.errors.length ? tt(TX.fplBad, {
      l: fplErrs(F.m)
    }) : '',
    inner = `<pre class="fu-fpltext" data-fpltext>${esc(F.m.text)}</pre>${bad ? `<p class="f-warn" data-fplbad>${esc(bad)}</p>` : ''}<ul class="fu-fplnotes" data-fplnotes>${notes.map(x => `<li class="f-muted">${esc(x)}</li>`).join('')}</ul>`;
  if (textOnly && box.querySelector('[data-fplbody]')) {
    box.querySelector('[data-fplbody]').innerHTML = inner;
    return;
  }
  const open = !!box.querySelector('details[data-fplfold]')?.open,
    stale = routeStale(C), // SOG-0533 : dit AVANT de copier, au-dessus du bouton (la copie reste permise)
    vio = routeViolations(); // SOG-0532 (4) : de même pour une route qui enfreint des règles connues
  box.innerHTML = `${vio ? `<p class="f-warn" data-fplviolations>${esc(tt(TX.fplViolations, { n: vio }))}</p>` : ''}${stale ? `<p class="f-warn" data-fplstale>${esc(tt(TX.fplStale, stale))}</p>` : ''}<div class="f-row"><button type="button" data-do="fplcopy"${bad ? ' aria-disabled="true"' : ''}>${esc(tt(TX.fplCopy))}</button></div><details class="fu-fpl" data-fplfold${open ? ' open' : ''}><summary class="f-muted">${esc(tt(TX.fplFold))}</summary><label class="f-field">${esc(tt(TX.fplId))}<input data-k="fplid" class="fu-code" value="${esc(S.fplId || FPL.NEUTRAL_ID)}" maxlength="7" autocapitalize="characters" autocomplete="off" spellcheck="false"></label><div data-fplbody>${inner}</div></details>`;
}
/** SOG-0529 (2) : une route qui n'est qu'un direct — « aucune route calculée … : calculez-en une ou saisissez-la », puis : si le contrôle
 *  de route d'AeroDB a jugé CE texte (« Contrôler », S.rcheck) et y a trouvé des écarts, SES phrases (RE.faultLines, trois au plus) ;
 *  sinon sa longueur seulement (« un direct de … NM ; les directs sont limités par Eurocontrol selon la région »), jamais une prédiction.
 *  [] pour une vraie route. */
function fplDirectNotes(m) {
  if (!m?.notes?.direct) return [];
  const r = S.flight.route || {},
    nm = +S.C?.nm,
    rc = S.rcheck && S.rcheck.text === String(r.text || '') ? S.rcheck : null,
    judged = rc ? RE.faultLines({
      segments: rc.segments,
      errors: rc.errors
    }).slice(0, 3).map(l => [l.seg, l.text].filter(Boolean).join(' : ')).filter(Boolean) : [];
  return [tt(TX.fplDirect, {
    dep: String(r.dep || '').toUpperCase(),
    arr: String(r.arr || '').toUpperCase()
  }), ...(judged.length ? judged : [Number.isFinite(nm) && nm > 0 ? tt(TX.fplDirectLong, {
    d: Math.round(nm)
  }) : ''])].filter(Boolean);
}
/** SOG-0402 : les règles de forme qui échouent, dites ; SOG-0422 : l'élément de route hors forme cité (un tiret, une ponctuation). */
function fplErrs(m) {
  return m.errors.map(k => tt(TX.fplErr[k], {
    t: (m.notes?.bad || []).slice(0, 3).join(' ')
  })).join(', ');
}
/** SOG-0402 : copie le message, seulement quand ses règles de forme passent ; sinon le pli s'ouvre sur ce qui échoue. */
async function fplCopy() {
  const F = fplOf(S.C),
    fold = S.body?.querySelector('details[data-fplfold]');
  if (!F) return;
  if (F.m.errors.length) {
    if (fold) fold.open = true;
    return S.ctx.notify(tt(TX.fplBad, {
      l: fplErrs(F.m)
    }), 'warn');
  }
  const how = await copyText(F.m.text),
    shown = how === 'shown', // SOG-0468 (1) : le texte seulement montré — jamais « copié »
    hf = !!F.m.notes.hf;
  if (fold) fold.open = true;
  // SOG-0422 (a) : UNE notification : sur une route océanique sans HF dans l'équipement supposé, la copie dit l'avertissement elle-même
  // (une seconde note attendrait derrière la première sur un téléphone et ne serait pas lue) ; l'équipement n'est jamais inventé
  // SOG-0529 (2) : une route qui n'est qu'un direct : la même notification dit quoi faire, et prévient d'un direct long
  // SOG-0533 : une route calculée pour un autre niveau : la notification le redit
  const direct = fplDirectNotes(F.m).join(' '),
    st = routeStale(S.C),
    nv = routeViolations(),
    stale = [nv ? tt(TX.fplViolations, {
      n: nv
    }) : '', st ? tt(TX.fplStale, st) : ''].filter(Boolean).join(' ');
  S.ctx.notify(`${shown ? `${tt(TX.copyManual)}${hf ? ` ${tt(TX.fplNoHf)}` : ''}` : tt(hf ? TX.fplCopiedHf : TX.fplCopied)}${direct ? ` ${direct}` : ''}${stale ? ` ${stale}` : ''}`,
    shown || hf || direct || stale ? 'warn' : 'ok');
}
/** SOG-0398 : l'attente au plus des lectures de la base pour la ligne du dégagement (terrain, couverture). */
const ALTN_CHK_WAIT_MS = 4000;
/** SOG-0398 : l'enregistrement COMPLET d'un terrain (hardLen, runways) ; sur une zone découpée, aerodromes({ icao }) peut rendre l'élément
 *  léger de l'index (sans piste) : l'enregistrement complet est alors lu par une petite boîte autour du terrain (aerodromes.json de la
 *  zone, lu une fois et gardé par aerodb). Aucun appel hors de la base. */
async function altnAdOf(id) {
  const A = S.ctx.aerodb,
    one = ((await A?.aerodromes?.({
      icao: id
    }).catch(() => null)) || [])[0] || null;
  if (!one || one.hardLen != null || Array.isArray(one.runways) || !one.lite || !Number.isFinite(+one.lat) || !Number.isFinite(+one
      .lon)) return one;
  const d = 0.05,
    rows = await A.aerodromes({
      bbox: [+one.lon - d, +one.lat - d, +one.lon + d, +one.lat + d]
    }).catch(() => null);
  return (rows || []).find(x => String(x?.icao || x?.id || '').toUpperCase() === id) || one;
}
/** SOG-0398 lot 1 : sous les terrains, la ligne du dégagement — un signe, une phrase (le pire critère ; les bons et les non vérifiés
 *  comptés), et le détail des trois critères dans un pli (modules/fuel/altn_check.js) : PISTE (longueur mini de la fiche contre la plus
 *  longue piste du bon revêtement), MOYENS (la couverture des procédures, aerodb.coverage), MÉTÉO (le TAF déjà lu par l'étape Météo, une
 *  heure avant et après l'arrivée au dégagement : départ du vol + durée du vol + trajet du dégagement). Rien sans dégagement. Le terrain
 *  et sa couverture lus une fois par code ; aucun appel au réseau de plus que ceux de Météo. */
async function altnChkDraw(C) {
  const box = S?.body?.querySelector('[data-altnchk]');
  if (!box) return;
  const s = S,
    id = String(S.flight.route?.altn || '').toUpperCase().trim();
  altnPropStale();
  if (!isIcao(id)) {
    box.innerHTML = altnPropHtml();
    return;
  }
  if (S.altnData?.id !== id) {
    S.altnData = {
      id,
      pending: true
    };
    // une base qui ne répond pas (non réglée, lente) ne laisse jamais la ligne vide : au-delà d'ALTN_CHK_WAIT_MS, « non vérifié »
    const late = () => new Promise(r => setTimeout(() => r(null), ALTN_CHK_WAIT_MS)),
      [ad, cov] = await Promise.all([Promise.race([altnAdOf(id).catch(() => null), late()]), Promise.race([Promise.resolve(S.ctx.aerodb
        ?.coverage?.(id)).catch(() => null), late()])]);
    if (gone(s) || S.altnData?.id !== id) return;
    S.altnData = {
      id,
      ad,
      cov
    };
    return altnChkDraw(S.C);
  }
  if (S.altnData.pending) return;
  // SOG-0528 (l'utilisateur : « LFMT - LFRN - LFFI, c'est valable. si on change lfrn par lfqq, lffi n'est pas annoncé comme non
  // valable ») : la position de l'arrivée, relue quand l'arrivée change ; la ligne se dessine sans elle en attendant (rien de vide)
  const arrId = String(S.flight.route?.arr || '').toUpperCase().trim();
  if (S.altnArr?.arr !== arrId) {
    S.altnArr = {
      arr: arrId,
      pending: true
    };
    Promise.race([altnArrPos(S.flight.route || {}).catch(() => null), new Promise(r => setTimeout(() => r(null), ALTN_CHK_WAIT_MS))])
      .then(pos => {
        if (gone(s) || S.altnArr?.arr !== arrId) return;
        S.altnArr = {
          arr: arrId,
          pos
        };
        altnChkDraw(S.C);
      });
  }
  const sheet = C?.sheet || null,
    q = C?.q,
    dep = Date.parse(S.flight.planned_at || ''),
    min = Number.isFinite(+q?.minutes) ? +q.minutes + (Number.isFinite(+q?.alternate?.min) ? +q.alternate.min : 0) : NaN,
    t = Number.isFinite(dep) && Number.isFinite(min) ? Math.round(dep / 1000 + min * 60) : null,
    crits = [AC.runwayOf(S.altnData.ad, sheet?.minRunwayLengthFt, sheet?.runwayType), AC.aidsOf(S.altnData.cov),
      AC.weatherOf(S.wx?.taf?.[id] || null, t, {
        read: !!S.wx,
        noTaf: !!S.wx?.noTaf
      }),
      // SOG-0528 : la distance de l'arrivée (règle de la proposition), dite seulement hors des bornes ; jamais le dégagement retiré
      AC.distOf(altnArrNm(S.altnArr?.pos, S.altnData.ad))
    ].filter(Boolean),
    J = AC.judge(crits),
    SIGN = {
      ok: '✓',
      warn: '!',
      err: '✕',
      grey: '?'
    },
    w = crits.filter(c => c.state === J.state).map(c => tt(TX.altnK[c.k])).join(', '),
    fmt = n => Number(n).toLocaleString(S.ctx.lang()),
    why = c => ['wxNotRead', 'wxNoTaf', 'wxNoKey'].includes(c.code) && (S.wxBusy || S.wxFail) ? (S.wxBusy ? tt(TX.altnWhy.wxReading) : tt(
      TX.altnWhy
      .wxFailed, {
        why: S.wxFail
      })) : tt(TX.altnWhy[c.code], {
      ...c.v,
      l: c.v.l != null ? fmt(c.v.l) : '',
      m: c.v.m != null ? fmt(c.v.m) : '',
      s: tt(c.v.hard === false ? TX.altnAny : TX.altnHard),
      t: String(sheet?.runwayType || '').slice(0, 12)
    }),
    open = !!box.querySelector('details[data-altnfold]')?.open,
    count = J.state === 'ok' ? '' : ` <span class="f-muted" data-altncount>${esc(tt(J.grey ? TX.altnCount : TX.altnCountOk, { ok: J.ok, g: J.grey }))}</span>`;
  box.innerHTML = `<p class="fu-altnline" data-state="${J.state}"><span class="fu-altnsign" aria-hidden="true">${SIGN[J.state]}</span><span data-altnhead>${esc(tt(TX.altnChk[J.state], { id, w }))}${count}</span></p><details class="fu-altnfold" data-altnfold${open ? ' open' : ''}><summary class="f-muted">${esc(tt(TX.altnFold))}</summary><ul>${crits.map(c => `<li data-crit="${c.k}" data-state="${c.state}"><span class="fu-altnsign" aria-hidden="true">${SIGN[c.state]}</span><span>${esc(why(c))}</span>${altnReadHtml(c, id)}</li>`).join('')}<li class="f-muted" data-altnnote><span class="fu-altnsign" aria-hidden="true"></span><span>${esc(tt(TX.altnWxNote))}</span></li></ul></details>${altnPropHtml()}`;
}
/** SOG-0398 lot 2 : le document local des terrains proposés, pour la Carte (INTEGRATION § 3 ter) : cet appareil seulement (politique
 *  cache), jamais data/, écrit par Carburant seul, avec l'événement fuel-altn-candidates. */
const ALTN_DOC = 'cache/fuel/altn_candidates.json',
  // la lecture des terrains autour de l'arrivée (aerodromes.json des zones) attend au plus tant
  ALTN_PROP_WAIT_MS = 8000;
const ALTN_SIGN = {
  ok: '✓',
  warn: '!',
  err: '✕',
  grey: '?'
};
/** Un nom de terrain venu de la base (texte tiers) : sans caractère de contrôle ni de format, espaces réduits, 60 signes au plus. */
const altnName = v => String(v ?? '').replace(/[\u0000-\u001f\u007f\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
/** La clé du vol d'une proposition : départ, arrivée, aéronef (la Carte et Carburant la tiennent pour périmée quand elle change). */
const altnPropKey = () => {
  const r = S.flight.route || {},
    a = S.flight.aircraft || {};
  return `${String(r.dep || '').toUpperCase()}>${String(r.arr || '').toUpperCase()}>${String(a.sheetId || a.registration || a.type || '').slice(0, 24)}`;
};
/** SOG-0527 (1) (l'utilisateur, LFFI : « la base ne tient pas les procédures à jour » — « pourquoi il n'y a pas un bouton ou un lien
 *  « relire » alors ? ») : sous le critère MOYENS non vérifié (procédures non tenues, ou lues en partie), le geste de lecture de la carte
 *  Procédures pour ce terrain (S.P.readButtonFor : mêmes mots, même appel, rien quand l'État ne se lit pas) ; '' sinon. */
function altnReadHtml(c, id) {
  if (c?.k !== 'aids' || !['aidsNoBase', 'aidsPartial'].includes(c.code) || typeof S.P?.readButtonFor !== 'function') return '';
  const b = S.P.readButtonFor(id, c.code === 'aidsPartial');
  return b ? ` ${b}` : '';
}
/** SOG-0528 : la distance de l'arrivée au dégagement (NM, le trait droit, comme la proposition), ou null sans l'une des positions. */
function altnArrNm(pos, ad) {
  return pos && Number.isFinite(+ad?.lat) && Number.isFinite(+ad?.lon) ? rhumbNm(pos, {
    lat: +ad.lat,
    lon: +ad.lon
  }) : null;
}
/** La position de l'arrivée : le dernier point de la route quand c'est elle, sinon aerodb. */
async function altnArrPos(r) {
  const last = (r.points || []).at(-1);
  if (last && last.id === r.arr && Number.isFinite(+last.lat) && Number.isFinite(+last.lon)) return {
    lat: +last.lat,
    lon: +last.lon
  };
  const c = await Promise.resolve(S.ctx.aerodb?.coords?.(r.arr)).catch(() => null);
  return c && Number.isFinite(+c.lat) && Number.isFinite(+c.lon) ? {
    lat: +c.lat,
    lon: +c.lon
  } : null;
}
/** Les critères et l'état d'un terrain proposé : piste et moyens de la recherche, météo du TAF lu (une heure autour de son arrivée :
 *  départ du vol + durée de l'étape + son dégagement), sinon le mot de la météo inconnue (SOG-0544 : « météo non lue » pour une lecture qui n'a pas eu lieu). */
function altnPropCrits(x) {
  const P = S.altnProp,
    dep = Date.parse(S.flight.planned_at || ''),
    q = S.altnIn?.q,
    min = Number.isFinite(+q?.minutes) && Number.isFinite(+x.cost?.min) ? +q.minutes + +x.cost.min : NaN,
    t = Number.isFinite(dep) && Number.isFinite(min) ? Math.round(dep / 1000 + min * 60) : null,
    wx = AC.weatherOf(P?.taf?.[x.icao] || null, t, {
      read: !!P?.wxRead?.has(x.icao),
      noTaf: !!P?.noTaf
    }),
    crits = [x.rwy, x.aids, wx];
  return {
    crits,
    // SOG-0544 : la lecture de ce terrain n'a pas eu lieu (hors ligne, ou la couche météo en échec)
    miss: !!P?.wxMiss?.has(x.icao),
    ...AC.proposalOf(crits)
  };
}
/** SOG-0544 : les mots d'une réserve d'un terrain proposé — la phrase existante d'une météo inconnue (TX.altnWhy, ses heures), « météo
 *  non lue » suivi de sa raison (« source météo injoignable », ou la clé météo absente), sinon le mot court ; [[texte, court]]. */
const ALTN_WX_TX = {
  'wx-notaf': 'wxNoTaf',
  'wx-notime': 'wxNoTime',
  'wx-outside': 'wxOutside',
  'wx-nocat': 'wxNoCat'
};

function altnWhyBits(w, p) {
  if (Object.hasOwn(ALTN_WX_TX, w)) return [
    [tt(TX.altnWhy[ALTN_WX_TX[w]], p.wxv || {}), false]
  ];
  const head = [tt(TX.altnPropWhy[w]), true];
  if (w !== 'wx-unread') return [head];
  return p.miss ? [head, [tt(TX.altnWhy.wxUnreachable), true]] : p.crits[2]?.code === 'wxNoKey' ? [head, [tt(TX.altnWhy.wxNoKey),
    false
  ]] : [head];
}
/** La météo (TAF) des terrains `ids`, par la couche météo du cadre (une lecture de plus que Météo, pour ces terrains seulement : les sept
 *  de la proposition en UN appel — SOG-0544 —, puis celui qu'on touche sur la Carte). Un terrain est lu quand la couche a répondu pour
 *  lui (son TAF, ou aucun) ; hors ligne, ou la couche en échec, sa lecture n'a pas eu lieu (wxMiss : « météo non lue », sa raison),
 *  jamais « aucun TAF ». */
async function altnPropWx(ids) {
  const s = S,
    P = S.altnProp,
    W = S.ctx.weather;
  if (!P || !ids.length || !W?.taf) return;
  const cacheOnly = S.ctx.net?.online?.() === false,
    ask = o => Promise.resolve(W.taf(ids, o)).catch(() => null);
  let t = await ask({
      cacheOnly
    }),
    failed = !t;
  // la couche en échec rend tout ou rien : la réserve de l'appareil relue (aucun appel réseau), un TAF gardé reste lu
  if (failed && !cacheOnly) t = await ask({
    cacheOnly: true
  });
  if (gone(s) || S.altnProp !== P) return;
  const items = t?.items && typeof t.items === 'object' ? t.items : {},
    missed = failed || cacheOnly || !!t?.offline;
  P.taf = {
    ...(P.taf || {}),
    ...items
  };
  P.noTaf = !!t?.noTaf;
  for (const id of ids) {
    if (Object.hasOwn(items, id) || !missed) {
      P.wxRead.add(id);
      P.wxMiss.delete(id);
    } else P.wxMiss.add(id);
  }
}
/** « Proposer un dégagement » : les terrains de 30 à 300 NM de l'arrivée (aerodb, enregistrements complets), retenus sur la PISTE et les
 *  MOYENS (altn_check.js), les sept plus proches chiffrés (altnCost) ; la météo des sept (SOG-0544) ; le document de la Carte écrit. Le
 *  champ Dégagement n'est jamais écrit ici. */
async function altnProposeRun() {
  const s = S,
    r = S.flight.route || {},
    arr = String(r.arr || '').toUpperCase(),
    I = S.altnIn,
    sheet = I?.sheet;
  if (!isIcao(arr)) return;
  const P = S.altnProp = {
      arr,
      key: altnPropKey(),
      pending: true,
      msg: null,
      list: [],
      taf: {},
      wxRead: new Set(),
      wxMiss: new Set(),
      noTaf: false,
      touched: null
    },
    late = ms => new Promise(res => setTimeout(() => res(null), ms)),
    done = msg => {
      if (gone(s) || S.altnProp !== P) return;
      P.pending = false;
      P.msg = msg;
      altnDocWrite();
      altnChkDraw(S.C);
    };
  altnChkDraw(S.C);
  if (!(+sheet?.minRunwayLengthFt > 0)) return done('noSheet');
  const from = await Promise.race([altnArrPos(r), late(ALTN_CHK_WAIT_MS)]);
  if (gone(s) || S.altnProp !== P) return;
  if (!from) return done('noArr');
  const dLat = AC.CAND_MAX_NM / 60,
    dLon = dLat / Math.max(0.2, Math.cos(from.lat * Math.PI / 180)),
    ads = await Promise.race([Promise.resolve(S.ctx.aerodb?.aerodromes?.({
      bbox: [from.lon - dLon, from.lat - dLat, from.lon + dLon, from.lat + dLat]
    })).catch(() => null), late(ALTN_PROP_WAIT_MS)]);
  if (gone(s) || S.altnProp !== P) return;
  const cands = AC.candidates(ads || [], {
    from,
    minFt: sheet.minRunwayLengthFt,
    type: sheet.runwayType,
    exclude: [arr, r.dep],
    dist: rhumbNm
  });
  // SOG-0494 : une piste ou des moyens non vérifiés n'écartent plus un terrain ; les CAND_SCAN plus proches examinés, les terrains
  // vérifiés d'abord, puis par distance
  const seen = [];
  for (const c of cands.slice(0, AC.CAND_SCAN)) {
    const cov = await Promise.race([Promise.resolve(S.ctx.aerodb?.coverage?.(c.icao)).catch(() => null), late(ALTN_CHK_WAIT_MS)]);
    if (gone(s) || S.altnProp !== P) return;
    const aids = AC.aidsOf(cov);
    if (AC.aidsKept(aids)) seen.push({
      c,
      aids
    });
  }
  seen.sort((a, b) => AC.unverified(a.c.rwy, a.aids) - AC.unverified(b.c.rwy, b.aids) || a.c.nm - b.c.nm);
  for (const {
      c,
      aids
    }
    of seen.slice(0, AC.CAND_DOC)) {
    const pos = {
        lat: +c.ad.lat,
        lon: +c.ad.lon
      },
      cost = I?.q ? altnCost(from, pos, I.q, I.qIn, sheet, I.cruiseFt) : null;
    P.list.push({
      icao: c.icao,
      name: altnName(c.ad.name),
      ...pos,
      nm: Math.round(c.nm * 10) / 10,
      rwy: c.rwy,
      aids,
      cost: cost ? {
        fuel: cost.fuel,
        min: cost.min
      } : null
    });
  }
  if (!P.list.length) return done('none');
  await altnPropWx(P.list.map(x => x.icao)); // SOG-0544 : les sept, un appel (la liste n'en tient pas plus : CAND_DOC)
  done(null);
}
/** Le document de la Carte : les terrains de la proposition ('ok' avant 'warn', puis par distance ; un terrain à écarter, météo LIFR, n'y
 *  est pas), sept au plus ; une liste vide quand il n'y a pas de proposition (la Carte efface sa couche). */
function altnDocWrite() {
  // SOG-0549 : le carburant dans l'unité AFFICHÉE (le réglage, à défaut celle de la fiche), converti et arrondi comme fuelTxt : la Carte
  // n'a rien à convertir
  const P = S.altnProp,
    from = S.C?.sheet?.unit === 'lb' ? 'lb' : 'kg',
    unit = fuelUnitOf(from) === 'lb' ? 'lb' : 'kg',
    inUnit = v => unit !== from ? window.FuelModel.convertFuel(v, from, unit) : v,
    list = P && !P.pending ? P.list.map(x => ({
      x,
      p: altnPropCrits(x)
    })).filter(o => o.p.state).sort((a, b) => (a.p.state === 'ok' ? 0 : 1) - (b.p.state === 'ok' ? 0 : 1) || a.x.nm - b.x.nm).slice(0,
      AC.CAND_DOC).map(({
      x,
      p
    }) => ({
      icao: x.icao,
      name: x.name,
      lat: x.lat,
      lon: x.lon,
      nm: x.nm,
      state: p.state,
      why: p.why,
      // SOG-0544 : les heures de la phrase de la météo inconnue (HH:MMZ), pour que la Carte dise la même
      ...(p.wxv ? {
        wxv: p.wxv
      } : {}),
      fuel: x.cost ? {
        amount: Math.round(inUnit(x.cost.fuel)),
        unit,
        min: Math.round(x.cost.min)
      } : null
    })) : [],
    doc = {
      schema: 1,
      updated_at: new Date().toISOString(),
      arr: P?.arr || String(S.flight.route?.arr || '').toUpperCase(),
      key: P?.key || altnPropKey(),
      list
    };
  window.dispatchEvent(new CustomEvent('fuel-altn-candidates', {
    detail: doc
  }));
  Promise.resolve(S.ctx.data.put(ALTN_DOC, doc)).catch(() => {});
}
/** Une proposition dont l'arrivée n'est plus celle du vol est retirée, et la Carte prévenue (liste vide). */
function altnPropStale() {
  const P = S.altnProp;
  if (P && P.arr !== String(S.flight.route?.arr || '').toUpperCase()) {
    S.altnProp = null;
    altnDocWrite();
  }
}
/** Le bloc de la proposition, sous la ligne du dégagement : le bouton ; la recherche en cours ; ce qui empêche ; les trois plus proches
 *  (signe, code, nom, distance, carburant de dégagement, réserves) avec « Prendre » ; « Proposé : … — Prendre » pour le terrain touché sur
 *  la Carte. Rien sans arrivée. */
function altnPropHtml() {
  const r = S.flight.route || {},
    P = S.altnProp;
  if (!isIcao(String(r.arr || ''))) return '';
  if (!P) return `<p class="fu-altnprop"><button type="button" class="fu-linkbtn" data-do="altnpropose">${esc(tt(TX.altnPropose))}</button></p>`;
  if (P.pending) return `<p class="fu-altnprop f-muted" data-altnprop role="status">${esc(tt(TX.altnPropBusy))}</p>`;
  // ce qui empêche de proposer, dit ; le geste reste là pour réessayer
  if (P.msg) return `<p class="fu-altnprop f-muted" data-altnprop data-msg="${esc(P.msg)}">${esc(tt(TX.altnPropMsg[P.msg]))}</p><p class="fu-altnprop"><button type="button" class="fu-linkbtn" data-do="altnpropose">${esc(tt(TX.altnPropose))}</button></p>`;
  const unit = S.C?.sheet?.unit || 'kg',
    row = (x, proposed) => {
      // SOG-0544 : chaque réserve dite par son vrai mot, la météo inconnue comprise (plus de « météo non lue » caché)
      const p = altnPropCrits(x),
        why = [...p.why, ...(p.crits[2].state === 'err' ? ['wx-lifr'] : [])].flatMap(w => altnWhyBits(w, p)).map(([s, short]) =>
          short ? `<span class="fu-nowrap">${esc(s)}</span>` : `<span>${esc(s)}</span>`),
        bits = [esc(x.name), `<span class="fu-nowrap">${Math.round(x.nm)} NM</span>`, x.cost ? `<span class="fu-nowrap">${esc(fuelTxt(x.cost.fuel, unit))}</span>` : '', ...why]
        .filter(Boolean).join(' · ');
      return `<li data-cand="${esc(x.icao)}" data-state="${esc(p.sign)}"${proposed ? ' data-proposed' : ''}><span class="fu-altnsign" aria-hidden="true">${ALTN_SIGN[p.sign]}</span><span>${proposed ? `${esc(tt(TX.altnProposed, { icao: x.icao }))} ` : `<b>${esc(x.icao)}</b> `}<span class="f-muted">${bits}</span></span>${p.sign === 'err' ? '' : `<button type="button" class="fu-linkbtn" data-do="altntake" data-icao="${esc(x.icao)}">${esc(tt(TX.altnTake))}</button>`}</li>`;
    },
    // SOG-0544 (le critère de l'ergonome) : un terrain dont la météo n'est pas connue passe après ceux dont elle est lue
    unk = x => altnPropCrits(x).crits[2]?.state === 'grey' ? 1 : 0,
    near = P.list.map((x, i) => [x, i]).sort((a, b) => unk(a[0]) - unk(b[0]) || a[1] - b[1]).slice(0, AC.CAND_LIST).map(([x]) => x),
    touched = P.touched ? P.list.find(x => x.icao === P.touched) : null,
    more = Math.max(0, P.list.length - near.length),
    // l'ergonome : un repli à chevron, le composant de « Critères du dégagement » ; on le ferme en touchant son en-tête (la proposition
    // et la Carte restent) ; ouvert d'abord, et rouvert quand un terrain est touché sur la Carte
    was = S.body?.querySelector('[data-altnchk] details[data-altnprop]'),
    open = P.reopen || !was || was.open;
  P.reopen = false;
  return `<details class="fu-altnfold fu-altnprop" data-altnprop${open ? ' open' : ''}><summary class="f-muted">${esc(tt(TX.altnPropHead, { arr: P.arr }))}</summary><ul>${touched ? row(touched, true) : ''}${near.map(x => row(x, false)).join('')}</ul>${more ? `<p class="f-muted" data-altnmore>${esc(tt(TX.altnPropMore, { n: more }))}</p>` : ''}</details>`;
}
/** « Prendre » : le terrain écrit dans le champ Dégagement (le seul geste qui l'écrit), la proposition fermée, la Carte prévenue. */
function altnTake(icao) {
  const P = S.altnProp;
  if (!P || !P.list.some(x => x.icao === icao)) return;
  const el = S.body?.querySelector('input[data-k="altn"]');
  if (el) el.value = icao;
  S.altnProp = null;
  altnDocWrite();
  setAd('altn', icao);
}
/** Le terrain touché sur la Carte (maps-altn-pick en vue double, #fuel?altn= sinon) : seulement un terrain de la proposition en cours ;
 *  il est PROPOSÉ (« Proposé : … — Prendre »), sa météo lue, rien n'est pris. */
async function altnTouched(icao) {
  const P = S?.altnProp,
    k = String(icao ?? '').toUpperCase();
  // l'adresse et l'événement viennent de dehors (un lien peut porter #fuel?altn=) : le code revalidé, et seulement un terrain proposé
  if (!isIcao(k) || !P || P.pending || !P.list.some(x => x.icao === k)) return;
  P.touched = k;
  P.reopen = true; // le repli fermé : rouvert sur le terrain touché
  altnChkDraw(S.C);
  if (!P.wxRead.has(k)) {
    await altnPropWx([k]);
    if (S?.altnProp === P) altnChkDraw(S.C);
  }
}
/** #fuel?altn=<ICAO> (Carte seule) : la proposition relue du document quand elle est celle de l'arrivée et de l'aéronef du vol, puis le
 *  terrain proposé. */
async function altnFromAddress(icao) {
  const s = S,
    d = await Promise.resolve(S.ctx.data.get(ALTN_DOC)).catch(() => null),
    v = d?.value ?? d;
  if (gone(s) || !v || v.schema !== 1 || v.arr !== String(S.flight.route?.arr || '').toUpperCase() || v.key !== altnPropKey()) return;
  const list = (Array.isArray(v.list) ? v.list : []).slice(0, AC.CAND_DOC).filter(x => isIcaoAlpha(String(x?.icao || '')) &&
    Number.isFinite(+x.lat) && Number.isFinite(+x.lon) && Number.isFinite(+x.nm));
  if (!list.length) return;
  S.altnProp = {
    arr: v.arr,
    key: v.key,
    pending: false,
    msg: null,
    taf: {},
    wxRead: new Set(),
    wxMiss: new Set(),
    noTaf: false,
    touched: null,
    list: list.map(x => ({
      icao: x.icao,
      name: altnName(x.name),
      lat: +x.lat,
      lon: +x.lon,
      nm: Math.max(0, Math.min(9999, +x.nm)),
      rwy: {
        state: 'ok'
      },
      aids: {
        state: (x.why || []).includes('aids-visual') ? 'warn' : 'ok'
      },
      cost: x.fuel && Number.isFinite(+x.fuel.amount) && Number.isFinite(+x.fuel.min) ? {
        fuel: Math.max(0, Math.min(1e6, +x.fuel.amount)),
        min: Math.max(0, Math.min(9999, +x.fuel.min))
      } : null
    }))
  };
  altnTouched(icao);
}
/** SOG-0391 (b) : une heure UTC « AAAA-MM-JJTHH:MMZ » dite à la minute, en Z (« 13 h 32 Z » en français, « 13:32Z » ailleurs) ; `bare` :
 *  sans le « Z » (le début d'une fenêtre). */
function zTime(iso, bare = false) {
  const d = new Date(Date.parse(iso)),
    h = String(d.getUTCHours()).padStart(2, '0'),
    m = String(d.getUTCMinutes()).padStart(2, '0'),
    fr = S.ctx.lang() === 'fr';
  // insécables : jamais « 11 h » en fin de ligne et « 30 » sur la suivante (capture F244 à 390 px)
  return (fr ? `${h}\u00a0h\u00a0${m}` : `${h}:${m}`) + (bare ? '' : fr ? '\u00a0Z' : 'Z');
}
/** SOG-0391 (b) : la ligne en tête, sans pli, quand l'itinéraire de TÊTE passe par une route libre créée (preuve « created ») : sa cause,
 *  celle des routes NAT du sens du vol, lue dans les champs (RE.normalize, proof.cause) — l'heure (le passage à l'entrée de l'océan de
 *  la route prise, sinon le plus tôt des routes écartées, et la fenêtre du message), le niveau (celui du calcul), ou les deux avec leur
 *  nombre ; le sens dit par le moteur (`sections.direction`), la parenthèse omise sans lui. Vol sans heure : « Départ pris à 07 h 57 Z (maintenant). », l'heure de la
 *  demande gardée avec la réponse. Une variante seule en route libre garde son pli ; pas de bouton (Q-0072). '' sinon. */
function freeLineHtml(A) {
  const top = (A.list || []).find(a => a.role === 'primary' && !a.proposal),
    P = top?.proof;
  if (!P?.list?.some(x => x.proof === 'created')) return '';
  // le sens, dit par le moteur (`sections.direction`) ; absent, la parenthèse est omise (sujet « routes NAT » quand il en faut un)
  const c = P.cause || {},
    dir = P.direction ? tt(TX.rFreeDir[P.direction]) : '',
    win = c.from && c.to ? `${zTime(c.from, true)} – ${zTime(c.to)}` : '',
    dw = dir ? ` (${win ? tt(TX.rFreeWin, {
      dir,
      win
    }) : dir})` : '',
    // SOG-0403 R1 : l'heure jugée au 30° ouest (point « 30W ») est celle des routes écartées ; sinon l'entrée de l'océan de la route prise
    at30 = c.point === '30W' && c.at,
    at = at30 ? c.at : P.entry?.time || c.at || '',
    fl = A.n?.level?.fl ?? top.fl ?? null,
    flT = fl ? String(fl).padStart(3, '0') : '',
    tp = [at ? tt(at30 ? TX.rFreeAt30 : TX.rFreeAt, {
      at: zTime(at)
    }) : '', win ? tt(TX.rFreeValid, {
      win
    }) : ''].filter(Boolean).join(', '),
    kind = c.time && c.level ? 'both' : c.time ? 'time' : c.level ? 'level' : '',
    main = kind === 'both' ? tt(TX.rFreeBoth, {
      dir: dir || tt(TX.rFreeDir.none),
      nt: c.time,
      nl: c.level,
      tp: tp ? ` (${tp})` : '',
      fl: flT || '—'
    }) : kind === 'time' ? tt(at30 ? TX.rFreeTime30 : at ? TX.rFreeTime : TX.rFreeTime0, {
      at: at ? zTime(at) : '',
      dw
    }) : kind === 'level' ? tt(flT ? TX.rFreeLevel : TX.rFreeLevel0, {
      fl: flT,
      dir: dir ? ` (${dir})` : ''
    }) : tt(TX.rFree0),
    dep = A.n?.depart?.now && A.n.depart.time ? tt(TX.rFreeNow, {
      t: zTime(A.n.depart.time)
    }) : '',
    // SOG-0391 (b bis), Q-0072, règle de l'ergonome : le niveau en cause, l'heure aussi ou non — le niveau le plus proche de celui du calcul
    // (à égalité, le plus haut) parmi ceux des routes écartées pour le niveau qui passent dans leur fenêtre (RE : cause.levels) ; aucune :
    // pas de bouton (il promettrait une route NAT qui ne viendrait pas)
    near = c.level && fl ? (c.levels || []).filter(x => x !== fl).sort((x, y) => Math.abs(x - fl) - Math.abs(y - fl) || y - x)[0] :
    null,
    go = near ? `<button type="button" class="fu-linkbtn" data-do="rgofl" data-fl="${near}">${esc(tt(TX.rFreeRecalc, {
      fl: String(near).padStart(3, '0')
    }))}</button>` : '';
  return `<p class="f-row f-warn fu-rage" data-rfree data-cause="${esc(kind)}"><span>${esc(dep ? `${main}. ${dep}` : main)}</span>${go}</p>`;
}
/** La liste des itinéraires (le calculé, puis trois variantes au plus) : nom, longueur, FL tenu, écarts, la première erreur ; « Prendre »
 *  pour un itinéraire qui a une route ; le choisi marqué ; puis ce qui n'est pas contrôlé. */
function routeAltsDraw() {
  const box = S.body?.querySelector('[data-routealts]'),
    A = S.ralts;
  if (!box || !A) return;
  if (A.taken !== undefined && !A.list?.length) { // SOG-0224 : un itinéraire pris, les autres disparus ; une ligne le dit
    // SOG-0545 : « Revoir les propositions » rouvre la même liste, tant que le vol n'a pas changé
    const back = S.rkeep && S.rkeep.sig === tripKey() ? `<button type="button" class="fu-linkbtn" data-do="rreview">${esc(tt(TX.rReview))}</button>` : '';
    box.innerHTML = `<p class="f-row fu-rage f-muted"><span data-rtaken>${esc(A.taken ? tt(TX.rTakenLine, { name: A.taken }) : tt(TX.rTakenLine0))}</span>${back}</p>`;
    return;
  }
  // SOG-0372 (b) : des propositions par des routes NAT d'un autre jour retirées : dit, avec « Recalculer »
  const dropped = A.natDropped ? `<p class="f-row f-warn fu-rage" data-natdropped><span>${esc(tt(TX.natDropped, { d: A.natDropped.d }))}</span><button type="button" class="fu-linkbtn" data-do="rcompute">${esc(tt(TX.rRecompute))}</button></p>` : '';
  if (dropped && !A.list?.length) {
    box.innerHTML = dropped;
    return;
  }
  // SOG-0389 (b) : un vol sans niveau — le niveau par défaut du moteur dit en tête, avec le chemin du champ Niveau
  const L = A.n?.level,
    flTxt3 = fl => String(fl).padStart(3, '0'),
    // SOG-0517 : dit tant que le vol n'a pas de niveau ; le niveau du calcul y est écrit ensuite, la route est alors à son niveau
    flightLevel = +S.flight?.level?.ft > 0,
    noLevel = L?.basis === 'default' && !flightLevel && A.list?.length ? `<p class="f-row f-warn fu-rage" data-rnolevel><span>${esc(L.fl !== null ? tt(TX
      .rNoLevel, {
        fl: flTxt3(L.fl)
      }) : tt(TX.rNoLevel0))}</span><button type="button" class="fu-linkbtn" data-do="rgolevel">${esc(tt(TX.rNoLevelGo))}</button></p>` :
    '',
    flOf = a => a.fl === null ? '' : L?.basis === 'default' && !flightLevel && a.fl === L.fl ? tt(TX.rFlDefault, {
      fl: flTxt3(a.fl)
    }) : `FL${flTxt3(a.fl)}`;
  // SOG-0545 : une ligne de niveau d'« Auto » n'a pas de nom (route/levels n'en donne pas) : son FL et sa route écrite la disent
  const name = (a, i) => a.name || (a.role === 'level' ? '' : a.proposal ? tt(TX.rProposal, {
    n: A.list.slice(0, i + 1).filter(x => x.proposal).length
  }) : a.role === 'primary' ? tt(TX.rPrimary) : tt(TX.rVariant, {
    n: i
  }));
  // un plan impossible (AeroDB 9a7f1dde3) : ses propositions de repli sous leur intertitre, jamais mêlées aux itinéraires contrôlés ; le
  // message du moteur reste dit au-dessus
  const both = A.list.map((a, i) => [a, i]),
    routes = both.filter(([a]) => !a.proposal),
    props = both.filter(([a]) => a.proposal);
  // SOG-0134 : la ligne montrée (un appui sur elle ou sur son tracé dans la Carte) est marquée et son détail déplié ; « Choisir » la prend
  const unfold = (html, i) => i === A.shown ? html.replace(/<details class="fu-r(faults|sections|verdicts)"/g,
      '<details open class="fu-r$1"') :
    html;
  // SOG-0545 (maquette v2) : une carte par route — en tête les mentions, puis FL, nom et verdict, le geste à droite ; dessous, sur toute
  // la largeur, distance, temps et carburant d'étape en colonnes alignées d'une route à l'autre (le nombre de la mention en gras) ; puis la
  // route écrite et ses plis. Une proposition de repli (plan impossible) n'est pas chiffrée : ni nombres ni mention.
  // les nombres et les mentions, posés plus bas quand la liste des routes est connue (fig, marks)
  let fig = new Map(),
    marks = new Map();
  // SOG-0545 (l'ergonome, A choix iii) : le cadre dit « cette route et ce niveau sont ceux du vol » — la ligne « choisie » seule ; en
  // « Auto », avant un choix, aucune (seul le niveau est appliqué, la pastille « Auto » le dit)
  const applied = i => i === A.chosen;
  // les motifs d'une ligne (pourquoi une meilleure n'est pas gardée), sur leur ligne, en orange, séparés par « · »
  const motifs = a => {
    const parts = [a.semiOut || (a.levelWarn || []).some(r => r.code === 'level_semicircular') ? `<span data-semicirc>${esc(tt(RR.ROWS.levelOutside))}</span>` : '',
      a.connector === 'direct' ? `<span data-direct>${esc(tt(TX.rDirect))}</span>` : ''
    ].filter(Boolean);
    return parts.length ? `<span class="f-warn fu-rh3" data-motifs>${parts.join(' · ')}</span>` : '';
  };
  // le geste d'une ligne (SOG-0545, l'ergonome) : « choisie » sans bouton sur la ligne prise (la liste revue) ; en « Auto », la ligne
  // qu'« Auto » garde : la pastille « Auto » et « Choisir », tant que sa route n'est pas dans le champ Route ; sinon « Choisir »
  const gest = (a, i) => {
    if (i === A.chosen) return `<span class="f-badge fu-ract" data-kind="ok" data-chosen>${esc(tt(TX.rTaken))}</span>`;
    if (!a.route) return '';
    const btn = cls => `<button type="button"${cls} data-do="rtake" data-i="${i}">${esc(tt(a.proposal ? TX.rTakeProposal : TX.rTake))}</button>`;
    if (!(A.mode === 'levels' && i === A.kept && S.flight?.level?.auto)) return btn(' class="fu-ract"');
    return `<span class="fu-ract fu-rgest"><span class="f-badge" data-kind="accent" data-autokept>${esc(tt(TX.levelAuto))}</span>${sameRoute(a.route, S.flight?.route?.text) ? '' : btn('')}</span>`;
  };
  const unit = S.C?.sheet?.unit || 'kg',
    row = (a, i) => {
      const g = a.proposal ? null : fig.get(i),
        m = marks.get(i) || {},
        fl = flOf(a),
        // le niveau dit une fois, en tête (maquette v2) : le nom du moteur qui finit par ce même niveau (« Direct · FL250 ») le perd
        raw = name(a, i),
        nm = fl && Number.isInteger(a.fl) ? raw.replace(new RegExp(`\\s*·\\s*FL0*${a.fl}\\s*$`), '') || raw : raw,
        chips = (m.fast ? `<span class="f-badge" data-kind="accent" data-fastest>${esc(tt(TX.rFastest))}</span>` : '') + (m.eco ?
          `<span class="f-badge" data-kind="ok" data-cheapest>${esc(tt(TX.rCheapest))}</span>` : ''),
        muted = [g || a.distanceNm === null ? '' : distTxt(a.distanceNm), a.verdict || a.faulty || RE.faultLines(a).length || a
          .incomplete ? '' : tt(TX.rFaults0), a.control ? '' : a.incomplete ? tt(TX.rIncomplete) : ''
        ].filter(Boolean).join(' · ');
      return `<div class="f-item fu-ralt${a.accepted ? '' : ' fu-raltbad'}${a.incomplete ? ' fu-raltinc' : ''}${i === A.shown ? ' fu-raltshown' : ''}${chips ? ' fu-raltmark' : ''}" data-alt="${i}"${i === A.shown ? ' data-shown' : ''}${a.incomplete ? ' data-incomplete' : ''}${a.proposal ? ' data-proposal' : ''}${applied(i) ? ' aria-current="true"' : ''}>${chips ? `<span class="fu-rmarks" data-marks>${chips}</span>` : ''}<span class="fu-rhead">${fl ? `<b data-altfl>${esc(fl)}</b>${nm ? ' · ' : ''}` : ''}<b data-altname>${esc(nm)}</b>${muted ? ` <span class="f-muted">${esc(muted)}</span>` : ''}${a.faulty ? '' : verdictWord(a, true)}${natHtml(a.nat)}${a.faulty ? `<b class="f-err fu-rh2" data-faulty data-verdict="violates">${esc(tt(TX.rFaulty, { n: a.violations }))}</b>` : verdictWord(a, false)}${motifs(a)}</span>${gest(a, i)}${g ? `<span class="fu-rfigs" data-figs><span data-fignm>${esc(distTxt(g.nm))}</span><span${m.fast ? ' class="fu-rhi"' : ''} data-figmin data-v0="${Math.round(g.min0)}">${esc(spanTxt(g.min, durTxt))}</span><span${m.eco ? ' class="fu-rhi"' : ''} data-figtrip data-v0="${Math.round(g.trip0)}">${esc(spanTxt(g.trip, v => fuelTxt(v, unit).replace(/ (kg|lb)$/, '')) + ' ' + fuelUnitOf(unit))}</span></span>` : ''}<span class="fu-rrest">${a.route ? `<small class="f-muted fu-raltroute">${esc(a.route)}</small>` : ''}${a.control && a.control.controlledPct < 100 ? `<small class="f-muted fu-rshare" data-share>${esc(shareText(a.control, true))}</small>` : ''}${proofHtml(a)}${a.calcError ? `<small class="f-warn">${esc(a.calcError)}</small>` : ''}${unfold(`${RE.faultLines(a).length || a.incomplete ? faultsHtml(RE.faultLines(a), a) : ''}${verdictsHtml(a)}${sectionsHtml(a)}`, i)}</span></div>`;
    };
  // SOG-0224 : l'âge du calcul toujours dit, « périmé » au changement d'AIRAC, à la base changée ou, par les NAT, le lendemain (frame/lib/route_alts.js) (avec « Recalculer », jamais effacé), et
  // « Fermer les propositions »
  const at = A.computed_at ? hhmmLocal(A.computed_at) : '',
    head = at ? `<p class="f-row fu-rage ${A.stale ? 'f-warn' : 'f-muted'}" data-rage${A.stale ? ' data-stale' : ''}${A.cache?.hit ? ' data-cache' : ''}><span>${esc(tt(A.stale ? TX.rStale : A.cache?.hit ? TX.rCache : TX.rAge, { t: at }))}</span>${A.stale ? `<button type="button" class="fu-linkbtn" data-do="rcompute">${esc(tt(TX.rRecompute))}</button>` : ''}<button type="button" class="fu-linkbtn" data-do="rclose">${esc(tt(TX.rClose))}</button></p>` :
    A.list.length ? `<p class="f-row fu-rage" data-rage><button type="button" class="fu-linkbtn" data-do="rclose">${esc(tt(TX.rClose))}</button></p>` : '';
  // SOG-0532 (l'ergonome, 20/11) : la ligne « Contrôle de simulation : … » est retirée — ses comptes, ceux de tout le calcul, doublaient
  // et contredisaient les groupes des verdicts ; « Seul Eurocontrol valide un plan. » se dit une fois au-dessus de la liste (SOG-0552)
  fig = new Map(routes.map(([a, i]) => [i, altFigures(a, i)]));
  marks = figMarks(routes.filter(([a]) => !a.faulty && a.verdict !== 'violates').map(([, i]) => [i, fig.get(i)]));
  const tier = a => a.faulty || a.verdict === 'violates' ? 2 : a.verdict === 'conform' ? 0 : 1,
    // la route calculée par le moteur (la tête) reste en tête quand son verdict est le meilleur de la liste (SOG-0296 : les variantes
    // s'ajoutent sous elle, la liste ne saute pas) ; sinon l'ordre de l'ergonome : la choisie, puis par verdict, puis par carburant
    // SOG-0545 : en « Auto », la ligne qu'« Auto » garde
    lead = A.mode === 'levels' ? A.kept : routes.length && routes.every(([b]) => tier(routes[0][0]) <= tier(b)) ? routes[0][1] : -1,
    shown = [...routes].sort(([a, i], [b, j]) => (j === A.chosen) - (i === A.chosen) || (j === lead) - (i === lead) || tier(a) - tier(b) ||
      figCmp(fig0(fig.get(i)), fig0(fig.get(j))) || i - j),
    cols = routes.some(([, i]) => fig.get(i)) ? `<div class="fu-rfigs fu-rcols f-muted" data-figcols aria-hidden="true"><span>${esc(tt(TX.unitDist))}</span><span>${esc(tt(TX.time))}</span><span>${esc(tt(TX.tripS))}</span></div>` : '',
    // SOG-0552 (l'ergonome, 23/11) : une fois, au-dessus de la liste, dès qu'elle montre des routes, quel que soit le verdict : « Seul
    // Eurocontrol valide un plan. Les règles du RAD qui visent un espace aérien entier ne sont pas examinées. » — plus rien dans les cartes
    conformLine = routes.length ? `<p class="f-muted fu-rconform" data-conformline>${esc(`${tt(RR.ROWS.onlyEurocontrol)} ${tt(RR.ROWS.spacesOnly)}`)}</p>` : '';
  box.innerHTML = head + conformLine + freeLineHtml(A) + noLevel + dropped + (routes.length ? `${cols}<div class="f-list fu-ralts" data-altlist>${shown.map(([a, i]) => row(a, i)).join('')}</div>` :
    `<h4 class="fu-rnoroute" data-rnoroute>${esc(tt(TX.rNoRoute))}</h4><p class="f-muted" data-rnone>${esc(A.n?.message || tt(TX.rNone))}</p>`) + moreHtml(A) + (props.length ?
    `<h4 class="fu-rprophead" data-proposals-head>${esc(tt(TX.rProposals))}</h4><div class="f-list fu-ralts" data-altlist data-proposals>${props.map(([a, i]) => row(a, i)).join('')}</div>` :
    '') + (A.list.length ? `<details class="fu-rlegend" data-rlegend><summary class="f-muted">${esc(tt(TX.rLegend))}</summary>${RL.legendHtml(S.ctx.lang())}</details>` : '') + limitsHtml(A.n || {
    limitation: '',
    gaps: []
  });
}
// ---------------------------------------------------------------- les itinéraires pour la Carte (SOG-0134 a, INTEGRATION § 3 bis)
// La Carte dessine les itinéraires (décision d'ergonomie du 9 nov. : une seule carte, la vraie) ; Carburant les lit en positions avec
// son lecteur de route (RM.routeModel, rien n'est écrit dans le vol) et les publie : l'événement fuel-route-alts (vue double, survol
// compris) et cache/fuel/route_alts.json (une Carte ouverte ensuite ; jamais au survol). Un appui sur un tracé de la Carte revient en
// maps-route-alt-show (vue double) et le MONTRE ; « Choisir » le prend ici, ou #fuel?ralt=<index> depuis une Carte seule (SOG-0134).
const ALTS_DOC = 'cache/fuel/route_alts.json';
/** Lit les points des itinéraires (gardés : S.alts) puis publie ; `pts` déjà lus (la route contrôlée) : publication immédiate. */
async function altsPublish(mode, plans, pts) {
  const s = S,
    r = S.flight.route || {},
    known = knownPoints(r, true),
    // SOG-0372 : les routes NAT du jour, pour qu'une proposition par l'Atlantique Nord suive sa route NAT sur la Carte
    nat = !pts && plans.some(p => RM.NAT_IN_TEXT.test(String(p.route || ''))) ? await natForModel(s) : null,
    got = pts || await Promise.all(plans.map(p => p.route ? Promise.resolve().then(() => RM.routeModel(p.route, {
      dep: r.dep,
      arr: r.arr,
      known,
      chain: [],
      base: xpBase(S.ctx.aerodb),
      nat
    })).then(x => x.points || []).catch(() => []) : []));
  if (gone(s)) return;
  const ok = q => Number.isFinite(+q?.lat) && Number.isFinite(+q?.lon) && Math.abs(+q.lat) <= 90 && Math.abs(+q.lon) <= 180;
  S.alts = {
    mode,
    dep: r.dep || '',
    arr: r.arr || '',
    list: plans.map((p, i) => {
      const ps = (got[i] || []).filter(ok).slice(0, 400),
        ids = ps.map(q => String(q.id || '').toUpperCase()),
        faulty = new Set(),
        control = ps.length > 1 ? Array(ps.length - 1).fill(null) : [],
        via = ps.length > 1 ? Array(ps.length - 1).fill('') : [],
        layer = ps.length > 1 ? Array(ps.length - 1).fill('') : [];
      // SOG-0134 : la voie (UN10, DCT, FRA) et la couche de chaque segment points[k] → points[k+1], d'après les segments du moteur, pour
      // que la Carte dessine la nature du tronçon (frame/lib/route_legend.js)
      for (const g of p.segments || []) {
        const a = ids.indexOf(g.from),
          b = a < 0 ? -1 : ids.indexOf(g.to, a + 1);
        for (let k = a; a >= 0 && k < b; k++) {
          via[k] ||= RL.viaOf(g.via, g.layer);
          layer[k] ||= RL.LAYERS.includes(g.layer) ? g.layer : '';
        }
      }
      // SOG-0161 : l'état de contrôle de chaque segment points[k] → points[k+1], d'après les tronçons du moteur (sections, sinon segments)
      for (const g of [...(p.control?.sections || []), ...(p.segments || [])]) {
        if (!RE.CONTROLS.includes(g.control)) continue;
        const a = ids.indexOf(g.from),
          b = a < 0 ? -1 : ids.indexOf(g.to, a + 1);
        for (let k = a; a >= 0 && k < b; k++) control[k] ||= g.control;
      }
      // un segment fautif from → to du moteur marque chaque segment points[k] → points[k+1] entre ses deux bouts
      for (const g of p.segments || []) {
        if (g.state !== 'error') continue;
        const a = ids.indexOf(g.from),
          b = a < 0 ? -1 : ids.indexOf(g.to, a + 1);
        for (let k = a; a >= 0 && k < b; k++) faulty.add(k);
      }
      return {
        index: i,
        name: p.name || '',
        route: p.route || '',
        sid: p.sid?.id || '',
        star: p.star?.id || '',
        ids,
        points: ps.map(q => [Math.round(+q.lat * 1e5) / 1e5, Math.round(+q.lon * 1e5) / 1e5]),
        faulty: [...faulty].sort((x, y) => x - y),
        control,
        via,
        layer,
        proposal: p.proposal === true // une proposition d'un plan impossible, non validée (la Carte peut la dire)
      };
    }),
    hovered: null
  };
  altsSend(true);
}
/** L'objet du contrat (INTEGRATION § 3 bis) ; `hovered` vaut null dans le document. */
function altsObject(forDoc) {
  const A = S.alts,
    R = A?.mode === 'compute' && S.ralts?.answer && S.ralts.list?.length ? S.ralts : null;
  return {
    // SOG-0224, schéma 2 (INTEGRATION § 3 bis) : la réponse (answer), l'heure du calcul, la ligne ouverte (open), la clé du vol
    // (aircraft), le tampon de la base ; sans eux, le schéma 1 de toujours (lu « sans détail »)
    ...(R && forDoc ? {
      answer: R.answer,
      computed_at: R.computed_at,
      open: shownOf(),
      aircraft: R.ac,
      base: R.base
    } : {}),
    schema: R && forDoc ? 2 : 1,
    updated_at: new Date().toISOString(),
    dep: A?.dep || '',
    arr: A?.arr || '',
    mode: A?.mode || 'compute',
    alternatives: A?.list || [],
    chosen: !A?.list?.length ? null : A.mode === 'check' ? 0 : S.ralts?.chosen >= 0 ? S.ralts.chosen : 0,
    hovered: forDoc || !A?.list?.length ? null : A.hovered ?? shownOf(),
    shown: forDoc || !A?.list?.length ? null : shownOf() // SOG-0134 : la ligne montrée (un appui), que la Carte surligne
  };
}
/** La ligne montrée (SOG-0134), ou null. */
const shownOf = () => Number.isInteger(S?.ralts?.shown) && S.ralts.shown >= 0 ? S.ralts.shown : null;
/** Montre un itinéraire (un appui sur sa ligne, ou sur son tracé dans la Carte : maps-route-alt-show) : marqué, détail déplié, surligné
 *  dans la Carte ; rien n'est pris (« Choisir » prend). null : plus rien de montré. */
function altsShow(i) {
  if (!S?.ralts?.list?.length) return;
  const k = Number.isInteger(i) && i >= 0 && i < S.ralts.list.length ? i : -1;
  if (k === (S.ralts.shown ?? -1)) return;
  S.ralts.shown = k;
  routeAltsDraw();
  if (S.alts?.mode === 'compute') altsSendSoon(); // SOG-0224 : la ligne ouverte survit (un appui, jamais au survol)
}
/** SOG-0470 (Sécurisation : le document, son contrôle RAD porte jusqu'à 1 500 éléments, était réécrit à chaque appui) : la Carte apprend
 *  la ligne montrée aussitôt (l'événement) ; le document est écrit une fois, ALTS_WRITE_MS après le dernier appui d'une série, ou au
 *  démontage s'il est encore en attente. */
const ALTS_WRITE_MS = 1500;

function altsSendSoon() {
  const s = S;
  altsSend(false);
  clearTimeout(s.altsTimer);
  s.altsTimer = setTimeout(() => {
    s.altsTimer = null;
    if (S === s) altsSend(true);
  }, ALTS_WRITE_MS);
}
/** L'événement (toujours) et le document (doc vrai : arrivée, choix, effacement ; jamais au survol). */
function altsSend(doc) {
  if (!S) return;
  window.dispatchEvent(new CustomEvent('fuel-route-alts', {
    detail: altsObject(false)
  }));
  if (!doc) return;
  // SOG-0470 (Sécurisation) : le document (son contrôle RAD porte jusqu'à 1 500 éléments) n'est réécrit que si son contenu change —
  // un appui sur la ligne déjà montrée ne réécrit rien ; l'heure d'écriture n'entre pas dans la comparaison
  const o = altsObject(true),
    sig = JSON.stringify({
      ...o,
      updated_at: ''
    });
  if (S.altsSig === sig) return;
  S.altsSig = sig;
  Promise.resolve(S.ctx.data.put(ALTS_DOC, o)).catch(() => {});
}
/** SOG-0224 : la clé d'aéronef de l'objet « propositions en cours » — l'immatriculation, sinon la fiche, sinon le type (24 signes au
 *  plus) ; '' sans aéronef. */
function acKey() {
  const a = S?.flight?.aircraft || {};
  return String(a.registration || a.sheetId || a.type || '').trim().toUpperCase().slice(0, 24);
}
/** SOG-0224 : la réponse du lanceur gardée dans l'objet — les seules clés que RE.normalize lit, bornées comme il les borne (trois
 *  itinéraires, 300 remarques) ; relue par RE.normalize à chaque lecture. */
function answerOf(res, n = null) {
  return {
    ok: true,
    level: n?.level || null, // SOG-0389 (b) : le niveau du calcul et sa base, relus par RE.normalize
    depart: n?.depart || null, // SOG-0391 (b) : l'heure de départ de la DEMANDE (et « maintenant »), jamais l'horloge au dessin
    sections: RE.sectionsKept(res?.sections), // SOG-0391 (b) : la preuve, la route libre et sa cause se relisent après un rechargement
    rad: RE.radOf(res?.rad), // SOG-0401 : le contrôle RAD, relu par RE.normalize (déjà borné)
    alternatives: (Array.isArray(res?.alternatives) ? res.alternatives : []).slice(0, 3),
    issues: (Array.isArray(res?.issues) ? res.issues : []).slice(0, 300),
    message: String(res?.message ?? '').slice(0, 300),
    limitation: String(res?.limitation ?? '').slice(0, 400),
    gaps: (Array.isArray(res?.gaps) ? res.gaps : []).slice(0, 8)
  };
}
/** SOG-0224 : le tampon de la base aéronautique (les cycles publiés de chaque zone, AeroDb.status) : changé, le calcul est périmé ; ''
 *  quand la base ne le dit pas. Un condensé court (FNV-1a), jamais la liste. */
async function baseStamp() {
  return RA.baseStampOf(await Promise.resolve().then(() => S?.ctx?.aerodb?.status?.()).catch(() => null));
}
/** SOG-0224, règle de l'utilisateur (17 h 14, sur SOG-0296 : « un cache, qui périme uniquement au changement d'airac, ou s'il passe
 *  par les nats ») : périmé quand le cycle AIRAC a changé depuis le calcul, quand la base a changé (son tampon), ou, pour une route par
 *  les NAT, le jour suivant (UTC) ; le reste du temps, l'âge est dit. Posée sur S.ralts.stale, puis la liste redessinée. */
async function proposalsAge() {
  const s = S,
    R = S?.ralts;
  if (!R?.computed_at) return;
  const now = await baseStamp();
  if (gone(s) || S.ralts !== R) return;
  const stale = RA.isStale(R, now) || !!R.procStale; // SOG-0548 : une procédure lue depuis le calcul (routeReadDone)
  if (stale !== !!R.stale) {
    R.stale = stale;
    routeAltsDraw();
  }
}
/** SOG-0224 : la fin des propositions (« Fermer les propositions », un autre aéronef) : la liste et le document vidés, la Carte efface sa
 *  couche. */
function proposalsEnd() {
  if (!S) return;
  altsMoreStop(); // SOG-0296 : la recherche des variantes s'arrête avec les propositions
  S.ralts = null;
  altsClear(true);
  const box = S.body?.querySelector('[data-routealts]');
  if (box) box.innerHTML = '';
}
/** Plus d'itinéraires à dessiner (nouvelle demande, nouveau couple, refus) : alternatives []. `force` : publié même sans liste en
 *  mémoire (un choix : le document peut encore en porter une, venue d'une autre ouverture — SOG-0224, choix depuis la Carte seule). */
function altsClear(force = false) {
  if (!S || (!force && !S.alts?.list?.length)) return;
  S.alts = null;
  altsSend(true);
}
/** Survol, appui ou focus clavier d'une ligne de la liste des itinéraires : `hovered` publié par l'événement seul. */
function altsHover(e) {
  if (!S?.alts?.list?.length || S.alts.mode !== 'compute') return;
  const alt = e.target?.closest?.('[data-altlist] [data-alt]'),
    h = alt ? +alt.dataset.alt : null;
  if (h === S.alts.hovered) return;
  S.alts.hovered = Number.isInteger(h) ? h : null;
  altsSend(false);
}
/** SOG-0321 : le point de la liste de la route sous le pointeur ou le focus (data-hover-pt), dit à la Carte par l'événement de fenêtre
 *  « route-point-hover » { id } (contrat de BUGS SOG, 6db4e07cc) ; null hors de la liste. Un seul envoi par changement. `leaving` :
 *  Carburant démonté, le surlignage est retiré s'il y en avait un. */
function ptHover(target, leaving = false) {
  if (!S) return;
  const row = !leaving && target?.closest?.('[data-pts] [data-hover-pt]'),
    id = row ? String(row.dataset.hoverPt || '').slice(0, 40) || null : null;
  if (id === (S.ptHovered ?? null)) return;
  S.ptHovered = id;
  window.dispatchEvent(new CustomEvent('route-point-hover', {
    detail: {
      id
    }
  }));
}
/** Le tracé touché dans la Carte (vue double, maps-route-alt-show, contrat de BUGS SOG du 10 nov.) : un index entier de la liste, ou
 *  null quand il est relâché, et rien d'autre de l'événement ; il MONTRE la ligne, il ne la prend pas (SOG-0134). */
function altsPicked(e) {
  const i = e?.detail?.index;
  if (!S?.ralts?.list?.length) return;
  if (i === null) return altsShow(-1);
  if (Number.isInteger(i) && i >= 0 && i < S.ralts.list.length) altsShow(i);
}
/** SOG-0263 : « via NAT A » sous la part contrôlée d'un itinéraire, et en ambre « périmée : routes NAT du JJ/MM » quand le moteur a
 *  pris des tracks périmées ; rien sans track. */
/** SOG-0354 (L2b 3) : la preuve de chaque section de l'itinéraire calculé, sur sa ligne (sous sa route) — « DOGAL–54/50 : publiée, route NAT
 *  E du 16/11 », « EIDW–DOGAL : calculée » ; le jour est celui des routes NAT de l'itinéraire (nat.issued), « … route NAT E » sans jour. Rien sans
 *  découpage (option non appliquée, view.sections null). */
function proofHtml(a) {
  const P = a?.proof;
  if (!P || typeof P !== 'object' || !(P.list?.length || P.rejected?.length || P.noTime)) return '';
  const day = a.nat?.issued || '',
    one = x => {
      const v = {
          a: x.from,
          b: x.to,
          t: x.track || '?',
          d: day
        },
        t = x.proof === 'published' ? tt(day ? TX.rProofPub : TX.rProofPubNoDay, v) : x.proof === 'created' ? tt(TX.rProofFree, v) : tt(TX
          .rProofComp, v);
      return `<span data-proofsec="${esc(x.proof)}">${esc(t)}</span>`;
    },
    // les routes NAT écartées et pourquoi (six au plus), dans un pli FERMÉ qui dit leur nombre ; rien sans route écartée
    rl = P.rejected || [],
    rej = rl.length ? `<details class="fu-rprooffold" data-proofrejs><summary class="f-muted">${esc(tt(pl(rl.length, TX.rProofRej1, TX.rProofRejN), {
        n: rl.length
      }))}</summary>${rl.map(x => `<small class="f-muted fu-rproof" data-proofrej="${esc(x.track)}">${esc(tt(TX.rProofRejected, {
      t: x.track,
      w: x.why
    }))}${x.near ? ` <span data-proofnear="${esc(x.near.side)}">— ${esc(tt(TX.rProofNear[x.near.side], {
      m: x.near.minutes,
      t: zTime(x.near.depart)
    }))}</span>` : ''}</small>`).join('')}</details>` : '',
    // l'heure de départ absente de la demande : la validité horaire des routes NAT n'a pas été vérifiée
    noTime = P.noTime ? `<small class="f-muted fu-rproof" data-proofnotime>${esc(tt(TX.rProofNoTime))}</small>` : '';
  return `${P.list?.length ? `<small class="f-muted fu-rproof" data-proof>${P.list.map(one).join(' · ')}</small>` : ''}${rej}${noTime}`;
}

function natHtml(n) {
  if (!n?.tracks?.length) return '';
  const t = n.tracks.join(', ');
  return ` <small class="f-muted fu-rnat" data-nat="${esc(t)}">${esc(tt(TX.rNat, { // l'espace : jamais « 0 écartvia NAT E »
    t
  }))}${n.stale ? ` · <span class="f-warn" data-natstale>${esc(tt(TX.rNatStale, {
    d: n.issued || '?'
  }))}</span>` : ''}</small>`;
}
/** Les itinéraires du document (cache/fuel/route_alts.json) pour la liste de Carburant : null s'il n'en porte pas pour ce vol (un calcul,
 *  le même couple). Le document est relu comme une entrée : textes bornés, procédures à leur forme, trois lignes au plus. */
function raltsOfDoc(d) {
  xpNoteAnswer(d?.answer); // SOG-0397 : une réponse gardée sur l'appareil, relue : ses positions venues d'X-Plane notées
  const r = S?.flight?.route || {};
  if (!d || d.mode !== 'compute' || !Array.isArray(d.alternatives) || !d.alternatives.length) return null;
  if (String(d.dep || '') !== String(r.dep || '') || String(d.arr || '') !== String(r.arr || '')) return null;
  const proc = (v, kind) => new RegExp(`^[A-Z0-9]{4}\\.${kind}\\.[A-Z0-9.]{1,60}$`).test(String(v || '')) ? {
    id: String(v)
  } : null;
  return {
    list: d.alternatives.slice(0, 3).map(a => ({
      name: String(a?.name || '').slice(0, 60),
      route: RE.routeWords(a?.route), // SOG-0390 : la voie composée gardée
      sid: proc(a?.sid, 'SID'),
      star: proc(a?.star, 'STAR'),
      segments: [],
      errors: [],
      faults: 0,
      accepted: true,
      distanceNm: null,
      fl: null
    })),
    chosen: -1,
    n: {
      limitation: '',
      gaps: []
    }
  };
}
/** #fuel?ralt=<index> (Carte seule) : le document relu, l'itinéraire pris seulement pour le même couple et un calcul (§ 3 bis) ; le
 *  choix publie la liste vide (routeTake → altsClear(true)) : la Carte efface sa couche (SOG-0224). */
async function altsFromAddress(index) {
  const s = S,
    i = Number.isInteger(+index) && /^\d{1,2}$/.test(String(index)) ? +index : -1,
    d = i >= 0 ? await Promise.resolve(S.ctx.data.get(ALTS_DOC)).catch(() => null) : null;
  if (gone(s)) return;
  const R = raltsOfDoc(d);
  if (!R || i >= R.list.length) return;
  S.ralts = R;
  S.alts = null;
  routeTake(i);
}
/** Le retour dans Carburant sans choix (SOG-0224) : les propositions du document reviennent dans la liste, rien n'est pris ; la Carte
 *  les a déjà (le document), rien n'est republié. Seulement quand la liste n'est pas déjà là. */
async function altsFromDoc() {
  const s = S;
  if (S?.ralts?.list?.length) return;
  const d = await Promise.resolve(S.ctx.data.get(ALTS_DOC)).catch(() => null);
  if (gone(s) || S.ralts?.list?.length) return;
  let R = raltsOfDoc(d);
  if (!R) return;
  // SOG-0224 : un autre aéronef que celui du calcul : l'objet est fini (vidé), rien n'est montré
  if (d.schema === 2 && typeof d.aircraft === 'string' && d.aircraft !== acKey()) return altsClear(true);
  // le schéma 2 : la réponse relue (RE.normalize), la ligne ouverte, l'heure et le tampon ; un document du schéma 1 se lit « sans détail »
  const n = d.schema === 2 && d.answer ? RE.normalize(d.answer, 'compute') : null;
  if (n?.ok && n.plans.length) {
    const at = typeof d.computed_at === 'string' && Number.isFinite(Date.parse(d.computed_at)) ? new Date(Date.parse(d.computed_at))
      .toISOString() : null;
    R = {
      list: n.plans,
      chosen: -1,
      n,
      answer: d.answer,
      computed_at: at,
      ac: acKey(),
      base: typeof d.base === 'string' ? d.base.slice(0, 64) : '',
      shown: Number.isInteger(d.open) && d.open >= 0 && d.open < n.plans.length ? d.open : undefined
    };
  }
  S.ralts = R;
  // le survol et l'appui se publient comme après un calcul (altsHover, altsShow) : la liste gardée telle que le document la porte
  S.alts = {
    mode: 'compute',
    dep: String(d.dep || ''),
    arr: String(d.arr || ''),
    list: d.alternatives.slice(0, 3).map(mapAltOfDoc),
    hovered: null
  };
  routeAltsDraw();
  if (S.natDay) natDrop(S.natDay, S.natFrom); // SOG-0372 (b) : relue après la lecture des routes du jour
  proposalsAge(); // SOG-0224 : relu, l'objet peut être périmé (AIRAC, base, NAT : frame/lib/route_alts.js)
}
/** Audit 193 : une ligne du document (écrit par tout appareil, entrée non fiable) remise à la forme que altsPublish donne à la Carte —
 *  nom, route et procédures comme raltsOfDoc, 400 points bornés au plus, identifiants courts, et pour chaque segment son état de
 *  contrôle, sa voie et sa couche pris dans leurs listes fermées ; tout autre champ est laissé. */
function mapAltOfDoc(a, i) {
  const pts = (Array.isArray(a?.points) ? a.points : []).filter(q => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite) &&
      Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180).slice(0, 400).map(q => [Math.round(q[0] * 1e5) / 1e5, Math.round(q[1] * 1e5) / 1e5]),
    n = Math.max(pts.length - 1, 0),
    seg = (v, f) => Array.from({
      length: n
    }, (_, k) => f(Array.isArray(v) ? v[k] : null)),
    proc = (v, kind) => new RegExp(`^[A-Z0-9]{4}\\.${kind}\\.[A-Z0-9.]{1,60}$`).test(String(v || '')) ? String(v) : '';
  return {
    index: i,
    name: String(a?.name || '').slice(0, 60),
    route: RE.routeWords(a?.route), // SOG-0390 : la voie composée gardée
    sid: proc(a?.sid, 'SID'),
    star: proc(a?.star, 'STAR'),
    ids: (Array.isArray(a?.ids) ? a.ids : []).slice(0, pts.length).map(x => /^[A-Z0-9]{1,12}$/.test(String(x || '')) ? String(x) : ''),
    points: pts,
    faulty: (Array.isArray(a?.faulty) ? a.faulty : []).filter(k => Number.isInteger(k) && k >= 0 && k < n).slice(0, 400),
    control: seg(a?.control, v => RE.CONTROLS.includes(v) ? v : null),
    via: seg(a?.via, v => RL.viaOf(v, v === 'FRA' ? 'FRA' : '')),
    layer: seg(a?.layer, v => RL.LAYERS.includes(v) ? v : ''),
    proposal: a?.proposal === true
  };
}
/** « Prendre » : la route de l'itinéraire écrite comme une saisie (le champ de route et son événement : le seul chemin d'écriture,
 *  SOG-0013), puis sa SID et sa STAR proposées aux procédures (P.propose : vérifiées contre les fiches du terrain, rien d'inconnu écrit). */
function routeTake(i) {
  const R0 = S.ralts,
    a = S.ralts?.list?.[i],
    ta = S.body?.querySelector('[data-k="rtext"]');
  if (!a?.route || !ta) return;
  // SOG-0400 (cause prouvée par V3 Frame : un choix fait pendant la recherche des variantes relançait un calcul) : un itinéraire pris
  // arrête la demande de variantes en cours AVANT que le texte change ; sinon l'écriture du vol (altsMoreCheck) voyait une entrée
  // changée et relançait « Calculer A → B »
  altsMoreStop();
  // SOG-0372 (c, point 3) : les points que le moteur a placés pour cet itinéraire (bornés par RE.normalize) deviennent des points connus du
  // champ Route pour ce départ et cette arrivée (aerodb passe toujours d'abord) ; gardés en mémoire, rien de plus écrit dans data/
  S.takenPts = a.points?.length ? {
    dep: S.flight.route?.dep || '',
    arr: S.flight.route?.arr || '',
    map: new Map(a.points.map(p => [p.id, p]))
  } : null;
  ta.value = a.route;
  ta.dispatchEvent(new Event('input', {
    bubbles: true
  }));
  // SOG-0517 : le texte d'un itinéraire pris reste celui du moteur, mot pour mot (voies, groupes de niveau) : pas de normalisation
  // SOG-0517 : un itinéraire pris n'impose aucun passage au calcul suivant (la route d'avant ne se reconduit pas)
  // SOG-0533 : et le niveau de son calcul (celui de l'itinéraire, sinon celui de la demande) : un niveau changé ensuite le dit
  if (S.flight.route) Object.assign(S.flight.route, {
    from: 'engine',
    typed: [],
    calcFl: [a.fl, S.ralts?.fl, S.ralts?.n?.level?.fl].find(flOk) ?? null,
    violations: a.faulty ? a.violations : 0 // SOG-0532 (4) : dit avant « Copier pour Eurocontrol »
  });
  ta.dispatchEvent(new Event('change', {
    bubbles: true
  }));
  if (a.sid?.id) S.P.propose('dep', {
    sid: a.sid.id
  });
  if (a.star?.id) S.P.propose('arr', {
    star: a.star.id
  });
  S.rcheck = null;
  // SOG-0545 : la liste gardée en mémoire pour « Revoir les propositions », avec la clé du vol (sans route ni niveau : ceux que le choix
  // vient d'écrire) ; un vol changé ensuite retire le lien
  S.rkeep = R0?.list?.length ? {
    R: R0,
    i,
    sig: tripKey()
  } : null;
  // SOG-0224 (l'utilisateur : « faire disparaitre les alternatives ») : la route est prise, les autres partent tout de suite, ici
  // (une ligne dit ce qui a été pris) et sur la Carte (alternatives [] publiées : couche et mini-légende vidées), sans changer d'écran
  S.ralts = {
    list: [],
    taken: a.name || ''
  };
  routeAltsDraw();
  if (a.faulty) S.ctx.notify(tt(TX.rTakenFaulty, {
    n: a.violations
  }), 'warn'); // SOG-0532 (3) : une route fautive n'est jamais confirmée « contrôlé » en vert
  else if (a.proposal) S.ctx.notify(tt(TX.rTakenProposal, {
    share: shareText(a.control, true) || tt(TX.rIncomplete)
  }), 'warn'); // une proposition d'un plan impossible : non validée, à vérifier
  else if (a.control) S.ctx.notify(tt(TX.rTakenShare, {
      share: shareText(a.control, a.verdict === 'unverifiable')
    }), a.control.controlledPct >= 100 && a.verdict !== 'unverifiable' ? 'ok' :
    'warn'); // SOG-0161 : la confirmation redit le partage ; SOG-0532 (3) : une route non vérifiable n'est jamais « contrôlé » en vert
  else if (a.incomplete) S.ctx.notify(tt(TX.rTakenIncomplete), 'warn'); // SOG-0081 : la confirmation redit le contrôle incomplet
  altsClear(true); // plus rien à dessiner pour la Carte (INTEGRATION § 3 bis), même pour une liste venue du document (SOG-0224)
  // SOG-0545 (l'ergonome) : en « Auto », « Choisir » fixe le niveau de la ligne et retire « Auto », la ligne gardée comprise
  if (R0?.mode === 'levels' && flOk(a.fl)) setLevel(a.fl * 100);
}
/** SOG-0545 : la clé du vol pour « Revoir les propositions » — la demande de « Calculer » sans le niveau, les passages imposés ni les
 *  vitesses (le choix vient de les écrire), et l'aéronef. */
function tripKey() {
  const {
    fl,
    via,
    speed_kt,
    climb_fpm,
    descent_fpm,
    terminal_speed_kt,
    ...rest
  } = routeArgs('compute');
  return JSON.stringify([argsKey(rest), acKey()]);
}
/** SOG-0545 (le relais) : « Revoir les propositions » — la même liste, sans appel au moteur, « choisie » sur la ligne prise ; un vol
 *  changé depuis : rien (le lien part). */
function reviewOpen() {
  const K = S?.rkeep;
  if (!K || K.sig !== tripKey()) return reviewSync();
  S.ralts = {
    ...K.R,
    chosen: K.i
  };
  routeAltsDraw();
  altsPublish('compute', S.ralts.list);
}
/** SOG-0545 : le vol a changé depuis le choix — plus de « Revoir les propositions ». */
function reviewSync() {
  if (!S?.rkeep || S.rkeep.sig === tripKey()) return;
  S.rkeep = null;
  S.body?.querySelector('[data-routealts] [data-do="rreview"]')?.remove();
}
/** SOG-0545 (l'ergonome) : en « Auto », la liste des routes par niveau — la ligne de chaque niveau qui a une route (route/levels, la
 *  réponse de la recherche d'« Auto »), cinq au plus : la ligne gardée, puis par verdict, puis par carburant d'étape ; la route de tête
 *  du calcul remplace la ligne de son niveau quand c'est la même (ses plis). null hors « Auto » ou sans réponse. */
function autoList(n) {
  const L = S.autoLv;
  if (!S.flight?.level?.auto || !L || L.busy || !L.res?.ok) return null;
  const head = n?.plans?.[0],
    rows = L.res.levels.filter(x => x.ok && x.route).map(x => {
      const p = RE.levelPlan(x);
      return head && !head.proposal && head.route === p.route && (head.fl === x.fl || head.fl === null) ? {
        ...head,
        fl: x.fl,
        connector: p.connector
      } : p;
    });
  if (!rows.length) return null;
  const tier = a => a.faulty || a.verdict === 'violates' ? 2 : a.verdict === 'conform' ? 0 : 1,
    fuel = a => fig0(routeFigures(a.points, a.distanceNm, a.fl)),
    kept = L.pickFl,
    list = rows.map(a => [a, fuel(a)]).sort(([a, x], [b, y]) => (b.fl === kept) - (a.fl === kept) || tier(a) - tier(b) || figCmp(x, y) ||
      a.fl - b.fl).slice(0, 5).map(([a]) => a);
  return {
    list,
    at: L.at,
    kept: list.findIndex(a => a.fl === kept)
  };
}
/** Un niveau de vol en centaines de pieds, entier, de FL010 à FL660 (une entrée de data/ : jamais pris sans cette borne). */
const flOk = v => Number.isInteger(v) && v >= 10 && v <= 660;
/** SOG-0533 : une route prise (from 'engine') calculée pour un autre niveau que celui du plan de vol (le devis, C.levelFt, que la case
 *  15 écrit en tête) : { c, f }, le niveau du calcul et celui du vol (centaines de pieds) ; null sinon — une route tapée, d'un OFP, d'un
 *  vol d'avant (sans calcFl), ou au même niveau. */
function routeStale(C = S.C) {
  const r = S.flight?.route || {},
    c = flOk(r.calcFl) ? r.calcFl : null,
    f = +C?.levelFt > 0 ? Math.round(+C.levelFt / 100) : null;
  return r.from === 'engine' && c && f && c !== f ? {
    c: String(c).padStart(3, '0'),
    f: String(f).padStart(3, '0')
  } : null;
}
/** SOG-0548 : ce que Carburant tient des procédures d'un terrain — { SID, STAR } (vrai : au moins une lue dans la base) ; null tant que
 *  la base n'a pas répondu (la liste est redessinée à la réponse). Gardé par terrain (S.procHave), relu après une lecture. */
function procHave(icao) {
  const k = String(icao || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(k) || typeof S?.ctx?.aerodb?.procedures !== 'function') return null;
  S.procHave ||= new Map();
  if (S.procHave.has(k)) return S.procHave.get(k);
  S.procHave.set(k, null);
  const s = S;
  Promise.resolve().then(() => s.ctx.aerodb.procedures(k)).catch(() => []).then(list => {
    if (gone(s)) return;
    const l = (Array.isArray(list) ? list : []).filter(p => p && !PR.isDoubt(p));
    s.procHave.set(k, {
      SID: l.some(p => p.kind === 'SID'),
      STAR: l.some(p => p.kind === 'STAR')
    });
    if (s.ralts?.list?.length) routeAltsDraw();
  });
  return null;
}
/** SOG-0548 (l'ergonome) : sur la ligne « enfreint » d'un raccord au-delà de sa limite, quand Carburant ne tient aucune arrivée (ou aucun
 *  départ) pour ce terrain : « aucune arrivée lue pour {terrain} » et le geste de lecture du bloc Procédures (mêmes mots, même appel :
 *  S.P.readButtonFor, SOG-0527 ; rien quand l'État ne se lit pas) ; '' sinon. */
function noProcHtml(v) {
  const ad = String(v?.ad || '').toUpperCase(),
    end = v?.end;
  if (!['dep', 'arr'].includes(end)) return '';
  const h = procHave(ad);
  if (!h || h[end === 'dep' ? 'SID' : 'STAR']) return '';
  const b = typeof S.P?.readButtonFor === 'function' ? S.P.readButtonFor(ad, false, true) : ''; // l'action et son objet (l'ergonome)
  return `<span class="f-warn" data-noproc> — ${esc(tt(end === 'dep' ? TX.rNoDepRead : TX.rNoArrRead, { ad }))}</span>${b ? ` ${b}` : ''}`;
}
/** SOG-0548 : une lecture de procédures finie pour `k` — ce que Carburant en tient relu ; si elle a apporté la procédure d'un raccord
 *  que la liste dit enfreint, la liste est périmée (« Recalculer » : le calcul suivant la prend, jamais un calcul tout seul). */
async function routeReadDone(k) {
  if (!S?.procHave?.has(k)) return;
  const s = S;
  s.procHave.delete(k);
  const list = await Promise.resolve().then(() => s.ctx.aerodb.procedures(k)).catch(() => []);
  if (gone(s)) return;
  const l = (Array.isArray(list) ? list : []).filter(p => p && !PR.isDoubt(p)),
    h = {
      SID: l.some(p => p.kind === 'SID'),
      STAR: l.some(p => p.kind === 'STAR')
    },
    R = s.ralts;
  s.procHave.set(k, h);
  if (R?.list?.some(a => (a.reasons?.violates || []).some(r => r.code === 'connector_limit' && String(r.values?.ad || '')
      .toUpperCase() === k &&
      h[r.values?.end === 'dep' ? 'SID' : 'STAR']))) R.procStale = R.stale = true;
  if (R?.list?.length) routeAltsDraw();
}
/** SOG-0532 (3) : le mot du verdict sur la ligne d'un itinéraire qui n'enfreint rien de connu — « conforme à ce que nous savons lire »
 *  ou « Non vérifiable : N point(s) » ; '' d'une réponse sans verdict. */
function verdictWord(a, good = null) {
  // SOG-0545 (l'ergonome) : good vrai, le seul verdict bon (« conforme », sur la ligne du niveau) ; faux, le seul qui ne l'est pas (sa
  // ligne à lui, en gras) ; null, l'un ou l'autre
  if (good === true && a.verdict !== 'conform') return '';
  if (good === false && a.verdict === 'conform') return '';
  // SOG-0532 (l'ergonome) : sous le SEUL verdict « conforme », une ligne courte et visible — jamais dans un pli
  // SOG-0545 (l'ergonome, maquette v2) : « conforme » en un mot sur la route ; son sens et « Seul Eurocontrol valide un plan. » une fois,
  // sous « Calculé à … » (SOG-0552 : « Seul Eurocontrol valide un plan. » seul, RR.ROWS.onlyEurocontrol)
  if (a.verdict === 'conform') return ` <span class="f-muted" data-verdict="conform">${esc(tt(TX.rConformShort))}</span>`;
  if (a.verdict === 'unverifiable') return `<b class="f-warn fu-rh2" data-verdict="unverifiable">${esc(unverifTitle(a.reasons.unverifiable, a.uCount))}</b>`;
  return '';
}
/** SOG-0532 (l'ergonome) : le titre « Non vérifiable : N point(s) » — UN compte, celui des lignes du groupe, quelle que soit leur nature
 *  (une ligne d'État ou de cycle périmé est un point) ; une liste vide : un point (un verdict sans raison donnée). */
function unverifTitle(list, n = 0) {
  return tt(RR.ROWS.groupUnverifiable, {
    n: n || list.length || 1 // SOG-0545 : une ligne de route/levels donne son compte (unverifiable_count), pas sa liste
  });
}
/** SOG-0532 (3) : les deux groupes, montrés s'ils ont des lignes — « Règles connues enfreintes », « Non vérifiable : N point(s) » ;
 *  chaque ligne composée dans la langue de l'écran (RR.compose, posée par esc), sept au plus, puis « et N autre(s) » qui ouvre le
 *  reste. `open` : dépliés (le contrôle d'une route tapée). */
function verdictsHtml(a, open = false) {
  const lang = S.ctx.lang(),
    // SOG-0532 lot 2 (l'ergonome) : la ligne d'un État dont des règles du RAD portent sur la route EST le bouton qui ouvre leur liste
    // (sept, puis le reste) ; sans liste, une ligne simple
    line = r => {
      const text = esc(RR.compose(r, tt, lang, {
          fl: a.fl
        }) || '—'),
        nv = r.code === 'rad_unread' ? (a.notVerified || []).find(x => x.state === String(r.values?.state || '').toUpperCase()) : null,
        it = nv?.items || [],
        li = x => `<li data-rule>${esc(RR.ruleLine(x, tt))}</li>`;
      if (!it.length && r.code === 'connector_limit') return `<li data-reason="${esc(r.code)}">${text}${noProcHtml(r.values)}</li>`;
      return it.length ? `<li data-reason="${esc(r.code)}"><details class="fu-faultmore" data-staterules><summary>${text}</summary><ul class="fu-faultlist">${it.slice(0, 7).map(li).join('')}</ul>${it.length > 7 ? `<details class="fu-faultmore" data-rulesmore><summary class="f-muted">${esc(tt(RR.ROWS.more, { n: it.length - 7 }))}</summary><ul class="fu-faultlist">${it.slice(7).map(li).join('')}</ul></details>` : ''}</details></li>` : `<li data-reason="${esc(r.code)}">${text}</li>`;
    },
    group = (list, kind, title, cls) => list.length ? `<details class="fu-rverdicts" data-reasons="${kind}"${open ? ' open' : ''}><summary class="${cls}">${esc(title)}</summary><ul class="fu-faultlist">${list.slice(0, 7).map(line).join('')}</ul>${list.length > 7 ? `<details class="fu-faultmore" data-reasonsmore><summary class="f-muted">${esc(tt(RR.ROWS.more, { n: list.length - 7 }))}</summary><ul class="fu-faultlist">${list.slice(7).map(line).join('')}</ul></details>` : ''}</details>` : '',
    R = a.reasons || {
      violates: [],
      unverifiable: []
    };
  // la ligne des règles qui visent un espace aérien entier (SOG-0538, sans nombre) : SOG-0552 (l'ergonome, 23/11) — jamais dans les cartes
  // de la liste (dite une fois au-dessus) ; le contrôle d'une route tapée (open, pas une liste) la garde sous son verdict
  const note = open && (a.spacesOnly > 0 || (a.verdict === 'conform' && !a.faulty)) ? `<p class="f-muted" data-spacesonly>${esc(tt(RR.ROWS.spacesOnly))}</p>` : '',
    // SOG-0530 (l'ergonome, 21/11) : le niveau de croisière, le moins grave en dernier, ton d'avertissement — il ne change JAMAIS le
    // verdict ; {n} ne compte que les niveaux hors règle (sans eux, le titre sans compte) ; sa note hors compte dessous, ou seule
    lw = a.levelWarn || [],
    lr = a.levelRule || {},
    n = lr.warnings ?? lw.filter(r => r.code === 'level_semicircular').length, // levelRule.warnings (AeroDB b083e967a)
    level = group(lw, 'level', n ? tt(RR.ROWS.groupLevel, {
      n
    }) : tt(RR.ROWS.groupLevel0), 'f-warn'),
    levelNote = lr.note ? `<p class="f-muted" data-levelnote="${esc(lr.note)}">${esc(tt(lr.note === 'table_missing' ? RR.ROWS.levelTableMissing : RR.ROWS.levelAbroad))}</p>` : '';
  // SOG-0554 : sur une carte, le verdict est dit en gras au-dessus — le pli dit ce qu'il ouvre ; dans la boîte « Contrôler » (open, sans
  // ligne de verdict), le titre du pli EST le verdict
  return group(R.violates, 'violates', tt(RR.ROWS.groupViolates), 'f-warn') + group(R.unverifiable, 'unverifiable', open ? unverifTitle(R
    .unverifiable) : tt(TX.rSeeWhy), 'f-warn') + level + levelNote + note;
}
/** SOG-0532 (4) : le nombre des règles connues que la route du vol enfreint — celle prise d'un calcul (route.violations, une entrée de
 *  data/ : entier borné), sinon le jugement de « Contrôler » sur CE texte ; 0 sinon. */
function routeViolations() {
  const r = S.flight?.route || {},
    n = v => Number.isInteger(v) && v > 0 && v <= 300 ? v : 0;
  if (r.from === 'engine') return n(r.violations);
  return S.rcheck && S.rcheck.text === String(r.text || '') ? n(S.rcheck.violations) : 0;
}
/** SOG-0533 : « Route calculée pour le FL… — à recalculer », avec « Recalculer », sous la liste des itinéraires ; cachée sinon. */
function staleDraw(C) {
  const p = S.body?.querySelector('[data-rstale]'),
    x = routeStale(C);
  if (!p) return;
  p.hidden = !x;
  p.querySelector('[data-rstaletext]').textContent = x ? tt(TX.rFlStale, x) : '';
}
/** « Auto » (SOG-0056) : le niveau suit le devis (level.auto) ; le prochain dessin choisit le niveau (refresh → levelAuto). */
function levelAutoOn() {
  const b = S.body?.querySelector('[data-do="levelauto"]');
  if (!b || b.disabled) return;
  S.flight.level = {
    ...(S.flight.level || {}),
    auto: true
  };
  S.autoTries = 0;
  saveFlight();
  refresh();
}
/** Le niveau « Auto » après un calcul (SOG-0056) : tant que level.auto, le niveau qui brûle le moins (FuelLevels.autoLevel sur la série
 *  déjà chiffrée, bornée par le plafond de la fiche et par la plus haute contrainte d'une procédure choisie) est posé s'il a changé, puis
 *  redessiné (deux fois au plus de suite : un vent au nouveau niveau ne fait jamais osciller) ; le bouton dit pourquoi il est inactif ;
 *  la ligne sous le champ dit « FL180 (auto) · 1:02 ». Rend vrai si un nouveau niveau a été posé (le dessin en cours s'arrête). */
function levelAuto(C) {
  const b = S.body?.querySelector('[data-do="levelauto"]'),
    line = S.body?.querySelector('[data-lvlauto]'),
    f = S.flight,
    sheet = C.sheet,
    noSheet = !sheet || String(sheet.id || '').startsWith('TYPE_') || !C.perf,
    noRoute = !(C.nm > 0) || (f.route?.points || []).length < 2,
    why = noSheet ? TX.levelAutoNoSheet : noRoute ? TX.levelAutoNoRoute : null;
  if (b) {
    b.disabled = !!why;
    b.title = tt(why || TX.levelAutoHint);
    b.setAttribute('aria-pressed', String(!!f.level?.auto));
  }
  const cons = Object.values(f.route?.constraints || {}).map(Number).filter(v => v > 0),
    lim = {
      minFt: Math.max(3000, ...cons),
      maxFt: +sheet?.cruise?.ceilingFt > 0 ? +sheet.cruise.ceilingFt : 20000
    },
    cands = !why && f.level?.auto && C.D ? (window.FuelLevels.autoCandidates || (() => []))(C.D, +f.route?.trackDeg || 0, {
      ...lim,
      max: RE.LEVELS_MAX
    }) : [],
    // SOG-0530 lot C : sans moteur, le choix d'avant — le moins gourmand de la parité du cap (« route non vérifiée », dit)
    blind = cands.length ? window.FuelLevels.autoLevel?.(C.D, +f.route?.trackDeg || 0, lim) || cands[0] : null;
  // SOG-0529 : le moteur de route juge les candidats (route/levels, une demande par clé du vol) ; le choix se fait ici
  const J = cands.length ? autoJudge(cands, blind) : null;
  if (J?.busy) {
    lvlLines(line, '', {
      main: tt(TX.levelAutoBusy)
    });
    return false;
  }
  if (J?.none) {
    S.autoTries = 0;
    lvlLines(line, '', J.none); // aucun niveau valide : le niveau n'est pas changé, et c'est dit (la raison du moteur dans le pli)
    return false;
  }
  const a = J?.pick || null;
  if (a && a.h !== +f.level?.ft && (S.autoTries || 0) < 2) {
    S.autoTries = (S.autoTries || 0) + 1;
    f.level = {
      ft: a.h,
      auto: true
    };
    const i = S.body?.querySelector('[data-k="fl"]');
    if (i) i.value = Math.round(a.h / 100);
    renderPts();
    if (S.aloft) aloftApply();
    saveFlight();
    refresh();
    return true;
  }
  S.autoTries = 0;
  const said = f.level?.auto && C.q?.hasFuel;
  lvlLines(line, said ? tt(TX.levelAutoSaid, {
    fl: flTxt(+f.level.ft),
    t: hmm(C.q.minutes)
  }) : '', said && J?.say ? J.say(flTxt(+f.level.ft), hmm(C.q.minutes)) : null);
  return false;
}
/** SOG-0529 : la ligne courte sous le champ Niveau (« auto · 1:12 », une ligne de hauteur réservée : la rangée Niveau / Date ne bouge
 *  jamais — F122, F243) et l'explication du choix d'« Auto », à part, sous la rangée et pleine largeur (data-lvlwhy) : why = { main, reason }
 *  — la phrase courte, puis la raison du moteur dans un pli qui se déplie au toucher (data-lvlfold, le bloc des critères du dégagement ;
 *  son état ouvert gardé) ; tout caché sans phrase. Textes posés par textContent (la raison vient du lanceur). */
function lvlLines(line, short, why) {
  if (line) line.textContent = short;
  const w = S.body?.querySelector('[data-lvlwhy]');
  if (!w) return;
  const main = why?.main || '',
    reason = why?.reason || '',
    m = w.querySelector('[data-lvlmain]'),
    fold = w.querySelector('[data-lvlfold]'),
    r = w.querySelector('[data-lvlreason]');
  if (m) m.textContent = main;
  if (r) r.textContent = reason;
  if (fold) fold.hidden = !reason;
  w.hidden = !main;
}
/** SOG-0529 : arrête la recherche de « Auto » (un niveau saisi, un autre vol, le démontage) — le travail du lanceur est annulé. */
function autoStop() {
  S?.autoLv?.ctrl?.abort();
  if (S) S.autoLv = null;
}
/** SOG-0529 (l'utilisateur : FL090 choisi par « Auto », plan de vol refusé par l'IFPS) : les candidats (FuelLevels.autoCandidates, dans
 *  l'ordre des préférences) jugés par le moteur de route — UN appel route/levels par clé du vol (les arguments de « Calculer » sans niveau,
 *  et l'ensemble des candidats), gardé (S.autoLv) ; le choix refait ici à chaque dessin. Rend { busy } pendant l'appel ; { none } (la
 *  phrase) quand aucun n'est valide ; sinon { pick, say(fl, t) } — pick : le premier VALIDE dont le raccord est une procédure (ou 'none'),
 *  sinon le premier valide en raccord direct (dit) ; sans lanceur ou sur un échec, le moins gourmand, « route non vérifiée (cause) ». */
function autoJudge(cands, blind = cands[0]) {
  const launcher = S.ctx.launcher,
    flOf = c => Math.round(c.h / 100),
    unchecked = cause => ({
      pick: blind,
      say: (fl, t) => ({
        main: tt(TX.levelAutoUnchecked, {
          fl,
          t,
          why: tt(TX.levelAutoCause[cause] || TX.levelAutoCause.failed)
        })
      })
    });
  if (typeof launcher?.job !== 'function') return unchecked('nolauncher');
  // la clé (Sécurisation) : sans la date tirée de l'horloge (argsKey : l'heure prévue du vol en tient lieu — sinon un appel de plus à chaque
  // minute) ni les vitesses (elles suivent le niveau : chaque niveau posé relancerait l'appel)
  const {
    speed_kt,
    climb_fpm,
    descent_fpm,
    terminal_speed_kt,
    ...base
  } = RE.levelsArgs(routeArgs('compute'), []),
    key = JSON.stringify([argsKey(base), cands.map(flOf).sort((x, y) => x - y)]);
  if (S.autoLv?.key !== key) {
    autoStop();
    const s = S,
      ctrl = new AbortController();
    S.autoLv = {
      key,
      busy: true,
      ctrl
    };
    RE.levels(launcher, RE.levelsArgs(routeArgs('compute'), cands.map(flOf)), {
      signal: ctrl.signal
    }).then(raw => {
      if (gone(s) || s.autoLv?.key !== key) return;
      xpNoteAnswer(raw); // SOG-0545 : un point placé d'après X-Plane sert au calcul, jamais écrit
      s.autoLv = {
        key,
        busy: false,
        at: new Date().toISOString(), // SOG-0545 : « Calculé à » de la liste par niveau
        res: RE.levelsRead(raw) || {
          ok: false,
          reason: 'failed'
        }
      };
      refresh(); // le dessin refait choisit sur la réponse
    });
  }
  const L = S.autoLv;
  if (L.busy) return {
    busy: true
  };
  if (!L.res?.ok) return unchecked(L.res?.reason || 'failed');
  // L'ordre de l'ergonome (SOG-0540, SOG-0530 lot C point 4) : d'abord le VERDICT — « conforme » avant « non vérifiable », un niveau
  // qui enfreint une règle connue jamais gardé (ni valide, ni retenu) ; puis la règle semi-circulaire (les niveaux que le moteur dit
  // conformes, conforming_tried) ; puis le raccord publié (un raccord direct passe après une procédure, et reste dit)
  const by = new Map(L.res.levels.map(x => [x.fl, x])),
    valid = cands.filter(c => by.get(flOf(c))?.valid && by.get(flOf(c)).verdict !== 'violates'),
    conf = new Set(L.res.conformingTried || []),
    // SOG-0545 (l'ergonome, critère a) : le DERNIER critère est le carburant d'étape chiffré de la route du niveau (ses points, à son
    // niveau) ; sans points (une réponse plus ancienne), l'ordre des préférences
    fuelOf = c => {
      const x = by.get(flOf(c));
      return x?.points?.length >= 2 && x.distanceNm > 0 ? fig0(routeFigures(x.points, x.distanceNm, x.fl)) : null;
    },
    byFuel = list => list.map((c, k) => [c, k, fuelOf(c)]).sort((p, q) => figCmp(p[2], q[2]) || p[1] - q[1]).map(([c]) => c),
    pref = list => {
      const l = byFuel(list);
      return l.find(c => by.get(flOf(c)).connector !== 'direct') || l[0] || null;
    },
    within = list => pref(list.filter(c => conf.has(flOf(c)))) || pref(list),
    pick = within(valid.filter(c => by.get(flOf(c)).verdict !== 'unverifiable')) || within(valid.filter(c => by.get(flOf(c))
      .verdict === 'unverifiable')),
    partial = L.res.stopped === 'time' || L.res.stopped === 'cancelled' ? tt(TX.levelAutoPartial, {
      n: L.res.levels.length,
      m: cands.length
    }) : '';
  L.pickFl = pick ? flOf(pick) : null; // SOG-0545 : la ligne qu'« Auto » garde dans la liste par niveau
  if (!pick) {
    const fls = cands.map(flOf),
      first = cands.map(c => by.get(flOf(c))).find(Boolean);
    return {
      none: {
        main: tt(TX.levelAutoNone, {
          lo: flTxt(Math.min(...fls) * 100),
          hi: flTxt(Math.max(...fls) * 100)
        }) + partial,
        reason: first?.reason || ''
      }
    };
  }
  // le premier candidat plus économique écarté par le moteur, et sa raison (celle du moteur, jamais réécrite)
  const skipped = cands.slice(0, cands.indexOf(pick)).map(c => by.get(flOf(c))).find(x => x && !x.valid);
  return {
    pick,
    say: (fl, t) => ({
      main: tt(TX.levelAutoValid, {
        fl,
        t
      }) + (by.get(flOf(pick)).semicircular !== 'warning' ? '' : L.res.noConformingValid ? tt(TX.levelAutoNoConform) : tt(TX
        .levelAutoSemi)) + (by.get(flOf(pick)).connector === 'direct' ? tt(TX.levelAutoDirect) : '') + (skipped ? tt(TX
        .levelAutoSkip, {
          fl: flTxt(skipped.fl * 100)
        }) : '') + partial,
      reason: skipped?.reason || '' // la raison du moteur, telle quelle, dans le pli
    })
  };
}

/** SOG-0391 (b bis) : « Recalculer à FLxxx » — le niveau du vol posé à ce FL (comme une saisie : « Auto » retiré), puis le calcul relancé ;
 *  rien d'autre. Un FL hors de FL10 à FL660 est ignoré. */
function recomputeAt(fl) {
  if (!Number.isInteger(fl) || fl < 10 || fl > 660) return;
  setLevel(fl * 100);
  return routeAsk('compute');
}

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
/** Pose ou retire le niveau imposé d'un point de procédure (route.constraints, identifiant → pieds ; SOG-0003). Refusé, dit et le champ
 *  vidé, au-dessus du plafond de la fiche, ou quand la pente pour le rejoindre depuis le terrain (SID) ou pour rejoindre le terrain
 *  (STAR, approche) dépasse d'un tiers celle de la fiche (montée ou descente : vario et vitesse vraie ; 400 ft/NM sans fiche). */
function setConstraint(input) {
  const r = S.flight.route ||= emptyFlight().route,
    fix = String(input.dataset.fix || '').toUpperCase(),
    v = num(input.value),
    cons = r.constraints && typeof r.constraints === 'object' ? {
      ...r.constraints
    } : {};
  if (!fix) return;
  if (!(v > 0)) delete cons[fix];
  else {
    const ft = Math.round(v) * 100,
      sheet = S.C?.sheet,
      ceil = +sheet?.cruise?.ceilingFt || 0,
      say = (row, vals) => {
        S.ctx.notify(tt(row, vals), 'warn');
        input.value = +cons[fix] > 0 ? Math.round(cons[fix] / 100) : '';
      };
    if (ceil > 0 && ft > ceil) return say(TX.pconCeiling, {
      id: fix,
      fl: Math.round(ft / 100),
      c: Math.round(ceil / 100)
    });
    const fp = fpNow(),
      p = fp?.find(x => String(x.id || '').toUpperCase() === fix);
    if (p && fp.length >= 2) {
      const dep = input.dataset.kind === 'sid',
        nm = dep ? p.nm : fp.at(-1).nm - p.nm,
        phase = dep ? sheet?.climb : sheet?.descent,
        grad = phase?.rateFpm > 0 && phase?.tasKt > 0 ? phase.rateFpm / (phase.tasKt / 60) : 400,
        need = nm > 0 ? ft / nm : Infinity;
      if (need > grad * 4 / 3) return say(TX.pconSlope, {
        id: fix,
        fl: Math.round(ft / 100),
        nm: Math.round(nm),
        g: Math.round(need),
        m: Math.round(grad)
      });
    }
    cons[fix] = ft;
  }
  if (Object.keys(cons).length) r.constraints = cons;
  else delete r.constraints;
  saveFlight();
  refresh();
}
/** Les niveaux posés sur les points de la route (hors départ et arrivée) qui ne sont pas celui du plan : une ligne près du niveau, avec
 *  ce que la montée et la croisière durent alors, et un geste (SOG-0020 ; rien de modal) ; masquée sinon. */
function lvlMix(C) {
  const el = S.body?.querySelector('[data-lvlmix]');
  if (!el) return;
  const plan = +S.flight.level?.ft || 0,
    pts = (S.flight.route?.points || []).slice(1, -1),
    lv = [...new Set(pts.map(p => +p.alt_ft || 0).filter(x => x > 0))].sort((a, b) => a - b);
  if (!plan || !lv.length || lv.includes(plan)) {
    el.hidden = true;
    return;
  }
  const fl = ft => `FL${String(Math.round(ft / 100)).padStart(3, '0')}`,
    q = C?.q,
    hm = m => fmtHm(m), // SOG-0468 (4) : arrondi à la minute AVANT le partage (jamais « 1:60 »)
    times = q?.climb?.min != null && q?.cruise?.min != null ? tt(TX.lvlMixTimes, {
      c: hm(q.climb.min),
      k: hm(q.cruise.min)
    }) : '';
  el.hidden = false;
  el.innerHTML = `${esc(tt(TX.lvlMix, { p: lv.map(fl).join('–'), l: fl(plan) }) + times)} <button type="button" class="fu-linkbtn" data-do="alignlvl">${esc(tt(TX.lvlAlign))}</button>`;
}
/** « Aligner les points sur le plan » : les niveaux posés sur les points de la route sont retirés (ils suivent alors le plan). */
function alignLevels() {
  for (const p of S.flight.route?.points || []) delete p.alt_ft;
  routeEdited();
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
    // SOG-0243, Q-0019 (l'utilisateur : « Oui ») : chaque tronçon direct au compas, sa loxodromie ; la route est leur somme, son cap
    // celui de la loxodromie du départ à l'arrivée (un seul vent moyen sur un seul cap : le modèle du vent n'est pas refait ici)
    r.distanceNm = Math.round(points.slice(1).reduce((s, p, i) => s + rhumbNm(points[i], p), 0));
    r.trackDeg = Math.round(rhumbCourse(points[0], points.at(-1)));
    r.manual = false;
    S.rmanualOpen = false;
    const $ = k => S.body?.querySelector(`[data-k="${k}"]`);
    if ($('dist')) $('dist').value = distField(r.distanceNm);
    if ($('trk')) $('trk').value = r.trackDeg;
  }
  renderRinfo();
  rhumbWarn(r); // Q-0019 : la ligne des directs trop longs au compas
}
/** Ligne de lecture sous la route : distance, route vraie et leur source (route résolue, OFP SimBrief, saisie à la
 *  main) ; sans route résolue, « Saisir à la main » déplie les deux champs (gardés ouverts tant que la saisie à la
 *  main tient). */
function renderRinfo() {
  rviaDraw(); // SOG-0517 : les passages imposés au calcul, nommés
  const box = S.body?.querySelector('[data-rinfo]');
  if (!box) return;
  const r = S.flight.route || {},
    resolved = (r.points || []).length >= 2,
    open = !!r.manual || !!S.rmanualOpen;
  // une seule distance (parcours de BUGS SOG, 30 octobre) : celle du chemin « route + procédures » quand les procédures choisies sont
  // lues — la même que le devis et la coupe —, dite comme telle ; sinon celle de la route
  const fp = r.manual ? null : fpNow(),
    nm = fp ? fp.at(-1).nm : r.distanceNm;
  box.textContent = (resolved || r.manual) && nm > 0 ? tt(TX.rinfo, {
    d: distTxt(nm),
    t: r.trackDeg != null ? String(Math.round(r.trackDeg)).padStart(3, '0') : '—',
    s: tt(TX.rsrc[r.manual ? 'manual' : fp ? 'procs' : r.from === 'ofp' ? 'ofp' : 'route'])
  }) : tt(TX.rnone);
  S.body.querySelector('[data-rmanual]')?.classList.toggle('fu-hide', !open);
  const link = S.body.querySelector('[data-do="rmanual"]');
  if (link) link.hidden = open || resolved;
}
/** Liste des points (ordre, niveau facultatif, monter, descendre, retirer) ; le niveau ne se règle pas au départ ni à
 *  l'arrivée. L'indication d'un point sans niveau est celui qu'il continue. */
/** Les procédures choisies et lues, en groupes de la liste des points (V3 § 10.31) : [{ kind: 'sid' | 'star' | 'app', label, fixes }]
 *  — « SID NTS1A », « STAR MEN1A via NEPIX », « I13R via ODILO 1A » ; fixes : les identifiants de leurs repères (transition comprise),
 *  hors seuil et approche interrompue. [] tant que les procédures du vol ne sont pas lues. */
function procGroups() {
  const pr = S.procs?.key === procsKey(S.flight) ? S.procs.procs : null;
  if (!pr) return [];
  const via = t => t?.transition ? ` via ${t.transition}` : '',
    out = [];
  if (pr.sid) out.push({
    kind: 'sid',
    label: `SID ${PR.nameOf(pr.sid, pr.sid.id)}${via(pr.sidTrans)}`,
    fixes: [...new Set([...PR.pointsOf(pr.sid), ...PR.pointsOf(pr.sidTrans)])]
  });
  if (pr.star) out.push({
    kind: 'star',
    label: `STAR ${PR.nameOf(pr.star, pr.star.id)}${via(pr.starTrans)}`,
    fixes: [...new Set([...PR.pointsOf(pr.starTrans), ...PR.pointsOf(pr.star)])]
  });
  if (pr.app) out.push({
    kind: 'app',
    label: `${PR.labelOf(pr.app)}${via(pr.appTrans)}`,
    fixes: [...new Set([...PR.pointsOf(pr.appTrans), ...PR.pointsOf(pr.app)])]
  });
  return out;
}
/** Liste des points de l'étape Route : les points du pilote (niveau, monter, descendre, retirer) et, pour chaque procédure choisie,
 *  UNE ligne de groupe repliée dans sa teinte (« SID NTS1A · 3 points »), ses repères dépliés au toucher, jamais au rang des points
 *  tapés (§ 10.31) : la SID après le départ, la STAR et l'approche avant l'arrivée ; un point de la route qui est un repère d'une
 *  procédure choisie (sa sortie, son entrée) est dans son groupe. Le compte « Points (N) » : les points montrés et les groupes. */
function renderPts() {
  const box = S.body?.querySelector('[data-pts]');
  if (!box) return;
  const pts = S.flight.route?.points || [],
    plan = +S.flight.level?.ft || 0,
    groups = procGroups(),
    inGroup = new Set(groups.flatMap(g => g.fixes)),
    group = g => `<details class="f-item fu-ptgrp" data-kind="${g.kind}"><summary>${esc(`${g.label} · ${tt(pl(g.fixes.length, TX.ptsGroup1, TX.ptsGroupN), { n: g.fixes.length })}`)}</summary><div class="fu-ptfix">${g.fixes.map(fx => `<label class="f-item fu-pt" data-hover-pt="${esc(fx)}"><span class="fu-ptid"><b>${esc(fx)}</b></span><input data-k="pcon" data-fix="${esc(fx)}" data-kind="${g.kind}" inputmode="numeric" maxlength="3" value="${+S.flight.route?.constraints?.[fx] > 0 ? Math.round(S.flight.route.constraints[fx] / 100) : ''}" aria-label="${esc(tt(TX.pconLabel, { id: fx }))}"></label>`).join('')}</div></details>`;
  // les noms de la route sans position (SOG-0035) : une ligne chacun, à sa place, avec sa raison ; pour le texte qui les a lus seulement
  const un = S.unres && S.unres.text === S.flight.route?.text ? S.unres.rows : [],
    why = S.unres?.zone ? tt(TX.ptUnresZone, S.unres.zone) : tt(TX.ptUnres),
    unRows = i => un.filter(x => x.i === i).map(x => `<div class="f-item fu-pt fu-ptunres" data-unres-pt="${esc(x.id)}"${x.gap ? ` data-zone="${esc(x.gap.id)}" data-zstate="${esc(x.gap.state)}"` : ''}><span class="fu-ptid"><b>${esc(x.id)}</b><small class="f-warn">${esc(x.gap && ZG.stateText(x.gap, tt) || why)}</small></span><span class="fu-ptgap"></span></div>`).join('');
  let cur = plan,
    shown = un.length;
  // SOG-0081 : les segments fautifs du dernier contrôle, s'il porte sur le texte d'aujourd'hui
  const rc = S.rcheck && S.rcheck.text === String(S.flight.route?.text || '') ? S.rcheck.segments : null;
  box.innerHTML = pts.length ? unRows(-1) + pts.map((p, i) => {
    const mid = i > 0 && i < pts.length - 1,
      hint = cur > 0 ? Math.round(cur / 100) : '';
    if (mid && p.alt_ft > 0) cur = p.alt_ft;
    const before = i === pts.length - 1 && i > 0 ? groups.filter(g => g.kind !== 'sid').map(group).join('') : '',
      after = i === 0 ? groups.filter(g => g.kind === 'sid').map(group).join('') : '';
    if (mid && inGroup.has(String(p.id || '').toUpperCase())) return unRows(i); // un repère de procédure : dans son groupe
    shown++;
    const id = esc(p.id || '?'),
      lock = p.lock === 'mission', // SOG-0193 L3 : ni monté, ni descendu, ni retiré
      off = lock ? ` disabled title="${esc(tt(TX.ptLocked, { id: p.mission || p.id }))}"` : '',
      bad = rc ? rc.find(g => g.state === 'error' && g.to === String(p.id || '').toUpperCase()) : null;
    return `${before}<div class="f-item fu-pt${bad ? ' fu-pterr' : ''}${mid && holdShown(p) ? ' fu-pthas' : ''}"${p.id ? ` data-hover-pt="${id}"` : ''}${bad ? ` data-segerr="${esc(`${bad.from}-${bad.to}`)}"` : ''}>${bad ? `<small class="fu-segwhy" data-segwhy>${esc(`${bad.from} → ${bad.to}${bad.via ? ` (${bad.via})` : ''} : ${bad.reasons.map(x => `${x.kind} — ${x.text}`).join(' ; ')}`)}</small>` : ''}<span class="fu-ptid"><b>${id}</b><small class="f-muted">${(+p.lat).toFixed(2)} ${(+p.lon).toFixed(2)}</small>${lock ? `<small class="fu-ptlock" data-lock>${svg('pin')} ${esc(tt(TX.ptLock, { id: p.mission || p.id }))}</small>` : ''}${mid && !holdShown(p) ? holdAdd(p, i) : ''}</span>
      ${mid ? `<input data-k="ptalt" data-i="${i}" inputmode="numeric" maxlength="3" value="${p.alt_ft > 0 ? Math.round(p.alt_ft / 100) : ''}" placeholder="${hint}" aria-label="${esc(tt(TX.ptLevel, { id: p.id }))}">` : '<span class="fu-ptgap"></span>'}
      <button type="button" data-do="ptup" data-i="${i}" ${i && !lock ? '' : 'disabled'}${off} aria-label="${esc(tt(TX.ptUp, { id: p.id }))}">${svg('chevron-up')}</button><button type="button" data-do="ptdown" data-i="${i}" ${i < pts.length - 1 && !lock ? '' : 'disabled'}${off} aria-label="${esc(tt(TX.ptDown, { id: p.id }))}">${svg('chevron-down')}</button><button type="button" data-do="ptdel" data-i="${i}"${off} aria-label="${esc(tt(TX.ptDel, { id: p.id }))}">${svg('x')}</button>${mid && holdShown(p) ? holdField(p, i) : ''}</div>${after}${unRows(i)}`;
  }).join('') : `<p class="f-muted">${esc(tt(TX.ptsNone))}</p>`;
  const n = S.body.querySelector('[data-ptsn]');
  if (n) n.textContent = tt(TX.ptsN, {
    n: pts.length ? shown + groups.length : 0
  });
}
/** Points changés à la main : texte de la route réécrit, distance et route vraie déduites, vol courant écrit, devis
 *  refait ; la liste est redessinée sauf pendant la frappe d'un niveau (le champ garde la main). */
function routeEdited(redraw = true) {
  const r = S.flight.route,
    before = r.text || '';
  r.text = withRwys(RT.textFromPoints(r.points || [], r.text || '')); // voies gardées entre deux points restés voisins ; pistes (SOG-0089)
  r.typed = typedNames(r, before, r.text); // SOG-0517 : un point ajouté à la main est un passage voulu
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
  if (['ptup', 'ptdown', 'ptdel'].includes(act) && pts[i]?.lock === 'mission') return S.ctx.notify(tt(TX.ptLocked, {
    id: pts[i].mission || pts[i].id
  }), 'warn'); // SOG-0193 L3 : un point imposé par la mission
  if (act === 'ptup' && i > 0)[pts[i - 1], pts[i]] = [pts[i], pts[i - 1]];
  else if (act === 'ptdown' && i < pts.length - 1)[pts[i + 1], pts[i]] = [pts[i], pts[i + 1]];
  else if (act === 'ptdel') pts.splice(i, 1);
  else if (act === 'addpt') {
    S.addptAsked = '';
    const inp = S.body.querySelector('[data-k="addpt"]'),
      txt = inp.value.trim().toUpperCase();
    if (!txt) return;
    const m = /^([A-Z0-9]{2,7})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(txt),
      c = m ? {
        lat: +m[2],
        lon: +m[3]
      } : S.ctx.aerodb ? await xpBase(S.ctx.aerodb).coords(txt).catch(() => null) : null; // SOG-0375
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
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + rhumbNm(pts[i - 1], pts[i]));
  const k = cum.at(-1) > 0 ? distanceNm / cum.at(-1) : 1,
    out = pts.slice(1, -1).map((p, i) => p.alt_ft > 0 ? {
      nm: cum[i + 1] * k,
      ft: +p.alt_ft
    } : null).filter(Boolean);
  return out.length ? out : null;
}
// ---------------------------------------------------------------- pas de la préparation
/** SOG-0389 (b) : « Donner le niveau » — le pas Vol, le champ Niveau au milieu de l'écran et pris. */
function goLevel() {
  goStep(0);
  const i = S.body?.querySelector('input[data-k="fl"]');
  if (!i) return;
  i.scrollIntoView?.({
    block: 'center'
  });
  i.focus({
    preventScroll: true
  });
}
/** Va au pas i (0 Vol, 1 Route, 2 Météo, 3 Résultat, 4 Départ) : un seul pas visible sur téléphone et dans un volet ;
 *  dans un module large tous le sont (CSS @container) et la barre de pas est cachée. Pas gardé sur l'appareil. */
function goStep(i) {
  S.step = Math.max(0, Math.min(4, i));
  S.ui.step = S.step;
  if (S.step === 1) atisRead(); // SOG-0090 : l'ATIS est lue à l'ouverture de l'étape des procédures
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
/** Ce que la table régime / débit a servi à lire, à la suite de « Croisière : table régime / débit de la fiche » (SOG-0028) :
 *  « (2400 rpm entre 2300 et 2500 rpm, entre les courbes de 4000 et 8000 ft) » ; '' quand la croisière ne vient pas de la table. */
function usedText(u) {
  if (!u?.rpms?.length) return '';
  const r = Math.round(u.rpm),
    parts = [u.rpms.length === 2 ? tt(TX.usedRpm, {
      r,
      a: u.rpms[0],
      b: u.rpms[1]
    }) : tt(TX.usedRpm1, {
      r,
      a: u.rpms[0]
    })];
  if (u.alts?.length === 2) parts.push(tt(TX.usedAlt, {
    a: u.alts[0],
    b: u.alts[1]
  }));
  else if (u.alts?.length === 1) parts.push(tt(TX.usedAlt1, {
    a: u.alts[0]
  }));
  return ` (${parts.join(', ')})`;
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
  // SOG-0088 (refus du 13 nov., « il faut démarrer plusieurs fois ») : la relecture de la météo peut durer ; la ligne du départ, redessinée
  // par setPlanned et refresh pendant ce temps, redonnait un « Démarrer » libre — le premier geste semblait perdu. Le départ en cours
  // est tenu (S.starting) : le bouton reste occupé, un second geste ne fait rien
  if (S.starting) return;
  S.starting = true;
  // audit 197 : rendu à faux quoi qu'il arrive (une exception entre les deux laisserait le bouton occupé jusqu'au rechargement)
  try {
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }
    S.startNote = tt(TX.starting);
    if (note) note.textContent = S.startNote;
    // la planification peut dater : date du vol = maintenant, météo des terrains, vents en altitude et ISA relus, devis refait
    setPlanned(null);
    const online = S.ctx.net?.online?.() !== false;
    if (online) await wxFetch(false).catch(() => {});
    if (gone(s)) return;
    await arrInfoKeep().catch(
      () => {}); // SOG-0325 : « Démarrer » est un geste qui garde les données d'arrivée (une seule écriture : saveFlight)
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
  } finally {
    s.starting = false;
  }
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
// SOG-0468 (4) : « 45 min », « 1 h 05 », le formateur du cadre
const dur = min => fmtDur(min);
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
  const st = S.flight.started;
  if (!st?.at) return null;
  const P = progressPlan(C);
  if (!P) return null;
  const start = Date.parse(st.at),
    state = PG.at(P, (Date.now() - start) / 60000),
    pts = progPath().pts;
  return {
    P,
    st: state,
    pos: PG.position(pts, P.cum, state.nmFromDep),
    etas: PG.etas(P, start)
  };
}
/** Horaire prévu du vol (progress.js plan) d'après le devis, les vents de la route et le roulage ; null sans devis ou
 *  sans route. */
function progressPlan(C) {
  const f = S.flight,
    {
      pts,
      nm
    } = progPath(); // le chemin volé quand des procédures sont choisies (sa longueur), sinon la route
  if (!C?.q?.hasFuel || pts.length < 2) return null;
  return PG.plan({
    points: pts,
    distanceNm: nm,
    taxiMin: +S.settings.taxiMin || 0,
    q: C.q,
    legWinds: legWindsOf(pts),
    wind: f.wind,
    windComponent: window.FuelModel.windComponent,
    groundSpeed: window.FuelModel.groundSpeed // SOG-0281 : la même vitesse sol que le devis
  });
}
/** Le vent de chaque tronçon : moyenne vectorielle des vents prévus à ses deux bouts (prévision en altitude, points[].wind), sinon null
 *  (le tronçon prend le vent du vol). Lu par le devis et par le plan (SOG-0281). */
function legWindsOf(pts) {
  const vec = w => [w.kt * Math.sin(w.dirDeg * Math.PI / 180), w.kt * Math.cos(w.dirDeg * Math.PI / 180)],
    ok = w => w && Number.isFinite(+w.kt) && Number.isFinite(+w.dirDeg);
  return pts.slice(1).map((p, i) => {
    const a = pts[i].wind,
      b = p.wind;
    if (!ok(a) || !ok(b)) return null;
    const x = (vec(a)[0] + vec(b)[0]) / 2,
      y = (vec(a)[1] + vec(b)[1]) / 2;
    return {
      dirDeg: (Math.atan2(x, y) * 180 / Math.PI + 360) % 360,
      kt: Math.hypot(x, y)
    };
  });
}
/** Les tronçons du chemin pour le devis (SOG-0281) : [{ nm0, nm1, course (loxodromie), wind }] ramenés à la distance du devis D ; null sans
 *  deux points placés. Le même chemin et les mêmes vents que le plan de progression (progPath, legWindsOf). */
function quoteLegs(D) {
  const P = (progPath().pts || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon));
  if (P.length < 2 || !(D > 0)) return null;
  const raw = [0];
  for (let i = 1; i < P.length; i++) raw.push(raw[i - 1] + rhumbNm(P[i - 1], P[i]));
  const k = raw.at(-1) > 0 ? D / raw.at(-1) : 0;
  if (!k) return null;
  const W = legWindsOf(P);
  return P.slice(1).map((p, i) => ({
    nm0: raw[i] * k,
    nm1: raw[i + 1] * k,
    course: rhumbCourse(P[i], p),
    wind: W[i] ? {
      dirDeg: W[i].dirDeg,
      speedKt: W[i].kt
    } : null
  }));
}
// ---------------------------------------------------------------- SOG-0545 : le temps et le carburant de chaque route proposée
/** La durée « 1 h 28 » (l'ergonome : sans étiquette, « 1:28 » se lit comme une heure). */
const durTxt = m => {
  const t = Math.max(0, Math.round(+m || 0));
  return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')}`;
};
/** Un nombre, ou une fourchette [bas, haut] écrite « bas–haut » ; f écrit chaque nombre. */
const spanTxt = (v, f) => Array.isArray(v) ? `${f(v[0])}–${f(v[1])}` : f(v);
/** Comparer deux nombres ou fourchettes : par le haut, puis par le bas ; un absent passe après. */
function figCmp(x, y) {
  const hi = v => Array.isArray(v) ? v[1] : v,
    lo = v => Array.isArray(v) ? v[0] : v;
  if (x == null || y == null) return (x == null) - (y == null);
  return hi(x) - hi(y) || lo(x) - lo(y);
}
/** Les mentions (l'ergonome) : au meilleur temps et au moindre carburant d'étape parmi les routes chiffrées données (jamais une route qui
 *  enfreint : l'appelant les écarte), s'il y en a deux au moins ; une route peut avoir les deux. SOG-0545 (l'ergonome, 23/11) : la valeur
 *  SANS VENT est comparée (min0, trip0 : la même hypothèse pour toutes les lignes), arrondie comme l'écran l'écrit ; la meilleure à égalité
 *  avec une autre : pas de mention. list : [[clé, { min0, trip0 }]] → Map clé → { fast, eco }. */
function figMarks(list) {
  const ok = list.filter(([, g]) => g && Number.isFinite(g.min0) && Number.isFinite(g.trip0)),
    out = new Map();
  if (ok.length < 2) return out;
  for (const [k, w] of [
      ['min0', 'fast'],
      ['trip0', 'eco']
    ]) {
    const v = g => Math.round(g[k]),
      sorted = [...ok].sort(([, a], [, b]) => v(a) - v(b));
    if (v(sorted[0][1]) < v(sorted[1][1])) out.set(sorted[0][0], {
      ...out.get(sorted[0][0]),
      [w]: true
    });
  }
  return out;
}
/** SOG-0545 : la valeur sans vent d'un chiffrage (le carburant d'étape trip0, ou le temps min0) ; null sans chiffrage. */
const fig0 = (g, k = 'trip0') => Number.isFinite(g?.[k]) ? g[k] : null;
/** Les tronçons d'une route donnée par ses points, ramenés à la distance D (comme quoteLegs) ; le vent par tronçon laissé au devis. */
function legsFromPoints(P, D) {
  const raw = [0];
  for (let i = 1; i < P.length; i++) raw.push(raw[i - 1] + rhumbNm(P[i - 1], P[i]));
  const k = raw.at(-1) > 0 ? D / raw.at(-1) : 0;
  return k ? P.slice(1).map((p, i) => ({
    nm0: raw[i] * k,
    nm1: raw[i + 1] * k,
    course: rhumbCourse(P[i], p),
    wind: null
  })) : null;
}
/** SOG-0545 (l'ergonome, critère a) : le temps et le carburant d'étape d'une route à son niveau — le devis de Carburant (les entrées du
 *  devis du vol, S.C.qIn) appliqué à SES points et à SA distance, au vent du vol à ce niveau (la prévision en altitude, sinon le vent du
 *  vol) ; sans vent connu, deux devis, vent de face et vent arrière de la fourchette du devis : { nm, min, trip }, chacun un nombre ou
 *  [bas, haut] ; carburant dans l'unité de la fiche. null sans devis possible. Les positions d'un point venu d'X-Plane servent au calcul
 *  seulement, jamais écrites. Gardé par la signature du devis (S.figMemo). */
function routeFigures(points, nm, fl) {
  const qIn = S.C?.qIn,
    M = window.FuelModel;
  if (!qIn || !M?.quote || !(nm > 0) || !(fl > 0)) return null;
  const P = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    key = JSON.stringify([S.computeMemo?.sig || '', nm, fl, P.map(p => [p.id || '', +p.lat, +p.lon])]);
  S.figMemo ||= new Map();
  if (S.figMemo.has(key)) return S.figMemo.get(key);
  const ft = fl * 100,
    course = P.length >= 2 ? rhumbCourse(P[0], P.at(-1)) : +qIn.trackDeg || 0,
    base = {
      ...qIn,
      distanceNm: nm,
      levelFt: ft,
      trackDeg: course,
      steps: null,
      legs: P.length >= 2 ? legsFromPoints(P, nm) : null
    },
    wind = aloftMeanAt(ft) || qIn.wind,
    q = M.quote({
      ...base,
      wind
    });
  let out = null;
  if (q?.hasFuel) {
    // min0, trip0 : la valeur sans vent (SOG-0545, l'ergonome : la même hypothèse pour toutes les lignes, celle que la barre dit) ;
    // les mentions et l'ordre la comparent, jamais une borne de la fourchette
    if (q.windKnown) out = {
      nm,
      min: q.minutes,
      trip: q.trip,
      min0: q.minutes,
      trip0: q.trip
    };
    else {
      const band = Number.isFinite(+wind?.speedKt) ? Math.abs(+wind.speedKt) : +(qIn.sheet?.typicalWindKt ?? 25),
        at = dir => M.quote({
          ...base,
          wind: {
            dirDeg: dir,
            speedKt: band
          }
        }),
        head = at(course),
        tail = at((course + 180) % 360);
      out = head?.hasFuel && tail?.hasFuel ? {
        nm,
        min: [Math.min(tail.minutes, head.minutes), Math.max(tail.minutes, head.minutes)],
        trip: [Math.min(tail.trip, head.trip), Math.max(tail.trip, head.trip)],
        min0: q.minutes,
        trip0: q.trip
      } : {
        nm,
        min: q.minutes,
        trip: q.trip,
        min0: q.minutes,
        trip0: q.trip
      };
    }
  }
  if (S.figMemo.size > 200) S.figMemo.clear();
  S.figMemo.set(key, out);
  return out;
}
/** Les nombres d'un itinéraire de la liste : ses points (ceux du moteur, sinon ceux lus pour la Carte), sa distance, son niveau (le sien,
 *  sinon celui du calcul). */
function altFigures(a, i) {
  const pts = a.points?.length ? a.points : (S.alts?.list || []).find(x => x.index === i)?.points?.map(([lat, lon]) => ({
      lat,
      lon
    })) || [],
    fl = [a.fl, S.ralts?.fl, S.ralts?.n?.level?.fl].find(flOk) ?? null;
  return routeFigures(pts, a.distanceNm, fl);
}
/** current_flight.progress = { at, plannedPos { lat, lon, legIndex, nmFromDep }, eta: [{ id, at }], fuelRemainingKg,
 *  remainingNm, phase } ; null sans vol démarré. Écrit quand il change (chaque minute pendant le vol). force : écrit
 *  même si seul « at » change. */
function updateProgress(force = false) {
  const c = progressCalc(),
    f = S.flight;
  let next = null;
  if (c) {
    const unit = S.C?.sheet?.unit || 'kg',
      rem = Math.max(0, (S.C.q.block || 0) - c.st.fuelUsed);
    next = {
      at: new Date().toISOString(),
      // heures de passage et position prévue : dérivées chez le lecteur de quote.legs (frame/lib/current_flight.js
      // etaOf, plannedPositionAt) ; undefined efface ce qu'une version précédente avait écrit (JSON le laisse tomber)
      plannedPos: undefined,
      eta: undefined,
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
/** SOG-0435 : l'écho d'une écriture de progression du cadre — la carte « Progression prévue » d'après le devis déjà fait, réécrite
 *  seulement si son texte change (renderProgress), et la progression de Carburant (updateProgress, au plus une fois par minute) ; ni
 *  devis, ni mesure de mise en page. */
function progressOnly() {
  renderProgress(S.C);
  updateProgress();
}
/** Carte « Progression prévue » du pas Départ : la ligne de l'instant et la liste des points avec leur heure prévue, le
 *  tronçon en cours surligné. SOG-0435 : la carte n'est réécrite que si son contenu change (les noms des terrains repeints alors). */
function renderProgress(C) {
  const card = S.body?.querySelector('[data-progcard]'),
    box = S.body?.querySelector('[data-prog]');
  if (!card || !box) return;
  const c = progressCalc(C);
  card.classList.toggle('fu-hide', !c);
  if (!c) return;
  const pts = progPath().pts,
    f0 = S.flight,
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
  const html = `<p>${esc(line)}</p><div class="f-list">${c.etas.map(e => `<div class="f-item fu-eta${c.st.phase !== 'arrived' && e.i === c.pos.legIndex + 1 ? ' fu-next-pt' : ''}"${e.i === c.pos.legIndex + 1 && c.st.phase !== 'arrived' ? ' aria-current="step"' : ''}><span><b>${esc(pts[e.i]?.id || '')}</b>${[f0.route?.dep, f0.route?.arr].includes(pts[e.i]?.id) && pts[e.i]?.id ? ` <small class="f-muted" data-adtext data-code="${esc(pts[e.i].id)}"></small>` : ''}</span><span class="f-num">${esc((e === c.etas[0] || e === c.etas.at(-1) ? hhmmLocal : hhmmOf)(new Date(e.at).toISOString()))}</span></div>`).join('')}</div>`;
  if (S.progBox === box && S.progHtml === html) return; // le même contenu dans la même carte : rien n'est touché
  S.progBox = box;
  S.progHtml = html;
  box.innerHTML = html;
  S.AD.paint();
}
/** Un terrain du récapitulatif : son code puis son nom (rempli par S.AD.paint, d'après aerodb) ; `none` sans code. */
function adSum(code, none) {
  const c = String(code || '').trim().toUpperCase();
  return c ? `<b>${esc(c)}</b> <span data-adtext data-code="${esc(c)}"></span>` : esc(none);
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
    <dt>${esc(tt(TX.dep))}</dt><dd>${adSum(r.dep, none)}</dd>
    <dt>${esc(tt(TX.arr))}</dt><dd>${adSum(r.arr, none)}</dd>
    <dt>${esc(tt(TX.sumRoute))}</dt><dd><code class="fu-sumroute">${esc(r.text || [r.dep, r.arr].filter(Boolean).join(' ') || none)}</code></dd>
    <dt>${esc(tt(TX.sumLevel))}</dt><dd>${esc(lvl)}</dd>
    <dt>${esc(tt(TX.sumWind))}</dt><dd>${esc(wind)}${windShort() ? ` <span class="f-muted">(${esc(windShort())})</span>` : ''}</dd>
    <dt>${esc(tt(TX.sumBlock))}</dt><dd><b>${esc(block)}</b></dd></dl>`;
  const row = S.body.querySelector('[data-startrow]');
  if (row) {
    const on = !!f.started?.at; // un vol démarré s'arrête par son compte rendu (report remet started à null) ou s'annule
    row.innerHTML = on ? `<button type="button" data-do="cancelstart">${esc(tt(TX.cancelStart))}</button>` : `<button type="button" class="primary" data-do="start"${S.starting ? ' disabled aria-busy="true"' : ''}>${esc(tt(TX.start))}</button>`;
  }
  const sn = S.body.querySelector('[data-startnote]');
  // ce que la relecture au départ a changé ; pendant le départ, « Démarrage… » reste dit (SOG-0088)
  if (sn) sn.textContent = S.starting ? S.startNote || '' : f.started?.at && startNote?.at === f.started.at ? startNote.text : '';
  renderProgress(C);
  S.AD.paint(); // les noms des terrains du récapitulatif et des horaires
}
/** Vol courant écrit par un autre module (by ≠ 'fuel' : maps, route modifiée sur la carte) : ses points et son texte
 *  sont gardés tels qu'il les a écrits (ni relus ni normalisés) ; distance et route vraie redéduites des points, devis
 *  refait, profil réécrit et vol courant réécrit par fuel (by: 'fuel') — maps sait alors que TOC et TOD sont à jour.
 *  Que l'écran soit Devis ou Fiches. */
function adoptForeignFlight() {
  const r = S.flight.route ||= emptyFlight().route;
  markEnds();
  mChipDraw(); // SOG-0251 : la mission quittée ailleurs (la croix de la Carte) : la puce part aussitôt, sans changer d'écran
  routeDerived(r);
  if (S.aloft) aloftApply(); // vents en altitude aux nouveaux points (relus si la route a changé : scheduleWx)
  S.froze = false; // une route changée ailleurs refait le devis de la longueur qu'elle a maintenant
  ensureProcs();
  const C = S.C = compute();
  S.flight.profile = profileOf(C);
  if (S.view === 'plan' && S.body) {
    const ta = S.body.querySelector('[data-k="rtext"]');
    if (ta && document.activeElement !== ta) ta.value = r.text || '';
    renderPts();
    refresh();
  }
  saveFlight();
}
/** Points connus du vol pour la lecture du texte (RM.routeModel, après la base) : ceux de route.points ; pour « Auto » (procs vrai),
 *  aussi la sortie de la SID et l'entrée de l'arrivée choisies (PR.endsOf, avec leur position de la fiche) : une sortie écrite dans
 *  le texte y est toujours un point placé, même quand la base ne la connaît pas (refonte § 10.33 R-F4b ; la relecture du champ, elle,
 *  la laisse mot gardé, comme avant). */
function knownPoints(r, withProcs = true) {
  const known = new Map((r.points || []).filter(p => p?.id && Number.isFinite(+p.lat)).map(p => [p.id, p])),
    procs = withProcs && S.procs?.key === procsKey(S.flight) ? pubProcs(S.procs.procs) : null,
    T = S.takenPts;
  // SOG-0372 (c, point 3) : les points placés par le moteur pour l'itinéraire pris (même départ et arrivée)
  if (T && T.dep === (r.dep || '') && T.arr === (r.arr || ''))
    for (const [id, p] of T.map)
      if (!known.has(id)) known.set(id, {
        id,
        lat: p.lat,
        lon: p.lon
      });
  for (const p of procs ? Object.values(PR.endsOf(procs, [], r)) : [])
    if (p && p.lat !== null && p.lon !== null && !known.has(p.id)) known.set(p.id, {
      id: p.id,
      lat: p.lat,
      lon: p.lon
    });
  return known;
}
/** Relit les points de la route (texte, départ, arrivée) dans aerodb, les points déjà connus du vol en secours ;
 *  distance et route vraie déduites. normalize : le texte est réécrit sous sa forme normalisée (routeText) — à la sortie
 *  du champ, pas pendant la frappe. Dernière demande seule retenue. */
function resolveRoute(normalize = true) {
  const seq = S.routeSeq = (S.routeSeq || 0) + 1;
  S.routeAskedAt = Date.now(); // SOG-0377 : une relecture en cours (routeReading), jusqu'à sa fin (routeDone)
  clearTimeout(S.routeTimer);
  S.routeTimer = setTimeout(async () => {
    // SOG-0193 L3 : à la sortie du champ, un point imposé par la mission que le texte a perdu y est remis (à sa place parmi les imposés)
    const back = normalize ? keepLocks(S.flight.route) : [];
    if (back.length) S.ctx.notify(tt(TX.locksBack, {
      ids: back.join(', ')
    }), 'warn');
    const s = S,
      asked = S.flight.route, // la route lue : l'enregistrement du vol (writeFlight) en fait un nouvel objet pendant la lecture
      // F235 : le texte, le départ et l'arrivée lus, en VALEURS — « Ajouter un point » et « Direct vers » changent l'objet de la route en
      // place pendant la lecture : comparé à lui-même, il passait pour inchangé et la lecture d'avant écrasait la route nouvelle
      was = [asked.text, asked.dep, asked.arr],
      // SOG-0372 : les routes NAT du jour lues et valides, pour déplier « NATx » (seulement quand le texte en porte une)
      nat = RM.NAT_IN_TEXT.test(String(asked.text || '')) ? await natForModel(s) : null,
      // les points déjà connus du vol, et ceux des procédures choisies (la sortie d'une SID, l'entrée d'une STAR) : un nom qu'aerodb ne
      // connaît pas mais qu'une procédure lue porte (BEPAN de la BEPA4E, SOG-0012) prend sa position ; aerodb passe toujours d'abord
      known = knownPoints(asked, true),
      {
        points,
        unresolved,
        tokens,
        badAirways,
        homonyms = [],
        jumps = [],
        far = [],
        natTracks = [],
        natDirect = []
      } = await RM.routeModel(asked.text, {
        dep: asked.dep,
        arr: asked.arr,
        known,
        chain: asked.points || [],
        base: xpBase(S.ctx.aerodb), // SOG-0375
        procs: chosenProcNames(), // SOG-0372 (c) : la SID et la STAR choisies, jamais « inconnues »
        nat // SOG-0372 : « NATx » déplié par la route du jour
      });
    if (gone(s) || seq !== S.routeSeq) return;
    S.routeDone = seq;
    if (!S.body)
      return saveFlight(); // écran Fiches ouvert entre-temps : le vol est écrit tout de même (un choix de procédure l'attend)
    // le vol a changé d'objet pendant la lecture (chaque enregistrement du vol, writeFlight, en fait un nouveau ; un autre écrivain
    // aussi) : la lecture vaut pour la route d'aujourd'hui quand elle a le même texte, départ et arrivée, sinon elle est refaite ;
    // jamais écrite sur l'objet d'avant (les points s'y perdaient dès qu'une lecture durait plus de 300 ms : N13 / N24 sous charge, F142) ;
    // la comparaison porte sur les valeurs lues, que l'objet soit le même ou non (F235)
    const r = S.flight.route ||= emptyFlight().route;
    if (r.text !== was[0] || r.dep !== was[1] || r.arr !== was[2]) return resolveRoute(normalize);
    r.points = markLocks(r, points);
    // une voie écrite qui ne relie pas ses deux points : tronçon direct, dit une fois par texte (pas à chaque frappe) (§ 10.31)
    // SOG-0354 (l'ergonome : « une notification passe, une ligne reste ») : une voie écrite que la base ne relie pas, tronçon direct, dite
    // par une ligne fixe en sourdine sous la route, comme celle des routes NAT ; elle suit chaque lecture du texte
    const bad = [...new Set(badAirways.map(x => x.w))].slice(0, 12).map(w => tt(TX.awyBad, {
        w
      })).join(' · '),
      awyLine = S.body.querySelector('[data-awywarn]');
    if (awyLine) {
      awyLine.textContent = bad;
      awyLine.hidden = !bad;
    }
    if (S.aloft) aloftApply();
    const ta = S.body.querySelector('[data-k="rtext"]');
    // SOG-0517 : le texte d'un itinéraire pris reste celui du moteur, mot pour mot ; la première frappe le rend au pilote
    if (normalize && tokens.length && document.activeElement !== ta && r.from !== 'engine') {
      r.text = withRwys(routeText(tokens));
      if (ta) ta.value = r.text;
    }
    // la place de chaque nom sans position dans la liste des points (après le point qui le précède dans le texte ; un départ inconnu en
    // tête, une arrivée inconnue en fin) : valable pour ce texte seulement (SOG-0035)
    const rows = [];
    let last = null;
    for (const t of tokens) {
      if (t.pt) last = t.pt;
      else if (unresolved.includes(t.keep) && !rows.some(x => x.id === t.keep)) rows.push({
        id: t.keep,
        i: last ? points.indexOf(last) : -1
      });
    }
    for (const id of unresolved)
      if (!rows.some(x => x.id === id)) rows.push({
        id,
        i: id === r.dep ? -1 : points.length - 1
      });
    S.unres = {
      text: r.text,
      rows,
      zone: null
    };
    routeDerived(r);
    renderPts();
    scheduleWx();
    // écran Fiches ouvert entre-temps : pas de ligne des points non reconnus à écrire
    S.unresolvedNames = unresolved;
    const un = S.body.querySelector('[data-unres]'),
      ut = unresolved.length ? tt(TX.unresolved, {
        l: unresolved.join(', ')
      }) : '';
    if (un && un.textContent !== ut) un.textContent = ut;
    // SOG-0142 : les homonymes et les sauts, dits sous la route (jamais corrigés en silence)
    const rw = S.body.querySelector('[data-rwarn]');
    if (rw) rw.innerHTML = [...far.map(x => tt(TX.farPt, {
      ...x,
      nm: x.nm.toLocaleString(S.ctx.lang())
    })), ...homonyms.map(h => tt(TX.homonyms, h)), ...jumps.map(j => tt(TX.jump, {
      ...j,
      nm: j.nm.toLocaleString(S.ctx.lang())
    }))].map(x => `<span data-rw>${esc(x)}</span>`).join('<br>');
    // SOG-0372 : une route NAT du texte absente des routes du jour lues, dite calmement
    S.natLetters = natTracks;
    S.natDirect = natDirect; // SOG-0372 : les traversées restées en direct, dites par natTrackWarn
    natTrackWarn(s);
    if (unresolved.length) {
      zoneNote(s, seq, points, ut);
      unresolvedZones(s, seq, points);
    }
    // SOG-0377 (a) : des procédures choisies pas encore lues, le vol est écrit avec le devis à leur lecture (ensureProcs), une seule fois
    if (procsPending()) S.writeAfterProcs = true;
    else saveFlight();
    refresh();
  }, 500);
}
// ---------------------------------------------------------------- la zone d'un point inconnu (SOG-0142, SOG-0143)
/** La zone probable de chaque point inconnu (celle du point résolu qui le précède, sinon du départ) et son état, sur sa ligne. */
async function unresolvedZones(s, seq, points) {
  const A = s.ctx.aerodb;
  if (!A?.zones || !s.unres?.rows?.length) return;
  const zones = await Promise.resolve().then(() => A.zones()).catch(() => null);
  if (!Array.isArray(zones) || gone(s) || seq !== s.routeSeq) return;
  const lang = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(s.ctx.lang?.() || 'fr')),
    memo = new Map();
  for (const row of s.unres.rows) {
    const p = points[row.i] || points[0],
      z = ZG.zoneAt(zones, p);
    if (!z) continue;
    if (!memo.has(z.id)) memo.set(z.id, ZG.zoneState(A, z, p));
    const state = await memo.get(z.id);
    if (gone(s) || seq !== s.routeSeq) return;
    row.gap = {
      id: z.id,
      name: z.names?.[lang] || z.id,
      state
    };
  }
  renderPts();
  // SOG-0143 : une ligne en trois temps par zone en cause, sous la route (ce qui manque, le geste, les replis externes)
  const box = s.body?.querySelector('[data-zonegaps]'),
    seen = new Set();
  if (box) box.innerHTML = s.unres.rows.map(x => x.gap).filter(g => g && ZG.STATES.includes(g.state) && !seen.has(g.id) && seen.add(g.id))
    .map(g => ZG.gapHtml(g, {
      tt,
      esc,
      lnm: s.lnm
    })).join('');
}
/** La ligne d'un terrain sans procédures (SOG-0143, SOG-0157), demandée une fois par terrain et rendue vide tant que la réponse n'est
 *  pas venue : d'abord l'état des procédures de son État (aerodb.coverageByState, ce que Données montre en « Procédures par État ») —
 *  ne se lisent pas : leur motif et les replis externes ; sinon, la zone de la base qui manque. À la réponse, la carte est redessinée :
 *  l'emplacement se remplit et le bouton de lecture suit l'état (procState). */
function zoneGapOf(icao) {
  return procGap(icao)?.html || '';
}
/** L'état des procédures de l'État d'un terrain, pour la ligne discrète (procedures.js) : { readable, demand } ; null tant qu'inconnu. */
function procStateOf(icao) {
  const g = procGap(icao);
  return g ? {
    readable: g.readable,
    demand: g.demand
  } : null;
}
/** La réponse gardée d'un terrain (voir zoneGapOf) : { html, readable, demand } ; null en cours (la demande partie au premier appel). */
function procGap(icao) {
  const k = String(icao || '').toUpperCase();
  if (!isIcaoAlpha(k) || !S?.ctx?.aerodb) return null;
  S.gapAds ||= new Map();
  if (S.gapAds.has(k)) return S.gapAds.get(k);
  S.gapAds.set(k, null);
  const s = S,
    A = s.ctx.aerodb,
    lang = s.ctx.lang?.() || 'fr';
  (async () => {
    const cov = await Promise.resolve().then(() => A.coverageByState?.()).catch(() => null),
      st = cov?.[k.slice(0, 2)] || null,
      readable = !st || ZG.KEEP_READ.includes(st.reason),
      ph = ZG.procHtml(st, {
        tt,
        esc,
        icao: k,
        lnm: s.lnm,
        lang
      });
    let html = ph;
    if (!html && A.zones) {
      const c = await Promise.resolve().then(() => A.coords(k)).catch(() => null),
        g = c ? await ZG.gapOf(A, c, lang).catch(() => null) : null;
      html = g ? ZG.gapHtml(g, {
        tt,
        esc,
        icao: k,
        lnm: s.lnm
      }) : '';
    }
    if (gone(s)) return;
    s.gapAds.set(k, {
      html,
      readable,
      demand: ZG.READABLE.includes(st?.reason)
    });
    s.P?.render?.(); // la ligne discrète suit : l'emplacement rempli, le bouton de lecture selon l'état
    for (const el of s.body?.querySelectorAll(`[data-proc][data-icao="${k}"] [data-gap-slot]`) || []) el.innerHTML = html;
  })().catch(() => {});
  return null;
}
/** Des noms inconnus : quand la base n'a aucun point publié à 60 NM d'un terrain du vol, la ligne le dit (la zone manque, pas le point ;
 *  SOG-0012 : la zone EI de la base n'a que des terrains et des navaids). */
async function zoneNote(s, seq, points, line) {
  const ends = [points[0], points.at(-1)].filter(p => p && isIcaoAlpha(p.id || '') && Number.isFinite(+p.lat));
  for (const p of ends) {
    const near = await Promise.resolve().then(() => s.ctx.aerodb?.points?.({
      lat: +p.lat,
      lon: +p.lon,
      radiusNm: 60
    })).catch(() => null);
    if (gone(s) || seq !== s.routeSeq) return;
    if (Array.isArray(near) && !near.length) {
      if (s.unres) {
        s.unres.zone = {
          icao: p.id,
          st: p.id.slice(0, 2)
        };
        renderPts();
      }
      const un = s.body?.querySelector('[data-unres]');
      if (un && un.textContent === line) un.textContent = line + tt(TX.noPointsNear, {
        icao: p.id,
        st: p.id.slice(0, 2)
      });
      return;
    }
  }
}
/** Bouton « Auto » : inscrit les voies aériennes entre les points nommés consécutifs qui n'en ont pas, au niveau prévu
 *  (celui du vol, sinon celui du devis, sinon 6 500 ft comme la V2 — dit dans une notification). Idempotent (V3 § 10.31) : il
 *  recalcule depuis les points POSÉS seulement (départ, sortie de la SID choisie, points tapés, entrée de la STAR, arrivée) et
 *  remplace ; les voies et nœuds d'un Auto précédent (route.auto.seq, RT.provenance) ne sont jamais des contraintes : même entrée,
 *  même texte. Un tronçon qui repasserait par un point, puis, tant que l'ensemble dépasse la chaîne directe de plus de detourPct,
 *  le tronçon le plus allongé, restent directs ; un tronçon sans voie le dit avec sa raison, jamais en silence. Le routage est celui de
 *  la bibliothèque du cadre (frame/lib/routing.js : plus court chemin sur les segments de la base publiée, tronçons
 *  ouverts au niveau, détour limité à 40 %, pas de sens unique ni de restriction fine). Écrit route.text (« PT1 UN460 PT2 »)
 *  et route.points (les points de la voie y compris ceux que le texte n'écrit pas : distance et carte suivent la voie), puis
 *  relit la route (resolveRoute) et refait le devis. Un point d'extrémité de voie qu'aerodb ne connaît pas garde la
 *  position du segment : il est dans route.points, que la relecture prend en secours. */
async function autoAirways() {
  const s = S,
    f = S.flight,
    r = f.route;
  if (S.flightPending || !r || S.autoBusy) return;
  S.autoBusy = true;
  const btn = S.body?.querySelector('[data-do="rauto"]');
  if (btn) btn.disabled = true;
  try {
    procsToText(false); // le texte d'abord (refonte § 10.33 R-F4b) : la sortie de la SID et l'entrée de la STAR y sont des points placés
    const seq = S.routeSeq,
      known = knownPoints(r),
      {
        points,
        tokens
      } = await RM.routeModel(r.text, {
        dep: r.dep,
        arr: r.arr,
        known,
        chain: r.points || [],
        base: xpBase(S.ctx.aerodb), // SOG-0375
        procs: chosenProcNames(),
        nat: RM.NAT_IN_TEXT.test(String(r.text || '')) ? await natForModel(s) : null // SOG-0372
      });
    if (gone(s) || seq !== S.routeSeq) return;
    // les mots d'un Auto précédent (voies, nœuds, sortie de SID et entrée de STAR qu'il a ajoutées) sont retirés : jamais le départ
    // ni l'arrivée ; un point gardé ne garde sa voie d'arrivée que si le mot qui le précède est une voie posée ; les points
    // intermédiaires d'une voie posée restent (distance et carte la suivent), ceux d'une voie générée partent avec elle
    const wordOf = t => t.pt ? t.pt.id : t.keep,
      gen = RT.provenance(tokens.map(wordOf), r.auto?.seq),
      ends = new Set([points[0], points.at(-1)]),
      dropped = tokens.some((t, i) => gen[i] && !(t.pt && ends.has(t.pt)));
    if (dropped) {
      const asTok = new Set(tokens.filter(t => t.pt).map(t => t.pt)),
        kept = tokens.filter((t, i) => !gen[i] || t.pt && ends.has(t.pt));
      kept.forEach((t, i) => {
        if (!t.pt) return;
        const before = kept[i - 1];
        if (before?.keep && RM.AIRWAY_WORD.test(before.keep)) t.pt.via = before.keep;
        else delete t.pt.via;
      });
      const keptPts = new Set(kept.filter(t => t.pt).map(t => t.pt)),
        pts = [];
      let pend = [];
      for (const p of points) {
        if (!asTok.has(p)) {
          pend.push(p);
          continue;
        }
        if (keptPts.has(p)) {
          if (p.via) pts.push(...pend);
          pts.push(p);
        }
        pend = [];
      }
      tokens.splice(0, tokens.length, ...kept);
      points.splice(0, points.length, ...pts);
    }
    const genTok = new Set(); // jetons que cet Auto écrit (provenance gardée dans route.auto.seq)
    // procédures choisies et lues : la sortie de la SID après le départ et le début de l'arrivée avant l'arrivée (PR.endsOf, la règle
    // du texte : rien quand un point de la procédure est déjà sur la route), pour que le routage parte de la sortie de la SID (LFBO
    // FINOT G36 GOSAD) ; le texte (procsToText) porte déjà la sortie et l'entrée de la STAR, il reste le début d'une approche sans
    // STAR (jamais dans le plan de vol) : Auto l'ajoute en mot généré. Le tronçon terrain ↔ point de procédure n'est jamais routé
    const procPts = new Set(),
      procs = S.procs?.key === procsKey(f) ? pubProcs(S.procs.procs) : null,
      typed = () => tokens.filter(t => t.pt).map(t => t.pt),
      pe = procs ? PR.endsOf(procs, typed(), r) : {};
    for (const [end, first] of [
        [pe.exit, true],
        [pe.entry, false]
      ]) {
      const tp = typed();
      if (!end || end.lat === null || end.lon === null || tp.length < 2) continue;
      const prev = first ? tp[0] : tp.at(-2),
        p = {
          id: end.id,
          lat: end.lat,
          lon: end.lon
        },
        tok = {
          pt: p
        };
      // après le départ, la sortie de la SID s'écrit après le nom de la SID s'il le suit (« LFBO LACOU7B LACOU LMG ») : le tronçon
      // sortie → premier point est alors adjacent et routé (utilisateur, 30 octobre : « LACOU LMG n'est toujours pas trouvée »)
      let at = tokens.findIndex(t => t.pt === prev) + 1;
      if (first)
        while (tokens[at]?.keep && !RM.AIRWAY_WORD.test(tokens[at].keep)) at++;
      tokens.splice(at, 0, tok);
      genTok.add(tok);
      points.splice(points.indexOf(prev) + 1, 0, p);
      procPts.add(p);
    }
    // points écrits, dans l'ordre ; adj[i] : le point i+1 suit le point i dans le texte sans rien entre eux (ni voie, ni
    // procédure) ; entry[i] : une voie part du point i ; exit[i] : le point i est arrivé par une voie
    const idx = tokens.map((t, i) => t.pt ? i : -1).filter(i => i >= 0),
      chain = idx.map(i => tokens[i].pt),
      last = chain.length - 1,
      adj = idx.map((t, i) => idx[i + 1] === t + 1 && !(i === 0 && procPts.has(chain[1])) && !(i === last - 1 && procPts.has(chain[i]))),
      entry = idx.map(i => !!tokens[i + 1]?.keep && RM.AIRWAY_WORD.test(tokens[i + 1].keep)),
      free = i => !(chain[i].via || entry[i]);
    // une SID choisie couvre le départ → premier point, une STAR le dernier point → arrivée : jamais routés (le routage part de la
    // sortie de la SID ; parcours de BUGS SOG, 30 octobre : « pas de voie près de LFBO »)
    const chosen = CF.proceduresOf(f);
    if (typeof chosen.dep?.sid === 'string') adj[0] = false;
    if (typeof chosen.arr?.star === 'string') adj[last - 1] = false;
    if (chain.length < 2 || !adj.some(Boolean)) return dropped ? writeAuto(tokens, points, []) : S.ctx.notify(tt(TX.autoNoLeg), 'warn');
    const planned = +f.level?.ft || +S.C?.q?.levelFt || 0,
      base = planned || RG.DEFAULTS.ifrMinFt,
      at = [];
    let cur = base;
    chain.forEach((p, i) => { // niveau tenu au départ de chaque tronçon (un point peut en changer)
      if (i && p.alt_ft) cur = p.alt_ft;
      at.push(cur);
    });
    // chaque tronçon routé à l'altitude du profil en son milieu (montée, paliers, descente), pas au niveau de croisière partout :
    // un tronçon de montée ouvre les voies basses, un tronçon en croisière au FL260 ne les prend pas (utilisateur, 29 octobre :
    // LFPO → EIDW, « la T421 était à préférer à la J150 ») ; la chaîne élargie des points de procédure, ramenée sur le chemin volé
    const fp = fpNow(),
      cum = chain.reduce((a, p, i) => (a.push(i ? a[i - 1] + gcNm(chain[i - 1], p) : 0), a), []),
      toF = CF.routeNmToFlown(f, fp, chain),
      legAlt = i => {
        const a = CF.altitudeAt(f, toF((cum[i] + (cum[i + 1] ?? cum[i])) / 2), {
          cruiseFt: at[i],
          flown: fp
        });
        return a == null ? at[i] : Math.max(0, Math.round(a / 100) * 100);
      };
    let res;
    try {
      res = await RG.expand(S.ctx.aerodb, chain, {
        altOf: legAlt,
        skip: i => !adj[i]
      });
    } catch (e) {
      if (gone(s)) return;
      if (e?.code === 'base') return S.ctx.notify(tt(TX.autoNoBase), 'warn');
      throw e;
    }
    if (gone(s) || seq !== S.routeSeq) return;
    if (!planned) S.ctx.notify(tt(TX.autoNoLevel, {
      l: flTxt(base)
    }), 'warn');
    // rejet (§ 10.31) : un tronçon routé qui repasse par un point déjà sur la route (posé, ou d'un tronçon précédent) reste direct ;
    // puis, tant que l'ensemble dépasse la chaîne directe de plus de detourPct, le tronçon routé le plus allongé reste direct
    const seen = new Set(chain.map(p => p.id));
    res.legs.forEach(l => {
      if (l.status !== 'routed') return;
      const mid = l.points.slice(1, -1).map(p => p.id);
      if (mid.some(id => seen.has(id))) l.status = 'loop';
      else mid.forEach(id => seen.add(id));
    });
    const direct = chain.slice(1).map((p, i) => gcNm(chain[i], p)),
      lenOf = () => res.legs.reduce((a, l, i) => a + (l.status === 'routed' ? +l.nm || direct[i] : direct[i]), 0),
      sum = direct.reduce((a, b) => a + b, 0);
    while (lenOf() > sum * (1 + RG.DEFAULTS.detourPct / 100)) {
      const worst = res.legs.map((l, i) => l.status === 'routed' ? [(+l.nm || 0) - direct[i], i] : null).filter(Boolean).sort((a, b) => b[
          0] -
        a[0])[0];
      if (!worst) break;
      res.legs[worst[1]].status = 'detour';
    }
    // un tronçon sans voie compte comme un échec s'il ne touche pas une voie déjà écrite (l'entrée ou la sortie directe
    // d'une voie, que le routage a choisie, ne se retente pas sans bruit) ; sa raison est dite
    const failed = res.legs.map((l, i) => ['none', 'far', 'detour', 'loop'].includes(l.status) && free(i) && free(i + 1) ? i : -1).filter(
        i =>
        i >= 0),
      noway = async () => {
        // une voie qui relie les deux points mais fermée au niveau du tronçon : elle est nommée, avec sa plage ouverte (§ 10.31,
        // utilisateur : « AGN A34 LACOU … LMG » dit « pas de voie près de LACOU » au FL260, A34 étant plafonnée au FL195) ; le premier
        // tronçon qui en a une, sinon le premier
        for (const k of failed) {
          const a = chain[k],
            b = chain[k + 1],
            segs = await Promise.resolve().then(() => S.ctx.aerodb?.airways?.({
              bbox: RG.corridor([a, b])
            })).catch(() => null),
            j = segs ? RG.joiningAirway(segs, a, b) : null,
            lvl = legAlt(k);
          if (gone(s)) return;
          if (j && (lvl > j.ceiling || lvl < j.floor)) return S.ctx.notify(tt(TX.autoWhyClosed, {
            w: j.name,
            a: a.id,
            b: b.id,
            lvl: flTxt(lvl),
            lo: flTxt(j.floor),
            hi: Number.isFinite(j.ceiling) ? flTxt(j.ceiling) : '∞'
          }) + (failed.length > 1 ? ` (+${failed.length - 1})` : ''), 'warn');
        }
        const [i] = failed,
        why = {
          none: TX.autoWhyNone,
          far: TX.autoWhyFar,
          detour: TX.autoWhyDetour,
          loop: TX.autoWhyLoop
        } [res.legs[i].status];
        S.ctx.notify(tt(TX.autoNone, {
          a: chain[i].id,
          b: chain[i + 1].id,
          why: tt(why, {
            a: chain[i].id,
            p: RG.DEFAULTS.detourPct
          }),
          more: failed.length > 1 ? ` (+${failed.length - 1})` : ''
        }), 'warn');
      };
    const done = res.legs.map((l, i) => l.status === 'routed' ? i : -1).filter(i => i >= 0);
    if (!done.length) {
      if (dropped) writeAuto(tokens, points, []);
      return failed.length ? noway() : dropped ? null : S.ctx.notify(tt(TX.autoNoLeg), 'warn');
    }
    // texte et points réécrits : les tronçons routés reçoivent les jetons et les points de leur voie avant leur point d'arrivée
    const dest = new Map(done.map(i => [chain[i + 1], res.legs[i]])),
      newTokens = [],
      newPoints = [],
      leave = pt => { // une arrivée « DCT » ne s'écrit pas : le texte normalisé n'a pas de DCT
        if (pt.via === 'DCT') delete pt.via;
        return pt;
      };
    for (const t of tokens) {
      const l = t.pt && dest.get(t.pt);
      if (l)
        for (const w of RG.tokensOf(l.points, {
            dct: false
          }).slice(1, -1)) {
          newTokens.push(w);
          genTok.add(w);
        }
      newTokens.push(t);
    }
    for (const p of points) {
      const l = dest.get(p);
      if (l) {
        newPoints.push(...l.points.slice(1, -1).map(leave));
        const exit = l.points.at(-1).via;
        if (exit && exit !== 'DCT') p.via = exit;
        else delete p.via;
      }
      newPoints.push(p);
    }
    writeAuto(newTokens, newPoints, genTok);
    const names = new Set(done.flatMap(i => res.legs[i].routes));
    S.ctx.notify(tt(pl(names.size, TX.autoOne, TX.autoMany), {
      n: names.size,
      d: distTxt(Math.round(res.nm))
    }), 'ok');
    if (failed.length) noway();
  } finally {
    if (!gone(s)) S.autoBusy = false;
    const b = s.body?.querySelector('[data-do="rauto"]');
    if (b) b.disabled = false;
  }
}
/** Écrit le résultat d'« Auto » : route.points, route.text, et sa provenance route.auto.seq ([{ w, g }] : chaque mot du texte, g vrai
 *  pour ce que cet Auto a écrit — voies, nœuds, sortie de SID et entrée de STAR ajoutées), relue par l'Auto suivant (§ 10.31) ;
 *  puis la route est relue (positions, distance, météo, devis). */
function writeAuto(tokens, points, gen) {
  const r = S.flight.route,
    g = gen instanceof Set ? gen : new Set(gen);
  r.points = points;
  r.text = withRwys(routeText(tokens));
  r.auto = {
    seq: tokens.filter(t => t.pt || t.keep).map(t => ({
      w: t.pt ? t.pt.id : t.keep,
      g: g.has(t)
    }))
  };
  r.from = 'route';
  const ta = S.body?.querySelector('[data-k="rtext"]');
  if (ta && ta.value !== r.text) ta.value = r.text;
  routeDerived(r);
  renderPts();
  saveFlight();
  refresh();
  resolveRoute(); // relecture (position des extrémités de voie prise dans route.points), distance, météo, devis
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
  const before = S.P.snapshot(); // les choix d'avant l'OFP, pour dire ce qu'il remplit
  applyOfp(ofp);
  // SID et STAR déposées dans l'OFP : au schéma commun d'aerodb (gardées sur l'appareil et synchronisées si le lecteur
  // écrit), puis leurs identifiants dans le vol courant (route.procedures v2) ; un OFP à la fois, aucun autre appel à SimBrief
  let pr = null;
  try {
    pr = (await s.ctx.aerodb?.rememberOfp?.(ofp)) || (await s.ctx.aerodb?.procedureFromOfp?.(ofp));
  } catch {
    /* sans procédures : la route de l'OFP reste telle quelle */
  }
  if (gone(s) || S.ofp !== ofp) return;
  S.P.applyOfp(pr, before); // v2 : les identifiants de la SID et de la STAR, seulement pour les côtés que le pilote n'a pas choisis
  saveFlight();
  refresh();
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
    from: 'ofp',
    typed: [] // SOG-0517 : la route d'un OFP n'impose aucun passage au calcul
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
  markEnds();
  S.ctx.notify(tt(TX.ofpLoaded, {
    dep,
    arr,
    n: pts.length
  }), 'ok');
  saveFlight();
  renderPlan();
  resolveRoute();
}
/** « Préparer ce vol » du module Missions (modules/missions SPEC § 4) : la mission lue (registre, puis son fichier) donne
 *  le vol par missionFlight — départ, arrivée, points dans l'ordre du fichier, appareil (sa fiche si le type en a une), niveau,
 *  mission — ; le reste (piste, procédures, carburant, météo) est la préparation habituelle. Refusée sur un vol démarré ; une
 *  route déjà posée n'est remplacée qu'après la question. Les points sont écrits en coordonnées OACI à la minute (un nom de la
 *  mission, PT1 ou TARGET, serait relu dans aerodb, où un point réel du même nom l'emporterait). */
async function applyMission(id) {
  const s = S,
    ctx = S.ctx,
    // lu en attendant le réseau (8 s au plus) : un fichier pas encore sur l'appareil n'est pas « introuvable »
    yaml = path => missionYaml(ctx, path);
  if (S.flight.started?.at) return ctx.notify(tt(TX.missionStarted, {
    id
  }), 'warn');
  const {
    row,
    mission
  } = await loadMission(ctx, id, yaml),
    mf = mission ? MS.missionFlight(mission) : null;
  if (gone(s)) return;
  if (!mf) return ctx.notify(tt(TX.missionUnread, {
    id
  }), 'warn');
  const was = S.flight.route || {};
  if ((was.text || was.dep || was.arr) && !(await ctx.ask(tt(TX.missionReplace, {
      id
    })))) return;
  if (gone(s) || S.flight.started?.at) return;
  const f = S.flight,
    {
      dep,
      arr,
      points
    } = mf.route,
    type = mf.aircraft.type,
    sheet = type ? S.sheets.find(p => (p.icao || '').toUpperCase() === type) : null;
  f.route = {
    ...emptyFlight().route,
    text: [dep, ...points.map(p => RT.icaoCoord(p.lat, p.lon)), arr].filter(Boolean).join(' '),
    dep,
    arr,
    // SOG-0193 : l'origine et la destination à leur position de la mission, points connus du vol : un terrain que la base ne connaît
    // pas garde sa place dans le plan et dans la distance (aerodb passe toujours d'abord, knownPoints)
    points: [dep && mf.route.depAt ? {
      id: dep,
      ...mf.route.depAt
    } : null, arr && mf.route.arrAt ? {
      id: arr,
      ...mf.route.arrAt
    } : null].filter(Boolean),
    manual: false,
    from: 'route',
    // le temps sur zone que la mission donne à ses points (§ 1 bis) : le maximum compté, modifiable par le pilote
    holds: Object.fromEntries(points.filter(p => p.hold).slice(0, 40).map(p => [RT.icaoCoord(p.lat, p.lon), {
      min: p.hold.min,
      max: p.hold.max,
      count: p.hold.max,
      name: String(p.id || '').slice(0,
        40) // le nom du point dans la mission (« PT1 »), dit au devis plutôt que ses coordonnées
    }])),
    // SOG-0193 L3 : les points imposés, par leur mot du texte (coordonnées à la minute), gardés à chaque relecture de la route
    locks: points.filter(p => p.lock === 'mission').slice(0, 60).map(p => ({
      id: RT.icaoCoord(p.lat, p.lon),
      mid: String(p.id || '').slice(0, 40),
      name: String(p.name || '').slice(0, 120)
    }))
  };
  if (mf.levelFt > 0) f.level = {
    ft: mf.levelFt
  };
  // l'appareil : celui du vol s'il est déjà de ce type, sinon la fiche du type, sinon le type seul
  if (type && String(f.aircraft?.type || '').toUpperCase() !== type) f.aircraft = sheet ? {
    sheetId: sheet.id,
    type: sheet.icao || type,
    registration: '',
    name: sheet.name || sheet.id
  } : {
    sheetId: '',
    type,
    registration: '',
    name: type
  };
  f.ofp = null;
  S.ofp = null;
  f.mission = mf.mission;
  f.missionCategory = mf.category || row?.category || ''; // SOG-0041 : celle du fichier, sinon celle du registre
  // SOG-0202 T2 : le thème et le sous-thème que la mission donne — sa catégorie migrée (« fret » → COMMERCIAL / CARGO), sinon sa famille
  // (mission.type) et la série qui répond à son sous-type ; rien d'inventé
  const mig = MT.fromCategory(f.missionCategory),
    th = mig?.theme || MT.themeOf(mission?.type)?.id || '';
  f.theme = th;
  f.series = mig?.series || (th ? MT.seriesFor(th, mission?.subtype) : '');
  themesDraw();
  markEnds();
  mChipDraw();
  ctx.notify(tt(TX.missionLoaded, {
    id,
    dep: dep || '?',
    arr: arr || '?',
    n: points.length
  }), 'ok');
  // § 1 ter : une clé de durée que la règle ne reconnaît pas est dite, une fois (rien ne tombe en silence)
  if (mf.holdUnread?.length) ctx.notify(tt(TX.holdUnread, {
    l: mf.holdUnread.slice(0, 6).join(', ')
  }), 'warn');
  saveFlight();
  renderPlan();
  resolveRoute();
}
/** Le fichier YAML d'un chemin du dépôt, lu en attendant le réseau (8 s au plus : un fichier pas encore sur l'appareil n'est pas
 *  « introuvable ») ; null s'il ne se lit pas. */
async function missionYaml(ctx, path) {
  const text = await Promise.race([Promise.resolve().then(() => ctx.data.read(path, {
    wait: true
  })).then(r => r?.value ?? r?.text ?? null).catch(() => null), new Promise(res => setTimeout(() => res(null), 8000))]);
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    return globalThis.jsyaml.load(text);
  } catch {
    return null;
  }
}
/** Une mission du dépôt par son identifiant : { row (la ligne du registre), mission (MS.readMission) } ; null pour ce qui ne se lit
 *  pas. Le chemin vient du registre, nettoyé par MS.readRegistry (jamais pris tel quel). */
async function loadMission(ctx, id, yaml = path => missionYaml(ctx, path)) {
  const row = MS.readRegistry(await yaml('missions/mission_registry.yaml')).find(r => r.id === id) || null,
    mission = row?.folder && row.file ? MS.readMission(await yaml(`missions/${row.folder}/${row.file}`)) : null;
  return {
    row,
    mission
  };
}
// ---------------------------------------------------------------- la puce de la mission et son volet (SOG-0193 L2, § 10.47 b)
/** La puce « Mission <ID> » de l'en-tête, pour un vol qui porte une mission ; rien sinon (le volet fermé). */
function mChipDraw() {
  const slot = S?.body?.parentElement?.querySelector(':scope > .fu-top [data-mchip]');
  if (!slot) return;
  const id = typeof S.flight?.mission === 'string' ? S.flight.mission.trim().slice(0, 40) : '';
  slot.innerHTML = id ? `<button type="button" class="fu-mchip" data-do="mpane" aria-expanded="${!!S.mpane}" title="${esc(tt(TX.mChipTitle))}">${esc(tt(TX.mChip, { id }))}</button>` : '';
  if (!id) mPaneClose();
}
/** Ouvre ou ferme le volet de la mission. */
function mPaneToggle() {
  return S?.mpane ? mPaneClose() : mPaneOpen();
}
/** Ouvre le volet : la fiche de la mission du vol, les risques en tête, sans quitter l'étape (le corps reste tel quel). */
async function mPaneOpen() {
  const s = S,
    pane = s?.body?.parentElement?.querySelector(':scope > [data-mpane]'),
    id = typeof s?.flight?.mission === 'string' ? s.flight.mission.trim() : '';
  if (!pane || !id) return;
  s.mpane = id;
  pane.hidden = false;
  pane.setAttribute('aria-label', tt(TX.mChip, {
    id
  }));
  pane.innerHTML = `${mPaneHead(id)}<p class="f-muted">${esc(tt(TX.mReading))}</p>`;
  mChipDraw();
  const {
    row,
    mission
  } = await loadMission(s.ctx, id);
  if (gone(s) || s.mpane !== id) return;
  pane.innerHTML = mPaneHead(id, mission?.title || row?.title || '') + (mission ? mPaneBody(id, mission) : `<p class="f-warn">${esc(tt(TX.missionUnread, { id }))}</p>`);
  pane.querySelector('[data-do="mclose"]')?.focus();
}
/** Ferme le volet ; la puce reprend le focus si le volet l'avait. */
function mPaneClose() {
  const pane = S?.body?.parentElement?.querySelector(':scope > [data-mpane]');
  if (!pane || !S.mpane) return;
  const had = pane.contains(document.activeElement);
  S.mpane = null;
  pane.hidden = true;
  pane.innerHTML = '';
  mChipDraw();
  if (had) S.body.parentElement.querySelector('.fu-mchip')?.focus();
}
/** La tête du volet : la mission, son titre, la croix (44 px). */
const mPaneHead = (id, title = '') => `<div class="f-row fu-mhead"><h2><b>${esc(id)}</b>${title ? ` ${esc(title)}` : ''}</h2><button type="button" class="fu-mx" data-do="mclose" aria-label="${esc(tt(TX.mClose))}" title="${esc(tt(TX.mClose))}">×</button></div>`;
/** Le corps du volet (un fichier de mission : entrée non fiable, tout échappé) : les risques d'abord (« danger → parade »), puis le
 *  résumé, les objectifs, les équipes, les zones (chacune sur la Carte), la description repliée. */
function mPaneBody(id, m) {
  const li = list => `<ul class="fu-mlist">${list.join('')}</ul>`,
    sec = (title, body) => body ? `<section><h3>${esc(tt(title))}</h3>${body}</section>` : '',
    risks = (m.risks || []).map(x => `<li data-mrisk>${esc(x.hazard)}${x.mitigation ? ` → ${esc(x.mitigation)}` : ''}</li>`),
    obj = [m.objectives?.primary, ...(m.objectives?.secondary || [])].filter(Boolean).map(x => `<li>${esc(x)}</li>`),
    teams = (m.teams || []).map(t => `<li>${esc(t.name)}${t.role ? ` <span class="f-muted">${esc(t.role)}</span>` : ''}</li>`),
    zones = (m.zones || []).map(z => `<li data-mzone="${esc(z.id)}">${esc([z.id, z.name].filter(Boolean).join(' '))}${m.hasCoords ? ` <a class="f-linkbtn" href="#maps?mission=${encodeURIComponent(id)}&zone=${encodeURIComponent(z.id)}">${esc(tt(TX.mOnMap))}</a>` : ''}</li>`),
    details = (m.details || []).map(p => `<p>${esc(p)}</p>`).join('');
  return `<section data-mrisks><h3>${esc(tt(TX.mRisks))}</h3>${risks.length ? li(risks) : `<p class="f-muted">${esc(tt(TX.mNoRisk))}</p>`}</section>
    ${m.summary ? `<p data-msummary>${esc(m.summary)}</p>` : ''}
    ${sec(TX.mObjectives, obj.length ? li(obj) : '')}${sec(TX.mTeams, teams.length ? li(teams) : '')}${sec(TX.mZones, zones.length ? li(zones) : '')}
    ${details ? `<details><summary>${esc(tt(TX.mDetails))}</summary>${details}</details>` : ''}`;
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
/** Profil du devis (verticalProfile) et, quand des procédures sont choisies et lues, profile.path : le chemin vertical prévu le long
 *  du chemin volé, [{ nm, ft }] (PG.verticalPath : montée, croisière, descente, puis les contraintes d'altitude des procédures). */
function profileOf(C) {
  const p = verticalProfile(C.q),
    fp = p ? fpNow() : null;
  if (p && fp) {
    const path = PG.verticalPath(fp, C.q);
    if (path.length) p.path = path;
  }
  return p;
}
/** Le devis comparé : sans legsAt (l'heure d'une réécriture), les legs sans origin lus comme « route » et, d'un devis écrit avant
 *  quote.distanceNm, sans elle — un enregistrement d'avant ne se réécrit pas pour si peu. */
const quoteCmp = (x, lenient) => x == null ? null : JSON.stringify({
  ...x,
  legsAt: undefined,
  distanceNm: lenient ? undefined : x.distanceNm,
  legs: Array.isArray(x.legs) ? x.legs.map(l => ({
    ...l,
    origin: l.origin || 'route'
  })) : x.legs
});
/** SOG-0377 : une relecture de la route est demandée et pas finie (5 s au plus : une lecture qui n'aboutit pas ne bloque rien). */
const routeReading = () => !!S.routeSeq && S.routeDone !== S.routeSeq && Date.now() - (S.routeAskedAt || 0) < 5000;
/** Écrit le profil et le devis dans le vol courant quand ils changent (maps le lit pour le profil vertical). Après le départ, un
 *  devis qui change ne le fait que par ses legs et le chemin vertical quand seules les procédures changent (quoteNm garde la
 *  distance du devis) : quote.legsAt dit alors quand ils ont été réécrits. Rien n'est écrit tant que les procédures choisies ne
 *  sont pas lues (un devis passager sur la route seule). */
function shareProfile(C) {
  // SOG-0377 (a) : une série de choix de procédures pas finie, ou la relecture de la route qui la suit : c'est sa fin qui écrit le vol
  if (procsPending() || routeReading() || S.P?.settling?.()) return;
  const p = profileOf(C),
    sum = quoteSummary(C.q),
    cur = S.flight,
    lenient = cur.quote != null && cur.quote.distanceNm == null;
  if (JSON.stringify(p) === JSON.stringify(cur.profile ?? null) && quoteCmp(sum, lenient) === quoteCmp(cur.quote ?? null, lenient)) return;
  // SOG-0209 (« synchronisation ne s'arrête pas ») : deux Carburant ouverts sur le même vol (deux onglets, deux appareils synchronisés)
  // calculaient chacun leur devis (avec ou sans vents en altitude) et réécrivaient chacun le leur en voyant l'écriture de l'autre. Le
  // résultat est comparé à celui que CETTE instance a calculé la dernière fois : inchangé, il ne s'écrit pas, même si l'enregistrement
  // porte celui d'un autre écrivain ; un devis pas encore chiffré (profil null) ne remplace pas un profil écrit
  const mine = JSON.stringify([p, quoteCmp(sum, lenient)]);
  if (S.shared === mine) return;
  S.shared = mine;
  if (!p && !sum && cur.profile) return;
  if (sum && cur.started
    ?.at) { // un seul état : legsAt = l'heure de la dernière réécriture des legs ou du chemin vertical, gardé tant qu'ils ne changent pas
    const same = JSON.stringify([sum.legs, p?.path ?? null]) === JSON.stringify([cur.quote?.legs, cur.profile?.path ?? null]);
    if (same && cur.quote?.legsAt) sum.legsAt = cur.quote.legsAt;
    else if (!same) sum.legsAt = new Date().toISOString();
  }
  cur.profile = p;
  cur.quote = sum;
  saveFlight();
}
/** Résumé du devis pour le compte rendu et la Carte (current_flight.quote) : carburant bloc et délestage arrondis,
 *  dans l'unité de la fiche, temps de vol (min), niveau, distanceNm (celle du devis : le chemin des procédures quand il y en a un),
 *  et legs : à chaque point du chemin volé (ceux de la route sans procédure choisie), les minutes cumulées
 *  depuis le lâcher des freins (roulage à part : settings.taxiMin), tirées de l'horaire prévu du devis (montée,
 *  croisière par tronçon avec son vent, descente), avec l'origine du point (route, sid, star, app), et taxiMin, ce roulage ;
 *  null sans devis chiffré. */
function quoteSummary(q) {
  if (!q?.hasFuel) return null;
  const P = progressPlan(S.C),
    pts = progPath().pts,
    taxi = +S.settings.taxiMin || 0;
  return {
    block: Math.round(q.block),
    trip: Math.round(q.trip),
    unit: S.C?.sheet?.unit || 'kg',
    minutes: Math.round(q.minutes),
    levelFt: q.levelFt || null,
    approx: !!q.approx,
    taxiMin: taxi, // roulage compté par le devis : legs part du lâcher des freins, après lui
    distanceNm: Math.round((S.C?.nm || 0) * 10) / 10,
    legs: P ? PG.etas(P, 0).map(e => ({
      id: pts[e.i]?.id || '',
      min: Math.max(0, Math.round((e.at / 60000 - taxi) * 10) / 10),
      origin: pts[e.i]?.origin || 'route'
    })) : null
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
    S.body.inert = !!S.flightPending; // le vol pas encore lu : rien à saisir (quelques secondes au plus : FLIGHT_WAIT_MS)
    waitLine();
    // la carte des procédures ne dépend que des terrains du vol et d'aerodb : dessinée sans attendre le registre des aéronefs ni les fiches
    // (refsPending ; utilisateur, 29/10 : « très long à charger avant de faire apparaître les procédures »)
    if (!S.flightPending) S.P.sync();
    return;
  }
  S.body.querySelector('[data-block="result"]')?.removeAttribute('data-loading');
  directDraw(); // SOG-0088 : la carte du direct suit le vol (démarré ou non, route changée)
  ensureProcs(); // les procédures choisies, lues par aerodb une fois par clé : le devis court ensuite sur leur chemin
  const C = S.C = compute(),
    {
      q,
      D,
      G,
      sheet
    } = C,
    $ = s => S.body.querySelector(s),
    unit = sheet?.unit || 'kg';
  if (levelAuto(C)) return; // SOG-0056 : un nouveau niveau « Auto » posé, le dessin est refait à ce niveau
  shareProfile(C);
  lvlMix(C);
  S.P.sync(); // choix, terrains, vol démarré : la carte des procédures est redessinée (sur place quand seules les listes changent)
  openInLinks(C);
  staleDraw(C); // SOG-0533 : la route calculée pour un autre niveau
  fplDraw(C);
  altnChkDraw(C); // SOG-0398 : la ligne du dégagement suit le terrain, la fiche, la durée du vol
  wxAutoSoon(); // SOG-0527 (2) : la météo qui manque ou a vieilli est demandée d'elle-même
  fmsState();
  acSelected();
  renderSummary(C);
  aidsDraw();
  natLine(); // SOG-0352 : les routes NAT d'un vol qui traverse l'Atlantique nord
  updateProgress();
  const done = stepsDone(C);
  S.body.querySelectorAll('.fu-steps button').forEach((b, i) => b.toggleAttribute('data-done', !!done[i]));
  isaHint();
  renderDa(C);
  // appareil : origine de la croisière
  $('[data-src]').textContent = C.source ? tt(TX.source, {
    s: `${TX.kinds[C.source.kind] ? tt(TX.kinds[C.source.kind]) : C.source.kind || '—'}${C.source.approx ? ` (${tt(TX.approx)})` : ''}${usedText(C.source.used)}`
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
      ${D.plan ? `<span title="${esc(tt(TX.planPtHint))}"><span class="fu-dia"></span>${esc(tt(TX.planPt, { fl: flTxt(D.plan.h), f: fuelTxt(D.plan.fuel, unit), t: hmm(D.plan.minutes) }))}</span>` : ''}
    </div>
    ${D.gap ? `<p class="f-warn">${esc(tt(TX.gap, { fl: flTxt(D.gap.from), r: tt(TX.reasons[D.gap.reason] || TX.reasons.thrust) }))}</p>` : ''}
    <div class="f-row"><button type="button" data-do="level" data-ft="${D.best.h}">${esc(tt(TX.use, { fl: flTxt(D.best.h) }))}</button>${D.fast.h !== D.best.h ? `<button type="button" data-do="level" data-ft="${D.fast.h}">${esc(tt(TX.use, { fl: flTxt(D.fast.h) }))}</button>` : ''}<span class="f-muted">${esc(tt(TX.decisionHint))}</span></div>`;
  // date du vol passée : la ligne de l'étape Vol et celle du résultat (le plan), jamais bloquantes
  const past = pastDateText(),
    pd = $('[data-pastdate]');
  if (pd) {
    pd.textContent = past;
    pd.hidden = !past;
  }
  // résultat collant
  const res = $('[data-block="result"]');
  if (!q) res.innerHTML = `<span class="f-muted">${esc(tt(sheet ? TX.noDistance : TX.noSheet))}</span>`;
  else if (!q.hasFuel) res.innerHTML = `<span class="f-warn">${esc(tt(TX.noFuel))}</span>`;
  else {
    const range = !q.windKnown && Number.isFinite(q.blockLow) && Number.isFinite(q.blockHigh) && Math.round(q.blockLow) !== Math.round(q
      .blockHigh);
    res.innerHTML = `${flightState() ? `<div class="fu-flightstate">${esc(flightState())}</div>` : ''}<div class="f-muted fu-ctx" title="${esc(resultContext(q, range, false))}">${acLineHtml()}<span data-ctxunit>${esc(`${fuelUnitOf(unit)} · ${fuelUnitOf(unit)}/h`)}</span><span aria-hidden="true"> · </span>${esc(resultContext(q, range, true))}${S.rcheck?.faults && S.rcheck.text === String(S.flight.route?.text || '') ? ` · <span class="f-warn" data-ctxfaults>${esc(tt(TX.rCheckN, { n: S.rcheck.faults }))}</span>` : ''}</div>
      <div class="fu-big">${range ? `${esc(fuelTxt(q.blockLow, unit))} – ${esc(fuelTxt(q.blockHigh, unit))}` : esc(fuelTxt(q.block, unit))}</div>
      <div class="f-tiles"><span class="f-muted" title="${esc(tt(TX.trip))}">${esc(tt(TX.tripS))}<b>${esc(fuelTxt(q.trip, unit))}</b></span><span class="f-muted" title="${esc(tt(TX.time))}">${esc(tt(TX.time))}<b>${hmm(q.minutes)}</b></span><span class="f-muted" title="${esc(`${tt(TX.tod)} : ${tt(TX.todVal, { d: distTxt(q.todNm) })}`)}">${esc(tt(TX.todS))}<b>${esc(distTxt(q.todNm))}</b></span></div>
      ${q.overMtow ? `<div class="f-warn">${esc(tt(TX.overMtow))}</div>` : ''}${past ? `<div class="f-warn fu-pastdate">${esc(past)}</div>` : ''}`;
  }
  // détail du devis (replié)
  const det = $('[data-details]');
  if ($('[data-fold="details"]').open) det.innerHTML = q?.hasFuel ? `<table class="f-table"><tbody>
      ${[[TX.taxi, q.taxi], [TX.climb, q.climb], [TX.cruise, q.cruise], ...(q.steps ? [[TX.steps, q.steps]] : []), [TX.descent, q.descent]].map(([l, p]) => `<tr><td>${esc(tt(l))}</td><td class="f-num">${p?.min != null ? hmm(p.min) : ''}</td><td class="f-num">${p?.nm != null ? esc(distTxt(p.nm)) : ''}</td><td class="f-num">${esc(fuelTxt(p?.fuel ?? p, unit))}</td></tr>`).join('')}
      ${(q.holds || []).map(h => `<tr data-holdrow="${esc(h.id)}"><td>${esc(tt(h.min !== h.max ? TX.holdLineRange : TX.holdLine, { id: h.id, min: h.min, max: h.max, n: h.count }))}</td><td class="f-num">${hmm(h.count)}</td><td></td><td class="f-num">${esc(fuelTxt(h.fuel, unit))}</td></tr>`).join('')}
      <tr><td><b>${esc(tt(TX.trip))}</b></td><td class="f-num">${hmm(q.minutes)}</td><td></td><td class="f-num"><b>${esc(fuelTxt(q.trip, unit))}</b></td></tr>
      <tr><td>${esc(tt(TX.contingency))}</td><td></td><td></td><td class="f-num">${esc(fuelTxt(q.contingency, unit))}</td></tr>
      ${altnRow(q, unit)}
      <tr><td>${esc(tt(TX.reserve))}</td><td></td><td></td><td class="f-num">${esc(fuelTxt(q.reserve, unit))}</td></tr>
      <tr><td><b>${esc(tt(TX.block))}</b></td><td></td><td></td><td class="f-num"><b>${esc(fuelTxt(q.block, unit))}</b></td></tr>
    </tbody></table>${q.lawFailed ? `<p class="f-warn">${esc(tt(TX.lawFailed))}</p>` : ''}` : '';
  // consignes de montée (repliées)
  const cl = $('[data-climb]'),
    // colonne d'altitude : niveaux de vol tant que l'unité d'altitude est le pied, sinon l'altitude dans l'unité choisie
    altUnit = unitOf('alt') !== 'ft',
    // la consigne de régime de la fiche (SOG-0061), dite dans le titre du pli, lisible sans l'ouvrir
    climbRpm = +sheet?.climb?.rpmNominal > 0 ? tt(TX.climbRpm, {
      r: Math.round(+sheet.climb.rpmNominal)
    }) : '',
    clSum = $('[data-fold="climb"] > summary');
  if (clSum) clSum.textContent = climbRpm ? `${tt(TX.climbGuide)} · ${climbRpm}` : tt(TX.climbGuide);
  if ($('[data-fold="climb"]').open) cl.innerHTML = G ? climbSvg(G, cl) + `<div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">${esc(tt(TX.alt))}${altUnit ? ` (${esc(altLabel())})` : ''}</th><th class="f-num">${esc(tt(TX.thr))}</th><th class="f-num">RPM</th><th class="f-num">IAS (${esc(speedLabel())})</th><th class="f-num">${esc(vsLabel())}</th><th class="f-num">${esc(unit)}/h</th><th class="f-num">Mach</th><th class="f-num">${esc(tt(TX.time))}</th><th class="f-num">${esc(unit)}</th></tr></thead><tbody>
      ${G.rows.map(r => `<tr><td class="f-num">${r.h ? altUnit ? altNum(r.h) : flTxt(r.h) : 'GND'}</td><td class="f-num">${Math.round(r.frac * 100)} %</td><td class="f-num">${r.rpm ? Math.round(r.rpm) : '—'}</td><td class="f-num">${speedNum(r.ias)}</td><td class="f-num">${vsNum(r.roc)}</td><td class="f-num">${Math.round(r.ff)}</td><td class="f-num">${r.mach.toFixed(2)}</td><td class="f-num">${hmm(r.t)}</td><td class="f-num">${Math.round(r.f)}</td></tr>`).join('')}
    </tbody></table></div>${G.reached ? '' : `<p class="f-warn">${esc(tt(TX.notReached, { r: vsTxt(20) }))}</p>`}` : `<p class="f-muted">${esc(tt(C.perf ? TX.noDistance : TX.noModel))}</p>`;
  // débit de ce vol (dans les réglages)
  const eb = $('[data-entrybox]');
  // dans l'unité du devis (SOG-0059 : la case disait kg/h et lisait des kg/h quelle que soit l'unité choisie), le libellé la dit
  const eu = fuelUnitOf(sheet?.unit),
    ek = sheet ? `${sheet.id}|${eu}` : '';
  if (sheet && eb.dataset.for !== ek) {
    eb.dataset.for = ek;
    const kg = S.settings.entries?.[sheet.id],
      shown = Number.isFinite(+kg) && kg !== '' && kg !== null ? Math.round(FU.fromKg(+kg, eu) * 10) / 10 : '';
    eb.innerHTML = `<label class="f-field">${esc(tt(TX.entry, { u: `${eu}/h` }))}<input data-k="entry" inputmode="decimal" value="${esc(shown)}"></label>`;
  }
  // SOG-0400 : le premier résultat dessiné après le montage : son repère, puis les repères écrits
  if (S.mtime && S.mtime.result == null) {
    mtMark('result');
    mountTiming();
  }
}

// ---------------------------------------------------------------- écran Fiches (lecture seule)
// Les fiches se modifient dans Maintenance › Appareils (modules/aircraft/, V3 § 10.34 A2) : ici la liste, la fiche du vol
// courant et « Utiliser » ; chaque ligne renvoie par un lien simple (même onglet) vers l'éditeur de Maintenance.
/** Adresse de l'éditeur de la fiche id dans Maintenance › Appareils, ou celle des Appareils (création) sans id. */
const maintenanceLink = id => `?app=maintenance#aircraft${id ? `?sheet=${encodeURIComponent(id)}` : ''}`;
/** Dessine la liste des fiches, en lecture seule. */
function renderSheets() {
  if (S.refsPending) return void(S.body.innerHTML = `<p class="f-muted">${esc(tt(TX.loadingRefs))}</p>`); // fiches pas encore là
  const F = SH(),
    lang = S.ctx.lang(),
    used = S.flight?.aircraft?.sheetId || '',
    A = S.A || {},
    canon = c => String(A.canonical?.(c) || c || '').toUpperCase(),
    // § 10.38 : les types de la flotte de la compagnie courante ; vide (ou sans compagnie) : la liste comme avant
    coTypes = new Set((S.coFleet?.aircraft || []).map(a => canon(a.type)).filter(Boolean)),
    mine = r => coTypes.size > 0 && !r.todo && coTypes.has(canon(r.sheet.icao || r.sheet.type || r.sheet.id)),
    rowHtml = r => {
      if (r.todo) return `<div class="f-item" data-type="${esc(r.todo.type)}"><div><b>${esc(S.A.label?.(r.todo.type) || r.todo.type)}</b>
        <div class="f-muted">${esc(tt(TX.coType, { n: r.todo.registrations.length }))}</div></div>
        <div class="f-row"><a class="f-btn" href="${maintenanceLink()}">${esc(tt(TX.createInMaint))}</a></div></div>`;
      const p = F.normalize(structuredClone(r.sheet)),
        miss = F.sheetMissingFamilies(F.sheetMissingPaths(p)).map(f => tt(TX.missingFamily[f])),
        when = F.profileWhen(p);
      return `<div class="f-item" data-id="${esc(p.id)}"><div><a href="${maintenanceLink(p.id)}"><b>${esc(p.name || p.id)}</b></a> <span class="f-muted">${esc(p.icao || '')} · ${esc(p.unit)}</span>${p.id === used ? ` <span class="f-badge" data-kind="ok" data-used>${esc(tt(TX.sheetUsed))}</span>` : ''}
        <div class="f-muted">${esc(F.profileSourceText(p))} · ${esc(miss.length ? tt(TX.missing, { list: miss.join(', ') }) : tt(TX.complete))}${when ? ` · ${esc(tt(TX.updated, { d: new Date(when).toLocaleDateString(lang) }))}` : ''}</div></div>
        <div class="f-row"><button type="button" data-do="use">${esc(tt(TX.useSheet))}</button><a class="f-btn" href="${maintenanceLink(p.id)}">${esc(tt(TX.editInMaint))}</a></div></div>`;
    },
    groups = sheetGroups(),
    grouped = rows => groups.map(g => ({
      cat: g.cat,
      rows: g.rows.filter(rows)
    })).filter(g => g.rows.length).map(g => `<h3 class="fu-cat">${esc(tt(TX.sheetCats[g.cat]))}</h3>${g.rows.map(rowHtml).join('')}`).join(''),
    ours = groups.flatMap(g => g.rows).filter(mine),
    others = groups.flatMap(g => g.rows).filter(r => !mine(r));
  // SOG-0060 (b) : la recherche d'appareil du pas Vol, la même (mêmes attributs : acResults et pickAircraft servent tels quels)
  S.body.innerHTML = `<p class="f-muted">${esc(tt(TX.sheetsIntro))}</p>
    <label class="f-field"><input type="search" data-k="acsearch" placeholder="${esc(tt(TX.acSearch))}" aria-label="${esc(tt(TX.acSearch))}" autocomplete="off"></label>
    <div class="f-list" data-acres></div>
    <div class="f-list" data-sheets>${ours.length ? `<h3 class="fu-cat" data-cosheets>${esc(tt(TX.coSheets, { a: S.coFleet.name || '' }))}</h3>${ours.map(rowHtml).join('')}${others.length ? `<details class="fu-others" data-othersheets><summary>${esc(tt(TX.otherSheets, { n: others.length }))}</summary>${grouped(r => !mine(r))}</details>` : ''}` : grouped(() => true) || `<p class="f-card f-muted">${esc(tt(TX.noSheet))}</p>`}</div>`;
  S.body.onclick = e => onSheetsClick(e);
  S.body.oninput = e => e.target.dataset?.k === 'acsearch' ? acResults(e.target.value) : null;
  S.body.onkeydown = S.body.onchange = null;
}
/** La flotte de la compagnie courante (§ 10.38 étape 1, FrameData.airline()) : { name, aircraft: [{ registration, type, callsign }] }
 *  bornée et nettoyée (un fichier de data/ est une entrée non fiable, § 10.36 : immatriculation 2 à 10 signes, type 2 à 4, indicatif
 *  12, 200 appareils au plus) ; aircraft vide sans compagnie, sans flotte ou sans FrameData.airline. */
async function readCoFleet() {
  let a = null;
  try {
    a = typeof window.FrameData?.airline === 'function' ? await window.FrameData.airline() : null;
  } catch {
    a = null;
  }
  const list = Array.isArray(a?.fleet?.aircraft) ? a.fleet.aircraft : [],
    up = (v, re) => {
      const x = String(v ?? '').trim().toUpperCase();
      return re.test(x) ? x : '';
    },
    seen = new Set(),
    aircraft = [];
  for (const e of list.slice(0, 200)) {
    const registration = up(e?.registration, /^[A-Z0-9-]{2,10}$/),
      type = up(e?.type, /^[A-Z0-9]{2,4}$/);
    if (!registration || seen.has(registration)) continue;
    seen.add(registration);
    aircraft.push({
      registration,
      type,
      callsign: up(e?.callsign, /^[A-Z0-9 -]{1,12}$/)
    });
  }
  return {
    code: typeof a?.code === 'string' ? a.code : '',
    name: typeof a?.name === 'string' ? a.name.slice(0, 80) : '',
    aircraft
  };
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
/** Geste de l'écran Fiches : « Utiliser » choisit cette fiche pour le vol (les liens vers Maintenance sont de simples liens). */
function onSheetsClick(e) {
  const pk = e.target.closest('[data-pick]'); // une ligne de la recherche d'appareil (SOG-0060 (b)) : le même choix qu'au pas Vol
  if (pk) return pickAircraft(pk.dataset.pick);
  const b = e.target.closest('[data-do="use"]');
  if (!b) return;
  const raw = S.sheets.find(x => x.id === b.closest('[data-id]')?.dataset.id);
  if (!raw) return;
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
// ---------------------------------------------------------------- plan de vol pour les simulateurs (V3 § 10.28)
/** Nombre de points de la route qui ont une position : l'export en demande deux. */
const placedPoints = () => (S.flight?.route?.points || []).filter(p => p && p.lat !== null && p.lat !== '' && p.lon !== null && p.lon !==
  '' && Number
  .isFinite(+p.lat) && Number.isFinite(+p.lon)).length;
/** Boutons d'export : actifs avec une route d'au moins deux points placés, sinon grisés avec la raison en infobulle. */
function fmsState() {
  const ok = placedPoints() >= 2;
  for (const b of S.body?.querySelectorAll('[data-fms]') || []) {
    b.disabled = !ok;
    b.title = ok ? '' : tt(TX.fmsNeed);
  }
}
/** Natures et noms que la route ne porte pas, lus dans aerodb (au mieux, sans bloquer l'export) : { names: { LFPO: 'Paris-Orly' },
 *  kinds: { RGS: 'vor' } } — le nom des deux terrains, la nature (VOR, NDB) des points de trois ou quatre lettres. */
async function fmsLookups(f) {
  const names = {},
    kinds = {},
    pts = (f.route?.points || []).map(p => String(p?.id || '').toUpperCase()),
    ends = new Set([f.route?.dep, f.route?.arr, pts[0], pts.at(-1)].map(x => String(x || '').toUpperCase()).filter(Boolean)),
    find = S.ctx.aerodb?.find ? id => Promise.resolve(S.ctx.aerodb.find(id, 6)).catch(() => []) : () => Promise.resolve([]);
  await Promise.all([...new Set(pts.filter(Boolean))].map(async id => {
    const hit = ((await find(id)) || []).filter(h => String(h?.code || '').toUpperCase() === id);
    if (ends.has(id)) {
      const ad = hit.find(h => h.kind === 'aerodrome');
      if (ad?.name) names[id] = ad.name;
    } else if (id.length <= 4) {
      const nav = hit.find(h => h.kind === 'navaid');
      if (nav) kinds[id] = /^NDB/i.test(nav.name) ? 'ndb' : 'vor';
    }
  }));
  return {
    names,
    kinds
  };
}
/** Écrit le plan de vol dans le format demandé (xp11 : .fms 1100, xp10 : .fms version 3, pln : MSFS) d'après la route et les
 *  procédures choisies (CF.expandedPath, lues par aerodb si elles ne le sont pas encore), et le propose au téléchargement. */
async function exportFms(which) {
  const s = S,
    f = s.flight;
  if (placedPoints() < 2) return;
  try {
    const procs = s.procs?.key === procsKey(f) ? s.procs.procs || {} : await CF.loadProcedures(s.ctx.aerodb, f).catch(() => ({})),
      look = await fmsLookups(f),
      // le cycle de la base publiée (CYCLE du .fms) : celui des zones ouvertes, sinon le plus récent des zones publiées
      st = await Promise.resolve().then(() => s.ctx.aerodb?.status?.()).catch(() => null),
      cycle = st?.cycle || Object.values(st?.published || {}).filter(Boolean).sort().pop() || null;
    if (gone(s)) return;
    // SOG-0238 (l'utilisateur, 11/11 : « tout ce qui vient de la bdd peut partir vers le simu ») : une procédure lue de Little Navmap
    // part dans le fichier comme les autres, ses positions prises sur l'appareil au moment de l'export (jamais dans data/ : pubProcs)
    const file = FMS.exportOf({
      xp11: 'fms1100',
      xp10: 'fmsv3',
      pln: 'pln2020'
    } [which] || 'fms1100', f, CF.expandedPath(f, procs || {}), {
      procs: procs || {},
      cycle,
      ...look
    });
    download(file.name, file.text, `${file.type};charset=utf-8`);
  } catch (e) {
    if (!gone(s)) s.ctx.notify(tt(TX.fmsFailed), 'warn');
  }
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
/** Passe d'un écran du module à l'autre (Devis, Fiches). */
function show(view) {
  S.view = view;
  viewInAddress(view);
  for (const b of S.el.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  view === 'sheets' ? renderSheets() : renderPlan();
}

/** Écran affiché → adresse : `?view=sheets` pour les Fiches, rien pour le Devis (les autres clés, `with`, `from`, `focus`,
 *  restent). Pas de navigation, pas de remontage (replaceState : aucun événement), l'adresse seule change pour que le
 *  popover du cadre marque la rangée de l'écran affiché. Rien n'est écrit si l'adresse n'est plus celle de fuel. */
function viewInAddress(view) {
  const [id, query = ''] = location.hash.slice(1).split('?');
  if (id !== 'fuel') return;
  const q = new URLSearchParams(query);
  if (view === 'sheets') q.set('view', 'sheets');
  else q.delete('view');
  const rest = q.toString(),
    hash = `#fuel${rest ? `?${rest}` : ''}`;
  if (location.hash !== hash) history.replaceState(history.state, '', hash);
}

export async function mount(el, ctx) {
  // jeton de ce montage : S lui-même. Un montage dont l'adresse a changé pendant ses lectures (unmount, ou un second
  // mount qui a posé son propre S) ne doit plus rien écrire : S est un global du module, sans ce contrôle le show() du
  // premier montage tournerait sur l'état du second (relais cloud, 24 oct. 2026, DECISIONS.md)
  const self = S = {
    el,
    ctx,
    sheets: [],
    stops: [],
    view: 'plan',
    // SOG-0400 : les repères de temps du montage (ms depuis t0), écrits une fois le résultat dessiné (mountTiming)
    mtime: {
      t0: performance.now(),
      at: new Date().toISOString(),
      registry: 'ok'
    }
  };
  // la carte « Procédures » (modules/fuel/procedures.js) : ce qu'elle demande à l'écran, rien d'autre
  S.P = createProcedures({
    zoneGap: icao => zoneGapOf(icao), // SOG-0143 : la ligne « zone manquante » d'un terrain sans procédures
    procState: icao => procStateOf(icao), // SOG-0157 : l'état des procédures de son État (le bouton de lecture le suit)
    ctx,
    flight: () => self.flight,
    route: () => self.flight.route ||= emptyFlight().route,
    body: () => S === self ? self.body : null,
    plan: () => self.view === 'plan',
    key: () => procsKey(self.flight),
    gone: () => gone(self),
    aidsChanged: () => !gone(self) && aidsDraw(), // l'ILS de l'approche choisie arrivé : le bloc « Aides radio » (SOG-0200)
    pending: () => !!self.refsPending,
    save: () => S === self && saveFlight(),
    settled: procsSettled,
    drop: () => {
      self.procs = null; // les procédures lues du vol sont périmées : relues au prochain refresh
    },
    refresh: () => S === self && refresh(),
    // le vent du METAR connu du terrain, celui de l'étape Départ (jamais le TAF) : { dir (vrai, d'où il vient), kt, magVar } ou null
    // SOG-0210 (refus du 13/11, KDEN) : un terrain de la carte des procédures sans METAR en demande la lecture — une tentative toutes
    // les 15 s au plus, 4 par terrain et par ouverture (rien en boucle) ; la carte suit à la réponse (wxFetch redessine). Rend null.
    wantWind: icao => {
      const k = String(icao || '').toUpperCase(),
        w = self.wxWant || (self.wxWant = {}),
        a = w[k] || (w[k] = {
          n: 0,
          at: 0
        });
      if (!isIcao(k) || a.n >= 4) return null;
      // hors réseau, ou trop tôt : un nouvel essai à l'échéance (la carte se redessine et redemande), rien n'est lu maintenant
      const due = self.ctx.net?.online?.() === false ? 15e3 : a.at + 15e3 - Date.now();
      if (due > 0) {
        clearTimeout(a.timer);
        a.timer = setTimeout(() => S === self && !gone(self) && self.P?.windSync?.(), due +
          50); // SOG-0377 : rien de redessiné si le vent est déjà là
        return null;
      }
      a.n++;
      a.at = Date.now();
      // SOG-0493 : wxFetch lit le montage courant (S) ; la carte d'un montage remplacé ne le fait pas lire pour le nouveau
      if (S === self && !gone(self)) wxFetch(false);
      return null;
    },
    wind: icao => {
      const st = WX.station(self.wx?.metar?.[icao], null);
      return st && st.wspd != null ? {
        dir: st.wdir,
        kt: st.wspd,
        magVar: self.wxAd?.[icao]?.magVar,
        at: (/\b\d{2}(\d{4})Z\b/.exec(String(st.raw || '')) || [])[1] ||
          '' // l'heure du METAR (SOG-0090 : « piste probable (METAR 1230Z, …) »)
      } : null;
    },
    // SOG-0090, second lot : ce que l'ATIS de chaque réseau du vol dit de la piste d'un côté (lu par atisRead, jamais en minuterie)
    atis: (icao, side, known) => (self.atis?.nets || []).map(n => ATIS.atisSide(n, self.atis.feeds?.[n], icao, side, known)).filter(
      Boolean),
    // SOG-0325 : au-delà de la piste, la lettre, le QNH et le vent de l'ATIS de chaque réseau du vol (jamais son texte)
    atisInfo: (icao, side) => (self.atis?.nets || []).map(n => ATIS.atisInfo(n, self.atis.feeds?.[n], icao, side)).filter(Boolean),
    // SOG-0325 : le QNH du METAR connu (hPa) et son heure (« 1425 ») ; null sans METAR
    metarQnh: icao => {
      const st = WX.station(self.wx?.metar?.[icao], null),
        q = Number.isFinite(+st?.qnh) ? Math.round(+st.qnh) : null;
      return q != null && q >= 850 && q <= 1090 ? {
        qnh: q,
        at: (/\b\d{2}(\d{4})Z\b/.exec(String(st.raw || '')) || [])[1] || ''
      } : null;
    },
    // la limite de vent de travers de la fiche de l'appareil (maxCrosswindKt), 0 sans fiche ou sans limite
    crossLimit: () => +self.sheets?.find(p => p.id === self.flight.aircraft?.sheetId)?.maxCrosswindKt || 0
  });
  // les noms de terrain et la complétion des champs de l'étape Vol (modules/fuel/adnames.js)
  S.AD = createAdNames({
    ctx,
    body: () => S === self ? self.body : null,
    flight: () => self.flight,
    gone: () => gone(self)
  });
  S.stops.push(S.AD.stop);
  // la complétion au curseur du champ de route (modules/fuel/routecomplete.js, § 10.31)
  S.RC = createRouteComplete({
    ctx,
    body: () => S === self ? self.body : null,
    gone: () => gone(self),
    names: () => {
      const m = self.P?.textModel?.();
      return m ? {
        sid: [...m.sid.keys()],
        star: [...m.star.keys()]
      } : null;
    },
    // le dernier point connu du vol parmi les mots avant le curseur, sinon le départ
    around: words => {
      const pts = (self.flight.route?.points || []).filter(p => Number.isFinite(+p.lat));
      for (const w of [...(words || [])].reverse()) {
        const p = pts.find(x => String(x.id).toUpperCase() === w.split('/')[0]);
        if (p) return p;
      }
      return pts[0] || null;
    }
  });
  // premier dessin sans attendre le réseau (audit de poids, mesure 4) : les bibliothèques et ce que l'appareil a déjà
  // (read sans wait : la copie gardée, ou null pour un fichier jamais lu) ; le registre d'aerodb, les fiches, et le
  // vol courant ou les réglages jamais lus arrivent ensuite (completeMount) — en attendant « chargement… », et rien
  // n'est écrit ni calculé
  const rd = path => Promise.resolve().then(() => ctx.data.read(path)).then(r => r?.value ?? null).catch(() => null),
    [, kept0, fuelSettings, ofp, ui, lastAcKept, display] = await Promise.all([loadLibs(), rd(pilotPath('current_flight.json')),
      rd(pilotPath('fuel.json')), rd(OFP_PATH), rd(UI_PATH), rd(LAST_AC_PATH), rd(DISPLAY_PATH)
    ]);
  if (gone(self)) return; // démonté, ou remplacé par un autre montage, pendant les lectures
  S.refsPending = true; // registre d'aerodb et fiches pas encore là : ni devis, ni écriture du devis
  S.flightPending = kept0 == null; // vol courant jamais lu sur cet appareil : écran en attente, aucune écriture
  S.settingsPending = fuelSettings == null;
  const kept = kept0 || {};
  S.flight = flightOf(kept);
  S.base = CF.routeBase(kept); // ce que l'enregistrement dit de la route et du niveau (R-F4 : on n'écrit que ce qui en diffère)
  rwyTextSync(); // SOG-0089 : le texte d'un vol d'avant ce lot refait depuis le modèle, avant le premier dessin, en mémoire
  S.settings = {
    taxiMin: 10,
    reserveMin: 30,
    contingencyPct: 5,
    displayUnit: 'kg',
    displaySpeed: 'kt',
    displayAlt: 'ft',
    displayDist: 'NM',
    entries: {},
    // SOG-0279 (3) : l'affichage vient du document de l'appareil ; fuel.json ne l'apporte plus qu'à la copie de la première lecture
    ...(fuelSettings || display ? settingsFrom(fuelSettings, display) : {})
  };
  S.display0 = display; // le document de l'appareil lu au montage (null : la copie depuis fuel.json reste à faire à son arrivée)
  S.lastAc = lastAcKept?.aircraft || null;
  if (!S.flightPending) flightDefaults(kept);
  S.ofp = ofp;
  // météo : la couche du cadre (ctx.weather) la garde ; relue au premier dessin (hors ligne : sa réserve seulement)
  S.wx = null;
  S.ui = ui || {};
  delete S.ui.view; // gardé par les versions précédentes, plus lu ni écrit : l'écran s'ouvre toujours sur le Plan
  S.aloft = null;
  for (const path of OLD_WEATHER) ctx.data.remove?.(path)?.catch?.(() => {});
  // pas de la préparation : celui gardé, ou Route quand la Carte envoie « Modifier la route » (#fuel?focus=route)
  // et la proposition du mode choix de la Carte (#fuel?focus=arr&rwy=13R&star=ID&app=ID, plusieurs clés d'un aller, « none » =
  // « Aucune », une clé absente laisse sa famille ; § 10.23 puis § 10.30 : rwy sid star app apptrans, pas de transition SID / STAR) :
  // prises une fois, ensemble, et retirées de l'adresse (frame/INTEGRATION.md § 6.1)
  const PROPOSAL_KEYS = ['rwy', 'sid', 'star', 'app', 'apptrans'],
    // SOG-0398 lot 2 : « altn », un terrain proposé touché sur la Carte seule (INTEGRATION § 3 ter)
    q = ctx.consume ? ctx.consume('focus', 'mission', 'new', 'ralt', 'altn', 'direct', 'lat', 'lon', ...PROPOSAL_KEYS) : ctx.query || {},
    asked = q.focus;
  if (q.direct) S.directAsk = { // SOG-0088 : #fuel?direct=<ID>[&lat=&lon=], traité une fois le vol lu (completeMount)
    direct: q.direct,
    lat: q.lat,
    lon: q.lon
  };
  if ((asked === 'dep' || asked === 'arr') && PROPOSAL_KEYS.some(k => q[k] != null && q[k] !== '')) S.P.propose(asked, {
    rwy: q.rwy,
    sid: q.sid,
    star: q.star,
    app: q.app,
    appTrans: q.apptrans // la clé de l'adresse en minuscules, le champ de route.procedures en appTrans
  });
  if (asked === 'dep') S.P.focus('dep');
  // ce que l'adresse demande à l'ouverture (#fuel?focus=route | dep | arr), une seule valeur (refonte § 10.33 R-F6) : le pas qui porte
  // le champ de route, ou celui qui porte la ligne Arrivée (Route avant le départ, Départ après) quand la Carte envoie « Changer »
  S.focus = ['route', 'dep', 'arr'].includes(asked) ? asked : '';
  // « Préparer ce vol » du module Missions (#fuel?mission=<id>) : reprise une fois le vol courant connu (flightReady)
  S.missionAsked = String(q.mission || '').trim();
  S.newAsked = q.new === '1'; // #fuel?new=1 : « Nouveau vol » demandé par l'adresse (sa question comprise)
  S.raltAsked = q.ralt ?? ''; // #fuel?ralt=<index> : un itinéraire choisi sur la Carte seule (INTEGRATION § 3 bis)
  S.altnAsked = /^[A-Z]{4}$/i.test(String(q.altn || '')) ? String(q.altn).toUpperCase() : ''; // SOG-0398 : #fuel?altn=<ICAO> (§ 3 ter)
  if (S.focus === 'arr') S.P.focus('arr'); // la première liste de l'arrivée prend le focus dès qu'elle est dessinée
  S.step = S.focus === 'route' ? 1 : S.focus ? (kept.started?.at ? 4 : 1) : Math.max(0, Math.min(4, +S.ui.step || 0));
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(ctx.t(meta.title))}</h1>
    <div class="f-row fu-top"><div class="f-tabs" role="group"><button type="button" data-view="plan">${esc(tt(TX.plan))}</button><button type="button" data-view="sheets">${esc(tt(TX.sheets))}</button></div><span class="fu-mchipslot" data-mchip></span><button type="button" data-do="newflight">${esc(tt(TX.newFlight))}</button></div>
    <p class="f-muted" data-wait role="status" hidden></p>
    <div data-body></div>
    <aside class="f-card fu-mpane" data-mpane role="dialog" aria-modal="false" hidden></aside>`;
  // titre : sur un téléphone l'en-tête du cadre porte celui du module (ctx.titled) ; le h1 reste alors pour les lecteurs
  // d'écran seulement (f-sr), et suit « frame-titled » (frame/INTEGRATION.md § 6)
  S.srTitle = () => el.querySelector(':scope > h1')?.classList.toggle('f-sr', !!ctx.titled);
  S.srTitle();
  window.addEventListener('frame-titled', S.srTitle);
  S.body = el.querySelector('[data-body]');
  // liste des terrains proposés (étape Vol) : fermée quand le champ perd le focus ; un appui sur une proposition ne prend pas le focus
  // du champ (sinon le flou la fermerait avant le clic). Posés une fois : l'écran Devis est redessiné, pas son conteneur.
  // les bases de Little Navmap sur ce poste (le lanceur le dit) : un repli externe de la ligne « zone manquante » (SOG-0143)
  S.lnm = false;
  Promise.resolve().then(() => ctx.launcher?.call?.('folders')).then(r => {
    const list = Array.isArray(r?.folders) ? r.folders : []; // la réponse du lanceur : { folders: [{ id, path, exists, from }] }
    if (S) S.lnm = list.some(f => f?.id === 'lnmdb' && f.exists === true);
  }).catch(() => {});
  // les itinéraires pour la Carte (SOG-0134 a) : la ligne survolée, appuyée ou atteinte au clavier est publiée (hovered), et un tracé
  // touché sur la Carte en vue double revient ici, montré (maps-route-alt-show)
  S.body.addEventListener('pointerover', e => altsHover(e));
  S.body.addEventListener('focusin', e => altsHover(e));
  // SOG-0321 : un point de la liste de la route survolé, touché ou atteint au clavier est dit à la Carte (route-point-hover), qui le
  // surligne avec ses deux tronçons ; hors de la liste, ou Carburant quitté : plus rien
  S.body.addEventListener('pointerover', e => ptHover(e.target));
  S.body.addEventListener('focusin', e => ptHover(e.target));
  S.body.addEventListener('pointerleave', () => ptHover(null));
  S.stops.push(() => ptHover(null, true));
  S.onAltPick = e => altsPicked(e);
  window.addEventListener('maps-route-alt-show', S.onAltPick);
  // SOG-0398 lot 2 : un terrain proposé touché sur la Carte à côté (maps-altn-pick { icao }) : proposé ici, jamais pris
  S.onAltnPick = e => altnTouched(e?.detail?.icao);
  window.addEventListener('maps-altn-pick', S.onAltnPick);
  // SOG-0134 : la Carte à côté dit quand elle a dessiné les tracés publiés : la dernière part du calcul
  S.onAltsDrawn = () => {
    if (gone(self) || !self.rtime?.t2 || self.rtime.t4) return;
    self.rtime.t4 = performance.now();
    if (self.rtime.t3) routeTiming(self);
  };
  window.addEventListener('maps-route-alts-drawn', S.onAltsDrawn);
  S.onCoThemes = () => themesLoad();
  window.addEventListener('frame-airline', S.onCoThemes);
  S.body.addEventListener('focusout', e => {
    const hits = S?.AD?.hitsFor(e.target?.dataset?.k) || 0; // avant que la liste se ferme
    S?.AD?.onFocusOut(e);
    S?.RC?.onFocusOut(e);
    revertAd(e.target, hits);
  });
  for (const type of ['pointerdown', 'mousedown']) S.body.addEventListener(type, e => {
    S?.AD?.onPointerDown(e);
    S?.RC?.onPointerDown(e);
  });
  // « ? » de l'en-tête : le chapitre au paragraphe de l'écran (Fiches ; le pas affiché sur téléphone, où la barre des pas est
  // visible ; le devis entier sur un module large, où les cinq pas sont les uns sous les autres)
  ctx.helpAnchor?.(() => S?.view === 'sheets' ? 'fuel-sheets' : S?.body?.querySelector('.fu-steps')?.offsetParent ? `fuel-step-${S.step + 1}` :
    'fuel-quote');
  el.querySelector('.f-tabs').onclick = e => e.target.dataset.view && show(e.target.dataset.view);
  el.querySelector('[data-do="newflight"]').onclick = () => newFlight();
  // la puce de la mission et son volet (SOG-0193 L2) : hors du corps, comme « Nouveau vol »
  el.querySelector('[data-mchip]').onclick = e => e.target.closest('[data-do="mpane"]') && mPaneToggle();
  el.querySelector('[data-mpane]').onclick = e => e.target.closest('[data-do="mclose"]') && mPaneClose();
  el.querySelector('[data-mpane]').onkeydown = e => e.key === 'Escape' && mPaneClose();
  mChipDraw();
  // fiches changées ailleurs (synchronisation, autre onglet) ; vol courant écrit par maps
  S.stops.push(ctx.aerodb?.on?.('change', e => self.P.onChange(e)));
  S.stops.push(ctx.aerodb?.on?.('change', async e => {
    if (!e?.aircraft || gone(self) || !S.body) return;
    const A = await ctx.aerodb.aircraft().catch(() => S.A);
    if (gone(self)) return;
    S.A = A;
    await readSheets();
    if (gone(self)) return;
    if (S.view === 'sheets') keepScroll(S.body, renderSheets);
    else if (S.view === 'plan') refresh();
  }));
  // SOG-0279 : l'état de la couche de données (le vol retenu ou parti) suit le bouton « Envoyer ce vol à mes appareils »
  if (typeof ctx.data.onStatus === 'function') S.stops.push(ctx.data.onStatus(st => {
    if (gone(self)) return;
    S.fdStatus = st;
    sendDraw();
  }));
  S.stops.push(ctx.data.watch(pilotPath('current_flight.json'), async () => {
    if (gone(self)) return;
    const f = xpRestore(await ctx.data.get(pilotPath(
      'current_flight.json'))); // SOG-0375 : positions d'X-Plane gardées sur ce poste
    if (gone(self) || !f || f.updated_at === S.writing || f.updated_at === S.flight.updated_at) return;
    // écho d'une de nos écritures, arrivé après une plus récente : ignoré (il ramènerait un texte plus ancien)
    if (f.by === 'fuel' && S.writing && String(f.updated_at) < String(S.writing)) return;
    const typing = S.body?.querySelector('[data-k="rtext"]'),
      keepText = typing && document.activeElement === typing ? typing.value : null,
      // ce qui fait le devis : une écriture d'ailleurs qui n'y touche pas (la position réelle du cadre, une vue de la
      // carte) est relue sans être refaite ni réécrite
      plan = x => JSON.stringify([x?.route?.points, x?.route?.distanceNm, x?.level, x?.aircraft, x?.started?.at ?? null]),
      planChanged = plan(f) !== plan(S.flight);
    // une écriture du cadre (progress seul, R-F4) : sa progression est reprise, jamais une route ni un niveau qu'il aurait relus avant
    // une écriture de Carburant
    if (f.by === 'frame') {
      S.flight.progress = f.progress ?? null;
      // SOG-0435 : le devis ne dépend que de la route, du niveau, de l'aéronef et du départ — une écriture de progression seule (toutes
      // les 5 s pour un vol démarré) ne recalcule rien : la carte « Progression prévue » seule, d'après le devis déjà fait (refresh
      // coûtait 35 ms au poste, 300 ms sur un téléphone modeste : une saccade toutes les 5 s)
      return S.flightPending || S.refsPending || S.view !== 'plan' || !S.C ? undefined : progressOnly();
    }
    const oldPlanned = S.flight.planned_at ?? null,
      // ce que Carburant a changé et pas encore écrit (un niveau tapé dans les 300 ms) : remis par-dessus le vol repris (R-F4, F88)
      pend = CF.changesOf(S.base, S.flight);
    S.flight = flightOf(pend ? CF.applyChanges(f, pend) : f);
    S.base = CF.routeBase(f);
    if (!S.flightPending)
      mChipDraw(); // SOG-0251 : la mission quittée ailleurs (la croix de la Carte) : la puce suit, quel que soit le chemin
    if (pend) saveFlight();
    if (S.flightLate) { // le vol enregistré arrive après l'attente bornée (flightArrives) : la ligne d'attente s'efface
      S.flightLate = false;
      waitLine();
    }
    if (S.flightPending) S.flightSeen = true; // arrivé avant la fin de l'attente : flightArrives le garde
    if (S.flightPending || S.refsPending) return; // montage pas fini : completeMount dessine et reprend ce vol
    if ((S.flight.planned_at ?? null) !==
      oldPlanned) { // date du vol changée ailleurs (autre appareil) : champ, météo et vents relus
      const wd = S.body?.querySelector('[data-k="wxdate"]');
      if (wd && wd.value !== whenField(S.flight.planned_at)) wd.value = whenField(S.flight.planned_at);
      whenChanged();
    }
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
  const srTitle = S.srTitle;
  S.stops.push(() => window.removeEventListener('frame-titled', srTitle));
  // § 10.38 : la compagnie courante change (Réglages › Compagnie) : sa flotte relue, la vue redessinée
  const onAirline = async () => {
    if (gone(self)) return;
    const fleet = await readCoFleet();
    if (gone(self) || !S.body) return;
    S.coFleet = fleet;
    if (S.view === 'sheets') keepScroll(S.body, renderSheets);
    else if (S.view === 'plan') refresh();
  };
  window.addEventListener('frame-data-airline', onAirline);
  S.stops.push(() => window.removeEventListener('frame-data-airline', onAirline));
  // SOG-0080 : le moteur de route du lanceur, s'il le porte (sans lui, pas de boutons)
  RE.available(ctx.launcher).then(on => {
    if (gone(self)) return;
    S.routeEngine = on;
    S.body?.querySelector('[data-reng]')?.toggleAttribute('hidden', !on);
    S.body?.querySelector('[data-rengnone]')?.toggleAttribute('hidden', on); // SOG-0322 : dit, sans le lanceur
  });
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
  // toujours le Plan à l'ouverture : on vient ici pour le plan de vol ou le devis, rarement pour une fiche d'appareil ;
  // les Fiches s'ouvrent par leur onglet ou par l'adresse #fuel?view=sheets (le dernier écran n'est plus gardé)
  show(S.focus !== 'route' && S.focus !== 'arr' && ctx.query?.view === 'sheets' ? 'sheets' : 'plan');
  if (!S.flightPending) flightReady();
  // SOG-0413 : les routes NAT relues quand l'écran s'ouvre ou revient au premier plan (la règle d'âge est celle d'aerodb.natEnsure :
  // plus d'une heure, périmées) ; aucune minuterie
  const onVis = () => document.visibilityState === 'visible' && natAuto(self);
  document.addEventListener('visibilitychange', onVis);
  S.stops.push(() => document.removeEventListener('visibilitychange', onVis));
  mtMark('mount'); // SOG-0400 : le premier dessin fait
  if (!S.flightPending) mtMark('flight');
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
  markEnds();
  if (S.focus === 'route') {
    const ta = S.body.querySelector('[data-k="rtext"]');
    ta?.focus();
    ta?.setSelectionRange?.(ta.value.length, ta.value.length);
  }
  S.P.applyFocus();
  if (!S.refsPending) resumeFlight();
  if (S.missionAsked) applyMission(S.missionAsked);
  else if (S.newAsked) newFlight();
  else if (S.raltAsked !== '') altsFromAddress(S.raltAsked);
  else altsFromDoc(); // SOG-0224 : de retour sans choix, les propositions du document
  if (S.altnAsked) altnFromAddress(S.altnAsked); // SOG-0398 lot 2 : un terrain touché sur la Carte seule
  S.altnAsked = '';
  S.raltAsked = '';
  S.missionAsked = '';
  S.newAsked = false;
}
/** Vol modifié ailleurs pendant l'absence de fuel : repris (devis refait) ; sinon la route relue. */
function resumeFlight() {
  if (S.flight.by && S.flight.by !== 'fuel') adoptForeignFlight();
  else if (S.flight.route?.text || S.flight.route?.dep) S.flight.route.manual || resolveRoute();
}
// attente bornée du vol courant et des réglages d'un appareil neuf (première synchronisation) : au-delà, l'écran se libère sur un vol
// vide, dit (lateFlight), et le vol enregistré est repris par le suivi du vol courant dès qu'il arrive. Un pilote enrôlé le 1er nov.
// 2026 restait bloqué sur l'étape Route (« aucun bouton ne fonctionne ») : le premier arbre d'un dépôt GitLab qui tarde laissait le
// corps inerte sans fin, et « Chargement du vol… » n'était écrit que dans le Résultat, invisible à l'étape 2.
const FLIGHT_WAIT_MS = 4000,
  // le registre des aéronefs d'aerodb (aircraft()) attend lui aussi le réseau sans borne : au-delà, la suite du montage et le devis
  // dessiné avec ce qui existe (sans fiche s'il le faut) ; le registre arrivé plus tard est relu (completeMount) et un changement
  // d'aerodb le relit aussi. SOG-0400 (mesure de V3 Frame : 8,3 s de « Chargement des aéronefs et fiches… » quand le registre ne
  // répond pas) : 3 s (8 s avant)
  REFS_WAIT_MS = 3000,
  // SOG-0400 : les repères de temps du montage, dans le document de l'appareil (comme route_timing.json)
  MOUNT_TIMING = 'cache/fuel/mount_timing.json';
/** SOG-0400 : pose un repère du montage (ms depuis son début), une seule fois. */
function mtMark(k) {
  const T = S?.mtime;
  if (T && T[k] == null) T[k] = Math.round(performance.now() - T.t0);
}
/** SOG-0400 : écrit les repères du montage dans le document de l'appareil — une fois le résultat dessiné, puis de nouveau si le registre
 *  arrive après son attente (registry : 'ok' | 'late' (pas arrivé dans l'attente) | 'arrived' (arrivé ensuite, à ms.registry)). */
function mountTiming() {
  const T = S?.mtime;
  if (!T || T.result == null) return;
  S.ctx.data.put(MOUNT_TIMING, {
    schema: 1,
    at: T.at,
    ms: {
      mount: T.mount ?? null,
      flight: T.flight ?? null,
      choice: T.choice ?? null,
      result: T.result,
      registry: T.registryMs ?? null
    },
    registry: T.registry
  })?.catch?.(() => {});
}

/** La ligne d'attente au-dessus du pas : le vol courant pas encore lu (les commandes attendent), ou lu en retard (vol vide, lien
 *  vers la synchronisation) ; masquée sinon. */
function waitLine() {
  const p = S?.ctx && S.body?.parentElement?.querySelector(':scope > [data-wait]');
  if (!p) return;
  const kind = S.flightPending ? 'wait' : S.flightLate ? 'late' : '';
  p.hidden = !kind;
  p.innerHTML = kind === 'wait' ? esc(tt(TX.waitFlight)) : kind === 'late' ?
    `${esc(tt(TX.lateFlight))} <a href="#settings">${esc(tt(TX.syncLink))}</a>` : '';
}

// ---------------------------------------------------------------- « Envoyer ce vol à mes appareils » (SOG-0279)
/** Le vol en cours est-il retenu sur l'appareil (écrit, pas encore envoyé) ? D'après le dernier état de la couche (queue[].held). */
const flightHeld = () => (S?.fdStatus?.queue || []).some(q => q?.held && q.path === pilotPath('current_flight.json'));
/** La ligne du geste, dans le résumé : le vol retenu (le dire, et le bouton), en cours d'envoi, ou parti (« envoyé à 17:52 ») ;
 *  masquée sans couche qui envoie (pas de sendNow) ou sans vol retenu ni envoi de la séance. */
function sendDraw() {
  const box = S?.body?.querySelector('[data-send]');
  if (!box) return;
  const can = typeof S.ctx.data.sendNow === 'function',
    held = can && flightHeld(),
    html = S.sending ? `<button type="button" data-do="sendflight" disabled>${esc(tt(TX.sending))}</button>` : held ?
    `<p class="f-muted" data-sendsays>${esc(tt(TX.sendHeld))}</p><button type="button" data-do="sendflight">${esc(tt(TX.sendBtn))}</button>` :
    S.sentAt ? `<p class="f-muted" data-sent>${esc(tt(TX.sentAt, { t: S.sentAt }))}</p>` : '';
  box.hidden = !html;
  if (box.__html !== html) box.innerHTML = box.__html = html;
}
/** Le geste : le vol part maintenant par l'ADAPTATEUR du module (ctx.data.sendNow, V3 Frame 03a8c1813 : borné aux écritures déclarées,
 *  jamais window.FrameData) ; « envoyé » seulement s'il est parti (pushed) et n'est plus retenu ; sinon la raison dite : hors ligne, pas
 *  de dépôt sur l'appareil (transport local : rien ne part), ou l'échec, jamais en silence. */
async function sendFlight() {
  const D = S.ctx.data,
    s = S;
  if (typeof D.sendNow !== 'function' || s.sending) return;
  s.sending = true;
  sendDraw();
  let r = null;
  try {
    r = await D.sendNow(pilotPath('current_flight.json'));
    s.fdStatus = await D.status?.() || s.fdStatus;
  } catch {
    r = null;
  }
  if (S !== s) return;
  s.sending = false;
  if (r?.ok === true && +r.pushed > 0 && !flightHeld()) s.sentAt = new Date().toLocaleTimeString(s.ctx.lang?.() || 'fr', {
    hour: '2-digit',
    minute: '2-digit'
  });
  else s.ctx.notify(tt(r?.error === 'offline' ? TX.sendOffline : r?.ok === true ? TX.sendLocal : TX.sendFail), 'warn');
  sendDraw();
}

// ---------------------------------------------------------------- l'ATIS des réseaux du vol (SOG-0090, second lot)
/** Les deux flux publics que la suite lit déjà (la couche ATC de la Carte, le plan de vol du compte rendu) : aucun hôte neuf. */
const ATIS_FEEDS = {
  ivao: 'https://api.ivao.aero/v2/tracker/whazzup',
  vatsim: 'https://data.vatsim.net/v3/vatsim-data.json'
};
/** Une lecture de moins de cinq minutes sert telle quelle (l'étape rouverte) ; « Lire la météo » la refait. */
const ATIS_FRESH_MS = 5 * 60e3;
/** Les réseaux du vol (SOG-0090, Q-0038 : « ceux de la compagnie du vol ») : ceux que la compagnie courante — celle du vol, que
 *  themesLoad y écrit à chaque montage et changement de compagnie (SOG-0041) —
 *  déclare (settings.networks, ivao / vatsim vrais ; « offline » seul : aucun) et pour lesquels le pilote a son identifiant. */
async function flightNetworks(s = S) {
  const a = await Promise.resolve().then(() => window.FrameData?.airline?.()).catch(() => null);
  // SOG-0317 : Carburant a pu être quitté pendant la lecture (S nul) : rien n'est lu de l'état d'après
  if (gone(s)) return [];
  const
    n = a?.settings?.networks || a?.networks ||
    {}, // FrameData.airline() : { settings: { networks } } (le fichier de la compagnie, non fiable : === true seulement)
    id = s.ctx.identity || {};
  return ['ivao', 'vatsim'].filter(k => n[k] === true && String(id[k] || '').trim());
}
/** Un flux public par ctx.net, réduit à ce qui porte une ATIS (indicatif, lettre, heure, lignes) : ni nom ni identifiant de personne
 *  n'est gardé ; null hors ligne ou en erreur. */
async function atisFeed(url, net, s = S) {
  try {
    if (gone(s)) return null; // SOG-0317 : jamais une lecture lancée pour un Carburant quitté
    const r = await s.ctx.net.fetch(url, {
      headers: {
        accept: 'application/json'
      }
    });
    if (!r.ok || r.headers?.get?.('x-sog-offline') || r.headers?.get?.('x-sog-unreachable')) return null;
    const j = await r.json();
    return net === 'vatsim' ? {
      atis: (Array.isArray(j?.atis) ? j.atis : []).map(a => ({
        callsign: a?.callsign,
        atis_code: a?.atis_code,
        last_updated: a?.last_updated,
        text_atis: a?.text_atis
      }))
    } : {
      clients: {
        atcs: (Array.isArray(j?.clients?.atcs) ? j.clients.atcs : []).filter(a => a?.atis).map(a => ({
          callsign: a.callsign,
          atis: a.atis
        }))
      }
    };
  } catch {
    return null;
  }
}
/** Lit l'ATIS des réseaux du vol (à l'ouverture de l'étape des procédures, sur « Lire la météo » ; jamais en minuterie), puis redessine
 *  les procédures. Sans réseau du vol : rien n'est demandé. */
/** SOG-0325 (contrat de l'ergonome, 13/11 à 23 h 00) : les données d'arrivée gardées dans le vol (arr_info) — l'altitude du terrain
 *  (la base), chaque QNH connu avec sa source et son heure (l'ATIS d'abord, puis le METAR), l'ATIS en ligne (lettre, piste, QNH, vent,
 *  heure ; jamais son texte), `atis: null` quand rien n'est en ligne. Écrites SEULEMENT sur un geste (« Lire la météo des terrains »,
 *  « Démarrer », « Relire »), jamais sur une minuterie ni à chaque METAR relu (SOG-0209 : un commit par écriture), et seulement quand
 *  elles changent ; entre deux gestes l'écran peut montrer plus frais, l'heure de chaque valeur dite. Lues par CF.arrInfoOf. */
async function arrInfoKeep() {
  const s = S,
    icao = String(S?.flight?.route?.arr || '').toUpperCase();
  if (!s || gone(s) || s.flightPending || !isIcao(icao)) return;
  const [ads, rws] = await Promise.all([Promise.resolve().then(() => s.ctx.aerodb?.aerodromes?.({
    icao
  })).catch(() => null), Promise.resolve().then(() => s.ctx.aerodb?.runways?.(icao)).catch(() => null)]);
  if (gone(s) || S !== s || String(s.flight.route?.arr || '').toUpperCase() !== icao) return;
  const e = +ads?.[0]?.elev,
    elev = Number.isFinite(e) && e > -1500 && e < 30000 ? Math.round(e) : null,
    nets = s.atis?.nets || [],
    known = (Array.isArray(rws) ? rws : []).map(r => r?.id).filter(Boolean),
    infos = nets.map(n => ATIS.atisInfo(n, s.atis.feeds?.[n], icao, 'arr')).filter(Boolean),
    st = WX.station(s.wx?.metar?.[icao], null),
    mq = Number.isFinite(+st?.qnh) && +st.qnh >= 850 && +st.qnh <= 1090 ? Math.round(+st.qnh) : null,
    obs = +s.wx?.metar?.[icao]?.obsTime,
    qnh = [];
  for (const i of infos)
    if (Number.isInteger(i.qnh) && !qnh.some(q => q.hpa === i.qnh)) qnh.push({
      hpa: i.qnh,
      src: 'atis',
      net: i.net,
      letter: i.letter || '',
      at: i.when
    });
  if (mq != null && !qnh.some(q => q.hpa === mq)) qnh.push({
    hpa: mq,
    src: 'metar',
    at: Number.isFinite(obs) && obs > 0 ? new Date(obs * 1000).toISOString() : null
  });
  const i = infos[0] || null,
    side = i ? ATIS.atisSide(i.net, s.atis.feeds?.[i.net], icao, 'arr', known) : null,
    next = {
      icao,
      elev_ft: elev,
      elev_src: elev === null ? null : 'base',
      qnh,
      atis: i ? {
        net: i.net,
        letter: i.letter || '',
        rwy: side?.rwys?.length === 1 ? side.rwys[0] : null,
        qnh: Number.isInteger(i.qnh) ? i.qnh : null,
        wind: i.wind || null,
        at: i.when
      } : null
    },
    cur = s.flight.arr_info;
  if (cur && JSON.stringify({
      ...cur,
      updated_at: undefined
    }) === JSON.stringify(next)) return; // rien de changé : rien d'écrit
  s.flight.arr_info = {
    ...next,
    updated_at: new Date().toISOString()
  };
  saveFlight();
}
async function atisRead(force = false) {
  const s = S;
  if (!s?.ctx?.net?.fetch || s.atisBusy || (!force && s.atis && Date.now() - s.atis.at < ATIS_FRESH_MS)) return;
  s.atisBusy = true;
  try {
    // SOG-0317 : chaque étape relit l'état qu'elle a reçu ; Carburant quitté entre-temps, la lecture s'ignore
    const nets = await flightNetworks(s),
      feeds = {};
    if (gone(s)) return;
    await Promise.all(nets.map(async n => {
      feeds[n] = await atisFeed(ATIS_FEEDS[n], n, s);
    }));
    if (S !== s) return;
    s.atis = {
      nets: nets.filter(n => feeds[n]),
      feeds,
      at: Date.now()
    };
    s.P?.render?.();
  } finally {
    s.atisBusy = false;
  }
}

// ---------------------------------------------------------------- un direct sur instruction du contrôle (SOG-0088)
// Le calcul est dans direct.js (pur) ; ici l'ancre (où part le direct), le panneau avant d'écrire, l'écriture, « Annuler le direct » et
// la trace pour le compte rendu (route.directs). L'adresse de la Carte : #fuel?direct=<ID>[&lat=&lon=] (contrat donné à BUGS SOG).
/** D'où part le direct (réponse (c) de l'ergonome) : la position réelle de moins de deux minutes, sinon la position prévue, sinon le
 *  dernier point passé selon le plan (le départ sans horaire). */
function directAnchor() {
  const f = S.flight,
    a = f.progress?.actual,
    t = Date.parse(a?.at || '');
  if (a && Number.isFinite(+a.lat) && Number.isFinite(+a.lon) && Number.isFinite(t) && Date.now() - t < 120e3) return {
    kind: 'actual',
    lat: +a.lat,
    lon: +a.lon,
    at: a.at
  };
  const p = CF.plannedPositionAt(f, Date.now());
  if (p && p.phase !== 'taxi' && p.phase !== 'arrived' && Number.isFinite(p.lat)) return {
    kind: 'planned',
    lat: p.lat,
    lon: p.lon
  };
  const pts = f.route?.points || [],
    i = p?.phase === 'arrived' ? Math.max(0, pts.length - 2) : 0;
  return {
    kind: 'passed',
    index: i,
    id: String(pts[i]?.id || '')
  };
}
/** Prépare le direct vers `id` (le champ, ou l'adresse avec la position de la Carte) : le plan de direct.js, montré dans le panneau ;
 *  rien n'est écrit. Un point hors de la route restante est cherché dans la base (ou pris à la position donnée par la Carte). */
async function directPrepare(id, given = null, resume = null) {
  const s = S,
    name = String(id || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,11}$/.test(name) || !s.flight.started?.at) return;
  const r = s.flight.route || {},
    anchor = s.direct?.to === name && resume != null ? s.direct.anchor : directAnchor();
  let target = s.direct?.to === name && s.direct.target ? s.direct.target : {
      id: name
    },
    plan = DIR.planDirect(r, anchor, target, {
      resume,
      coord: RT.icaoCoord
    });
  if (!plan.ok && plan.why === 'unknown') {
    const c = given && Number.isFinite(given.lat) && Number.isFinite(given.lon) ? given : s.ctx.aerodb ? await xpBase(s.ctx.aerodb)
      .coords(name)
      .catch(
        () => null) : null;
    if (S !== s) return;
    if (c && Number.isFinite(+c.lat) && Number.isFinite(+c.lon) && Math.abs(+c.lat) <= 90 && Math.abs(+c.lon) <= 180) {
      target = {
        id: name,
        lat: +c.lat,
        lon: +c.lon
      };
      plan = DIR.planDirect(r, anchor, target, {
        resume,
        coord: RT.icaoCoord
      });
    }
  }
  s.direct = {
    to: name,
    target,
    anchor,
    plan
  };
  directDraw();
}
/** La ligne du panneau : d'où, ce qui est sauté, et l'écart estimé (distance, temps et carburant au prorata du devis). */
function directLine(d) {
  const p = d.plan,
    ids = p.skipped.map(x => x.name || x.id),
    dnm = p.nmAfter - p.nmBefore,
    C = S.C || {},
    perNm = (v) => +C.nm > 0 && Number.isFinite(+v) ? +v / +C.nm : 0,
    sign = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}`,
    from = d.anchor.kind === 'actual' ? tt(TX.directFromActual, {
      t: hhmmOf(d.anchor.at)
    }) : d.anchor.kind === 'planned' ? tt(TX.directFromPlanned) : tt(TX.directFromPassed, {
      id: d.anchor.id || '?'
    }),
    unit = S.C?.sheet?.unit || 'kg';
  return tt(TX.directLine, {
    to: d.to,
    from,
    skipped: ids.length ? tt(pl(ids.length, TX.directSkipped1, TX.directSkipped), {
      list: ids.join(', ')
    }) : tt(TX.directSkipped0),
    dnm: `${sign(dnm)}${distTxt(Math.abs(dnm))}`,
    dmin: `${sign(dnm)}${Math.round(Math.abs(dnm) * perNm(C.q?.minutes))} min`,
    dfuel: `${sign(dnm)}${fuelTxt(Math.abs(dnm) * perNm(C.q?.trip), unit)}`
  });
}
/** La carte du direct (étape Départ, vol démarré seulement) : le champ, puis le panneau du direct préparé, ou « Annuler le direct »
 *  tant que la route n'a pas changé depuis. */
function directDraw() {
  const ap = S?.body?.querySelector('[data-k="addpt"]');
  if (ap && S.addptAsked && !ap.value) ap.value = S.addptAsked; // le nom demandé par la Carte sur un vol non démarré, redessin compris
  const box = S?.body?.querySelector('[data-block="direct"]');
  if (!box) return;
  const f = S.flight,
    started = !!f.started?.at;
  box.hidden = !started;
  if (!started) return;
  const r = f.route || {},
    dl = box.querySelector('#fu-directlist'),
    opts = (r.points || []).slice(1).map(p => `<option value="${esc(p.id || '')}"></option>`).join('');
  if (dl && dl.__html !== opts) dl.innerHTML = dl.__html = opts;
  const inp = box.querySelector('[data-k="direct"]');
  if (inp && S.direct?.to && !inp.value) inp.value = S.direct.to; // le point demandé (l'adresse de la Carte), redessin compris
  const pane = box.querySelector('[data-directpanel]'),
    d = S.direct,
    undo = S.directUndo && S.directUndo.text === String(r.text || '') ? S.directUndo : null;
  let html = '';
  if (d && !d.plan.ok) html = `<p class="f-note" data-kind="err" data-directwhy>${esc(tt({ passed: TX.directWhyPassed, far: TX.directWhyFar, unknown: TX.directWhyUnknown, route: TX.directWhyRoute, anchor: TX.directWhyRoute }[d.plan.why] || TX.directWhyRoute, { id: d.to }))}</p>`;
  else if (d) {
    const p = d.plan,
      locked = p.skipped.filter(x => x.lock),
      holds = p.skipped.filter(x => x.hold > 0),
      pts = r.points || [];
    html = `<p data-directsays>${esc(directLine(d))}</p>${p.off >= 1 ? `<p class="f-note" data-kind="warn" data-directoff>${esc(tt(TX.directOff, { id: d.to, d: distTxt(p.off) }))}</p>` : ''}${locked.map(x => `<p class="f-note" data-kind="err" data-directlock>${esc(tt(TX.directLock, { id: x.lock }))}</p>`).join('')}${holds.map(x => `<p class="f-muted" data-directhold>${esc(tt(TX.directHold, { id: x.name || x.id, n: x.hold }))}</p>`).join('')}${p.choices.length ? `<label class="f-field">${esc(tt(TX.directResume))}<select data-k="directresume">${p.choices.map(k => `<option value="${k}"${k === p.resume ? ' selected' : ''}>${esc(pts[k]?.id || '?')}</option>`).join('')}</select></label>` : ''}<div class="f-row"><button type="button" class="primary" data-do="directapply">${esc(tt(TX.directApply))}</button><button type="button" data-do="directcancel">${esc(tt(TX.directCancel))}</button></div>`;
  } else if (undo) html = `<p class="f-muted" data-directdone>${esc(tt(TX.directDone, { to: undo.to }))}</p><div class="f-row"><button type="button" data-do="directundo">${esc(tt(TX.directUndo))}</button></div>`;
  if (pane && pane.__html !== html) pane.innerHTML = pane.__html = html;
}
/** Applique le direct préparé : un point imposé sauté demande une seconde confirmation (réponse (a)) ; la route, ses temps sur zone et
 *  ses verrous réécrits ; la trace pour le compte rendu (route.directs : l'heure, le point, ce qui est sauté, les points imposés non
 *  survolés) ; « Annuler le direct » gardé tant que rien d'autre ne change. */
async function directApply() {
  const s = S,
    d = s.direct;
  if (!d?.plan?.ok) return;
  const locked = d.plan.skipped.filter(x => x.lock);
  if (locked.length && !(await s.ctx.ask(tt(TX.directAskLock, {
      list: locked.map(x => x.lock).join(', ')
    }), {
      ok: tt(TX.directApply)
    }))) return;
  if (S !== s || s.direct !== d) return;
  const r = s.flight.route ||= emptyFlight().route,
    before = JSON.parse(JSON.stringify({
      text: r.text ?? '',
      points: r.points ?? [],
      holds: r.holds ?? null,
      locks: r.locks ?? null,
      directs: r.directs ?? null
    }));
  r.locks = d.plan.locksLeft;
  r.holds = d.plan.holdsLeft;
  r.points = markLocks(r, d.plan.points);
  r.directs = [...(Array.isArray(r.directs) ? r.directs : []).slice(-19), {
    at: new Date().toISOString(),
    to: d.to,
    from: d.anchor.kind,
    skipped: d.plan.skipped.map(x => x.id),
    notOverflown: locked.map(x => x.lock)
  }];
  s.direct = null;
  routeEdited();
  s.directUndo = {
    before,
    to: d.to,
    text: String(r.text || '')
  };
  directDraw();
}
/** « Annuler le direct » : la route d'avant, tant que rien d'autre n'a changé depuis (le texte est le même qu'après le direct). */
function directUndo() {
  const u = S.directUndo,
    r = S.flight.route;
  if (!u || !r || String(r.text || '') !== u.text) return;
  for (const k of ['text', 'points', 'holds', 'locks', 'directs'])
    if (u.before[k] === null) delete r[k];
    else r[k] = u.before[k];
  S.directUndo = null;
  const ta = S.body?.querySelector('[data-k="rtext"]');
  if (ta) ta.value = r.text;
  routeDerived(r);
  renderPts();
  saveFlight();
  refresh();
  scheduleWx();
  directDraw();
}
/** L'adresse de la Carte (#fuel?direct=<ID>[&lat=&lon=]) : un vol démarré ouvre l'étape Départ sur le panneau ; sinon l'étape Route,
 *  le nom dans « Ajouter un point », et la ligne le dit. */
function directAsked(q) {
  const id = String(q?.direct || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,11}$/.test(id)) return;
  const lat = q.lat != null && q.lat !== '' ? +q.lat : NaN,
    lon = q.lon != null && q.lon !== '' ? +q.lon : NaN,
    given = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? {
      lat,
      lon
    } : null;
  if (!S.flight.started?.at) {
    S.addptAsked = id; // gardé jusqu'à l'ajout d'un point (directDraw le remet après un redessin)
    goStep(1);
    directDraw();
    return S.ctx.notify(tt(TX.directNotStarted, {
      id
    }), 'warn');
  }
  goStep(4);
  const inp = S.body?.querySelector('[data-k="direct"]');
  if (inp) inp.value = id;
  directPrepare(id, given);
}

/** Lecture qui attend le réseau, bornée : null au-delà de ms (late() appelé), la valeur sinon. */
function bounded(job, ms, late) {
  return Promise.race([job, new Promise(res => setTimeout(() => {
    late?.();
    res(null);
  }, ms))]);
}

/** Le vol courant d'un appareil neuf : lu dès qu'il arrive, au plus tard après FLIGHT_WAIT_MS (vol vide, dit) ; l'écran devient
 *  utilisable à ce moment-là, sans attendre le registre d'aerodb ni les fiches. */
async function flightArrives(self, job) {
  let late = false;
  const kept = await bounded(job, FLIGHT_WAIT_MS, () => late = true);
  if (gone(self) || !S.flightPending) return;
  if (!S.flightSeen) {
    S.flight = flightOf(kept);
    S.base = CF.routeBase(kept);
    rwyTextSync(); // SOG-0089 : le vol arrivé tard, refait avant son dessin
  }
  flightDefaults(kept || {});
  S.flightPending = false;
  mtMark('flight'); // SOG-0400 : le vol courant lu (ou l'attente finie)
  S.flightLate = late && !S.flightSeen;
  if (S.view === 'plan') renderPlan();
  waitLine();
  flightReady();
}

/** Seconde moitié du montage, après le premier dessin : registre d'aerodb et fiches, puis le vol courant et les
 *  réglages s'ils n'avaient jamais été lus sur cet appareil (attente du réseau, bornée : FLIGHT_WAIT_MS) ; l'écran se complète
 *  sans bouger. */
async function completeMount(self) {
  const ctx = self.ctx,
    // read avec wait : un fichier jamais lu attend le réseau (get rendrait null tout de suite sur un appareil neuf)
    get = path => Promise.resolve().then(() => ctx.data.read(path, {
      wait: true
    })).then(r => r?.value ?? null).catch(() => null);
  if (self.flightPending) flightArrives(self, get(pilotPath('current_flight.json')));
  const aJob = ctx.aerodb?.aircraft ? ctx.aerodb.aircraft().catch(() => null) : null,
    [A, fs1] = await Promise.all([aJob ? bounded(aJob, REFS_WAIT_MS, () => self.mtime && (self.mtime.registry = 'late')) : null,
      self.settingsPending ? bounded(get(pilotPath('fuel.json')), FLIGHT_WAIT_MS) : null
    ]);
  if (gone(self)) return;
  S.A = A;
  // SOG-0400 : le registre arrivé après son attente — relu, les fiches aussi, l'écran redessiné (comme un changement d'aerodb)
  if (!A && aJob) aJob.then(async a => {
    if (gone(self) || !a || S.A) return;
    S.A = a;
    self.mtime.registry = 'arrived';
    self.mtime.registryMs = Math.round(performance.now() - self.mtime.t0);
    await readSheets();
    if (gone(self)) return;
    mountTiming();
    if (S.view === 'sheets') keepScroll(S.body, renderSheets);
    else if (S.view === 'plan') refresh();
  });
  // logique des fiches d'aerodb : types, fiches et flotte réglés par aerodb ; ici la fiche active, la langue, les textes
  SH()?.configure({
    profiles: () => Object.fromEntries(S.sheets.map(p => [p.id, p])),
    active: () => S.C?.sheet || null,
    lang: () => ctx.lang(),
    t: row => ctx.t(row),
    tf: (row, vals) => ctx.t(row, vals)
  });
  await readSheets();
  if (gone(self)) return;
  if (S.settingsPending) {
    // fuel.json arrivé après le premier dessin (appareil neuf) : le devis en prend ses réglages ; l'affichage du document de l'appareil
    // l'emporte, et la copie depuis fuel.json se fait s'il n'y en a pas encore
    S.settings = {
      ...S.settings,
      ...(fs1 ? settingsFrom(fs1, S.display0) : {}),
      ...displayOf(S.display0)
    };
    S.settingsPending = false;
  }
  S.refsPending = false;
  mtMark('choice'); // SOG-0400 : registre et fiches posés (ou leur attente finie) : l'aéronef choisi s'applique
  themesLoad(); // les thèmes de la compagnie, pour l'étape Vol (SOG-0202 T2)
  if (S.step === 1) atisRead(); // SOG-0090 : l'écran rouvert sur l'étape des procédures lit l'ATIS une fois
  if (S.directAsk) { // SOG-0088 : le direct demandé par l'adresse de la Carte, une fois le vol lu
    const q = S.directAsk;
    S.directAsk = null;
    directAsked(q);
  }
  if (S.view === 'plan') renderPlan();
  else keepScroll(S.body, renderSheets);
  // le vol encore attendu (flightArrives) : il reprendra le vol à son arrivée ; sinon la reprise, devis compris
  if (!S.flightPending) resumeFlight();
  natAuto(self); // SOG-0413 : la règle d'âge des routes NAT, à l'ouverture
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops) try {
    f?.();
  } catch {
    /* déjà arrêté */
  }
  // une série de choix de procédures en attente est écrite ; une lecture en cours n'est pas abandonnée : le travail du poste continue
  // et sa fin est dite (procedures.js)
  S.P.stop();
  // SOG-0470 : la ligne montrée en attente d'écriture est écrite avant de partir (le document garde la ligne ouverte)
  if (S.altsTimer) {
    clearTimeout(S.altsTimer);
    S.altsTimer = null;
    altsSend(true);
  }
  window.removeEventListener('maps-route-alt-show', S.onAltPick);
  window.removeEventListener('maps-altn-pick', S.onAltnPick);
  window.removeEventListener('maps-route-alts-drawn', S.onAltsDrawn);
  clearInterval(S.rbusyTimer);
  window.removeEventListener('frame-airline', S.onCoThemes);
  clearTimeout(S.routeTimer);
  clearTimeout(S.roTimer);
  clearTimeout(S.wxTimer);
  clearTimeout(S.wxAutoTimer);
  autoStop(); // SOG-0529 : le travail route/levels en cours est annulé
  S.body = null;
  S = null;
}

// ---------------------------------------------------------------- thème et sous-thème du vol (SOG-0202 T2, § 10.48)
// L'utilisateur, 10 nov. : « À quel moment je décide de faire une mission fret, passagers, essais en vol… ? » — à l'étape Vol, facultatif,
// rempli par la mission ; le compte rendu les reprend et peut les changer (il a le dernier mot). Les listes : les thèmes de la compagnie
// (data/airline/<code>/themes.json écrit par Réglages, sinon ceux de son genre), le thème du vol toujours gardé.
/** Les thèmes de la compagnie courante, lus une fois par montage et à chaque changement de compagnie. */
async function themesLoad() {
  const s = S;
  let a = null,
    doc = null;
  try {
    a = await window.FrameData?.airline?.();
    doc = a?.root ? await s.ctx.data.get(`${a.root}themes.json`).catch(() => null) : null;
  } catch {
    doc = null;
  }
  if (gone(s)) return;
  s.themeDoc = doc;
  s.themeKind = kindOf(a);
  // SOG-0041 : le vol est de la compagnie où il est préparé (le compte rendu en propose les familles) ; en mémoire, il part avec la
  // prochaine écriture
  const code = typeof a?.code === 'string' && /^[a-z0-9]{2,8}$/.test(a.code) ? a.code : '';
  if (code && s.flight && !s.flightPending) s.flight.airline = code;
  themesDraw();
}
/** Les deux listes de l'étape Vol. */
function themesDraw() {
  const box = S?.body?.querySelector('[data-themes]');
  if (!box) return;
  const f = S.flight,
    lang = S.ctx.lang(),
    i = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang)),
    list = MT.forAirline(S.themeDoc, S.themeKind, f.theme),
    th = list.find(t => t.id === f.theme),
    name = t => {
      const x = MT.themes(lang).find(y => y.id === t.id);
      return x ? x.label : `${t.short} · ${t.labels[i] || t.labels[0]}`;
    },
    none = `<option value="">${esc(tt(TX.themeNone))}</option>`;
  box.innerHTML = `<label class="f-field">${esc(tt(TX.theme))}<select data-k="theme">${none}${list.map(t => `<option value="${esc(t.id)}"${t.id === f.theme ? ' selected' : ''}>${esc(name(t))}</option>`).join('')}</select></label>
    <label class="f-field">${esc(tt(TX.series))}<select data-k="series"${th?.series.length ? '' : ' disabled'}>${none}${(th?.series || []).map(x => `<option value="${esc(x.value)}"${x.value === f.series ? ' selected' : ''}>${esc(x.labels[i] || x.labels[0])}</option>`).join('')}</select></label>`;
}
/** Un thème ou un sous-thème choisi : écrit avec le vol (un autre thème vide le sous-thème). */
function themeSet(k, v) {
  const f = S.flight,
    val = String(v || '');
  if (k === 'theme') {
    if (val === (f.theme || '')) return;
    f.theme = MT.themeOf(val)?.id || (MT.THEME_ID.test(val) ? val : '');
    f.series = '';
  } else {
    if (val === (f.series || '')) return;
    f.series = MT.SERIES_ID.test(val) ? val : '';
  }
  themesDraw();
  saveFlight();
}

// ---------------------------------------------------------------- carburant de dégagement (SOG-0225, règle validée le 10 nov. ; SOG-0399)
// Trois parts (SOG-0399 : le dégagement était sous-estimé) : (1) la REMISE DES GAZ à la destination, un forfait en minutes au débit de
// montée ; (2) le TRAJET, le trait droit (loxodromie, la règle d'un direct) arrivée → dégagement (positions aerodb) : la fiche a
// alternate.fuelFlowPerHour et alternate.tasKt : temps = distance / (TAS + composante du vent sur l'axe), carburant = temps × ce débit
// (« moyenne de la fiche ») ; sinon le modèle de l'étape sur cette distance (« montée, croisière, descente calculées ») au niveau
// min(croisière, plafond, distance × 100 ft au FL semi-circulaire du cap, FL050 au moins) ; (3) l'APPROCHE au dégagement, un forfait en
// minutes au débit d'attente (celui de la réserve finale du modèle). Les forfaits : alternate.goAroundMin et alternate.approachMin de la
// fiche, sinon ALTN_GOAROUND_MIN et ALTN_APPROACH_MIN, dits « forfait ». Sans roulage, contingence ni réserve (la réserve finale reste
// à part). Vent : le dernier lu de la route (le profil prévu près de l'arrivée, au niveau du dégagement),
// sinon le vent du vol, sinon nul et dit « vent inconnu ». Bloc = roulage + étape + contingence + DÉGAGEMENT + réserve finale. Sans
// terrain : dit, rien ajouté ; sans position : dit, non compté. Jamais le silence.
/** SOG-0399 : les forfaits par défaut (minutes), en attendant les valeurs de Q-0076 — la remise des gaz à la destination et l'approche au
 *  dégagement. */
const ALTN_GOAROUND_MIN = 5,
  ALTN_APPROACH_MIN = 10;
/** SOG-0399 : un forfait du dégagement (minutes) — celui de la fiche (`alternate[k]`, nombre de 0 à 60) sinon `dflt` ; { min, src }. */
function altnFlatOf(sheet, k, dflt) {
  const v = sheet?.alternate?.[k],
    n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 60 ? {
    min: n,
    src: 'sheet'
  } : {
    min: dflt,
    src: 'default'
  };
}
/** Les positions de l'arrivée et du dégagement, lues une fois par couple (aerodb), puis le devis redessiné. */
function altnGeo(r) {
  const key = `${r.arr || ''}>${r.altn || ''}`,
    g = S.altnGeo;
  if (g?.key === key) return g;
  const s = S,
    last = (r.points || []).at(-1),
    arrHere = last && last.id === r.arr && Number.isFinite(+last.lat) && Number.isFinite(+last.lon) ? {
      lat: +last.lat,
      lon: +last.lon
    } : null,
    ok = c => c && Number.isFinite(+c.lat) && Number.isFinite(+c.lon) ? {
      lat: +c.lat,
      lon: +c.lon
    } : null,
    at = id => id && S.ctx.aerodb?.coords ? Promise.resolve(S.ctx.aerodb.coords(id)).then(ok, () => null) : Promise.resolve(null);
  S.altnGeo = {
    key,
    state: 'pending'
  };
  Promise.all([arrHere || at(r.arr), at(r.altn)]).then(([arr, alt]) => {
    if (gone(s) || S.altnGeo?.key !== key) return;
    S.altnGeo = arr && alt ? {
      key,
      state: 'ok',
      arr,
      alt
    } : {
      key,
      state: 'unknown'
    };
    refresh();
  });
  return S.altnGeo;
}
/** SOG-0398 lot 2 : le coût d'un dégagement de `from` (l'arrivée) à `to` (un terrain) — la même arithmétique pour le dégagement du vol
 *  (altnAdd) et pour chaque terrain proposé (altnProposeRun) : { nm, fl, src, wind, legMin, legFuel, ga, ap, min, fuel } (min et fuel :
 *  remise des gaz, trajet et approche), null quand le carburant n'est pas connu. q : le devis de l'étape (ses débits de montée, de
 *  croisière), qIn : ses entrées, sheet : la fiche, cruiseFt : le niveau de croisière. */
function altnCost(from, to, q, qIn, sheet, cruiseFt) {
  const M = window.FuelModel,
    // SOG-0399 : le trait droit (loxodromie), la règle d'un direct
    nm = rhumbNm(from, to),
    brg = rhumbCourse(from, to),
    // le niveau : distance × 100 ft, au FL semi-circulaire du cap (impair vers l'est, pair vers l'ouest), FL050 au moins, sous la croisière et le plafond
    fl = (() => {
      let k = Math.max(5, Math.round(nm / 10));
      if ((brg < 180) !== (k % 2 === 1)) k += 1;
      const ceil = +sheet?.cruise?.ceilingFt > 0 ? +sheet.cruise.ceilingFt : Infinity;
      return Math.max(1000, Math.min(k * 1000, +cruiseFt > 0 ? +cruiseFt : Infinity, ceil));
    })(),
    // le vent : le profil prévu le plus près de l'arrivée, au niveau du dégagement ; sinon celui du vol ; sinon nul (dit)
    A = S.aloft,
    aloftOk = S.flight.weather?.real && S.flight.windSource?.kind === 'aloft' && A?.profiles?.length && A.key === aloftKey(),
    w0 = aloftOk ? WD.atLevel(A.profiles.at(-1), fl) : null,
    fw = S.flight.wind,
    wind = Number.isFinite(+w0?.dirDeg) && Number.isFinite(+w0?.speedKt) ? w0 : Number.isFinite(+fw?.dirDeg) && Number.isFinite(+fw
      ?.speedKt) ? fw : null,
    ff = +sheet?.alternate?.fuelFlowPerHour,
    tas = +sheet?.alternate?.tasKt;
  let fuel = null,
    min = null,
    src = 'sheet';
  if (ff > 0 && tas > 0) {
    const wc = wind ? M.windComponent(brg, +wind.dirDeg, +wind.speedKt) : 0;
    min = nm / Math.max(80, tas + wc) * 60;
    fuel = min / 60 * ff;
  } else {
    src = 'model';
    const aq = M.quote({
      ...qIn,
      distanceNm: nm,
      levelFt: fl,
      trackDeg: brg,
      wind: wind ? {
        dirDeg: +wind.dirDeg,
        speedKt: +wind.speedKt
      } : {
        dirDeg: 0,
        speedKt: 0
      },
      taxiMin: 0,
      reserveMin: 0,
      contingencyPct: 0,
      steps: null
    });
    fuel = aq?.hasFuel ? +aq.trip : null;
    min = aq ? +aq.minutes : null;
  }
  if (!(fuel > 0)) return null;
  // SOG-0399 : la remise des gaz au débit de montée du devis, l'approche au débit d'attente (celui de la réserve finale du modèle)
  const cff = +q.cruise?.ff > 0 ? +q.cruise.ff : 0,
    climbFf = +q.climb?.ff > 0 ? +q.climb.ff : cff,
    holdFf = +sheet?.reserveFuelFlowPerHour > 0 ? +sheet.reserveFuelFlowPerHour : cff * .65,
    ga = altnFlatOf(sheet, 'goAroundMin', ALTN_GOAROUND_MIN),
    ap = altnFlatOf(sheet, 'approachMin', ALTN_APPROACH_MIN);
  ga.fuel = ga.min / 60 * climbFf;
  ap.fuel = ap.min / 60 * holdFf;
  return {
    nm,
    fl,
    src,
    wind,
    legMin: min,
    legFuel: fuel,
    ga,
    ap,
    min: min + ga.min + ap.min,
    fuel: fuel + ga.fuel + ap.fuel
  };
}
/** Le dégagement ajouté au devis `q` (q.alternate ; bloc, fourchette comprise) ; `q` rendu tel quel. */
function altnAdd(q, qIn, sheet, cruiseFt) {
  if (!q) return q;
  // SOG-0398 lot 2 : les entrées du devis gardées pour chiffrer les terrains proposés (altnCost)
  S.altnIn = {
    q,
    qIn,
    sheet,
    cruiseFt
  };
  const r = S.flight.route || {},
    id = String(r.altn || '').toUpperCase();
  if (!id) return Object.assign(q, {
    alternate: {
      state: 'none'
    }
  });
  const g = altnGeo(r);
  if (g.state !== 'ok') return Object.assign(q, {
    alternate: {
      state: g.state,
      id
    }
  });
  const c = altnCost(g.arr, g.alt, q, qIn, sheet, cruiseFt);
  if (!c) return Object.assign(q, {
    alternate: {
      state: 'unknown',
      id
    }
  });
  q.alternate = {
    state: 'ok',
    id,
    from: String(r.arr || '').toUpperCase(),
    nm: c.nm,
    fl: c.src === 'model' ? c.fl : null,
    min: c.min,
    fuel: c.fuel,
    src: c.src,
    wind: c.wind ? {
      dirDeg: Math.round(+c.wind.dirDeg),
      speedKt: Math.round(+c.wind.speedKt)
    } : null,
    leg: {
      min: c.legMin,
      fuel: c.legFuel
    },
    goAround: c.ga,
    approach: c.ap
  };
  for (const k of ['block', 'blockLow', 'blockHigh'])
    if (Number.isFinite(+q[k])) q[k] = +q[k] + c.fuel;
  return q;
}
/** La ligne du dégagement au détail du devis : toujours dite (aucun terrain, position inconnue, ou son carburant et d'où il vient). */
function altnRow(q, unit) {
  const a = q?.alternate || {
      state: 'none'
    },
    row = (label, time = '', fuel = '') => `<tr data-altnrow="${esc(a.state)}"><td>${esc(label)}</td><td class="f-num">${time}</td><td></td><td class="f-num">${fuel}</td></tr>`;
  if (a.state === 'none') return row(tt(TX.altnNone));
  if (a.state === 'pending') return row(tt(TX.altnPending, {
    id: a.id
  }));
  if (a.state !== 'ok') return row(tt(TX.altnUnknown, {
    id: a.id
  }));
  // SOG-0399 : ses trois parts (remise des gaz, trajet, approche), puis le total, comme l'étape au-dessus
  const part = (k, label, p) => `<tr data-altnpart="${k}"><td>${esc(label)}</td><td class="f-num">${p?.min != null ? hmm(p.min) : ''}</td><td></td><td class="f-num">${p ? esc(fuelTxt(p.fuel, unit)) : ''}</td></tr>`,
    flat = p => tt(p.src === 'sheet' ? TX.altnFlatSheet : TX.altnFlat);
  return part('goaround', tt(TX.altnGoAround, {
    a: a.from || '—',
    m: Math.round(a.goAround.min),
    k: flat(a.goAround)
  }), a.goAround) + part('leg', tt(TX.altnLeg, {
    a: a.from || '—',
    id: a.id,
    nm: Math.round(a.nm),
    fl: a.fl ? ` · ${flTxt(a.fl)}` : '',
    src: tt(a.src === 'sheet' ? TX.altnSheet : TX.altnModel),
    w: a.wind ? tt(TX.altnWind, {
      d: String(a.wind.dirDeg).padStart(3, '0'),
      s: a.wind.speedKt
    }) : tt(TX.altnNoWind)
  }), a.leg) + part('approach', tt(TX.altnApproach, {
    id: a.id,
    m: Math.round(a.approach.min),
    k: flat(a.approach)
  }), a.approach) + row(tt(TX.altnLine, {
    id: a.id
  }), a.min != null ? hmm(a.min) : '', esc(fuelTxt(a.fuel, unit)));
}

// ---------------------------------------------------------------- aides radio de l'étape Départ (SOG-0200)
// L'utilisateur : « sur l'écran 5 : la liste des VORs qui servent à guider, c'est une option, mais surtout l'ILS choisie. un seul coup
// d'œil, les infos utiles ». En premier l'ILS de l'approche choisie (la ligne de la carte des procédures), dessous, replié, les VOR / DME
// de la route dans l'ordre du vol (indicatif, sorte, fréquence, tronçon où ils servent), lus dans aerodb près de chaque point de la route
// qui porte leur nom (1,5 NM) ; rien d'inventé quand la base ne porte pas l'aide.
const AID_KINDS = /^(VOR|VORDME|VOR-DME|DME|TACAN|VORTAC)$/i;
/** Les VOR / DME de la route, lus une fois par route (une clé : les identifiants et positions des points), puis le bloc redessiné. */
function routeAids() {
  const pts = (S.flight.route?.points || []).filter(p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon)),
    key = pts.map(p => `${p.id}@${(+p.lat).toFixed(3)},${(+p.lon).toFixed(3)}`).join(' ');
  if (S.aidsKey === key) return S.aidsList;
  const s = S;
  S.aidsKey = key;
  S.aidsList = null;
  if (typeof S.ctx.aerodb?.navaids !== 'function' || pts.length < 3) {
    S.aidsList = [];
    return S.aidsList;
  }
  Promise.all(pts.slice(1, -1).map((p, i) => Promise.resolve().then(() => S.ctx.aerodb.navaids({
    lat: +p.lat,
    lon: +p.lon,
    radiusNm: 5
  })).then(list => {
    // le même nom à 1,5 NM au plus du point de la route (un homonyme plus loin n'est pas l'aide de ce point)
    const n = (list || []).find(x => String(x?.id || '').toUpperCase() === String(p.id || '').toUpperCase() && AID_KINDS.test(
        String(x?.kind || '')) &&
      Number.isFinite(+x.lat) && Number.isFinite(+x.lon) && gcNm(p, x) <= 1.5);
    return n && /^\d{3}\.\d{1,3}$/.test(String(n.freq || '')) ? {
      id: String(n.id).toUpperCase().slice(0, 5),
      kind: String(n.kind).toUpperCase().slice(0, 8),
      freq: String(n.freq),
      leg: tt(TX.aidsLeg, {
        a: pts[i].id,
        b: pts[i + 2].id
      })
    } : null;
  }, () => null))).then(list => {
    if (gone(s) || S.aidsKey !== key) return;
    S.aidsList = list.filter(Boolean);
    aidsDraw();
  });
  return null;
}
/** Le bloc « Aides radio » : l'ILS de l'approche choisie d'abord, puis les VOR / DME de la route repliés ; dit quand il n'y a rien. */
function aidsDraw() {
  const box = S?.body?.querySelector('[data-aids]');
  if (!box) return;
  const ils = S.P?.approachAid?.() || '',
    vors = routeAids(),
    list = vors?.length ? `<details class="fu-aidsroute" data-aidsroute><summary>${esc(tt(TX.aidsRoute, { n: vors.length }))}</summary><ul class="fu-aidlist">${vors.map(v => `<li data-aid="${esc(v.id)}"><b>${esc(v.id)}</b> ${esc(v.kind)} ${esc(v.freq)} <span class="f-muted">${esc(v.leg)}</span></li>`).join('')}</ul></details>` : '',
    html = ils || list ? `${ils ? `<p class="fu-aidils" data-aidils><b>${ils}</b></p>` : ''}${list}` : vors === null ? '' : `<p class="f-muted" data-aidsnone>${esc(tt(TX.aidsNone))}</p>`;
  // SOG-0247 (l'utilisateur : « se referme tout seul dès qu'on l'ouvre ») : comparé au dernier HTML écrit ICI, pas à innerHTML (un pli
  // ouvert y ajoute open : chaque redessin le réécrivait, donc le refermait) ; réécrit, il garde son état ouvert
  if (box.__html === html) return;
  const open = !!box.querySelector('[data-aidsroute]')?.open;
  box.__html = html;
  box.innerHTML = open ? html.replace('<details class="fu-aidsroute" data-aidsroute>',
    '<details class="fu-aidsroute" data-aidsroute open>') : html;
}

// ---------------------------------------------------------------- points imposés par la mission (SOG-0193 L3, V3 § 10.47 c)
// L'utilisateur : « le pilote a toute liberté pour faire son propre plan de vol, mais les points de rdv, source, cible, restent imposés
// sur la carte ». Le vol garde route.locks ([{ id : le mot du texte, en coordonnées à la minute ; mid : l'identifiant de la mission ;
// name }], posé par applyMission) ; chaque relecture de la route marque ces points lock: 'mission' dans route.points (la Carte les
// verrouille dans son Édition) ; la liste ne les monte, descend ni retire ; un texte qui en perd un le retrouve à la sortie du champ.
/** Les verrous du vol, bornés (la route est relue de pilot/, écrite par la Carte aussi). */
function locksOf(r) {
  return (Array.isArray(r?.locks) ? r.locks : []).slice(0, 60).filter(l => l && /^\d{4}[NS]\d{5}[EW]$/.test(String(l.id || '')));
}
/** route.points avec lock: 'mission' (et l'identifiant de la mission) sur les points imposés, retiré des autres. */
function markLocks(r, points) {
  const by = new Map(locksOf(r).map(l => [l.id, l]));
  return (points || []).map(p => {
    const l = p && by.get(String(p.id || '').toUpperCase());
    if (!p || typeof p !== 'object') return p;
    const {
      lock,
      mission,
      ...rest
    } = p;
    return l ? {
      ...rest,
      lock: 'mission',
      mission: String(l.mid || '').slice(0, 40)
    } : rest;
  });
}
/** Remet dans le texte de la route les points imposés qu'il a perdus : chacun juste après l'imposé qui le précède (l'ordre de la
 *  mission), sinon après le départ ; rend les identifiants de la mission remis ([] quand rien ne manquait). */
function keepLocks(r) {
  const locks = locksOf(r);
  if (!locks.length) return [];
  const words = String(r.text || '').trim().split(/\s+/).filter(Boolean),
    up = w => w.toUpperCase().replace(/\/.*$/, ''),
    back = [];
  locks.forEach((l, k) => {
    if (words.some(w => up(w) === l.id)) return;
    let at = -1;
    for (let j = k - 1; j >= 0 && at < 0; j--) at = words.findIndex(w => up(w) === locks[j].id);
    if (at < 0) at = words.length && up(words[0]) === String(r.dep || '').toUpperCase() ? 0 : -1;
    words.splice(at + 1, 0, l.id);
    back.push(l.mid || l.id);
  });
  if (back.length) {
    r.text = words.join(' ');
    const ta = S.body?.querySelector('[data-k="rtext"]');
    if (ta) ta.value = r.text;
  }
  return back;
}

// ---------------------------------------------------------------- ce qui est lu de Little Navmap reste sur ce poste (SOG-0210, N2)
// Sécurisation (10/11, N2) : les points d'une procédure lue dans la base de Little Navmap du poste restent sur l'appareil ; le vol n'en
// garde que la référence (l'identifiant choisi : terrain et nom). Les fichiers des simulateurs, eux, les portent (SOG-0238, l'utilisateur
// le 11/11 : « tout ce qui vient de la bdd peut partir vers le simu »).
/** Une fiche lue de Little Navmap (aerodb fetchLnm : status 'lnm', lnm: true). */
const isLnm = rec => !!rec && typeof rec === 'object' && (rec.status === 'lnm' || rec.lnm === true);
/** Les procédures choisies sans les fiches de Little Navmap (mises à null) : ce qui peut donner une position au vol (data/). */
function pubProcs(procs) {
  if (!procs || typeof procs !== 'object') return procs;
  return Object.fromEntries(Object.entries(procs).map(([k, v]) => [k, isLnm(v) ? null : v]));
}

// ---------------------------------------------------------------- un direct au compas (SOG-0243, Q-0019)
/** Les tronçons directs de la route plus longs de 2 % au compas que par le grand cercle : une ligne sous la route (l'utilisateur :
 *  « un avertissement quand un direct au compas dépasse de plus de 2 % le grand cercle (« ajoutez des points intermédiaires ») ») ;
 *  « Calculer A → B » reste le geste qui les pose. Jamais une note flottante. */
function rhumbWarn(r) {
  const box = S?.body?.querySelector('[data-rhumb]');
  if (!box) return;
  const pts = (r?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    lines = [];
  for (let i = 1; i < pts.length; i++) {
    const g = gcNm(pts[i - 1], pts[i]),
      x = rhumbNm(pts[i - 1], pts[i]);
    if (g > 1 && x > g * 1.02) lines.push(tt(TX.rhumbLong, {
      a: String(pts[i - 1].id || '?'),
      b: String(pts[i].id || '?'),
      r: Math.round(x).toLocaleString(S.ctx.lang()),
      g: Math.round(g).toLocaleString(S.ctx.lang()),
      p: Math.round((x / g - 1) * 100)
    }));
  }
  const text = lines.join(' ');
  box.hidden = !text;
  if (box.textContent !== text) box.textContent = text;
}

// ---------------------------------------------------------------- le temps sur zone par point (CONCEPTION 11/11 § 1 bis, § 1 ter)
// L'utilisateur : un champ, oui ; « (fourchette. entre 5 et 40 mn, par ex.) » ; plusieurs zones dès la première version. Le vol garde
// route.holds { mot du point → { min, max, count } } (posé par la mission, modifiable sur tout point) ; le devis compte `count` (le
// maximum d'une fourchette par défaut) et le dit, une ligne par point.
/** Les temps sur zone de la route pour le devis : [{ id, min, max, count, ft }] (le niveau du point, sinon celui du vol). */
function holdsOf(r, levelFt) {
  const H = r?.holds && typeof r.holds === 'object' ? r.holds : {},
    pts = r?.points || [];
  return Object.entries(H).slice(0, 40).map(([id, h]) => {
    const p = pts.find(x => String(x?.id || '').toUpperCase() === id);
    return p && +h?.count > 0 ? {
      id: String(h.name || p.mission || id).slice(0, 40),
      min: +h.min > 0 ? Math.min(600, +h.min) : +h.count,
      max: +h.max > 0 ? Math.min(600, +h.max) : +h.count,
      count: Math.min(600, Math.round(+h.count)),
      ft: +p.alt_ft > 0 ? +p.alt_ft : levelFt
    } : null;
  }).filter(Boolean);
}
/** Pose (ou retire, sans valeur) le temps sur zone compté d'un point ; la fourchette de la mission est gardée. */
function setHold(r, id, minutes) {
  const k = String(id || '').toUpperCase();
  if (!k) return;
  const H = r.holds && typeof r.holds === 'object' ? {
      ...r.holds
    } : {},
    was = H[k] || null,
    n = Number.isFinite(minutes) && minutes > 0 ? Math.min(600, Math.round(minutes)) : 0;
  if (!n) delete H[k];
  else H[k] = {
    min: was?.min ?? n,
    max: was?.max ?? n,
    count: n,
    ...(was?.name ? {
      name: was.name
    } : {})
  };
  r.holds = H;
}
/** Le point a-t-il sa ligne de temps sur zone : un temps (de la mission ou du pilote), ou « ⏱ + » vient d'être touché. */
function holdShown(p) {
  const k = String(p?.id || '').toUpperCase();
  return !!S.flight.route?.holds?.[k] || !!S.holdOpen?.has(k);
}
/** « ⏱ + » d'un point sans temps sur zone : un petit geste sous ses coordonnées, qui ouvre sa ligne (le libellé dit en clair). */
function holdAdd(p, i) {
  const name = p.mission || p.id;
  return `<button type="button" class="fu-linkbtn fu-holdadd" data-do="holdopen" data-i="${i}" data-id="${esc(p.id)}" aria-label="${esc(tt(TX.holdAdd, { id: name }))}" title="${esc(tt(TX.holdAdd, { id: name }))}">⏱ +</button>`;
}
/** La ligne du temps sur zone d'un point, d'un seul tenant : « ⏱ Sur zone [10] min · mission : 5 à 40 » (la fourchette de la mission
 *  quand elle en donne une) ; le champ porte les minutes comptées. */
function holdField(p, i) {
  const h = S.flight.route?.holds?.[String(p.id || '').toUpperCase()],
    name = h?.name || p.mission || p.id,
    range = h && +h.min > 0 && +h.max > 0 && h.min !== h.max ? ` · ${tt(TX.holdMission, { min: h.min, max: h.max })}` : '';
  return `<label class="fu-pthl" data-holdline><span>⏱ ${esc(tt(TX.holdLabel))}</span><input class="fu-pthold" data-k="pthold" data-i="${i}" inputmode="numeric" maxlength="3" value="${+h?.count > 0 ? Math.round(+h.count) : ''}" aria-label="${esc(tt(TX.holdField, { id: name }))}"><span>min${esc(range)}</span></label>`;
}
