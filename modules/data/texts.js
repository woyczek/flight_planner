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
  buildTitle: ['Construire la base', 'Build the base', 'Basis aufbauen', 'Construir la base'],
  buildZones: ['Zones à construire', 'Zones to build', 'Zu erstellende Zonen', 'Zonas por construir'],
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
    failed: ['Le lanceur n’a pas pu démarrer la construction.', 'The launcher could not start the build.',
      'Der Starter konnte den Aufbau nicht starten.', 'El lanzador no pudo iniciar la construcción.'
    ]
  },
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
  pubNoExchange: ['Aucun échange avec le dépôt n’a eu lieu : le trigramme de cet appareil est-il réglé ?',
    'No exchange with the repository took place: is this device’s trigram set?',
    'Es fand kein Austausch mit dem Repository statt: ist das Kürzel dieses Geräts eingestellt?',
    'No hubo intercambio con el repositorio: ¿está configurado el trigrama de este dispositivo?'
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
  // le journal des opérations
  journal: ['Journal', 'Journal', 'Protokoll', 'Diario'],
  journalEmpty: ['Aucune opération pour le moment.', 'No operation yet.', 'Noch kein Vorgang.', 'Ninguna operación por ahora.'],
  opVerb: {
    build: ['Construire', 'Build', 'Aufbauen', 'Construir'],
    publish: ['Publier', 'Publish', 'Veröffentlichen', 'Publicar']
  },
  opResult: {
    done: ['terminée', 'done', 'abgeschlossen', 'terminada'],
    partial: ['partielle', 'partial', 'teilweise', 'parcial'],
    failed: ['échec', 'failed', 'fehlgeschlagen', 'fallo'],
    cancelled: ['arrêtée', 'stopped', 'angehalten', 'detenida'],
    interrupted: ['interrompue', 'interrupted', 'unterbrochen', 'interrumpida']
  }
};
