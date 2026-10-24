import {
  svg
} from '../../frame/lib/icons.js';
import {
  textFromPoints,
  icaoCoord,
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  merge
} from '../../frame/lib/current_flight.js';
import {
  fmtZ,
  fmtZLocal
} from '../../frame/lib/time.js';

// V3 maps — module Carte de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/maps/SPEC.md,
// INTEGRATION.md, READING.md). La carte de route du vol prévu (pilot/<tri>/current_flight.json écrit par Carburant)
// et son profil vertical, en lecture seule (lots 2 et 3) ; les cartes d'une mission redessinées d'après son YAML
// (missions/<l>_<FAMILLE>/<ID>/mission<ID>.yaml : emprise, profil d'affichage, points, zones, cheminement ; lot 4),
// adresse #maps?mission=<ID>&map=<fichier>.
//   · fond : tuiles OpenFreeMap (MapLibre, chargé au premier affichage, appelle lui-même les hôtes de meta.net) ;
//     sans tuiles (hors ligne, hôte refusé, pas de WebGL), fond uni avec les contours des pays (lib/outlines.js) ;
//   · surcouche aéronautique sur un canvas (render.js, sorti du studio) : espaces du couloir de la route, voies basses ou
//     hautes selon le niveau, aérodromes, balises, MORA, canevas, route avec marques de distance ;
//   · profil vertical sous la carte (profile.js, SiaProfile copié du studio) : relief des tuiles Terrarium ou MORA,
//     espaces traversés, trajectoire de Carburant (profile : TOC, TOD), marques NM ; un curseur commun aux deux vues
//     (doigt sur le profil, ou toucher sur la route), une ligne dit ce qui est dessous ;
//   · données par aerodb (ctx.aerodb), pour l'emprise utile seulement ; vol par ctx.data ; rien n'est écrit.
// Styles limités au module ([data-module="maps"]) : primitives f-… et jetons --sog-… du cadre ; le canvas prend les
// jetons de dessin (MapsRender.tokens / themed), relus et redessinés quand le design, le ton ou le thème du système
// changent ; la nuit, fond de carte sombre (OpenFreeMap dark).
export const meta = {
  id: 'maps',
  apps: ['pilot'],
  level: 1,
  // vue fixe (frame/INTEGRATION.md § 9.2) : ni défilement de page ni en-tête collant sur une page qui défile ; la racine du
  // module est une colonne pleine hauteur (barre d'outils, carte, bloc de données en feuille à trois hauteurs)
  fixed: true,
  // missions/ : lu à la demande seulement (dossiers lourds : PNG, versions, reçus), jamais tiré d'avance
  // airline/map_profiles.json : profils d'affichage des six modes, affinés par la compagnie (SPEC.md, « Profils des modes »)
  reads: ['pilot/', {
    prefix: 'missions/',
    policy: 'reference'
  }, 'cache/maps/', 'airline/'],
  // mode et couches de la carte (propres à l'appareil, jamais synchronisés) ; vol courant modifié sur la carte (lot 6 :
  // enregistrement entier, règle record, comme Carburant — modules/fuel/INTEGRATION.md § 3)
  writes: [{
    prefix: 'cache/maps/',
    policy: 'cache'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    // seuils des modes réglés par l'administrateur (#maps?tune=1)
    prefix: 'airline/map_profiles.json',
    merge: 'record'
  }],
  // gardés à l'installation (hors ligne dès la première visite) : le noyau, les symboles
  files: ['render.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/profiles.js?v=0', '../../frame/lib/js-yaml.min.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/current_flight.js?v=0', '../../frame/lib/time.js?v=0', 'contours.js?v=0'
  ],
  // gardés au premier usage seulement : MapLibre (1 Mo, inutile sans tuiles) ; les contours des pays du fond uni (350 Ko,
  // inutiles avec les tuiles ; gardés d'avance quand MapLibre n'est pas en cache : outlinesAhead)
  lazy: ['lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0', 'lib/outlines.js?v=0'],
  // hôtes publics de tuiles appelés directement par MapLibre (jamais par ctx.net) ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod']
};

const LIBS = [
    ['SiaAero', 'lib/aero_symbols.js'],
    ['SiaProfile', 'lib/vertical_profile.js'],
    ['MapsRender', 'render.js'],
    ['MapsProfile', 'profile.js'],
    ['MapsMission', 'mission.js'],
    ['MapsContours', 'contours.js'],
    ['MAPS_PROFILES', 'lib/profiles.js'],
    ['jsyaml', '../../frame/lib/js-yaml.min.js']
  ],
  STYLE_URL = 'https://tiles.openfreemap.org/styles/positron',
  STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark',
  // fond d'un profil d'affichage du studio : styles publiés d'OpenFreeMap et de VersaTiles ; le style maison du studio
  // (vector), OSM standard et OpenTopoMap (hôtes hors de meta.net) sont remplacés par positron
  STYLES = {
    'ofm-liberty': 'https://tiles.openfreemap.org/styles/liberty',
    'ofm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'ofm-positron': 'https://tiles.openfreemap.org/styles/positron',
    'vt-colorful': 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
    'vt-graybeard': 'https://tiles.versatiles.org/assets/styles/graybeard/style.json',
    'vt-shadow': 'https://tiles.versatiles.org/assets/styles/shadow/style.json',
    'vt-eclipse': 'https://tiles.versatiles.org/assets/styles/eclipse/style.json'
  },
  TILE_WAIT = 10e3; // fond pas prêt après ce délai : fond uni

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  title: ['Carte', 'Map', 'Karte', 'Mapa'],
  edit: ['Modifier la route', 'Edit the route', 'Route bearbeiten', 'Editar la ruta'],
  fit: ['Recentrer', 'Recentre', 'Zentrieren', 'Recentrar'],
  noFlight: ['Aucun vol prévu : préparez-le dans Carburant.', 'No planned flight: prepare it in Fuel.',
    'Kein geplanter Flug: im Kraftstoff vorbereiten.', 'Ningún vuelo previsto: prepárelo en Combustible.'
  ],
  toFuel: ['Ouvrir Carburant', 'Open Fuel', 'Kraftstoff öffnen', 'Abrir Combustible'],
  noBase: ['Base aéronautique non publiée : la carte ne montre que la route.',
    'Aeronautical database not published: the map shows the route only.',
    'Luftfahrtdatenbank nicht veröffentlicht: die Karte zeigt nur die Route.',
    'Base aeronáutica no publicada: el mapa solo muestra la ruta.'
  ],
  noZone: ['Hors ligne, sans les données de cette zone : gardez-la dans Réglages › Données hors ligne.',
    'Offline, without this zone’s data: keep it in Settings › Offline data.',
    'Offline, ohne die Daten dieser Zone: unter Einstellungen › Offline-Daten behalten.',
    'Sin conexión y sin los datos de esta zona: guárdela en Ajustes › Datos sin conexión.'
  ],
  toSettings: ['Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'],
  plain: ['Fond de carte indisponible : fond uni.', 'Base map unavailable: plain background.',
    'Hintergrundkarte nicht verfügbar: einfarbiger Hintergrund.', 'Mapa de fondo no disponible: fondo liso.'
  ],
  loading: ['Chargement de la carte…', 'Loading the map…', 'Karte wird geladen…', 'Cargando el mapa…'],
  summary: ['{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}'],
  altn: ['dégagement {a}', 'alternate {a}', 'Ausweich {a}', 'alternativa {a}'],
  dist: ['{d} NM', '{d} NM', '{d} NM', '{d} NM'],
  profileLabel: ['Profil vertical de la route', 'Vertical profile of the route', 'Vertikalprofil der Route',
    'Perfil vertical de la ruta'
  ],
  hint: ['Glissez le doigt sur le profil, ou touchez la route sur la carte.',
    'Slide a finger along the profile, or tap the route on the map.',
    'Mit dem Finger über das Profil fahren oder die Route auf der Karte antippen.',
    'Deslice el dedo por el perfil o toque la ruta en el mapa.'
  ],
  planned: ['prévu {a}', 'planned {a}', 'geplant {a}', 'previsto {a}'],
  terrain: ['relief {h}', 'terrain {h}', 'Gelände {h}', 'relieve {h}'],
  mora: ['MORA {h}', 'MORA {h}', 'MORA {h}', 'MORA {h}'],
  noZoneHere: ['hors espace choisi', 'outside the airspaces shown', 'außerhalb der gezeigten Lufträume',
    'fuera de los espacios mostrados'
  ],
  noTerrain: ['Relief indisponible : le profil montre les MORA des cases traversées.',
    'Terrain unavailable: the profile shows the MORA of the cells crossed.',
    'Gelände nicht verfügbar: das Profil zeigt die MORA der überflogenen Felder.',
    'Relieve no disponible: el perfil muestra las MORA de las celdas atravesadas.'
  ],
  pick: ['Carte à montrer', 'Map to show', 'Anzuzeigende Karte', 'Mapa que mostrar'],
  flight: ['Vol prévu', 'Planned flight', 'Geplanter Flug', 'Vuelo previsto'],
  missionsGroup: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  mapOf: ['Carte de la mission', 'Mission map', 'Karte der Mission', 'Mapa de la misión'],
  missionMissing: ['Mission introuvable dans le dépôt des données : {m}.', 'Mission not found in the data repository: {m}.',
    'Mission im Datenrepository nicht gefunden: {m}.', 'Misión no encontrada en el repositorio de datos: {m}.'
  ],
  missionBad: ['Mission illisible ({e}).', 'Unreadable mission ({e}).', 'Mission nicht lesbar ({e}).', 'Misión ilegible ({e}).'],
  noMaps: ['Cette mission ne déclare aucune carte : son cheminement seul est montré.',
    'This mission declares no map: only its route is shown.',
    'Diese Mission deklariert keine Karte: nur ihre Route wird gezeigt.',
    'Esta misión no declara ningún mapa: solo se muestra su ruta.'
  ],
  builtin: ['Profil d’affichage intégré « {p} » : la mission n’en porte pas encore la copie.',
    'Built-in display profile “{p}”: the mission does not carry its copy yet.',
    'Integriertes Anzeigeprofil „{p}“: die Mission enthält noch keine Kopie davon.',
    'Perfil de visualización integrado «{p}»: la misión aún no lleva su copia.'
  ],
  cycleDiff: ['Carte faite sur le cycle {a} ; base aéronautique du cycle {b}.',
    'Map made on cycle {a}; aeronautical database of cycle {b}.',
    'Karte mit Zyklus {a} erstellt; Luftfahrtdatenbank des Zyklus {b}.', 'Mapa hecho con el ciclo {a}; base aeronáutica del ciclo {b}.'
  ],
  preset: ['Préréglage de la carte', 'Map preset', 'Kartenvoreinstellung', 'Preajuste del mapa'],
  presets: {
    auto: ['Auto', 'Auto', 'Auto', 'Auto'],
    low: ['IFR bas', 'Low IFR', 'IFR unten', 'IFR bajo'],
    high: ['IFR haut', 'High IFR', 'IFR oben', 'IFR alto'],
    vfr: ['VFR', 'VFR', 'VFR', 'VFR'],
    topo: ['Topo', 'Topo', 'Topo', 'Topo'],
    cam: ['CAM', 'OAT', 'OAT', 'CAM']
  },
  modes: ['Modes de carte', 'Map modes', 'Kartenmodi', 'Modos de mapa'],
  pair: ['{a} : {b}', '{a}: {b}', '{a}: {b}', '{a}: {b}'],
  modeHelp: {
    auto: ['Automatique selon le niveau du vol', 'Automatic, from the flight level', 'Automatisch nach der Flugfläche',
      'Automático según el nivel del vuelo'
    ],
    low: ['IFR bas : sous le plafond 195', 'Low IFR: below FL195', 'IFR unten: unter FL195', 'IFR bajo: por debajo del FL195'],
    high: ['IFR haut : au-dessus du plancher 195', 'High IFR: above FL195', 'IFR oben: über FL195',
      'IFR alto: por encima del FL195'
    ],
    vfr: ['VFR : espaces, points de report, obstacles', 'VFR: airspaces, reporting points, obstacles',
      'VFR: Lufträume, Meldepunkte, Hindernisse', 'VFR: espacios, puntos de notificación, obstáculos'
    ],
    topo: ['Topographique : relief, surcouche minimale', 'Topographic: relief, minimal overlay',
      'Topografisch: Relief, minimale Überlagerung', 'Topográfico: relieve, superposición mínima'
    ],
    cam: ['CAM : vol militaire (zones R / D / P, TSA / TRA / CBA, RTBA, à tous les niveaux)',
      'OAT: military flight (R / D / P, TSA / TRA / CBA areas, low-flying network, at all levels)',
      'OAT: Militärflug (Gebiete R / D / P, TSA / TRA / CBA, Tiefflugnetz, in allen Höhen)',
      'CAM: vuelo militar (zonas R / D / P, TSA / TRA / CBA, red de vuelo bajo, a todos los niveles)'
    ]
  },
  editMode: ['Modifier', 'Edit', 'Bearbeiten', 'Editar'],
  editDone: ['Terminer', 'Done', 'Fertig', 'Terminar'],
  editHelp: ['Modifier la route sur la carte', 'Edit the route on the map', 'Route auf der Karte bearbeiten',
    'Editar la ruta en el mapa'
  ],
  undo: ['Annuler', 'Undo', 'Rückgängig', 'Deshacer'],
  addPoint: ['Ajouter un point', 'Add a point', 'Punkt hinzufügen', 'Añadir un punto'],
  addHint: ['Touchez là où ajouter le point : sur un fixe, une balise ou un terrain il s\'y pose, ailleurs c\'est un point libre.',
    'Tap where to add the point: on a fix, a beacon or an airfield it settles there, elsewhere it is a free point.',
    'Tippen Sie, wo der Punkt hinzukommt: auf einem Fix, Funkfeuer oder Flugplatz setzt er sich dort, anderswo ist es ein freier Punkt.',
    'Toque donde añadir el punto: sobre un fijo, una radioayuda o un aeródromo se coloca allí, en otro lugar es un punto libre.'
  ],
  undoHelp: ['Annuler le dernier geste', 'Undo the last gesture', 'Letzte Geste rückgängig', 'Deshacer el último gesto'],
  editHint: [
    'Glissez un point : sur un fixe, une balise ou un terrain il s\'y pose, ailleurs il devient un point libre ; « + » puis un toucher (ou un appui long) ajoute un point ; touchez un point de la route pour le retirer. Sur le profil, glissez un palier vers le haut ou le bas.',
    'Drag a point: onto a fix, a beacon or an airfield it settles there, elsewhere it becomes a free point; “+” then a tap (or a long press) adds a point; tap a route point to remove it. On the profile, drag a level up or down.',
    'Ziehen Sie einen Punkt: auf einem Fix, Funkfeuer oder Flugplatz setzt er sich dort, anderswo wird er ein freier Punkt; „+“ und dann ein Tippen (oder langes Drücken) fügt einen Punkt hinzu; tippen Sie einen Routenpunkt an, um ihn zu entfernen. Auf dem Profil ziehen Sie eine Flughöhe nach oben oder unten.',
    'Arrastre un punto: sobre un fijo, una radioayuda o un aeródromo se coloca allí, en otro lugar se vuelve un punto libre; «+» y luego un toque (o una pulsación larga) añade un punto; toque un punto de la ruta para quitarlo. En el perfil, arrastre un nivel hacia arriba o hacia abajo.'
  ],
  lvlDown: ['Niveau plus bas (−FL10)', 'Lower level (−FL10)', 'Niedrigere Flughöhe (−FL10)', 'Nivel más bajo (−FL10)'],
  lvlUp: ['Niveau plus haut (+FL10)', 'Higher level (+FL10)', 'Höhere Flughöhe (+FL10)', 'Nivel más alto (+FL10)'],
  remove: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
  ptDep: ['départ', 'departure', 'Abflug', 'salida'],
  ptArr: ['arrivée', 'arrival', 'Ankunft', 'llegada'],
  ptLevel: ['{l} à partir de ce point', '{l} from this point', '{l} ab diesem Punkt', '{l} desde este punto'],
  ptSame: ['niveau précédent conservé', 'previous level kept', 'vorherige Flughöhe bleibt', 'se mantiene el nivel anterior'],
  saveFailed: ['Route non enregistrée : {m}', 'Route not saved: {m}', 'Route nicht gespeichert: {m}', 'Ruta no guardada: {m}'],
  layers: ['Couches', 'Layers', 'Ebenen', 'Capas'],
  follow: ['Suivre', 'Follow', 'Folgen', 'Seguir'],
  followHelp: ['Garder la carte centrée sur la position réelle', 'Keep the map centred on the actual position',
    'Karte auf der tatsächlichen Position halten', 'Mantener el mapa centrado en la posición real'
  ],
  progPlanned: ['prévu {t}', 'planned {t}', 'geplant {t}', 'previsto {t}'],
  progAhead: ['En avance de {m} min ({d} NM)', '{m} min ahead ({d} NM)', '{m} min voraus ({d} NM)', 'Adelantado {m} min ({d} NM)'],
  progLate: ['En retard de {m} min ({d} NM)', '{m} min late ({d} NM)', '{m} min Verspätung ({d} NM)', 'Retrasado {m} min ({d} NM)'],
  progOnTime: ['À l\'heure', 'On time', 'Pünktlich', 'A la hora'],
  progSide: ['{d} NM à {s} de la route', '{d} NM {s} of the route', '{d} NM {s} der Route', '{d} NM a la {s} de la ruta'],
  progLeft: ['gauche', 'left', 'links', 'izquierda'],
  progRight: ['droite', 'right', 'rechts', 'derecha'],
  progOnRoute: ['sur la route', 'on the route', 'auf der Route', 'en la ruta'],
  progAlt: ['altitude {a} (prévue {p})', 'altitude {a} (planned {p})', 'Höhe {a} (geplant {p})', 'altitud {a} (prevista {p})'],
  progStale: ['Position d\'il y a {m} min', 'Position from {m} min ago', 'Position von vor {m} min', 'Posición de hace {m} min'],
  progNoPos: ['GPS ou réseau non activés : pas de position réelle.', 'GPS or network not enabled: no actual position.',
    'GPS oder Netz nicht aktiviert: keine tatsächliche Position.', 'GPS o red no activados: sin posición real.'
  ],
  progFrom: ['source : {s}', 'source: {s}', 'Quelle: {s}', 'fuente: {s}'],
  progSources: {
    gps: ['GPS', 'GPS', 'GPS', 'GPS'],
    network: ['réseau', 'network', 'Netz', 'red'],
    ivao: ['IVAO', 'IVAO', 'IVAO', 'IVAO'],
    vatsim: ['VATSIM', 'VATSIM', 'VATSIM', 'VATSIM'],
    xplane: ['X-Plane', 'X-Plane', 'X-Plane', 'X-Plane'],
    lnm: ['Little Navmap', 'Little Navmap', 'Little Navmap', 'Little Navmap']
  },
  progSettings: ['Ouvrir les réglages', 'Open the settings', 'Einstellungen öffnen', 'Abrir los ajustes'],
  windTip: ['Vent {d}° / {k} kt', 'Wind {d}° / {k} kt', 'Wind {d}° / {k} kt', 'Viento {d}° / {k} kt'],
  windSub: ['{t} · {l} · prévision {h}', '{t} · {l} · forecast {h}', '{t} · {l} · Vorhersage {h}', '{t} · {l} · previsión {h}'],
  layerNames: {
    corridor: ['Autour de la route seulement', 'Around the route only', 'Nur entlang der Route', 'Solo alrededor de la ruta'],
    asTma: ['Espaces TMA / CTR', 'TMA / CTR airspaces', 'Lufträume TMA / CTR', 'Espacios TMA / CTR'],
    asDrp: ['Zones D / R / P', 'D / R / P areas', 'Gebiete D / R / P', 'Zonas D / R / P'],
    asFir: ['FIR', 'FIR', 'FIR', 'FIR'],
    asOther: ['Autres espaces', 'Other airspaces', 'Andere Lufträume', 'Otros espacios'],
    awLow: ['Voies basses', 'Lower airways', 'Untere Flugwege', 'Aerovías inferiores'],
    awHigh: ['Voies hautes', 'Upper airways', 'Obere Flugwege', 'Aerovías superiores'],
    navaids: ['Balises', 'Beacons', 'Funkfeuer', 'Radioayudas'],
    fixes: ['Points des voies', 'Airway points', 'Flugwegpunkte', 'Puntos de aerovía'],
    vrp: ['Points de report VFR', 'VFR reporting points', 'VFR-Meldepunkte', 'Puntos de notificación VFR'],
    obstacles: ['Obstacles', 'Obstacles', 'Hindernisse', 'Obstáculos'],
    mora: ['Altitudes minimales (MORA)', 'Minimum altitudes (MORA)', 'Mindesthöhen (MORA)', 'Altitudes mínimas (MORA)'],
    cities: ['Villes', 'Towns', 'Städte', 'Ciudades'],
    graticule: ['Canevas', 'Graticule', 'Gradnetz', 'Retícula'],
    altn: ['Dégagement', 'Alternate', 'Ausweichflugplatz', 'Alternativo'],
    aar: ['Axes de ravitaillement (AAR)', 'Air refuelling tracks (AAR)', 'Luftbetankungsstrecken (AAR)',
      'Pistas de reabastecimiento (AAR)'
    ],
    nat: ['Tracks NAT', 'NAT tracks', 'NAT-Tracks', 'Tracks NAT'],
    wind: ['Vents en altitude', 'Winds aloft', 'Höhenwinde', 'Vientos en altura'],
    contours: ['Courbes de niveau', 'Contour lines', 'Höhenlinien', 'Curvas de nivel'],
    zoneLabels: ['Noms des espaces', 'Airspace names', 'Namen der Lufträume', 'Nombres de los espacios'],
    awLabels: ['Noms des voies', 'Airway names', 'Namen der Flugwege', 'Nombres de las aerovías']
  },
  layersReset: ['Tout remettre', 'Reset all', 'Alles zurücksetzen', 'Restablecer todo'],
  detail: ['Complexité (essai)', 'Complexity (trial)', 'Komplexität (Test)', 'Complejidad (prueba)'],
  zoomNames: {
    asFir: ['FIR / UIR', 'FIR / UIR', 'FIR / UIR', 'FIR / UIR'],
    asTma: ['TMA', 'TMA', 'TMA', 'TMA'],
    asCta: ['CTA', 'CTA', 'CTA', 'CTA'],
    asCtr: ['CTR', 'CTR', 'CTR', 'CTR'],
    asR: ['Zones R', 'R areas', 'Gebiete R', 'Zonas R'],
    asD: ['Zones D', 'D areas', 'Gebiete D', 'Zonas D'],
    asP: ['Zones P', 'P areas', 'Gebiete P', 'Zonas P'],
    asTsa: ['TSA / TRA / CBA', 'TSA / TRA / CBA', 'TSA / TRA / CBA', 'TSA / TRA / CBA'],
    asOther: ['Autres espaces', 'Other airspaces', 'Andere Lufträume', 'Otros espacios'],
    zoneLabels: ['Noms des espaces', 'Airspace names', 'Luftraumnamen', 'Nombres de espacios'],
    awLow: ['Voies basses', 'Lower airways', 'Untere Flugwege', 'Aerovías inferiores'],
    awHigh: ['Voies hautes', 'Upper airways', 'Obere Flugwege', 'Aerovías superiores'],
    awLabels: ['Étiquettes de tronçon (distance, route)', 'Segment labels (distance, track)', 'Abschnittsbeschriftungen (Länge, Kurs)',
      'Etiquetas de tramo (distancia, rumbo)'
    ],
    navaids: ['Balises', 'Beacons', 'Funkfeuer', 'Radioayudas'],
    fixes: ['Points des voies', 'Airway points', 'Flugwegpunkte', 'Puntos de aerovía'],
    vrp: ['Points de report VFR', 'VFR reporting points', 'VFR-Meldepunkte', 'Puntos de notificación VFR'],
    obstacles: ['Obstacles', 'Obstacles', 'Hindernisse', 'Obstáculos'],
    mora: ['Altitudes minimales (MORA)', 'Minimum altitudes (MORA)', 'Mindesthöhen (MORA)', 'Altitudes mínimas (MORA)'],
    citiesBig: ['Grandes villes (200 000 hab. et plus)', 'Large towns (200,000 and more)', 'Großstädte (ab 200 000 Einw.)',
      'Ciudades grandes (200 000 hab. o más)'
    ],
    citiesMid: ['Villes moyennes (30 000 hab. et plus)', 'Medium towns (30,000 and more)', 'Mittelstädte (ab 30 000 Einw.)',
      'Ciudades medianas (30 000 hab. o más)'
    ],
    citiesSmall: ['Petites villes', 'Small towns', 'Kleinstädte', 'Ciudades pequeñas'],
    graticule: ['Canevas', 'Graticule', 'Gradnetz', 'Retícula'],
    aar: ['Axes de ravitaillement (AAR)', 'Air refuelling tracks (AAR)', 'Luftbetankungsstrecken (AAR)',
      'Pistas de reabastecimiento (AAR)'
    ],
    nat: ['Tracks NAT', 'NAT tracks', 'NAT-Tracks', 'Tracks NAT'],
    wind: ['Barbules de vent', 'Wind barbs', 'Windfiedern', 'Barbas de viento'],
    contours: ['Courbes de niveau', 'Contour lines', 'Höhenlinien', 'Curvas de nivel']
  },
  tuneTitle: ['Réglage de la carte : seuils de zoom', 'Map tuning: zoom thresholds', 'Kartenabstimmung: Zoomschwellen',
    'Ajuste del mapa: umbrales de zoom'
  ],
  tuneHint: [
    'Chaque élément est dessiné entre ses deux seuils de zoom, réglés par mode ; la carte suit en direct. Le trait marque le zoom courant. Case décochée : jamais dessiné, quels que soient les seuils (la même case que dans le panneau Couches, gardée aussitôt sur cet appareil).',
    'Each element is drawn between its two zoom thresholds, set per mode; the map follows live. The mark shows the current zoom. An unticked box: never drawn, whatever the thresholds (the same box as in the Layers panel, kept at once on this device).',
    'Jedes Element wird zwischen seinen zwei Zoomschwellen gezeichnet, je Modus eingestellt; die Karte folgt sofort. Die Marke zeigt den aktuellen Zoom. Kästchen nicht angekreuzt: nie gezeichnet, unabhängig von den Schwellen (dasselbe Kästchen wie im Bereich Ebenen, sofort auf diesem Gerät behalten).',
    'Cada elemento se dibuja entre sus dos umbrales de zoom, ajustados por modo; el mapa sigue en directo. La marca indica el zoom actual. Casilla sin marcar: nunca se dibuja, sean cuales sean los umbrales (la misma casilla que en el panel Capas, guardada enseguida en este dispositivo).'
  ],
  tuneNow: ['Zoom courant : {z} · effectif {e} (cadre de {m} px en moyenne) · {s} NM par cm d\'écran',
    'Current zoom: {z} · effective {e} (frame of {m} px on average) · {s} NM per cm of screen',
    'Aktueller Zoom: {z} · wirksam {e} (Rahmen von durchschnittlich {m} px) · {s} NM pro cm Bildschirm',
    'Zoom actual: {z} · efectivo {e} (marco de {m} px de media) · {s} NM por cm de pantalla'
  ],
  dataProfile: ['Profil vertical', 'Vertical profile', 'Vertikalprofil', 'Perfil vertical'],
  sheetSize: ['Hauteur du bloc de données : toucher ou glisser', 'Data block height: tap or drag',
    'Höhe des Datenblocks: antippen oder ziehen', 'Altura del bloque de datos: tocar o arrastrar'
  ],
  sheetNames: [
    ['réduit', 'collapsed', 'eingeklappt', 'reducido'],
    ['normal', 'default', 'normal', 'normal'],
    ['agrandi', 'expanded', 'erweitert', 'ampliado']
  ],
  tuneRange: ['de {a} à {b}', 'from {a} to {b}', 'von {a} bis {b}', 'de {a} a {b}'],
  tuneNoLimit: ['sans limite', 'no limit', 'ohne Grenze', 'sin límite'],
  tuneFrom: ['à partir de {a}', 'from {a}', 'ab {a}', 'desde {a}'],
  tuneMin: ['Seuil bas de {e}', 'Lower threshold of {e}', 'Untere Schwelle von {e}', 'Umbral inferior de {e}'],
  tuneMax: ['Seuil haut de {e}', 'Upper threshold of {e}', 'Obere Schwelle von {e}', 'Umbral superior de {e}'],
  tuneSaveCo: ['Enregistrer pour la compagnie', 'Save for the airline', 'Für die Fluggesellschaft speichern',
    'Guardar para la aerolínea'
  ],
  tuneVis: ['{e} : dessiné (case « {l} » du panneau Couches)', '{e}: drawn ({l} box of the Layers panel)',
    '{e}: gezeichnet (Kästchen „{l}“ im Bereich Ebenen)', '{e}: dibujado (casilla «{l}» del panel Capas)'
  ],
  tuneResetVis: ['Remettre les cases', 'Reset the boxes', 'Kästchen zurücksetzen', 'Restablecer las casillas'],
  tuneResetZoom: ['Remettre les curseurs', 'Reset the sliders', 'Regler zurücksetzen', 'Restablecer los cursores'],
  tuneSaveDev: ['Garder sur cet appareil', 'Keep on this device', 'Auf diesem Gerät behalten', 'Guardar en este dispositivo'],
  tuneSavedCo: ['Seuils du mode {m} enregistrés pour la compagnie.', 'Thresholds of the {m} mode saved for the airline.',
    'Schwellen des Modus {m} für die Fluggesellschaft gespeichert.', 'Umbrales del modo {m} guardados para la aerolínea.'
  ],
  tuneSavedDev: ['Seuils du mode {m} gardés sur cet appareil.', 'Thresholds of the {m} mode kept on this device.',
    'Schwellen des Modus {m} auf diesem Gerät behalten.', 'Umbrales del modo {m} guardados en este dispositivo.'
  ],
  tuneRO: ['Lecture seule sur un téléphone : réglez les seuils sur un écran ou une tablette.',
    'Read only on a phone: set the thresholds on a screen or a tablet.',
    'Auf dem Telefon nur lesbar: stellen Sie die Schwellen auf einem Bildschirm oder Tablet ein.',
    'Solo lectura en un teléfono: ajuste los umbrales en una pantalla o una tableta.'
  ],
  detailHelp: ['Moins de détails à gauche, plus à droite : décale d\'un cran ce que chaque zoom montre.',
    'Fewer details to the left, more to the right: shifts by one step what each zoom shows.',
    'Weniger Details links, mehr rechts: verschiebt um eine Stufe, was jeder Zoom zeigt.',
    'Menos detalles a la izquierda, más a la derecha: desplaza un paso lo que muestra cada zoom.'
  ],
  tipMore: ['+{n} autre(s)', '+{n} more', '+{n} weitere', '+{n} más'],
  close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
  vfrTitle: ['{ad} : points de report VFR', '{ad}: VFR reporting points', '{ad}: VFR-Meldepunkte', '{ad}: puntos de notificación VFR'],
  vfrLabel: ['Extrait des cartes VAC, à vérifier : ce n\'est pas l\'itinéraire publié, la carte VAC fait foi.',
    'Extracted from the VAC charts, to be checked: this is not the published route, the VAC chart prevails.',
    'Aus den VAC-Karten entnommen, zu prüfen: dies ist nicht die veröffentlichte Route, maßgeblich ist die VAC-Karte.',
    'Extraído de las cartas VAC, a verificar: no es el itinerario publicado, la carta VAC es la que vale.'
  ],
  vfrMap: ['VAC, à vérifier', 'VAC, to be checked', 'VAC, zu prüfen', 'VAC, a verificar'],
  vfrNone: ['Aucun point de report VFR importé pour ce terrain.', 'No VFR reporting point imported for this aerodrome.',
    'Für diesen Flugplatz sind keine VFR-Meldepunkte importiert.', 'Ningún punto de notificación VFR importado para este aeródromo.'
  ],
  vfrHover: ['{c} : toucher pour les voir', '{c}: tap to see them', '{c}: zum Ansehen antippen', '{c}: toque para verlos'],
  navAlso: ['aussi ici : {l}', 'also here: {l}', 'auch hier: {l}', 'también aquí: {l}'],
  vfrVacCode: ['code VAC : {c}', 'VAC code: {c}', 'VAC-Code: {c}', 'código VAC: {c}'],
  vfrPoints: ['Points de report ({n})', 'Reporting points ({n})', 'Meldepunkte ({n})', 'Puntos de notificación ({n})'],
  vfrBaseCount: ['{n} points de report', '{n} reporting points', '{n} Meldepunkte', '{n} puntos de notificación'],
  vfrSeqCount: ['{r} séquences VAC', '{r} VAC sequences', '{r} VAC-Sequenzen', '{r} secuencias VAC'],
  vfrNoVac: ['séquences VAC : non importées', 'VAC sequences: not imported', 'VAC-Sequenzen: nicht importiert',
    'secuencias VAC: no importadas'
  ],
  vfrLegend: ['(noir : avions ; vert : hélicoptères)', '(black: aeroplanes; green: helicopters)',
    '(schwarz: Flugzeuge; grün: Hubschrauber)',
    '(negro: aviones; verde: helicópteros)'
  ],
  vfrStatus: {
    'interprété': ['Analyse manuelle de la VAC ({s})', 'Manual analysis of the VAC ({s})', 'Manuelle Auswertung der VAC ({s})',
      'Análisis manual de la VAC ({s})'
    ],
    'calculé': ['Extraction automatique, non relue', 'Automatic extraction, not reviewed', 'Automatische Entnahme, nicht geprüft',
      'Extracción automática, no revisada'
    ],
    'obsolète': ['Analyse périmée (la VAC a changé) : extraction automatique seule',
      'Analysis out of date (the VAC changed): automatic extraction only',
      'Auswertung veraltet (die VAC hat sich geändert): nur automatische Entnahme',
      'Análisis caducado (la VAC cambió): solo extracción automática'
    ],
    'sans relations': ['VAC relue : pas de séquence publiée', 'VAC reviewed: no published sequence',
      'VAC geprüft: keine veröffentlichte Sequenz',
      'VAC revisada: ninguna secuencia publicada'
    ]
  },
  vfrScope: {
    partial: ['partielle', 'partial', 'teilweise', 'parcial'],
    complete: ['complète', 'complete', 'vollständig', 'completo']
  },
  vfrRunways: ['pistes {r}', 'runways {r}', 'Pisten {r}', 'pistas {r}'],
  vfrAlt: ['{a} par défaut', '{a} by default', 'standardmäßig {a}', '{a} por defecto'],
  vfrVis: ['visibilité {v} m au moins', 'visibility {v} m at least', 'Sicht mindestens {v} m', 'visibilidad de {v} m como mínimo'],
  vfrOneWay: ['sens unique', 'one way', 'Einbahn', 'sentido único'],
  vfrPages: ['pages {p}', 'pages {p}', 'Seiten {p}', 'páginas {p}'],
  vfrManual: ['{n} sommets de tracé placés à la main sur la carte VAC, précision non garantie.',
    '{n} track vertices placed by hand on the VAC chart, accuracy not guaranteed.',
    '{n} Verlaufspunkte von Hand auf der VAC-Karte gesetzt, Genauigkeit nicht garantiert.',
    '{n} vértices de trazado colocados a mano sobre la carta VAC, precisión no garantizada.'
  ],
  vfrAccuracy: ['{n} sommets de tracé placés à la main sur la carte VAC, à {m} m près.',
    '{n} track vertices placed by hand on the VAC chart, within {m} m.',
    '{n} Verlaufspunkte von Hand auf der VAC-Karte gesetzt, auf {m} m genau.',
    '{n} vértices de trazado colocados a mano sobre la carta VAC, con {m} m de precisión.'
  ],
  vfrNotes: ['Consignes (texte des VAC)', 'Instructions (text of the VAC)', 'Hinweise (Text der VAC)', 'Consignas (texto de las VAC)'],
  vfrPage: ['page {p}', 'page {p}', 'Seite {p}', 'página {p}'],
  vfrPart: ['(certaines peuvent n\'être qu\'une partie d\'un itinéraire)', '(some may be only part of a route)',
    '(manche sind möglicherweise nur ein Teil einer Route)', '(algunas pueden ser solo una parte de un itinerario)'
  ],
  levelsTitle: ['{n} espaces sur ce point', '{n} airspaces at this point', '{n} Lufträume an diesem Punkt',
    '{n} espacios en este punto'
  ],
  levelsTitle1: ['1 espace sur ce point', '1 airspace at this point', '1 Luftraum an diesem Punkt', '1 espacio en este punto'],
  levelsAxis: ['Plancher et plafond de chaque espace, du plus bas au plus haut',
    'Floor and ceiling of each airspace, from the lowest to the highest',
    'Untergrenze und Obergrenze jedes Luftraums, vom niedrigsten zum höchsten',
    'Límite inferior y superior de cada espacio, del más bajo al más alto'
  ],
  awHigh: ['voie haute', 'upper airway', 'oberer Flugweg', 'aerovía superior'],
  awLow: ['voie basse', 'lower airway', 'unterer Flugweg', 'aerovía inferior'],
  credit: ['© OpenFreeMap © OpenStreetMap ; SIA : base publiée, non certifiée',
    '© OpenFreeMap © OpenStreetMap; SIA: published database, not certified',
    '© OpenFreeMap © OpenStreetMap; SIA: veröffentlichte Datenbank, nicht zertifiziert',
    '© OpenFreeMap © OpenStreetMap; SIA: base publicada, no certificada'
  ]
};

