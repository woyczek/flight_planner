// Textes du module Données, [fr, en, de, es], français d'abord (ctx.t : {nom} remplacés, espace fine avant : ; ! ? en français
// posée par le cadre). Sigles et noms propres (AIRAC, eAIP, CIFP, SIA…) non traduits ; les noms des sources, leurs licences et les
// libellés de couverture par État viennent du catalogue d'aerodb, déjà en quatre langues.
export const TX = {
  title: ['Données', 'Data', 'Daten', 'Datos'],
  // en-tête : le cycle AIRAC en vigueur, le suivant, le lanceur
  cycleNow: ['Cycle AIRAC en vigueur', 'AIRAC cycle in force', 'Gültiger AIRAC-Zyklus', 'Ciclo AIRAC vigente'],
  cycleDates: ['du {a} au {b}', 'from {a} to {b}', 'vom {a} bis {b}', 'del {a} al {b}'],
  nextOne: ['prochain cycle ({c}) dans 1 jour', 'next cycle ({c}) in 1 day', 'nächster Zyklus ({c}) in 1 Tag',
    'próximo ciclo ({c}) en 1 día'
  ],
  nextMany: ['prochain cycle ({c}) dans {n} jours', 'next cycle ({c}) in {n} days', 'nächster Zyklus ({c}) in {n} Tagen',
    'próximo ciclo ({c}) en {n} días'
  ],
  runnerLauncher: ['Lanceur de ce poste', 'Launcher of this workstation', 'Starter dieses Rechners', 'Lanzador de este equipo'],
  runnerNone: ['Sans lanceur : lecture seulement', 'No launcher: read only', 'Ohne Starter: nur Lesen',
    'Sin lanzador: solo lectura'
  ],
  headError: ['Cycle AIRAC indisponible : le catalogue des sources n’a pas pu être lu.',
    'AIRAC cycle unavailable: the source catalogue could not be read.',
    'AIRAC-Zyklus nicht verfügbar: der Quellenkatalog konnte nicht gelesen werden.',
    'Ciclo AIRAC no disponible: no se pudo leer el catálogo de fuentes.'
  ],
  // couverture : les zones, puis les États
  coverage: ['Couverture', 'Coverage', 'Abdeckung', 'Cobertura'],
  coverageZones: ['Zones : {z}', 'Zones: {z}', 'Zonen: {z}', 'Zonas: {z}'],
  addZone: ['Ajouter un pays', 'Add a country', 'Land hinzufügen', 'Añadir un país'],
  addZonePick: ['— choisir —', '— choose —', '— wählen —', '— elegir —'],
  coverageNone: ['Aucune zone publiée pour le moment.', 'No zone published yet.', 'Noch keine Zone veröffentlicht.',
    'Ninguna zona publicada por ahora.'
  ],
  zonesError: ['La liste des zones n’a pas pu être lue.', 'The list of zones could not be read.',
    'Die Zonenliste konnte nicht gelesen werden.', 'No se pudo leer la lista de zonas.'
  ],
  states: ['Procédures par État', 'Procedures by State', 'Verfahren nach Staat', 'Procedimientos por Estado'],
  statesError: ['La couverture par État n’a pas pu être lue.', 'The coverage by State could not be read.',
    'Die Abdeckung nach Staat konnte nicht gelesen werden.', 'No se pudo leer la cobertura por Estado.'
  ],
  legend: ['Vert : des procédures sont déjà publiées ; orange : lisibles à la demande ; rouge : rien de lisible.',
    'Green: procedures are already published; orange: readable on demand; red: nothing readable.',
    'Grün: Verfahren sind bereits veröffentlicht; orange: auf Anfrage lesbar; rot: nichts lesbar.',
    'Verde: ya hay procedimientos publicados; naranja: legibles bajo demanda; rojo: nada legible.'
  ],
  levels: {
    green: ['vert', 'green', 'grün', 'verde'],
    orange: ['orange', 'orange', 'orange', 'naranja'],
    red: ['rouge', 'red', 'rot', 'rojo']
  },
  stateLine: ['{l} : {n}', '{l}: {n}', '{l}: {n}', '{l}: {n}'],
  moreStates: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  // groupes de jeux de données
  groups: {
    base: ['Base aéronautique', 'Aeronautical base', 'Luftfahrtdatenbank', 'Base aeronáutica'],
    proc: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
    aircraft: ['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'],
    weather: ['Météo', 'Weather', 'Wetter', 'Meteorología']
  },
  attention: ['À regarder', 'Needs attention', 'Bitte ansehen', 'Requiere atención'],
  moreSets: ['{n} autres jeux', '{n} more data sets', '{n} weitere Datensätze', '{n} conjuntos más'],
  groupEmpty: ['Aucun jeu à suivre pour cette couverture.', 'No data set to follow for this coverage.',
    'Kein Datensatz für diese Abdeckung.', 'Ningún conjunto que seguir para esta cobertura.'
  ],
  pubError: ['L’état des publications n’a pas pu être lu : les lignes montrent seulement les sources.',
    'The state of the publications could not be read: the rows only show the sources.',
    'Der Stand der Veröffentlichungen konnte nicht gelesen werden: die Zeilen zeigen nur die Quellen.',
    'No se pudo leer el estado de las publicaciones: las filas solo muestran las fuentes.'
  ],
  catError: ['Le catalogue des sources n’a pas pu être lu.', 'The source catalogue could not be read.',
    'Der Quellenkatalog konnte nicht gelesen werden.', 'No se pudo leer el catálogo de fuentes.'
  ],
  // une ligne : cycle ou édition, âge, taille
  cycle: ['Cycle {c}', 'Cycle {c}', 'Zyklus {c}', 'Ciclo {c}'],
  edition: ['Édition du {d}', 'Edition of {d}', 'Ausgabe vom {d}', 'Edición del {d}'],
  ageToday: ['publié aujourd’hui', 'published today', 'heute veröffentlicht', 'publicado hoy'],
  ageOne: ['publié il y a 1 jour', 'published 1 day ago', 'vor 1 Tag veröffentlicht', 'publicado hace 1 día'],
  ageMany: ['publié il y a {n} jours', 'published {n} days ago', 'vor {n} Tagen veröffentlicht', 'publicado hace {n} días'],
  withSite: ['publié avec le site', 'published with the site', 'mit der Website veröffentlicht', 'publicado con el sitio'],
  // singulier, pluriel
  unit: {
    zone: [
      ['zone', 'zone', 'Zone', 'zona'],
      ['zones', 'zones', 'Zonen', 'zonas']
    ],
    aerodrome: [
      ['terrain', 'aerodrome', 'Flugplatz', 'aeródromo'],
      ['terrains', 'aerodromes', 'Flugplätze', 'aeródromos']
    ],
    file: [
      ['fichier', 'file', 'Datei', 'archivo'],
      ['fichiers', 'files', 'Dateien', 'archivos']
    ],
    type: [
      ['type', 'type', 'Muster', 'tipo'],
      ['types', 'types', 'Muster', 'tipos']
    ],
    commit: [
      ['commit', 'commit', 'Commit', 'commit'],
      ['commits', 'commits', 'Commits', 'commits']
    ],
    state: [
      ['État', 'State', 'Staat', 'Estado'],
      ['États', 'States', 'Staaten', 'Estados']
    ],
    cycle: [
      ['cycle', 'cycle', 'Zyklus', 'ciclo'],
      ['cycles', 'cycles', 'Zyklen', 'ciclos']
    ],
    step: [
      ['étape', 'step', 'Schritt', 'paso'],
      ['étapes', 'steps', 'Schritte', 'pasos']
    ],
    set: [
      ['jeu', 'data set', 'Datensatz', 'conjunto'],
      ['jeux', 'data sets', 'Datensätze', 'conjuntos']
    ],
    chart: [
      ['carte', 'chart', 'Karte', 'carta'],
      ['cartes', 'charts', 'Karten', 'cartas']
    ],
    sheet: [
      ['fiche', 'sheet', 'Datenblatt', 'ficha'],
      ['fiches', 'sheets', 'Datenblätter', 'fichas']
    ]
  },
  // l'étiquette d'état d'une ligne (SPEC § 6.2)
  state: {
    'stale-cycle': ['Cycle dépassé', 'Cycle out of date', 'Zyklus überholt', 'Ciclo superado'],
    'stale-age': ['Plus de 28 jours', 'Over 28 days old', 'Über 28 Tage alt', 'Más de 28 días'],
    parser: ['Parseur ancien', 'Old parser', 'Alter Parser', 'Analizador antiguo'],
    outdated: ['Périmé', 'Outdated', 'Veraltet', 'Caducado'],
    absent: ['Absent du dépôt', 'Not in the repository', 'Nicht im Repository', 'Ausente del repositorio'],
    ok: ['À jour', 'Up to date', 'Aktuell', 'Al día']
  },
  // le détail replié d'une ligne
  link: ['Lien', 'Link', 'Link', 'Enlace'],
  open: ['Ouvrir', 'Open', 'Öffnen', 'Abrir'],
  openTitle: ['Ouvrir {s} dans un nouvel onglet', 'Open {s} in a new tab', '{s} in einem neuen Tab öffnen',
    'Abrir {s} en una pestaña nueva'
  ],
  licence: ['Licence', 'Licence', 'Lizenz', 'Licencia'],
  licenceLine: ['Licence : {l}', 'Licence: {l}', 'Lizenz: {l}', 'Licencia: {l}'],
  status: ['Statut', 'Status', 'Status', 'Estado'],
  statuses: {
    used: ['Utilisée', 'Used', 'Genutzt', 'Utilizada'],
    candidate: ['Candidate', 'Candidate', 'In Erwägung', 'Candidata'],
    abandoned: ['Abandonnée', 'Set aside', 'Zurückgestellt', 'Descartada']
  },
  fed: ['Zones nourries', 'Zones fed', 'Versorgte Zonen', 'Zonas alimentadas'],
  fedAll: ['toutes celles de la couverture', 'all those of the coverage', 'alle der Abdeckung', 'todas las de la cobertura'],
  fedNone: ['aucune de la couverture', 'none of the coverage', 'keine der Abdeckung', 'ninguna de la cobertura'],
  published: ['Publication', 'Publication', 'Veröffentlichung', 'Publicación'],
  zoneLine: ['{z} : {d}', '{z}: {d}', '{z}: {d}', '{z}: {d}'],
  zoneCycle: ['cycle {c}', 'cycle {c}', 'Zyklus {c}', 'ciclo {c}'],
  zoneAt: ['publié le {d}', 'published on {d}', 'veröffentlicht am {d}', 'publicado el {d}'],
  zoneBy: ['par {b}', 'by {b}', 'von {b}', 'por {b}'],
  zoneParser: ['parseur {p}', 'parser {p}', 'Parser {p}', 'analizador {p}'],
  zoneWhole: ['format ancien', 'old format', 'altes Format', 'formato antiguo'],
  zoneMissing: ['non publiée', 'not published', 'nicht veröffentlicht', 'no publicada'],
  procByStatus: ['Terrains par statut', 'Aerodromes by status', 'Flugplätze nach Status', 'Aeródromos por estado'],
  // construire la base (lot D5) : le panneau, la marche, la fin
  buildTitle: ['Télécharger, construire, purger', 'Download, build, purge', 'Herunterladen, aufbauen, bereinigen',
    'Descargar, construir, purgar'
  ],
  buildZones: ['Zones concernées', 'Zones affected', 'Betroffene Zonen', 'Zonas afectadas'],
  personalTitle: ['Sources sous licence personnelle', 'Personal-licence sources', 'Quellen mit persönlicher Lizenz',
    'Fuentes con licencia personal'
  ],
  personalName: {
    enaire: ['ENAIRE (AIP Espagne)', 'ENAIRE (Spain AIP)', 'ENAIRE (AIP Spanien)', 'ENAIRE (AIP España)'],
    nats: ['NATS (AIP Royaume-Uni)', 'NATS (UK AIP)', 'NATS (AIP Vereinigtes Königreich)', 'NATS (AIP Reino Unido)'],
    xplane: ['X-Plane (données du simulateur)', 'X-Plane (simulator data)', 'X-Plane (Simulatordaten)', 'X-Plane (datos del simulador)']
  },
  // la ligne sous chaque source ; texte de shared/maintenance_page.js (data-personal), à garder identique
  personalLine: {
    licence: [
      'À cocher seulement si le dépôt de données n’est utilisé que par vous (licence d’usage personnel).',
      'Tick only if the data repository is used by you alone (personal-use licence).',
      'Nur ankreuzen, wenn das Datenrepository nur von Ihnen genutzt wird (Lizenz zur persönlichen Nutzung).',
      'Marque solo si el repositorio de datos lo usa únicamente usted (licencia de uso personal).'
    ],
    xplane: [
      'À cocher seulement si le dépôt de données n’est utilisé que par vous (données X-Plane, usage personnel).',
      'Tick only if the data repository is used by you alone (X-Plane data, personal use).',
      'Nur ankreuzen, wenn das Datenrepository nur von Ihnen genutzt wird (X-Plane-Daten, persönliche Nutzung).',
      'Marque solo si el repositorio de datos lo usa únicamente usted (datos de X-Plane, uso personal).'
    ]
  },
  xplaneHint: ['X-Plane coché : la construction se fait dans la page, pas encore possible ici',
    'X-Plane ticked: the build runs in the page, not yet possible here',
    'X-Plane angekreuzt: der Aufbau läuft in der Seite, hier noch nicht möglich',
    'X-Plane marcado: la construcción se hace en la página, todavía no es posible aquí'
  ],
  build: ['Construire', 'Build', 'Aufbauen', 'Construir'],
  download: ['Télécharger', 'Download', 'Herunterladen', 'Descargar'],
  purge: ['Purger', 'Purge', 'Bereinigen', 'Purgar'],
  stop: ['Arrêter', 'Stop', 'Anhalten', 'Detener'],
  stopping: ['Arrêt en cours…', 'Stopping…', 'Wird angehalten…', 'Deteniendo…'],
  // raisons du bouton gris, écrites une fois sous le panneau
  greyReason: {
    'no-launcher': ['Il faut le lanceur du poste', 'The workstation launcher is needed', 'Der Starter des Rechners wird benötigt',
      'Hace falta el lanzador del equipo'
    ],
    busy: ['Une autre opération est en cours', 'Another operation is running', 'Ein anderer Vorgang läuft',
      'Hay otra operación en curso'
    ],
    'no-zone': ['Cochez au moins une zone', 'Tick at least one zone', 'Mindestens eine Zone ankreuzen', 'Marque al menos una zona'],
    'no-set': ['Rien à mettre à jour : cochez des zones ou des États', 'Nothing to update: tick some zones or States',
      'Nichts zu aktualisieren: Zonen oder Staaten ankreuzen', 'Nada que actualizar: marque zonas o Estados'
    ],
    'bad-codes': ['types OACI refusés', 'ICAO types refused', 'ICAO-Muster abgelehnt', 'tipos OACI rechazados'],
    'no-state': ['Cochez au moins un État', 'Tick at least one State', 'Mindestens einen Staat ankreuzen', 'Marque al menos un Estado'],
    // le lanceur ne connaît pas le verbe (regen/verbs) : écrit une fois par panneau
    'unknown-verb': ['Le lanceur de ce poste ne connaît pas encore cette opération',
      'This workstation’s launcher does not know this operation yet',
      'Der Starter dieses Rechners kennt diesen Vorgang noch nicht', 'El lanzador de este equipo aún no conoce esta operación'
    ],
    offline: ['Hors ligne', 'Offline', 'Offline', 'Sin conexión']
  },
  // la marche : « 2 zones sur 5 », l’étape, le temps écoulé, une ligne par zone
  runCount: ['{n} sur {m}', '{n} of {m}', '{n} von {m}', '{n} de {m}'],
  elapsed: ['écoulé : {t}', 'elapsed: {t}', 'vergangen: {t}', 'transcurrido: {t}'],
  otherRunning: ['Une autre opération est en cours : {s}', 'Another operation is running: {s}', 'Ein anderer Vorgang läuft: {s}',
    'Hay otra operación en curso: {s}'
  ],
  zoneState: {
    waiting: ['en attente', 'waiting', 'wartet', 'en espera'],
    building: ['construction', 'building', 'wird erstellt', 'construcción'],
    buildingN: ['construction ({n} / {m} sources)', 'building ({n} / {m} sources)', 'wird erstellt ({n} / {m} Quellen)',
      'construcción ({n} / {m} fuentes)'
    ],
    buildingP: ['construction ({n} / {m})', 'building ({n} / {m})', 'wird erstellt ({n} / {m})', 'construcción ({n} / {m})'],
    built: ['construite', 'built', 'erstellt', 'construida'],
    failed: ['échec : {r}', 'failed: {r}', 'fehlgeschlagen: {r}', 'fallo: {r}'],
    cancelled: ['annulée', 'cancelled', 'abgebrochen', 'cancelada']
  },
  // le motif d’un échec de zone (les codes du lanceur)
  zoneError: {
    'browser-failed': ['le navigateur sans fenêtre n’a pas démarré', 'the windowless browser did not start',
      'der Browser ohne Fenster ist nicht gestartet', 'el navegador sin ventana no arrancó'
    ],
    'browser-exited': ['le navigateur sans fenêtre s’est arrêté', 'the windowless browser stopped',
      'der Browser ohne Fenster wurde beendet', 'el navegador sin ventana se detuvo'
    ],
    timeout: ['délai dépassé', 'time limit exceeded', 'Zeitlimit überschritten', 'tiempo agotado'],
    'page-error': ['erreur dans la page de construction', 'error in the build page', 'Fehler in der Aufbauseite',
      'error en la página de construcción'
    ],
    'invalid-output': ['sortie invalide, rien n’a été écrit', 'invalid output, nothing was written',
      'ungültige Ausgabe, nichts wurde geschrieben', 'salida no válida, no se escribió nada'
    ],
    'write-failed': ['écriture impossible (disque plein ?)', 'could not write (disk full?)',
      'Schreiben nicht möglich (Datenträger voll?)', 'no se pudo escribir (¿disco lleno?)'
    ],
    cancelled: ['arrêtée', 'stopped', 'angehalten', 'detenida'],
    unknown: ['cause inconnue', 'unknown cause', 'unbekannte Ursache', 'causa desconocida']
  },
  // la fin : la ligne de résumé (aussi le texte de la notification) et ce qu’il y a à faire
  sumDone: ['Base construite : {built}', 'Base built: {built}', 'Basis erstellt: {built}', 'Base construida: {built}'],
  sumPartial: ['Base construite : {built} ; {failed} en échec ({zones})', 'Base built: {built}; {failed} failed ({zones})',
    'Basis erstellt: {built}; {failed} fehlgeschlagen ({zones})', 'Base construida: {built}; {failed} con fallo ({zones})'
  ],
  sumFailed: ['Base non construite : {failed} en échec ({zones})', 'Base not built: {failed} failed ({zones})',
    'Basis nicht erstellt: {failed} fehlgeschlagen ({zones})', 'Base no construida: {failed} con fallo ({zones})'
  ],
  sumCancelled: ['Construction arrêtée ; zones déjà construites : {n}', 'Build stopped; zones already built: {n}',
    'Aufbau angehalten; bereits erstellte Zonen: {n}', 'Construcción detenida; zonas ya construidas: {n}'
  ],
  sumInterrupted: ['Construction interrompue (le lanceur s’est arrêté)', 'Build interrupted (the launcher stopped)',
    'Aufbau unterbrochen (der Starter wurde beendet)', 'Construcción interrumpida (el lanzador se detuvo)'
  ],
  sumNoBrowser: ['Ni Edge ni Chrome n’ont été trouvés sur ce poste : installez l’un des deux.',
    'Neither Edge nor Chrome was found on this workstation: install one of them.',
    'Auf diesem Rechner wurden weder Edge noch Chrome gefunden: installieren Sie einen der beiden.',
    'No se encontró Edge ni Chrome en este equipo: instale uno de los dos.'
  ],
  sumXplane: ['La construction avec X-Plane se fait dans la page, pas encore possible ici : décochez X-Plane et relancez.',
    'A build with X-Plane runs in the page, not yet possible here: untick X-Plane and start again.',
    'Ein Aufbau mit X-Plane läuft in der Seite, hier noch nicht möglich: X-Plane abwählen und neu starten.',
    'Una construcción con X-Plane se hace en la página, todavía no es posible aquí: desmarque X-Plane y vuelva a empezar.'
  ],
  advice: {
    partial: [
      'Les zones construites sont gardées ; décochez-les et relancez pour retenter les autres (le motif est écrit à chaque ligne).',
      'The zones built are kept; untick them and start again to retry the others (the reason is written on each line).',
      'Die erstellten Zonen bleiben erhalten; wählen Sie sie ab und starten Sie neu, um die übrigen zu wiederholen (der Grund steht in jeder Zeile).',
      'Las zonas construidas se conservan; desmárquelas y vuelva a empezar para reintentar las demás (el motivo está en cada línea).'
    ],
    failed: ['Aucune zone n’a été construite : lisez le motif de chaque ligne, puis relancez.',
      'No zone was built: read the reason on each line, then start again.',
      'Keine Zone wurde erstellt: Lesen Sie den Grund in jeder Zeile und starten Sie neu.',
      'No se construyó ninguna zona: lea el motivo de cada línea y vuelva a empezar.'
    ],
    cancelled: ['Les zones déjà construites sont gardées ; relancez pour construire les autres.',
      'The zones already built are kept; start again to build the others.',
      'Bereits erstellte Zonen bleiben erhalten; starten Sie neu, um die übrigen zu erstellen.',
      'Las zonas ya construidas se conservan; vuelva a empezar para construir las demás.'
    ],
    interrupted: ['Relancez la construction : les zones déjà construites sont gardées, vous pouvez les décocher.',
      'Start the build again: the zones already built are kept, you can untick them.',
      'Starten Sie den Aufbau neu: bereits erstellte Zonen bleiben erhalten, Sie können sie abwählen.',
      'Vuelva a lanzar la construcción: las zonas ya construidas se conservan, puede desmarcarlas.'
    ]
  },
  // un départ refusé par le lanceur
  refused: {
    busy: ['Une autre opération est en cours', 'Another operation is running', 'Ein anderer Vorgang läuft',
      'Hay otra operación en curso'
    ],
    updating: ['Mise à jour de la suite en cours : réessayez après le redémarrage du lanceur',
      'Suite update under way: try again after the launcher restarts',
      'Aktualisierung der Suite läuft: versuchen Sie es nach dem Neustart des Starters erneut',
      'Actualización de la suite en curso: vuelva a intentarlo tras el reinicio del lanzador'
    ],
    tooSoon: ['Réessayez dans {n} s', 'Try again in {n} s', 'Versuchen Sie es in {n} s erneut', 'Vuelva a intentarlo en {n} s'],
    'unknown-route': ['Le lanceur de ce poste ne connaît pas encore cette opération : relancez-le à jour.',
      'This workstation’s launcher does not know this operation yet: restart it up to date.',
      'Der Starter dieses Rechners kennt diesen Vorgang noch nicht: starten Sie ihn aktualisiert neu.',
      'El lanzador de este equipo aún no conoce esta operación: reinícielo actualizado.'
    ],
    'bad-args': ['Le lanceur a refusé la demande (arguments invalides).', 'The launcher refused the request (invalid arguments).',
      'Der Starter hat die Anfrage abgelehnt (ungültige Argumente).', 'El lanzador rechazó la solicitud (argumentos no válidos).'
    ],
    offline: ['Le lanceur ne répond pas : vérifiez qu’il est lancé.', 'The launcher does not answer: check that it is running.',
      'Der Starter antwortet nicht: prüfen Sie, ob er läuft.', 'El lanzador no responde: compruebe que está en marcha.'
    ],
    refused: ['Le lanceur n’accepte pas cette opération.', 'The launcher does not accept this operation.',
      'Der Starter akzeptiert diesen Vorgang nicht.', 'El lanzador no acepta esta operación.'
    ],
    failed: ['Le lanceur n’a pas pu démarrer l’opération.', 'The launcher could not start the operation.',
      'Der Starter konnte den Vorgang nicht starten.', 'El lanzador no pudo iniciar la operación.'
    ]
  },
  // télécharger les sources (base/fetch) : une ligne par zone, puis par source, la fin
  fetchState: {
    waiting: ['en attente', 'waiting', 'wartet', 'en espera'],
    fetching: ['téléchargement', 'downloading', 'wird heruntergeladen', 'descarga'],
    fetchingN: ['téléchargement ({n} / {m} sources)', 'downloading ({n} / {m} sources)', 'wird heruntergeladen ({n} / {m} Quellen)',
      'descarga ({n} / {m} fuentes)'
    ],
    fetchingP: ['téléchargement ({n} / {m})', 'downloading ({n} / {m})', 'wird heruntergeladen ({n} / {m})', 'descarga ({n} / {m})'],
    done: ['terminée', 'done', 'abgeschlossen', 'terminada'],
    failed: ['échec : {r}', 'failed: {r}', 'fehlgeschlagen: {r}', 'fallo: {r}'],
    cancelled: ['annulée', 'cancelled', 'abgebrochen', 'cancelada']
  },
  // la ligne d’une source dans la marche et à la fin
  sourceState: {
    downloaded: ['téléchargée : {n}', 'downloaded: {n}', 'heruntergeladen: {n}', 'descargada: {n}'],
    downloadedNo: ['téléchargée', 'downloaded', 'heruntergeladen', 'descargada'],
    unchanged: ['inchangée', 'unchanged', 'unverändert', 'sin cambios'],
    failed: ['échec : {r}', 'failed: {r}', 'fehlgeschlagen: {r}', 'fallo: {r}'],
    skipped: ['ignorée', 'skipped', 'übersprungen', 'omitida'],
    skippedPersonal: ['ignorée : licence non déclarée', 'skipped: licence not declared', 'übersprungen: Lizenz nicht erklärt',
      'omitida: licencia no declarada'
    ],
    manual: ['manuelle, à déposer à la main', 'manual, to be dropped in by hand', 'manuell, von Hand abzulegen',
      'manual, para depositar a mano'
    ]
  },
  // le motif d’un échec de source (les codes du lanceur)
  fetchError: {
    network: ['le réseau ne répond pas', 'the network does not answer', 'das Netzwerk antwortet nicht', 'la red no responde'],
    http: ['réponse HTTP', 'HTTP answer', 'HTTP-Antwort', 'respuesta HTTP'],
    httpN: ['HTTP {s}', 'HTTP {s}', 'HTTP {s}', 'HTTP {s}'],
    parse: ['fichier illisible', 'unreadable file', 'Datei nicht lesbar', 'archivo ilegible'],
    personal: ['licence non déclarée', 'licence not declared', 'Lizenz nicht erklärt', 'licencia no declarada'],
    manual: ['source manuelle', 'manual source', 'manuelle Quelle', 'fuente manual'],
    unknown: ['cause inconnue', 'unknown cause', 'unbekannte Ursache', 'causa desconocida']
  },
  // la fin d’un téléchargement : « Téléchargé : 3 zones changées, 1 inchangée ; 2 échecs » (chaque part au singulier ou au pluriel)
  fetchSum: ['Téléchargé : {c}, {u} ; {f}', 'Downloaded: {c}, {u}; {f}', 'Heruntergeladen: {c}, {u}; {f}', 'Descargado: {c}, {u}; {f}'],
  fetchSumStopped: ['Téléchargement arrêté : {c}, {u} ; {f}', 'Download stopped: {c}, {u}; {f}',
    'Herunterladen angehalten: {c}, {u}; {f}', 'Descarga detenida: {c}, {u}; {f}'
  ],
  fetchSumInterrupted: ['Téléchargement interrompu (le lanceur s’est arrêté)', 'Download interrupted (the launcher stopped)',
    'Herunterladen unterbrochen (der Starter wurde beendet)', 'Descarga interrumpida (el lanzador se detuvo)'
  ],
  fetchNothing: ['Rien à télécharger pour ces zones', 'Nothing to download for these zones',
    'Für diese Zonen gibt es nichts herunterzuladen',
    'Nada que descargar para estas zonas'
  ],
  fetchChanged: [
    ['{n} zone changée', '{n} zone changed', '{n} Zone geändert', '{n} zona cambiada'],
    ['{n} zones changées', '{n} zones changed', '{n} Zonen geändert', '{n} zonas cambiadas']
  ],
  fetchSame: [
    ['{n} inchangée', '{n} unchanged', '{n} unverändert', '{n} sin cambios'],
    ['{n} inchangées', '{n} unchanged', '{n} unverändert', '{n} sin cambios']
  ],
  fetchFails: [
    ['{n} échec', '{n} failure', '{n} Fehler', '{n} fallo'],
    ['{n} échecs', '{n} failures', '{n} Fehler', '{n} fallos']
  ],
  fetchOutside: [
    ['{n} fichier de sources modifié, hors des données synchronisées', '{n} source file changed, outside the synchronised data',
      '{n} Quelldatei geändert, außerhalb der synchronisierten Daten',
      '{n} archivo de fuentes modificado, fuera de los datos sincronizados'
    ],
    ['{n} fichiers de sources modifiés, hors des données synchronisées', '{n} source files changed, outside the synchronised data',
      '{n} Quelldateien geändert, außerhalb der synchronisierten Daten',
      '{n} archivos de fuentes modificados, fuera de los datos sincronizados'
    ]
  ],
  fetchManual: ['Sources manuelles, à déposer à la main :', 'Manual sources, to be dropped in by hand:',
    'Manuelle Quellen, von Hand abzulegen:',
    'Fuentes manuales, para depositar a mano:'
  ],
  // purger les sources (base/purge) : la ligne d’une zone, la question, la fin
  purgeState: {
    waiting: ['en attente', 'waiting', 'wartet', 'en espera'],
    purging: ['purge', 'purging', 'wird bereinigt', 'purga'],
    done: ['{n}, {s}', '{n}, {s}', '{n}, {s}', '{n}, {s}'],
    failed: ['échec : {r}', 'failed: {r}', 'fehlgeschlagen: {r}', 'fallo: {r}'],
    cancelled: ['annulée', 'cancelled', 'abgebrochen', 'cancelada']
  },
  purgeAsk: ['Purger {n} ({s}) des sources de {z} ?', 'Purge {n} ({s}) from the sources of {z}?',
    '{n} ({s}) aus den Quellen von {z} bereinigen?',
    '¿Purgar {n} ({s}) de las fuentes de {z}?'
  ],
  purgeShared: ['Les fichiers du SIA servent aussi les contours des autres zones à la construction.',
    'The SIA files also serve the outlines of the other zones at build time.',
    'Die SIA-Dateien liefern beim Aufbau auch die Umrisse der anderen Zonen.',
    'Los archivos del SIA sirven también para los contornos de las demás zonas en la construcción.'
  ],
  purgeKept: [
    ['{n} fichier suivi par git est gardé.', '{n} file tracked by git is kept.', '{n} von git verfolgte Datei bleibt erhalten.',
      '{n} archivo seguido por git se conserva.'
    ],
    ['{n} fichiers suivis par git sont gardés.', '{n} files tracked by git are kept.',
      '{n} von git verfolgte Dateien bleiben erhalten.',
      '{n} archivos seguidos por git se conservan.'
    ]
  ],
  purgeUnsafe: [
    ['{n} chemin refusé, laissé en place.', '{n} path refused, left in place.', '{n} Pfad abgelehnt, bleibt an Ort und Stelle.',
      '{n} ruta rechazada, dejada en su sitio.'
    ],
    ['{n} chemins refusés, laissés en place.', '{n} paths refused, left in place.', '{n} Pfade abgelehnt, bleiben an Ort und Stelle.',
      '{n} rutas rechazadas, dejadas en su sitio.'
    ]
  ],
  purgeNothing: ['Rien à purger', 'Nothing to purge', 'Nichts zu bereinigen', 'Nada que purgar'],
  purgeDone: ['Purgé : {n}, {s}', 'Purged: {n}, {s}', 'Bereinigt: {n}, {s}', 'Purgado: {n}, {s}'],
  purgePartial: ['Purge partielle : {n}, {s} (voir les zones en échec)', 'Partial purge: {n}, {s} (see the zones that failed)',
    'Teilweise bereinigt: {n}, {s} (siehe die fehlgeschlagenen Zonen)', 'Purga parcial: {n}, {s} (véanse las zonas con fallo)'
  ],
  purgeFailed: ['La purge a échoué : lisez le motif de chaque zone.', 'The purge failed: read the reason on each zone.',
    'Das Bereinigen ist fehlgeschlagen: Lesen Sie den Grund bei jeder Zone.', 'La purga falló: lea el motivo de cada zona.'
  ],
  purgeStopped: ['Purge arrêtée ; déjà retirés : {n}, {s}', 'Purge stopped; already removed: {n}, {s}',
    'Bereinigen angehalten; bereits entfernt: {n}, {s}', 'Purga detenida; ya retirados: {n}, {s}'
  ],
  purgeInterrupted: ['Purge interrompue (le lanceur s’est arrêté)', 'Purge interrupted (the launcher stopped)',
    'Bereinigen unterbrochen (der Starter wurde beendet)', 'Purga interrumpida (el lanzador se detuvo)'
  ],
  // publier la base : le panneau, la question, la fin
  publishTitle: ['Publier la base', 'Publish the base', 'Basis veröffentlichen', 'Publicar la base'],
  publish: ['Publier', 'Publish', 'Veröffentlichen', 'Publicar'],
  // l’état du poste : singulier, pluriel
  pubFiles: [
    ['{n} fichier modifié', '{n} file changed', '{n} Datei geändert', '{n} archivo modificado'],
    ['{n} fichiers modifiés', '{n} files changed', '{n} Dateien geändert', '{n} archivos modificados']
  ],
  pubCommits: [
    ['{n} commit à envoyer', '{n} commit to send', '{n} Commit zu senden', '{n} commit por enviar'],
    ['{n} commits à envoyer', '{n} commits to send', '{n} Commits zu senden', '{n} commits por enviar']
  ],
  pubMerge: ['Une fusion attend dans data/ : la publication la conclut d’abord',
    'A merge is waiting in data/: publishing concludes it first',
    'In data/ wartet eine Zusammenführung: die Veröffentlichung schließt sie zuerst ab',
    'Una fusión espera en data/: la publicación la concluye primero'
  ],
  pubLastSent: ['Dernière publication : {d}', 'Last publication: {d}', 'Letzte Veröffentlichung: {d}', 'Última publicación: {d}'],
  pubLastKept: ['Dernier passage : {d} (rien n’a été envoyé)', 'Last pass: {d} (nothing was sent)',
    'Letzter Durchlauf: {d} (nichts wurde gesendet)', 'Último paso: {d} (no se envió nada)'
  ],
  pubUnread: ['L’état des fichiers du poste n’a pas pu être lu : le lanceur ne répond pas.',
    'The state of this workstation’s files could not be read: the launcher does not answer.',
    'Der Stand der Dateien dieses Rechners konnte nicht gelesen werden: der Starter antwortet nicht.',
    'No se pudo leer el estado de los archivos de este equipo: el lanzador no responde.'
  ],
  // les raisons du bouton gris propres à « Publier » (les autres : greyReason)
  pubReason: {
    publishing: ['Une publication est en cours', 'A publication is running', 'Eine Veröffentlichung läuft',
      'Hay una publicación en curso'
    ],
    building: ['Une construction est en cours : publiez quand elle est finie', 'A build is running: publish when it is finished',
      'Ein Aufbau läuft: veröffentlichen Sie, wenn er fertig ist', 'Hay una construcción en curso: publique cuando termine'
    ],
    'no-gesture': ['Le cadre ne sait pas encore publier la base : mettez l’appli à jour',
      'The frame cannot publish the base yet: update the app',
      'Der Rahmen kann die Basis noch nicht veröffentlichen: aktualisieren Sie die App',
      'El marco aún no sabe publicar la base: actualice la aplicación'
    ],
    nothing: ['Rien à publier', 'Nothing to publish', 'Nichts zu veröffentlichen', 'Nada que publicar']
  },
  pubAsk: ['Publier {f} et {c} vers le dépôt des données ?', 'Publish {f} and {c} to the data repository?',
    '{f} und {c} an das Datenrepository veröffentlichen?', '¿Publicar {f} y {c} en el repositorio de datos?'
  ],
  // une seule des deux parts (l'autre vaut 0) : « Publier 1 commit vers le dépôt des données ? »
  pubAskOne: ['Publier {x} vers le dépôt des données ?', 'Publish {x} to the data repository?',
    '{x} an das Datenrepository veröffentlichen?', '¿Publicar {x} en el repositorio de datos?'
  ],
  pubRunning: ['Publication en cours…', 'Publishing…', 'Veröffentlichung läuft…', 'Publicando…'],
  // la fin : une ligne par fait, la première est aussi le début de la notification
  pubDone: ['Envoyé. Fichiers commités : {c} ; fichiers reçus : {r}', 'Sent. Files committed: {c}; files received: {r}',
    'Gesendet. Eingecheckte Dateien: {c}; empfangene Dateien: {r}', 'Enviado. Archivos con commit: {c}; archivos recibidos: {r}'
  ],
  pubLocal: ['Enregistré sur le poste, rien n’a été envoyé. Fichiers commités : {c} ; fichiers reçus : {r}',
    'Saved on this workstation, nothing was sent. Files committed: {c}; files received: {r}',
    'Auf dem Rechner gespeichert, nichts wurde gesendet. Eingecheckte Dateien: {c}; empfangene Dateien: {r}',
    'Guardado en el equipo, no se envió nada. Archivos con commit: {c}; archivos recibidos: {r}'
  ],
  pubNoExchange: [
    'Rien n’est parti : cet appareil ne synchronise pas avec le dépôt des données (Réglages › Usages : plusieurs appareils ou plusieurs utilisateurs ; et le trigramme réglé).',
    'Nothing was sent: this device does not synchronise with the data repository (Settings › Usages: several devices or several users; and the trigram set).',
    'Nichts wurde gesendet: dieses Gerät synchronisiert nicht mit dem Datenrepository (Einstellungen › Nutzungen: mehrere Geräte oder mehrere Nutzer; und das Kürzel eingestellt).',
    'No se envió nada: este dispositivo no se sincroniza con el repositorio de datos (Ajustes › Usos: varios dispositivos o varios usuarios; y el trigrama configurado).'
  ],
  pubHeld: [
    ['{n} fichier de la base gardé sur le poste (construction en cours)', '{n} base file kept on this workstation (build under way)',
      '{n} Datei der Basis auf dem Rechner behalten (Aufbau läuft)',
      '{n} archivo de la base conservado en el equipo (construcción en curso)'
    ],
    ['{n} fichiers de la base gardés sur le poste (construction en cours)', '{n} base files kept on this workstation (build under way)',
      '{n} Dateien der Basis auf dem Rechner behalten (Aufbau läuft)',
      '{n} archivos de la base conservados en el equipo (construcción en curso)'
    ]
  ],
  pubConflicts: [
    ['{n} conflit : voir Réglages › Conflits', '{n} conflict: see Settings › Conflicts',
      '{n} Konflikt: siehe Einstellungen › Konflikte',
      '{n} conflicto: véase Ajustes › Conflictos'
    ],
    ['{n} conflits : voir Réglages › Conflits', '{n} conflicts: see Settings › Conflicts',
      '{n} Konflikte: siehe Einstellungen › Konflikte',
      '{n} conflictos: véase Ajustes › Conflictos'
    ]
  ],
  pubRefused: [
    ['{n} fichier refusé : il n’a pas le format d’un fichier de données', '{n} file refused: it is not in the format of a data file',
      '{n} Datei abgelehnt: sie hat nicht das Format einer Datendatei',
      '{n} archivo rechazado: no tiene el formato de un archivo de datos'
    ],
    ['{n} fichiers refusés : ils n’ont pas le format d’un fichier de données',
      '{n} files refused: they are not in the format of a data file',
      '{n} Dateien abgelehnt: sie haben nicht das Format einer Datendatei',
      '{n} archivos rechazados: no tienen el formato de un archivo de datos'
    ]
  ],
  pubFailed: ['La publication a échoué : rien n’est perdu, les fichiers restent sur le poste. Corrigez la cause puis relancez.',
    'The publication failed: nothing is lost, the files stay on this workstation. Fix the cause, then start again.',
    'Die Veröffentlichung ist fehlgeschlagen: nichts geht verloren, die Dateien bleiben auf dem Rechner. Beheben Sie die Ursache und starten Sie neu.',
    'La publicación falló: no se pierde nada, los archivos siguen en el equipo. Corrija la causa y vuelva a empezar.'
  ],
  pubLauncherSays: ['Le lanceur dit : {m}', 'The launcher says: {m}', 'Der Starter meldet: {m}', 'El lanzador dice: {m}'],
  // les panneaux des autres groupes (V3 § 10.34, lot A1) : procédures par État, points VFR par cycle, appareils par type, fiches publiées
  setTitle: {
    proc: ['Procédures : télécharger, construire, purger', 'Procedures: download, build, purge',
      'Verfahren: herunterladen, aufbauen, bereinigen',
      'Procedimientos: descargar, construir, purgar'
    ],
    vfr: ['Points VFR des cartes VAC : télécharger, construire, purger', 'VFR points of the VAC charts: download, build, purge',
      'VFR-Punkte der VAC-Karten: herunterladen, aufbauen, bereinigen', 'Puntos VFR de las cartas VAC: descargar, construir, purgar'
    ],
    aircraft: ['Appareils : télécharger, construire, purger', 'Aircraft: download, build, purge',
      'Luftfahrzeuge: herunterladen, aufbauen, bereinigen',
      'Aeronaves: descargar, construir, purgar'
    ],
    sheets: ['Fiches publiées de la compagnie', 'Published sheets of the airline', 'Veröffentlichte Datenblätter der Fluggesellschaft',
      'Fichas publicadas de la compañía'
    ]
  },
  // le nom du jeu dans les phrases de fin et dans le journal
  setLabel: {
    proc: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
    vfr: ['Points VFR', 'VFR points', 'VFR-Punkte', 'Puntos VFR'],
    aircraft: ['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']
  },
  setItems: {
    proc: ['États concernés', 'States affected', 'Betroffene Staaten', 'Estados afectados'],
    vfr: ['Cycle concerné', 'Cycle affected', 'Betroffener Zyklus', 'Ciclo afectado'],
    aircraft: ['Types concernés', 'Types affected', 'Betroffene Muster', 'Tipos afectados']
  },
  noStates: ['Aucun État lisible dans la couverture d’aerodb pour le moment.', 'No readable State in aerodb’s coverage for now.',
    'Derzeit kein lesbarer Staat in der Abdeckung von aerodb.', 'Por ahora ningún Estado legible en la cobertura de aerodb.'
  ],
  codesLabel: ['Types OACI, séparés par des virgules ou des espaces', 'ICAO types, separated by commas or spaces',
    'ICAO-Muster, durch Kommas oder Leerzeichen getrennt', 'Tipos OACI, separados por comas o espacios'
  ],
  codesHint: ['Vide : les types de la flotte.', 'Empty: the fleet’s types.', 'Leer: die Muster der Flotte.',
    'Vacío: los tipos de la flota.'
  ],
  codesBad: ['Codes refusés : {c}. Un code OACI fait 2 à 4 lettres ou chiffres.',
    'Codes refused: {c}. An ICAO code is 2 to 4 letters or digits.',
    'Abgelehnte Codes: {c}. Ein ICAO-Code besteht aus 2 bis 4 Buchstaben oder Ziffern.',
    'Códigos rechazados: {c}. Un código OACI tiene de 2 a 4 letras o dígitos.'
  ],
  // la fin d’une construction ou d’un téléchargement d’un autre jeu : « Procédures : construction terminée (3 États) »
  setSum: {
    buildDone: ['{s} : construction terminée ({built})', '{s}: build finished ({built})', '{s}: Aufbau abgeschlossen ({built})',
      '{s}: construcción terminada ({built})'
    ],
    buildPartial: ['{s} : construction terminée ({built}) ; {failed} en échec ({items})',
      '{s}: build finished ({built}); {failed} failed ({items})',
      '{s}: Aufbau abgeschlossen ({built}); {failed} fehlgeschlagen ({items})',
      '{s}: construcción terminada ({built}); {failed} con fallo ({items})'
    ],
    buildFailed: ['{s} : rien de construit, {failed} en échec ({items})', '{s}: nothing built, {failed} failed ({items})',
      '{s}: nichts erstellt, {failed} fehlgeschlagen ({items})', '{s}: nada construido, {failed} con fallo ({items})'
    ],
    buildStopped: ['{s} : construction arrêtée ; déjà construits : {n}', '{s}: build stopped; already built: {n}',
      '{s}: Aufbau angehalten; bereits erstellt: {n}', '{s}: construcción detenida; ya construidos: {n}'
    ],
    buildInterrupted: ['{s} : construction interrompue (le lanceur s’est arrêté)', '{s}: build interrupted (the launcher stopped)',
      '{s}: Aufbau unterbrochen (der Starter wurde beendet)', '{s}: construcción interrumpida (el lanzador se detuvo)'
    ],
    fetchDone: ['{s} : téléchargé — nouveautés : {c}, sans changement : {u} ; {f}', '{s}: downloaded — new: {c}, unchanged: {u}; {f}',
      '{s}: heruntergeladen — neu: {c}, unverändert: {u}; {f}', '{s}: descargado — novedades: {c}, sin cambios: {u}; {f}'
    ],
    fetchStopped: ['{s} : téléchargement arrêté — nouveautés : {c}, sans changement : {u} ; {f}',
      '{s}: download stopped — new: {c}, unchanged: {u}; {f}', '{s}: Herunterladen angehalten — neu: {c}, unverändert: {u}; {f}',
      '{s}: descarga detenida — novedades: {c}, sin cambios: {u}; {f}'
    ],
    fetchInterrupted: ['{s} : téléchargement interrompu (le lanceur s’est arrêté)', '{s}: download interrupted (the launcher stopped)',
      '{s}: Herunterladen unterbrochen (der Starter wurde beendet)', '{s}: descarga interrumpida (el lanzador se detuvo)'
    ],
    fetchNothing: ['{s} : rien à télécharger', '{s}: nothing to download', '{s}: nichts herunterzuladen', '{s}: nada que descargar'],
    // les motifs du lanceur pour les appareils (aircraft/fetch et aircraft/build) : aucun type, script absent
    noCodes: ['{s} : aucun type à traiter — indiquez des types OACI ou renseignez la flotte',
      '{s}: no type to process — enter ICAO types or fill in the fleet',
      '{s}: kein Muster zu verarbeiten — ICAO-Muster eingeben oder die Flotte füllen',
      '{s}: ningún tipo que procesar — indique tipos OACI o rellene la flota'
    ],
    noScript: ['{s} : le lanceur de ce poste n’a pas le script de cette opération',
      '{s}: this workstation’s launcher does not have this operation’s script',
      '{s}: der Starter dieses Rechners hat das Skript dieses Vorgangs nicht',
      '{s}: el lanzador de este equipo no tiene el script de esta operación'
    ]
  },
  // les trois étapes des appareils (les lignes d’une construction ou d’un téléchargement)
  stepName: {
    types: ['Types (OACI Doc 8643)', 'Types (ICAO Doc 8643)', 'Muster (ICAO Doc 8643)', 'Tipos (OACI Doc 8643)'],
    apd: ['Performances (EUROCONTROL APD)', 'Performance (EUROCONTROL APD)', 'Leistungsdaten (EUROCONTROL APD)',
      'Rendimiento (EUROCONTROL APD)'
    ],
    simbrief: ['Profils SimBrief', 'SimBrief profiles', 'SimBrief-Profile', 'Perfiles SimBrief']
  },
  // sous les boutons du panneau des appareils
  aircraftHint: [
    'Construire n’enregistre rien dans le dépôt de données : AircraftDB/ de ce poste n’est pas versionné. L’envoi se fait par « Fiches publiées », plus bas.',
    'Build records nothing in the data repository: this workstation’s AircraftDB/ is not versioned. Sending is done by “Published sheets”, below.',
    'Aufbauen speichert nichts im Datenrepository: AircraftDB/ dieses Rechners ist nicht versioniert. Gesendet wird über „Veröffentlichte Datenblätter“ weiter unten.',
    'Construir no guarda nada en el repositorio de datos: AircraftDB/ de este equipo no está versionado. El envío se hace con «Fichas publicadas», más abajo.'
  ],
  // ce qu’il y a à faire après une construction qui n’a pas tout fait (un jeu sans case à décocher : le même conseil pour tous)
  setAdvice: {
    partial: ['Ce qui est construit est gardé ; relancez pour retenter le reste (le motif est écrit à chaque ligne).',
      'What is built is kept; start again to retry the rest (the reason is written on each line).',
      'Was erstellt ist, bleibt erhalten; starten Sie neu, um den Rest zu wiederholen (der Grund steht in jeder Zeile).',
      'Lo construido se conserva; vuelva a empezar para reintentar el resto (el motivo está en cada línea).'
    ],
    failed: ['Rien n’a été construit : lisez le motif de chaque ligne, puis relancez.',
      'Nothing was built: read the reason on each line, then start again.',
      'Nichts wurde erstellt: Lesen Sie den Grund in jeder Zeile und starten Sie neu.',
      'No se construyó nada: lea el motivo de cada línea y vuelva a empezar.'
    ],
    cancelled: ['Ce qui est déjà construit est gardé ; relancez pour la suite.',
      'What is already built is kept; start again for the rest.',
      'Was bereits erstellt ist, bleibt erhalten; starten Sie für den Rest neu.',
      'Lo ya construido se conserva; vuelva a empezar para el resto.'
    ],
    interrupted: ['Relancez la construction : ce qui est déjà construit est gardé.',
      'Start the build again: what is already built is kept.',
      'Starten Sie den Aufbau neu: was bereits erstellt ist, bleibt erhalten.',
      'Vuelva a lanzar la construcción: lo ya construido se conserva.'
    ]
  },
  // la question d’une purge d’un autre jeu
  purgeAskSet: ['Purger {n} ({s}) pour {z} ?', 'Purge {n} ({s}) for {z}?', '{n} ({s}) für {z} bereinigen?',
    '¿Purgar {n} ({s}) para {z}?'
  ],
  // les fiches publiées de la compagnie (aircraft/publish) : la question, la fin
  sheetsAsk: ['Publier les fiches : copie de {c}, retrait de {r} ({s}) ?', 'Publish the sheets: copy {c}, remove {r} ({s})?',
    'Datenblätter veröffentlichen: {c} kopieren, {r} entfernen ({s})?', '¿Publicar las fichas: copia de {c}, retirada de {r} ({s})?'
  ],
  sheetsNoAuthor: ['Réglez votre trigramme (Réglages › Identité), puis relancez.',
    'Set your trigram (Settings › Identity), then start again.',
    'Stellen Sie Ihr Kürzel ein (Einstellungen › Identität) und starten Sie neu.',
    'Configure su trigrama (Ajustes › Identidad) y vuelva a empezar.'
  ],
  sheetsDone: ['Fiches publiées : copie de {c}, retrait de {r}', 'Sheets published: copied {c}, removed {r}',
    'Datenblätter veröffentlicht: {c} kopiert, {r} entfernt', 'Fichas publicadas: copia de {c}, retirada de {r}'
  ],
  sheetsNothing: ['Rien à publier : les fiches sont à jour', 'Nothing to publish: the sheets are up to date',
    'Nichts zu veröffentlichen: die Datenblätter sind aktuell', 'Nada que publicar: las fichas están al día'
  ],
  sheetsFailed: ['La publication des fiches a échoué : lisez le message du lanceur, puis relancez.',
    'Publishing the sheets failed: read the launcher’s message, then start again.',
    'Das Veröffentlichen der Datenblätter ist fehlgeschlagen: Lesen Sie die Meldung des Starters und starten Sie neu.',
    'La publicación de las fichas falló: lea el mensaje del lanzador y vuelva a empezar.'
  ],
  sheetsStopped: ['Publication des fiches arrêtée ; déjà copiées : {c}, retirées : {r}',
    'Publishing the sheets stopped; already copied: {c}, removed: {r}',
    'Veröffentlichen der Datenblätter angehalten; bereits kopiert: {c}, entfernt: {r}',
    'Publicación de las fichas detenida; ya copiadas: {c}, retiradas: {r}'
  ],
  sheetsInterrupted: ['Publication des fiches interrompue (le lanceur s’est arrêté)',
    'Publishing the sheets interrupted (the launcher stopped)',
    'Veröffentlichen der Datenblätter unterbrochen (der Starter wurde beendet)',
    'Publicación de las fichas interrumpida (el lanzador se detuvo)'
  ],
  // les États lus par EAD Basic ne se lisent jamais en bloc (EAD_BASIC.md § 1) : la phrase sous le panneau des procédures, et celle d'un résultat qui porte encore
  // l'erreur ead-per-aerodrome
  eadNote: ['États lus par EAD Basic : un terrain à la fois, par « Relire » dans Carburant ou sur la Carte',
    'States read through EAD Basic: one aerodrome at a time, with “Read again” in Fuel or on the Map',
    'Über EAD Basic gelesene Staaten: ein Flugplatz nach dem anderen, mit „Erneut lesen“ in Treibstoff oder auf der Karte',
    'Estados leídos por EAD Basic: un aeródromo a la vez, con «Volver a leer» en Combustible o en el Mapa'
  ],
  // les codes d’erreur d’un élément que le lanceur donne aux jeux autres que la base (les autres s’écrivent tels quels)
  itemError: {
    'ead-per-aerodrome': ['États lus par EAD Basic : un terrain à la fois, par « Relire » dans Carburant ou sur la Carte',
      'States read through EAD Basic: one aerodrome at a time, with “Read again” in Fuel or on the Map',
      'Über EAD Basic gelesene Staaten: ein Flugplatz nach dem anderen, mit „Erneut lesen“ in Treibstoff oder auf der Karte',
      'Estados leídos por EAD Basic: un aeródromo a la vez, con «Volver a leer» en Combustible o en el Mapa'
    ],
    'not-a-zip': ['l’archive du CIFP n’est pas un zip', 'the CIFP archive is not a zip', 'das CIFP-Archiv ist keine Zip-Datei',
      'el archivo del CIFP no es un zip'
    ],
    'no-cache': ['téléchargez d’abord', 'download first', 'zuerst herunterladen', 'descargue primero'],
    'no-source': ['aucune source en bloc pour cet État', 'no bulk source for this State', 'keine Sammelquelle für diesen Staat',
      'ninguna fuente en bloque para este Estado'
    ]
  },
  // les points VFR des cartes VAC : la fin d’un téléchargement (cartes), les motifs de la construction
  vfrSum: {
    fetchDone: ['{s} : cartes téléchargées : {c}, déjà là : {u} ; {p} ; {f}', '{s}: charts downloaded: {c}, already there: {u}; {p}; {f}',
      '{s}: Karten heruntergeladen: {c}, bereits vorhanden: {u}; {p}; {f}', '{s}: cartas descargadas: {c}, ya presentes: {u}; {p}; {f}'
    ],
    fetchStopped: ['{s} : téléchargement arrêté — cartes téléchargées : {c}, déjà là : {u} ; {p} ; {f}',
      '{s}: download stopped — charts downloaded: {c}, already there: {u}; {p}; {f}',
      '{s}: Herunterladen angehalten — Karten heruntergeladen: {c}, bereits vorhanden: {u}; {p}; {f}',
      '{s}: descarga detenida — cartas descargadas: {c}, ya presentes: {u}; {p}; {f}'
    ],
    noBase: ['{s} : construisez d’abord la base France de ce cycle', '{s}: build the France base of this cycle first',
      '{s}: erstellen Sie zuerst die Frankreich-Basis dieses Zyklus', '{s}: construya primero la base de Francia de este ciclo'
    ],
    notPublished: ['{s} : le SIA n’a pas encore publié les cartes de ce cycle',
      '{s}: the SIA has not published the charts of this cycle yet',
      '{s}: der SIA hat die Karten dieses Zyklus noch nicht veröffentlicht', '{s}: el SIA aún no ha publicado las cartas de este ciclo'
    ],
    noPypdf: ['{s} : pypdf manque — l’assistant de première installation l’installe',
      '{s}: pypdf is missing — the first-install assistant installs it',
      '{s}: pypdf fehlt — der Assistent der Ersteinrichtung installiert es',
      '{s}: falta pypdf — el asistente de primera instalación lo instala'
    ],
    noCache: ['{s} : téléchargez d’abord les cartes de ce cycle', '{s}: download the charts of this cycle first',
      '{s}: laden Sie zuerst die Karten dieses Zyklus herunter', '{s}: descargue primero las cartas de este ciclo'
    ],
    invalid: ['{s} : le contrôle a refusé la compilation, rien n’a été écrit ({failed} problème(s))',
      '{s}: the check refused the compilation, nothing was written ({failed} problem(s))',
      '{s}: die Prüfung hat die Kompilierung abgelehnt, nichts wurde geschrieben ({failed} Problem(e))',
      '{s}: la comprobación rechazó la compilación, no se escribió nada ({failed} problema(s))'
    ]
  },
  vfrNotPublished: [
    ['{n} carte pas encore publiée', '{n} chart not published yet', '{n} Karte noch nicht veröffentlicht',
      '{n} carta aún no publicada'
    ],
    ['{n} cartes pas encore publiées', '{n} charts not published yet', '{n} Karten noch nicht veröffentlicht',
      '{n} cartas aún no publicadas'
    ]
  ],
  vfrNoCommit: ['Construit, mais rien n’a été commité : réglez votre trigramme (Réglages › Identité), puis relancez.',
    'Built, but nothing was committed: set your trigram (Settings › Identity), then start again.',
    'Erstellt, aber nichts wurde committet: Stellen Sie Ihr Kürzel ein (Einstellungen › Identität) und starten Sie neu.',
    'Construido, pero no se hizo commit de nada: configure su trigrama (Ajustes › Identidad) y vuelva a empezar.'
  ],
  // rien n'est écrit dans data/ tant qu'une fusion y attend (base/build, vfr/build, proc/build, aircraft/publish réel)
  mergePending: ['Une fusion attend dans data/ : synchronisez d’abord (Réglages › Synchronisation)',
    'A merge is waiting in data/: synchronise first (Settings › Synchronisation)',
    'In data/ wartet eine Zusammenführung: synchronisieren Sie zuerst (Einstellungen › Synchronisierung)',
    'Una fusión espera en data/: sincronice primero (Ajustes › Sincronización)'
  ],
  firstInstall: ['Ouvrir l’assistant de première installation', 'Open the first-install assistant',
    'Assistenten der Ersteinrichtung öffnen',
    'Abrir el asistente de primera instalación'
  ],
  // la carte des zones à cocher (même sélection que la liste) : son nom, ce que dit chaque teinte, la légende
  zoneMap: {
    base: ['Carte des zones à cocher', 'Map of the zones to tick', 'Karte der anzukreuzenden Zonen', 'Mapa de las zonas por marcar'],
    proc: ['Carte des États à cocher', 'Map of the States to tick', 'Karte der anzukreuzenden Staaten', 'Mapa de los Estados por marcar']
  },
  mapTone: {
    ok: ['à jour', 'up to date', 'aktuell', 'al día'],
    warn: ['cycle dépassé ou absent', 'cycle out of date or missing', 'Zyklus überholt oder fehlend', 'ciclo superado o ausente'],
    accent: ['en cours', 'running', 'läuft', 'en curso'],
    muted: ['hors couverture', 'not in the coverage', 'nicht in der Abdeckung', 'fuera de la cobertura']
  },
  mapTicked: ['cochée', 'ticked', 'angekreuzt', 'marcada'],
  mapApprox: ['contour approximatif', 'approximate outline', 'ungefährer Umriss', 'contorno aproximado'],
  mapLegendApprox: ['pointillé : contour approximatif', 'dashed: approximate outline', 'gestrichelt: ungefährer Umriss',
    'punteado: contorno aproximado'
  ],
  mapLegend: ['Légende', 'Legend', 'Legende', 'Leyenda'],
  mapLegendNote: ['Trait épais et teinte pleine : zone cochée ; touchez une zone ou appuyez sur Espace pour la cocher.',
    'Thick outline and solid tint: zone ticked; tap a zone or press Space to tick it.',
    'Dicker Rand und volle Tönung: Zone angekreuzt; tippen Sie auf eine Zone oder drücken Sie die Leertaste.',
    'Trazo grueso y tono lleno: zona marcada; toque una zona o pulse Espacio para marcarla.'
  ],
  // prendre le fichier téléchargé à la main dans Téléchargements (base/pickup) : le bouton, la question, la fin
  pickup: ['Prendre le fichier téléchargé', 'Take the downloaded file', 'Heruntergeladene Datei übernehmen',
    'Tomar el archivo descargado'
  ],
  pickupAsk: [
    'Prendre dans Téléchargements : {taken}.{missing} Les fichiers vont dans {to} ; ce sont des sources brutes du poste, jamais commitées.',
    'Take from Downloads: {taken}.{missing} The files go into {to}; they are raw sources of this workstation, never committed.',
    'Aus Downloads übernehmen: {taken}.{missing} Die Dateien kommen nach {to}; es sind Rohquellen dieses Rechners, nie committet.',
    'Tomar de Descargas: {taken}.{missing} Los archivos van a {to}; son fuentes en bruto de este equipo, nunca con commit.'
  ],
  pickupTaken: ['{z} ({s}) : {zip} ({n}, {b})', '{z} ({s}): {zip} ({n}, {b})', '{z} ({s}): {zip} ({n}, {b})',
    '{z} ({s}): {zip} ({n}, {b})'
  ],
  pickupMissing: ['{z} ({s}) : aucun fichier {e} dans Téléchargements', '{z} ({s}): no file {e} in Downloads',
    '{z} ({s}): keine Datei {e} in Downloads',
    '{z} ({s}): ningún archivo {e} en Descargas'
  ],
  pickupFailedLine: ['{z} ({s}) : échec, {r}', '{z} ({s}): failed, {r}', '{z} ({s}): fehlgeschlagen, {r}', '{z} ({s}): fallo, {r}'],
  pickupError: {
    'nothing-to-take': ['aucun fichier utile dans le zip', 'no useful file in the zip', 'keine brauchbare Datei im Zip',
      'ningún archivo útil en el zip'
    ],
    BadZipFile: ['zip illisible', 'unreadable zip', 'Zip nicht lesbar', 'zip ilegible'],
    'unsafe-path': ['chemin refusé', 'path refused', 'Pfad abgelehnt', 'ruta rechazada']
  },
  pickupTooLarge: ['zip de plus de {n} Mo', 'zip over {n} MB', 'Zip über {n} MB', 'zip de más de {n} MB'],
  pickupSum: {
    done: ['Pris : {n} ({s})', 'Taken: {n} ({s})', 'Übernommen: {n} ({s})', 'Tomado: {n} ({s})'],
    partial: ['Pris : {n} ({s}) ; {f}', 'Taken: {n} ({s}); {f}', 'Übernommen: {n} ({s}); {f}', 'Tomado: {n} ({s}); {f}'],
    failed: ['Rien n’a été pris : {f}', 'Nothing was taken: {f}', 'Nichts wurde übernommen: {f}', 'No se tomó nada: {f}'],
    cancelled: ['Prise arrêtée ; déjà pris : {n} ({s})', 'Take stopped; already taken: {n} ({s})',
      'Übernahme angehalten; bereits übernommen: {n} ({s})',
      'Toma detenida; ya tomado: {n} ({s})'
    ],
    interrupted: ['Prise interrompue (le lanceur s’est arrêté)', 'Take interrupted (the launcher stopped)',
      'Übernahme unterbrochen (der Starter wurde beendet)',
      'Toma interrumpida (el lanzador se detuvo)'
    ],
    blocked: ['Rien à prendre : un nom de fichier est à renommer', 'Nothing to take: a file name needs renaming',
      'Nichts zu übernehmen: ein Dateiname muss umbenannt werden',
      'Nada que tomar: un nombre de archivo debe renombrarse'
    ],
    nothing: ['Rien à prendre dans Téléchargements', 'Nothing to take in Downloads', 'Nichts zum Übernehmen in Downloads',
      'Nada que tomar en Descargas'
    ]
  },
  pickupChanged: ['{z} ({s}) : le fichier a changé depuis le plan ({zip}) : rien n’a été pris pour cette source',
    '{z} ({s}): the file changed since the plan ({zip}): nothing was taken for this source',
    '{z} ({s}): die Datei hat sich seit dem Plan geändert ({zip}): für diese Quelle wurde nichts übernommen',
    '{z} ({s}): el archivo cambió desde el plan ({zip}): no se tomó nada de esta fuente'
  ],
  pickupNotShown: ['{z} ({s}) : ce fichier n’a pas été montré au plan ({zip}) : rien n’a été pris pour cette source',
    '{z} ({s}): this file was not shown in the plan ({zip}): nothing was taken for this source',
    '{z} ({s}): diese Datei wurde im Plan nicht gezeigt ({zip}): für diese Quelle wurde nichts übernommen',
    '{z} ({s}): este archivo no se mostró en el plan ({zip}): no se tomó nada de esta fuente'
  ],
  pickupRename: ['{z} ({s}) : {zip} — nom de fichier à renommer : lettres, chiffres, . _ -',
    '{z} ({s}): {zip} — file name to rename: letters, digits, . _ -',
    '{z} ({s}): {zip} — Dateiname umbenennen: Buchstaben, Ziffern, . _ -',
    '{z} ({s}): {zip} — nombre de archivo por renombrar: letras, cifras, . _ -'
  ],
  pickupReplan: ['Relancer le plan', 'Run the plan again', 'Plan erneut ausführen', 'Repetir el plan'],
  pickupHint: ['Lancez maintenant Construire.', 'Now start Build.', 'Starten Sie jetzt Aufbauen.', 'Ahora lance Construir.'],
  // « Tout mettre à jour » (SPEC § 5.3) : le bouton, la question, la chaîne, la fin
  updateAll: ['Tout mettre à jour', 'Update all', 'Alle aktualisieren', 'Actualizar todo'],
  updateAllN: ['Tout mettre à jour ({n})', 'Update all ({n})', 'Alle aktualisieren ({n})', 'Actualizar todo ({n})'],
  staleCycle: ['Cycle {x} dépassé, à reconstruire pour {y}', 'Cycle {x} out of date, rebuild for {y}',
    'Zyklus {x} überholt, für {y} neu aufbauen',
    'Ciclo {x} superado, reconstruir para {y}'
  ],
  chainAsk: [
    'Tout mettre à jour, cycle AIRAC {c} : {sets}. Pour chaque jeu, télécharger puis construire, dans cet ordre ; la taille des téléchargements n’est pas connue d’avance ; aucune purge. Puis une seule publication, si tout a réussi.{skipped}',
    'Update all, AIRAC cycle {c}: {sets}. For each data set, download then build, in this order; the size of the downloads is not known beforehand; no purge. Then one publication, if everything succeeded.{skipped}',
    'Alle aktualisieren, AIRAC-Zyklus {c}: {sets}. Für jeden Datensatz zuerst herunterladen, dann aufbauen, in dieser Reihenfolge; die Größe der Downloads ist vorab nicht bekannt; keine Bereinigung. Danach eine einzige Veröffentlichung, wenn alles gelungen ist.{skipped}',
    'Actualizar todo, ciclo AIRAC {c}: {sets}. Para cada conjunto, descargar y luego construir, en este orden; el tamaño de las descargas no se conoce de antemano; ninguna purga. Después una sola publicación, si todo salió bien.{skipped}'
  ],
  chainSkipped: ['Ignorés : {s}.', 'Skipped: {s}.', 'Übersprungen: {s}.', 'Omitidos: {s}.'],
  chainFleet: ['types de la flotte', 'the fleet’s types', 'Muster der Flotte', 'tipos de la flota'],
  chainCount: ['{n} / {m} jeux', '{n} / {m} data sets', '{n} / {m} Datensätze', '{n} / {m} conjuntos'],
  chainWord: {
    done: ['fait', 'done', 'erledigt', 'hecho'],
    nothing: ['rien de neuf', 'nothing new', 'nichts Neues', 'nada nuevo'],
    failed: ['échec', 'failed', 'fehlgeschlagen', 'fallo'],
    cancelled: ['arrêté', 'stopped', 'angehalten', 'detenido'],
    skipped: ['ignoré', 'skipped', 'übersprungen', 'omitido'],
    notrun: ['non lancé', 'not started', 'nicht gestartet', 'no iniciado'],
    running: ['en cours', 'running', 'läuft', 'en curso'],
    waiting: ['en attente', 'waiting', 'wartet', 'en espera']
  },
  chainDone: ['Tout mettre à jour terminé : {n}. {p}', 'Update all finished: {n}. {p}', 'Alle aktualisieren abgeschlossen: {n}. {p}',
    'Actualizar todo terminado: {n}. {p}'
  ],
  chainFailed: ['Tout mettre à jour arrêté ({s}) : {r}. Ce qui est déjà construit est gardé sur le poste ; rien n’est publié.',
    'Update all stopped ({s}): {r}. What is already built is kept on this workstation; nothing is published.',
    'Alle aktualisieren angehalten ({s}): {r}. Was bereits erstellt ist, bleibt auf dem Rechner erhalten; nichts wird veröffentlicht.',
    'Actualizar todo se detuvo ({s}): {r}. Lo ya construido se conserva en el equipo; no se publica nada.'
  ],
  chainStopped: ['Tout mettre à jour arrêté par vos soins ({s}). Ce qui est déjà construit est gardé sur le poste ; rien n’est publié.',
    'Update all stopped by you ({s}). What is already built is kept on this workstation; nothing is published.',
    'Alle aktualisieren von Ihnen angehalten ({s}). Was bereits erstellt ist, bleibt auf dem Rechner erhalten; nichts wird veröffentlicht.',
    'Actualizar todo detenido por usted ({s}). Lo ya construido se conserva en el equipo; no se publica nada.'
  ],
  chainNotPublished: ['Non publié : {r}.', 'Not published: {r}.', 'Nicht veröffentlicht: {r}.', 'No publicado: {r}.'],
  chainReload: ['Chaîne interrompue par le rechargement : relancez « Tout mettre à jour ».',
    'Chain interrupted by the reload: start “Update all” again.',
    'Kette durch das Neuladen unterbrochen: starten Sie „Alle aktualisieren“ erneut.',
    'Cadena interrumpida por la recarga: vuelva a lanzar «Actualizar todo».'
  ],
  // le journal des opérations
  journal: ['Journal', 'Journal', 'Protokoll', 'Diario'],
  journalEmpty: ['Aucune opération pour le moment.', 'No operation yet.', 'Noch kein Vorgang.', 'Ninguna operación por ahora.'],
  opVerb: {
    build: ['Construire', 'Build', 'Aufbauen', 'Construir'],
    download: ['Télécharger', 'Download', 'Herunterladen', 'Descargar'],
    purge: ['Purger', 'Purge', 'Bereinigen', 'Purgar'],
    publish: ['Publier', 'Publish', 'Veröffentlichen', 'Publicar'],
    update: ['Mettre à jour', 'Update', 'Aktualisieren', 'Actualizar'],
    pickup: ['Prendre le fichier', 'Take the file', 'Datei übernehmen', 'Tomar el archivo']
  },
  opResult: {
    running: ['en cours', 'running', 'läuft', 'en curso'],
    done: ['terminée', 'done', 'abgeschlossen', 'terminada'],
    partial: ['partielle', 'partial', 'teilweise', 'parcial'],
    failed: ['échec', 'failed', 'fehlgeschlagen', 'fallo'],
    cancelled: ['arrêtée', 'stopped', 'angehalten', 'detenida'],
    interrupted: ['interrompue', 'interrupted', 'unterbrochen', 'interrumpida'],
    nothing: ['rien à faire', 'nothing to do', 'nichts zu tun', 'nada que hacer']
  }
};
