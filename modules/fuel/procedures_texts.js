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
  procRead: ['Lire les procédures de {icao}', 'Read the procedures of {icao}', 'Verfahren von {icao} lesen',
    'Leer los procedimientos de {icao}'
  ],
  // terrain qui a déjà des procédures : la date de la dernière lecture (aerodb coverage().read_at, UTC) et le geste pour le relire
  procFileAt: ['lu le {d}', 'read on {d}', 'gelesen am {d}', 'leído el {d}'],
  procReread: ['Relire', 'Read again', 'Neu lesen', 'Releer'],
  // le mode choix de la Carte (§ 10.23) : le bouton du titre d'un côté
  // la page codée d'une procédure choisie (§ 10.25) : lien public du SIA pour une fiche de l'eAIP
  procSource: ['Source', 'Source', 'Quelle', 'Fuente'],
  procOnMap: ['Sur la carte', 'On the map', 'Auf der Karte', 'En el mapa'],
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
  procReading: ['Lecture de {icao}…', 'Reading {icao}…', '{icao} wird gelesen…', 'Leyendo {icao}…'],
  // lecture en cours selon la source qu'aerodb annonce (onProgress source) : la France par l'eAIP du SIA, un État à tables par EAD
  procReadingSrc: {
    eaip: ['Lecture de l’eAIP du SIA…', 'Reading the SIA eAIP…', 'eAIP des SIA wird gelesen…', 'Leyendo el eAIP del SIA…'],
    ead: ['Lecture d’EAD Basic…', 'Reading EAD Basic…', 'EAD Basic wird gelesen…', 'Leyendo EAD Basic…']
  },
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
    'no-tables': ['Aucune table de procédures publiée pour cet État ({icao}).{l}',
      'No procedure tables published for this State ({icao}).{l}',
      'Für diesen Staat sind keine Verfahrenstabellen veröffentlicht ({icao}).{l}',
      'No hay tablas de procedimientos publicadas para este Estado ({icao}).{l}'
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
  ]
};