/** Libellé d'un mode (infobulle, aria-label) : son aide, précédée de son nom pour Auto. */
const modeTitle = (ctx, k) => k === 'auto' ? ctx.t(TX.pair, {
  a: ctx.t(TX.presets[k]),
  b: ctx.t(TX.modeHelp[k])
}) : ctx.t(TX.modeHelp[k]);
/** Modes de carte (maquette validée par l'utilisateur) : [clé, icône, classe du choix]. */
const MODES = [
  ['auto', `<span class="mp-ic">${svg('wand-sparkles')}</span>`, ''],
  ['low', '<span class="mp-ifr mp-ceil" aria-hidden="true">IFR</span>', ''],
  ['high', '<span class="mp-ifr mp-floor" aria-hidden="true">IFR</span>', ''],
  ['vfr', `<span class="mp-ic">${svg('map')}</span>`, ''],
  ['topo', '<span class="mp-topo" aria-hidden="true"><span></span><span></span><span></span><span></span></span>', ''],
  ['cam', `<span class="mp-ic mp-ic-cam">${svg('plane')}</span>`, ' mp-mil']
];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
let S = null;
const tt = (row, v) => S.ctx.t(row, v);
const flightPath = () => `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`;

/** Style du fond : celui du profil d'affichage, de jour ; la nuit, le style sombre (VersaTiles : eclipse). */
const styleFor = () => S.theme?.dark ? /^vt-/.test(S.profile?.base || '') ? STYLES['vt-eclipse'] : STYLE_NIGHT : STYLES[S.profile?.base] ||
  STYLE_URL;
/** Charge le noyau (scripts du dossier du module, une fois par page). */
async function loadLibs() {
  for (const [glob, file] of LIBS)
    if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
  // première visite : la page tourne avant que le service worker la contrôle ; relus une fois quand il prend la main
  const sw = navigator.serviceWorker;
  if (sw && !sw.controller) sw.addEventListener('controllerchange', () => {
    for (const [, file] of LIBS) fetch(new URL(`${file}?v=0`, import.meta.url)).catch(() => {});
  }, {
    once: true
  });
}
/** Contours des pays du fond uni (lib/outlines.js, 350 Ko), chargés au premier dessin sans tuiles ; la carte est redessinée
 *  quand ils arrivent (mer seule en attendant). */
let outlinesP = null;
const loadOutlines = () => outlinesP ||= import(new URL('lib/outlines.js?v=0', import.meta.url).href).then(() => S && schedule(), () => {
  outlinesP = null; // hors ligne sans copie : redemandé au dessin suivant
});
/** Contours gardés d'avance (service worker) seulement quand MapLibre n'est pas en cache : sans lui, le premier vol hors
 *  ligne n'aurait que le fond uni. */
async function outlinesAhead() {
  try {
    const ml = await caches.match(new URL('lib/maplibre-gl.js', import.meta.url).href, {
      ignoreSearch: true
    });
    if (!ml) fetch(new URL('lib/outlines.js?v=0', import.meta.url)).catch(() => {});
  } catch {
    /* stockage des copies indisponible : rien à garder */
  }
}
/** MapLibre (script UMD et sa feuille), chargé une fois, au premier fond à tuiles ; null s'il ne charge pas. */
let mlP = null;

function loadMapLibre() {
  return mlP ||= new Promise(ok => {
    if (window.maplibregl) return ok(window.maplibregl);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('lib/maplibre-gl.css?v=0', import.meta.url).href;
    document.head.append(css);
    const sc = document.createElement('script');
    sc.src = new URL('lib/maplibre-gl.js?v=0', import.meta.url).href;
    sc.onload = () => ok(window.maplibregl || null);
    sc.onerror = () => {
      mlP = null;
      ok(null);
    };
    document.head.append(sc);
  });
}

// ---------------------------------------------------------------- vol
/** Points de la route (route.points, positions résolues par Carburant) et dégagement (aerodb). */
async function readFlight() {
  const f = (await S.ctx.data.get(flightPath()).catch(() => null)) || null,
    pts = pointsOf(f);
  let altn = null;
  if (f?.route?.altn && pts.length && S.ctx.aerodb) {
    const c = await S.ctx.aerodb.coords(f.route.altn).catch(() => null);
    if (c) altn = {
      id: f.route.altn,
      lat: c.lat,
      lon: c.lon
    };
  }
  return {
    flight: f,
    points: pts,
    altn,
    levelFt: +f?.level?.ft || 0,
    updated: f?.updated_at || ''
  };
}
/** Points de la carte et du profil d'après l'enregistrement du vol courant. */
function pointsOf(f) {
  const // alt_ft (facultatif, Carburant, INTEGRATION § 3) : niveau tenu à partir du point, jamais au premier ni au dernier ;
    // le vol part à level.ft, un point sans alt_ft continue le précédent. Pour le profil : lvl (niveau à partir du
    // point), comme « /F240 » d'une route OFP ; paliers et TOC / TOD tronçon par tronçon
    raw = (f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    pts = raw.map((p, i) => ({
      id: p.id || '',
      lat: +p.lat,
      lon: +p.lon,
      ...(i > 0 && i < raw.length - 1 && p.alt_ft != null && +p.alt_ft > 0 ? {
        lvl: {
          ft: +p.alt_ft
        }
      } : {})
    }));
  if (pts.some(p => p.lvl) && +f?.level?.ft > 0) pts[0].lvl = {
    ft: +f.level.ft
  };
  return pts;
}

// ---------------------------------------------------------------- données (aerodb, emprise utile)
/** Emprise b élargie de k de chaque côté. */
const enlarge = (b, k) => {
  const dx = (b.e - b.w) * k,
    dy = (b.n - b.s) * k;
  return {
    w: b.w - dx,
    e: b.e + dx,
    s: Math.max(-85, b.s - dy),
    n: Math.min(85, b.n + dy)
  };
};
/** Emprise des données à lire pour la vue montrée : vue d'ensemble (vue au moins aussi large que la route) → l'emprise
 *  de la route (la carte n'y montre que ce qui est près de la route) ; vue rapprochée → la vue élargie de 15 %. */
const wantBox = shown => S.profile?.corridorNm > 0 && (shown.e - shown.w) >= (S.fit.e - S.fit.w) * .9 ? S.fit : enlarge(shown, .15);
/** Lecture dans le couloir de la route : couche « Autour de la route seulement » cochée, hors vue rapprochée (au-delà
 *  de 300 px par degré, toute l'emprise est lue et dessinée : c'est là qu'on regarde de près, loin de la route aussi). */
const corridorFor = (shown, W) => S.profile?.corridorNm > 0 && W / Math.max(1e-6, shown.e - shown.w) < 300;
/** Éléments de l'emprise box selon le profil. */
async function loadData(box, corridor = true) {
  const A = S.ctx.aerodb;
  if (!A) return {
    box: {
      w: -180,
      e: 180,
      s: -85,
      n: 85
    },
    data: {},
    empty: true
  };
  const q = {
      bbox: [box.w, box.s, box.e, box.n]
    },
    p0 = S.profile,
    p = corridor ? p0 : {
      ...p0,
      corridorNm: 0
    },
    E = p.elements,
    route = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])],
    // profil à couloir : espaces et voies lus pour le couloir de la route, tronçon par tronçon (un rectangle autour
    // d'une route en diagonale touche des zones voisines : l'Espagne pour une route Nantes → Marseille)
    boxes = +p.corridorNm > 0 ? corridorBoxes(route, +p.corridorNm + 2, box) : [q.bbox],
    t0 = performance.now();
  const [airspaces, aerodromes, navaids, airways, moraCells, obstacles, cities, vrp, points] = await Promise.all([
    many(A.airspaces, boxes),
    E.aerodromes ? A.aerodromes(q) : [],
    E.navaids ? A.navaids(q) : [],
    E.airwaysLow || E.airwaysHigh ? many(A.airways, boxes) : [],
    E.mora ? A.moraCells(q) : [],
    E.obstacles ? A.obstacles({
      ...q,
      minHgt: +E.obstacleMin || 300
    }) : [],
    p.cities || E.agglos ? A.cities({
      ...q,
      n: 400
    }) : [],
    E.vrpPoints ? A.vrp(q) : [],
    E.rnavPoints ? A.points(q) : []
  ].map(x => Promise.resolve(x).catch(() => [])));
  // axes de ravitaillement et tracks NAT (aerodb : zones ouvertes par les lectures ci-dessus ; zone « nat » à la demande)
  const [aar, nat] = await Promise.all([E.aarTracks && A.aarTracks ? A.aarTracks() : [], E.natTracks && A.natTracks ? A
    .natTracks() : []
  ].map(x => Promise.resolve(x).catch(() => [])));
  // couche « Autres espaces » : les types présents hors des trois familles, ajoutés au choix du profil
  const pz = p.otherZones ? {
    ...p,
    zones: [...(p.zones || []), ...new Set(airspaces.map(a => a.type).filter(t => groupOf(t) === 'asOther'))]
  } : p;
  performance.measure('maps:load', {
    start: t0
  }); // durée de la lecture (mesures : DECISIONS.md)
  return {
    box,
    corridor,
    data: {
      airspaces: MapsRender.selectAirspaces(airspaces, pz, route),
      aerodromes,
      navaids,
      airways,
      moraCells,
      obstacles,
      cities,
      vrp,
      points,
      aar,
      nat
    },
    empty: !airspaces.length && !aerodromes.length && !navaids.length
  };
}
const within = (inner, outer) => outer && inner.w >= outer.w && inner.e <= outer.e && inner.s >= outer.s && inner.n <= outer.n;
/** Emprises du couloir de la route (marge nm NM), une par tronçon, coupées à l'emprise box : [[ouest, sud, est, nord]]. */
function corridorBoxes(route, nm, box) {
  const out = [];
  for (let i = 1; i < route.length; i++) {
    const b = MapsRender.bboxOf([route[i - 1], route[i]], nm),
      c = [Math.max(box.w, b.w), Math.max(box.s, b.s), Math.min(box.e, b.e), Math.min(box.n, b.n)];
    if (c[0] <= c[2] && c[1] <= c[3]) out.push(c);
  }
  return out;
}
/** Réunion sans doublons des réponses d'une requête aerodb sur plusieurs emprises. */
async function many(f, boxes) {
  const seen = new Set(),
    out = [];
  for (const bbox of boxes)
    for (const x of await f({
        bbox
      }))
      if (!seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
  return out;
}

// ---------------------------------------------------------------- dessin
/** Taille du canvas de surcouche à celle de la carte (pixels de l'écran). */
function sizeCanvas() {
  const c = S.canvas,
    r = S.box.getBoundingClientRect(),
    dpr = Math.min(3, window.devicePixelRatio || 1),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  return {
    W,
    H,
    dpr
  };
}
/** Vue courante : projection et emprise affichée (MapLibre, sinon Mercator du fond uni sur l'emprise de la route). */
function view(W, H) {
  if (S.map) {
    const bb = S.map.getBounds();
    return {
      toC: (lat, lon) => S.map.project([lon, lat]),
      shown: {
        w: bb.getWest(),
        e: bb.getEast(),
        s: bb.getSouth(),
        n: bb.getNorth()
      }
    };
  }
  return MapsRender.mercator(S.fit, W, H, 12);
}
/** Fond MapLibre ramené à la taille du cadre s'il ne l'a plus (map.resize seulement dans ce cas). Appelé par
 *  l'observateur de taille, au chargement et au changement de style, au retour de la page (onglet caché, page gelée :
 *  les observations de taille faites pendant ce temps sont perdues) et à chaque dessin, pour qu'aucun cas oublié ne
 *  laisse une bande de fond. */
function mapSize() {
  const m = S?.map || S?.mapNew;
  if (!m) return;
  const c = m.getCanvas(),
    w = S.mapEl.clientWidth,
    h = S.mapEl.clientHeight;
  if (w && h && (c.clientWidth !== w || c.clientHeight !== h)) {
    // resize() tire « movestart » : ce n'est pas un geste de l'utilisateur (sa caméra n'est « déplacée » que par lui)
    const was = S.selfMove;
    S.selfMove = true;
    try {
      m.resize();
    } finally {
      S.selfMove = was;
    }
  }
}
/** Redessine la surcouche (et le fond uni sans tuiles) ; données relues si la vue sort de celles chargées. */
function draw() {
  if (!S?.canvas || !S.fit || !S.route.points.length) return;
  mapSize();
  const {
    W,
    H,
    dpr
  } = sizeCanvas(), {
    toC,
    shown
  } = view(W, H), raw = S.canvas.getContext('2d'), t = S.theme, ctx = MapsRender.themed(raw, t);
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
  raw.clearRect(0, 0, W, H);
  if (S.plain && !window.MAPS_OUTLINES) loadOutlines(); // fond uni confirmé (pas de tuiles) : pas pendant leur chargement
  if (!S.map) MapsRender.drawBackground(ctx, toC, W, H, window.MAPS_OUTLINES, {
    sea: t.page,
    land: t.bg,
    border: t.grid
  });
  const route = S.route.points,
    altn = S.mission || layersNow().altn ? S.route.altn : null;
  if (altn && route.length) {
    // dégagement : tireté gris de l'arrivée au terrain de dégagement
    const a = toC(route[route.length - 1].lat, route[route.length - 1].lon),
      b = toC(altn.lat, altn.lon);
    ctx.save();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  // courbes de niveau (Topo, VFR), de près, sous la surcouche aéronautique
  const pxDeg = W / Math.max(1e-6, shown.e - shown.w);
  // zoom réel de la vue, décalé par le curseur de complexité, puis corrigé par la taille du cadre : c'est ce zoom effectif
  // (zv) qu'on compare aux seuils, ici comme dans MapsRender.draw (même fonction)
  const zReal = MapsRender.zoomOf(pxDeg),
    zv = S.mission ? zReal : MapsRender.effectiveZoom(zReal + detailShift() * .75, W, H),
    zoomOn = k => MapsRender.visibleAt(S.profile, k, zv);
  if (S.tuneEl) markTune(zReal, zv, (shown.n + shown.s) / 2, W, H);
  // nos villes dessinées à ce zoom : les noms de lieux du fond s'effacent (sinon « Mérignac » en double)
  baseNames(!!S.profile?.cities && !!S.data?.data?.cities?.length && ['citiesBig', 'citiesMid', 'citiesSmall'].some(zoomOn));
  if (!S.mission && layersNow().contours && zoomOn('contours') && window.MapsContours && navigator.onLine !== false) MapsContours.draw(
    ctx, {
      toC,
      bbox: shown,
      pxPerDeg: pxDeg,
      W,
      H,
      unit: S.altUnit,
      onReady: schedule
    });
  const got = MapsRender.draw(ctx, {
    toC,
    W,
    H,
    scale: 1,
    bbox: shown,
    profile: S.profile,
    data: S.data?.data || {},
    route: withEta(route, pxDeg),
    marks: S.marks,
    theme: S.theme,
    level: formatLevel,
    detail: S.mission ? 0 : detailShift(),
    hideVrp: S.mission ? null : vfrVrpIds(),
    mission: S.mission ? {
      points: S.mission.points,
      zones: S.mission.zones
    } : null
  }) || {};
  S.awHits = got.airways || [];
  S.zoneHits = got.zoneLabels || [];
  S.adHits = got.aerodromes || [];
  S.navHits = got.navaids || [];
  S.vrpHits = got.vrps || [];
  if (altn && route.length) {
    // terrain de dégagement : rond gris et code, par-dessus le reste
    const q = toC(altn.lat, altn.lon);
    ctx.save();
    ctx.beginPath();
    ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.bg;
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '700 12px Arial,sans-serif'; // dégagement : sous les extrémités de la route (13 px)
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = S.theme.bg;
    ctx.lineWidth = 3;
    ctx.strokeText(altn.id, q.x + 8, q.y);
    ctx.fillStyle = '#4b5563';
    ctx.fillText(altn.id, q.x + 8, q.y);
    ctx.restore();
  }
  drawPlanOnMap(ctx, toC, got.routeLabels || []);
  if (!S.mission) drawVfr(ctx, toC);
  S.windHits = !S.mission && layersNow().wind && zoomOn('wind') ? drawWinds(ctx, toC) : [];
  if (!S.mission && inFlight()) drawProgress(ctx, toC, pxDeg);
  S.toC = toC;
  if (S.edit?.on) drawEdit(ctx, toC);
  if (S.data && !S.drawn) {
    S.drawn = true;
    performance.mark('maps:first-draw'); // premier dessin avec les données (mesures : DECISIONS.md)
  }
  const want = wantBox(shown),
    corr = corridorFor(shown, W);
  if (!within(want, S.data?.box) || corr !== S.data?.corridor) refresh(want, corr);
}
/** TOC et TOD (losanges) et curseur commun (rond) sur la carte, aux distances de la coupe. */
function drawPlanOnMap(ctx, toC, taken = []) {
  const pr = S.prof,
    col = '#6a1b9a';
  if (!pr) return;
  ctx.save();
  ctx.font = '700 11px Arial,sans-serif'; // sous les libellés de la route (12-13 px)
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const [m, name] of [
      [pr.plan?.toc, 'TOC'],
      [pr.plan?.tod, 'TOD']
    ]) {
    if (!m || (name === 'TOD' && Math.abs(pr.plan.tod.s - pr.plan.toc.s) < pr.total * .005)) continue;
    const g = MapsProfile.posAt(pr, m.s),
      q = toC(g.lat, g.lon);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y - 7);
    ctx.lineTo(q.x + 7, q.y);
    ctx.lineTo(q.x, q.y + 7);
    ctx.lineTo(q.x - 7, q.y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = S.theme.bg; // liseré du fond : le losange se détache du trait de la route, de la même teinte
    ctx.lineWidth = 2;
    ctx.stroke();
    // libellé au nord-est, sinon au sud-est, au nord-ouest, au sud-ouest : là où il ne couvre pas un nom de la route
    const w = ctx.measureText(name).width,
      spot = [
        [8, -9, 'left'],
        [8, 10, 'left'],
        [-8, -9, 'right'],
        [-8, 10, 'right']
      ].find(([dx, dy, al]) => {
        const x0 = al === 'left' ? q.x + dx : q.x + dx - w,
          r = {
            x0,
            x1: x0 + w,
            y0: q.y + dy - 7,
            y1: q.y + dy + 7
          };
        return !taken.some(t => r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0);
      }) || [8, -9, 'left'];
    ctx.textAlign = spot[2];
    ctx.lineWidth = 3;
    ctx.strokeText(name, q.x + spot[0], q.y + spot[1]);
    ctx.fillText(name, q.x + spot[0], q.y + spot[1]);
    ctx.textAlign = 'left';
  }
  if (S.cursor != null) {
    const g = MapsProfile.posAt(pr, S.cursor),
      q = toC(g.lat, g.lon);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = MapsRender.withAlpha(S.theme.accent, .25);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = S.theme.accent;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- profil vertical
const FT_NM = 1852;
/** Coupe du vol : espaces de la route (types du profil, sans plancher ni plafond), relief (Terrarium), sinon MORA. */
async function buildProfile() {
  const pts = S.route.profilePoints || S.route.points,
    A = S.ctx.aerodb;
  S.prof = null;
  S.geo = null;
  if (pts.length < 2) return drawProfile();
  const key = S.route.updated;
  let airspaces = [];
  if (A) {
    const list = await many(A.airspaces, corridorBoxes(pts, 2, {
        w: -180,
        e: 180,
        s: -85,
        n: 85
      })).catch(() => []),
      p = S.vprofProfile || S.profile;
    airspaces = MapsRender.selectAirspaces(list, {
      ...p,
      corridorNm: 0,
      elements: {
        ...p.elements,
        zoneFloor: '',
        zoneCeil: ''
      }
    }, pts);
    // régions (FIR, UIR, UTA, FRA…) : des repères de carte, pas des volumes à franchir dans une coupe
    if (!S.mission) airspaces = airspaces.filter(a => groupOf(a.type) !== 'asFir');
  }
  S.terrain ||= SiaProfile.terrainSampler(9);
  const prof = await MapsProfile.build(pts, {
    levelFt: S.route.levelFt,
    // écrit par un autre module (la carte, lot 6) : profile périmé jusqu'au devis refait par Carburant (by 'fuel')
    profile: S.route.flight?.by && S.route.flight.by !== 'fuel' ? null : S.route.flight?.profile || null,
    airspaces,
    elevation: navigator.onLine === false ? null : S.terrain,
    mora: A ? (lat, lon) => A.mora(lat, lon) : null
  }).catch(() => null);
  if (!S || S.route.updated !== key) return;
  S.prof = prof;
  performance.mark('maps:profile');
  drawProfile();
  strip();
  status();
  schedule();
}
/** Taille d'un canvas à son cadre (pixels de l'écran) : { W, H, dpr }. */
function fit(c, box) {
  const r = box.getBoundingClientRect(),
    dpr = Math.min(3, window.devicePixelRatio || 1),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  return {
    W,
    H,
    dpr
  };
}
/** Coupe dessinée (SiaProfile), marques NM en bas du cadre, puis le curseur. */
function drawProfile() {
  if (!S?.pc) return;
  if (S.profBox.hidden === !!S.prof) S.profBox.hidden = !S.prof;
  dataHead();
  if (!S.prof || S.dpanel) return; // contenu ouvert dans le bloc : le profil est redessiné à sa fermeture
  const {
    W,
    H,
    dpr
  } = fit(S.pc, S.profBox), raw = S.pc.getContext('2d'), ctx = MapsRender.themed(raw, S.theme);
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.geo = MapsProfile.draw(ctx, S.prof, {
    W,
    H,
    scale: W < 500 ? .78 : 1
  });
  // marques NM (mêmes que sur la carte) : petits traits au bas du cadre
  const g = S.geo,
    yb = g.H - g.padB;
  ctx.save();
  ctx.strokeStyle = '#8e24aa';
  ctx.fillStyle = '#8e24aa';
  ctx.font = '600 9px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const m of S.marks || []) {
    const x = MapsProfile.xOf(g, m.nm * FT_NM);
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.lineTo(x, yb - 6);
    ctx.stroke();
    ctx.fillText(String(m.nm), x, yb - 7);
  }
  // points des voies et balises à moins de 3 NM de la route : petit triangle et nom, au-dessus des marques NM
  const ends = new Map();
  for (const w of S.data?.data?.airways || [])
    for (const e of [w.a, w.b])
      if (e?.id) ends.set(e.id, e);
  for (const n of S.data?.data?.navaids || []) ends.set(n.id, n);
  const own = new Set(S.route.points.map(p => p.id)),
    marks = [];
  for (const e of ends.values()) {
    if (own.has(e.id)) continue; // points de la route : déjà nommés sous le cadre
    const pr = MapsProfile.project(S.prof, e.lat, e.lon);
    if (pr.s != null && pr.offNm <= 3) marks.push({
      id: e.id,
      x: MapsProfile.xOf(g, pr.s)
    });
  }
  marks.sort((a, b) => a.x - b.x);
  ctx.fillStyle = S.theme.fg;
  ctx.strokeStyle = S.theme.fg;
  ctx.font = '600 9px Arial,sans-serif';
  let lastX = -Infinity;
  for (const m of marks) {
    const y = yb - 22,
      w = ctx.measureText(m.id).width / 2 + 2;
    // jamais sur un libellé d'espace déjà posé dans la coupe
    if (m.x - lastX < 30 || (g.taken || []).some(r => m.x - w < r.x1 && m.x + w > r.x0 && y - 14 < r.y1 && y + 3 > r.y0)) continue;
    lastX = m.x;
    ctx.beginPath();
    ctx.moveTo(m.x, y - 4);
    ctx.lineTo(m.x + 3.5, y + 2);
    ctx.lineTo(m.x - 3.5, y + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(m.id, m.x, y - 5);
  }
  ctx.restore();
  drawCursor();
}
/** Curseur sur le profil (trait vertical, point sur l'altitude prévue). */
function drawCursor() {
  if (!S?.pcur || !S.geo) return;
  const {
    W,
    H,
    dpr
  } = fit(S.pcur, S.profBox), ctx = S.pcur.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!S.mission && inFlight()) drawProgressProfile(ctx);
  if (S.cursor == null) return;
  const g = S.geo,
    x = MapsProfile.xOf(g, S.cursor),
    info = MapsProfile.at(S.prof, S.cursor);
  ctx.save();
  ctx.strokeStyle = S.theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, g.padT);
  ctx.lineTo(x, g.H - g.padB);
  ctx.stroke();
  if (info.alt != null) {
    const y = g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(info.alt, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.accent;
    ctx.fill();
  }
  ctx.restore();
}
/** Hauteur lisible (relief, MORA) : toujours en pieds ; un niveau s'écrit par formatLevel (frame/lib/route_text.js). */
const altTxt = ft => `${Math.round(ft).toLocaleString(S.ctx.lang())} ft`;
/** Ligne sous le profil : distance, altitude prévue, relief ou MORA, espaces sous le curseur (notation SIA) ; l'aide sans curseur. */
function strip() {
  if (!S?.stripEl) return;
  let text = '';
  if (S.prof && S.cursor != null) {
    const i = MapsProfile.at(S.prof, S.cursor),
      zones = i.zones.map(z => MapsRender.sia(z)[0]); // notation SIA, comme l'infobulle
    text = [tt(TX.dist, {
      d: i.nm.toFixed(i.nm < 10 ? 1 : 0)
    }), i.alt != null ? tt(TX.planned, {
      a: formatLevel(i.alt)
    }) : '', i.terrain != null ? tt(TX.terrain, {
      h: altTxt(i.terrain)
    }) : Number.isFinite(i.mora) ? tt(TX.mora, {
      h: altTxt(i.mora)
    }) : '', zones.length ? zones.join(', ') : tt(TX.noZoneHere)].filter(Boolean).join(' · ');
  } else if (S.edit?.adding) text = tt(TX.addHint);
  else if (S.edit?.on) text = tt(TX.editHint);
  else if (S.prof) text = tt(TX.hint);
  if (S.stripEl.textContent !== text) {
    S.stripEl.textContent = text;
    S.stripEl.title = text; // la ligne défile sur deux lignes : le texte entier en infobulle
  }
}
/** Curseur commun à la distance s (mètres ; null : effacé). */
function setCursor(s) {
  S.cursor = s;
  drawCursor();
  strip();
  schedule();
}

let frame = 0;
const schedule = () => {
  if (!frame) frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
};
/** Relit les éléments pour l'emprise b (une lecture à la fois ; la dernière demandée gagne). */
async function refresh(b, corridor = true) {
  if (!S || S.loadingFor) {
    if (S) S.pending = [b, corridor];
    return;
  }
  S.loadingFor = b;
  try {
    const got = await loadData(b, corridor).catch(() => ({
      box: b,
      corridor,
      data: {},
      empty: true
    })); // lecture en échec : rien cette fois, relue quand la vue sort de b
    if (!S) return;
    S.data = got;
    status();
  } finally {
    if (S) {
      S.loadingFor = null;
      const next = S.pending;
      S.pending = null;
      if (next && (!within(next[0], S.data?.box) || next[1] !== S.data?.corridor)) refresh(...next);
      else schedule();
    }
  }
}

// ---------------------------------------------------------------- fond à tuiles
/** Fond MapLibre sur l'emprise de la route ; false s'il ne vient pas (pas de réseau, pas de WebGL, hôte refusé). */
async function startTiles() {
  if (navigator.onLine === false) return false;
  const ml = await loadMapLibre();
  if (!ml || !S) return false;
  return new Promise(ok => {
    let map, done = false;
    const finish = v => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (S?.mapNew === map) S.mapNew = null;
      if (!v && map) try {
        map.remove();
      } catch {
        /* déjà retirée */
      }
      ok(v);
    };
    const timer = setTimeout(() => finish(false), TILE_WAIT);
    try {
      map = S.mapNew = new ml.Map({
        container: S.mapEl,
        style: styleFor(),
        bounds: [
          [S.fit.w, S.fit.s],
          [S.fit.e, S.fit.n]
        ],
        fitBoundsOptions: {
          padding: 12
        },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false
      });
    } catch {
      return finish(false); // pas de WebGL
    }
    map.touchZoomRotate.disableRotation();
    map.on('style.load', () => {
      try {
        if (map.getProjection?.()?.type !== 'mercator') map.setProjection({
          type: 'mercator'
        });
      } catch {
        /* version sans projection réglable : Mercator */
      }
      if (S?.map === map) {
        mapSize();
        relief();
        // nouveau style : ses couches de noms de lieux sont à relever et à régler de nouveau
        S.placeIds = null;
        S.placeOff = null;
        baseNames(S.placeWant);
      }
    });
    map.on('error', () => finish(false));
    map.on('load', () => {
      if (!S) return finish(false);
      S.map = map;
      S.mapNew = null;
      mapSize(); // le cadre a pu changer de taille pendant le chargement des tuiles
      relief();
      map.on('move', schedule);
      map.on('moveend', schedule);
      map.on('click', e => {
        if (!S) return;
        if (!S.modeOpts.hidden) return toggleModes(false); // grille des modes ouverte : ce toucher la ferme
        if (!S.layersEl.hidden) return toggleLayers(false); // panneau des couches ouvert : ce toucher le ferme
        closeLv(); // un toucher sur la carte ferme la liste des espaces ; sur des espaces, la suivante la remplace aussitôt
        if (S.edit.on) return editTap(e.point.x, e.point.y);
        // carte d'un point de la route ouverte : ce toucher la ferme ; le contenu d'un terrain, épinglé, reste
        if (!S.mission && vrpTap(e.point.x, e.point.y)) return; // point de report : son terrain (point en tête)
        if (!S.mission && adAt(e.point.x, e.point.y)) return pinAd(adAt(e.point.x, e.point
          .y)); // un autre terrain la remplace
        if (!S.cardEl.hidden) return hideTips();
        // une barbule, un cartouche ou un libellé (posés sur la route ou près d'elle) passent avant le curseur
        if (tipAt(e.point.x, e.point.y)) return mapTip(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y);
        const s = S.prof ? MapsProfile.nearest(S.prof, (lat, lon) => map.project([lon, lat]), e.point.x, e.point.y) : null;
        if (s != null) {
          hideTips();
          return setCursor(s);
        }
        mapTip(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y); // rien dessous : fermée
      });
      // survol à la souris seulement (un toucher est suivi d'événements souris de compatibilité, ignorés) : l'infobulle
      // suit le pointeur sur un cartouche de voie ou un libellé d'espace, et part dès qu'il les quitte
      map.on('mousemove', e => {
        if (S && !fromTouch(e.originalEvent)) hoverMap(e.point.x, e.point.y);
      });
      map.on('mouseout', e => {
        if (!S || fromTouch(e.originalEvent)) return;
        linger('map');
        previewAd(null);
      });
      map.on('movestart', () => {
        hideTips();
        // tout mouvement qui n'est pas un cadrage du module (geste, molette, clavier) est celui de l'utilisateur : sa
        // caméra est gardée par tous les redessins
        if (S && !S.selfMove) {
          S.userMoved = true;
          if (S.follow) setFollow(false);
        }
      });
      finish(true);
    });
  });
}

// ---------------------------------------------------------------- infobulles des espaces (notation SIA)
/** Deux lignes d'une voie : « UN482 LMG → NEPIX », puis distance, routes vraies aller et retour, plancher|plafond et
 *  voie basse ou haute. */
const airwayLines = g => {
  const R = MapsRender,
    high = (+g.lower || 0) >= 19500 || /^U/.test(g.route);
  return [`${g.route} ${g.a?.id || ''} → ${g.b?.id || ''}`, [Number.isFinite(+g.nm) ? `${Math.round(+g.nm)} NM` : '', g.a && g.b ?
    `${R.deg3(R.trackOf(g.a, g.b))} / ${R.deg3(R.trackOf(g.b, g.a))}` : '', `${R.awLimit(g.lower)}|${R.awLimit(g.upper)}`, tt(high ?
      TX.awHigh : TX.awLow)
  ].filter(Boolean).join(' · ')];
};
/** Infobulle de survol (souris) : deux lignes au plus. */
const hoverHtml = (a, b) => `<div><b>${esc(a)}</b></div>${b ? `<div>${esc(b)}</div>` : ''}`;
/** Infobulle de survol qui suit la souris : à 12 px du pointeur, jamais dessous, retenue dans le cadre ; plus légère que
 *  celle du toucher (classe mp-hover). Écritures seulement quand la valeur change. */
function followTip(tip, box, x, y, html) {
  if (tip.innerHTML !== html) tip.innerHTML = html;
  if (!tip.classList.contains('mp-hover')) tip.classList.add('mp-hover');
  if (tip.hidden) tip.hidden = false;
  const r = box.getBoundingClientRect(),
    w = tip.offsetWidth,
    h = tip.offsetHeight,
    G = 12;
  let left = x + G,
    top = y + G;
  if (left + w > r.width - 4) left = x - G - w;
  if (top + h > r.height - 4) top = y - G - h;
  left = `${Math.round(Math.max(4, Math.min(r.width - w - 4, left)))}px`;
  top = `${Math.round(Math.max(4, Math.min(r.height - h - 4, top)))}px`;
  if (tip.style.left !== left) tip.style.left = left;
  if (tip.style.top !== top) tip.style.top = top;
}
/** Survol de la carte en (x, y) : une barbule de vent, le cartouche d'une voie ou le libellé d'un espace sous la
 *  souris, sinon rien (l'infobulle reste 5 s). */
function hoverMap(x, y) {
  const t = tipAt(x, y),
    ad = t || S.mission ? null : adAt(x, y);
  previewAd(ad?.icao || null);
  if (ad) return adHover(ad, x, y);
  if (!t) return linger('map');
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml(t[0], t[1]));
}

