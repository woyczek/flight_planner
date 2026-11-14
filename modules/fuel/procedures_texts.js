// V3 fuel — textes [fr, en, de, es] du bloc « Procédures » (modules/fuel/procedures.js) : les rangées de la carte (piste, SID,
// STAR, approche), la ligne « lu le … · Relire », les motifs d'une lecture refusée et les lignes de l'OFP. Ce fichier ne porte que
// des rangées ; la langue est choisie par ctx.t (cadre). Les rangées partagées avec l'écran (procTitle) restent dans module.js.
export const TX = {
  dep: ['Départ', 'Departure', 'Abflug', 'Salida'],
  arr: ['Arrivée', 'Arrival', 'Ankunft', 'Llegada'],
  procRwy: ['Piste', 'Runway', 'Piste', 'Pista'],
  procSid: ['SID', 'SID', 'SID', 'SID'],
  procStar: ['STAR', 'STAR', 'STAR', 'STAR'],
  procTrans: ['Transition', 'Transition', 'Übergang', 'Transición'],
  procApp: ['Approche', 'Approach', 'Anflug', 'Aproximación'],
  procAppTrans: ['Transition d’approche', 'Approach transition', 'Anflugübergang', 'Transición de aproximación'],
  procNone: ['aucune', 'none', 'keine', 'ninguna'],
  // procédure lue sans nom (identifiant « ….STAR.NONAME.… ») : sa sorte, jamais le mot de l'identifiant
  procUnnamed: ['{k} sans nom', '{k} without a name', '{k} ohne Namen', '{k} sin nombre'],
  procXplane: ['X-Plane, local', 'X-Plane, local', 'X-Plane, lokal', 'X-Plane, local'],
  // SOG-0210 : une fiche lue dans la base de Little Navmap du poste (en mémoire de la page seulement, jamais écrite ni exportée)
  procSrcLnm: ['Little Navmap, lue sur ce poste', 'Little Navmap, read on this device', 'Little Navmap, auf diesem Gerät gelesen',
    'Little Navmap, leída en este equipo'
  ],
  // SOG-0210 (refus du 13 nov.) : une procédure choisie lue de Little Navmap le dit sous les listes et sur la ligne de résumé
  // SOG-0345 : un côté dont les procédures ne sont pas encore là le dit — jamais un titre seul
  procWaiting: ['Lecture des procédures de {icao}…', 'Reading the procedures of {icao}…', 'Verfahren von {icao} werden gelesen…',
    'Leyendo los procedimientos de {icao}…'
  ],
  procNotYet: ['{icao} : procédures pas encore lues ; elles se lisent depuis le poste.',
    '{icao}: procedures not read yet; they are read from the workstation.',
    '{icao}: Verfahren noch nicht gelesen; sie werden am Arbeitsplatz gelesen.',
    '{icao}: procedimientos aún no leídos; se leen desde el puesto.'
  ],
  // la phrase du bandeau du cadre (SOG-0337, frame/app.js T.sync.limited), pour que la cause se reconnaisse
  procLimited: ['{who} limite les requêtes : reprise dans {n} s', '{who} is limiting requests: resuming in {n} s',
    '{who} begrenzt die Anfragen: Fortsetzung in {n} s', '{who} limita las solicitudes: se reanuda en {n} s'
  ],
  // SOG-0210 (second refus) : des listes lues de Little Navmap, dites avant tout choix
  procLnmLists: ['⚠ Des procédures de ce terrain sont lues de Little Navmap, sur ce poste, pour votre usage personnel.',
    '⚠ Procedures of this aerodrome are read from Little Navmap, on this device, for your personal use.',
    '⚠ Verfahren dieses Flugplatzes stammen aus Little Navmap, auf diesem Gerät, für Ihren persönlichen Gebrauch.',
    '⚠ Procedimientos de este aeródromo leídos de Little Navmap, en este equipo, para su uso personal.'
  ],
  procLnmChosen: ['⚠ Lue de Little Navmap sur ce poste, pour votre usage personnel : {list}',
    '⚠ Read from Little Navmap on this device, for your personal use: {list}',
    '⚠ Aus Little Navmap auf diesem Gerät gelesen, für Ihren persönlichen Gebrauch: {list}',
    '⚠ Leída de Little Navmap en este equipo, para su uso personal: {list}'
  ],
  procLnmFlag: ['⚠ Little Navmap', '⚠ Little Navmap', '⚠ Little Navmap', '⚠ Little Navmap'],
  // SOG-0232 (l'utilisateur, 10 nov. : « oui, ajouter les approches en doute, mais avec un panonceau ») : une approche dont la lecture est
  // douteuse est listée, marquée, sa raison en infobulle ; jamais prise par un choix automatique
  procDoubt: ['à vérifier', 'to check', 'zu prüfen', 'a comprobar'],
  // les motifs d'un doute (aerodb, liste fermée de tools/proc_geometry.py DOUBT_CODES)
  doubtWhy: {
    unread: ['lignes de la table de codage non lues', 'rows of the coding table not read', 'Zeilen der Codiertabelle nicht gelesen',
      'filas de la tabla de codificación no leídas'
    ],
    name: ['sans nom', 'without a name', 'ohne Namen', 'sin nombre'],
    repeat: ['point répété hors attente', 'point repeated outside a hold', 'Punkt außerhalb einer Warteschleife wiederholt',
      'punto repetido fuera de una espera'
    ],
    zigzag: ['tracé en zigzag', 'zigzag track', 'Zickzack-Verlauf', 'trazado en zigzag'],
    unresolved: ['points sans position', 'points without a position', 'Punkte ohne Position', 'puntos sin posición'],
    'rf-arc': ['branche en arc RF : tracé en cours', 'RF arc leg: drawing in progress', 'RF-Bogen: Darstellung in Arbeit',
      'tramo en arco RF: trazado en curso'
    ],
    geometry: ['cap ou distance imprimés en désaccord avec les positions', 'printed course or distance at odds with the positions',
      'gedruckter Kurs oder Abstand passt nicht zu den Positionen', 'rumbo o distancia impresos en desacuerdo con las posiciones'
    ]
  },
  // les approches que l'AIP ne donne qu'en carte (sans table de codage : conventionnelles, ILS de LFST), avec leur carte
  procChartOnly: ['Carte seulement dans l’AIP', 'Chart only in the AIP', 'Nur als Karte im AIP', 'Solo carta en el AIP'],
  // procédure lue sous un cycle passé : le seul symbole ⌛ en fin de libellé (PROC_OLD), ce texte en infobulle
  procOutdatedTitle: ['Lue sous un cycle antérieur : à relire', 'Read under an earlier cycle: to read again',
    'Unter einem früheren Zyklus gelesen: neu lesen', 'Leído en un ciclo anterior: volver a leer'
  ],
  // procédures non lues sur la page de la source (§ 10.26) : fiches douteuses jamais montrées comme bonnes
  procUnread1: ['{n} procédure non lue sur cette page', '{n} procedure not read on this page',
    '{n} Verfahren auf dieser Seite nicht gelesen',
    '{n} procedimiento sin leer en esta página'
  ],
  procUnread: ['{n} procédures non lues sur cette page', '{n} procedures not read on this page',
    '{n} Verfahren auf dieser Seite nicht gelesen',
    '{n} procedimientos sin leer en esta página'
  ],
  procNoData: ['aucune procédure publiée', 'no published procedure', 'kein veröffentlichtes Verfahren', 'ningún procedimiento publicado'],
  // l'aide de l'approche choisie quand la base la porte (SOG-0176) : « ILS 25 · DO 109.35 · axe 246° » (· DME) ; rien sans elle
  appAid: ['{type} {rwy} · {id} {freq} · axe {axis}°', '{type} {rwy} · {id} {freq} · course {axis}°',
    '{type} {rwy} · {id} {freq} · Kurs {axis}°',
    '{type} {rwy} · {id} {freq} · eje {axis}°'
  ],
  // SOG-0157 : le bouton de lecture d'un État lisible à la demande (eAIP du SIA, EAD Basic)
  procReadDemand: ['Lire à la demande', 'Read on demand', 'Auf Anfrage lesen', 'Leer bajo demanda'],
  // SOG-0248 : les approches que l'AIP ne donne qu'en carte, une ligne chacune ; une finale seule nommée ; « aucune » seulement si c'est vrai
  procChartOnlyOne: ['{name} — carte seulement dans l’AIP', '{name} — chart only in the AIP', '{name} — nur Karte im AIP',
    '{name} — solo carta en el AIP'
  ],
  procChartLink: ['carte', 'chart', 'Karte', 'carta'],
  procFinalOnly: ['finale seule', 'final only', 'nur Endanflug', 'solo tramo final'],
  procNoApp: ['Aucune approche publiée pour ce terrain.', 'No approach published for this aerodrome.',
    'Kein Anflug für diesen Flugplatz veröffentlicht.',
    'Ninguna aproximación publicada para este aeródromo.'
  ],
  // SOG-0090 : la piste probable d'après le METAR, dite, jamais posée d'office
  procRwyProb: ['Piste probable : {rwy} (METAR {at}, vent {dir}/{kt})', 'Probable runway: {rwy} (METAR {at}, wind {dir}/{kt})',
    'Wahrscheinliche Piste: {rwy} (METAR {at}, Wind {dir}/{kt})', 'Pista probable: {rwy} (METAR {at}, viento {dir}/{kt})'
  ],
  // SOG-0090, second lot : la piste en service d'après l'ATIS du réseau du vol (la piste, la lettre, l'heure ; jamais le texte)
  procAtisTake: ['Prendre la piste de l’ATIS', 'Take the ATIS runway', 'Piste der ATIS übernehmen', 'Tomar la pista del ATIS'],
  procAtisTakeOne: ['Prendre {rwy}', 'Take {rwy}', '{rwy} übernehmen', 'Tomar {rwy}'],
  procRwyTake: ['Prendre la piste probable', 'Take the probable runway', 'Wahrscheinliche Piste übernehmen', 'Tomar la pista probable'],
  // SOG-0210 : « Lire depuis Little Navmap » (la base de Little Navmap de CE poste, par le lanceur ; en mémoire de la page seulement)
  procLnmRead: ['Lire depuis Little Navmap', 'Read from Little Navmap', 'Aus Little Navmap lesen', 'Leer desde Little Navmap'],
  procLnmReading: ['Lecture Little Navmap…', 'Reading Little Navmap…', 'Little Navmap wird gelesen…', 'Leyendo Little Navmap…'],
  procLnmPersonal: ['Little Navmap : cochez d\'abord l\'usage personnel dans Données › Sources sous licence personnelle.',
    'Little Navmap: first tick personal use in Data › Personal-licence sources.',
    'Little Navmap: zuerst die persönliche Nutzung in Daten › Quellen mit persönlicher Lizenz ankreuzen.',
    'Little Navmap: marque primero el uso personal en Datos › Fuentes con licencia personal.'
  ],
  procLnmDone: ['{icao} : {n} procédure(s) lue(s) de Little Navmap, sur ce poste seulement.',
    '{icao}: {n} procedure(s) read from Little Navmap, on this device only.',
    '{icao}: {n} Verfahren aus Little Navmap gelesen, nur auf diesem Gerät.',
    '{icao}: {n} procedimiento(s) leído(s) de Little Navmap, solo en este equipo.'
  ],
  // les raisons fermées d'AeroDb.fetchLnm (frame/aerodb/aerodb.js) ; une raison inconnue : « other »
  procLnmWhy: {
    'not-personal': ['{icao} : usage personnel non coché.', '{icao}: personal use not ticked.',
      '{icao}: persönliche Nutzung nicht angekreuzt.',
      '{icao}: uso personal no marcado.'
    ],
    'no-launcher': ['{icao} : Little Navmap se lit par le lanceur de ce poste.',
      '{icao}: Little Navmap is read through this device\'s launcher.',
      '{icao}: Little Navmap wird über den Launcher dieses Geräts gelesen.',
      '{icao}: Little Navmap se lee con el lanzador de este equipo.'
    ],
    paired: ['{icao} : un appareil appairé ne lit pas Little Navmap ; lisez-le sur le poste.',
      '{icao}: a paired device does not read Little Navmap; read it on the workstation.',
      '{icao}: Ein gekoppeltes Gerät liest Little Navmap nicht; lesen Sie es am Arbeitsplatz.',
      '{icao}: un equipo emparejado no lee Little Navmap; léalo en el puesto.'
    ],
    busy: ['{icao} : une lecture de Little Navmap est déjà en cours.', '{icao}: a Little Navmap reading is already running.',
      '{icao}: Eine Little-Navmap-Lesung läuft bereits.', '{icao}: ya hay una lectura de Little Navmap en curso.'
    ],
    'no-lnm': ['{icao} : aucune base de Little Navmap trouvée sur ce poste.', '{icao}: no Little Navmap database found on this device.',
      '{icao}: keine Little-Navmap-Datenbank auf diesem Gerät gefunden.', '{icao}: ninguna base de Little Navmap en este equipo.'
    ],
    'not-found': ['{icao} : terrain absent de la base de Little Navmap.', '{icao}: aerodrome not in the Little Navmap database.',
      '{icao}: Flugplatz nicht in der Little-Navmap-Datenbank.', '{icao}: aeródromo ausente de la base de Little Navmap.'
    ],
    'no-procedures': ['{icao} : Little Navmap n\'a aucune procédure pour ce terrain.',
      '{icao}: Little Navmap has no procedure for this aerodrome.',
      '{icao}: Little Navmap hat kein Verfahren für diesen Flugplatz.',
      '{icao}: Little Navmap no tiene ningún procedimiento para este aeródromo.'
    ],
    cancelled: ['{icao} : lecture de Little Navmap annulée.', '{icao}: Little Navmap reading cancelled.',
      '{icao}: Little-Navmap-Lesung abgebrochen.',
      '{icao}: lectura de Little Navmap cancelada.'
    ],
    other: ['{icao} : Little Navmap n\'a pas pu être lu ({r}).', '{icao}: Little Navmap could not be read ({r}).',
      '{icao}: Little Navmap konnte nicht gelesen werden ({r}).',
      '{icao}: no se pudo leer Little Navmap ({r}).'
    ]
  },
  procRead: ['Lire les procédures de {icao}', 'Read the procedures of {icao}', 'Verfahren von {icao} lesen',
    'Leer los procedimientos de {icao}'
  ],
  // terrain qui a déjà des procédures : la date de la dernière lecture (aerodb coverage().read_at, UTC) et le geste pour le relire
  procFileAt: ['lu le {d}', 'read on {d}', 'gelesen am {d}', 'leído el {d}'],
  procReread: ['Relire', 'Read again', 'Neu lesen', 'Releer'],
  // le mode choix de la Carte (§ 10.23) : le bouton du titre d'un côté
  // la page codée d'une procédure choisie (§ 10.25) : lien public du SIA pour une fiche de l'eAIP
  procSource: ['Source', 'Source', 'Quelle', 'Fuente'],
  // les cartes officielles du terrain (SOG-0024, SOG-0031) : la page de l'aérodrome dans l'AIP de son État, l'adresse d'aerodb (chartsUrl)
  procCharts: ['Toutes les cartes du terrain', 'All the charts of the aerodrome', 'Alle Karten des Flugplatzes',
    'Todas las cartas del aeródromo'
  ],
  // la carte officielle d'une procédure choisie (SOG-0045) : l'adresse d'aerodb (chartUrl) ; {k} : la piste, SID, STAR ou APP
  procChart: ['Carte {k}', 'Chart {k}', 'Karte {k}', 'Carta {k}'],
  procOnMap: ['Choisir sur la carte', 'Choose on the map', 'Auf der Karte wählen', 'Elegir en el mapa'],
  // le vent sur une piste (§ 10.30) : les raisons de l'orange et du rouge, en infobulle de la piste
  procWindTailSome: ['Vent arrière {kt} kt', 'Tail wind {kt} kt', 'Rückenwind {kt} kt', 'Viento de cola {kt} kt'],
  procWindTail: ['Vent arrière {kt} kt (plus de {max} kt)', 'Tail wind {kt} kt (over {max} kt)', 'Rückenwind {kt} kt (über {max} kt)',
    'Viento de cola {kt} kt (más de {max} kt)'
  ],
  procWindCrossOver: ['Travers {kt} kt (plus de {max} kt)', 'Crosswind {kt} kt (over {max} kt)', 'Seitenwind {kt} kt (über {max} kt)',
    'Viento cruzado {kt} kt (más de {max} kt)'
  ],
  procWindCross: ['Travers {kt} kt, au-delà de la limite de la fiche ({max} kt)', 'Crosswind {kt} kt, over the sheet’s limit ({max} kt)',
    'Seitenwind {kt} kt, über der Grenze des Datenblatts ({max} kt)',
    'Viento cruzado {kt} kt, por encima del límite de la ficha ({max} kt)'
  ],
  // une lecture peut durer plusieurs minutes : son départ est dit, sa fin le sera aussi (même hors de Carburant)
  procStarted: ['Lecture de {icao} lancée : une notification dira la fin.',
    'Reading {icao} started: a notification will say when it ends.',
    'Lesen von {icao} gestartet: eine Meldung sagt, wann es endet.', 'Lectura de {icao} iniciada: una notificación dirá cuándo termina.'
  ],
  procWarnings: [' {n} avertissements.', ' {n} warnings.', ' {n} Warnungen.', ' {n} advertencias.'],
  // SOG-0203 : les avertissements de la dernière lecture d'un terrain, dits en texte sous sa ligne (un pli), pas seulement comptés
  procWarnList: ['Avertissements de la lecture ({n})', 'Warnings of the reading ({n})', 'Warnungen der Lesung ({n})',
    'Advertencias de la lectura ({n})'
  ],
  procReading: ['Lecture de {icao}…', 'Reading {icao}…', '{icao} wird gelesen…', 'Leyendo {icao}…'],
  // la lecture du sol d'un terrain sur sa ligne discrète (AeroDb.groundStatus) : les MÊMES mots que le panneau Sol de la Carte
  // (modules/maps/texts.js gReading, gFailed, gWhy, gRetry ; accord avec BUGS SOG, cas F124 qui compare les deux tables)
  groundReading: ['Lecture du sol en cours…', 'Reading the ground…', 'Boden wird gelesen…', 'Leyendo el suelo…'],
  groundOk: ['Sol lu', 'Ground read', 'Boden gelesen', 'Suelo leído'],
  groundFailed: ['Sol non lu : {r}', 'Ground not read: {r}', 'Boden nicht gelesen: {r}', 'Suelo no leído: {r}'],
  groundRetry: ['Réessayer', 'Try again', 'Erneut versuchen', 'Reintentar'],
  groundWhy: {
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
  // lecture en cours selon la source qu'aerodb annonce (onProgress source) : la France par l'eAIP du SIA, un État à tables par EAD
  procReadingSrc: {
    eaip: ['Lecture de l’eAIP du SIA…', 'Reading the SIA eAIP…', 'eAIP des SIA wird gelesen…', 'Leyendo el eAIP del SIA…'],
    ead: ['Lecture d’EAD Basic…', 'Reading EAD Basic…', 'EAD Basic wird gelesen…', 'Leyendo EAD Basic…']
  },
  // le pays d'un refus « no-tables » (SOG-0210 : le message prenait le terrain pour un État)
  procState: [' (pays : {s})', ' (country: {s})', ' (Land: {s})', ' (país: {s})'],
  // ajouté au refus « no-tables » quand aerodb dit que ce poste a des bases de Little Navmap (lnm: true)
  procLnm: [' Little Navmap a une base sur ce poste.', ' Little Navmap has a database on this workstation.',
    ' Little Navmap hat eine Datenbank auf diesem Arbeitsplatz.', ' Little Navmap tiene una base en este puesto.'
  ],
  // lecture réussie avec les comptes du travail (aerodb stats : pages, rejected, dropped, reasons) ; jamais « 0 procédures » seul
  procFetchedPages: ['{icao} : {n} procédures lues sur {p} pages.{rej}{drop}', '{icao}: {n} procedures read from {p} pages.{rej}{drop}',
    '{icao}: {n} Verfahren aus {p} Seiten gelesen.{rej}{drop}', '{icao}: {n} procedimientos leídos en {p} páginas.{rej}{drop}'
  ],
  procRejected: [' {r} pages non lues (motif le plus fréquent : {why}).', ' {r} pages not read (most frequent reason: {why}).',
    ' {r} Seiten nicht gelesen (häufigster Grund: {why}).', ' {r} páginas no leídas (motivo más frecuente: {why}).'
  ],
  procDropped: [' {d} procédures écartées par le contrôle de géométrie.', ' {d} procedures dropped by the geometry check.',
    ' {d} Verfahren von der Geometrieprüfung verworfen.', ' {d} procedimientos descartados por el control de geometría.'
  ],
  procFetched: ['{icao} : {n} procédures lues.', '{icao}: {n} procedures read.', '{icao}: {n} Verfahren gelesen.',
    '{icao}: {n} procedimientos leídos.'
  ],
  procKinds: {
    rwy: ['piste', 'runway', 'Piste', 'pista'],
    sid: ['SID', 'SID', 'SID', 'SID'],
    trans: ['transition', 'transition', 'Übergang', 'transición'],
    star: ['STAR', 'STAR', 'STAR', 'STAR'],
    app: ['approche', 'approach', 'Anflug', 'aproximación'],
    appTrans: ['transition d’approche', 'approach transition', 'Anflugübergang', 'transición de aproximación']
  },
  procChange: ['{side} : {parts}', '{side}: {parts}', '{side}: {parts}', '{side}: {parts}'],
  // procédure en conflit avec le choix courant (marquée ⚠ en fin de libellé, jamais refusée) : la raison, en infobulle et en notification
  procConflictRwy: ['Ne dessert pas la piste {rwy}', 'Does not serve runway {rwy}', 'Bedient Piste {rwy} nicht',
    'No sirve a la pista {rwy}'
  ],
  procConflictStarApp: ['Ne dessert aucune piste de {app}', 'Serves no runway of {app}', 'Bedient keine Piste von {app}',
    'No sirve a ninguna pista de {app}'
  ],
  procReasons: {
    'bad-icao': ['Code OACI invalide : {icao}.', 'Invalid ICAO code: {icao}.', 'Ungültiger ICAO-Code: {icao}.',
      'Código OACI no válido: {icao}.'
    ],
    'no-launcher': [
      'La lecture se fait sur le poste de travail (pas de lanceur ici). Pour ce vol, chargez votre OFP SimBrief : il apporte la SID et la STAR.',
      'Reading is done on the workstation (no launcher here). For this flight, load your SimBrief OFP: it brings the SID and the STAR.',
      'Das Lesen geschieht am Arbeitsplatz (hier kein Launcher). Laden Sie für diesen Flug Ihren SimBrief-OFP: er liefert SID und STAR.',
      'La lectura se hace en el puesto de trabajo (aquí no hay lanzador). Para este vuelo, cargue su OFP de SimBrief: aporta la SID y la STAR.'
    ],
    paired: [
      'Cet appareil est appairé au poste : la lecture de {icao} se fait sur le poste. Pour ce vol, votre OFP SimBrief apporte la SID et la STAR.',
      'This device is paired with the workstation: {icao} is read on the workstation. For this flight, your SimBrief OFP brings the SID and the STAR.',
      'Dieses Gerät ist mit dem Arbeitsplatz gekoppelt: {icao} wird dort gelesen. Für diesen Flug liefert Ihr SimBrief-OFP SID und STAR.',
      'Este dispositivo está emparejado con el puesto: {icao} se lee en el puesto. Para este vuelo, su OFP de SimBrief aporta la SID y la STAR.'
    ],
    'no-tables': ['Aucune table de procédures publiée pour {icao}{s}.{l}',
      'No procedure tables published for {icao}{s}.{l}',
      'Für {icao} sind keine Verfahrenstabellen veröffentlicht{s}.{l}',
      'No hay tablas de procedimientos publicadas para {icao}{s}.{l}'
    ],
    'no-credentials': ['Les identifiants EAD Basic manquent sur le poste : à régler dans Réglages › Clés du lanceur.',
      'The EAD Basic credentials are missing on the workstation: set them in Settings › Launcher keys.',
      'Die EAD-Basic-Zugangsdaten fehlen am Arbeitsplatz: unter Einstellungen › Launcher-Schlüssel eintragen.',
      'Faltan las credenciales de EAD Basic en el puesto: configúrelas en Ajustes › Claves del lanzador.'
    ],
    'too-soon': ['Patientez {w} s avant la lecture suivante (EAD Basic).', 'Wait {w} s before the next reading (EAD Basic).',
      'Bitte {w} s bis zum nächsten Lesen warten (EAD Basic).', 'Espere {w} s antes de la siguiente lectura (EAD Basic).'
    ],
    busy: ['Une lecture de {icao} est déjà en cours.', 'A reading of {icao} is already running.', 'Das Lesen von {icao} läuft bereits.',
      'Ya hay una lectura de {icao} en curso.'
    ],
    cancelled: ['Lecture de {icao} annulée.', 'Reading of {icao} cancelled.', 'Lesen von {icao} abgebrochen.',
      'Lectura de {icao} cancelada.'
    ],
    failed: ['La lecture de {icao} a échoué{m}.{c}{wn}', 'Reading {icao} failed{m}.{c}{wn}',
      'Das Lesen von {icao} ist fehlgeschlagen{m}.{c}{wn}',
      'La lectura de {icao} ha fallado{m}.{c}{wn}'
    ],
    // le travail a tourné sans rien lire (« no procedure could be read for this aerodrome »)
    'none-read': ['{icao} : aucune procédure lue{m}.{c}{wn}', '{icao}: no procedure read{m}.{c}{wn}',
      '{icao}: kein Verfahren gelesen{m}.{c}{wn}',
      '{icao}: ningún procedimiento leído{m}.{c}{wn}'
    ],
    unavailable: [
      'La lecture à la demande n’est pas encore disponible. Pour ce vol, chargez votre OFP SimBrief : il apporte la SID et la STAR.',
      'Reading on demand is not available yet. For this flight, load your SimBrief OFP: it brings the SID and the STAR.',
      'Das Lesen auf Anfrage ist noch nicht verfügbar. Laden Sie für diesen Flug Ihren SimBrief-OFP: er liefert SID und STAR.',
      'La lectura a demanda aún no está disponible. Para este vuelo, cargue su OFP de SimBrief: aporta la SID y la STAR.'
    ],
    other: ['Lecture de {icao} refusée ({r}).{c}', 'Reading {icao} refused ({r}).{c}', 'Lesen von {icao} abgelehnt ({r}).{c}',
      'Lectura de {icao} rechazada ({r}).{c}'
    ]
  },
  // ligne discrète sous le titre d'un côté : « 3 non lues » (la phrase entière en infobulle : procUnread1 / procUnread)
  procNotRead1: ['{n} non lue', '{n} not read', '{n} nicht gelesen', '{n} sin leer'],
  procNotRead: ['{n} non lues', '{n} not read', '{n} nicht gelesen', '{n} sin leer'],
  // comptes d'une lecture qui a échoué après avoir vu des pages (aerodb stats : pages, read) : « 0 page lue sur 31 »
  procCountRead1: [' {read} page lue sur {pages}.', ' {read} page read of {pages}.', ' {read} Seite von {pages} gelesen.',
    ' {read} página leída de {pages}.'
  ],
  procCountRead: [' {read} pages lues sur {pages}.', ' {read} pages read of {pages}.', ' {read} Seiten von {pages} gelesen.',
    ' {read} páginas leídas de {pages}.'
  ],
  // SOG-0308 (maquette validée, Q-0047) : le bloc en trois lignes, chacune son nom, sa valeur en mots et UN geste « Changer »
  procChangeBtn: ['Changer', 'Change', 'Ändern', 'Cambiar'],
  procCloseBtn: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
  procFoot: ['Source et cartes', 'Source and charts', 'Quelle und Karten', 'Fuente y cartas'],
  procSidRow: ['Départ (SID)', 'Departure (SID)', 'Abflug (SID)', 'Salida (SID)'],
  procStarRow: ['Arrivée (STAR)', 'Arrival (STAR)', 'Ankunft (STAR)', 'Llegada (STAR)'],
  procToChoose: ['à choisir', 'to choose', 'zu wählen', 'por elegir'],
  procRwyWord: ['piste {r}', 'runway {r}', 'Piste {r}', 'pista {r}'],
  procTransWord: ['transition', 'transition', 'Übergang', 'transición'],
  procChartOne: ['Carte', 'Chart', 'Karte', 'Carta'],
  // SOG-0330 : la page de données de la procédure (son tableau), à côté de sa carte dessinée
  procDataOne: ['Données', 'Data', 'Daten', 'Datos'],
  procMarkOk: ['complet', 'complete', 'vollständig', 'completo'],
  procMarkTodo: ['à choisir', 'to choose', 'zu wählen', 'por elegir'],
  procMarkOld: ['procédures périmées', 'outdated procedures', 'veraltete Verfahren', 'procedimientos caducados'],
  procMetarSrc: ['METAR de {at}, {dir}° / {kt} kt', 'METAR of {at}, {dir}° / {kt} kt', 'METAR von {at}, {dir}° / {kt} kt',
    'METAR de las {at}, {dir}° / {kt} kt'
  ],
  procRwyTakeHead: ['Prendre la {rwy} (vent de face)', 'Take {rwy} (headwind)', '{rwy} nehmen (Gegenwind)',
    'Tomar la {rwy} (viento de cara)'
  ],
  procRwyTakeOne: ['Prendre la {rwy}', 'Take {rwy}', '{rwy} nehmen', 'Tomar la {rwy}'],
  // la liste des pistes (SOG-0308, tranche 2 ; SOG-0301) : ce qui distingue une piste, après son vent
  // SOG-0298 / SOG-0308 tranche 3b : une approche choisie par sa seule carte
  procByChart: ['par sa carte : ni tracé ni distance', 'by its chart: no track nor distance', 'nach ihrer Karte: weder Bahn noch Strecke',
    'por su carta: ni trazado ni distancia'
  ],
  procChartGone: ['sa carte n’est plus dans la base', 'its chart is no longer in the database',
    'ihre Karte ist nicht mehr in der Datenbank',
    'su carta ya no está en la base'
  ],
  procRwyBest: ['la mieux orientée', 'best oriented', 'am besten ausgerichtet', 'la mejor orientada'],
  procRwyTailMark: ['vent arrière', 'tailwind', 'Rückenwind', 'viento de cola'],
  procRwyNoSid: ['aucun départ publié', 'no published departure', 'kein veröffentlichter Abflug', 'ninguna salida publicada'],
  procRwyNoStar: ['aucune arrivée publiée', 'no published arrival', 'keine veröffentlichte Ankunft', 'ninguna llegada publicada'],
  // le vent d'une piste en mots (plus de flèche seule ni de couleur seule : le mot d'abord)
  windHead: ['face {kt} kt', 'headwind {kt} kt', 'Gegenwind {kt} kt', 'de cara {kt} kt'],
  windTail: ['arrière {kt} kt', 'tailwind {kt} kt', 'Rückenwind {kt} kt', 'de cola {kt} kt'],
  windCross: ['travers {kt} kt', 'crosswind {kt} kt', 'Seitenwind {kt} kt', 'cruzado {kt} kt'],
  windCalm: ['vent nul', 'calm', 'windstill', 'calma'],
  // SOG-0325 : la ligne « Terrain » de l'arrivée
  procTerrain: ['Terrain', 'Aerodrome', 'Flugplatz', 'Aeródromo'],
  procElev: ['Altitude {e} ft', 'Elevation {e} ft', 'Höhe {e} ft', 'Altitud {e} ft'],
  procQnhAtis: ['QNH {q} (ATIS {net} {letter})', 'QNH {q} (ATIS {net} {letter})', 'QNH {q} (ATIS {net} {letter})',
    'QNH {q} (ATIS {net} {letter})'
  ],
  procQnhMetar: ['QNH {q} (METAR de {at})', 'QNH {q} (METAR of {at})', 'QNH {q} (METAR von {at})', 'QNH {q} (METAR de las {at})'],
  procQnhUnknown: ['QNH inconnu', 'QNH unknown', 'QNH unbekannt', 'QNH desconocido'],
  procMetarAt: ['{h} h {m} Z', '{h}:{m}Z', '{h}:{m} Z', '{h}:{m} Z']
};
