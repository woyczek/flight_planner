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
  ttlCorr: ['autour du vol', 'around the flight', 'rund um den Flug', 'alrededor del vuelo'],
  corrSub: ['sinon toute la vue', 'otherwise the whole view', 'sonst die ganze Ansicht', 'si no, toda la vista'],
  lgCorr: ['Autour du vol seulement : hors du couloir du vol, rien n’est lu — zoomez ou décochez-la dans Couches',
    'Around the flight only: outside the flight’s corridor nothing is read — zoom in or untick it in Layers',
    'Nur rund um den Flug: außerhalb des Flugkorridors wird nichts gelesen — zoomen Sie oder entfernen Sie den Haken unter Ebenen',
    'Solo alrededor del vuelo: fuera del corredor del vuelo no se lee nada — acérquese o desmárquela en Capas'
  ],
  lgCorrWide: ['Vue de plus de 3 000 NM : seulement autour du vol — zoomez pour tout voir',
    'View wider than 3,000 NM: around the flight only — zoom in to see everything',
    'Ansicht breiter als 3 000 NM: nur rund um den Flug — zoomen Sie, um alles zu sehen',
    'Vista de más de 3 000 NM: solo alrededor del vuelo — acérquese para verlo todo'
  ],
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
  terrain: ['relief {h} AMSL', 'terrain {h} AMSL', 'Gelände {h} AMSL', 'relieve {h} AMSL'],
  // la hauteur au-dessus du sol (SOG-0002) : l'altitude prévue moins le relief, au curseur
  agl: ['hauteur sol {h}', 'height above ground {h}', 'Höhe über Grund {h}', 'altura sobre el suelo {h}'],
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
  howTo: ['Comment faire', 'How to', 'So geht es', 'Cómo hacerlo'],
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
  ptLocked: ['Imposé par la mission : ni déplacé, ni retiré', 'Set by the mission: neither moved nor removed',
    'Von der Mission vorgegeben: weder verschoben noch entfernt',
    'Impuesto por la misión: no se mueve ni se quita'
  ],
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
  // la fiche d'un espace (SOG-0163)
  spBtn: ['Fiche', 'Sheet', 'Blatt', 'Ficha'],
  spOpen: ['voir la fiche', 'see the sheet', 'Blatt anzeigen', 'ver la ficha'],
  spTypes: {
    R: ['zone réglementée', 'restricted area', 'Beschränkungsgebiet', 'zona restringida'],
    D: ['zone dangereuse', 'danger area', 'Gefahrengebiet', 'zona peligrosa'],
    P: ['zone interdite', 'prohibited area', 'Sperrgebiet', 'zona prohibida'],
    TSA: ['zone temporaire ségréguée', 'temporary segregated area', 'temporär abgetrenntes Gebiet', 'zona segregada temporal'],
    TRA: ['zone temporaire réservée', 'temporary reserved area', 'temporär reserviertes Gebiet', 'zona reservada temporal'],
    other: ['espace aérien', 'airspace', 'Luftraum', 'espacio aéreo']
  },
  spProhibited: ['interdit', 'prohibited', 'verboten', 'prohibido'],
  spLimits: ['Limites', 'Limits', 'Grenzen', 'Límites'],
  spClass: ['classe {c}', 'class {c}', 'Klasse {c}', 'clase {c}'],
  spActAzba: ['Activation publiée par l’AZBA', 'Activation published by the AZBA', 'Aktivierung von der AZBA veröffentlicht',
    'Activación publicada por la AZBA'
  ],
  spActNotam: ['Activation publiée par NOTAM', 'Activation published by NOTAM', 'Aktivierung per NOTAM veröffentlicht',
    'Activación publicada por NOTAM'
  ],
  spActivity: ['Activité publiée', 'Published activity', 'Veröffentlichte Aktivität', 'Actividad publicada'],
  spHours: ['Horaires publiés', 'Published hours', 'Veröffentlichte Zeiten', 'Horarios publicados'],
  spNoHours: ['Horaires publiés : non relevés dans cette base pour cet espace',
    'Published hours: not carried by this database for this area',
    'Veröffentlichte Zeiten: in dieser Datenbank für dieses Gebiet nicht enthalten',
    'Horarios publicados: no recogidos en esta base para este espacio'
  ],
  spRemarks: ['Conditions et remarques de l’AIP', 'AIP conditions and remarks', 'Bedingungen und Bemerkungen des AIP',
    'Condiciones y observaciones del AIP'
  ],
  spWho: ['Organisme et fréquence', 'Unit and frequency', 'Stelle und Frequenz', 'Organismo y frecuencia'],
  spSource: ['Source', 'Source', 'Quelle', 'Fuente'],
  spActual: ['Activité réelle non connue : horaires publiés seulement (ni NOTAM ni AZBA lus).',
    'Actual activity not known: published hours only (neither NOTAM nor AZBA read).',
    'Tatsächliche Aktivität unbekannt: nur veröffentlichte Zeiten (weder NOTAM noch AZBA gelesen).',
    'Actividad real no conocida: solo horarios publicados (ni NOTAM ni AZBA leídos).'
  ],
  spMore: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  altAge: ['Calculé à {t}', 'Computed at {t}', 'Berechnet um {t}', 'Calculado a las {t}'],
  altStale: ['Périmé : nouvel AIRAC, base changée ou routes NAT d’un autre jour',
    'Stale: new AIRAC, database changed, or NAT tracks of another day',
    'Veraltet: neuer AIRAC, Datenbank geändert oder NAT-Routen eines anderen Tages',
    'Caducado: nuevo AIRAC, base cambiada o rutas NAT de otro día'
  ],
  altRedo: ['Recalculer', 'Recompute', 'Neu berechnen', 'Recalcular'],
  altFaultN: ['{n} tronçon(s) en écart', '{n} segment(s) with a deviation', '{n} Abschnitt(e) mit Abweichung',
    '{n} tramo(s) con desviación'
  ],
  altIncomplete: ['contrôle incomplet', 'check incomplete', 'Prüfung unvollständig', 'control incompleto'],
  altTake: ['Choisir cet itinéraire', 'Choose this route', 'Diese Route wählen', 'Elegir esta ruta'],
  altTitle: ['Itinéraires proposés', 'Proposed routes', 'Vorgeschlagene Routen', 'Rutas propuestas'],
  altCheck: ['Route contrôlée', 'Checked route', 'Geprüfte Route', 'Ruta comprobada'],
  altKey: ['plein : contrôlé · tireté : incomplet · pointillé : repli · rouge : erreur',
    'solid: checked · dashed: incomplete · dotted: fallback · red: error',
    'durchgezogen: geprüft · gestrichelt: unvollständig · gepunktet: Ersatz · rot: Fehler',
    'continuo: comprobado · rayas: incompleto · puntos: sustituto · rojo: error'
  ],
  altLegend: ['Légende', 'Key', 'Legende', 'Leyenda'],
  altLgThin: ['Trait fin : non contrôlé en entier (incomplet ou repli)', 'Thin line: not fully checked (incomplete or fallback)',
    'Dünne Linie: nicht vollständig geprüft (unvollständig oder Ersatz)',
    'Trazo fino: no comprobado por completo (incompleto o sustituto)'
  ],
  altChosen: ['prise', 'taken', 'gewählt', 'elegida'],
  altFaulty: ['écart', 'deviation', 'Abweichung', 'desviación'],
  corrNote: [
    'Espaces R, D, P et autres hors du couloir de {n} NM autour du vol masqués à ce zoom : zoomez, montez la complexité ou décochez « Autour du vol seulement ».',
    'R, D, P and other spaces outside the {n} NM corridor around the flight hidden at this zoom: zoom in, raise the complexity or untick “Around the flight only”.',
    'R-, D-, P- und andere Lufträume außerhalb des {n}-NM-Korridors um den Flug bei diesem Zoom ausgeblendet: hineinzoomen, die Komplexität erhöhen oder „Nur rund um den Flug“ abwählen.',
    'Espacios R, D, P y otros fuera del corredor de {n} NM alrededor del vuelo ocultos a este zoom: acerque, suba la complejidad o desmarque «Solo alrededor del vuelo».'
  ],
  corrForced: ['Vue de plus de 3 000 NM de large : seulement autour du vol — zoomez pour décocher',
    'View more than 3,000 NM wide: around the flight only — zoom in to untick',
    'Ansicht von mehr als 3 000 NM Breite: nur rund um den Flug — hineinzoomen zum Abwählen',
    'Vista de más de 3 000 NM de ancho: solo alrededor del vuelo — acerque para desmarcar'
  ],
  cxReduced: ['Complexité réduite pour montrer toute la vue', 'Complexity lowered to show the whole view',
    'Komplexität gesenkt, um die ganze Ansicht zu zeigen',
    'Complejidad reducida para mostrar toda la vista'
  ],
  corrEmpty: ['Rien autour du vol dans cette vue : décochez « Autour du vol seulement » pour tout voir.',
    'Nothing around the flight in this view: untick “Around the flight only” to see everything.',
    'Nichts rund um den Flug in dieser Ansicht: „Nur rund um den Flug“ abwählen, um alles zu sehen.',
    'Nada alrededor del vuelo en esta vista: desmarque «Solo alrededor del vuelo» para verlo todo.'
  ],
  directTo: ['Direct vers ce point', 'Direct to this point', 'Direkt zu diesem Punkt', 'Directo a este punto'],
  atcTitle: ['{a} : contrôleurs en ligne', '{a}: online controllers', '{a}: Lotsen online', '{a}: controladores en línea'],
  atcNet: {
    ivao: ['IVAO', 'IVAO', 'IVAO', 'IVAO'],
    vatsim: ['VATSIM', 'VATSIM', 'VATSIM', 'VATSIM']
  },
  natValid: ['Routes NAT : valides jusqu’au {d}.', 'NAT tracks: valid until {d}.', 'NAT-Tracks: gültig bis {d}.',
    'Rutas NAT: válidas hasta el {d}.'
  ],
  natExpired: ['Routes NAT : périmées (le lanceur les relit dès qu’il le peut).',
    'NAT tracks: out of date (the launcher reads them again as soon as it can).',
    'NAT-Tracks: veraltet (der Launcher liest sie neu, sobald er kann).',
    'Rutas NAT: caducadas (el lanzador las vuelve a leer en cuanto pueda).'
  ],
  worldNote: [
    'Vue de plus de 3 000 NM de large : les barbules de vent sont masquées (illisibles à cette échelle) ; zoomez pour les voir.',
    'View more than 3,000 NM wide: the wind barbs are hidden (unreadable at this scale); zoom in to see them.',
    'Ansicht von mehr als 3 000 NM Breite: die Windfiedern sind ausgeblendet (in diesem Maßstab unlesbar); zoomen Sie hinein, um sie zu sehen.',
    'Vista de más de 3 000 NM de ancho: las barbas de viento están ocultas (ilegibles a esta escala); acerque para verlas.'
  ],
  gcTip: ['Route orthodromique {a} → {b}', 'Great-circle route {a} → {b}', 'Orthodrome {a} → {b}', 'Ruta ortodrómica {a} → {b}'],
  gcLen: ['{n} NM en ligne droite sur la sphère, la plus courte', '{n} NM straight on the sphere, the shortest',
    '{n} NM geradeaus auf der Kugel, die kürzeste',
    '{n} NM en línea recta sobre la esfera, la más corta'
  ],
  windGap: ['Pas de vent ici (hors {m})', 'No wind here (outside {m})', 'Hier kein Wind (außerhalb {m})',
    'Sin viento aquí (fuera de {m})'
  ],
  windGapRepeat: ['Pas de vent ici (la lecture répétait la même valeur)', 'No wind here (the reading repeated the same value)',
    'Hier kein Wind (die Lesung wiederholte denselben Wert)', 'Sin viento aquí (la lectura repetía el mismo valor)'
  ],
  windTip: ['Vent {d}° / {k} kt', 'Wind {d}° / {k} kt', 'Wind {d}° / {k} kt', 'Viento {d}° / {k} kt'],
  windSub: ['{t} · {l} · prévision {h}', '{t} · {l} · forecast {h}', '{t} · {l} · Vorhersage {h}', '{t} · {l} · previsión {h}'],
  layerNames: {
    corridor: ['Autour du vol seulement (plus rapide)', 'Around the flight only (faster)', 'Nur rund um den Flug (schneller)',
      'Solo alrededor del vuelo (más rápido)'
    ],
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
    atc: ['Contrôleurs en ligne (IVAO / VATSIM)', 'Online controllers (IVAO / VATSIM)', 'Online-Lotsen (IVAO / VATSIM)',
      'Controladores en línea (IVAO / VATSIM)'
    ],
    contours: ['Courbes de niveau', 'Contour lines', 'Höhenlinien', 'Curvas de nivel'],
    relief: ['Relief ombré', 'Shaded relief', 'Geländeschattierung', 'Relieve sombreado'],
    cov: ['Couverture', 'Coverage', 'Abdeckung', 'Cobertura'],
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
    contours: ['Courbes de niveau', 'Contour lines', 'Höhenlinien', 'Curvas de nivel'],
    relief: ['Relief ombré', 'Shaded relief', 'Geländeschattierung', 'Relieve sombreado']
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
  procDoubt: ['à vérifier', 'to be checked', 'zu prüfen', 'por verificar'],
  procX: ['X-Plane, local', 'X-Plane, local', 'X-Plane, lokal', 'X-Plane, local'],
  procLnmWarn: ['Une procédure de la liste est lue de Little Navmap : source locale, usage personnel.',
    'A procedure of the list is read from Little Navmap: local source, personal use.',
    'Ein Verfahren der Liste wird aus Little Navmap gelesen: lokale Quelle, persönliche Nutzung.',
    'Un procedimiento de la lista se lee de Little Navmap: fuente local, uso personal.'
  ],
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
  adProcSource: ['Source', 'Source', 'Quelle', 'Fuente'],
  adProcSourceTip: ['La page publiée de la procédure (nouvel onglet)', 'The published page of the procedure (new tab)',
    'Die veröffentlichte Seite des Verfahrens (neuer Tab)', 'La página publicada del procedimiento (nueva pestaña)'
  ],
  adProcChoose: ['Choisir sur la carte', 'Choose on the map', 'Auf der Karte wählen', 'Elegir en el mapa'],
  adProcChooseTip: ['Les procédures de ce côté tracées sur la carte : un toucher choisit, Carburant l’écrit',
    'The procedures of this side drawn on the map: one tap chooses, Fuel writes it',
    'Die Verfahren dieser Seite auf der Karte: ein Tippen wählt, Kraftstoff schreibt es',
    'Los procedimientos de este lado en el mapa: un toque elige, Combustible lo escribe'
  ],
  adProcChangeTip: ['Changer la piste et les procédures dans Carburant', 'Change the runway and procedures in Fuel',
    'Piste und Verfahren im Kraftstoff ändern', 'Cambiar la pista y los procedimientos en Combustible'
  ],
  // mode « choisir sur la carte » (V3_SPECIFICATION § 10.23, choose.js) : le titre de la famille montrée (une par ouverture), la
  // consigne, « Aucune », les puces de piste, les lignes, les marques ⚠ en infobulle, les cas vides
  // mode choix (V3 § 10.30) : titre du volet par côté, titre de chaque groupe, « Terminer », lignes de correction, vent d'une piste
  chSide: {
    dep: ['Départ · {icao}', 'Departure · {icao}', 'Abflug · {icao}', 'Salida · {icao}'],
    arr: ['Arrivée · {icao}', 'Arrival · {icao}', 'Ankunft · {icao}', 'Llegada · {icao}']
  },
  chFam: {
    rwy: ['Piste', 'Runway', 'Piste', 'Pista'],
    sid: ['SID', 'SID', 'SID', 'SID'],
    star: ['STAR', 'STAR', 'STAR', 'STAR'],
    app: ['Approche', 'Approach', 'Anflug', 'Aproximación'],
    appTrans: ['Transition de l’approche', 'Approach transition', 'Anflugübergang', 'Transición de la aproximación']
  },
  chHint: ['Touchez une ligne ou un tracé : le choix s’ajoute et reste sur la carte ; « Terminer » le rend à Carburant.',
    'Tap a row or a trace: the choice adds up and stays on the map; "Done" hands it to Fuel.',
    'Zeile oder Spur antippen: die Wahl kommt hinzu und bleibt auf der Karte; „Fertig“ gibt sie an Kraftstoff.',
    'Toque una línea o un trazado: la elección se suma y queda en el mapa; «Terminar» la entrega a Combustible.'
  ],
  // couche « sol » (§ 10.40, ground.js) : voies, postes et points d'attente du départ et de l'arrivée
  gTitle: ['Sol · {icao}', 'Ground · {icao}', 'Boden · {icao}', 'Suelo · {icao}'],
  gBtn: ['Sol', 'Ground', 'Boden', 'Suelo'],
  gSearch: ['Sol : chercher une voie de circulation, un poste, une attente', 'Ground: search a taxiway, a stand, a holding point',
    'Boden: Rollweg, Standplatz oder Wartepunkt suchen',
    'Suelo: buscar una calle de rodaje, un puesto, un punto de espera'
  ],
  gBtnTip: ['Voies de circulation, postes et points d’attente de ce terrain : une liste qui surligne sur la carte',
    'Taxiways, stands and holding points of this aerodrome: a list that highlights on the map',
    'Rollwege, Standplätze und Wartepunkte dieses Flugplatzes: eine Liste, die auf der Karte hervorhebt',
    'Calles de rodaje, puestos y puntos de espera de este aeródromo: una lista que resalta en el mapa'
  ],
  gKinds: {
    twy: ['Voies', 'Taxiways', 'Rollwege', 'Calles'],
    apron: ['Aires', 'Aprons', 'Vorfelder', 'Plataformas'],
    park: ['Postes', 'Stands', 'Standplätze', 'Puestos'],
    hold: ['Attentes', 'Holds', 'Wartepunkte', 'Esperas']
  },
  gRunway: ['Piste', 'Runway', 'Piste', 'Pista'],
  gFilter: ['Filtrer par nom', 'Filter by name', 'Nach Namen filtern', 'Filtrar por nombre'],
  gUnnamed: ['{n} voies sur {m} n’ont pas de nom dans la source (OpenStreetMap) : elles sont tracées, pas nommées.',
    '{n} of {m} taxiways have no name in the source (OpenStreetMap): they are drawn, not named.',
    '{n} von {m} Rollwegen haben in der Quelle keinen Namen (OpenStreetMap): sie sind gezeichnet, nicht benannt.',
    '{n} de {m} calles no tienen nombre en la fuente (OpenStreetMap): se dibujan, sin nombre.'
  ],
  gNotDrawn: ['non dessiné', 'not drawn', 'nicht gezeichnet', 'no dibujado'],
  gLoading: ['Lecture des données du sol…', 'Reading the ground data…', 'Bodendaten werden gelesen…', 'Leyendo los datos del suelo…'],
  gNone: ['Lisez les procédures du terrain pour avoir le sol', 'Read the aerodrome’s procedures to get the ground',
    'Lesen Sie die Verfahren des Flugplatzes, um den Boden zu erhalten', 'Lea los procedimientos del aeródromo para tener el suelo'
  ],
  gToProcs: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
  gReading: ['Lecture du sol en cours…', 'Reading the ground…', 'Boden wird gelesen…', 'Leyendo el suelo…'],
  gFailed: ['Sol non lu : {r}', 'Ground not read: {r}', 'Boden nicht gelesen: {r}', 'Suelo no leído: {r}'],
  gRetry: ['Réessayer', 'Try again', 'Erneut versuchen', 'Reintentar'],
  gWhy: {
    busy: ['le service ou le lanceur est occupé', 'the service or the launcher is busy', 'der Dienst oder der Launcher ist beschäftigt',
      'el servicio o el lanzador está ocupado'
    ],
    'too-soon': ['lecture trop rapprochée, réessayez dans un instant', 'reading too soon after another, try again in a moment',
      'Lesen zu kurz nach einem anderen, gleich erneut versuchen',
      'lectura demasiado seguida de otra, inténtelo en un momento'
    ],
    failed: ['la lecture a échoué', 'the reading failed', 'das Lesen ist fehlgeschlagen', 'la lectura ha fallado'],
    'no-data': ['OpenStreetMap ne décrit rien sur ce terrain', 'OpenStreetMap describes nothing on this aerodrome',
      'OpenStreetMap beschreibt auf diesem Flugplatz nichts',
      'OpenStreetMap no describe nada en este aeródromo'
    ]
  },
  gSrc: ['Sol lu avec les procédures du {d}', 'Ground read with the procedures of {d}', 'Boden mit den Verfahren vom {d} gelesen',
    'Suelo leído con los procedimientos del {d}'
  ],
  gNoMatch: ['Aucun nom ne correspond', 'No name matches', 'Kein Name passt', 'Ningún nombre coincide'],
  gMore: ['{n} autres : affinez le filtre', '{n} more: narrow the filter', '{n} weitere: Filter eingrenzen', '{n} más: afine el filtro'],
  gDone: ['Terminer', 'Done', 'Fertig', 'Terminar'],
  chDone: ['Terminer', 'Done', 'Fertig', 'Terminar'],
  chServes: ['{p} sert la {r} —', '{p} serves {r} —', '{p} bedient {r} —', '{p} sirve a la {r} —'],
  chUseRwy: ['Passer en {r}', 'Switch to {r}', 'Auf {r} wechseln', 'Pasar a la {r}'],
  chNotServes: ['{p} ne sert pas la {r} —', '{p} does not serve {r} —', '{p} bedient {r} nicht —', '{p} no sirve a la {r} —'],
  chUseProc: ['Choisir {p}', 'Choose {p}', '{p} wählen', 'Elegir {p}'],
  chWindTip: ['METAR {id} : vent {d}° {kt} kt — face {h} kt (négatif : arrière), travers {x} kt',
    'METAR {id}: wind {d}° {kt} kt — head {h} kt (negative: tail), cross {x} kt',
    'METAR {id}: Wind {d}° {kt} kt — Gegenwind {h} kt (negativ: Rückenwind), Seitenwind {x} kt',
    'METAR {id}: viento {d}° {kt} kt — de cara {h} kt (negativo: de cola), cruzado {x} kt'
  ],
  chHead: ['face {n} kt', 'head {n} kt', 'Gegenwind {n} kt', 'de cara {n} kt'],
  chTail: ['arrière {n} kt', 'tail {n} kt', 'Rückenwind {n} kt', 'de cola {n} kt'],
  chCross: ['travers {n} kt', 'cross {n} kt', 'Seitenwind {n} kt', 'cruzado {n} kt'],
  chNone: ['Aucune', 'None', 'Keine', 'Ninguna'],
  chFold: ['{n} autres · Toutes', '{n} more · All', '{n} weitere · Alle', '{n} más · Todas'],
  chFoldLess: ['Compatibles seulement', 'Compatible only', 'Nur passende', 'Solo compatibles'],
  chNotFit: ['Ne va pas avec le choix', 'Does not fit the choice', 'Passt nicht zur Wahl', 'No encaja con la elección'],
  chToRoute: ['Vers votre route', 'Towards your route', 'Zu Ihrer Route', 'Hacia su ruta'],
  chToward: ['Vers {icao}', 'Towards {icao}', 'Richtung {icao}', 'Hacia {icao}'],
  chDir: ['cap {c}°', 'heading {c}°', 'Kurs {c}°', 'rumbo {c}°'],
  chExit: ['sortie {p}', 'exit {p}', 'Ausgang {p}', 'salida {p}'],
  chEntry: ['entrée {p}', 'entry {p}', 'Eintritt {p}', 'entrada {p}'],
  chGoto: ['Aller au groupe {f}', 'Go to the {f} group', 'Zur Gruppe {f}', 'Ir al grupo {f}'],
  chSev: {
    ok: ['vent dans les limites', 'wind within limits', 'Wind innerhalb der Grenzen', 'viento dentro de los límites'],
    warn: ['vent à surveiller (arrière ou travers)', 'wind to watch (tail or cross)', 'Wind beachten (Rücken- oder Seitenwind)',
      'viento a vigilar (de cola o cruzado)'
    ],
    alert: ['vent hors limites (arrière ou travers)', 'wind beyond limits (tail or cross)',
      'Wind außerhalb der Grenzen (Rücken- oder Seitenwind)',
      'viento fuera de límites (de cola o cruzado)'
    ]
  },
  chRwyNotServed: ['Pas desservie par {p}', 'Not served by {p}', 'Nicht bedient von {p}', 'No servida por {p}'],
  chVia: ['{p} via {t}', '{p} via {t}', '{p} über {t}', '{p} vía {t}'],
  chClear: ['Retirer : {f}', 'Clear: {f}', 'Entfernen: {f}', 'Quitar: {f}'],
  chTrans: ['Transitions de l’approche', 'Approach transitions', 'Anflugübergänge', 'Transiciones de la aproximación'],
  chNoTrans: ['Sans transition', 'No transition', 'Ohne Übergang', 'Sin transición'],
  chRwy: ['Piste {r}', 'Runway {r}', 'Piste {r}', 'Pista {r}'],
  chEmpty: ['Rien de publié à choisir pour {icao}.', 'Nothing published to choose for {icao}.',
    'Für {icao} ist nichts zur Auswahl veröffentlicht.', 'No hay nada publicado para elegir en {icao}.'
  ],
  chConflictRwy: ['Ne dessert pas la piste {rwy}', 'Does not serve runway {rwy}', 'Bedient Piste {rwy} nicht',
    'No sirve a la pista {rwy}'
  ],
  chConflictStarApp: ['Ne dessert aucune piste de {app}', 'Serves no runway of {app}', 'Bedient keine Piste von {app}',
    'No sirve a ninguna pista de {app}'
  ],
  chNoData: ['Ni piste ni procédure connue pour {icao} : la carte reste telle quelle.',
    'No runway or procedure known for {icao}: the map stays as it is.',
    'Keine Piste und kein Verfahren für {icao} bekannt: die Karte bleibt unverändert.',
    'Ninguna pista ni procedimiento conocidos para {icao}: el mapa queda como está.'
  ],
  // couche « Procédures » (V3_SPECIFICATION § 10.22) : légende (une ligne par niveau), ligne de la carte du terrain (le niveau, puis la
  // raison d'AeroCatalogue.COVERAGE quand le catalogue du cadre la donne, « périmé », et les procédures détenues)
  lgCov: {
    green: ['Terrain dont les procédures sont détenues', 'Aerodrome whose procedures are held',
      'Flugplatz, dessen Verfahren vorliegen', 'Aeródromo cuyos procedimientos se tienen'
    ],
    orange: ['Terrain dont les procédures sont lues en partie ou se lisent à la demande',
      'Aerodrome whose procedures are partly read or read on demand',
      'Flugplatz, dessen Verfahren teilweise gelesen sind oder auf Anfrage gelesen werden',
      'Aeródromo cuyos procedimientos están leídos en parte o se leen a petición'
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
    red: ['Procédures : aucune', 'Procedures: none', 'Verfahren: keine', 'Procedimientos: ninguno'],
    // orange de la raison `partial` (V3 § 10.26) : les procédures sont détenues, une partie n'est pas lue
    partial: ['Procédures : détenues en partie', 'Procedures: partly held', 'Verfahren: teilweise vorhanden',
      'Procedimientos: disponibles en parte'
    ]
  },
  // ce qui manque d'un terrain lu en partie (aerodb.coverage : partial { pages, doubt }), au singulier et au pluriel
  covPages: {
    one: ['{n} page non lue', '{n} page not read', '{n} Seite nicht gelesen', '{n} página sin leer'],
    many: ['{n} pages non lues', '{n} pages not read', '{n} Seiten nicht gelesen', '{n} páginas sin leer']
  },
  covDoubt: {
    one: ['{n} fiche à vérifier', '{n} record to check', '{n} Verfahren zu prüfen', '{n} ficha por revisar'],
    many: ['{n} fiches à vérifier', '{n} records to check', '{n} Verfahren zu prüfen', '{n} fichas por revisar']
  },
  covCounts: ['SID {s} · STAR {t} · APP {a}', 'SID {s} · STAR {t} · APP {a}', 'SID {s} · STAR {t} · APP {a}',
    'SID {s} · STAR {t} · APP {a}'
  ],
  // la carte de mission (SOG-0137) : le bandeau, les rôles des points, les sortes de zones
  mbRemove: ['Retirer le bandeau de mission : revenir au vol et à ses couches',
    'Remove the mission banner: back to the flight and its layers',
    'Missionsleiste entfernen: zurück zum Flug und seinen Ebenen', 'Quitar la banda de misión: volver al vuelo y a sus capas'
  ],
  // la fenêtre d'une mission en préparation (SOG-0311) : replier, rouvrir, et la confirmation de l'abandon
  mbFold: ['Replier la fenêtre de la mission (un bouton de la colonne la rouvre)',
    'Fold the mission window (a button of the column opens it again)',
    'Missionsfenster einklappen (eine Schaltfläche der Spalte öffnet es wieder)',
    'Plegar la ventana de la misión (un botón de la columna la vuelve a abrir)'
  ],
  mbOpen: ['Rouvrir la fenêtre de la mission : carte fournie, vue', 'Open the mission window again: provided map, view',
    'Missionsfenster wieder öffnen: bereitgestellte Karte, Ansicht', 'Volver a abrir la ventana de la misión: mapa facilitado, vista'
  ],
  mbAbandonAsk: [
    'Abandonner la préparation de la mission {id} ? La fenêtre, la carte choisie et les points que la mission impose sont retirés (vos autres points restent).',
    'Abandon the preparation of mission {id}? The window, the chosen map and the points the mission imposes are removed (your other points stay).',
    'Die Vorbereitung der Mission {id} abbrechen? Das Fenster, die gewählte Karte und die von der Mission vorgegebenen Punkte werden entfernt (Ihre anderen Punkte bleiben).',
    '¿Abandonar la preparación de la misión {id}? Se quitan la ventana, el mapa elegido y los puntos que impone la misión (sus otros puntos se quedan).'
  ],
  // le sol d'un terrain sans fichier (SOG-0319)
  gAbsent: ['Voies de circulation de {icao} : pas de données du sol (le bouton « Sol » de la fiche du terrain les lit)',
    'Taxiways of {icao}: no ground data (the « Ground » button of the aerodrome card reads them)',
    'Rollwege von {icao}: keine Bodendaten (die Schaltfläche „Boden“ der Flugplatzkarte liest sie)',
    'Calles de rodaje de {icao}: sin datos del suelo (el botón «Suelo» de la ficha del aeródromo los lee)'
  ],
  // le fond topographique (SOG-0300)
  topoDown: ['Fond topographique indisponible : fond de repli', 'Topographic base unavailable: fallback base',
    'Topografischer Hintergrund nicht verfügbar: Ersatzhintergrund', 'Fondo topográfico no disponible: fondo de reserva'
  ],
  reliefOwn: ['Ce fond porte son relief ombré', 'This base carries its own shaded relief',
    'Dieser Hintergrund trägt seine eigene Geländeschattierung', 'Este fondo lleva su propio relieve sombreado'
  ],
  contoursOwn: ['Ce fond porte ses propres courbes de niveau', 'This base carries its own contour lines',
    'Dieser Hintergrund trägt seine eigenen Höhenlinien', 'Este fondo lleva sus propias curvas de nivel'
  ],
  contoursFar: ['Courbes de niveau : visibles à partir du zoom {z}, rapprochez la carte', 'Contour lines: visible from zoom {z}, zoom in',
    'Höhenlinien: sichtbar ab Zoom {z}, näher heranzoomen', 'Curvas de nivel: visibles desde el zoom {z}, acerque el mapa'
  ],
  mbLoading: ['Chargement de la mission…', 'Loading the mission…', 'Mission wird geladen …', 'Cargando la misión…'],
  mbAbandonOk: ['Abandonner', 'Abandon', 'Abbrechen', 'Abandonar'],
  mbKeep: ['Garder la mission', 'Keep the mission', 'Mission behalten', 'Conservar la misión'],
  mbTheme: ['Vue', 'View', 'Ansicht', 'Vista'],
  mbThemes: {
    vfr: ['VFR', 'VFR', 'VFR', 'VFR'],
    topo: ['Topographique', 'Topographic', 'Topografisch', 'Topográfica'],
    ifr: ['IFR', 'IFR', 'IFR', 'IFR'],
    ifrlow: ['IFR bas', 'Low IFR', 'IFR niedrig', 'IFR bajo'],
    ifrhigh: ['IFR haut', 'High IFR', 'IFR hoch', 'IFR alto'],
    transit: ['Transit basse altitude', 'Low-level transit', 'Tiefflug-Transit', 'Tránsito a baja altitud'],
    base: ['Fond seul', 'Base map only', 'Nur Hintergrund', 'Solo fondo'],
    yaml: ['Profil de la carte', 'The map’s own profile', 'Profil der Karte', 'Perfil del mapa']
  },
  libsFailed: ['Carte : un fichier du module n’a pas pu être chargé ({m}). Rechargez la page.',
    'Map: a file of the module could not be loaded ({m}). Reload the page.',
    'Karte: eine Datei des Moduls konnte nicht geladen werden ({m}). Seite neu laden.',
    'Mapa: no se pudo cargar un archivo del módulo ({m}). Recargue la página.'
  ],
  mbFlight: ['Vol', 'Flight', 'Flug', 'Vuelo'],
  mbMap: ['Carte fournie', 'Provided map', 'Mitgelieferte Karte', 'Mapa suministrado'],
  mRoles: {
    ORIGIN: ['départ', 'departure', 'Abflug', 'salida'],
    DESTINATION: ['arrivée', 'arrival', 'Ankunft', 'llegada'],
    TARGET: ['cible', 'target', 'Ziel', 'objetivo'],
    ALTERNATE: ['dégagement', 'alternate', 'Ausweichflugplatz', 'alternativo'],
    RDV: ['rendez-vous', 'rendezvous', 'Treffpunkt', 'encuentro']
  },
  mKinds: {
    search: ['Zone de recherche', 'Search zone', 'Suchzone', 'Zona de búsqueda'],
    exclusion: ['Zone d’exclusion', 'Exclusion zone', 'Sperrzone', 'Zona de exclusión'],
    mission: ['Zone de mission', 'Mission zone', 'Missionszone', 'Zona de misión']
  },
  lgMRoute: ['Route de la mission', 'Mission route', 'Missionsroute', 'Ruta de la misión'],
  wxTitle: ['Météo de la route', 'Route weather', 'Streckenwetter', 'Meteo de la ruta'],
  wxGetHint: ['lit la prévision et montre la coupe', 'reads the forecast and shows the cross-section',
    'liest die Vorhersage und zeigt den Schnitt',
    'lee la previsión y muestra el corte'
  ],
  wxRetry: ['Réessayer', 'Try again', 'Erneut versuchen', 'Reintentar'],
  wxEOffline: ['Hors ligne : la prévision ne peut pas être lue.', 'Offline: the forecast cannot be read.',
    'Offline: die Vorhersage kann nicht gelesen werden.',
    'Sin conexión: no se puede leer la previsión.'
  ],
  wxEBusy: ['Le lanceur est occupé (trop d’appels à la fois) : réessayez dans un instant.',
    'The launcher is busy (too many calls at once): try again in a moment.',
    'Der Starter ist ausgelastet (zu viele Aufrufe gleichzeitig): gleich erneut versuchen.',
    'El lanzador está ocupado (demasiadas llamadas a la vez): inténtelo en un momento.'
  ],
  wxERelay: ['La source n’a pas répondu à temps (délai de 15 s).', 'The source did not answer in time (15 s limit).',
    'Die Quelle hat nicht rechtzeitig geantwortet (Limit 15 s).', 'La fuente no respondió a tiempo (límite de 15 s).'
  ],
  wxEConn: ['La connexion a été coupée ou refusée par la source.', 'The connection was cut or refused by the source.',
    'Die Verbindung wurde von der Quelle getrennt oder abgelehnt.', 'La fuente cortó o rechazó la conexión.'
  ],
  wxEQuota: ['Limite du jour de la source atteinte : réessayez plus tard.', 'The source’s daily limit is reached: try again later.',
    'Das Tageslimit der Quelle ist erreicht: später erneut versuchen.', 'Se alcanzó el límite diario de la fuente: inténtelo más tarde.'
  ],
  wxEFail2: ['La prévision n’a pas pu être lue.', 'The forecast could not be read.', 'Die Vorhersage konnte nicht gelesen werden.',
    'No se pudo leer la previsión.'
  ],
  wxLabel: ['Coupe météo le long de la route', 'Weather cross-section along the route', 'Wetterschnitt entlang der Route',
    'Corte meteorológico a lo largo de la ruta'
  ],
  wxGetting: ['Lecture de la météo de la route…', 'Reading the route weather…', 'Streckenwetter wird gelesen…',
    'Leyendo el tiempo de la ruta…'
  ],
  wxWait: ['limite par minute de la source : reprise dans {n} s', 'the source’s per-minute limit: resuming in {n} s',
    'Minutenlimit der Quelle: weiter in {n} s',
    'límite por minuto de la fuente: se reanuda en {n} s'
  ],
  wxETimeout: ['La lecture a dépassé 20 s (la source ou le lanceur est lent ou occupé).',
    'The reading took over 20 s (the source or the launcher is slow or busy).',
    'Das Lesen dauerte über 20 s (die Quelle oder der Launcher ist langsam oder beschäftigt).',
    'La lectura superó los 20 s (la fuente o el lanzador está lento u ocupado).'
  ],
  wxELevel: ['Ce vol n’a pas de niveau de croisière : la coupe ne peut pas être calculée.',
    'This flight has no cruise level: the cross-section cannot be computed.',
    'Dieser Flug hat keine Reiseflughöhe: der Schnitt kann nicht berechnet werden.',
    'Este vuelo no tiene nivel de crucero: no se puede calcular el corte.'
  ],
  wxEPoints: ['La route a moins de deux points : il n’y a rien à couper.', 'The route has fewer than two points: nothing to cut.',
    'Die Route hat weniger als zwei Punkte: nichts zu schneiden.', 'La ruta tiene menos de dos puntos: nada que cortar.'
  ],
  wxEEmpty: ['La source n’a rien rendu pour cette route.', 'The source returned nothing for this route.',
    'Die Quelle lieferte nichts für diese Route.',
    'La fuente no devolvió nada para esta ruta.'
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
  followLine: ['{id} {t}', '{id} {t}', '{id} {t}', '{id} {t}'],
  followNext: ['Prochain point', 'Next point', 'Nächster Punkt', 'Próximo punto'],
  followPoint: ['{id} · {t} ({d} NM)', '{id} · {t} ({d} NM)', '{id} · {t} ({d} NM)', '{id} · {t} ({d} NM)'],
  followThen: ['ensuite cap {h}° vers {id}', 'then heading {h}° to {id}', 'danach Kurs {h}° nach {id}', 'luego rumbo {h}° a {id}'],
  followDescent: ['Descente', 'Descent', 'Sinkflug', 'Descenso'],
  followDescending: ['en descente', 'descending', 'im Sinkflug', 'en descenso'],
  followPlanned: ['Prévu au point', 'Planned at the point', 'Geplant am Punkt', 'Previsto en el punto'],
  followSafety: ['Sécurité', 'Safety', 'Sicherheit', 'Seguridad'],
  followPlan: ['D’après le plan — GPS ou réseau non activé', 'From the plan — GPS or network not enabled',
    'Nach dem Plan — GPS oder Netz nicht aktiviert', 'Según el plan — GPS o red no activados'
  ],
  circuitDefault: ['Tour de piste : main gauche (rien de publié sur la carte)',
    'Traffic circuit: left-hand (nothing published on the chart)', 'Platzrunde: Linksrunde (nichts auf der Karte veröffentlicht)',
    'Circuito de tránsito: mano izquierda (nada publicado en la carta)'
  ],
  circuitHand: ['Tour de piste : main {h} (tracé extrait)', 'Traffic circuit: {h}-hand (extracted track)',
    'Platzrunde: {h} (extrahierter Verlauf)', 'Circuito de tránsito: mano {h} (trazado extraído)'
  ],
  circuitLeft: ['gauche', 'left', 'Linksrunde', 'izquierda'],
  circuitRight: ['droite', 'right', 'Rechtsrunde', 'derecha'],
  circuitAlt: ['altitude {a}', 'altitude {a}', 'Höhe {a}', 'altitud {a}'],
  circuitRotary: ['voilure tournante', 'rotary wing', 'Drehflügler', 'ala rotatoria'],
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
  // la trajectoire verticale (SOG-0006) : ce qui manque quand elle n'est pas tracée, ce qui est estimé quand elle l'est
  planNoLevel: ['Trajectoire verticale non tracée : aucun niveau de croisière.', 'Vertical path not drawn: no cruise level.',
    'Vertikalprofil nicht gezeichnet: keine Reiseflughöhe.', 'Trayectoria vertical no trazada: sin nivel de crucero.'
  ],
  planEstimated: [
    'Trajectoire verticale estimée : montée et descente aux taux standard (performances de l’aéronef non lues dans Carburant).',
    'Vertical path estimated: climb and descent at standard rates (the aircraft’s performance is not read from Fuel).',
    'Vertikalprofil geschätzt: Steig- und Sinkflug mit Standardraten (Leistungsdaten des Flugzeugs nicht aus Carburant gelesen).',
    'Trayectoria vertical estimada: ascenso y descenso a tasas estándar (rendimiento de la aeronave no leído en Carburant).'
  ],
  // AeroDB plafonne un espace de classe E sous le plancher de la classe A (capped: 'classA') : le plafond est déduit, pas publié
  ceilingDeduced: ['plafond déduit (classe A au-dessus de FL180)', 'ceiling deduced (class A above FL180)',
    'Obergrenze abgeleitet (Klasse A über FL180)', 'techo deducido (clase A por encima de FL180)'
  ],
  levelsFamily: ['Secteurs d’une même famille qui se recouvrent : donnée de la source',
    'Overlapping sectors of one family: as given by the source',
    'Sich überlappende Sektoren einer Familie: Angabe der Quelle', 'Sectores de una misma familia que se solapan: dato de la fuente'
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
  awOne: ['sens unique {a} → {b}', 'one way {a} → {b}', 'Einbahn {a} → {b}', 'sentido único {a} → {b}'],
  awBoth: ['double sens', 'both ways', 'beide Richtungen', 'doble sentido'],
  credit: ['SIA : base publiée, non certifiée', 'SIA: published database, not certified',
    'SIA: veröffentlichte Datenbank, nicht zertifiziert', 'SIA: base publicada, no certificada'
  ]
};