// ---------------------------------------------------------------- vents en altitude (lot 6c)
// route.points[].wind de Carburant (modules/fuel/INTEGRATION.md § 3) : { dirDeg, kt, tempC, levelFt, at }, le vent prévu
// au niveau tenu à ce point. Une barbule par point qui en porte un, plus une tous les 50 NM entre deux points qui en
// portent, interpolée composante par composante (vent et température).
const WIND_STEP_NM = 50;
/** Vents à dessiner : [{ lat, lon, dirDeg, kt, tempC, levelFt, at }]. */
function windPoints() {
  const pts = (S.route.flight?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    ok = w => w && Number.isFinite(+w.dirDeg) && Number.isFinite(+w.kt),
    out = [];
  if (!pts.some(p => ok(p.wind))) return out;
  const cum = MapsRender.distances(pts.map(p => ({
      lat: +p.lat,
      lon: +p.lon
    }))),
    uv = w => {
      const r = +w.dirDeg * Math.PI / 180;
      return [- +w.kt * Math.sin(r), - +w.kt * Math.cos(r)]; // vers où souffle le vent (est, nord)
    };
  pts.forEach((p, i) => {
    if (ok(p.wind)) out.push({
      lat: +p.lat,
      lon: +p.lon,
      ...p.wind
    });
    const q = pts[i + 1];
    if (!q || !ok(p.wind) || !ok(q.wind)) return;
    const a = uv(p.wind),
      b = uv(q.wind),
      len = cum[i + 1] - cum[i];
    for (let d = WIND_STEP_NM; d < len - WIND_STEP_NM / 4; d += WIND_STEP_NM) {
      const f = d / len,
        u = a[0] + (b[0] - a[0]) * f,
        v = a[1] + (b[1] - a[1]) * f,
        tA = +p.wind.tempC,
        tB = +q.wind.tempC;
      out.push({
        lat: +p.lat + (+q.lat - +p.lat) * f,
        lon: +p.lon + (+q.lon - +p.lon) * f,
        dirDeg: (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360,
        kt: Math.hypot(u, v),
        tempC: Number.isFinite(tA) && Number.isFinite(tB) ? tA + (tB - tA) * f : null,
        levelFt: p.wind.levelFt,
        at: p.wind.at,
        between: true
      });
    }
  });
  return out;
}
/** Barbule classique au point c : hampe vers d'où vient le vent, barbes du côté des basses pressions (à gauche, dos au
 *  vent, dans l'hémisphère nord ; à droite au sud) : fanion 50 kt, barbe 10 kt, demi-barbe 5 kt ; sous 3 kt, un cercle. */
function drawBarb(ctx, c, w, col, lw = 1.8) {
  const kt = Math.round(+w.kt / 5) * 5,
    L = 30,
    r = +w.dirDeg * Math.PI / 180,
    dx = Math.sin(r),
    dy = -Math.cos(r),
    side = w.lat >= 0 ? 1 : -1,
    nx = -dy * side,
    ny = dx * side;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2.5 + (lw - 1.8) / 2, 0, Math.PI * 2);
  ctx.fill();
  if (kt < 3) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    return ctx.restore();
  }
  const tip = {
    x: c.x + dx * L,
    y: c.y + dy * L
  };
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  let left = kt,
    at = 0;
  const pos = k => ({
      x: tip.x - dx * k,
      y: tip.y - dy * k
    }),
    feather = (k, len) => {
      const p = pos(k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + nx * len + dx * 4, p.y + ny * len + dy * 4);
      ctx.stroke();
    };
  while (left >= 50) {
    const p = pos(at),
      q = pos(at + 6);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + nx * 11 + dx * 2, p.y + ny * 11 + dy * 2);
    ctx.lineTo(q.x, q.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    at += 8;
    left -= 50;
  }
  while (left >= 10) {
    feather(at, 11);
    at += 4.5;
    left -= 10;
  }
  if (left >= 5) feather(at === 0 ? 4.5 : at, 6);
  ctx.restore();
}
/** Barbules de la route ; rend les cadres touchés pour l'infobulle : [{ x, y, w }]. */
function drawWinds(ctx, toC) {
  const list = windPoints(),
    col = S.theme?.dark ? '#b3c7ff' : '#1a237e',
    hits = [];
  for (const w of list) {
    const c = toC(w.lat, w.lon);
    drawBarb(ctx, c, w, S.theme.bg, 5); // liseré du fond : lisible sur les espaces et les voies
    drawBarb(ctx, c, w, col);
    hits.push({
      x: c.x,
      y: c.y,
      w
    });
  }
  return hits;
}
/** Barbule sous (x, y) (hampe comprise : 18 px autour du point). */
const windAt = (x, y) => (S.windHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 18)?.w || null;
/** Deux lignes d'infobulle d'un vent : « Vent 270° / 45 kt », puis température, niveau et heure de la prévision. */
function windLines(w) {
  const t = Number.isFinite(+w.tempC) && w.tempC !== null ? `${Math.round(+w.tempC)} °C` : '',
    l = +w.levelFt > 0 ? formatLevel(+w.levelFt) : '',
    h = fmtZ(w.at);
  return [tt(TX.windTip, {
    d: String(Math.round(+w.dirDeg) % 360 || 360).padStart(3, '0'),
    k: Math.round(+w.kt)
  }), [t, l].filter(Boolean).length || h ? tt(TX.windSub, {
    t: t || '—',
    l: l || '—',
    h: h || '—'
  }) : ''];
}
/** Infobulle de survol quittée (libellé, carte, profil) : elle reste 5 s à sa dernière place, puis part ; un nouveau
 *  survol la remplace, un clic la ferme. */
function linger(k) {
  const tip = k === 'map' ? S.tipEl : S.ptipEl;
  if (tip.hidden || !tip.classList.contains('mp-hover') || S.linger?.[k]) return;
  (S.linger ||= {})[k] = setTimeout(() => {
    if (!S) return;
    S.linger[k] = 0;
    if (tip.classList.contains('mp-hover')) tip.hidden = true;
  }, 5000);
}
/** Survol repris : l'attente de 5 s est annulée. */
function stay(k) {
  if (!S?.linger?.[k]) return;
  clearTimeout(S.linger[k]);
  S.linger[k] = 0;
}
/** Infobulle du toucher (ou du clic) dans un cadre (carte ou profil), à la position (x, y) du cadre ; reste jusqu'au
 *  toucher suivant ; écrite seulement si elle change. */
function showTip(tip, box, x, y, html) {
  if (tip.classList.contains('mp-hover')) tip.classList.remove('mp-hover');
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.hidden = false;
  const r = box.getBoundingClientRect(),
    w = tip.offsetWidth,
    h = tip.offsetHeight;
  tip.style.left = `${Math.max(4, Math.min(r.width - w - 4, x + 10))}px`;
  // au-dessus du doigt, sinon dessous ; toujours dans le cadre (une carte haute remonte)
  tip.style.top = `${Math.max(4, Math.min(r.height - h - 4, y - h - 10 < 4 ? y + 14 : y - h - 10))}px`;
}
/** Dernier toucher dans le module : les événements souris qui le suivent (compatibilité) ne sont pas un survol. */
let touchAt = -1e9;
const fromTouch = e => !!e?.sourceCapabilities?.firesTouchEvents || performance.now() - touchAt < 1000;
const hideTips = () => {
  if (S?.cardEl && !S.cardEl.hidden) S.cardEl.hidden = true;
  for (const k of ['map', 'prof']) stay(k);
  if (S?.tipEl) S.tipEl.hidden = true;
  if (S?.ptipEl) S.ptipEl.hidden = true;
};
// ---------------------------------------------------------------- modifier la route sur la carte (lot 6a)
// Mode « Modifier » explicite (téléphone comme poste) : un appui à moins de 22 px d'un point tournant le fait glisser
// (le déplacement de la carte est coupé pour ce geste seulement), lâché sur un fixe, une balise ou un terrain à moins de
// 20 px il y prend place, ailleurs il revient ; un toucher sur un fixe hors de la route l'insère dans le tronçon qu'il
// allonge le moins ; un toucher sur un point de la route ouvre sa carte (niveau, « Retirer »). Départ et arrivée ne
// bougent pas ici. « Annuler » reprend le dernier geste (20 au plus). Chaque geste est montré tout de suite, puis
// l'enregistrement du vol courant est écrit 400 ms après le dernier (points et texte ensemble, by 'maps' ; Carburant
// refait le devis — modules/fuel/INTEGRATION.md § 3).
const HIT = 22,
  SNAP = 20;
