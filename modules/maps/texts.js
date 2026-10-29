// Carte V3 — textes de l'interface, quatre langues [fr, en, de, es] (modules/maps/SPEC.md § 4 : tout texte passe par
// ctx.t ; les libellés de données — codes, noms, niveaux — ne se traduisent pas). Lignes lues par clé dans tous les
// fichiers du module ; aucune n'est composée ailleurs.
export const TX = {
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
  // trois états de la base, jamais confondus : en cours de chargement, accès aux données non réglé sur cet appareil (elle n'est
  // pas accessible d'ici), non publiée (l'accès marche, rien n'est publié : noBase)
  loading: ['Base aéronautique en cours de chargement{z}…', 'Aeronautical database loading{z}…',
    'Luftfahrtdatenbank wird geladen{z}…', 'Base aeronáutica cargándose{z}…'
  ],
  noAccess: ['Accès aux données non réglé sur cet appareil : la carte ne montre que la route.',
    'Data access not set on this device: the map shows the route only.',
    'Datenzugriff auf diesem Gerät nicht eingerichtet: die Karte zeigt nur die Route.',
    'Acceso a los datos no configurado en este dispositivo: el mapa solo muestra la ruta.'
  ],
  toAccess: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
  noZone: ['Hors ligne, sans les données de cette zone : gardez-la dans Réglages › Données hors ligne.',
    'Offline, without this zone’s data: keep it in Settings › Offline data.',
    'Offline, ohne die Daten dieser Zone: unter Einstellungen › Offline-Daten behalten.',
    'Sin conexión y sin los datos de esta zona: guárdela en Ajustes › Datos sin conexión.'
  ],
  toSettings: ['Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'],
  plain: ['Fond de carte indisponible : fond uni.', 'Base map unavailable: plain background.',
    'Hintergrundkarte nicht verfügbar: einfarbiger Hintergrund.', 'Mapa de fondo no disponible: fondo liso.'
  ],
  ttlProfile: ['Profil', 'Profile', 'Profil', 'Perfil'],
  ttlWeather: ['Météo', 'Weather', 'Wetter', 'Meteo'],
  stPlanned: ['vol prévu', 'planned flight', 'geplanter Flug', 'vuelo previsto'],
  stFlying: ['vol en cours', 'flight in progress', 'Flug läuft', 'vuelo en curso'],
  summary: ['{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}'],
  altn: ['dégagement {a}', 'alternate {a}', 'Ausweich {a}', 'alternativa {a}'],
  dist: ['{d} NM', '{d} NM', '{d} NM', '{d} NM'],
  // fenêtre du profil et de la coupe (règle 20) : l'affordance « vol entier » de la ligne d'en-tête, visible seulement quand on a zoomé
  winWhole: ['Vol entier', 'Whole flight', 'Ganzer Flug', 'Vuelo entero'],
  winWholeHelp: ['Revenir au vol entier (double toucher ou double clic sur le profil ou la coupe)',
    'Back to the whole flight (double tap or double click on the profile or the cut)',
    'Zurück zum ganzen Flug (Doppeltipp oder Doppelklick auf Profil oder Schnitt)',
    'Volver al vuelo entero (doble toque o doble clic en el perfil o el corte)'
  ],
  profileLabel: ['Profil vertical de la route', 'Vertical profile of the route', 'Vertikalprofil der Route',
    'Perfil vertical de la ruta'
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
  progEnable: ['Activer la position', 'Enable the position', 'Position aktivieren', 'Activar la posición'],
  progArrived: ['Arrivé', 'Arrived', 'Angekommen', 'Llegado'],
  progDiverted: ['Déroutement vers {a}', 'Diverted to {a}', 'Ausweichlandung in {a}', 'Desviado a {a}'],
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
    cov: ['Procédures des terrains', 'Aerodrome procedures', 'Verfahren der Flugplätze', 'Procedimientos de los aeródromos'],
    zoneLabels: ['Noms des espaces', 'Airspace names', 'Namen der Lufträume', 'Nombres de los espacios'],
    awLabels: ['Noms des voies (distance, routes)', 'Airway names (length, tracks)', 'Namen der Flugwege (Länge, Kurse)',
      'Nombres de las aerovías (distancia, rumbos)'
    ]
  },
  layersReset: ['Tout remettre', 'Reset all', 'Alles zurücksetzen', 'Restablecer todo'],
  detail: ['Complexité', 'Complexity', 'Komplexität', 'Complejidad'],
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
    awLabels: ['Noms des voies (distance, routes)', 'Airway names (length, tracks)', 'Namen der Flugwege (Länge, Kurse)',
      'Nombres de las aerovías (distancia, rumbos)'
    ],
    procNames: ['Noms des procédures', 'Procedure names', 'Namen der Verfahren', 'Nombres de los procedimientos'],
    procCons: ['Points et contraintes des procédures', 'Procedure fixes and constraints', 'Punkte und Beschränkungen der Verfahren',
      'Puntos y restricciones de los procedimientos'
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
  segLabel: ['Profil ou météo', 'Profile or weather', 'Profil oder Wetter', 'Perfil o meteo'],
  legend: ['Légende', 'Legend', 'Legende', 'Leyenda'],
  lgPlan: ['Trajectoire prévue (niveau de croisière)', 'Planned flight path (cruise level)', 'Geplante Flugbahn (Reiseflughöhe)',
    'Trayectoria prevista (nivel de crucero)'
  ],
  lgToc: ['TOC / TOD : début et fin du palier', 'TOC / TOD: start and end of the level segment',
    'TOC / TOD: Beginn und Ende des Reiseflugs',
    'TOC / TOD: inicio y fin del tramo en crucero'
  ],
  lgTerrain: ['Relief le long de la route (maximum du couloir)', 'Terrain along the route (corridor maximum)',
    'Gelände entlang der Route (Maximum des Korridors)', 'Relieve a lo largo de la ruta (máximo del corredor)'
  ],
  lgMora: ['MORA : altitude minimale de sécurité des cases traversées', 'MORA: minimum safe altitude of the squares crossed',
    'MORA: Mindestsicherheitshöhe der durchflogenen Felder', 'MORA: altitud mínima de seguridad de las casillas atravesadas'
  ],
  lgZone: ['espace traversé (plancher – plafond)', 'airspace crossed (floor – ceiling)',
    'durchflogener Luftraum (Untergrenze – Obergrenze)',
    'espacio atravesado (suelo – techo)'
  ],
  lgPoints: ['Points de la route : nom et distance depuis le départ', 'Route points: name and distance from departure',
    'Routenpunkte: Name und Entfernung vom Abflug', 'Puntos de la ruta: nombre y distancia desde la salida'
  ],
  lgNm: ['Repères de distance (NM), comme sur la carte', 'Distance marks (NM), as on the map',
    'Entfernungsmarken (NM), wie auf der Karte',
    'Marcas de distancia (NM), como en el mapa'
  ],
  lgFixes: ['Points des voies et balises à moins de 3 NM de la route', 'Airway points and beacons within 3 NM of the route',
    'Streckenpunkte und Funkfeuer innerhalb von 3 NM der Route', 'Puntos de aerovías y radioayudas a menos de 3 NM de la ruta'
  ],
  lgCons: [
    'Contraintes des procédures : flèche haute = au moins, flèche basse = au plus, point = exactement, barre = entre deux altitudes',
    'Procedure constraints: up arrow = at or above, down arrow = at or below, dot = exactly, bar = between two altitudes',
    'Verfahrensbeschränkungen: Pfeil nach oben = mindestens, nach unten = höchstens, Punkt = genau, Balken = zwischen zwei Höhen',
    'Restricciones de los procedimientos: flecha arriba = como mínimo, abajo = como máximo, punto = exactamente, barra = entre dos altitudes'
  ],
  // procédures choisies (V3_SPECIFICATION § 10.20) : état de la source ajouté au libellé du tracé, carte du terrain
  procX: ['X-Plane, local', 'X-Plane, local', 'X-Plane, lokal', 'X-Plane, local'],
  procLnm: ['Little Navmap, local', 'Little Navmap, local', 'Little Navmap, lokal', 'Little Navmap, local'],
  // procédure périmée : le seul symbole « ⌛ » (décision du 29 octobre), jamais le mot ; son sens dans la légende et l'infobulle
  procOutdated: ['Lue sous un cycle antérieur', 'Read under an earlier cycle', 'Unter einem früheren Zyklus gelesen',
    'Leída bajo un ciclo anterior'
  ],
  adProcDep: ['Départ', 'Departure', 'Abflug', 'Salida'],
  adProcArr: ['Arrivée', 'Arrival', 'Ankunft', 'Llegada'],
  adProcRwy: ['piste {r}', 'runway {r}', 'Piste {r}', 'pista {r}'],
  adProcTrans: ['transition {t}', 'transition {t}', 'Übergang {t}', 'transición {t}'],
  adProcNone: ['aucune procédure', 'no procedure', 'kein Verfahren', 'sin procedimiento'],
  adProcUnset: ['pas encore choisi', 'not chosen yet', 'noch nicht gewählt', 'aún sin elegir'],
  adProcLost: ['{id} (introuvable dans les données)', '{id} (not found in the data)', '{id} (in den Daten nicht gefunden)',
    '{id} (no encontrado en los datos)'
  ],
  adProcChange: ['Changer', 'Change', 'Ändern', 'Cambiar'],
  adProcChangeTip: ['Changer la piste et les procédures dans Carburant', 'Change the runway and procedures in Fuel',
    'Piste und Verfahren im Kraftstoff ändern', 'Cambiar la pista y los procedimientos en Combustible'
  ],
  // couche « Procédures » (V3_SPECIFICATION § 10.22) : légende (une ligne par niveau), ligne de la carte du terrain (le niveau, puis la
  // raison d'AeroCatalogue.COVERAGE quand le catalogue du cadre la donne, « périmé », et les procédures détenues)
  lgCov: {
    green: ['Terrain dont les procédures sont détenues', 'Aerodrome whose procedures are held',
      'Flugplatz, dessen Verfahren vorliegen', 'Aeródromo cuyos procedimientos se tienen'
    ],
    orange: ['Terrain dont les procédures se lisent à la demande', 'Aerodrome whose procedures are read on demand',
      'Flugplatz, dessen Verfahren auf Anfrage gelesen werden', 'Aeródromo cuyos procedimientos se leen a petición'
    ],
    red: ['Terrain sans procédure lisible', 'Aerodrome with no readable procedure', 'Flugplatz ohne lesbares Verfahren',
      'Aeródromo sin procedimiento legible'
    ]
  },
  covLevel: {
    green: ['Procédures : détenues', 'Procedures: held', 'Verfahren: vorhanden', 'Procedimientos: disponibles'],
    orange: ['Procédures : lisibles à la demande', 'Procedures: readable on demand', 'Verfahren: auf Anfrage lesbar',
      'Procedimientos: legibles a petición'
    ],
    red: ['Procédures : aucune', 'Procedures: none', 'Verfahren: keine', 'Procedimientos: ninguno']
  },
  covCounts: ['SID {s} · STAR {t} · APP {a}', 'SID {s} · STAR {t} · APP {a}', 'SID {s} · STAR {t} · APP {a}',
    'SID {s} · STAR {t} · APP {a}'
  ],
  wxTitle: ['Coupe météo', 'Weather cross-section', 'Wetterschnitt', 'Corte meteorológico'],
  wxLabel: ['Coupe météo le long de la route', 'Weather cross-section along the route', 'Wetterschnitt entlang der Route',
    'Corte meteorológico a lo largo de la ruta'
  ],
  wxReading: ['Lecture de la prévision gardée…', 'Reading the stored forecast…', 'Gespeicherte Vorhersage wird gelesen…',
    'Leyendo la previsión guardada…'
  ],
  wxNone: ['Pas de prévision chargée :', 'No forecast loaded:', 'Keine Vorhersage geladen:', 'Sin previsión cargada:'],
  // le message nomme le vol (Atmosphère garde une prévision par vol : laquelle manque ?)
  wxNoneFor: ['Pas de prévision pour {f} :', 'No forecast for {f}:', 'Keine Vorhersage für {f}:', 'Sin previsión para {f}:'],
  wxOpen: ['ouvrir Météo', 'open Weather', 'Wetter öffnen', 'abrir Meteo'],
  wxFail: ['Coupe météo indisponible (module non chargé hors ligne)', 'Weather cross-section unavailable (module not loaded offline)',
    'Wetterschnitt nicht verfügbar (Modul offline nicht geladen)', 'Corte meteorológico no disponible (módulo no cargado sin conexión)'
  ],
  wxStrips: [
    ['Nébul. basse', 'Low cloud', 'Tiefe Bew.', 'Nub. baja'],
    ['moyenne', 'mid', 'mittel', 'media'],
    ['haute', 'high', 'hoch', 'alta'],
    ['Précip.', 'Precip.', 'Niederschl.', 'Precip.'],
    ['Visi < 8 km', 'Vis < 8 km', 'Sicht < 8 km', 'Visib. < 8 km']
  ],
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
  // d'où viennent les seuils du mode montré : propres à la compagnie, repris d'un autre mode, ou intégrés
  tuneSrc: {
    own: ['Seuils du mode {m} : réglés pour la compagnie.', 'Thresholds of the {m} mode: set for the airline.',
      'Schwellen des Modus {m}: für die Fluggesellschaft eingestellt.', 'Umbrales del modo {m}: ajustados para la aerolínea.'
    ],
    from: [
      'Seuils du mode {m} : jamais réglés pour la compagnie, repris du mode {f} ; « Enregistrer pour la compagnie » en fait les siens.',
      'Thresholds of the {m} mode: never set for the airline, taken from the {f} mode; “Save for the airline” makes them its own.',
      'Schwellen des Modus {m}: nie für die Fluggesellschaft eingestellt, aus dem Modus {f} übernommen; „Für die Fluggesellschaft speichern“ macht sie zu eigenen.',
      'Umbrales del modo {m}: nunca ajustados para la aerolínea, tomados del modo {f}; «Guardar para la aerolínea» los hace propios.'
    ],
    none: ['Seuils du mode {m} : valeurs intégrées, rien n\'est réglé pour la compagnie.',
      'Thresholds of the {m} mode: built-in values, nothing is set for the airline.',
      'Schwellen des Modus {m}: eingebaute Werte, für die Fluggesellschaft ist nichts eingestellt.',
      'Umbrales del modo {m}: valores integrados, nada ajustado para la aerolínea.'
    ]
  },
  tuneCoLevel: ['Enregistrer pour la compagnie demande le niveau Complet (Réglages) : les seuils restent sur cet appareil.',
    'Saving for the airline needs the Full level (Settings): the thresholds stay on this device.',
    'Für die Fluggesellschaft speichern erfordert die Stufe Vollständig (Einstellungen): die Schwellen bleiben auf diesem Gerät.',
    'Guardar para la aerolínea requiere el nivel Completo (Ajustes): los umbrales quedan en este dispositivo.'
  ],
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
  detailHelp: [
    'Agit comme si le zoom était différent : un cran = un niveau de zoom, moins de détails à gauche, plus à droite. Ce que chaque zoom montre est réglé par l\'administrateur.',
    'Acts as if the zoom were different: one step = one zoom level, fewer details to the left, more to the right. What each zoom shows is set by the administrator.',
    'Wirkt, als wäre der Zoom ein anderer: eine Stufe = eine Zoomstufe, links weniger Details, rechts mehr. Was jeder Zoom zeigt, legt der Administrator fest.',
    'Actúa como si el zoom fuera otro: un paso = un nivel de zoom, menos detalles a la izquierda, más a la derecha. Lo que muestra cada zoom lo fija el administrador.'
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
  vfrVacOff: ['position VAC à {n} NM', 'VAC position {n} NM away', 'VAC-Position {n} NM entfernt', 'posición VAC a {n} NM'],
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
  // ligne repliée de la feuille et ligne grisée de l'infobulle : les espaces écartés (FIR, UIR, SIV, secteurs, surface au plafond), par leur nom
  levelsAlso: ['Aussi ici ({n})', 'Also here ({n})', 'Auch hier ({n})', 'También aquí ({n})'],
  tipAlso: ['Aussi ici : {l}', 'Also here: {l}', 'Auch hier: {l}', 'También aquí: {l}'],
  levelsTitle1: ['1 espace sur ce point', '1 airspace at this point', '1 Luftraum an diesem Punkt', '1 espacio en este punto'],
  levelsAxis: ['Plancher et plafond de chaque espace, du plus bas au plus haut',
    'Floor and ceiling of each airspace, from the lowest to the highest',
    'Untergrenze und Obergrenze jedes Luftraums, vom niedrigsten zum höchsten',
    'Límite inferior y superior de cada espacio, del más bajo al más alto'
  ],
  awHigh: ['voie haute', 'upper airway', 'oberer Flugweg', 'aerovía superior'],
  awLow: ['voie basse', 'lower airway', 'unterer Flugweg', 'aerovía inferior'],
  credit: ['SIA : base publiée, non certifiée', 'SIA: published database, not certified',
    'SIA: veröffentlichte Datenbank, nicht zertifiziert', 'SIA: base publicada, no certificada'
  ]
};