/** Points de l'enregistrement (positions résolues) : la route telle qu'elle est écrite. */
const rawPoints = () => (S.route.flight?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon));
/** Point de la route sous (x, y) : son rang, ou null ; movable : sans le départ ni l'arrivée. */
function pointAt(x, y, movable = false) {
  const pts = rawPoints();
  let best = null,
    bd = HIT;
  pts.forEach((p, i) => {
    if (movable && (i === 0 || i === pts.length - 1)) return;
    const q = S.toC(+p.lat, +p.lon),
      d = Math.hypot(q.x - x, q.y - y);
    if (d <= bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
/** Points où se poser : balises, terrains, points des voies, points RNAV et de report de la vue (données lues). */
function anchors() {
  const d = S.data?.data;
  if (!d) return [];
  if (S.edit.anchorsFor === d) return S.edit.anchors;
  const out = [],
    add = (id, lat, lon, kind) => {
      if (id && Number.isFinite(+lat) && Number.isFinite(+lon)) out.push({
        id: String(id),
        lat: +lat,
        lon: +lon,
        kind
      });
    };
  for (const n of d.navaids || []) add(n.id, n.lat, n.lon, 'navaid');
  for (const a of d.aerodromes || []) add(a.icao || a.id, a.lat, a.lon, 'aerodrome');
  for (const w of d.airways || [])
    for (const e of [w.a, w.b]) add(e?.id, e?.lat, e?.lon, 'fix');
  for (const p of d.points || []) add(p.id, p.lat, p.lon, 'fix');
  for (const v of d.vrp || []) add(v.id || v.name, v.lat, v.lon, 'vrp');
  S.edit.anchorsFor = d;
  return S.edit.anchors = out;
}
/** Position géographique sous (x, y) de la carte (MapLibre, sinon le Mercator du fond uni) ; null sans carte. */
function llAt(x, y) {
  if (S.map) {
    const p = S.map.unproject([x, y]);
    return {
      lat: Math.round(p.lat * 1e6) / 1e6,
      lon: Math.round(p.lng * 1e6) / 1e6
    };
  }
  const r = S.box.getBoundingClientRect();
  return r.width ? MapsRender.mercator(S.fit, r.width, r.height, 12).toLL(x, y) : null;
}
/** Point où se poser le plus proche de (x, y), à moins de SNAP px ; null sinon. */
function snapAt(x, y) {
  let best = null,
    bd = SNAP;
  for (const a of anchors()) {
    const q = S.toC(a.lat, a.lon),
      d = Math.hypot(q.x - x, q.y - y);
    if (d <= bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}
/** Mode Modifier ouvert ou fermé. */
function setEdit(on) {
  S.edit.on = on;
  S.edit.drag = null;
  S.editBtn.setAttribute('aria-pressed', String(on));
  const label = tt(on ? TX.editDone : TX.editMode);
  if (S.editBtn.textContent !== label) S.editBtn.textContent = label;
  S.undoBtn.hidden = !on;
  S.addBtn.hidden = !on;
  setAdding(false);
  if (S.el.classList.contains('mp-editing') !== on) S.el.classList.toggle('mp-editing', on);
  S.undoBtn.disabled = !S.edit.undo.length;
  hideTips();
  strip();
  schedule();
}
const NM_KM = 1.852;
/** Identifiant OACI de coordonnées (4530N00030E) d'un point sans nom utilisable. */
const coordId = p => icaoCoord(+p.lat, +p.lon);
/** Geste appliqué : nouveaux points de l'enregistrement, montrés tout de suite, écrits 400 ms après le dernier geste. */
function commit(points, levelFt = null) {
  const f = S.route.flight || {},
    pts = points.map(p => ({
      ...p,
      lat: Math.round(+p.lat * 1e6) / 1e6,
      lon: Math.round(+p.lon * 1e6) / 1e6
    })),
    dist = pts.length >= 2 ? MapsRender.distances(pts.map(p => ({
      lat: +p.lat,
      lon: +p.lon
    }))).pop() : 0,
    rec = {
      ...f,
      route: {
        ...(f.route || {}),
        points: pts,
        // texte de Carburant refait depuis les points (frame/lib/route_text.js) : les voies des tronçons restés intacts
        // sont gardées, seule celle d'un tronçon modifié tombe
        text: textFromPoints(pts, f.route?.text || '', f.route?.points || null),
        distanceNm: Math.round(dist * 10) / 10,
        trackDeg: pts.length >= 2 ? Math.round(MapsRender.trackOf(pts[0], pts[pts.length - 1])) : f.route?.trackDeg,
        from: 'points',
        manual: false
      },
      ...(levelFt > 0 ? {
        level: {
          ...(f.level || {}),
          ft: levelFt
        }
      } : {}),
      by: 'maps',
      updated_at: new Date().toISOString()
    };
  S.route = {
    ...S.route,
    flight: rec,
    points: pointsOf(rec),
    levelFt: +rec.level?.ft || 0,
    updated: rec.updated_at
  };
  S.marks = MapsRender.marks(S.route.points);
  S.undoBtn.disabled = !S.edit.undo.length;
  header();
  schedule();
  buildProfile();
  clearTimeout(S.edit.saveT);
  S.edit.saveT = setTimeout(() => saveRoute(rec), 400);
}
/** Écrit la route sur la dernière version de l'enregistrement (un champ d'un autre module n'est jamais perdu). */
async function saveRoute(rec) {
  try {
    const path = flightPath(),
      cur = (await S.ctx.data.get(path).catch(() => null)) || {};
    // règle commune du vol courant (frame/lib/current_flight.js, modules/fuel/INTEGRATION.md § 3) : la carte ne remplace
    // que route et level, relus juste avant ; jamais progress (le prévu est à Carburant, la position réelle au cadre)
    const next = merge(cur, {
      route: {
        ...(cur.route || {}),
        ...rec.route
      },
      ...(rec.level ? {
        level: {
          ...(cur.level || {}),
          ...rec.level
        }
      } : {})
    }, {
      fields: rec.level ? ['route', 'level'] : ['route'],
      by: 'maps'
    });
    next.updated_at = rec.updated_at; // la version montrée (la vue en direct ne reprend qu'une version plus récente)
    await S.ctx.data.put(path, next);
  } catch (e) {
    S.ctx.notify?.(tt(TX.saveFailed, {
      m: e?.message || String(e)
    }), 'err');
  }
}
/** Geste : l'état d'avant gardé pour « Annuler » (20 au plus). */
function remember() {
  S.edit.undo.push({
    points: structuredClone(rawPoints()),
    level: +S.route.flight?.level?.ft || 0
  });
  if (S.edit.undo.length > 20) S.edit.undo.shift();
}
/** Point i posé sur a (son nom et sa position ; le niveau tenu à partir du point est gardé). */
function movePoint(i, a) {
  const pts = rawPoints(),
    old = pts[i];
  remember();
  pts[i] = {
    id: a.id,
    lat: a.lat,
    lon: a.lon,
    ...(old?.alt_ft != null ? {
      alt_ft: old.alt_ft
    } : {})
  };
  commit(pts);
}
/** Point a inséré dans le tronçon qu'il allonge le moins. */
function insertPoint(a) {
  const pts = rawPoints();
  if (pts.length < 2) return;
  const gc = (p, q) => MapsRender.distances([p, q]).pop();
  let at = 1,
    best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = {
        lat: +pts[i].lat,
        lon: +pts[i].lon
      },
      q = {
        lat: +pts[i + 1].lat,
        lon: +pts[i + 1].lon
      },
      add = gc(p, a) + gc(a, q) - gc(p, q);
    if (add < best) {
      best = add;
      at = i + 1;
    }
  }
  remember();
  pts.splice(at, 0, {
    id: a.id,
    lat: a.lat,
    lon: a.lon
  });
  commit(pts);
}
/** Point i retiré (jamais le départ ni l'arrivée). */
function removePoint(i) {
  const pts = rawPoints();
  if (i <= 0 || i >= pts.length - 1) return;
  remember();
  pts.splice(i, 1);
  commit(pts);
}
/** Dernier geste repris. */
function undoEdit() {
  const prev = S.edit.undo.pop();
  if (!prev) return;
  hideTips();
  commit(prev.points, prev.level);
}
/** Niveau tenu sur le tronçon qui part du point i : celui du point s'il en porte un, sinon le précédent, sinon le niveau
 *  du vol. */
function heldLevel(i) {
  const pts = rawPoints();
  let l = +S.route.flight?.level?.ft || 0;
  for (let k = 1; k <= i && k < pts.length - 1; k++)
    if (+pts[k].alt_ft > 0) l = +pts[k].alt_ft;
  return l;
}
/** Niveau ft tenu à partir du point i (paliers de FL10) : au départ, le niveau du vol ; ailleurs alt_ft, retiré quand il
 *  redevient celui du tronçon précédent. */
function setLevel(i, ft) {
  const pts = rawPoints();
  ft = Math.max(1000, Math.round(ft / 1000) * 1000);
  if (i < 0 || i >= pts.length - 1 || ft === heldLevel(i)) return;
  remember();
  if (i === 0) return commit(pts, ft);
  const p = {
    ...pts[i]
  };
  if (ft === heldLevel(i - 1)) delete p.alt_ft;
  else p.alt_ft = ft;
  pts[i] = p;
  commit(pts);
}
/** Tronçon du profil sous la distance s (unités de la coupe) : rang du point qui l'ouvre et bornes [s0, s1]. */
function segmentAt(sDist) {
  const pts = rawPoints().map(p => ({
      lat: +p.lat,
      lon: +p.lon
    })),
    cum = MapsRender.distances(pts),
    tot = cum[cum.length - 1] || 1,
    k = S.geo.total / tot;
  for (let i = 0; i < pts.length - 1; i++)
    if (sDist <= cum[i + 1] * k || i === pts.length - 2) return {
      i,
      s0: cum[i] * k,
      s1: cum[i + 1] * k
    };
  return null;
}
/** Altitude (ft) à la hauteur y du profil, et l'inverse. */
const altAtY = (g, y) => g.bottom + (1 - (y - g.padT) / (g.H - g.padT - g.padB)) * (g.top - g.bottom);
const yAtAlt = (g, a) => g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(a, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
/** Palier en cours de glisser sur le profil : trait tireté du tronçon au nouveau niveau, et son nom. */
function drawLevelDrag() {
  const d = S.edit.ldrag;
  if (!d?.moved || !S.geo) return;
  const g = S.geo,
    ctx = S.pcur.getContext('2d'),
    x0 = MapsProfile.xOf(g, d.s0),
    x1 = MapsProfile.xOf(g, d.s1),
    y = yAtAlt(g, d.ft);
  ctx.save();
  ctx.strokeStyle = S.theme.accent;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '700 13px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = S.theme.bg;
  ctx.lineWidth = 3;
  const t = formatLevel(d.ft);
  ctx.strokeText(t, (x0 + x1) / 2, y - 4);
  ctx.fillStyle = S.theme.accent;
  ctx.fillText(t, (x0 + x1) / 2, y - 4);
  ctx.restore();
}
/** Gestes du mode Modifier sur le profil : glisser verticalement règle le palier du tronçon touché ; un toucher sans
 *  glisser place le curseur comme d'habitude. */
function levelGestures() {
  const pos = e => {
    const r = S.profBox.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  S.profBox.addEventListener('pointerdown', e => {
    if (!S.edit.on || !S.geo || e.button > 0 || e.target.closest('.mp-tip')) return;
    const [x, y] = pos(e),
      seg = segmentAt(MapsProfile.sOf(S.geo, x));
    if (!seg) return;
    e.stopPropagation();
    e.preventDefault();
    S.edit.ldrag = {
      ...seg,
      id: e.pointerId,
      x,
      y0: y,
      ft: heldLevel(seg.i),
      moved: false
    };
    try {
      S.profBox.setPointerCapture(e.pointerId);
    } catch {
      /* capture refusée : le glisser suit tant que le doigt reste sur le profil */
    }
  }, true);
  S.profBox.addEventListener('pointermove', e => {
    const d = S.edit.ldrag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    const [, y] = pos(e);
    if (!d.moved && Math.abs(y - d.y0) > 6) d.moved = true;
    if (!d.moved) return;
    d.ft = Math.max(1000, Math.min(S.geo.top, Math.round(altAtY(S.geo, y) / 1000) * 1000));
    drawCursor();
    drawLevelDrag();
  }, true);
  const end = e => {
    const d = S.edit.ldrag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    S.edit.ldrag = null;
    if (e.type === 'pointercancel') return drawCursor();
    if (d.moved) setLevel(d.i, d.ft);
    else setCursor(MapsProfile.sOf(S.geo, d.x));
    drawCursor();
  };
  S.profBox.addEventListener('pointerup', end, true);
  S.profBox.addEventListener('pointercancel', end, true);
}
/** Carte d'un point de la route : nom, rôle ou niveau, « Retirer » (sauf départ et arrivée). */
function openCard(i) {
  const pts = rawPoints(),
    p = pts[i];
  if (!p) return;
  const end = i === 0 || i === pts.length - 1,
    lvl = +p.alt_ft > 0 ? tt(TX.ptLevel, {
      l: formatLevel(+p.alt_ft)
    }) : tt(TX.ptSame),
    held = i < pts.length - 1 ? heldLevel(i) : 0,
    step = held ? `<div class="mp-lvl"><button type="button" class="f-btn" data-lvl="${i}" data-d="-1000" aria-label="${esc(tt(TX.lvlDown))}" title="${esc(tt(TX.lvlDown))}">−</button><b>${esc(formatLevel(held))}</b><button type="button" class="f-btn" data-lvl="${i}" data-d="1000" aria-label="${esc(tt(TX.lvlUp))}" title="${esc(tt(TX.lvlUp))}">+</button></div>` : '',
    html = `<div><b>${esc(p.id || coordId(p))}</b></div><div class="f-muted">${esc(i === 0 ? tt(TX.ptDep) : end ? tt(TX.ptArr) : lvl)}</div>${step}${end ? '' : `<button type="button" class="f-btn" data-remove="${i}">${esc(tt(TX.remove))}</button>`}`,
    q = S.toC(+p.lat, +p.lon);
  hideTips();
  showTip(S.cardEl, S.box, q.x, q.y, html);
}
/** Toucher dans le mode Modifier : un point de la route ouvre sa carte, un fixe hors de la route s'insère. */
function editTap(x, y) {
  if (performance.now() - (S.edit.tapGuard || 0) < 450) return; // clic qui suit un glisser : déjà traité
  if (!S.cardEl.hidden) return hideTips();
  const i = pointAt(x, y);
  if (i != null) return openCard(i);
  if (!S.edit.adding) return mapTip(...llOf(x, y), x, y); // toucher simple : l'infobulle, jamais d'ajout
  addAt(x, y);
}
/** Ajoute le fixe, la balise ou le terrain sous (x, y), sinon un point libre nommé par ses coordonnées OACI (mode « + »
 *  ou appui long : le geste est voulu) ; le mode « + » se referme. */
function addAt(x, y) {
  const ll = llAt(x, y),
    a = snapAt(x, y) || (ll ? {
      id: icaoCoord(ll.lat, ll.lon),
      lat: ll.lat,
      lon: ll.lon
    } : null);
  if (a && !rawPoints().some(p => p.id === a.id && Math.abs(+p.lat - a.lat) < 1e-3 && Math.abs(+p.lon - a.lon) < 1e-3)) insertPoint(a);
  setAdding(false);
}
/** Position (lat, lon) sous (x, y), pour l'infobulle. */
const llOf = (x, y) => {
  const p = llAt(x, y);
  return p ? [p.lat, p.lon] : [0, 0];
};
/** Mode « + » : le prochain toucher ajoute un point. */
function setAdding(on) {
  S.edit.adding = on;
  if (S.addBtn.getAttribute('aria-pressed') !== String(on)) S.addBtn.setAttribute('aria-pressed', String(on));
  strip();
}
/** Poignées des points tournants, élastique et point visé pendant un glisser. */
function drawEdit(ctx, toC) {
  const pts = rawPoints(),
    acc = S.theme.accent,
    d = S.edit.drag;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = acc;
  pts.forEach((p, i) => {
    if (i === 0 || i === pts.length - 1 || d?.i === i) return;
    const q = toC(+p.lat, +p.lon);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  });
  if (d?.moved) {
    const a = toC(+pts[d.i - 1].lat, +pts[d.i - 1].lon),
      b = toC(+pts[d.i + 1].lat, +pts[d.i + 1].lon),
      at = d.snap ? toC(d.snap.lat, d.snap.lon) : {
        x: d.x,
        y: d.y
      };
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(at.x, at.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(at.x, at.y, d.snap ? 12 : 7, 0, Math.PI * 2);
    ctx.fillStyle = MapsRender.withAlpha(acc, d.snap ? .3 : .15);
    ctx.fill();
    ctx.stroke();
    // nom du point visé, sinon celui du point libre (coordonnées OACI)
    const ll = d.snap ? null : llAt(d.x, d.y),
      name = d.snap ? d.snap.id : ll ? icaoCoord(ll.lat, ll.lon) : '';
    if (name) {
      ctx.font = '700 12px Arial,sans-serif';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(name, at.x + 15, at.y - 12);
      ctx.fillStyle = acc;
      ctx.fillText(name, at.x + 15, at.y - 12);
    }
  }
  ctx.restore();
}
/** Gestes du mode Modifier sur la carte : appui sur un point tournant (capture, avant MapLibre), glisser, lâcher. */
function editGestures() {
  const pos = e => {
    const r = S.box.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const ui = e => e.target.closest('.mp-modes, .mp-tip, .mp-layers, .mp-layers-btn, .mp-editbar');
  S.box.addEventListener('pointerdown', e => {
    if (!S.edit.on || e.button > 0 || !S.toC || ui(e)) return;
    const [x, y] = pos(e),
      i = pointAt(x, y, true);
    if (i == null) return;
    e.stopPropagation();
    e.preventDefault();
    S.edit.drag = {
      i,
      id: e.pointerId,
      x0: x,
      y0: y,
      x,
      y,
      moved: false,
      snap: null
    };
    hideTips();
    try {
      S.box.setPointerCapture(e.pointerId);
    } catch {
      /* capture refusée : le glisser suit quand même tant que le doigt reste sur la carte */
    }
  }, true);
  // le geste commencé sur un point n'est pas un déplacement de la carte (MapLibre écoute mousedown et touchstart)
  for (const t of ['mousedown', 'touchstart', 'touchmove']) S.box.addEventListener(t, e => {
    if (!S.edit.drag) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }, {
    capture: true,
    passive: false
  });
  S.box.addEventListener('pointermove', e => {
    const d = S.edit.drag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    [d.x, d.y] = pos(e);
    if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) > 6) d.moved = true;
    d.snap = d.moved ? snapAt(d.x, d.y) : null;
    schedule();
  }, true);
  const end = e => {
    const d = S.edit.drag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    S.edit.drag = null;
    S.edit.tapGuard = performance.now();
    if (e.type === 'pointercancel') return schedule();
    if (!d.moved) openCard(d.i);
    else if (d.snap) movePoint(d.i, d.snap);
    else {
      // loin de tout point où se poser : point libre, nommé par ses coordonnées OACI (VFR, hélicoptère)
      const ll = llAt(d.x, d.y);
      if (ll) movePoint(d.i, {
        id: icaoCoord(ll.lat, ll.lon),
        lat: ll.lat,
        lon: ll.lon
      });
    }
    schedule();
  };
  S.box.addEventListener('pointerup', end, true);
  S.box.addEventListener('pointercancel', end, true);
  S.editBtn.addEventListener('click', () => setEdit(!S.edit.on));
  S.addBtn.addEventListener('click', () => setAdding(!S.edit.adding));
  // appui long (500 ms) hors d'un point de la route : ajout là où le doigt reste
  let longT = 0,
    longAt = null;
  S.box.addEventListener('pointerdown', e => {
    clearTimeout(longT);
    if (!S.edit.on || S.edit.drag || e.button > 0 || ui(e)) return;
    const [x, y] = pos(e);
    longAt = [x, y];
    longT = setTimeout(() => {
      if (!longAt || S.edit.drag) return;
      S.edit.tapGuard = performance.now() + 300; // le toucher qui finit l'appui long n'est pas un toucher simple
      addAt(...longAt);
      longAt = null;
    }, 500);
  });
  S.box.addEventListener('pointermove', e => {
    if (!longAt) return;
    const [x, y] = pos(e);
    if (Math.hypot(x - longAt[0], y - longAt[1]) > 8) {
      clearTimeout(longT);
      longAt = null;
    }
  });
  for (const t of ['pointerup', 'pointercancel']) S.box.addEventListener(t, () => {
    clearTimeout(longT);
    longAt = null;
  });
  // l'appui long n'ouvre pas le menu du navigateur pendant le mode Modifier
  S.box.addEventListener('contextmenu', e => {
    if (S.edit.on && !ui(e)) e.preventDefault();
  });
  S.undoBtn.addEventListener('click', undoEdit);
  S.cardEl.addEventListener('click', e => {
    const lv = e.target.closest('[data-lvl]');
    if (lv) {
      const i = +lv.dataset.lvl;
      setLevel(i, heldLevel(i) + +lv.dataset.d);
      return openCard(i); // la carte reste ouverte, niveau à jour
    }
    const i = e.target.closest('[data-remove]')?.dataset.remove;
    if (i == null) return;
    hideTips();
    removePoint(+i);
  });
}
/** Ce qu'il y a sous (x, y) pour l'infobulle : barbule de vent, cartouche de voie, libellé d'espace ; avec area, les
 *  espaces sous le point (lat, lon) en dernier (toucher, clic). Deux lignes, ou null. */
function tipAt(x, y, lat = null, lon = null) {
  const w = windAt(x, y);
  if (w) return windLines(w);
  const vp = (S.vfrHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 9)?.p;
  if (vp) return [
    [vp.code, vp.name].filter(Boolean).join(' '), [vp.vacCode && vp.vacCode !== vp.code ? tt(TX.vfrVacCode, {
      c: vp.vacCode
    }) : '', vp.restrictions.join(' ; ')].filter(Boolean).join(' · ')
  ];
  const g = MapsRender.airwaysAt(S.awHits, x, y)[0];
  if (g) return airwayLines(g);
  const nv = (S.navHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 9);
  if (nv) return [navName(nv.n), nv.merged.length ? tt(TX.navAlso, {
    l: nv.merged.map(navName).join(', ')
  }) : nv.n.name || ''];
  const z = (S.zoneHits || []).find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
  if (z) return MapsRender.sia(z.a);
  if (lat == null) return null;
  const l = MapsRender.airspacesAt(S.data?.data?.airspaces || [], lat, lon).map(a => MapsRender.sia(a)[0]);
  return l.length ? [l[0], l.length > 2 ? `${l[1]} ${tt(TX.tipMore, {
    n: l.length - 2
  })}` : l[1] || ''] : null;
}
// ---------------------------------------------------------------- points de report VFR d'un terrain (VAC)
// Survol d'un terrain (souris) : aperçu de ses points de report et de ses séquences ; toucher : épinglé, avec son contenu dans le bloc de données
// (séquences en texte, consignes des VAC repliées par page), jusqu'à ✕, Échap ou un autre terrain ; en mode VFR, départ et
// arrivée épinglés d'office (dessin seul). Données : aerodb.vfrRoutes (sia/vfr/<OACI>.json), candidats tirés des VAC,
// toujours en tirets et marqués « à vérifier », jamais un itinéraire publié ni un sens de parcours.
const VFR_COL = '#00897b'; // séquences et tracés tirés des VAC (les points de report : MapsRender.vrpColor)
/** Terrain dessiné sous (x, y), à 22 px près (une cible de doigt) ; null sinon. */
function adAt(x, y) {
  let best = null,
    bd = 22;
  for (const h of S.adHits || []) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d <= bd && h.a?.icao) {
      bd = d;
      best = h.a;
    }
  }
  return best;
}
/** Point de report sous (x, y), à 22 px près, plus proche qu'un terrain : { ad (le terrain à épingler, ou null), code,
 *  name, id } ; null sinon. Points surlignés d'un terrain (leur terrain est connu), puis ceux de la couche des VRP (le
 *  terrain de leur préfixe, « BD- » pour LFBD, à 30 NM au plus, sinon le plus proche à 5 NM). */
function vrpAt(x, y) {
  const d = h => Math.hypot(h.x - x, h.y - y),
    a = adAt(x, y),
    da = a ? d((S.adHits || []).find(h => h.a === a)) : Infinity,
    hl = (S.vfrHits || []).filter(h => d(h) <= 22).sort((p, q) => d(p) - d(q))[0],
    ly = (S.vrpHits || []).filter(h => d(h) <= 22).sort((p, q) => d(p) - d(q))[0],
    best = [hl && [d(hl), hl], ly && [d(ly), ly]].filter(Boolean).sort((p, q) => p[0] - q[0])[0];
  if (!best || best[0] >= da) return null;
  const h = best[1];
  if (h.icao) return {
    ad: h.icao,
    id: h.p.id,
    code: h.p.code,
    name: h.p.name
  };
  const v = h.v,
    nm = (p, q) => Math.hypot(+p.lat - +q.lat, (+p.lon - +q.lon) * Math.cos(+p.lat * Math.PI / 180)) * 60,
    ads = [...(S.adHits || []).map(x => x.a), ...(S.data?.data?.aerodromes || [])].filter(x => /^[A-Z]{4}$/.test(x?.icao || '')),
    pre = String(v.id).split('-')[0],
    own = ads.filter(x => x.icao.slice(2) === pre && nm(x, v) <= 30).sort((p, q) => nm(p, v) - nm(q, v))[0],
    near = ads.filter(x => nm(x, v) <= 5).sort((p, q) => nm(p, v) - nm(q, v))[0],
    ad = own || near;
  return {
    ad: ad?.icao || null,
    adRec: ad || null,
    id: v.id,
    code: String(v.id).startsWith(`${pre}-`) ? String(v.id).slice(pre.length + 1).replace(/^H-/, '') : v.id,
    name: v.name || ''
  };
}
/** Toucher d'un point de report : son terrain épinglé (le point en tête de sa liste), ou, sans terrain, l'infobulle du
 *  point seul. Vrai si traité. */
function vrpTap(x, y) {
  const t = vrpAt(x, y);
  if (!t) return false;
  const a = t.adRec || (S.adHits || []).find(h => h.a.icao === t.ad)?.a || (S.data?.data?.aerodromes || []).find(x => x.icao === t.ad) || (
    t.ad ? {
      icao: t.ad,
      ...adPos(t.ad)
    } : null);
  if (!a || !Number.isFinite(+a.lat)) {
    stay('map');
    followTip(S.tipEl, S.box, x, y, hoverHtml([t.code, t.name].filter(Boolean).join(' '), ''));
    linger('map');
    return true;
  }
  pinAd(a, t.id);
  return true;
}
/** Position d'un terrain : celle de la carte (terrains dessinés, données lues), sinon celle des points de la route. */
function adPos(icao) {
  const a = (S.adHits || []).find(h => h.a.icao === icao)?.a || (S.data?.data?.aerodromes || []).find(x => x.icao === icao) || (S.route
    ?.points || []).find(p => p.id === icao);
  return a && Number.isFinite(+a.lat) && Number.isFinite(+a.lon) ? {
    lat: +a.lat,
    lon: +a.lon,
    name: a.name || ''
  } : null;
}
/** Points de report de la base publiée pour un terrain (aerodb.vrp) : ceux dont l'identifiant porte son préfixe
 *  (« MN- » pour LFMN), à 30 NM au plus ; à défaut, ceux à moins de 15 NM. Lus une fois par terrain ; [{ id, code, name,
 *  lat, lon }] ; undefined pendant la lecture. */
function baseVrpOf(icao) {
  const m = S.vrpBase ||= new Map();
  if (m.has(icao)) return m.get(icao);
  const at = adPos(icao);
  if (!at) return [];
  m.set(icao, undefined);
  Promise.resolve(S.ctx.aerodb?.vrp?.({
    lat: at.lat,
    lon: at.lon,
    radiusNm: 30
  })).then(list => {
    if (!S) return;
    const pre = `${icao.slice(2)}-`,
      nm = v => Math.hypot(+v.lat - at.lat, (+v.lon - at.lon) * Math.cos(at.lat * Math.PI / 180)) * 60,
      all = (list || []).filter(v => v?.id),
      own = all.filter(v => v.id.startsWith(pre)),
      rows = (own.length ? own : all.filter(v => nm(v) <= 15)).map(v => ({
        id: v.id,
        // code tel que l'écrit la VAC : « HE » pour MN-H-HE (la couleur dit l'hélicoptère)
        code: (v.id.startsWith(pre) ? v.id.slice(pre.length) : MapsRender.vrpCode(v.id)).replace(/^H-/, ''),
        name: v.name || '',
        lat: +v.lat,
        lon: +v.lon
      })).sort((x, y) => x.code.localeCompare(y.code));
    m.set(icao, rows);
    schedule();
    if (S.vfrPin === icao && S.vfrCard) pinView(icao);
  }, () => S && m.set(icao, []));
  return undefined;
}
/** Compilation VAC d'un terrain (aerodb.vfrRoutes ; lue une fois par terrain ; null sans import) ; redessin à l'arrivée. */
function vfrOf(icao) {
  const m = S.vfr ||= new Map();
  if (!m.has(icao)) {
    m.set(icao, undefined);
    Promise.resolve(S.ctx.aerodb?.vfrRoutes?.(icao)).then(v => {
      if (!S) return;
      m.set(icao, v || null);
      schedule();
      if (S.vfrPin === icao && S.vfrCard) pinView(icao);
    }, () => S && m.set(icao, null));
  }
  return m.get(icao);
}
/** Séquences d'un terrain, une fois chacune (même suite, même page : tableau bilingue, plusieurs pistes). */
const seqsOf = v => [...new Map((v?.routes || []).map(r => [`${r.key || ''}|${r.codes.join('-')}|${pagesOf(r).join(',')}`, r])).values()];
/** Pages de la VAC d'une séquence (format 2 : pages ; format 1 : page). */
const pagesOf = r => Array.isArray(r.pages) ? r.pages : r.page ? [r.page] : [];
/** Points de report de la compilation (sans le point de référence du terrain ni les sommets de tracé de l'analyse). */
const reportOf = v => (v?.points || []).filter(p => !p.role || p.role === 'reporting_point');
/** Points de report d'un terrain à montrer : ceux de la base, puis ceux des VAC qui n'y sont pas ; chacun avec ses
 *  restrictions lues dans les VAC. [{ id, code, name, lat, lon, restrictions }] */
function reportPoints(icao) {
  const base = baseVrpOf(icao) || [],
    v = vfrOf(icao),
    vac = reportOf(v),
    ids = new Set(base.map(b => b.id)),
    nm = (a, b) => Math.hypot(+a.lat - +b.lat, (+a.lon - +b.lon) * Math.cos(+a.lat * Math.PI / 180)) * 60,
    // VRP de la base d'un point VAC : son identifiant rapproché à l'import, sinon le plus proche à 0,6 NM au plus (une
    // compilation importée avant le rapprochement des points hélicoptères, un code écrit autrement)
    twin = p => p.vrp && ids.has(p.vrp) ? p.vrp : base.map(b => [b, nm(b, p)]).filter(([, d]) => d <= .6).sort((a, b) => a[1] - b[1])[0]?.[
      0
    ]
    .id,
    byId = new Map();
  for (const p of vac) {
    const id = twin(p);
    if (id && !byId.has(id)) byId.set(id, p);
  }
  return [...base.map(b => ({
    ...b,
    vacCode: byId.get(b.id)?.code || '',
    restrictions: byId.get(b.id)?.restrictions || []
  })), ...vac.filter(p => !twin(p)).map(p => ({
    id: p.vrp || `${icao.slice(2)}-${p.code}`,
    code: p.code,
    name: '',
    lat: +p.lat,
    lon: +p.lon,
    restrictions: p.restrictions || []
  }))];
}
/** Ligne d'état d'un terrain : ses points de report, et les séquences VAC (ou « non importées »). */
function adCounts(icao) {
  const v = vfrOf(icao),
    n = reportPoints(icao).length;
  return [tt(TX.vfrBaseCount, {
    n
  }), v ? tt(TX.vfrSeqCount, {
    r: seqsOf(v).length
  }) : v === null ? tt(TX.vfrNoVac) : ''].filter(Boolean).join(' · ');
}
/** Aperçu au survol (un terrain, ou null) ; redessin seulement s'il change. */
function previewAd(icao) {
  if ((S.vfrPreview || null) === icao) return;
  S.vfrPreview = icao;
  if (icao) {
    vfrOf(icao);
    baseVrpOf(icao);
  }
  schedule();
}
/** Infobulle de survol d'un terrain : son code, son nom, ses points de report et ses séquences VAC. */
function adHover(a, x, y) {
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml([a.icao, a.name].filter(Boolean).join(' '), tt(TX.vfrHover, {
    c: adCounts(a.icao)
  })));
}
/** Terrain épinglé (toucher) : surbrillance gardée et son contenu dans le bloc de données. */
function pinAd(a, focus = null) {
  hideTips();
  S.vfrPin = a.icao;
  S.vfrCard = {
    name: a.name || '',
    lat: +a.lat,
    lon: +a.lon,
    focus // identifiant du point de report touché : en tête de la liste, en gras
  };
  vfrOf(a.icao);
  baseVrpOf(a.icao);
  pinView(a.icao);
  schedule();
}
/** Terrain épinglé : la carte se rapproche de ses points de report s'ils sont serrés à l'écran (moins de 160 px ; c'est
 *  le geste de l'utilisateur, la caméra reste ensuite la sienne), et son contenu s'ouvre dans le bloc de données
 *  (« … » tant que la base ou la compilation sont en lecture). */
function pinView(icao) {
  const c = S.vfrCard;
  if (!c) return;
  if (S.vfrZoomed === icao || baseVrpOf(icao) === undefined || vfrOf(icao) === undefined || !S.map) return showAdCard(icao);
  S.vfrZoomed = icao; // une seule fois par épinglage
  const pts = [...reportPoints(icao), ...(vfrOf(icao)?.points || []).filter(p => p.role === 'intermediate_waypoint'), c].filter(p => Number
    .isFinite(+p.lat) && Number.isFinite(+p.lon));
  if (pts.length < 2) return showAdCard(icao);
  const px = pts.map(p => S.map.project([+p.lon, +p.lat])),
    span = Math.max(Math.max(...px.map(q => q.x)) - Math.min(...px.map(q => q.x)), Math.max(...px.map(q => q.y)) - Math.min(...px.map(q =>
      q.y)));
  if (span >= 160) return showAdCard(icao);
  // le contenu du terrain est dans le bloc de données, sous la carte : le cadrage prend toute la carte (sous les boutons du
  // haut, à droite des modes et des couches)
  showAdCard(icao);
  S.map.fitBounds([
    [Math.min(...pts.map(p => +p.lon)), Math.min(...pts.map(p => +p.lat))],
    [Math.max(...pts.map(p => +p.lon)), Math.max(...pts.map(p => +p.lat))]
  ], {
    padding: {
      top: 56,
      bottom: 40,
      left: 64,
      right: 40
    },
    maxZoom: 11,
    duration: 500
  });
}

/** Terrain relâché (la surbrillance s'arrête) ; le bloc de données n'est pas touché. */
function releaseAd() {
  if (!S.vfrPin) return;
  S.vfrPin = null;
  S.vfrCard = null;
  S.vfrZoomed = null;
  schedule();
}
/** Contenu du terrain fermé (✕, Échap, un autre contenu) : le terrain est relâché et le profil vertical revient. */
function unpinAd() {
  endData('ad');
  releaseAd();
}
/** Contenu d'un terrain épinglé, dans le bloc de données (à la place du profil vertical) : ses points de report (base
 *  publiée, couleur avion ou hélicoptère, nom long), puis, si la compilation VAC est importée, l'analyse, les séquences,
 *  les points restreints, les sommets manuels et les consignes repliées par page ; sinon « séquences VAC : non
 *  importées ». */
function showAdCard(icao) {
  const v = vfrOf(icao),
    base = baseVrpOf(icao),
    c = S.vfrCard;
  if (!c) return;
  // en-tête : « LFBD : points de report VFR » (le nom du terrain va en infobulle de l'en-tête, il ferait tronquer le titre sur un téléphone)
  const title = tt(TX.vfrTitle, {
      ad: icao
    }),
    label = tt(TX.vfrTitle, {
      ad: [icao, c.name].filter(Boolean).join(' ')
    }),
    page = p => p ? ` <span class="f-muted">(${esc(tt(TX.vfrPage, { p }))})</span>` : '',
    pts = (l => c.focus ? [...l.filter(p => p.id === c.focus), ...l.filter(p => p.id !== c.focus)] : l)(reportPoints(icao)),
    heli = pts.some(p => MapsRender.vrpRotary(p.id)),
    dot = p => `<i class="mp-vfr-dot" style="background:${MapsRender.vrpColor(p.id)}"></i>`;
  let body = '';
  if (base === undefined || v === undefined) body = '<p class="f-muted">…</p>';
  else {
    body = pts.length ? `<div><b>${esc(tt(TX.vfrPoints, { n: pts.length }))}</b>${heli ? ` <span class="f-muted">${esc(tt(TX.vfrLegend))}</span>` : ''}</div><ul class="mp-vfr-pts">${pts.map(p => `<li${p.id === c.focus ? ' class="mp-vfr-focus"' : ''}>${dot(p)}<b style="color:${MapsRender.vrpColor(p.id)}">${esc(p.code)}</b> ${esc(p.name)}${p.restrictions.length ? ` <span class="mp-vfr-warn">(${esc(p.restrictions.join(' ; '))})</span>` : ''}</li>`).join('')}</ul>` : `<p class="f-muted">${esc(tt(TX.vfrNone))}</p>`;
    if (!v) body += `<p class="f-muted">${esc(tt(TX.vfrNoVac))}</p>`;
    else {
      const pages = ps => ps.length > 1 ? ` <span class="f-muted">(${esc(tt(TX.vfrPages, { p: ps.join(', ') }))})</span>` : page(ps[0]),
        seqs = seqsOf(v),
        part = seqs.some(r => r.fragment),
        A = v.analysis || {},
        st = TX.vfrStatus[A.status],
        // conditions lues par l'analyse : altitude par défaut, visibilité minimale ; le reste est dans les consignes
        cond = r => {
          const k = r.conditions || {},
            a = k.defaultAltitude,
            vis = Array.isArray(k.minVisibilityMByLeg) ? Math.max(...k.minVisibilityMByLeg.filter(Number.isFinite)) : null;
          return [r.runways?.length ? tt(TX.vfrRunways, {
            r: r.runways.join(', ')
          }) : '', a?.value ? tt(TX.vfrAlt, {
            a: `${a.value} ${a.unit || 'ft'} ${a.reference || ''}`.trim()
          }) : '', Number.isFinite(vis) && vis > 0 ? tt(TX.vfrVis, {
            v: vis
          }) : '', r.direction === 'forward' ? tt(TX.vfrOneWay) : ''].filter(Boolean).join(' · ');
        },
        item = r => {
          const k = cond(r);
          return `<li>${r.key ? `<b>${esc(r.key)}</b> : ` : ''}${esc(r.codes.join(' – '))}${pages(pagesOf(r))}${k ? `<br><span>${esc(k)}</span>` : ''}${r.omission ? `<br><span class="f-muted">${esc(r.omission)}</span>` : ''}</li>`;
        },
        manual = (v.points || []).filter(p => p.role === 'intermediate_waypoint'),
        accs = manual.map(p => p.accuracyM).filter(Number.isFinite),
        man = manual.length ? `<p class="f-muted">${esc(accs.length === manual.length ? tt(TX.vfrAccuracy, { n: manual.length, m: Math.max(...accs) }) : tt(TX.vfrManual, { n: manual.length }))}</p>` : '';
      body += `<p class="mp-vfr-warn">${esc(tt(TX.vfrLabel))}</p>${st ? `<p><b>${esc(tt(st, { s: tt(TX.vfrScope[A.scope] || TX.vfrScope.partial) }))}</b></p>` : ''}${A.notes?.length ? `<ul class="mp-vfr-seq">${A.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}${seqs.length ? `<div><b>${esc(tt(TX.vfrSeqCount, { r: seqs.length }))}</b>${part ? ` <span class="f-muted">${esc(tt(TX.vfrPart))}</span>` : ''}</div><ul class="mp-vfr-seq">${seqs.map(item).join('')}</ul>` : ''}${man}${v.notes?.length ? `<div><b>${esc(tt(TX.vfrNotes))}</b></div>${v.notes.map(n => `<details class="mp-vfr-note"><summary>${esc(n.title || tt(TX.vfrPage, { p: n.page }))}${page(n.page)}</summary><div>${esc(n.text)}</div></details>`).join('')}` : ''}`;
    }
  }
  openData('ad', `ad:${icao}`, title, () => body, label);
}
/** VRP de la base que la surbrillance dessine (terrains montrés) : la couche des VRP ne les redessine pas. */
function vfrVrpIds() {
  const out = new Set();
  for (const icao of vfrShown())
    for (const b of baseVrpOf(icao) || []) out.add(b.id);
  return out;
}
/** Terrains montrés : l'aperçu, l'épinglé, et en mode VFR le départ et l'arrivée. */
function vfrShown() {
  const out = new Set([S.vfrPreview, S.vfrPin].filter(Boolean));
  if (S.preset === 'vfr') {
    const pts = S.route?.points || [];
    for (const p of [pts[0], pts[pts.length - 1]])
      if (/^[A-Z]{4}$/.test(p?.id || '')) out.add(p.id);
  }
  return out;
}
/** Surbrillance des terrains montrés : séquences et tracés VAC en tirets (sarcelle), sommets manuels en petits points,
 *  points de report cerclés et nommés (avions en noir, hélicoptères en vert ; usage restreint : cercle tireté),
 *  « VAC, à vérifier » près du terrain quand la compilation est là. */
function drawVfr(ctx, toC) {
  const ads = vfrShown();
  S.vfrHits = [];
  if (!ads.size) return;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const icao of ads) {
    const v = vfrOf(icao),
      pts = reportPoints(icao);
    if (v) {
      // points de la compilation ; le terrain lui-même (son code, « AD ») n'est jamais relié : une intégration non
      // numérisée n'est pas remplacée par une droite vers son centre
      const at = new Map(v.points.filter(p => p.role !== 'aerodrome_reference_point' && p.code !== 'AD').map(p => [p.code, p]));
      ctx.strokeStyle = VFR_COL;
      ctx.lineWidth = 1.6;
      for (const r of v.routes) {
        // tracé de l'analyse (tirets longs), sinon tirets courts entre les points de report connus
        const line = r.geometry?.length > 1 ? r.geometry.map(([la, lo]) => toC(la, lo)) : null;
        ctx.setLineDash(line ? [10, 4] : [6, 4]);
        ctx.beginPath();
        let pen = false,
          last = null,
          prev = null;
        for (const q of line || r.codes.map(c => at.get(c)).map(p => p ? toC(+p.lat, +p.lon) : null)) {
          if (!q) {
            pen = false;
            continue;
          }
          pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          if (pen)[prev, last] = [last, q];
          else last = q;
          pen = true;
        }
        ctx.stroke();
        // sens unique lu par l'analyse : une flèche au bout du tracé
        if (r.direction === 'forward' && prev && last) {
          const a = Math.atan2(last.y - prev.y, last.x - prev.x);
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 9 * Math.cos(a - .45), last.y - 9 * Math.sin(a - .45));
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(last.x - 9 * Math.cos(a + .45), last.y - 9 * Math.sin(a + .45));
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      // sommets de tracé de l'analyse : ni points de report, ni noms
      ctx.fillStyle = VFR_COL;
      for (const p of v.points.filter(p => p.role === 'intermediate_waypoint')) {
        const q = toC(+p.lat, +p.lon);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.font = '700 11px Arial,sans-serif';
    ctx.textBaseline = 'middle';
    for (const p of pts) {
      const q = toC(p.lat, p.lon),
        col = MapsRender.vrpColor(p.id),
        name = p.code; // sur la carte, le code court seul (lisibilité) ; le nom long est dans l'infobulle et dans le bloc de données
      ctx.beginPath();
      ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = MapsRender.withAlpha(col, .12);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      if (p.restrictions.length) ctx.setLineDash([3, 2]); // usage restreint : cercle tireté (le bloc de données dit lequel)
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(name, q.x + 10, q.y);
      ctx.fillStyle = col;
      ctx.fillText(name, q.x + 10, q.y);
      S.vfrHits.push({
        x: q.x,
        y: q.y,
        p,
        icao
      });
    }
    const ad = v && adPos(icao);
    if (ad) {
      const q = toC(ad.lat, ad.lon),
        t = tt(TX.vfrMap);
      ctx.font = 'italic 600 10px Arial,sans-serif';
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(t, q.x + 10, q.y + 14);
      ctx.fillStyle = VFR_COL;
      ctx.fillText(t, q.x + 10, q.y + 14);
    }
  }
  ctx.restore();
}
/** Balise en une ligne : « VOR BZH 114.50 », « ILS 26 BG 110.30 », « DME CLI CH 32X ». */
const navName = n => [n.kind === 'ILS' && n.rwy ? `ILS ${n.rwy}` : n.kind, n.id, n.freq || (n.channel ? `CH ${n.channel}` : '')].filter(Boolean)
  .join(' ');
/** Couleur d'un type d'espace (celles du profil vertical). */
const ZONE_COL = {
  R: '#d32f2f',
  P: '#b71c1c',
  D: '#ef6c00',
  TRA: '#ef6c00',
  TSA: '#ef6c00',
  CTR: '#1565c0',
  TMA: '#1565c0',
  CTA: '#3949ab',
  SIV: '#2e7d32',
  RMZ: '#555',
  TMZ: '#555'
};
/** Contenu « n espaces sur ce point » du bloc de données : un graphique comme le profil vertical (axe des altitudes, une
 *  colonne par espace entre son plancher et son plafond, numérotée), à gauche, puis la liste numérotée en notation SIA,
 *  du plancher le plus bas au plus haut. Le graphique est dessiné à l'échelle 1 pour la place du bloc (bw × bh px) : 44 %
 *  de sa largeur sur un téléphone (moins de 600 px), sinon la largeur que demandent les colonnes (400 px au plus), et
 *  jamais plus haut que le bloc. Hauteurs ASFC comptées depuis le sol (le relief du point n'est pas lu ici : l'étiquette
 *  dit ASFC). */
function levelsHtml(list, bw = 360, bh = 200) {
  const lim = window.SiaAero?.limitFt || (() => 0),
    rows = list.map(a => {
      const lo = Math.max(0, +lim(a.lower, false) || 0),
        up = +lim(a.upper, true);
      return {
        a,
        lo,
        up: Number.isFinite(up) && up > lo && up < 66000 ? up : null, // 66 000 ft et plus : UNL (comme les voies)
        col: ZONE_COL[String(a.type || '').toUpperCase()] || '#6d4c41'
      };
    }),
    finite = rows.map(r => r.up ?? r.lo).filter(Number.isFinite),
    unl = rows.some(r => r.up == null),
    nice = v => {
      for (const s of [1000, 2000, 2500, 5000, 10000, 20000])
        if (v / s <= 5) return s;
      return 50000;
    },
    raw = Math.max(5000, ...finite) * 1.08,
    step = nice(raw),
    top = Math.ceil(raw / step) * step,
    narrow = bw < 600,
    L = 46,
    W = Math.round(narrow ? bw * .44 : Math.min(400, bw * .45, Math.max(240, L + 12 + rows.length * 36))),
    H = Math.round(Math.max(110, Math.min(300, bh - 16))),
    T = unl ? 16 : 6,
    B = H - 6,
    y = ft => B - (Math.min(ft, top) / top) * (B - T),
    colW = Math.max(10, Math.min(34, (W - L - 6) / rows.length)),
    gap = Math.min(4, colW * .2);
  let svg = '';
  for (let v = 0; v <= top; v += step) svg +=
    `<line x1="${L}" x2="${W - 2}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 4}" y="${y(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${esc(v ? formatLevel(v) : 'SFC')}</text>`;
  if (unl) svg += `<text x="${L - 4}" y="${T - 8}" text-anchor="end" dominant-baseline="middle">UNL</text>`;
  rows.forEach((r, i) => {
    const x = L + 4 + i * colW,
      y0 = r.up == null ? T - 12 : y(r.up),
      y1 = y(r.lo);
    svg +=
      `<rect x="${(x + gap / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${(colW - gap).toFixed(1)}" height="${Math.max(2, y1 - y0).toFixed(1)}" fill="${r.col}" fill-opacity=".18" stroke="${r.col}"/>`;
    if (colW >= 12) svg +=
      `<text x="${(x + colW / 2).toFixed(1)}" y="${Math.min(B - 4, Math.max(T, y0 + 9)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${r.col}" font-weight="700">${i + 1}</text>`;
  });
  const items = rows.map((r, i) => {
    const [a, b] = MapsRender.sia(r.a);
    return `<li><span class="mp-lv-n" style="color:${r.col}">${i + 1}</span><span><b>${esc(a)}</b>${b ? `<br><span class="f-muted">${esc(b)}</span>` : ''}</span></li>`;
  }).join('');
  return `<div class="mp-lv-body"><svg class="mp-lv" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tt(TX.levelsAxis))}">${svg}</svg><ol class="mp-lv-list">${items}</ol></div>`;
}
/** Liste des espaces fermée (écrit seulement si elle est ouverte) : un toucher sur un endroit vide de la carte, ✕ et Échap
 *  la ferment, le profil vertical revient ; un glisser ou la molette jamais (`hideTips` ne la touche pas). */
function closeLv() {
  if (S?.dpanel) endData('lv');
}
/** Liste des espaces sous le point touché, dans le bloc de données. Un terrain épinglé est relâché : un seul contenu à la
 *  fois, la surbrillance ne reste pas sans sa liste. */
function showLv() {
  const list = S.lvList;
  if (!list?.length) return;
  releaseAd();
  openData('lv', `lv:${list.map(a => a.id || a.name || '').join('|')}`, list.length === 1 ? tt(TX.levelsTitle1) : tt(TX.levelsTitle, {
    n: list.length
  }), (w, h) => levelsHtml(list, w, h));
}
// ---------------------------------------------------------------- le bloc de données (sous la carte)
// La vue est fixe (meta.fixed) : la barre d'outils, la carte, puis le bloc de données, qui est une FEUILLE de hauteur fixe
// à trois positions (réduit : sa ligne d'en-tête seule ; normal : 38 % de la vue sur téléphone, 35 % sur écran ; agrandi :
// 70 %), tirée par la poignée de son en-tête ; son contenu défile dedans, la page jamais. Le bloc montre le profil
// vertical ; la liste des espaces d'un point et le contenu d'un terrain (points de report, séquences VAC, consignes) s'y
// ouvrent à sa place — on n'a pas besoin du profil pendant qu'on les lit — et, fermés, le profil revient. Rien ne recouvre
// plus la carte.
/** Position de la feuille gardée d'un montage à l'autre dans la même page (0 réduit, 1 normal, 2 agrandi). */
let sheetKeep = 1;
/** Hauteurs en pixels des trois positions, lues dans les jetons de la racine (--mp-head, --mp-p1 / --mp-p2 : parts de la
 *  vue, --mp-m1 / --mp-m2 : planchers) : la feuille de style en est l'unique source, le glisser s'y accroche. */
function sheetHeights() {
  const cs = getComputedStyle(S.el),
    n = k => parseFloat(cs.getPropertyValue(k)) || 0,
    H = S.el.clientHeight;
  return [n('--mp-head') + 1, Math.max(n('--mp-p1') * H, n('--mp-m1')), Math.max(n('--mp-p2') * H, n('--mp-m2'))];
}
/** Met la feuille à une position (0 réduit, 1 normal, 2 agrandi). instant : sans glissement (le contenu va être mesuré). */
function setSheet(pos, instant = false) {
  pos = Math.max(0, Math.min(2, pos));
  S.sheet = pos;
  sheetKeep = pos;
  if (instant) {
    S.dataEl.classList.add('mp-nt');
    requestAnimationFrame(() => S?.dataEl.classList.remove('mp-nt'));
  }
  S.dataEl.style.removeProperty('height');
  if (S.el.dataset.sheet !== String(pos)) S.el.dataset.sheet = String(pos);
  const tip = `${tt(TX.sheetSize)} (${tt(TX.sheetNames[pos])})`;
  if (S.gripEl.title !== tip) S.gripEl.title = tip;
  const ex = String(pos > 0);
  if (S.gripEl.getAttribute('aria-expanded') !== ex) S.gripEl.setAttribute('aria-expanded', ex);
  if (instant) void S.dataEl.offsetHeight; // mesure possible tout de suite (hauteur à jour)
}
/** Après un changement de taille de la carte (feuille, rotation, volet) : le fond MapLibre reprend la taille du cadre, et
 *  la route reste cadrée tant que l'utilisateur n'a pas déplacé la carte ; en une fois, quand la taille s'est arrêtée. */
function settle() {
  clearTimeout(S.settleT);
  S.settleT = setTimeout(() => {
    if (!S) return;
    mapSize();
    if (S.map && S.fit && !S.userMoved && S.route.points.length) fitMap(false);
    schedule();
  }, 120);
}
/** La poignée : l'en-tête de la feuille. Un toucher réduit la feuille (ou la ramène de réduite ou d'agrandie à la position
 *  normale), un glisser la tire (événements du pointeur sur l'en-tête seulement : la carte garde ses gestes), au
 *  lâcher elle prend la position la plus proche (ou la suivante, si le geste était un coup de pouce) ; flèches du clavier. */
function sheetGestures() {
  const head = S.dheadEl;
  let d = null;
  head.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('[data-dclose]') || S.el.classList.contains('mp-tuning')) return;
    d = {
      id: e.pointerId,
      y0: e.clientY,
      h0: S.dataEl.offsetHeight,
      pos: S.sheet,
      y: e.clientY,
      t: performance.now(),
      v: 0,
      on: false,
      grip: !!e.target.closest('.mp-grip')
    };
    head.setPointerCapture(e.pointerId); // la souris qui sort de l'en-tête (un glisser rapide) continue de lui parler
  });
  head.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.on) {
      if (Math.abs(e.clientY - d.y0) < 6) return;
      d.on = true;
      S.dataEl.classList.add('mp-nt');
    }
    const hs = sheetHeights(),
      now = performance.now();
    if (now > d.t) d.v = .6 * d.v + .4 * ((e.clientY - d.y) / (now - d.t));
    d.y = e.clientY;
    d.t = now;
    S.dataEl.style.height = `${Math.round(Math.max(hs[0], Math.min(hs[2], d.h0 - (e.clientY - d.y0))))}px`;
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const was = d;
    d = null;
    if (!was.on) {
      // un toucher (ni glissé ni annulé) sur la poignée : réduit la feuille, ou la ramène à la position normale
      if (e.type === 'pointerup' && was.grip) {
        setSheet(S.sheet === 1 ? 0 : 1);
        settle();
      }
      return;
    }
    S.dataEl.classList.remove('mp-nt');
    const hs = sheetHeights(),
      h = S.dataEl.offsetHeight;
    let pos = hs.reduce((b, x, i) => Math.abs(x - h) < Math.abs(hs[b] - h) ? i : b, 0);
    if (Math.abs(was.v) > .8 && e.type === 'pointerup') pos = was.v < 0 ? Math.min(2, was.pos + 1) : Math.max(0, was.pos - 1);
    setSheet(pos);
    settle();
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
  // clavier (Entrée, Espace : clic sans pointeur) ; le toucher et la souris sont traités au relâcher, plus haut
  S.gripEl.addEventListener('click', e => {
    if (e.detail) return;
    setSheet(S.sheet === 1 ? 0 : 1);
    settle();
  });
  S.gripEl.addEventListener('keydown', e => {
    const k = {
      ArrowUp: S.sheet + 1,
      ArrowDown: S.sheet - 1,
      Home: 0,
      End: 2
    } [e.key];
    if (k == null) return;
    e.preventDefault();
    setSheet(k);
    settle();
  });
  S.dataEl.addEventListener('transitionend', e => {
    if (e.target === S.dataEl && e.propertyName === 'height') settle();
  });
}
/** En-tête du bloc : ce qu'il montre (profil vertical, ou le titre du contenu) et le ✕ du contenu ; le bloc n'est là que
 *  s'il a quelque chose à montrer ; écrit s'il change. */
function dataHead() {
  const show = !!S.dpanel || !!S.prof,
    title = S.dpanel ? S.dtitle : tt(TX.dataProfile);
  if (S.dataEl.hidden === show) S.dataEl.hidden = !show;
  if (S.dtitleEl.textContent !== title) S.dtitleEl.textContent = title;
  const tip = S.dpanel ? S.dlabel : '';
  if (S.dtitleEl.title !== tip) S.dtitleEl.title = tip;
  if (S.dcloseEl.hidden === !!S.dpanel) S.dcloseEl.hidden = !S.dpanel;
}
/** Ouvre ou remplace le contenu du bloc. key : l'identité du contenu (autre clé : le contenu est neuf et défile en haut ;
 *  même clé : il est seulement redessiné, défilement gardé) ; build(w, h) rend le HTML pour la taille de la zone de
 *  contenu (largeur et hauteur en pixels : un graphique y puise ce qu'il lui faut) et rend le HTML, OU dessine lui-même
 *  dans la zone qu'on lui donne en troisième argument (el) et ne rend rien (coupe verticale de l'atmosphère : INTEGRATION.md
 *  § 6) ; rappelé avec la même clé, il remplace son dessin ; label : le nom complet, pour
 *  l'infobulle de l'en-tête et le lecteur d'écran. Un contenu neuf ouvre la feuille réduite à sa position normale ; la
 *  carte et la page ne bougent pas. C'est aussi le point d'entrée des contenus venus d'autres modules (INTEGRATION.md § 6). */
function openData(kind, key, title, build, label = title) {
  const fresh = S.dkey !== key;
  if (fresh && S.sheet === 0) setSheet(1, true); // réduite, le contenu serait caché : la feuille s'ouvre, sans glissement
  S.dpanel = kind;
  S.dkey = key;
  S.dtitle = title;
  if (!S.dprofEl.hidden) S.dprofEl.hidden = true;
  if (S.dbodyEl.hidden) S.dbodyEl.hidden = false;
  if (S.dbodyEl.getAttribute('aria-label') !== label) S.dbodyEl.setAttribute('aria-label', label);
  S.dlabel = label;
  if (fresh) {
    S.dhtml = '';
    S.dbodyEl.textContent = '';
  }
  const html = build(S.dbodyEl.clientWidth || 360, S.dbodyEl.clientHeight || 200, S.dbodyEl);
  if (typeof html !== 'string') S.dhtml = null; // le constructeur a dessiné lui-même dans la zone (el) : rien d'autre à écrire
  else if (S.dhtml !== html) {
    S.dhtml = html;
    S.dbodyEl.innerHTML = html;
  }
  dataHead();
  if (fresh) S.dbodyEl.scrollTop = 0;
}
/** Contenu du bloc fermé (kind : seulement s'il est de ce genre) ; le profil vertical revient, redessiné à sa taille. */
function endData(kind = null) {
  if (!S?.dpanel || (kind && S.dpanel !== kind)) return;
  S.dpanel = null;
  S.dkey = null;
  S.dhtml = '';
  S.dbodyEl.hidden = true;
  S.dbodyEl.textContent = '';
  S.dprofEl.hidden = false;
  drawProfile();
  dataHead();
}
/** Fermeture voulue (✕, Échap) : le contenu du bloc, quel qu'il soit. */
function closeData() {
  if (S.dpanel === 'ad' || S.vfrPin) unpinAd();
  else endData();
}
/** Toucher ou clic sur la carte en (x, y) : la même infobulle qu'au survol, posée là, gardée 5 s, remplacée par la
 *  suivante ; rien dessous : l'infobulle se ferme. Un espace ou plus sous le point (ni barbule ni voie sous le doigt) : leur
 *  liste dans le bloc de données, qui reste jusqu'à ✕, Échap ou un toucher sur un endroit vide. Vrai si quelque chose est
 *  montré. */
function mapTip(lat, lon, x, y) {
  // une barbule ou une voie sous le doigt passent avant ; un libellé d'espace, non (son espace est dans la carte)
  if (!windAt(x, y) && !MapsRender.airwaysAt(S.awHits, x, y).length) {
    const list = MapsRender.airspacesAt(S.data?.data?.airspaces || [], lat, lon);
    // un espace ou plus sous le point : leur liste dans le bloc de données, qui reste (✕, Échap, un toucher sur un endroit vide) ;
    // un autre toucher sur des espaces la remplace
    if (list.length) {
      hideTips();
      S.lvList = list;
      showLv();
      return true;
    }
  }
  const t = tipAt(x, y, lat, lon);
  if (!t) {
    hideTips();
    return false;
  }
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml(t[0], t[1]));
  linger('map');
  return true;
}
/** Profil d'affichage choisi au préréglage : profil, données, fond, profil vertical refaits. */
async function setPreset(v) {
  S.preset = v;
  saveUi();
  const before = styleFor();
  S.profile = effectiveProfile();
  if (!S.layersEl.hidden) fillLayers();
  S.data = null;
  if (S.map && styleFor() !== before) S.map.setStyle(styleFor()); // relief posé au chargement du style
  else relief();
  fillModes();
  schedule();
  buildProfile();
}

// ---------------------------------------------------------------- écran
/** Messages de l'état (vol, base, zone hors ligne, fond) ; écrits seulement s'ils changent. */
async function status() {
  if (!S) return;
  const out = [];
  if (S.missionError) out.push(`<p>${esc(S.missionError)}</p>`);
  else if (S.mission) {
    if (!S.mission.maps.length) out.push(`<p class="f-muted">${esc(tt(TX.noMaps))}</p>`);
    if (S.profileSource && S.profileSource !== 'copy') out.push(`<p class="f-muted">${esc(tt(TX.builtin, {
      p: S.profile?.name || S.profile?.id || ''
    }))}</p>`);
    const cyc = S.mapDef?.cycle,
      now = (await S.ctx.aerodb?.status().catch(() => null))?.cycle;
    if (S.mapDef?.cycle && now && S.mapDef.cycle !== now) out.push(`<p class="f-muted">${esc(tt(TX.cycleDiff, {
      a: cyc,
      b: now
    }))}</p>`);
  } else if (!S.route.points.length) out.push(
    `<p>${esc(tt(TX.noFlight))} <button type="button" class="f-btn" data-go="fuel">${esc(tt(TX.toFuel))}</button></p>`);
  if (!S.missionError && S.route.points.length) {
    const st = await S.ctx.aerodb?.status().catch(() => null);
    if (!st?.published || !Object.keys(st.published).length) out.push(`<p>${esc(tt(TX.noBase))}</p>`);
    else if (S.data?.empty && navigator.onLine === false) out.push(
      `<p>${esc(tt(TX.noZone))} <button type="button" class="f-btn" data-go="settings">${esc(tt(TX.toSettings))}</button></p>`);
  }
  // pour information (fond uni, relief absent : l'état normal hors ligne) : dans la feuille, sous le profil, pour que la
  // carte ne perde pas une ligne en permanence ; les messages qui demandent un geste ou disent un manque restent sous la barre
  const soft = [];
  if (S.plain && S.route.points.length) soft.push(`<p>${esc(tt(TX.plain))}</p>`);
  if (S.prof && !S.prof.terrainOk) soft.push(`<p>${esc(tt(TX.noTerrain))}</p>`);
  const html = out.join(''),
    notes = soft.join('');
  if (S.stEl.innerHTML !== html) S.stEl.innerHTML = html;
  if (S.notesEl.innerHTML !== notes) S.notesEl.innerHTML = notes;
}
/** En-tête : départ → arrivée, dégagement, niveau, distance. */
function header() {
  if (S.mission) {
    const m = S.mapDef,
      text = [S.mission.id, S.mission.title, m ? m.description || m.file : ''].filter(Boolean).join(' · ');
    if (S.hdEl.textContent !== text) {
      S.hdEl.textContent = text;
      S.hdEl.title = text;
    }
    return;
  }
  const f = S.route.flight,
    r = f?.route || {},
    lvl = S.route.levelFt ? formatLevel(S.route.levelFt) : '',
    d = S.route.points.length >= 2 ? MapsRender.distances(S.route.points).pop() : 0,
    parts = [r.dep || r.arr ? tt(TX.summary, {
      dep: r.dep || '?',
      arr: r.arr || '?'
    }) : '', r.altn ? tt(TX.altn, {
      a: r.altn
    }) : '', lvl, d ? tt(TX.dist, {
      d: Math.round(d)
    }) : '', f?.aircraft?.type || ''].filter(Boolean),
    text = parts.join(' · ');
  if (S.hdEl.textContent !== text) {
    S.hdEl.textContent = text;
    S.hdEl.title = text; // la ligne est coupée sur un téléphone : le texte entier en infobulle
  }
}
/** Carte montrée ou cachée (pas de vol, mission sans carte) : « Recentrer » et le bouton des modes de la barre la suivent
 *  (les modes n'existent pas pour une carte de mission). Écrit seulement ce qui change. */
function showBox(on) {
  const modes = on && !S.ctx.query?.mission;
  for (const [e, v] of [
      [S.box, on],
      [S.fitBtn, on],
      [S.modesEl, modes]
    ])
    if (e.hidden === v) e.hidden = !v;
  if (!modes) toggleModes(false);
}
/** Vol (re)lu : profil selon le niveau, emprise, marques, données, fond. */
/** Profil d'affichage du vol selon le préréglage : IFR bas ou haut (voies, espaces de la tranche, MORA, balises), VFR
 *  (profil « VFR détaillé » du studio sur un fond plus topographique), ou automatique selon le niveau du vol. */
function flightProfile() {
  return withRepo(builtinProfile());
}
/** Profil d'un mode affiné par la compagnie (airline/map_profiles.json, profiles[mode] au format profile_def du studio)
 *  posé sur le profil intégré : champs remplacés, éléments fusionnés. */
function withRepo(B) {
  const own = S.repoProfiles?.[S.preset];
  if (!own || typeof own !== 'object') return B;
  return {
    ...B,
    ...own,
    id: B.id,
    elements: {
      ...(B.elements || {}),
      ...(own.elements || {}),
      zoom: {
        ...(B.elements?.zoom || {}),
        ...(own.elements?.zoom || {})
      }
    }
  };
}
/** Profil intégré du mode courant. */
function builtinProfile() {
  const p = modeProfile();
  return {
    ...p,
    elements: {
      ...(p.elements || {}),
      zoom: zoomDefaults(S.preset)
    }
  };
}
/** Seuils de zoom MapLibre de départ [visible à partir de, jusqu'à] de chaque élément, par mode. En IFR (Auto, IFR bas,
 *  IFR haut, CAM) le couloir de la route éclaircit déjà : presque tout reste visible ; en VFR et Topo : FIR de loin,
 *  TMA en vue moyenne, CTR de près, points de report tout près (valeurs à régler dans #maps?tune=1). Repères : la
 *  France entière ≈ 5,5 sur un écran, ≈ 4,3 sur un téléphone ; 100 NM de large ≈ 8,5. */
const ZOOM_IFR = {
    // vue d'ensemble : route, vents, terrains, formes des TMA / CTA, R et TSA / TRA (seules au-dessus du FL195) ; puis
    // CTR, D, noms des zones et voies ; puis MORA et autres zones ; puis balises et points
    asFir: [0, 24],
    asTma: [0, 24],
    asCta: [0, 24],
    asCtr: [4.75, 24],
    asR: [0, 24],
    asD: [4.75, 24],
    asP: [5.25, 24],
    asTsa: [0, 24],
    asOther: [5.5, 24],
    zoneLabels: [4.75, 24],
    awLow: [5, 24],
    awHigh: [5, 24],
    awLabels: [7.75, 24],
    navaids: [5.75, 24],
    fixes: [5.75, 24],
    vrp: [9.25, 24],
    obstacles: [8.5, 24],
    mora: [5.5, 24],
    citiesBig: [0, 24],
    citiesMid: [6.5, 24],
    citiesSmall: [8.5, 24],
    graticule: [0, 24],
    aar: [0, 24],
    nat: [0, 24],
    wind: [0, 24],
    contours: [9, 24]
  },
  ZOOM_VFR = {
    ...ZOOM_IFR,
    asFir: [0, 7],
    asTma: [6, 24],
    asCta: [6, 24],
    asCtr: [7, 24],
    asR: [6.5, 24],
    asD: [6.5, 24],
    asP: [7.5, 24],
    asTsa: [6.5, 24],
    asOther: [8, 24],
    zoneLabels: [6, 24]
  },
  ZOOM_KEYS = Object.keys(ZOOM_IFR);
const zoomDefaults = mode => structuredClone(mode === 'vfr' || mode === 'topo' ? ZOOM_VFR : ZOOM_IFR);
/** Profil du mode courant, sans ses seuils. */
function modeProfile() {
  if (S.preset === 'vfr') {
    // VFR détaillé du studio sur fond topographique, plus les balises, la densité VFR et les FIR (vues de loin, seuils
    // du mode) ; les familles d'espaces viennent des couches (TMA / CTR, D / R / P entiers)
    const p = structuredClone(window.MAPS_PROFILES.find(x => x.id === 'vfr-detail') || MapsRender.routeProfile(0));
    return {
      ...p,
      zones: [...new Set([...(p.zones || []), 'FIR'])],
      base: 'ofm-liberty',
      elements: {
        ...p.elements,
        navaids: true,
        vfrDensity: true,
        zoneCeil: p.elements?.zoneCeil || '19500'
      }
    };
  }
  if (S.preset === 'topo') {
    // relief (ombrage des tuiles Terrarium) sur fond topographique, surcouche minimale : terrains, villes, obstacles de
    // près ; les couches ajoutent le reste
    const p = MapsRender.routeProfile(0);
    return {
      ...p,
      id: 'v3-topo',
      base: 'ofm-liberty',
      hillshade: true,
      cities: true,
      zones: [],
      corridorNm: 0,
      elements: {
        ...p.elements,
        airwaysLow: false,
        airwaysHigh: false,
        navaids: false,
        mora: false,
        graticule: false,
        obstacles: true,
        agglos: true,
        vfrDensity: true
      }
    };
  }
  if (S.preset === 'cam') {
    // vol militaire : l'IFR du niveau du vol, plus les zones R / D / P, TSA / TRA / CBA (RTBA comprise) à tous les
    // niveaux et les terrains d'État
    const p = MapsRender.routeProfile(S.route.levelFt);
    return {
      ...p,
      id: 'v3-cam',
      zones: [...new Set([...p.zones, 'TSA', 'CBA', 'PJE'])],
      elements: {
        ...p.elements,
        zoneFloor: '',
        zoneCeil: '',
        adState: true
      }
    };
  }
  return MapsRender.routeProfile(S.preset === 'low' ? 5000 : S.preset === 'high' ? 30000 : S.route.levelFt);
}
/** Mode de carte choisi : bouton déclencheur (mode courant) et choix marqués ; écritures seulement si elles changent. */
function fillModes() {
  const icon = (MODES.find(m => m[0] === S.preset) || MODES[0])[1],
    label = tt(TX.pair, {
      a: tt(TX.preset),
      b: tt(TX.modeHelp[S.preset] || TX.modeHelp.auto)
    });
  if (S.modeBtn.innerHTML !== icon) S.modeBtn.innerHTML = icon;
  if (S.modeBtn.title !== label) {
    S.modeBtn.title = label;
    S.modeBtn.setAttribute('aria-label', label);
  }
  if (S.modeBtn.classList.contains('mp-mil') !== (S.preset === 'cam')) S.modeBtn.classList.toggle('mp-mil');
  for (const b of S.modesEl.querySelectorAll('[data-mode]')) {
    const v = String(b.dataset.mode === S.preset);
    if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v);
  }
}
/** Grille des modes ouverte ou fermée. */
function toggleModes(open = S.modeOpts.hidden) {
  if (S.modeOpts.hidden === !open) return;
  S.modeOpts.hidden = !open;
  S.modeBtn.setAttribute('aria-expanded', String(open));
}
/** Relief ombré (mode Topo) : couche hillshade des tuiles Terrarium (hôte de meta.net), posée sous les libellés du fond,
 *  retirée hors du mode ; rien si le style n'est pas prêt (posée au chargement du style). */
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

function relief() {
  const m = S?.map;
  if (!m?.isStyleLoaded?.()) return;
  const want = !!S.profile?.hillshade,
    has = !!m.getLayer('mp-hillshade');
  if (want === has) return;
  try {
    if (!want) return m.removeLayer('mp-hillshade');
    if (!m.getSource('mp-dem')) m.addSource('mp-dem', {
      type: 'raster-dem',
      tiles: [DEM],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 12
    });
    m.addLayer({
      id: 'mp-hillshade',
      type: 'hillshade',
      source: 'mp-dem',
      paint: {
        'hillshade-exaggeration': .45
      }
    }, m.getStyle().layers.find(l => l.type === 'symbol')?.id);
  } catch {
    /* style sans place pour la couche : fond sans relief */
  }
}

/** Noms de lieux du fond : les couches de symboles du style dont la source-layer est « place » (OpenMapTiles) ou
 *  « place_labels » (Shortbread) sont masquées quand nos villes sont dessinées (leurs seuils cities*), et rendues
 *  sinon : en Topo ou hors des plages de nos villes, le fond garde ses noms. Seules les couches visibles dans le style
 *  d'origine sont touchées ; écriture au changement seulement, relevé refait à chaque style chargé. */
function baseNames(off) {
  const m = S?.map;
  if (!S || off == null) return;
  S.placeWant = off;
  if (!m || S.placeOff === off) return;
  try {
    S.placeIds ||= (m.getStyle()?.layers || []).filter(l => l.type === 'symbol' && /^place(_labels)?$/.test(l['source-layer'] || '') &&
      l.layout?.visibility !== 'none').map(l => l.id);
    for (const id of S.placeIds)
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', off ? 'none' : 'visible');
    S.placeOff = off;
  } catch {
    S.placeIds = null; // style pas encore chargé : réglé au chargement (style.load)
  }
}

// ---------------------------------------------------------------- couches (panneau « Couches »)
/** Familles d'espaces des couches ; « autres » : tout type hors de ces trois listes. */
const AS_GROUPS = {
  asTma: ['TMA', 'CTR', 'CTA', 'TMZ', 'RMZ', 'RMZ-TMZ'],
  asDrp: ['R', 'D', 'P', 'TRA', 'TSA', 'CBA', 'PJE', 'TRVL', 'TRPVL', 'ZIT'],
  asFir: ['FIR', 'UIR', 'UTA', 'LTA', 'OCA', 'FRA'] // régions et grands volumes (UTA FRANCE) : pas avec les TMA
};
const LAYER_KEYS = ['corridor', 'asTma', 'asDrp', 'asFir', 'asOther', 'awLow', 'awHigh', 'navaids', 'fixes', 'vrp', 'obstacles', 'mora',
  'cities', 'graticule', 'altn', 'aar', 'nat', 'wind', 'contours', 'zoneLabels', 'awLabels'
];
/** Couche du panneau Couches qui commande chaque ligne de la page de réglage (une famille d'espaces : une seule case). */
const LAYER_OF = {
  asFir: 'asFir',
  asTma: 'asTma',
  asCta: 'asTma',
  asCtr: 'asTma',
  asR: 'asDrp',
  asD: 'asDrp',
  asP: 'asDrp',
  asTsa: 'asDrp',
  asOther: 'asOther',
  zoneLabels: 'zoneLabels',
  awLow: 'awLow',
  awHigh: 'awHigh',
  awLabels: 'awLabels',
  navaids: 'navaids',
  fixes: 'fixes',
  vrp: 'vrp',
  obstacles: 'obstacles',
  mora: 'mora',
  citiesBig: 'cities',
  citiesMid: 'cities',
  citiesSmall: 'cities',
  graticule: 'graticule',
  aar: 'aar',
  nat: 'nat',
  wind: 'wind',
  contours: 'contours'
};
const groupOf = t => Object.keys(AS_GROUPS).find(g => AS_GROUPS[g].includes(String(t || '').toUpperCase())) || 'asOther';
/** État des couches par défaut d'un profil d'affichage (celui du préréglage). */
function layerDefaults(B) {
  const E = k => !!MapsRender.elementOf(B, k),
    zones = new Set((B.zones || []).map(z => String(z).toUpperCase()));
  return {
    corridor: +B.corridorNm > 0,
    asTma: AS_GROUPS.asTma.some(t => zones.has(t)),
    asDrp: AS_GROUPS.asDrp.some(t => zones.has(t)),
    asFir: AS_GROUPS.asFir.some(t => zones.has(t)),
    asOther: false,
    awLow: E('airwaysLow'),
    awHigh: E('airwaysHigh'),
    navaids: E('navaids'),
    fixes: E('airwaysLow') || E('airwaysHigh'),
    vrp: E('vrpPoints'),
    obstacles: E('obstacles'),
    mora: E('mora'),
    cities: !!B.cities || E('agglos'),
    graticule: E('graticule'),
    altn: true,
    // axes AAR et tracks NAT : d'origine en CAM seulement
    aar: B.id === 'v3-cam',
    nat: B.id === 'v3-cam',
    wind: true,
    // courbes de niveau : modes à densité VFR (VFR, Topo), de près
    contours: !!MapsRender.elementOf(B, 'vfrDensity'),
    zoneLabels: E('zoneLabelsShow'),
    awLabels: MapsRender.elementOf(B, 'awLabels') !== false,
    detail: 0
  };
}
/** Couches de départ du mode : celles du profil, puis celles que la compagnie a enregistrées (profiles[mode].layers). */
const baseLayers = () => ({
  ...layerDefaults(flightProfile()),
  ...(S.repoProfiles?.[S.preset]?.layers || {})
});
/** Couches du préréglage courant : défauts du profil, puis choix gardés sur cet appareil. */
const layersNow = () => ({
  ...baseLayers(),
  ...(S.layers?.[S.preset] || {})
});
/** Profil d'affichage du vol : celui du préréglage, couches appliquées (éléments, familles d'espaces, couloir). */
function effectiveProfile() {
  const B = flightProfile(),
    L = layersNow(),
    P = structuredClone(B),
    E = P.elements ||= {};
  Object.assign(E, {
    airwaysLow: L.awLow,
    airwaysHigh: L.awHigh,
    navaids: L.navaids,
    fixes: L.fixes,
    vrpPoints: L.vrp,
    obstacles: L.obstacles,
    mora: L.mora,
    graticule: L.graticule,
    agglos: L.cities && !!MapsRender.elementOf(B, 'agglos'),
    aarTracks: L.aar,
    natTracks: L.nat,
    zoneLabelsShow: L.zoneLabels,
    awLabels: L.awLabels
  });
  if (L.vrp) E.vrpLabels = true;
  P.cities = L.cities;
  P.zones = Object.keys(AS_GROUPS).filter(g => L[g]).flatMap(g => AS_GROUPS[g]);
  P.otherZones = L.asOther; // types hors familles : ajoutés à la lecture (loadData)
  P.corridorNm = L.corridor ? +B.corridorNm || 10 : 0;
  E.zoom = {
    ...(E.zoom || {}),
    ...(S.layers?.[S.preset]?.zoom || {}),
    ...(S.tuneZoom?.[S.preset] || {})
  };
  return P;
}
/** Une couche changée (ou toutes remises, key null) : gardée par préréglage sur cet appareil, carte et profil refaits. */
function setLayer(key, value, keep = false) {
  const all = S.layers ||= {};
  if (keep);
  else if (key == null) delete all[S.preset];
  else {
    const own = all[S.preset] ||= {};
    if (baseLayers()[key] === value) delete own[key];
    else own[key] = value;
  }
  saveUi();
  S.profile = effectiveProfile();
  S.data = null;
  fillLayers();
  if (S.tuneEl) tuneVis();
  schedule();
  buildProfile();
}
/** Réglages de l'écran gardés sur cet appareil (cache du frame) : préréglage et couches par préréglage. */
const saveUi = () => S.ctx.data.put('cache/maps/ui.json', {
  preset: S.preset,
  layers: S.layers || {}
}).catch(() => {});
/** Cases du panneau selon les couches du préréglage ; cochées seulement si elles changent. */
function fillLayers() {
  const L = layersNow();
  for (const c of S.layersEl.querySelectorAll('input[data-layer]')) {
    if (c.type === 'range') {
      const v = String(Math.round(+L[c.dataset.layer] || 0));
      if (c.value !== v) c.value = v;
      const out = S.layersEl.querySelector('[data-detail-v]'),
        t = +v > 0 ? `+${v}` : v;
      if (out && out.textContent !== t) out.textContent = t;
      continue;
    }
    const v = !!L[c.dataset.layer];
    if (c.checked !== v) c.checked = v;
  }
}
/** Panneau des couches ouvert ou fermé. */
function toggleLayers(open = S.layersEl.hidden) {
  if (S.layersEl.hidden === !open) return;
  S.layersEl.hidden = !open;
  S.layersBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    fillLayers();
    if (S.sheet === 2) setSheet(1); // feuille agrandie : le panneau n'aurait que quelques lignes de carte
  }
}
/** Emprise donnée par l'adresse (#maps?view=ouest,sud,est,nord), sinon null. */
const viewOf = () => {
  const v = String(S.ctx.query?.view || '').split(',').map(Number);
  return v.length === 4 && v.every(Number.isFinite) ? {
    w: v[0],
    s: v[1],
    e: v[2],
    n: v[3]
  } : null;
};
/** Profils des modes de la compagnie (airline/map_profiles.json) et unité d'altitude du pilote (fuel.json, displayAlt :
 *  équidistance des courbes de niveau). */
async function readSettings() {
  const P = await S.ctx.data.get('airline/map_profiles.json').catch(() => null),
    F = await S.ctx.data.get(`pilot/${S.ctx.identity?.trigram || 'ANON'}/fuel.json`).catch(() => null);
  S.repoProfiles = P?.profiles && typeof P.profiles === 'object' ? P.profiles : null;
  S.altUnit = F?.displayAlt === 'm' ? 'm' : 'ft';
}
// ---------------------------------------------------------------- réglage des seuils (#maps?tune=1, administrateur)
// Une ligne par élément dessiné, un double curseur « visible de … à … » en zoom MapLibre (avec les NM par cm d'écran),
// par mode (onglets) ; la carte suit en direct (S.tuneZoom) ; « Tout remettre » revient aux valeurs de départ du mode ;
// enregistrés pour la compagnie (airline/map_profiles.json, profiles[mode].elements.zoom) ou gardés sur cet appareil
// (cache/maps/ui.json, layers[mode].zoom). Lecture seule sur un téléphone.
const Z_MAX = 18;
/** NM par cm d'écran au zoom z, à la latitude lat (tuiles de 512 px, 96 px par pouce). */
const nmPerCm = (z, lat) => 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * 2 ** z) * 96 / 2.54 / 1852;
const fmtNm = v => v >= 10 ? String(Math.round(v)) : v.toFixed(1);
/** Seuils du mode courant tels qu'ils s'appliquent. */
const zoomNow = () => S.profile?.elements?.zoom || zoomDefaults(S.preset);
/** Page de réglage : construite une fois, remplie par mode. */
function tuneSetup(box) {
  S.tuneEl = box;
  S.tuneZoom = {};
  S.tuneRO = matchMedia('(max-width: 599px)').matches;
  box.addEventListener('input', e => {
    const r = e.target.closest('input[data-z]');
    if (!r || S.tuneRO) return;
    const k = r.dataset.z,
      row = r.closest('[data-row]'),
      [lo, hi] = [...row.querySelectorAll('input[data-z]')].map(x => +x.value),
      cur = [Math.min(lo, hi), Math.max(lo, hi) >= Z_MAX ? 24 : Math.max(lo, hi)];
    (S.tuneZoom[S.preset] ||= {})[k] = cur;
    S.profile = effectiveProfile();
    tuneRow(row, k, cur);
    schedule();
  });
  box.addEventListener('change', e => {
    const c = e.target.closest('input[data-vis]');
    if (c && !S.tuneRO) setLayer(c.dataset.vis, c.checked);
  });
  box.addEventListener('click', async e => {
    const tab = e.target.closest('[data-tune-mode]')?.dataset.tuneMode;
    if (tab && tab !== S.preset) {
      await setPreset(tab);
      return fillTune();
    }
    const act = e.target.closest('[data-tune]')?.dataset.tune;
    if (!act || S.tuneRO) return;
    if (act === 'resetVis') {
      // cases des lignes remises aux valeurs intégrées du mode (comme les curseurs), le reste des couches gardé
      const own = (S.layers ||= {})[S.preset] ||= {},
        B = layerDefaults(builtinProfile()),
        base = baseLayers();
      for (const k of new Set(Object.values(LAYER_OF)))
        if (B[k] === base[k]) delete own[k];
        else own[k] = B[k];
      return setLayer(null, null, true);
    }
    if (act === 'reset') {
      S.tuneZoom[S.preset] = zoomDefaults(S.preset);
      S.profile = effectiveProfile();
      fillTune();
      return schedule();
    }
    const z = structuredClone(zoomNow()),
      name = tt(TX.presets[S.preset]);
    if (act === 'dev') {
      ((S.layers ||= {})[S.preset] ||= {}).zoom = z;
      saveUi();
      return S.ctx.notify?.(tt(TX.tuneSavedDev, {
        m: name
      }), 'info');
    }
    const path = 'airline/map_profiles.json',
      cur = (await S.ctx.data.get(path).catch(() => null)) || {},
      profiles = {
        ...(cur.profiles || {})
      };
    const L = layersNow();
    profiles[S.preset] = {
      ...(profiles[S.preset] || {}),
      layers: Object.fromEntries([...new Set(Object.values(LAYER_OF))].map(k => [k, !!L[k]])),
      elements: {
        ...(profiles[S.preset]?.elements || {}),
        zoom: z
      }
    };
    await S.ctx.data.put(path, {
      schema: 1,
      ...cur,
      profiles,
      by: 'maps',
      updated_at: new Date().toISOString()
    });
    S.ctx.notify?.(tt(TX.tuneSavedCo, {
      m: name
    }), 'info');
  });
  fillTune();
}
/** Libellé d'un seuil : « z 6,5 (12 NM/cm) », ou « sans limite ». */
const zLabel = (z, lat) => z >= Z_MAX ? tt(TX.tuneNoLimit) : `z ${(+z).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')} (${fmtNm(nmPerCm(z, lat))} NM/cm)`;
/** Ligne d'un élément mise à jour (valeurs, libellé) ; écritures seulement si elles changent. */
function tuneRow(row, k, [lo, hi]) {
  const [a, b] = row.querySelectorAll('input[data-z]'),
    lat = S.tuneLat ?? 46,
    va = String(lo),
    vb = String(Math.min(Z_MAX, hi));
  if (a.value !== va) a.value = va;
  if (b.value !== vb) b.value = vb;
  const t = hi >= Z_MAX ? tt(TX.tuneFrom, {
      a: zLabel(lo, lat)
    }) : tt(TX.tuneRange, {
      a: zLabel(lo, lat),
      b: zLabel(hi, lat)
    }),
    out = row.querySelector('[data-range]');
  if (out.textContent !== t) out.textContent = t;
}
/** Page de réglage remplie pour le mode courant. */
function fillTune() {
  const box = S.tuneEl,
    z = zoomNow(),
    ro = S.tuneRO ? ' disabled' : '';
  box.innerHTML = `<h2>${esc(tt(TX.tuneTitle))}</h2><p class="f-muted">${esc(tt(TX.tuneHint))}</p>${S.tuneRO ? `<p class="f-muted"><b>${esc(tt(TX.tuneRO))}</b></p>` : ''}
<p class="mp-tune-now" data-now></p>
<div class="mp-tune-tabs" role="group">${MODES.map(([k, icon, cls]) => `<button type="button" class="mp-choice${cls}" data-tune-mode="${k}" aria-pressed="${k === S.preset}" title="${esc(modeTitle(S.ctx, k))}" aria-label="${esc(modeTitle(S.ctx, k))}">${icon}</button>`).join('')}</div>
<div class="mp-tune-rows">${ZOOM_KEYS.map(k => `<div class="mp-tune-row" data-row="${k}"><label class="mp-tune-name" title="${esc(tt(TX.tuneVis, { e: tt(TX.zoomNames[k]), l: tt(TX.layerNames[LAYER_OF[k]]) }))}"><input type="checkbox" data-vis="${LAYER_OF[k]}"${ro}> ${esc(tt(TX.zoomNames[k]))}</label><div class="mp-tune-dual"><span class="mp-tune-mark" aria-hidden="true"></span><input type="range" min="0" max="${Z_MAX}" step="0.25" data-z="${k}" aria-label="${esc(tt(TX.tuneMin, { e: tt(TX.zoomNames[k]) }))}"${ro}><input type="range" min="0" max="${Z_MAX}" step="0.25" data-z="${k}" aria-label="${esc(tt(TX.tuneMax, { e: tt(TX.zoomNames[k]) }))}"${ro}></div><div class="mp-tune-range f-muted" data-range></div></div>`).join('')}</div>
<div class="f-row"><button type="button" data-tune="resetVis"${ro}>${esc(tt(TX.tuneResetVis))}</button><button type="button" data-tune="reset"${ro}>${esc(tt(TX.tuneResetZoom))}</button><button type="button" data-tune="dev"${ro}>${esc(tt(TX.tuneSaveDev))}</button><button type="button" class="primary" data-tune="co"${ro}>${esc(tt(TX.tuneSaveCo))}</button></div>`;
  for (const k of ZOOM_KEYS) tuneRow(box.querySelector(`[data-row="${k}"]`), k, z[k] || [0, 24]);
  tuneVis();
  S.tuneMarked = null;
  schedule();
}
/** Cases « visible » de la page de réglage selon les couches du mode (lignes décochées grisées) ; écrit seulement ce qui
 *  change. */
function tuneVis() {
  const L = layersNow();
  for (const c of S.tuneEl.querySelectorAll('input[data-vis]')) {
    const v = !!L[c.dataset.vis],
      row = c.closest('[data-row]');
    if (c.checked !== v) c.checked = v;
    if (row.classList.contains('mp-tune-off') === v) row.classList.toggle('mp-tune-off', !v);
  }
}
/** Zoom courant marqué sur chaque curseur, et rappelé en tête (NM par cm) ; écrit seulement s'il change. */
function markTune(zReal, zEff, lat, W, H) {
  S.tuneLat = lat;
  const key = `${zReal.toFixed(2)}|${zEff.toFixed(2)}|${lat.toFixed(1)}|${W}x${H}`;
  if (S.tuneMarked === key) return;
  S.tuneMarked = key;
  // la marque est le zoom effectif : c'est lui que les seuils des curseurs comparent
  const left = `${Math.max(0, Math.min(100, zEff / Z_MAX * 100)).toFixed(2)}%`;
  for (const m of S.tuneEl.querySelectorAll('.mp-tune-mark'))
    if (m.style.left !== left) m.style.left = left;
  const now = S.tuneEl.querySelector('[data-now]'),
    t = tt(TX.tuneNow, {
      z: zReal.toFixed(2),
      e: zEff.toFixed(2),
      m: Math.round((W + H) / 2),
      s: fmtNm(nmPerCm(zReal, lat))
    });
  if (now && now.textContent !== t) now.textContent = t;
}
// ---------------------------------------------------------------- vol démarré (lot 8)
// Tant que le vol courant porte started : position prévue (progress.plannedPos, de Carburant : symbole creux,
// « prévu hh:mm ») et position réelle (progress.actual, du cadre : GPS ou réseau ; symbole plein orienté à la route
// suivie, trace des 30 dernières minutes en pointillé) ; entre les deux, l'écart (avance ou retard en minutes et NM,
// écart latéral à la route) ; sur le profil, l'altitude réelle contre la prévue ; ETA des points (progress.eta) de près ;
// « Suivre » garde la carte sur la position réelle (arrêté par un déplacement de l'utilisateur) ; sans position réelle :
// un message et les réglages ; position de plus de 2 min : grisée. Rien hors d'un vol démarré.
const STALE_MS = 120e3,
  TRAIL_MS = 30 * 60e3;
/** Vrai si le vol courant est en cours : started non nul (remis à null quand Carburant l'annule ou quand le compte rendu
 *  est enregistré). */
const inFlight = (f = S.route.flight) => !!f?.started;
/** Même route (points et niveau) : seule la progression a changé. */
const sameRoute = (a, b) => !!a && !!b && JSON.stringify([a.route?.points, a.level?.ft, a.started?.at]) === JSON.stringify([b.route?.points,
  b.level?.ft, b.started?.at
]);
/** Position valide { lat, lon } d'un objet, sinon null. */
const posOf = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) ? {
  ...p,
  lat: +p.lat,
  lon: +p.lon
} : null;
/** Position réelle de ce vol : progress.actual, sauf une position d'avant le départ (celle du vol précédent, gardée
 *  tant que le cadre ne l'a pas remise à null) ; null sinon. */
const actualOf = f => {
  const a = posOf(f?.progress?.actual),
    t0 = Date.parse(f?.started?.at || '');
  return a && !(Number.isFinite(t0) && Date.parse(a.at || '') < t0) ? a : null;
};
/** Progression relue seule : enregistrement, trace, ligne d'état, carte, profil et caméra (« Suivre »). */
function progressOnly(f) {
  S.route = {
    ...S.route,
    flight: f,
    updated: f?.updated_at || ''
  };
  progressUpdate();
  schedule();
  drawCursor();
}
/** Trace gardée en mémoire (30 dernières minutes) et état de la progression. */
function progressUpdate() {
  const f = S.route.flight,
    on = inFlight(f),
    a = on ? actualOf(f) : null,
    t0 = Date.parse(f?.started?.at || '');
  if (S.followBtn.hidden === on) S.followBtn.hidden = !on;
  if (!on) {
    S.trail = [];
    if (S.follow) setFollow(false);
    if (!S.progEl.hidden) S.progEl.hidden = true;
    return;
  }
  const now = Date.now();
  S.trail = [...(S.trail || []), ...(Array.isArray(f.progress?.actual?.trail) ? f.progress.actual.trail.map(posOf).filter(Boolean) : []),
      ...(a ? [a] : [])
    ].filter(p => !p.at || !Number.isFinite(t0) || Date.parse(p.at) >= t0) // rien du vol précédent
    .filter((p, i, all) => !p.at || now - Date.parse(p.at) <= TRAIL_MS).filter((p, i, all) => !i || p.lat !== all[i - 1].lat || p.lon !==
      all[i - 1].lon).slice(-400);
  const st = progressState(),
    html = progressHtml(st);
  if (S.progEl.innerHTML !== html) S.progEl.innerHTML = html;
  if (S.progEl.hidden) S.progEl.hidden = false;
  if (S.follow && st.actual && S.map) {
    S.selfMove = true;
    S.map.once('moveend', () => {
      if (S) S.selfMove = false;
    });
    S.map.easeTo({
      center: [st.actual.lon, st.actual.lat],
      duration: 400
    });
  }
}
/** Projection d'une position sur la route : distance depuis le départ (NM), écart latéral (NM, positif à droite). */
function alongRoute(p) {
  const pts = (S.route.flight?.route?.points || []).map(posOf).filter(Boolean);
  if (pts.length < 2 || !p) return null;
  const cum = MapsRender.distances(pts);
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      k = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180),
      bx = (b.lon - a.lon) * k * 60,
      by = (b.lat - a.lat) * 60,
      px = (p.lon - a.lon) * k * 60,
      py = (p.lat - a.lat) * 60,
      L2 = bx * bx + by * by || 1e-9,
      t = Math.max(0, Math.min(1, (px * bx + py * by) / L2)),
      dx = px - t * bx,
      dy = py - t * by,
      d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = {
      d,
      s: cum[i] + t * (cum[i + 1] - cum[i]),
      side: bx * py - by * px < 0 ? 1 : -1 // à droite du sens de vol : produit vectoriel négatif
    };
  }
  return {
    nm: best.s,
    xtk: best.d * best.side,
    total: cum[cum.length - 1]
  };
}
/** État de la progression : positions, écart en distance et en temps, écart latéral, péremption. */
function progressState() {
  const f = S.route.flight,
    dep = posOf(S.route.points?.[0]),
    // roulage (Carburant : phase « taxi ») : l'avion prévu est encore au terrain, au sol ; la montée commence au
    // décollage prévu (phase « climb »)
    taxi = f?.progress?.phase === 'taxi' && dep,
    planned = taxi ? {
      ...(f?.progress?.plannedPos || {}),
      lat: dep.lat,
      lon: dep.lon,
      nmFromDep: 0,
      altFt: 0
    } : posOf(f?.progress?.plannedPos),
    actual = actualOf(f),
    ageMs = actual?.at ? Date.now() - Date.parse(actual.at) : 0,
    pa = actual ? alongRoute(actual) : null,
    // distance prévue écrite par Carburant (nmFromDep), sinon la projection de la position prévue
    pp0 = planned ? alongRoute(planned) : null,
    pp = pp0 && Number.isFinite(+planned.nmFromDep) ? {
      ...pp0,
      nm: +planned.nmFromDep,
      xtk: 0
    } : pp0,
    gs = +actual?.gsKt > 30 ? +actual.gsKt : +f?.profile?.cruiseKt > 30 ? +f.profile.cruiseKt : 250,
    ahead = pa && pp ? pa.nm - pp.nm : null;
  return {
    planned,
    actual,
    stale: !!actual && ageMs > STALE_MS,
    ageMin: Math.round(ageMs / 60e3),
    pa,
    pp,
    aheadNm: ahead,
    aheadMin: ahead == null ? null : ahead / gs * 60
  };
}
/** Distance en NM à la façon de la langue : une décimale sous 10 NM (« 3,2 »), aucune au-delà. */
const nmTxt = v => v.toLocaleString(S.ctx.lang(), {
  minimumFractionDigits: v < 10 ? 1 : 0,
  maximumFractionDigits: v < 10 ? 1 : 0
});
/** Ligne d'état du vol démarré (au-dessus de la carte). */
function progressHtml(st) {
  if (!st.actual) return `<p class="f-muted">${esc(tt(TX.progNoPos))} <a href="#settings">${esc(tt(TX.progSettings))}</a></p>`;
  const parts = [];
  if (st.aheadMin != null) {
    const m = Math.round(Math.abs(st.aheadMin)),
      d = nmTxt(Math.abs(st.aheadNm));
    parts.push(m < 1 ? tt(TX.progOnTime) : tt(st.aheadMin > 0 ? TX.progAhead : TX.progLate, {
      m,
      d
    }));
  }
  if (st.pa) {
    const x = Math.abs(st.pa.xtk);
    parts.push(x < .5 ? tt(TX.progOnRoute) : tt(TX.progSide, {
      d: nmTxt(x),
      s: tt(st.pa.xtk > 0 ? TX.progRight : TX.progLeft)
    }));
  }
  if (+st.actual.altFt > 0 && st.pa && S.prof) {
    const pl = MapsProfile.at(S.prof, st.pa.nm * (S.prof.total / (st.pa.total || 1))).alt;
    if (pl != null) parts.push(tt(TX.progAlt, {
      a: formatLevel(+st.actual.altFt),
      p: formatLevel(pl)
    }));
  }
  const stale = st.stale ? ` <span class="mp-stale">(${esc(tt(TX.progStale, { m: st.ageMin }))})</span>` : '',
    // source de la position (progress.actual.source, posée par le cadre) ; une valeur inconnue : rien
    src = Object.hasOwn(TX.progSources, st.actual.source) ? ` <span class="f-muted">· ${esc(tt(TX.progFrom, {
      s: tt(TX.progSources[st.actual.source])
    }))}</span>` : '';
  return `<p><b>${esc(parts[0] || '')}</b>${parts.length > 1 ? ` · ${esc(parts.slice(1).join(' · '))}` : ''}${stale}${src}</p>`;
}
/** Avion vu de dessus orienté au cap (degrés vrais), plein ou creux. */
function drawPlane(ctx, c, hdg, col, filled, r = 9) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((+hdg || 0) * Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * .75, r * .8);
  ctx.lineTo(0, r * .35);
  ctx.lineTo(-r * .75, r * .8);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = S.theme.bg;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  if (filled) ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** Texte avec liseré du fond. */
function haloText(ctx, t, x, y, col, font = '700 12px Arial,sans-serif', align = 'left') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = S.theme.bg;
  ctx.lineWidth = 3;
  ctx.strokeText(t, x, y);
  ctx.fillStyle = col;
  ctx.fillText(t, x, y);
  ctx.restore();
}
/** Points de la route pour le dessin, avec leur heure estimée de près (vol démarré, 300 px par degré et plus) :
 *  progress.eta en liste [{ id, at }] ou en table { id: at } ; heures en UTC (frame/lib/time.js), l'heure locale entre
 *  parenthèses au départ et à l'arrivée seulement. Placée par render avec les libellés de la route. */
function withEta(route, pxDeg) {
  const f = S.route.flight,
    eta = f?.progress?.eta;
  if (S.mission || !inFlight(f) || !eta || pxDeg < 300) return route;
  const pts = f.route?.points || [],
    etaOf = (p, i) => Array.isArray(eta) ? (eta[i]?.id === p.id || !eta[i]?.id ? eta[i]?.at : eta.find(e => e.id === p.id)?.at) : eta[p.id];
  return route.map((p, i) => {
    const at = i < pts.length ? etaOf(p, i) : null;
    return at ? {
      ...p,
      eta: `ETA ${i === 0 || i === pts.length - 1 ? fmtZLocal(at) : fmtZ(at)}`
    } : p;
  });
}
/** Progression sur la carte : trace, position prévue (creuse), position réelle (pleine) ; les ETA sont des libellés de la route (withEta). */
function drawProgress(ctx, toC, pxDeg) {
  const f = S.route.flight,
    st = progressState(),
    acc = S.theme.accent,
    real = st.stale ? S.theme.muted : '#c62828';
  // ETA des points : libellés de la route (withEta, placés par render avant les terrains)
  // trace des 30 dernières minutes
  if (S.trail?.length > 1) {
    ctx.save();
    ctx.strokeStyle = real;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    S.trail.forEach((p, i) => {
      const q = toC(p.lat, p.lon);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.restore();
  }
  if (st.planned) {
    const q = toC(st.planned.lat, st.planned.lon),
      hdg = st.pp ? trackAt(st.pp.nm) : 0;
    drawPlane(ctx, q, hdg, acc, false);
    const at = st.planned.at || f.progress?.at;
    if (at) haloText(ctx, tt(TX.progPlanned, {
      t: fmtZ(at)
    }), q.x + 12, q.y - 12, acc);
  }
  if (st.actual) {
    const q = toC(st.actual.lat, st.actual.lon),
      tr = S.trail || [],
      prev = tr.length > 1 ? tr[tr.length - 2] : null,
      hdg = Number.isFinite(+st.actual.trackDeg) ? +st.actual.trackDeg : prev ? MapsRender.trackOf(prev, st.actual) : 0;
    drawPlane(ctx, q, hdg, real, true, 10);
  }
}
/** Route vraie de la route au point à nm du départ (pour orienter la position prévue). */
function trackAt(nm) {
  const pts = (S.route.flight?.route?.points || []).map(posOf).filter(Boolean),
    cum = MapsRender.distances(pts);
  for (let i = 0; i < pts.length - 1; i++)
    if (nm <= cum[i + 1] || i === pts.length - 2) return MapsRender.trackOf(pts[i], pts[i + 1]);
  return 0;
}
/** Profil : altitude réelle (point plein) à la distance réelle, position prévue (cercle) à la distance prévue. */
function drawProgressProfile(ctx) {
  const st = progressState(),
    g = S.geo;
  if (!g || !S.prof) return;
  const k = st.pa?.total ? S.prof.total / st.pa.total : st.pp?.total ? S.prof.total / st.pp.total : 0,
    y = ft => g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(ft, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
  ctx.save();
  if (st.pp && k) {
    const s = st.pp.nm * k,
      alt = +st.planned.altFt > 0 ? +st.planned.altFt : MapsProfile.at(S.prof, s).alt;
    if (alt != null) {
      ctx.beginPath();
      ctx.arc(MapsProfile.xOf(g, s), y(alt), 6, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = S.theme.accent;
      ctx.stroke();
    }
  }
  if (st.pa && k && +st.actual.altFt > 0) {
    ctx.beginPath();
    ctx.arc(MapsProfile.xOf(g, st.pa.nm * k), y(+st.actual.altFt), 6, 0, Math.PI * 2);
    ctx.fillStyle = st.stale ? S.theme.muted : '#c62828';
    ctx.fill();
  }
  ctx.restore();
}
/** « Suivre » : la carte reste centrée sur la position réelle ; arrêté par un déplacement de l'utilisateur. */
function setFollow(on) {
  S.follow = on;
  if (S.followBtn.getAttribute('aria-pressed') !== String(on)) S.followBtn.setAttribute('aria-pressed', String(on));
  if (on) {
    S.userMoved = false;
    progressUpdate();
  }
}
/** Décalage des seuils en crans : le curseur de complexité. La taille du cadre (volet de la vue double, téléphone) n'est
 *  plus un cran fixe : elle corrige le zoom effectif (MapsRender.effectiveZoom). */
const detailShift = () => layersNow().detail || 0;
/** Cadre la carte sur le vol (seul mouvement de caméra fait par le module, marqué pour ne pas passer pour celui de
 *  l'utilisateur). */
function fitMap(animate) {
  S.selfMove = true;
  S.map.once('moveend', () => {
    if (S) S.selfMove = false;
  });
  S.map.fitBounds([
    [S.fit.w, S.fit.s],
    [S.fit.e, S.fit.n]
  ], {
    padding: 12,
    animate
  });
  if (!animate) S.selfMove = false;
}
/** Vol (re)lu. live : écriture du vol courant pendant qu'on le regarde (vue double avec Carburant) — la vue reste où
 *  l'utilisateur l'a mise tant que la route y tient ; les zones déjà lues par aerodb ne sont pas relues. */
async function applyFlight(live = false) {
  S.route = await readFlight();
  if (!S) return;
  S.profile = effectiveProfile();
  const all = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])];
  S.fit = viewOf() || MapsRender.bboxOf(all, 25) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = MapsRender.marks(S.route.points);
  S.data = null;
  if (!live) S.cursor = null;
  showBox(!!S.route.points.length); // pas de vol : pas de carte, le message de l'état
  header();
  const inView = () => {
      const bb = S.map.getBounds();
      return all.every(p => p.lon >= bb.getWest() && p.lon <= bb.getEast() && p.lat >= bb.getSouth() && p.lat <= bb.getNorth());
    },
    // un autre vol (départ ou arrivée changés) se recadre ; le même vol relu (vue vivante, devis refait par Carburant,
    // geste sur la carte) garde la caméra dès que l'utilisateur a déplacé ou zoomé la carte
    key = `${S.route.flight?.route?.dep || ''}>${S.route.flight?.route?.arr || ''}`,
    other = key !== S.routeKey;
  S.routeKey = key;
  if (other) S.userMoved = false;
  if (S.map && (!live || other || (!S.userMoved && !inView()))) fitMap(false);
  status();
  progressUpdate();
  schedule();
  buildProfile();
}

// ---------------------------------------------------------------- cartes de mission
const MISSION_YAML = /^missions\/[^/]+\/([^/]+)\/mission[^/]*\.ya?ml$/i;
/** Missions du dépôt (chemins du YAML de chaque dossier ; liste de l'arbre, rien n'est lu) : [{ id, path }]. */
async function missionList() {
  const paths = await S.ctx.data.list('missions/').catch(() => null) || [];
  return paths.map(path => ({
    id: MISSION_YAML.exec(path)?.[1],
    path
  })).filter(x => x.id).sort((a, b) => a.id.localeCompare(b.id));
}
/** Points du cheminement de la mission : route_points écrits par le studio, sinon le texte (vertical_profile.route,
 *  sinon départ, points tournants, destination) résolu par les points de la mission, puis par aerodb. */
async function missionRoute(mission) {
  const v = mission.vprof;
  if (v.routePoints.length >= 2) return v.routePoints;
  const text = MapsMission.routeTokens(mission),
    own = new Map(),
    K = MapsMission.keyNorm;
  for (const p of mission.points) {
    if (p.id) own.set(K(p.id), p);
    if (p.name) own.set(K(p.name), p);
  }
  for (const z of mission.zones) own.set(K(z.id), z);
  const ext = new Map();
  if (S.ctx.aerodb)
    for (const tok of new Set(text.split(/[\s,;]+/).map(t => t.split('/')[0].trim()).filter(Boolean)))
      if (!own.has(K(tok)) && /^[A-Z0-9]{2,5}$/i.test(tok)) {
        const c = await S.ctx.aerodb.coords(tok).catch(() => null);
        if (c) ext.set(tok.toUpperCase(), c);
      }
  const resolve = name => {
    const p = own.get(K(name)) || ext.get(String(name).toUpperCase());
    return p ? {
      name: p.id || name,
      lat: p.lat,
      lon: p.lon
    } : null;
  };
  try {
    // niveaux du texte gardés (lvl : niveau de croisière à partir du point ; alt : altitude à atteindre au point)
    return SiaProfile.parseRoute(text, resolve).points.map(p => ({
      id: p.name,
      lat: p.lat,
      lon: p.lon,
      ...(Number.isFinite(p.alt) ? {
        alt: p.alt
      } : {}),
      ...(p.lvl ? {
        lvl: p.lvl
      } : {})
    }));
  } catch {
    return [];
  }
}
/** Mission (re)lue et carte choisie : profil, emprise, cheminement tracé si la carte le demande, profil vertical. */
async function applyMission() {
  const q = S.ctx.query || {},
    list = await missionList(),
    hit = list.find(x => x.id === q.mission);
  S.missions = list;
  S.mission = null;
  S.missionError = '';
  if (!hit) S.missionError = tt(TX.missionMissing, {
    m: q.mission
  });
  else try {
    const r = await S.ctx.data.read(hit.path, {
        policy: 'reference',
        wait: true
      }),
      text = typeof r?.value === 'string' ? r.value : r?.text;
    if (!text) throw new Error('empty');
    S.mission = MapsMission.parse(window.jsyaml.load(text));
    S.mission.id ||= hit.id;
    S.missionRev = r.rev || '';
  } catch (e) {
    S.missionError = tt(TX.missionBad, {
      e: e?.message || e
    });
  }
  if (!S) return;
  const M = S.mission,
    m = M ? M.maps.find(x => x.file === q.map) || M.maps[0] || null : null,
    chosen = m ? MapsMission.profileFor(m, window.MAPS_PROFILES) : {
      profile: window.MAPS_PROFILES.find(p => p.id === 'ifr-simple'),
      source: 'builtin-type'
    };
  S.mapDef = m;
  S.profile = chosen.profile;
  S.profileSource = chosen.source;
  S.vprofProfile = M?.vprof.profileDef || window.MAPS_PROFILES.find(p => p.id === 'vprof') || null;
  const pts = M ? await missionRoute(M) : [];
  if (!S) return;
  const trace = m?.trace || (M?.vprof.onMap !== false && pts.length > 1 ? 'route' : 'none'),
    shown = trace === 'route' || trace === 'both' ? pts : [];
  S.route = {
    flight: {
      profile: M?.vprof.rates || null
    },
    points: shown,
    profilePoints: pts,
    altn: null,
    levelFt: M?.vprof.cruiseFt || 0,
    updated: `${q.mission}|${m?.file || ''}|${S.missionRev || ''}`
  };
  S.fit = viewOf() || m?.extent || MapsRender.bboxOf([...pts, ...(M?.points || [])], 10) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = shown.length > 1 ? MapsRender.marks(shown) : [];
  S.data = null;
  S.cursor = null;
  showBox(!!M);
  header();
  fillPick();
  status();
  schedule();
  buildProfile();
}
/** Choix de la carte : vol prévu, puis chaque mission du dépôt ; pour une mission, ses cartes. */
async function fillPick() {
  const q = S.ctx.query || {},
    list = S.missions || await missionList();
  if (!S) return;
  S.missions = list;
  const cur = q.mission ? `m:${q.mission}` : 'flight',
    html = `<option value="flight">${esc(tt(TX.flight))}</option>${list.length ? `<optgroup label="${esc(tt(TX.missionsGroup))}">${list.map(x => `<option value="m:${esc(x.id)}">${esc(x.id)}</option>`).join('')}</optgroup>` : ''}`;
  if (S.pickEl.innerHTML !== html) S.pickEl.innerHTML = html;
  S.pickEl.value = cur;
  const maps = S.mission?.maps || [],
    mh = maps.map(m => `<option value="${esc(m.file)}">${esc(m.description || m.file)}</option>`).join('');
  S.mapPickEl.hidden = maps.length < 2;
  if (S.mapPickEl.innerHTML !== mh) S.mapPickEl.innerHTML = mh;
  if (S.mapDef) S.mapPickEl.value = S.mapDef.file;
}
/** Adresse de la carte choisie (le cadre remonte le module sur sa nouvelle suite d'adresse). */
function go(mission, map) {
  location.hash = mission ? `#maps?mission=${encodeURIComponent(mission)}${map ? `&map=${encodeURIComponent(map)}` : ''}` : '#maps';
}

const STYLE = `
/* L'ÉCRAN EST FIXE (meta.fixed) : la racine est une colonne à la hauteur de la vue du cadre, rien n'en dépasse ni ne fait
   défiler la page — barre d'outils d'une ligne, ligne d'information, carte (prend ce qui reste), feuille de données de
   hauteur fixe ; ce qui est plus grand défile DANS sa zone. La racine est isolée (z-index des boutons de la carte, 3 à 8,
   gardés sous l'en-tête et la barre du bas du cadre, dans le volet de la vue double aussi). Hors vue fixe (volet,
   page d'essai) la hauteur est donnée plus bas. */
[data-module="maps"]{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;isolation:isolate;--mp-head:44px;--mp-p1:.38;--mp-m1:170;--mp-p2:.7;--mp-m2:260}
@media (min-width:761px){[data-module="maps"]{--mp-p1:.35}}
[data-module="maps"] .mp-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
[data-module="maps"] .mp-bar{display:flex;align-items:center;gap:6px;flex:none;padding:2px 8px}
[data-module="maps"] .mp-picks{display:flex;gap:6px;flex:1 1 0;min-width:0;max-width:380px}
[data-module="maps"] .mp-picks select{min-height:var(--sog-touch);min-width:0;width:100%;flex:1 1 0;text-overflow:ellipsis}
[data-module="maps"] .mp-sum{flex:none;margin:0;padding:0 8px 4px;font-size:var(--sog-size-xs);line-height:16px;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="maps"] .mp-sum:empty{display:none}
[data-module="maps"] .mp-progress,[data-module="maps"] .mp-status{flex:none;padding:0 8px 4px;font-size:var(--sog-size-xs)}
[data-module="maps"] .mp-progress[hidden],[data-module="maps"] .mp-ib[hidden]{display:none}
[data-module="maps"] .mp-status p:has(button){display:flex;flex-wrap:wrap;align-items:center;gap:6px}
[data-module="maps"] .mp-progress p,[data-module="maps"] .mp-status p{margin:0 0 2px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
[data-module="maps"] .mp-status:empty{display:none}
[data-module="maps"] .mp-box{position:relative;flex:1 1 0;min-height:0;border:solid var(--sog-border);border-width:1px 0;overflow:hidden;background:var(--sog-bg);touch-action:none}
[data-module="maps"] .mp-map{position:absolute;inset:0}
[data-module="maps"] canvas.mp-over{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
[data-module="maps"] .mp-credit{position:absolute;right:4px;bottom:2px;font-size:10px;color:var(--sog-fg);background:var(--sog-chart-bg);opacity:.85;padding:0 4px;border-radius:var(--sog-radius-s);pointer-events:none}
[data-module="maps"] .mp-prof{position:relative;flex:1 1 0;min-height:0;max-height:380px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:var(--sog-chart-bg);touch-action:none;cursor:crosshair}
[data-module="maps"] .mp-prof canvas{position:absolute;inset:0;width:100%;height:100%}
[data-module="maps"] .mp-strip{flex:none;height:34px;overflow-y:auto;font-size:var(--sog-size-xs);line-height:16px;padding:1px 0;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-box{container-type:inline-size}
[data-module="maps"] .mp-modes{position:relative;flex:none}
[data-module="maps"] .mp-modes[hidden]{display:none}
[data-module="maps"] .mp-mode-btn,[data-module="maps"] .mp-choice,[data-module="maps"] .mp-ib{display:grid;place-items:center;width:var(--sog-touch);height:var(--sog-touch);min-height:0;padding:0;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);color:var(--sog-fg);font:inherit;cursor:pointer}
[data-module="maps"] .mp-mode-btn{color:var(--sog-accent)}
[data-module="maps"] .mp-mode-btn[aria-expanded=true]{box-shadow:inset 0 0 0 1px var(--sog-accent)}
[data-module="maps"] .mp-mode-opts{position:absolute;right:0;top:calc(100% + 4px);z-index:8;display:flex;gap:4px;padding:4px;width:max-content;max-width:calc(100cqw - 16px);flex-wrap:wrap;box-sizing:border-box;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);box-shadow:0 4px 12px #0000001f}
[data-module="maps"] .mp-mode-opts[hidden]{display:none}
[data-module="maps"] .mp-choice{border-color:transparent;border-radius:var(--sog-radius-s)}
[data-module="maps"] .mp-choice:hover{background:color-mix(in srgb,var(--sog-accent) 12%,var(--sog-surface))}
[data-module="maps"] .mp-choice[aria-pressed=true]{color:var(--sog-accent);background:color-mix(in srgb,var(--sog-accent) 16%,var(--sog-surface));box-shadow:inset 0 0 0 1.5px var(--sog-accent),inset 0 2px 3px #0000002e}
[data-module="maps"] .mp-ic{display:grid;place-items:center;width:24px;height:24px}
[data-module="maps"] .mp-ic svg{width:20px;height:20px}
[data-module="maps"] .mp-ifr{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:26px;height:20px;font-size:11px;font-weight:700;letter-spacing:.3px;line-height:1}
[data-module="maps"] .mp-ceil{border-top:2px solid currentColor;padding-top:1px}
[data-module="maps"] .mp-floor{border-bottom:2px solid currentColor;padding-bottom:1px}
[data-module="maps"] .mp-topo{display:block;position:relative;box-sizing:border-box;width:29px;height:29px;overflow:hidden;transform:scale(.72)}
[data-module="maps"] .mp-topo>span{position:absolute;box-sizing:border-box;border:1.6px solid currentColor;border-radius:46% 54% 36% 64% / 36% 62% 38% 64%;transform:rotate(-38deg)}
[data-module="maps"] .mp-topo>span:nth-child(1){width:40px;height:53px;left:-11px;top:-8px}
[data-module="maps"] .mp-topo>span:nth-child(2){width:30px;height:41px;left:-6px;top:0}
[data-module="maps"] .mp-topo>span:nth-child(3){width:20px;height:29px;left:-1px;top:8px}
[data-module="maps"] .mp-topo>span:nth-child(4){width:10px;height:16px;left:4px;top:16px}
[data-module="maps"] .mp-mil,[data-module="maps"] .mp-mode-btn.mp-mil{color:var(--sog-err)}
[data-module="maps"] .mp-ic-cam svg{fill:currentColor}
[data-module="maps"] .mp-mil:hover,[data-module="maps"] .mp-choice.mp-mil[aria-pressed=true]{background:color-mix(in srgb,var(--sog-err) 12%,var(--sog-surface));color:var(--sog-err);box-shadow:inset 0 0 0 1.5px var(--sog-err),inset 0 2px 3px #0000002e}
[data-module="maps"] .mp-tip{position:absolute;z-index:4;max-width:min(92%,340px);padding:6px 8px;margin:0;font-size:.88em;line-height:1.35;pointer-events:none;box-shadow:0 2px 8px #0003}
[data-module="maps"] .mp-tip>div+div{margin-top:4px}
[data-module="maps"] .mp-tip.mp-hover{max-width:min(80%,320px);padding:3px 6px;font-size:11.5px;line-height:1.3;background:color-mix(in srgb,var(--sog-chart-bg) 65%,transparent);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);box-shadow:none}
[data-module="maps"] .mp-tip.mp-hover>div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
[data-module="maps"] .mp-layers-btn{position:absolute;left:8px;top:8px;z-index:3;width:var(--sog-touch);height:var(--sog-touch);min-height:0;display:grid;place-items:center;padding:0}
[data-module="maps"] .mp-layers{position:absolute;left:8px;top:calc(14px + var(--sog-touch));z-index:5;margin:0;padding:8px 10px;max-height:calc(100% - 22px - var(--sog-touch));overflow:auto;display:flex;flex-direction:column;gap:0;font-size:.9em;min-width:min(220px,80%)}
[data-module="maps"] .mp-layers label{display:flex;gap:8px;align-items:center;min-height:32px}
[data-module="maps"] .mp-layers .mp-l-main{border-bottom:1px solid var(--sog-border);margin-bottom:4px;padding-bottom:4px}
[data-module="maps"] .mp-layers .mp-l-detail{flex-wrap:wrap;border-top:1px solid var(--sog-border);margin-top:4px;padding-top:6px}
[data-module="maps"] .mp-layers .mp-l-detail input{flex:1 1 100%;margin:4px 0 0}
[data-module="maps"] .mp-layers .mp-l-help{font-size:.85em;margin-bottom:2px}
[data-module="maps"] .mp-tune h2{margin:0 0 4px;font-size:1.1em}
[data-module="maps"] .mp-tune-now{font-variant-numeric:tabular-nums;margin:4px 0}
[data-module="maps"] .mp-tune-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0 10px}
[data-module="maps"] .mp-tune-row{display:grid;grid-template-columns:minmax(9em,1fr) minmax(140px,1.4fr);gap:2px 10px;align-items:center;padding:4px 0;border-top:1px solid var(--sog-border)}
[data-module="maps"] .mp-tune-name{font-size:.92em;display:flex;align-items:center;gap:6px;cursor:pointer}
[data-module="maps"] .mp-tune-name input{width:auto;min-height:0;margin:0}
[data-module="maps"] .mp-tune-off .mp-tune-dual,[data-module="maps"] .mp-tune-off .mp-tune-range{opacity:.4}
[data-module="maps"] .mp-tune-range{grid-column:1 / -1;font-size:.82em;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-tune-dual{position:relative;height:28px}
[data-module="maps"] .mp-tune-dual input{position:absolute;inset:0;width:100%;margin:0;padding:0;border:0;box-shadow:none;background:none;pointer-events:none;-webkit-appearance:none;appearance:none;height:28px;min-height:0}
[data-module="maps"] .mp-tune-dual input::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--sog-accent);border:2px solid var(--sog-surface);box-shadow:0 0 0 1px var(--sog-accent);cursor:pointer}
[data-module="maps"] .mp-tune-dual input::-moz-range-thumb{pointer-events:auto;width:16px;height:16px;border-radius:50%;background:var(--sog-accent);border:2px solid var(--sog-surface);cursor:pointer}
[data-module="maps"] .mp-tune-dual input:disabled::-webkit-slider-thumb{background:var(--sog-muted);box-shadow:none;cursor:default}
[data-module="maps"] .mp-tune-dual::before{content:'';position:absolute;left:0;right:0;top:13px;height:2px;background:var(--sog-border)}
[data-module="maps"] .mp-tune-mark{position:absolute;top:6px;width:2px;height:16px;margin-left:-1px;background:var(--sog-err)}
/* page de réglage (#maps?tune=1) : une page qui défile, mais DANS la racine fixe (la vue du cadre ne défile pas) : blocs en
   hauteur naturelle, la carte retrouve une hauteur d'écran, le panneau de seuils à côté sur grand écran */
[data-module="maps"].mp-tuning{overflow:auto}
[data-module="maps"].mp-tuning>*{flex:none}
[data-module="maps"].mp-tuning .mp-box{height:52vh;min-height:260px}
[data-module="maps"].mp-tuning .mp-data{height:auto;transition:none}
[data-module="maps"].mp-tuning .mp-dprof{flex:none}
[data-module="maps"].mp-tuning .mp-prof{flex:none;height:240px}
[data-module="maps"].mp-tuning .mp-dbody{flex:none;height:260px}
/* !important : la règle de la vue fixe du cadre (html.f-fixed .f-view > .f-module { display: flex }) a plus de poids */
@media (min-width:1000px){[data-module="maps"].mp-tuning{display:grid!important;grid-template-columns:minmax(380px,440px) minmax(0,1fr);column-gap:16px;align-items:start;align-content:start}[data-module="maps"].mp-tuning>*{grid-column:2}[data-module="maps"].mp-tuning>.mp-tune{grid-column:1;grid-row:1 / span 40;position:sticky;top:8px;max-height:calc(100dvh - 90px);overflow:auto}}
[data-module="maps"] .mp-layers>*{flex-shrink:0}
[data-module="maps"] .mp-layers [data-layers-reset]{margin-top:10px;align-self:flex-start}
[data-module="maps"] .mp-layers[hidden],[data-module="maps"] .mp-layers-btn[hidden]{display:none}
[data-module="maps"] .mp-editbar{position:absolute;right:8px;top:8px;z-index:6;display:flex;gap:6px}
[data-module="maps"] .mp-editbar[hidden],[data-module="maps"] .mp-editbar [hidden]{display:none}
[data-module="maps"] .mp-editbar button{height:var(--sog-touch);min-height:0;padding:0 12px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);color:var(--sog-fg);font:inherit;font-weight:600;cursor:pointer}
[data-module="maps"] .mp-editbar .mp-add{width:var(--sog-touch);padding:0;font-size:1.3em}
[data-module="maps"] .mp-editbar .mp-add[aria-pressed=true]{background:var(--sog-accent);border-color:var(--sog-accent);color:var(--sog-surface)}
[data-module="maps"] .mp-editbar .mp-follow[aria-pressed=true]{background:var(--sog-accent);border-color:var(--sog-accent);color:var(--sog-surface)}
[data-module="maps"] .mp-progress{font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-progress b{font-weight:700}
[data-module="maps"] .mp-progress .mp-stale{color:var(--sog-muted)}
[data-module="maps"] .mp-editbar .mp-edit[aria-pressed=true]{background:var(--sog-accent);border-color:var(--sog-accent);color:var(--sog-surface)}
[data-module="maps"] .mp-editbar button:disabled{opacity:.5;cursor:default}
[data-module="maps"] .mp-pcard{pointer-events:auto;display:flex;flex-direction:column;gap:4px;min-width:140px}
[data-module="maps"] .mp-pcard[hidden]{display:none}
[data-module="maps"] .mp-vfr-focus{font-weight:700;background:color-mix(in srgb,var(--sog-accent) 12%,transparent)}
[data-module="maps"] .mp-pcard .f-btn{align-self:flex-start;margin-top:4px}
[data-module="maps"] .mp-vfr-warn{margin:0;font-size:.9em;color:#00695c;font-style:italic}
[data-module="maps"] .mp-vfr-seq{margin:2px 0 4px;padding-left:1.2em}
[data-module="maps"] .mp-vfr-pts{margin:2px 0 6px;padding:0;list-style:none;column-width:19em;column-gap:16px}
[data-module="maps"] .mp-vfr-pts li{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;break-inside:avoid}
[data-module="maps"] .mp-vfr-dot{display:inline-block;width:.6em;height:.6em;border-radius:50%;flex:none}
[data-module="maps"] .mp-vfr-note summary{cursor:pointer}
[data-module="maps"] .mp-vfr-note>div{white-space:pre-wrap;font-size:.85em;max-height:14em;overflow:auto;border-left:2px solid var(--sog-border);padding-left:6px}
/* le bloc de données : en-tête d'une ligne (ce qu'il montre, ✕ de 44 px à droite), puis le profil vertical ou le contenu ouvert
   à sa place, à la hauteur du profil (un seul bloc de règle) ; le contenu long défile dans le bloc */
/* la feuille de données : en-tête de 44 px (la poignée : barrette, titre de ce qu'elle montre ; le ✕ d'un contenu à droite),
   puis le profil vertical (sa bande dessous) ou le contenu ouvert à sa place, puis les notes ; hauteur fixe à trois positions
   (data-sheet 0, 1, 2 de la racine), le contenu défile dedans */
[data-module="maps"] .mp-data{position:relative;z-index:1;flex:none;display:flex;flex-direction:column;box-sizing:border-box;height:max(calc(var(--mp-p1) * 100%),calc(var(--mp-m1) * 1px));min-height:0;overflow:hidden;background:var(--sog-surface);border-top:1px solid var(--sog-border);border-radius:var(--sog-radius) var(--sog-radius) 0 0;box-shadow:0 -2px 8px #0000001a;transition:height .2s ease}
[data-module="maps"][data-sheet="0"] .mp-data{height:calc(var(--mp-head) + 1px)}
[data-module="maps"][data-sheet="2"] .mp-data{height:max(calc(var(--mp-p2) * 100%),calc(var(--mp-m2) * 1px))}
[data-module="maps"] .mp-data.mp-nt{transition:none}
@media (prefers-reduced-motion:reduce){[data-module="maps"] .mp-data{transition:none}}
[data-module="maps"][data-sheet="0"] :is(.mp-dprof,.mp-dbody,.mp-notes){display:none}
[data-module="maps"] .mp-dhead{flex:none;display:flex;align-items:stretch;height:var(--mp-head);font-size:.92em;touch-action:none;user-select:none;-webkit-user-select:none}
[data-module="maps"] .mp-grip{position:relative;flex:1 1 0;min-width:0;min-height:0;height:100%;display:flex;align-items:center;margin:0;padding:6px 8px 0;border:0;border-radius:0;background:none;color:inherit;font:inherit;text-align:left;cursor:grab;touch-action:none}
[data-module="maps"] .mp-grip:active{cursor:grabbing}
[data-module="maps"] .mp-pill{position:absolute;left:50%;top:6px;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:color-mix(in srgb,var(--sog-muted) 55%,transparent)}
[data-module="maps"] .mp-dprof{flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding:0 8px}
[data-module="maps"] .mp-notes{flex:none;padding:0 8px 6px;font-size:var(--sog-size-xs)}
[data-module="maps"] .mp-notes p{margin:0 0 2px}
[data-module="maps"] .mp-notes:empty{display:none}
[data-module="maps"] .mp-data[hidden],[data-module="maps"] .mp-dclose[hidden],[data-module="maps"] .mp-dprof[hidden],[data-module="maps"] .mp-dbody[hidden]{display:none}
[data-module="maps"] .mp-dtitle{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="maps"] .mp-dclose{flex:none;width:44px;height:100%;min-height:0;margin:0;padding:0;border:0;background:none;font-size:1.2em;line-height:1;cursor:pointer;color:inherit;touch-action:manipulation}
[data-module="maps"] .mp-dbody{box-sizing:border-box;flex:1 1 0;min-height:0;margin:0 8px 8px;padding:6px 8px;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;border:1px solid var(--sog-border);border-radius:var(--sog-radius);background:var(--sog-surface);font-size:.92em;line-height:1.35}
[data-module="maps"] .mp-dbody p{margin:2px 0}
[data-module="maps"] .mp-lv-body{display:flex;align-items:flex-start;gap:12px}
[data-module="maps"] .mp-lv{flex:none;position:sticky;top:0;font:600 9.5px Arial,sans-serif;fill:currentColor;color:var(--sog-fg)}
[data-module="maps"] .mp-lv-list{flex:1 1 auto;min-width:0;margin:0;padding:0;list-style:none;column-width:19em;column-gap:16px}
[data-module="maps"] .mp-lv-list li{display:flex;gap:6px;align-items:baseline;break-inside:avoid;margin-bottom:3px}
[data-module="maps"] .mp-lv-n{font-weight:700;min-width:1.4em;text-align:right}
[data-module="maps"] .mp-lvl{display:flex;align-items:center;gap:8px}
[data-module="maps"] .mp-lvl .f-btn{margin:0;min-width:var(--sog-touch);font-weight:700}
[data-module="maps"].mp-editing .mp-prof{cursor:ns-resize}
/* hors de la vue fixe du cadre, la racine reçoit sa hauteur d'ici : le volet de la vue double (sous l'en-tête, avec sa barre
   de fermeture de 44 px) et, carte à gauche d'un volet, la colonne de la vue (en-tête de 57 px, marges de 16 px de la vue) */
.f-pane>[data-module="maps"]{height:calc(100dvh - 86px - var(--sog-touch));min-height:420px}
.f-view.f-split>[data-module="maps"]{height:calc(100dvh - 57px - 32px);min-height:420px}
`;

export async function mount(el, ctx) {
  performance.mark('maps:mount');
  S = {
    el,
    ctx,
    stops: [],
    edit: {
      on: false,
      undo: [],
      drag: null
    },
    route: {
      points: []
    },
    map: null,
    plain: false
  };
  el.innerHTML = `<style>${STYLE}</style>
<h1 class="mp-sr">${esc(ctx.t(TX.title))}</h1>
<div class="mp-bar"><div class="mp-picks"><select class="mp-pick" aria-label="${esc(ctx.t(TX.pick))}"></select>
<select class="mp-mappick" hidden aria-label="${esc(ctx.t(TX.mapOf))}"></select></div>
<button type="button" class="mp-ib" data-go="fuel?from=maps&amp;focus=route" aria-label="${esc(ctx.t(TX.edit))}" title="${esc(ctx.t(TX.edit))}">${svg('edit', { size: 22 })}</button>
<button type="button" class="mp-ib" data-fit aria-label="${esc(ctx.t(TX.fit))}" title="${esc(ctx.t(TX.fit))}">${svg('target', { size: 22 })}</button>
<div class="mp-modes"><button type="button" class="mp-mode-btn" aria-expanded="false" aria-controls="mp-mode-opts" aria-label="${esc(ctx.t(TX.preset))}"></button>
<div id="mp-mode-opts" class="mp-mode-opts" role="group" aria-label="${esc(ctx.t(TX.modes))}" hidden>${MODES.map(([k, icon, cls]) => `<button type="button" class="mp-choice${cls}" data-mode="${k}" aria-pressed="false" aria-label="${esc(modeTitle(ctx, k))}" title="${esc(modeTitle(ctx, k))}">${icon}</button>`).join('')}</div></div></div>
<p class="mp-sum f-muted" aria-live="polite"></p>
<div class="mp-progress" hidden aria-live="polite"></div>
<div class="mp-status" aria-live="polite"><p class="f-muted">${esc(ctx.t(TX.loading))}</p></div>
${ctx.query?.tune ? '<section class="mp-tune f-card" aria-live="off"></section>' : ''}
<div class="mp-box"><div class="mp-map"></div><canvas class="mp-over" aria-hidden="true"></canvas>
<button type="button" class="mp-layers-btn" aria-expanded="false" aria-label="${esc(ctx.t(TX.layers))}" title="${esc(ctx.t(TX.layers))}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 13 10 5 10-5"/><path d="m2 17.5 10 5 10-5" opacity=".55"/></svg></button>
<div class="mp-layers f-card" hidden role="group" aria-label="${esc(ctx.t(TX.layers))}"><b>${esc(ctx.t(TX.layers))}</b>
${LAYER_KEYS.map(k => `<label${k === 'corridor' ? ' class="mp-l-main"' : ''}><input type="checkbox" data-layer="${k}"> ${esc(ctx.t(TX.layerNames[k]))}</label>`).join('')}
<label class="mp-l-detail" title="${esc(ctx.t(TX.detailHelp))}">${esc(ctx.t(TX.detail))} <span data-detail-v></span><input type="range" min="-2" max="2" step="1" data-layer="detail" aria-describedby="mp-detail-help"></label>
<span id="mp-detail-help" class="f-muted mp-l-help">${esc(ctx.t(TX.detailHelp))}</span>
<button type="button" class="f-btn" data-layers-reset>${esc(ctx.t(TX.layersReset))}</button></div>
<div class="mp-editbar"><button type="button" class="mp-follow" hidden aria-pressed="false" title="${esc(ctx.t(TX.followHelp))}">${esc(ctx.t(TX.follow))}</button><button type="button" class="mp-add" hidden aria-pressed="false" title="${esc(ctx.t(TX.addPoint))}" aria-label="${esc(ctx.t(TX.addPoint))}">+</button><button type="button" class="mp-undo" hidden disabled title="${esc(ctx.t(TX.undoHelp))}">${esc(ctx.t(TX.undo))}</button><button type="button" class="mp-edit" aria-pressed="false" title="${esc(ctx.t(TX.editHelp))}">${esc(ctx.t(TX.editMode))}</button></div>
<div class="mp-tip f-card" hidden role="tooltip"></div>
<div class="mp-tip mp-pcard f-card" hidden role="dialog"></div>
<div class="mp-credit">${esc(ctx.t(TX.credit))}</div></div>
<div class="mp-data" hidden><div class="mp-dhead"><button type="button" class="mp-grip" aria-expanded="true" aria-label="${esc(ctx.t(TX.sheetSize))}"><span class="mp-pill" aria-hidden="true"></span><b class="mp-dtitle"></b></button><button type="button" class="mp-dclose" data-dclose hidden aria-label="${esc(ctx.t(TX.close))}" title="${esc(ctx.t(TX.close))}">✕</button></div>
<div class="mp-dprof"><div class="mp-prof" hidden role="img" aria-label="${esc(ctx.t(TX.profileLabel))}"><canvas class="mp-pc"></canvas><canvas class="mp-pcur"></canvas>
<div class="mp-tip f-card" hidden role="tooltip"></div></div>
<div class="mp-strip" aria-live="polite"></div></div>
<div class="mp-dbody" hidden role="region" tabindex="-1"></div>
<div class="mp-notes f-muted" aria-live="polite"></div></div>`;
  Object.assign(S, {
    box: el.querySelector('.mp-box'),
    mapEl: el.querySelector('.mp-map'),
    canvas: el.querySelector('canvas.mp-over'),
    hdEl: el.querySelector('.mp-sum'),
    stEl: el.querySelector('.mp-status'),
    profBox: el.querySelector('.mp-prof'),
    pc: el.querySelector('canvas.mp-pc'),
    pcur: el.querySelector('canvas.mp-pcur'),
    stripEl: el.querySelector('.mp-strip'),
    pickEl: el.querySelector('.mp-pick'),
    mapPickEl: el.querySelector('.mp-mappick'),
    modesEl: el.querySelector('.mp-modes'),
    fitBtn: el.querySelector('[data-fit]'),
    modeBtn: el.querySelector('.mp-mode-btn'),
    modeOpts: el.querySelector('.mp-mode-opts'),
    layersBtn: el.querySelector('.mp-layers-btn'),
    layersEl: el.querySelector('.mp-layers'),
    editBar: el.querySelector('.mp-editbar'),
    editBtn: el.querySelector('.mp-edit'),
    followBtn: el.querySelector('.mp-follow'),
    progEl: el.querySelector('.mp-progress'),
    undoBtn: el.querySelector('.mp-undo'),
    addBtn: el.querySelector('.mp-add'),
    cardEl: el.querySelector('.mp-pcard'),
    dataEl: el.querySelector('.mp-data'),
    dheadEl: el.querySelector('.mp-dhead'),
    gripEl: el.querySelector('.mp-grip'),
    notesEl: el.querySelector('.mp-notes'),
    dtitleEl: el.querySelector('.mp-dtitle'),
    dcloseEl: el.querySelector('.mp-dclose'),
    dprofEl: el.querySelector('.mp-dprof'),
    dbodyEl: el.querySelector('.mp-dbody'),
    tipEl: el.querySelector('.mp-box .mp-tip:not(.mp-pcard)'),
    ptipEl: el.querySelector('.mp-prof .mp-tip')
  });
  // page de réglage (#maps?tune=1) : racine qui défile d'elle-même (la vue du cadre est fixe), blocs en hauteur naturelle
  if (ctx.query?.tune) el.classList.add('mp-tuning');
  setSheet(sheetKeep, true);
  sheetGestures();
  // la grille des modes (sous la barre d'outils, sur le haut de la carte) se ferme aussi d'un toucher ailleurs que sur la
  // carte (qui la ferme elle-même) : barre, feuille
  el.addEventListener('pointerdown', e => {
    if (!S.modeOpts.hidden && !e.target.closest('.mp-modes, .mp-box')) toggleModes(false);
  });
  S.pickEl.addEventListener('change', () => {
    const v = S.pickEl.value;
    go(v.startsWith('m:') ? v.slice(2) : '', '');
  });
  S.mapPickEl.addEventListener('change', () => go(ctx.query?.mission, S.mapPickEl.value));
  // curseur commun : doigt (ou souris) sur le profil
  const onProf = e => {
    if (!S?.geo || (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse')) return;
    const r = S.profBox.getBoundingClientRect(),
      x = e.clientX - r.left;
    setCursor(MapsProfile.sOf(S.geo, x));
    const zones = MapsProfile.at(S.prof, S.cursor).zones;
    // deux lignes au plus (les deux premiers espaces traversés, et combien d'autres), au doigt comme à la souris
    if (!zones.length) return linger('prof');
    stay('prof');
    const l = zones.map(z => MapsRender.sia(z)[0]);
    followTip(S.ptipEl, S.profBox, x, e.clientY - r.top, hoverHtml(l[0], l.length > 2 ? `${l[1]} ${tt(TX.tipMore, {
      n: l.length - 2
    })}` : l[1] || ''));
  };
  S.profBox.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') linger('prof');
  });
  // doigt levé : l'infobulle du profil reste 5 s
  S.profBox.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse') linger('prof');
  });
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') touchAt = performance.now();
  }, true);
  S.profBox.addEventListener('pointerdown', onProf);
  S.profBox.addEventListener('pointermove', onProf);
  // toucher sur la carte près de la route (fond uni : la boîte reçoit le toucher ; MapLibre : son « click »)
  S.box.addEventListener('pointermove', e => {
    if (S.map || e.pointerType !== 'mouse' || e.target.closest('.mp-modes, .mp-tip, .mp-layers, .mp-layers-btn')) return;
    const r = S.box.getBoundingClientRect();
    hoverMap(e.clientX - r.left, e.clientY - r.top);
  });
  S.box.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') linger('map');
  });
  S.box.addEventListener('click', e => {
    if (S.map || e.target.closest('.mp-modes, .mp-tip, .mp-layers, .mp-layers-btn')) return;
    if (!S.modeOpts.hidden) return toggleModes(false);
    if (!S.layersEl.hidden) return toggleLayers(false);
    const r = S.box.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top;
    closeLv(); // comme sur MapLibre : un toucher sur la carte ferme la liste des espaces
    if (S.edit.on) return editTap(x, y);
    if (!S.mission && vrpTap(x, y)) return;
    if (!S.mission && adAt(x, y)) return pinAd(adAt(x, y));
    if (!S.cardEl.hidden) return hideTips();
    const v = MapsRender.mercator(S.fit, r.width, r.height, 12),
      ll = v.toLL(x, y);
    if (tipAt(x, y)) return mapTip(ll.lat, ll.lon, x, y);
    const s = S.prof ? MapsProfile.nearest(S.prof, v.toC, x, y) : null;
    if (s != null) {
      hideTips();
      return setCursor(s);
    }
    mapTip(ll.lat, ll.lon, x, y);
  });
  S.modeBtn.addEventListener('click', () => toggleModes());
  S.modeOpts.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]')?.dataset.mode;
    if (!m) return;
    toggleModes(false);
    if (m !== S.preset) setPreset(m);
  });
  S.modesEl.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !S.modeOpts.hidden) {
      toggleModes(false);
      S.modeBtn.focus();
    }
  });
  S.layersBtn.addEventListener('click', () => toggleLayers());
  S.layersEl.addEventListener('change', e => {
    const c = e.target.closest('input[data-layer]'),
      k = c?.dataset.layer;
    if (k) setLayer(k, c.type === 'range' ? Math.round(+c.value) : c.checked);
  });
  S.layersEl.addEventListener('click', e => {
    if (e.target.closest('[data-layers-reset]')) setLayer(null);
  });
  // Échap : le terrain épinglé est relâché
  const esc0 = e => {
    if (e.key !== 'Escape' || !S) return;
    closeData(); // le contenu du bloc de données (espaces, points de report), quel qu'il soit : le profil revient
  };
  // ✕ de l'en-tête du bloc de données
  S.dheadEl.addEventListener('click', e => {
    if (e.target.closest('[data-dclose]')) closeData();
  });
  document.addEventListener('keydown', esc0);
  S.stops.push(() => document.removeEventListener('keydown', esc0));
  S.layersEl.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      toggleLayers(false);
      S.layersBtn.focus();
    }
  });
  el.addEventListener('click', e => {
    const go = e.target.closest('[data-go]')?.dataset.go;
    if (go) location.hash = `#${go}`;
    if (e.target.closest('[data-fit]')) {
      S.userMoved = false; // « Recentrer » : la carte suit de nouveau le vol
      if (S.map) fitMap(true);
      else schedule();
    }
  });
  await loadLibs();
  if (!S) return;
  outlinesAhead();
  // page de réglage : après les bibliothèques (les cases lisent les couches du profil, MapsRender)
  if (ctx.query?.tune) tuneSetup(el.querySelector('.mp-tune'));
  S.theme = MapsRender.tokens();
  // design, ton ou thème du système changés : jetons relus, fond de nuit ou de jour, tout redessiné (observateur
  // d'attributs de <html> : réagit à l'événement, n'écrit rien dans la page)
  const onTheme = () => {
    if (!S) return;
    const t = MapsRender.tokens();
    if (JSON.stringify(t) === JSON.stringify(S.theme)) return;
    const night = t.dark !== S.theme.dark;
    S.theme = t;
    if (night && S.map) S.map.setStyle(styleFor());
    drawProfile();
    schedule();
  };
  const mq = matchMedia('(prefers-color-scheme: dark)'),
    mo = new MutationObserver(onTheme);
  mq.addEventListener('change', onTheme);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  S.stops.push(() => mq.removeEventListener('change', onTheme), () => mo.disconnect());
  const ui = (await ctx.data.get('cache/maps/ui.json').catch(() => null)) || {};
  await readSettings();
  S.stops.push(ctx.data.watch('airline/map_profiles.json', async () => {
    if (!S) return;
    await readSettings();
    S.profile = S.mission ? S.profile : effectiveProfile();
    S.data = null;
    if (!S.layersEl.hidden) fillLayers();
    schedule();
  }));
  S.preset = ui.preset || 'auto';
  S.layers = ui.layers && typeof ui.layers === 'object' ? ui.layers : {};
  if (!TX.presets[S.preset]) S.preset = 'auto';
  fillModes();
  // une carte de mission garde son profil : ni mode ni couches
  S.modesEl.hidden = S.layersBtn.hidden = S.editBar.hidden = !!ctx.query?.mission;
  editGestures();
  S.followBtn.addEventListener('click', () => setFollow(!S.follow));
  levelGestures();
  if (ctx.query?.mission) await applyMission();
  else {
    await applyFlight();
    fillPick();
  }
  if (!S) return;
  // fond à tuiles si possible, sinon fond uni (dit une fois)
  const tiles = S.route.points.length || S.mission ? await startTiles() : false;
  if (!S) return;
  if (!tiles) {
    S.plain = true;
    S.el.querySelector('.mp-credit').hidden = true;
  }
  status();
  schedule();
  // vue vivante : chaque écriture du vol courant (Carburant à côté) redessine carte et profil, 300 ms après la dernière
  let live = 0;
  if (!ctx.query?.mission) S.stops.push(ctx.data.watch(flightPath(), () => {
    clearTimeout(live);
    live = setTimeout(async () => {
      const f = await ctx.data.get(flightPath()).catch(() => null);
      // une version plus ancienne que celle montrée (l'écriture d'un geste de la carte qui revient après d'autres
      // gestes) n'est pas reprise : elle effacerait ces gestes
      if (S && (f?.updated_at || '') !== S.route.updated && (f?.updated_at || '') > (S.route.updated || '')) {
        performance.mark('maps:live');
        if (sameRoute(f, S.route.flight)) return progressOnly(f);
        await applyFlight(true);
      }
    }, 300);
  }), () => clearTimeout(live));
  else S.stops.push(ctx.data.watch('missions/', paths => {
    // le YAML de la mission montrée a changé (studio, nouvelle version) : relu
    if (S && (paths || []).some(p => MISSION_YAML.exec(p)?.[1] === ctx.query.mission)) applyMission();
  }));
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', () => {
    if (!S) return;
    S.data = null;
    schedule();
  }));
  const ro = new ResizeObserver(() => {
    mapSize();
    schedule();
    settle(); // la feuille a bougé, l'écran a tourné : la route est recadrée une fois la taille arrêtée
  });
  ro.observe(S.box);
  // rotation, volet redimensionné : le graphique des niveaux reprend la largeur du bloc
  const rd = new ResizeObserver(() => S.dpanel === 'lv' && showLv());
  rd.observe(S.dbodyEl);
  // retour d'un onglet caché ou d'une page gelée : taille reprise, surcouche redessinée
  const back = () => {
    if (document.hidden || !S) return;
    mapSize();
    schedule();
  };
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  document.addEventListener('resume', back);
  S.stops.push(() => {
    document.removeEventListener('visibilitychange', back);
    window.removeEventListener('pageshow', back);
    document.removeEventListener('resume', back);
  });
  const rp = new ResizeObserver(() => drawProfile());
  rp.observe(S.profBox);
  S.stops.push(() => ro.disconnect(), () => rp.disconnect(), () => rd.disconnect(), () => clearTimeout(S.settleT));
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops) try {
    f?.();
  } catch {
    /* déjà arrêté */
  }
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  try {
    S.map?.remove();
  } catch {
    /* déjà retirée */
  }
  S = null;
}
