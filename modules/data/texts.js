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
  // une base dont aucune zone nourrie n'a de source datée (AeroDB lot C, SOG-0026) : sa date de construction, jamais « dépassée »
  datedOn: ['Datée du {d}', 'Dated {d}', 'Datiert vom {d}', 'Fechada el {d}'],
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
    country: [
      ['pays', 'country', 'Land', 'país'],
      ['pays', 'countries', 'Länder', 'países']
    ],
    book: [
      ['classeur', 'workbook', 'Arbeitsmappe', 'libro'],
      ['classeurs', 'workbooks', 'Arbeitsmappen', 'libros']
    ],
    aerodrome: [
      ['terrain', 'aerodrome', 'Flugplatz', 'aeródromo'],
      ['terrains', 'aerodromes', 'Flugplätze', 'aeródromos']
    ],
    aerodromeRead: [
      ['terrain relu', 'aerodrome read', 'Flugplatz gelesen', 'aeródromo leído'],
      ['terrains relus', 'aerodromes read', 'Flugplätze gelesen', 'aeródromos leídos']
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
    partial: ['En partie à jour', 'Partly up to date', 'Teilweise aktuell', 'En parte al día'],
    'stale-cycle': ['Cycle dépassé', 'Cycle out of date', 'Zyklus überholt', 'Ciclo superado'],
    'stale-age': ['Plus de 28 jours', 'Over 28 days old', 'Über 28 Tage alt', 'Más de 28 días'],
    parser: ['Parseur ancien', 'Old parser', 'Alter Parser', 'Analizador antiguo'],
    outdated: ['Périmé', 'Outdated', 'Veraltet', 'Caducado'],
    absent: ['Absent du dépôt', 'Not in the repository', 'Nicht im Repository', 'Ausente del repositorio'],
    ok: ['À jour', 'Up to date', 'Aktuell', 'Al día']
  },
  // les points VFR aux cycles mélangés (SOG-0191) : « en partie à jour : 28 en 2611, 390 en 2610 »
  partial: {
    line: ['en partie à jour : {parts}', 'partly up to date: {parts}', 'teilweise aktuell: {parts}', 'en parte al día: {parts}'],
    part: ['{n} en {c}', '{n} in {c}', '{n} in {c}', '{n} en {c}'],
    unknown: ['{n} de cycle inconnu', '{n} of unknown cycle', '{n} mit unbekanntem Zyklus', '{n} de ciclo desconocido']
  },
  // « Choisir le fichier… » (SOG-0199) : l'envoi d'un fichier choisi au lanceur, qui le reconnaît par son contenu
  up: {
    choose: ['Choisir le fichier…', 'Choose the file…', 'Datei wählen…', 'Elegir el archivo…'],
    cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    // la FAA refuse le téléchargement automatique (HTTP 403) : le repli par fichiers choisis à la main (SOG-0180 ; les trois jeux du NASR, que le lanceur reconnaît)
    nasr: [
      'La FAA refuse le téléchargement automatique : prenez les trois jeux du cycle (FIX, AWY, NAV) sur {l}, puis « Choisir le fichier… » pour chacun.',
      'The FAA refuses the automatic download: take the three sets of the cycle (FIX, AWY, NAV) from {l}, then “Choose the file…” for each.',
      'Die FAA verweigert das automatische Herunterladen: holen Sie die drei Datensätze des Zyklus (FIX, AWY, NAV) von {l}, dann für jeden „Datei wählen…“.',
      'La FAA rechaza la descarga automática: tome los tres conjuntos del ciclo (FIX, AWY, NAV) de {l}, luego «Elegir el archivo…» para cada uno.'
    ],
    nasrWait: ['NASR de la FAA : reçu {h}, il manque {m}.', 'FAA NASR: received {h}, {m} still missing.',
      'NASR der FAA: erhalten {h}, es fehlt {m}.', 'NASR de la FAA: recibido {h}, falta {m}.'
    ],
    // un classeur EUROCONTROL (RAD, points FRA) reconnu à son contenu : pas de zone, l'import de la ligne Route suit (SOG-0237)
    doneRoute: ['{name} reconnu : {s}. L’import suit.', '{name} recognised: {s}. The import follows.',
      '{name} erkannt: {s}. Der Import folgt.', '{name} reconocido: {s}. La importación sigue.'
    ],
    nasrPage: ['la page des abonnements NASR', 'the NASR subscription page', 'der NASR-Abonnementseite',
      'la página de suscripciones del NASR'
    ],
    running: ['{name} : {p} %', '{name}: {p} %', '{name}: {p} %', '{name}: {p} %'],
    done: ['{name} reconnu : {s}, {z}. La prise suit.', '{name} recognised: {s}, {z}. The pickup follows.',
      '{name} erkannt: {s}, {z}. Die Übernahme folgt.', '{name} reconocido: {s}, {z}. La toma sigue.'
    ],
    same: ['{name} est déjà là : rien n’est réécrit ({s}, {z}).', '{name} is already there: nothing is rewritten ({s}, {z}).',
      '{name} ist schon da: nichts wird neu geschrieben ({s}, {z}).', '{name} ya está: no se reescribe nada ({s}, {z}).'
    ],
    aborted: ['Envoi annulé.', 'Upload cancelled.', 'Senden abgebrochen.', 'Envío cancelado.'],
    offline: ['Le lanceur ne répond pas : l’envoi n’a pas abouti.', 'The launcher does not answer: the upload did not complete.',
      'Der Launcher antwortet nicht: das Senden ist nicht gelungen.', 'El lanzador no responde: el envío no se completó.'
    ],
    unknownRoute: ['Ce lanceur ne connaît pas encore l’envoi : relancez-le avec la dernière version.',
      'This launcher does not know uploads yet: restart it with the latest version.',
      'Dieser Launcher kennt das Senden noch nicht: Starten Sie ihn mit der neuesten Version neu.',
      'Este lanzador aún no conoce el envío: reinícielo con la última versión.'
    ],
    failed: ['L’envoi a échoué.', 'The upload failed.', 'Das Senden ist fehlgeschlagen.', 'El envío falló.'],
    why: {
      'too-large': ['Fichier trop gros : 1,5 Go au plus.', 'File too large: 1.5 GB at most.', 'Datei zu groß: höchstens 1,5 GB.',
        'Archivo demasiado grande: 1,5 GB como máximo.'
      ],
      empty: ['Fichier vide.', 'Empty file.', 'Leere Datei.', 'Archivo vacío.'],
      type: ['Ni zip, ni xml, ni pdf, ni xlsx : ce n’est pas un fichier de source.',
        'Not a zip, xml, pdf or xlsx: this is not a source file.', 'Weder Zip, XML, PDF noch XLSX: das ist keine Quelldatei.',
        'Ni zip, ni xml, ni pdf, ni xlsx: no es un archivo de fuente.'
      ],
      unrecognised: ['Ce fichier ne ressemble à aucune source prise ici. Sources prises par l’envoi : {s}.',
        'This file looks like no source taken here. Sources the upload takes: {s}.',
        'Diese Datei gleicht keiner hier übernommenen Quelle. Quellen, die das Senden übernimmt: {s}.',
        'Este archivo no se parece a ninguna fuente tomada aquí. Fuentes que toma el envío: {s}.'
      ],
      busy: ['Le lanceur a un autre travail en cours : réessayez quand il aura fini.',
        'The launcher is busy with another job: try again when it is over.',
        'Der Launcher hat einen anderen Auftrag: versuchen Sie es nach dessen Ende erneut.',
        'El lanzador está ocupado con otro trabajo: reinténtelo cuando termine.'
      ],
      'merge-pending': ['Une fusion est en attente dans data/ : terminez-la d’abord.', 'A merge is pending in data/: finish it first.',
        'In data/ steht eine Zusammenführung an: schließen Sie sie zuerst ab.', 'Hay una fusión pendiente en data/: termínela primero.'
      ],
      disk: ['Le disque du poste est plein ou illisible.', 'The workstation’s disk is full or unreadable.',
        'Die Festplatte des Rechners ist voll oder nicht lesbar.', 'El disco del equipo está lleno o ilegible.'
      ],
      refused: ['Le lanceur refuse l’envoi depuis un appareil du réseau local.',
        'The launcher refuses uploads from a local-network device.',
        'Der Launcher lehnt das Senden von einem Gerät im lokalen Netz ab.',
        'El lanzador rechaza el envío desde un dispositivo de la red local.'
      ]
    }
  },
  // le pas-à-pas d'une source qu'on dépose soi-même (SOG-0189, AeroCatalogue.stepsOf), sur la ligne de la zone qui l'attend
  steps: {
    page: ['Ouvrez {l}', 'Open {l}', 'Öffnen Sie {l}', 'Abra {l}'],
    pageName: ['la page de la source', 'the source page', 'die Seite der Quelle', 'la página de la fuente'],
    home: ['(si ce lien ne répond plus : {l})', '(if this link no longer answers: {l})', '(wenn dieser Link nicht mehr antwortet: {l})',
      '(si este enlace ya no responde: {l})'
    ],
    homeName: ['la page d’accueil du site', 'the site’s home page', 'die Startseite der Webseite', 'la página de inicio del sitio'],
    file: ['Téléchargez {f}', 'Download {f}', 'Laden Sie {f} herunter', 'Descargue {f}'],
    then: ['Puis touchez le bouton « Prendre le fichier téléchargé ».', 'Then touch the “Take the downloaded file” button.',
      'Tippen Sie dann auf „Heruntergeladene Datei übernehmen“.', 'Luego toque el botón «Tomar el archivo descargado».'
    ]
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
  buildTitle: ['Mettre à jour la base', 'Update the base', 'Basis aktualisieren',
    'Actualizar la base'
  ], // « Mettre à jour » est l'action principale du panneau (SOG-0071 temps 3), le titre le dit (SOG-0168)
  zonesTitle: ['Zones de la couverture ({n})', 'Zones of the coverage ({n})', 'Zonen der Abdeckung ({n})', 'Zonas de la cobertura ({n})'],
  buildZones: ['Zones concernées', 'Zones affected', 'Betroffene Zonen', 'Zonas afectadas'],
  personalTitle: ['Sources sous licence personnelle', 'Personal-licence sources', 'Quellen mit persönlicher Lizenz',
    'Fuentes con licencia personal'
  ],
  // SOG-0162 : UNE coche à la place d'une case par source ; cochée, toutes les sources à usage personnel des zones cochées sont lues
  certify: ['Je certifie utiliser les données pour mon usage personnel', 'I certify that I use the data for my personal use',
    'Ich bestätige, die Daten für meinen persönlichen Gebrauch zu nutzen',
    'Certifico que uso los datos para mi uso personal'
  ],
  certifyHint: [
    'Cochée, les sources ci-dessous sont lues par la construction, et une zone construite avec l’une d’elles est publiée dans VOTRE dépôt de données ; ce qui est propriétaire (X-Plane, EUROCONTROL) reste lu sur ce poste seulement : jamais publié, jamais exporté, coche ou non.',
    'Ticked, the sources below are read by the build, and a zone built with one of them is published in YOUR data repository; what is proprietary (X-Plane, EUROCONTROL) is read on this workstation only: never published, never exported, ticked or not.',
    'Angekreuzt, werden die Quellen unten vom Aufbau gelesen, und eine damit aufgebaute Zone wird in IHREM Datenrepository veröffentlicht; was proprietär ist (X-Plane, EUROCONTROL), wird nur auf diesem Rechner gelesen: nie veröffentlicht, nie exportiert, mit oder ohne Häkchen.',
    'Marcada, la construcción lee las fuentes de abajo, y una zona construida con una de ellas se publica en SU repositorio de datos; lo que es propietario (X-Plane, EUROCONTROL) se lee solo en este puesto: nunca publicado ni exportado, con o sin marca.'
  ],
  licencesLink: ['Sources et licences', 'Sources and licences', 'Quellen und Lizenzen', 'Fuentes y licencias'],
  personalName: {
    airnav: ['AirNav Ireland (AIP Irlande)', 'AirNav Ireland (Ireland AIP)', 'AirNav Ireland (AIP Irland)',
      'AirNav Ireland (AIP Irlanda)'
    ],
    enaire: ['ENAIRE (AIP Espagne)', 'ENAIRE (Spain AIP)', 'ENAIRE (AIP Spanien)', 'ENAIRE (AIP España)'],
    lfv: ['LFV (AIP Suède)', 'LFV (Sweden AIP)', 'LFV (AIP Schweden)', 'LFV (AIP Suecia)'],
    nats: ['NATS (AIP Royaume-Uni)', 'NATS (UK AIP)', 'NATS (AIP Vereinigtes Königreich)', 'NATS (AIP Reino Unido)'],
    xplane: ['X-Plane (données du simulateur)', 'X-Plane (simulator data)', 'X-Plane (Simulatordaten)', 'X-Plane (datos del simulador)']
  },
  // l'état par zone que dit le lanceur (base/status) et ses raisons, par code (frame/aerodb/INTEGRATION.md « The state per zone ») : les paramètres entre accolades
  zst: {
    'up-to-date': ['À jour', 'Up to date', 'Aktuell', 'Al día'],
    stale: ['À reconstruire', 'To rebuild', 'Neu zu bauen', 'Por reconstruir'],
    'never-built': ['Jamais construite', 'Never built', 'Noch nie erstellt', 'Nunca construida'],
    failed: ['En échec', 'Failed', 'Fehlgeschlagen', 'Fallida'],
    building: ['En cours', 'Running', 'Läuft', 'En curso']
  },
  // le bilan en une ligne sous « Mettre à jour » (SOG-0180) : chaque nombre est un bouton qui n'affiche que ses zones
  // la ligne qui suit un nombre du bilan touché (SOG-0228) : ce que sont les zones montrées et quoi faire
  balLine: {
    rebuild: ['{n} zone(s) à reconstruire, cochée(s) ci-dessous : « Mettre à jour » s’en charge.',
      '{n} zone(s) to rebuild, ticked below: “Update” takes care of it.',
      '{n} Zone(n) neu zu bauen, unten angekreuzt: „Aktualisieren“ übernimmt das.',
      '{n} zona(s) por reconstruir, marcada(s) abajo: «Actualizar» se encarga.'
    ],
    failed: ['{n} zone(s) en échec, cochée(s) ci-dessous : « Mettre à jour » s’en charge.',
      '{n} zone(s) failed, ticked below: “Update” takes care of it.',
      '{n} Zone(n) fehlgeschlagen, unten angekreuzt: „Aktualisieren“ übernimmt das.',
      '{n} zona(s) con fallo, marcada(s) abajo: «Actualizar» se encarga.'
    ],
    waiting: ['{n} zone(s) en attente d’un fichier : « Prendre le fichier téléchargé » est sur chaque ligne.',
      '{n} zone(s) waiting for a file: “Take the downloaded file” is on each line.',
      '{n} Zone(n) mit ausstehender Datei: „Heruntergeladene Datei übernehmen“ steht in jeder Zeile.',
      '{n} zona(s) a la espera de un archivo: «Tomar el archivo descargado» está en cada línea.'
    ],
    upToDate: ['{n} zone(s) à jour.', '{n} zone(s) up to date.', '{n} Zone(n) aktuell.', '{n} zona(s) al día.']
  },
  // ce que compte le nombre de « Zones de la couverture (n) » (SOG-0228) : les zones que la base couvre sur ce poste, sur celles que la suite connaît
  zonesNote: ['Les zones que la base couvre sur ce poste : {n} sur les {m} que la suite connaît.',
    'The zones the base covers on this workstation: {n} of the {m} the suite knows.',
    'Die Zonen, die die Basis auf diesem Rechner abdeckt: {n} von den {m}, die die Suite kennt.',
    'Las zonas que la base cubre en este equipo: {n} de las {m} que conoce la suite.'
  ],
  bal: {
    upToDate: [
      ['{n} à jour', '{n} up to date', '{n} aktuell', '{n} al día'],
      ['{n} à jour', '{n} up to date', '{n} aktuell', '{n} al día']
    ],
    rebuild: [
      ['{n} à reconstruire', '{n} to rebuild', '{n} neu zu bauen', '{n} por reconstruir'],
      ['{n} à reconstruire', '{n} to rebuild', '{n} neu zu bauen', '{n} por reconstruir']
    ],
    failed: [
      ['{n} en échec', '{n} failed', '{n} fehlgeschlagen', '{n} fallida'],
      ['{n} en échec', '{n} failed', '{n} fehlgeschlagen', '{n} fallidas']
    ],
    waiting: [
      ['{n} attend un fichier', '{n} waits for a file', '{n} wartet auf eine Datei', '{n} espera un archivo'],
      ['{n} attendent un fichier', '{n} wait for a file', '{n} warten auf eine Datei', '{n} esperan un archivo']
    ]
  },
  balShowAll: ['Tout afficher', 'Show all', 'Alle anzeigen', 'Mostrar todo'],
  zr: {
    'never-built': ['Jamais construite', 'Never built', 'Noch nie erstellt', 'Nunca construida'],
    failed: ['Dernière construction en échec', 'Last build failed', 'Letzter Build fehlgeschlagen', 'La última construcción falló'],
    'pickup-waiting': ['{set} {cycle} dans Téléchargements, non repris', '{set} {cycle} in Downloads, not taken yet',
      '{set} {cycle} in Downloads, noch nicht übernommen', '{set} {cycle} en Descargas, sin tomar'
    ],
    'source-newer': ['Source {source} du {cycle} plus récente que la construction du {built}',
      '{source} source of {cycle} newer than the build of {built}', 'Quelle {source} vom {cycle} neuer als der Build vom {built}',
      'Fuente {source} del {cycle} más reciente que la construcción del {built}'
    ],
    'inputs-changed': ['{count} fichier(s) source modifié(s) depuis la construction', '{count} source file(s) changed since the build',
      '{count} Quelldatei(en) seit dem Build geändert', '{count} archivo(s) fuente modificado(s) desde la construcción'
    ],
    'parser-old': ['Construite avec un ancien analyseur (v{built}, actuel v{current})',
      'Built with an older parser (v{built}, current v{current})', 'Mit einem älteren Parser erstellt (v{built}, aktuell v{current})',
      'Construida con un analizador antiguo (v{built}, actual v{current})'
    ],
    'files-missing': ['{count} fichier(s) manquant(s)', '{count} file(s) missing', '{count} Datei(en) fehlen',
      'faltan {count} archivo(s)'
    ],
    'source-old': ['Source {source} du {cycle}, cycle en vigueur {current} : un fichier plus récent est à déposer',
      '{source} source of {cycle}, cycle in force {current}: a newer file is to be dropped',
      'Quelle {source} vom {cycle}, gültiger Zyklus {current}: neuere Datei ablegen',
      'Fuente {source} del {cycle}, ciclo vigente {current}: falta un archivo más reciente'
    ],
    'index-orphan': ['Fichier du cycle {cycle} déclaré mais absent ({count}) : reconstruire',
      'File of cycle {cycle} declared but absent ({count}): rebuild',
      'Datei des Zyklus {cycle} angegeben, aber nicht vorhanden ({count}): neu erstellen',
      'Archivo del ciclo {cycle} declarado pero ausente ({count}): reconstruir'
    ],
    'source-unbuilt': ['Construite sans points ni voies, le fichier {source} est là : reconstruire',
      'Built without points or airways, the {source} file is there: rebuild',
      'Ohne Punkte und Strecken erstellt, die {source}-Datei ist da: neu erstellen',
      'Construida sin puntos ni aerovías, el archivo {source} está: reconstruir'
    ],
    'source-unread': [
      'Construite sans points ni voies : le fichier {source} est là mais la coche « Je certifie utiliser les données pour mon usage personnel » n’est pas cochée : cochez-la, puis « Mettre à jour »',
      'Built without points or airways: the {source} file is there but the “I certify that I use the data for my personal use” box is not ticked: tick it, then “Update”',
      'Ohne Punkte und Strecken erstellt: die {source}-Datei ist da, aber „Ich bestätige, die Daten für meinen persönlichen Gebrauch zu nutzen“ ist nicht angekreuzt: ankreuzen, dann „Aktualisieren“',
      'Construida sin puntos ni aerovías: el archivo {source} está pero la casilla «Certifico que uso los datos para mi uso personal» no está marcada: márquela y luego «Actualizar»'
    ],
    'source-missing': ['Construite sans points ni voies : le fichier {source} manque',
      'Built without points or airways: the {source} file is missing', 'Ohne Punkte und Strecken erstellt: die {source}-Datei fehlt',
      'Construida sin puntos ni aerovías: falta el archivo {source}'
    ],
    'no-points': ['Zone sans points ni voies : la source ne les porte pas (openAIP)',
      'Zone without points or airways: the source does not carry them (openAIP)',
      'Zone ohne Punkte und Strecken: die Quelle enthält sie nicht (openAIP)',
      'Zona sin puntos ni aerovías: la fuente no los incluye (openAIP)'
    ],
    unknown: ['Raison non reconnue', 'Unrecognised reason', 'Unbekannter Grund', 'Motivo no reconocido']
  },
  // « Mettre à jour » et les gestes de sélection de la base (update.js, SOG-0071)
  upd: {
    update: ['Mettre à jour', 'Update', 'Aktualisieren', 'Actualizar'],
    updatePack: ['Mettre à jour ({n})', 'Update ({n})', 'Aktualisieren ({n})', 'Actualizar ({n})'],
    more: ['Détail', 'Detail', 'Details', 'Detalle'],
    recompute: ['Tout recalculer', 'Rebuild all', 'Alles neu berechnen', 'Recalcular todo'],
    selStale: ['Seulement les périmés', 'Only the stale ones', 'Nur die veralteten', 'Solo las caducadas'],
    retry: ['Réessayer', 'Try again', 'Erneut versuchen', 'Reintentar'],
    // la ligne d'avant le départ (SOG-0180) : ce que « Mettre à jour » va faire, chaque part dite seulement si elle n'est pas vide
    planDl: ['{z} à télécharger', '{z} to download', '{z} herunterzuladen', '{z} por descargar'],
    planBuild: ['{z} à reconstruire', '{z} to rebuild', '{z} neu zu erstellen', '{z} por reconstruir'],
    planOk: ['{z} déjà à jour', '{z} already up to date', '{z} bereits aktuell', '{z} ya al día'],
    planWait: ['{z} en attente d’un fichier', '{z} waiting for a file', '{z} mit ausstehender Datei', '{z} a la espera de un archivo'],
    selNone: ['Tout désélectionner', 'Deselect all', 'Alles abwählen', 'Deseleccionar todo'],
    selLine: ['Sélection : {z}', 'Selection: {z}', 'Auswahl: {z}', 'Selección: {z}'],
    selNothing: ['Aucune zone cochée', 'No zone ticked', 'Keine Zone angekreuzt', 'Ninguna zona marcada'],
    noStale: ['Aucune zone périmée : la sélection reste telle quelle.', 'No stale zone: the selection stays as it is.',
      'Keine veraltete Zone: die Auswahl bleibt unverändert.', 'Ninguna zona caducada: la selección se queda como está.'
    ],
    none: ['Rien à reconstruire : les {n} cochées sont à jour',
      'Nothing to rebuild: the {n} ticked are up to date',
      'Nichts neu zu bauen: die {n} angekreuzten sind aktuell',
      'Nada que reconstruir: las {n} marcadas están al día'
    ],
    // des zones cochées dont le lanceur n'a donné aucun état : ni à jour ni périmées, dites à part (jamais comptées à jour)
    noState: ['{n} sans état donné par le lanceur.', '{n} without a state from the launcher.', '{n} ohne Zustand vom Starter.',
      '{n} sin estado dado por el lanzador.'
    ],
    ask: ['Mettre à jour : reconstruire {n} des {t} zones cochées ({s}). {l}', 'Update: rebuild {n} of the {t} ticked zones ({s}). {l}',
      'Aktualisieren: {n} der {t} angekreuzten Zonen neu bauen ({s}). {l}',
      'Actualizar: reconstruir {n} de las {t} zonas marcadas ({s}). {l}'
    ],
    noStatus: ['L’état des zones n’a pas pu être lu au lanceur : rien n’est reconstruit.',
      'The state of the zones could not be read from the launcher: nothing is rebuilt.',
      'Der Zustand der Zonen konnte nicht vom Starter gelesen werden: nichts wird neu gebaut.',
      'No se pudo leer el estado de las zonas en el lanzador: no se reconstruye nada.'
    ],
    whyMany: ['{n} : {r}', '{n}: {r}', '{n}: {r}', '{n}: {r}'],
    waiting: ['{n} ne se construisent pas encore : {z}', '{n} cannot be built yet: {z}', '{n} lassen sich noch nicht bauen: {z}',
      '{n} aún no se pueden construir: {z}'
    ],
    zoneLink: ['{z} : prête à être mise à jour — touchez « Mettre à jour ».', '{z}: ready to update — touch “Update”.',
      '{z}: bereit zur Aktualisierung — „Aktualisieren“ antippen.', '{z}: lista para actualizar — toque «Actualizar».'
    ],
    zoneLinkOut: ['{z} n’est pas dans la couverture : ajoutez-la d’abord (« Ajouter un pays »).',
      '{z} is not in the coverage: add it first (“Add a country”).',
      '{z} ist nicht in der Abdeckung: zuerst hinzufügen („Land hinzufügen“).',
      '{z} no está en la cobertura: añádala primero («Añadir un país»).'
    ],
    long: ['Cela peut être long.', 'This may take a while.', 'Das kann dauern.', 'Esto puede tardar.'],
    sizeUnknown: ['taille inconnue', 'size unknown', 'Größe unbekannt', 'tamaño desconocido'],
    whyNever: ['jamais construite', 'never built', 'nie gebaut', 'nunca construida'],
    whyCycle: ['cycle publié {p}, source {t}', 'published cycle {p}, source {t}', 'veröffentlichter Zyklus {p}, Quelle {t}',
      'ciclo publicado {p}, fuente {t}'
    ],
    rectHint: [
      'Maj + glisser (ordinateur), ou deux doigts posés une demi-seconde (téléphone) : un rectangle coche les zones qu’il touche.',
      'Shift + drag (computer), or two fingers held for half a second (phone): a rectangle ticks the zones it touches.',
      'Umschalt + Ziehen (Computer) oder zwei Finger eine halbe Sekunde halten (Telefon): Ein Rechteck kreuzt die Zonen an, die es berührt.',
      'Mayús + arrastrar (ordenador), o dos dedos apoyados medio segundo (teléfono): un rectángulo marca las zonas que toca.'
    ]
  },
  // les paquets de pays (packs.js, SOG-0065)
  packs: {
    title: ['Paquets de pays', 'Country packs', 'Länderpakete', 'Paquetes de países'],
    regions: ['Régions', 'Regions', 'Regionen', 'Regiones'],
    themes: ['Thèmes', 'Themes', 'Themen', 'Temas'],
    themesHint: ['Cochez un pays pour l’ajouter à la couverture ; décochez-le pour l’en retirer (rien n’est purgé).',
      'Tick a country to add it to the coverage; untick it to remove it (nothing is purged).',
      'Kreuzen Sie ein Land an, um es zur Abdeckung hinzuzufügen; entfernen Sie das Häkchen, um es zu entfernen (nichts wird gelöscht).',
      'Marque un país para añadirlo a la cobertura; desmárquelo para quitarlo (no se purga nada).'
    ],
    countries: ['Pays ({n})', 'Countries ({n})', 'Länder ({n})', 'Países ({n})'],
    themeAll: ['Tout le thème', 'The whole theme', 'Das ganze Thema', 'Todo el tema'],
    inCoverage: ['dans la couverture', 'in the coverage', 'in der Abdeckung', 'en la cobertura'],
    themeCount: ['{n}, {m} à ajouter', '{n}, {m} to add', '{n}, {m} hinzuzufügen', '{n}, {m} por añadir'],
    partial: ['Pays en partie seulement dans ce paquet : {n}', 'Countries only partly in this pack: {n}',
      'Länder nur teilweise in diesem Paket: {n}',
      'Países solo en parte en este paquete: {n}'
    ],
    unknown: ['Pays de ce paquet pas encore dans la suite : {n}', 'Countries of this pack not in the suite yet: {n}',
      'Länder dieses Pakets, die die Suite noch nicht kennt: {n}',
      'Países de este paquete que la suite aún no conoce: {n}'
    ],
    some: ['{n} déjà dans la couverture', '{n} already in the coverage', '{n} schon in der Abdeckung', '{n} ya en la cobertura'],
    remove: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
    removeAsk: [
      'Retirer {n} de la couverture ({p}) : {z}. Elles seront décochées et disparaîtront de la liste de ce poste ; rien n’est purgé, leurs fichiers restent.',
      'Remove {n} from the coverage ({p}): {z}. They will be unticked and leave this workstation’s list; nothing is purged, their files stay.',
      '{n} aus der Abdeckung entfernen ({p}): {z}. Sie werden abgewählt und verschwinden aus der Liste dieses Rechners; nichts wird gelöscht, die Dateien bleiben.',
      'Quitar {n} de la cobertura ({p}): {z}. Se desmarcarán y saldrán de la lista de este puesto; no se purga nada, sus archivos se quedan.'
    ],
    removed: ['{n} retirée(s) de la couverture ({p}) : décochées, rien n’est purgé.',
      '{n} removed from the coverage ({p}): unticked, nothing is purged.',
      '{n} aus der Abdeckung entfernt ({p}): abgewählt, nichts wird gelöscht.',
      '{n} quitada(s) de la cobertura ({p}): desmarcadas, no se purga nada.'
    ],
    added: ['{n} ajoutée(s) à la couverture ({p}) : cochées, rien n’est construit.',
      '{n} added to the coverage ({p}): ticked, nothing is built.',
      '{n} zur Abdeckung hinzugefügt ({p}): angekreuzt, nichts wird gebaut.',
      '{n} añadida(s) a la cobertura ({p}): marcadas, no se construye nada.'
    ],
    emptyWhy: {
      'no-zone': ['aucune zone aujourd’hui', 'no zone today', 'heute keine Zone', 'ninguna zona hoy'],
      'no-zone-no-source': ['aucune zone et aucune source aujourd’hui', 'no zone and no source today', 'heute weder Zone noch Quelle',
        'hoy ni zona ni fuente'
      ],
      'no-source': ['aucune source aujourd’hui', 'no source today', 'heute keine Quelle', 'ninguna fuente hoy'],
      unknown: ['vide', 'empty', 'leer', 'vacío']
    }
  },
  // la ligne « Synoptique monde (GFS) » (world.js, SOG-0138)
  world: {
    name: ['Synoptique monde (GFS)', 'World synoptic (GFS)', 'Welt-Synoptik (GFS)', 'Sinóptico mundial (GFS)'],
    none: ['Aucun synoptique sur ce poste', 'No synoptic on this workstation', 'Keine Synoptik auf diesem Rechner',
      'Ningún sinóptico en este puesto'
    ],
    run: ['run {r}', 'run {r}', 'Lauf {r}', 'pasada {r}'],
    steps: ['{n} étapes', '{n} steps', '{n} Schritte', '{n} pasos'],
    age: ['construit il y a {n} h', 'built {n} h ago', 'vor {n} Std. erstellt', 'construido hace {n} h'],
    ageNow: ['construit à l’instant', 'built just now', 'gerade erstellt', 'construido ahora'],
    state: {
      ok: ['À jour', 'Up to date', 'Aktuell', 'Al día'],
      old: ['Plus de 12 h', 'Over 12 h old', 'Über 12 Std. alt', 'Más de 12 h'],
      absent: ['Absent du poste', 'Not on this workstation', 'Nicht auf diesem Rechner', 'Ausente del puesto']
    },
    hint: [
      'Prévision synoptique mondiale (NOAA GFS 1°, maille de 5°, jusqu’à +72 h) pour la couche mondiale de la carte Atmosphère. Source : NOAA GFS par NOMADS, sans clé (domaine public).',
      'World synoptic forecast (NOAA GFS 1°, 5° mesh, up to +72 h) for the world layer of the Atmosphere map. Source: NOAA GFS through NOMADS, no key (public domain).',
      'Synoptische Weltvorhersage (NOAA GFS 1°, 5°-Gitter, bis +72 Std.) für die Weltebene der Atmosphärenkarte. Quelle: NOAA GFS über NOMADS, ohne Schlüssel (gemeinfrei).',
      'Previsión sinóptica mundial (NOAA GFS 1°, malla de 5°, hasta +72 h) para la capa mundial del mapa de Atmósfera. Fuente: NOAA GFS por NOMADS, sin clave (dominio público).'
    ],
    local: [
      'Publiée localement, sur ce poste (data/weather/world/) : jamais synchronisée ni commitée. Première construction : environ 2 minutes ; si le run est déjà là, quelques secondes.',
      'Published locally, on this workstation (data/weather/world/): never synchronised nor committed. First build: about 2 minutes; if the run is already there, a few seconds.',
      'Lokal auf diesem Rechner veröffentlicht (data/weather/world/): nie synchronisiert oder committet. Erster Aufbau: etwa 2 Minuten; ist der Lauf schon da, wenige Sekunden.',
      'Publicado localmente, en este puesto (data/weather/world/): nunca sincronizado ni confirmado. Primera construcción: unos 2 minutos; si la pasada ya está, unos segundos.'
    ],
    build: ['Construire', 'Build', 'Aufbauen', 'Construir'],
    running: ['Construction en cours…', 'Building…', 'Aufbau läuft …', 'Construyendo…'],
    done: ['Construit : run {r}, {n} étapes, {s} ({t} s)', 'Built: run {r}, {n} steps, {s} ({t} s)',
      'Aufgebaut: Lauf {r}, {n} Schritte, {s} ({t} s)', 'Construido: pasada {r}, {n} pasos, {s} ({t} s)'
    ],
    kept: ['Le run était déjà publié : réutilisé.', 'The run was already published: reused.',
      'Der Lauf war schon veröffentlicht: wiederverwendet.', 'La pasada ya estaba publicada: reutilizada.'
    ],
    why: {
      'no-run': ['Aucun run publié ou NOAA injoignable : l’ancienne publication reste.',
        'No run published or NOAA unreachable: the old publication stays.',
        'Kein Lauf veröffentlicht oder NOAA nicht erreichbar: die alte Veröffentlichung bleibt.',
        'Ninguna pasada publicada o NOAA inaccesible: la publicación anterior se queda.'
      ],
      invalid: ['Le dossier produit n’est pas une prévision valide : rien n’a été remplacé.',
        'The produced folder is not a valid forecast: nothing was replaced.',
        'Der erzeugte Ordner ist keine gültige Vorhersage: nichts wurde ersetzt.',
        'La carpeta producida no es una previsión válida: no se reemplazó nada.'
      ],
      timeout: ['Délai dépassé (15 minutes) : l’ancienne publication reste.', 'Time exceeded (15 minutes): the old publication stays.',
        'Zeit überschritten (15 Minuten): die alte Veröffentlichung bleibt.',
        'Tiempo agotado (15 minutos): la publicación anterior se queda.'
      ],
      cancelled: ['Construction arrêtée.', 'Build stopped.', 'Aufbau angehalten.', 'Construcción detenida.'],
      failed: ['La construction a échoué : rien n’a été remplacé.', 'The build failed: nothing was replaced.',
        'Der Aufbau ist fehlgeschlagen: nichts wurde ersetzt.', 'La construcción falló: no se reemplazó nada.'
      ]
    }
  },
  // la ligne « Route (RAD, points FRA) » (route.js, SOG-0125)
  route: {
    name: ['Route (RAD, points FRA)', 'Route (RAD, FRA points)', 'Route (RAD, FRA-Punkte)', 'Ruta (RAD, puntos FRA)'],
    noImport: ['Aucun import sur ce poste', 'Nothing imported on this workstation', 'Auf diesem Rechner nichts importiert',
      'Nada importado en este puesto'
    ],
    radCycle: ['RAD du {d}', 'RAD of {d}', 'RAD vom {d}', 'RAD del {d}'],
    fraCycle: ['points FRA du {d}', 'FRA points of {d}', 'FRA-Punkte vom {d}', 'puntos FRA del {d}'],
    importedToday: ['importé aujourd’hui', 'imported today', 'heute importiert', 'importado hoy'],
    importedOne: ['importé il y a 1 jour', 'imported 1 day ago', 'vor 1 Tag importiert', 'importado hace 1 día'],
    importedMany: ['importé il y a {n} jours', 'imported {n} days ago', 'vor {n} Tagen importiert', 'importado hace {n} días'],
    hint: [
      'Les classeurs EUROCONTROL de votre dossier Téléchargements (RAD_<cycle>_v….xlsx et eurocontrol-airac-<cycle>-fra-points-….xlsx) sont compilés dans data/route/ pour le calcul de route. Un cycle remplace le même cycle ; les autres restent. Vous pouvez aussi les choisir avec « Choisir le fichier… ».',
      'The EUROCONTROL workbooks in your Downloads folder (RAD_<cycle>_v….xlsx and eurocontrol-airac-<cycle>-fra-points-….xlsx) are compiled into data/route/ for route calculation. A cycle replaces the same cycle; the others stay. You can also pick them with “Choose the file…”.',
      'Die EUROCONTROL-Arbeitsmappen in Ihrem Download-Ordner (RAD_<cycle>_v….xlsx und eurocontrol-airac-<cycle>-fra-points-….xlsx) werden für die Streckenberechnung in data/route/ kompiliert. Ein Zyklus ersetzt denselben Zyklus; die anderen bleiben. Sie können sie auch mit „Datei wählen…“ auswählen.',
      'Los libros de EUROCONTROL de su carpeta de Descargas (RAD_<cycle>_v….xlsx y eurocontrol-airac-<cycle>-fra-points-….xlsx) se compilan en data/route/ para el cálculo de ruta. Un ciclo sustituye al mismo ciclo; los demás se conservan. También puede elegirlos con «Elegir el archivo…».'
    ],
    // où créer le compte (SOG-0237, faits d'AeroDB) : l'inscription est gratuite, sur la page EAD Basic d'EUROCONTROL ; aucun identifiant n'est demandé ni gardé ici
    account: [
      'Compte EUROCONTROL gratuit : inscription sur la page {l}, lien « Registration form (New Users) » ; les accès arrivent par courriel.',
      'Free EUROCONTROL account: register on the {l} page, link “Registration form (New Users)”; the access arrives by e-mail.',
      'Kostenloses EUROCONTROL-Konto: Anmeldung auf der Seite {l}, Link „Registration form (New Users)“; die Zugangsdaten kommen per E-Mail.',
      'Cuenta gratuita de EUROCONTROL: inscripción en la página {l}, enlace «Registration form (New Users)»; los accesos llegan por correo.'
    ],
    accountLink: ['EAD Basic d’EUROCONTROL', 'EUROCONTROL EAD Basic', 'EAD Basic von EUROCONTROL', 'EAD Basic de EUROCONTROL'],
    import: ['Importer de Téléchargements', 'Import from Downloads', 'Aus Downloads importieren', 'Importar de Descargas'],
    planning: ['Recherche des classeurs dans Téléchargements…', 'Looking for workbooks in Downloads…',
      'Arbeitsmappen im Download-Ordner werden gesucht …', 'Buscando libros en Descargas…'
    ],
    running: ['Import en cours…', 'Importing…', 'Import läuft …', 'Importando…'],
    ask: ['Importer {n} de Téléchargements dans data/route/ ?', 'Import {n} from Downloads into data/route/?',
      '{n} aus Downloads nach data/route/ importieren?', '¿Importar {n} de Descargas en data/route/?'
    ],
    go: ['Importer', 'Import', 'Importieren', 'Importar'],
    cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    kind: {
      rad: ['RAD', 'RAD', 'RAD', 'RAD'],
      fra: ['Points FRA', 'FRA points', 'FRA-Punkte', 'Puntos FRA']
    },
    cycleOf: ['cycle du {d}', 'cycle of {d}', 'Zyklus vom {d}', 'ciclo del {d}'],
    none: [
      'Aucun classeur RAD ni points FRA dans Téléchargements : déposez-les (RAD_<cycle>_v….xlsx, eurocontrol-airac-<cycle>-fra-points-….xlsx) puis recommencez.',
      'No RAD or FRA points workbook in Downloads: drop them there (RAD_<cycle>_v….xlsx, eurocontrol-airac-<cycle>-fra-points-….xlsx) and start again.',
      'Keine RAD- oder FRA-Punkte-Arbeitsmappe im Download-Ordner: dort ablegen (RAD_<cycle>_v….xlsx, eurocontrol-airac-<cycle>-fra-points-….xlsx) und neu starten.',
      'Ningún libro de RAD ni de puntos FRA en Descargas: déjelos allí (RAD_<cycle>_v….xlsx, eurocontrol-airac-<cycle>-fra-points-….xlsx) y vuelva a empezar.'
    ],
    failed: ['Rien n’a été importé', 'Nothing was imported', 'Es wurde nichts importiert', 'No se importó nada'],
    cancelled: ['Import arrêté', 'Import stopped', 'Import angehalten', 'Importación detenida'],
    notShown: ['Aucun classeur choisi : refaites la recherche', 'No workbook chosen: search again',
      'Keine Arbeitsmappe gewählt: erneut suchen', 'Ningún libro elegido: busque de nuevo'
    ],
    done: ['Importé : {w}', 'Imported: {w}', 'Importiert: {w}', 'Importado: {w}'],
    partial: ['Importé en partie : {w} ; {n} refusé(s)', 'Partly imported: {w}; {n} refused', 'Teilweise importiert: {w}; {n} abgelehnt',
      'Importado en parte: {w}; {n} rechazado(s)'
    ],
    takenRad: ['RAD du {d}', 'RAD of {d}', 'RAD vom {d}', 'RAD del {d}'],
    takenFra: ['points FRA du {d}', 'FRA points of {d}', 'FRA-Punkte vom {d}', 'puntos FRA del {d}'],
    present: ['Présents sur ce poste : {w}', 'Present on this workstation: {w}', 'Auf diesem Rechner vorhanden: {w}',
      'Presentes en este puesto: {w}'
    ],
    presentRad: ['RAD : {d}', 'RAD: {d}', 'RAD: {d}', 'RAD: {d}'],
    presentFra: ['points FRA : {d}', 'FRA points: {d}', 'FRA-Punkte: {d}', 'puntos FRA: {d}'],
    commit: ['commit {c}', 'commit {c}', 'Commit {c}', 'commit {c}'],
    launcherSays: ['Le lanceur dit : {m}', 'The launcher says: {m}', 'Der Starter meldet: {m}', 'El lanzador dice: {m}'],
    failedBook: ['{n} : {w}', '{n}: {w}', '{n}: {w}', '{n}: {w}'],
    why: {
      changed: ['le fichier a changé depuis la recherche', 'the file changed since the search',
        'die Datei hat sich seit der Suche geändert', 'el archivo cambió desde la búsqueda'
      ],
      'not-found': ['le fichier n’est plus dans Téléchargements', 'the file is no longer in Downloads',
        'die Datei ist nicht mehr im Download-Ordner', 'el archivo ya no está en Descargas'
      ],
      'too-large': ['fichier trop gros', 'file too large', 'Datei zu groß', 'archivo demasiado grande'],
      unknown: ['classeur illisible', 'unreadable workbook', 'Arbeitsmappe nicht lesbar', 'libro ilegible']
    }
  },
  // la ligne sous chaque source ; texte de shared/maintenance_page.js (data-personal), à garder identique
  personalLine: {
    licence: ['Licence d’usage personnel.', 'Personal-use licence.', 'Lizenz zur persönlichen Nutzung.', 'Licencia de uso personal.'],
    xplane: ['Données du simulateur, usage personnel : lues sur ce poste seulement.',
      'Simulator data, personal use: read on this workstation only.',
      'Simulatordaten, persönliche Nutzung: nur auf diesem Rechner gelesen.',
      'Datos del simulador, uso personal: se leen solo en este puesto.'
    ]
  },
  // sous une source cochée : elle est retenue sur ce poste et partira à chaque Construire / Télécharger tant qu'on ne la décoche pas (SOG-0079)
  personalKept: ['Mémorisé : retrouvée cochée à chaque ouverture, envoyée à chaque construction',
    'Remembered: found ticked at each opening, sent with every build',
    'Gemerkt: bei jedem Öffnen angekreuzt, bei jedem Aufbau gesendet',
    'Recordado: se encuentra marcada en cada apertura, se envía en cada construcción'
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
  // un lanceur plus ancien peut encore répondre « xplane-in-page » : la phrase ne demande rien (aucune case à décocher), elle dit ce qu'est X-Plane ici
  sumXplane: ['X-Plane est lu sur ce poste seulement : il n’entre pas dans cette construction.',
    'X-Plane is read on this workstation only: it does not enter this build.',
    'X-Plane wird nur auf diesem Rechner gelesen: Er geht nicht in diesen Aufbau ein.',
    'X-Plane se lee solo en este puesto: no entra en esta construcción.'
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
  refusedWhy: ['Le lanceur dit : {m}', 'The launcher says: {m}', 'Der Starter meldet: {m}', 'El lanzador dice: {m}'],
  // une sélection de plus de 60 zones : des constructions de 60 au plus, l'une après l'autre (SOG-0144)
  chunk: ['Tranche {i} sur {n} ({z} au plus par construction)', 'Part {i} of {n} (at most {z} per run)',
    'Teil {i} von {n} (höchstens {z} je Lauf)', 'Parte {i} de {n} (como máximo {z} por ejecución)'
  ],
  chunksAsk: ['{n} zones en {k} constructions de {z} au plus, l’une après l’autre.',
    '{n} zones in {k} runs of at most {z}, one after the other.', '{n} Zonen in {k} Läufen zu höchstens {z}, nacheinander.',
    '{n} zonas en {k} ejecuciones de {z} como máximo, una tras otra.'
  ],
  // la purge de plus de 60 zones : une tranche à la fois (le plan de chacune), une seule question qui les somme (SOG-0071 temps 3)
  chunkPurge: ['Tranche {i} sur {n} ({z} au plus par purge)', 'Part {i} of {n} (at most {z} per purge)',
    'Teil {i} von {n} (höchstens {z} je Bereinigung)',
    'Parte {i} de {n} (como máximo {z} por purga)'
  ],
  purgeChunksAsk: ['{n} zones en {k} purges de {z} au plus, l’une après l’autre.',
    '{n} zones in {k} purges of at most {z}, one after the other.',
    '{n} Zonen in {k} Bereinigungen zu höchstens {z}, nacheinander.', '{n} zonas en {k} purgas de {z} como máximo, una tras otra.'
  ],
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
    skippedAbsent: ['ignorée : pas d’export openAIP pour ce pays', 'skipped: no openAIP export for this country',
      'übersprungen: kein openAIP-Export für dieses Land', 'omitida: no hay exportación de openAIP para este país'
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
    // la source qui a refusé ou échoué, nommée (SOG-0180 : « États-Unis : FAA : téléchargement refusé (403) »)
    refused: ['{src} : téléchargement refusé ({s})', '{src}: download refused ({s})', '{src}: Download abgelehnt ({s})',
      '{src}: descarga rechazada ({s})'
    ],
    srcWhy: ['{src} : {r}', '{src}: {r}', '{src}: {r}', '{src}: {r}'],
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
  // rien à publier parce que tout est déjà parti (SOG-0230 : « 0 fichiers envoyés » après une construction) : la construction range ses commits sur le poste, le passage de fond du cadre les envoie
  pubClean: ['Tout est déjà publié : les commits de la construction sont partis à {d} (dernière publication), rien de plus à envoyer.',
    'Everything is already published: the build’s commits left at {d} (last publication), nothing more to send.',
    'Alles ist schon veröffentlicht: die Commits des Aufbaus sind um {d} gegangen (letzte Veröffentlichung), nichts weiter zu senden.',
    'Todo está ya publicado: los commits de la construcción salieron a las {d} (última publicación), nada más que enviar.'
  ],
  // une publication dont les commits étaient déjà faits (la construction les a faits) : on dit ce qui est parti, jamais « fichiers commités : 0 » seul
  pubDoneCommits: ['Envoyé : {n} commit(s) déjà fait(s) par la construction. Fichiers reçus : {r}',
    'Sent: {n} commit(s) already made by the build. Files received: {r}',
    'Gesendet: {n} Commit(s), schon vom Aufbau erstellt. Empfangene Dateien: {r}',
    'Enviado: {n} commit(s) ya hecho(s) por la construcción. Archivos recibidos: {r}'
  ],
  pubLastKept: ['Dernier passage : {d} (rien n’a été envoyé)', 'Last pass: {d} (nothing was sent)',
    'Letzter Durchlauf: {d} (nichts wurde gesendet)', 'Último paso: {d} (no se envió nada)'
  ],
  pubReading: ['Lecture de l’état des fichiers du poste…', 'Reading the state of this workstation’s files…',
    'Der Zustand der Dateien des Rechners wird gelesen …', 'Leyendo el estado de los archivos del puesto…'
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
  pubFailed: [
    'La publication a échoué : le lanceur n’a pas dit pourquoi (mettez-le à jour pour le savoir). Rien n’est perdu, les fichiers restent sur le poste.',
    'The publication failed: the launcher did not say why (update it to find out). Nothing is lost, the files stay on this workstation.',
    'Die Veröffentlichung ist fehlgeschlagen: Der Starter nennt den Grund nicht (aktualisieren Sie ihn, um ihn zu erfahren). Nichts geht verloren, die Dateien bleiben auf dem Rechner.',
    'La publicación falló: el lanzador no dijo por qué (actualícelo para saberlo). No se pierde nada, los archivos siguen en el equipo.'
  ],
  // SOG-0155 : la cause (tools/data_sync.py) dite dans les mots du pilote, et l'étape où l'échange s'est arrêté
  pubFailedCause: ['La publication a échoué : {c}{s}. Rien n’est perdu, les fichiers restent sur le poste.',
    'The publication failed: {c}{s}. Nothing is lost, the files stay on this workstation.',
    'Die Veröffentlichung ist fehlgeschlagen: {c}{s}. Nichts geht verloren, die Dateien bleiben auf dem Rechner.',
    'La publicación falló: {c}{s}. No se pierde nada, los archivos siguen en el equipo.'
  ],
  pubStepAt: [' (étape {s})', ' (step {s})', ' (Schritt {s})', ' (paso {s})'],
  pubCause: {
    'remote-refused': ['le serveur a refusé l’envoi : une règle du dépôt, ou un fichier trop gros',
      'the server refused the upload: a repository rule, or a file too big',
      'der Server hat das Senden abgelehnt: eine Regel des Repositorys oder eine zu große Datei',
      'el servidor rechazó el envío: una regla del repositorio o un archivo demasiado grande'
    ],
    'push-rejected': ['le dépôt distant a changé entre-temps : relancez, la synchro reprend',
      'the remote repository changed meanwhile: start again, the sync picks up',
      'das entfernte Repository hat sich inzwischen geändert: erneut starten, die Synchronisation setzt fort',
      'el repositorio remoto cambió entretanto: vuelva a empezar, la sincronización continúa'
    ],
    'lfs-hook': ['Git LFS bloque l’envoi', 'Git LFS blocks the upload', 'Git LFS blockiert das Senden', 'Git LFS bloquea el envío'],
    auth: ['l’identifiant ou le jeton est refusé par le serveur', 'the server refused the login or the token',
      'der Server hat die Anmeldung oder das Token abgelehnt',
      'el servidor rechazó el identificador o el token'
    ],
    network: ['le serveur n’est pas joignable : réseau ou adresse', 'the server cannot be reached: network or address',
      'der Server ist nicht erreichbar: Netz oder Adresse',
      'no se puede contactar con el servidor: red o dirección'
    ],
    conflict: ['des fichiers sont en conflit avec ceux du dépôt', 'some files conflict with those of the repository',
      'einige Dateien stehen im Konflikt mit denen des Repositorys',
      'algunos archivos están en conflicto con los del repositorio'
    ],
    busy: ['le dépôt du poste est occupé : une fusion ou un verrou en cours',
      'this workstation’s repository is busy: a merge or a lock in progress',
      'das Repository des Rechners ist belegt: eine Zusammenführung oder eine Sperre läuft',
      'el repositorio del equipo está ocupado: una fusión o un bloqueo en curso'
    ],
    timeout: ['le serveur n’a pas répondu à temps', 'the server did not answer in time', 'der Server hat nicht rechtzeitig geantwortet',
      'el servidor no respondió a tiempo'
    ],
    'launcher-error': ['le lanceur a rencontré une erreur', 'the launcher met an error', 'der Starter ist auf einen Fehler gestoßen',
      'el lanzador encontró un error'
    ],
    other: ['cause non identifiée', 'cause not identified', 'Ursache nicht erkannt', 'causa no identificada']
  },
  pubStep: {
    settle: ['mise au net', 'settle', 'Abgleich', 'ajuste'],
    commit: ['commit', 'commit', 'Commit', 'commit'],
    prepare: ['préparation', 'preparation', 'Vorbereitung', 'preparación'],
    receive: ['réception', 'receive', 'Empfang', 'recepción'],
    untrack: ['index', 'index', 'Index', 'índice'],
    push: ['envoi', 'push', 'Senden', 'envío']
  },
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
  firstInstall: ['Ouvrir l’assistant de première installation (page de l’ancienne version)',
    'Open the first-install assistant (a page of the old version)',
    'Assistenten der Ersteinrichtung öffnen (Seite der alten Version)',
    'Abrir el asistente de primera instalación (página de la versión antigua)'
  ],
  // la carte des zones à cocher (même sélection que la liste) : son nom, ce que dit chaque teinte, la légende
  zoneMap: {
    base: ['Carte des zones à cocher', 'Map of the zones to tick', 'Karte der anzukreuzenden Zonen', 'Mapa de las zonas por marcar'],
    proc: ['Carte des États à cocher', 'Map of the States to tick', 'Karte der anzukreuzenden Staaten', 'Mapa de los Estados por marcar']
  },
  mapTone: {
    ok: ['à jour', 'up to date', 'aktuell', 'al día'],
    warn: ['cycle dépassé ou absent', 'cycle out of date or missing', 'Zyklus überholt oder fehlend', 'ciclo superado o ausente'],
    err: ['en échec', 'failed', 'fehlgeschlagen', 'fallida'],
    accent: ['en cours', 'running', 'läuft', 'en curso'],
    muted: ['hors couverture ou jamais construite', 'not in the coverage or never built', 'nicht in der Abdeckung oder nie gebaut',
      'fuera de la cobertura o nunca construida'
    ]
  },
  // la ligne d'un État des procédures : ses terrains détenus (LF : avec le cycle publié ; les autres États : relus), et un point de la carte
  heldCycle: ['{n}, cycle {c}', '{n}, cycle {c}', '{n}, Zyklus {c}', '{n}, ciclo {c}'],
  ptInfo: ['{i} : {w}, cycle {c}', '{i}: {w}, cycle {c}', '{i}: {w}, Zyklus {c}', '{i}: {w}, ciclo {c}'],
  ptInfoRead: ['{i} : {w}, relu le {d}', '{i}: {w}, read on {d}', '{i}: {w}, gelesen am {d}', '{i}: {w}, leído el {d}'],
  mapRecenter: ['Recentrer', 'Recenter', 'Neu zentrieren', 'Recentrar'],
  mapLegendApprox: ['pointillé : contour approximatif', 'dashed: approximate outline', 'gestrichelt: ungefährer Umriss',
    'punteado: contorno aproximado'
  ],
  mapLegend: ['Légende', 'Legend', 'Legende', 'Leyenda'],
  mapLegendNote: [
    'Trait épais et teinte pleine : zone cochée ; touchez une zone pour la cocher ou la décocher (une zone grise s’ajoute d’un toucher), déplacez et pincez la carte pour la voir de plus près.',
    'Thick outline and solid tint: zone ticked; tap a zone to tick or untick it (a grey zone is added by a tap), drag and pinch the map to see it closer.',
    'Dicker Rand und volle Tönung: Zone angekreuzt; tippen Sie auf eine Zone, um sie an- oder abzukreuzen (eine graue Zone wird durch Tippen hinzugefügt), und verschieben und zoomen Sie die Karte, um näher heranzugehen.',
    'Trazo grueso y tono lleno: zona marcada; toque una zona para marcarla o desmarcarla (una zona gris se añade con un toque), arrastre y pellizque el mapa para verlo más de cerca.'
  ],
  // prendre le fichier téléchargé à la main dans Téléchargements (base/pickup) : le bouton, la question, la fin
  pickup: ['Prendre le fichier téléchargé', 'Take the downloaded file', 'Heruntergeladene Datei übernehmen',
    'Tomar el archivo descargado'
  ],
  // SOG-0150 : les jeux présents que la construction ne lira pas, la case « personnel » ne déclarant pas la source
  pickupUnread: [
    '{z} : {n} jeux {s} présents dans Téléchargements, déjà pris : la coche « Je certifie utiliser les données pour mon usage personnel » n’est pas cochée',
    '{z}: {n} {s} sets in place: the “I certify that I use the data for my personal use” box is not ticked',
    '{z}: {n} {s}-Datensätze vorhanden: „Ich bestätige, die Daten für meinen persönlichen Gebrauch zu nutzen“ ist nicht angekreuzt',
    '{z}: {n} conjuntos {s} presentes: la casilla «Certifico que uso los datos para mi uso personal» no está marcada'
  ],
  // la question du plan de « Prendre le fichier téléchargé » (SOG-0197) : trois groupes titrés, une ligne par fichier (pays · fichier · taille), jamais une parenthèse dans une parenthèse
  pk: {
    title: ['Dans Téléchargements :', 'In Downloads:', 'In Downloads:', 'En Descargas:'],
    take: ['Sera pris ({n})', 'Will be taken ({n})', 'Wird übernommen ({n})', 'Se tomará ({n})'],
    ignore: ['Ignoré ({n})', 'Ignored ({n})', 'Ignoriert ({n})', 'Ignorado ({n})'],
    fix: ['À corriger ({n})', 'To fix ({n})', 'Zu korrigieren ({n})', 'Por corregir ({n})'],
    takeZip: ['{z} · {zip} · {b}', '{z} · {zip} · {b}', '{z} · {zip} · {b}', '{z} · {zip} · {b}'],
    takeFiles: ['{z} · {s} · {n} · {b}{c}', '{z} · {s} · {n} · {b}{c}', '{z} · {s} · {n} · {b}{c}', '{z} · {s} · {n} · {b}{c}'],
    skipFormat: ['{z} · {name} : format XML non lu, exportez en GeoJSON ou en JSON sur openaip.net',
      '{z} · {name}: XML format not read, export it as GeoJSON or JSON on openaip.net',
      '{z} · {name}: XML-Format wird nicht gelesen, auf openaip.net als GeoJSON oder JSON exportieren',
      '{z} · {name}: formato XML no leído, expórtelo en GeoJSON o JSON en openaip.net'
    ],
    skipLayer: ['{z} · {name} : couche « hot », non utilisée', '{z} · {name}: “hot” layer, not used',
      '{z} · {name}: „hot“-Ebene, nicht verwendet', '{z} · {name}: capa «hot», no se usa'
    ],
    fixRename: ['{z} · {s} : renommez {zip} sans espace ni accent', '{z} · {s}: rename {zip} without space or accent',
      '{z} · {s}: {zip} ohne Leerzeichen und Akzent umbenennen',
      '{z} · {s}: renombre {zip} sin espacio ni acento'
    ],
    fixMissing: ['{z} · {s} : déposez {e} dans Téléchargements', '{z} · {s}: drop {e} into Downloads',
      '{z} · {s}: legen Sie {e} in Downloads ab', '{z} · {s}: deje {e} en Descargas'
    ],
    fixUnread: [
      '{z} · {s} : {n} jeu(x) présent(s), cochez « Je certifie utiliser les données pour mon usage personnel », puis « Mettre à jour »',
      '{z} · {s}: {n} set(s) there, tick “I certify that I use the data for my personal use”, then “Update”',
      '{z} · {s}: {n} Datensatz/-sätze vorhanden, „Ich bestätige, die Daten für meinen persönlichen Gebrauch zu nutzen“ ankreuzen, dann „Aktualisieren“',
      '{z} · {s}: {n} conjunto(s) presente(s), marque «Certifico que uso los datos para mi uso personal» y luego «Actualizar»'
    ]
  },
  // la prise des exports openAIP (SOG-0027) : des fichiers un à un, pas un zip ; « n fichiers (x Ko) », dont {c} convertis du JSON
  pickupConverted: [', dont {n} convertis du JSON en GeoJSON', ', {n} converted from JSON to GeoJSON',
    ', davon {n} von JSON nach GeoJSON umgewandelt',
    ', {n} convertidos de JSON a GeoJSON'
  ],
  // un export openAIP que la suite ne lit pas : dit, jamais pris (why : 'format' = un XML openAIP 1.1, 'layer' = la couche « hot » non utilisée)
  pickupSkipped: {
    format: ['{z} ({s}) : {name} n’est pas lu (format XML) : exportez en GeoJSON ou en JSON sur openaip.net',
      '{z} ({s}): {name} is not read (XML format): export it as GeoJSON or JSON on openaip.net',
      '{z} ({s}): {name} wird nicht gelesen (XML-Format): exportieren Sie es auf openaip.net als GeoJSON oder JSON',
      '{z} ({s}): {name} no se lee (formato XML): expórtelo en GeoJSON o JSON en openaip.net'
    ],
    layer: ['{z} ({s}) : {name} n’est pas utilisé (couche « hot »)', '{z} ({s}): {name} is not used (“hot” layer)',
      '{z} ({s}): {name} wird nicht verwendet („hot“-Ebene)', '{z} ({s}): {name} no se usa (capa «hot»)'
    ]
  },
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
    inPlace: ['{n} jeu(x) {s} déjà pris : rien de nouveau à prendre', '{n} {s} set(s) already taken: nothing new to take',
      '{n} {s}-Datensatz/-Datensätze bereits übernommen: nichts Neues zu übernehmen',
      '{n} conjunto(s) {s} ya tomado(s): nada nuevo que tomar'
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
  pickupRename: ['{z} ({s}) : renommez {zip} sans espace ni accent', '{z} ({s}): rename {zip} without space or accent',
    '{z} ({s}): {zip} ohne Leerzeichen und Akzent umbenennen', '{z} ({s}): renombre {zip} sin espacio ni acento'
  ],
  pickupReplan: ['Relancer le plan', 'Run the plan again', 'Plan erneut ausführen', 'Repetir el plan'],
  pickupHint: ['La construction de ces zones démarre d’elle-même.', 'These zones are built next, by themselves.',
    'Diese Zonen werden anschließend von selbst gebaut.', 'Estas zonas se construyen a continuación, por sí solas.'
  ],
  // « Tout mettre à jour » (SPEC § 5.3) : le bouton, la question, la chaîne, la fin
  updateAll: ['Tout mettre à jour', 'Update all', 'Alle aktualisieren', 'Actualizar todo'],
  updateAllN: ['Tout mettre à jour ({n})', 'Update all ({n})', 'Alle aktualisieren ({n})', 'Actualizar todo ({n})'],
  // le compte global des sources lues par un travail de la base, une fois en tête (jamais sur une ligne de zone)
  inputsCount: ['Sources lues : {n} / {m}', 'Sources read: {n} / {m}', 'Gelesene Quellen: {n} / {m}', 'Fuentes leídas: {n} / {m}'],
  // la fin de « Construire » de la base et le cycle manuel qui manque (aerodb 294ffc1b8 : le cycle d'une zone est celui de sa source datée) : {a} est le HTML déjà sûr des sources (leur nom, en lien), {b} le lien du site
  srcBlocking: ['Sources d’un cycle passé : {a} — téléchargez d’abord le cycle {n}',
    'Sources of a past cycle: {a} — download cycle {n} first',
    'Quellen eines vergangenen Zyklus: {a} — Laden Sie zuerst Zyklus {n} herunter',
    'Fuentes de un ciclo pasado: {a} — descargue primero el ciclo {n}'
  ],
  srcMissing: ['{s} {c} manquant : téléchargez {a} sur {b}',
    '{s} {c} missing: download {a} from {b}',
    '{s} {c} fehlt: Laden Sie {a} von {b} herunter',
    '{s} {c} falta: descargue {a} en {b}'
  ],
  srcSite: {
    sia: ['le site du SIA', 'the SIA site', 'der SIA-Website', 'el sitio del SIA']
  },
  srcSiteAny: ['la page de la source', 'the source page', 'der Seite der Quelle', 'la página de la fuente'],
  staleBy: [' — à cause de {s}', ' — because of {s}', ' — wegen {s}', ' — por {s}'],
  // le verbe qui manque d'abord : reconstruire sans les sources du nouveau cycle refait l'ancien (retour du 1er nov. 2026)
  staleCycle: ['Cycle {x} dépassé : téléchargez les sources du cycle {y}, puis reconstruisez',
    'Cycle {x} out of date: download the sources of cycle {y}, then rebuild',
    'Zyklus {x} überholt: Laden Sie die Quellen des Zyklus {y} herunter und bauen Sie dann neu auf',
    'Ciclo {x} superado: descargue las fuentes del ciclo {y} y luego reconstruya'
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
  // la carte « Inventaire des données » (SOG-0010) : ce que « data » recouvre sur ce poste, en lecture seule
  // le tableau de couverture par pays (SOG-0174) : sept colonnes au plus, le reste au détail de la ligne
  cov: {
    title: ['Couverture par pays', 'Coverage by country', 'Abdeckung nach Land', 'Cobertura por país'],
    intro: [
      'Ce que la base porte aujourd’hui pour chaque pays, lu dans ses fichiers : le nombre de points, de voies, d’espaces, de FIR, de terrains avec procédures et avec couche sol (non : aucun). Touchez un en-tête pour trier, un pays pour voir ses sources et leur licence.',
      'What the base holds today for each country, read from its files: the number of points, airways, airspaces, FIRs, aerodromes with procedures and with a ground layer (no: none). Touch a heading to sort, a country to see its sources and their licence.',
      'Was die Basis heute für jedes Land enthält, aus ihren Dateien gelesen: Zahl der Punkte, Strecken, Lufträume, FIR, Flugplätze mit Verfahren und mit Bodenschicht (nein: keine). Tippen Sie auf eine Überschrift zum Sortieren, auf ein Land für seine Quellen und deren Lizenz.',
      'Lo que la base contiene hoy para cada país, leído de sus archivos: número de puntos, aerovías, espacios, FIR, aeródromos con procedimientos y con capa de suelo (no: ninguno). Toque un encabezado para ordenar, un país para ver sus fuentes y su licencia.'
    ],
    no: ['non', 'no', 'nein', 'no'],
    country: ['Pays', 'Country', 'Land', 'País'],
    col: {
      points: ['Points', 'Points', 'Punkte', 'Puntos'],
      airways: ['Voies', 'Airways', 'Strecken', 'Aerovías'],
      airspaces: ['Espaces', 'Airspaces', 'Lufträume', 'Espacios'],
      fir: ['FIR', 'FIR', 'FIR', 'FIR'],
      procedures: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
      ground: ['Sol', 'Ground', 'Boden', 'Suelo']
    },
    cycle: ['Cycle', 'Cycle', 'Zyklus', 'Ciclo'],
    parser: ['analyseur v{n}', 'parser v{n}', 'Parser v{n}', 'analizador v{n}'],
    also: ['Aussi', 'Also', 'Außerdem', 'También'],
    alsoLine: ['{a} terrains · {n} balises · {v} points VFR', '{a} aerodromes · {n} navaids · {v} VFR points',
      '{a} Flugplätze · {n} Funkfeuer · {v} VFR-Punkte', '{a} aeródromos · {n} radioayudas · {v} puntos VFR'
    ],
    sources: ['Sources lues', 'Sources read', 'Gelesene Quellen', 'Fuentes leídas'],
    noSource: ['Aucune source lue.', 'No source read.', 'Keine Quelle gelesen.', 'Ninguna fuente leída.'],
    notYet: ['Pas encore lues', 'Not read yet', 'Noch nicht gelesen', 'Aún sin leer'],
    loading: ['Lecture en cours…', 'Reading…', 'Lesen läuft…', 'Leyendo…'],
    busy: ['Le lanceur a un autre travail en cours : relisez quand il aura fini.',
      'The launcher is busy with another job: read again when it is over.',
      'Der Launcher hat einen anderen Auftrag: lesen Sie erneut, wenn er fertig ist.',
      'El lanzador está ocupado con otro trabajo: vuelva a leer cuando termine.'
    ],
    unread: ['Le tableau n’a pas pu être lu.', 'The table could not be read.', 'Die Tabelle konnte nicht gelesen werden.',
      'No se pudo leer la tabla.'
    ],
    reload: ['Relire', 'Read again', 'Erneut lesen', 'Volver a leer'],
    noLauncher: ['Le tableau se lit au lanceur du poste : lancez-le pour le voir.',
      'The table is read from the workstation’s launcher: start it to see it.',
      'Die Tabelle wird vom Launcher des Rechners gelesen: Starten Sie ihn, um sie zu sehen.',
      'La tabla se lee en el lanzador del equipo: inícielo para verla.'
    ],
    unknownVerb: ['Ce lanceur ne connaît pas encore cette lecture : relancez-le avec la dernière version.',
      'This launcher does not know this reading yet: restart it with the latest version.',
      'Dieser Launcher kennt diese Abfrage noch nicht: Starten Sie ihn mit der neuesten Version neu.',
      'Este lanzador aún no conoce esta lectura: reinícielo con la última versión.'
    ]
  },
  inventory: {
    title: ['Inventaire des données', 'Data inventory', 'Dateninventar', 'Inventario de datos'],
    intro: [
      'Ce que « data » recouvre sur ce poste : sept emplacements, leur taille et s’ils sont suivis par le dépôt. Rien n’est lu dans un fichier ; rien n’est déplacé sans votre confirmation.',
      'What “data” covers on this workstation: seven places, their size and whether the repository tracks them. No file is read; nothing is moved without your confirmation.',
      'Was „data“ auf diesem Rechner umfasst: sieben Orte, ihre Größe und ob das Repository sie verfolgt. Keine Datei wird gelesen; ohne Ihre Bestätigung wird nichts verschoben.',
      'Lo que abarca «data» en este puesto: siete lugares, su tamaño y si el repositorio los sigue. No se lee ningún archivo; no se mueve nada sin su confirmación.'
    ],
    // « Ranger les sources brutes » (SOG-0030) : le verbe base/move-sources du lanceur, d'abord à blanc, puis sur confirmation
    move: {
      hint: [
        'Ranger les fichiers XML bruts du SIA de data/sia/ dans data/local/sources/sia/<cycle>/ : chaque fichier est copié, vérifié, puis l’ancien retiré (gardé s’il est suivi par git). Rien n’est supprimé.',
        'Put the raw SIA XML files of data/sia/ into data/local/sources/sia/<cycle>/: each file is copied, checked, then the old one removed (kept if git tracks it). Nothing is deleted.',
        'Die rohen SIA-XML-Dateien aus data/sia/ in data/local/sources/sia/<cycle>/ ablegen: Jede Datei wird kopiert, geprüft, dann die alte entfernt (behalten, wenn git sie verfolgt). Nichts wird gelöscht.',
        'Guardar los archivos XML brutos del SIA de data/sia/ en data/local/sources/sia/<cycle>/: cada archivo se copia, se verifica y se retira el antiguo (se conserva si git lo sigue). No se borra nada.'
      ],
      plan: ['Ranger les sources brutes', 'Put the raw sources away', 'Rohquellen ablegen', 'Guardar las fuentes brutas'],
      planUndo: ['Remettre à leur place', 'Put them back', 'Zurücklegen', 'Devolverlas a su sitio'],
      planning: ['Plan en cours…', 'Planning…', 'Plan wird erstellt…', 'Preparando el plan…'],
      running: ['Rangement en cours…', 'Working…', 'Wird abgelegt…', 'Guardando…'],
      confirm: ['Ranger', 'Put away', 'Ablegen', 'Guardar'],
      confirmUndo: ['Remettre', 'Put back', 'Zurücklegen', 'Devolver'],
      cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
      ask: ['Ranger {n} fichier(s) ({b}) ? Chacun est copié dans data/local/sources/sia/<cycle>/, vérifié, puis l’ancien retiré.',
        'Put {n} file(s) ({b}) away? Each is copied into data/local/sources/sia/<cycle>/, checked, then the old one removed.',
        '{n} Datei(en) ({b}) ablegen? Jede wird nach data/local/sources/sia/<cycle>/ kopiert, geprüft, dann die alte entfernt.',
        '¿Guardar {n} archivo(s) ({b})? Cada uno se copia en data/local/sources/sia/<cycle>/, se verifica y se retira el antiguo.'
      ],
      askUndo: ['Remettre {n} fichier(s) ({b}) à leur place d’origine ? Chacun est copié, vérifié, puis celui du rangement retiré.',
        'Put {n} file(s) ({b}) back where they came from? Each is copied, checked, then the one that was put away is removed.',
        '{n} Datei(en) ({b}) an ihren ursprünglichen Ort zurücklegen? Jede wird kopiert, geprüft, dann die abgelegte entfernt.',
        '¿Devolver {n} archivo(s) ({b}) a su sitio de origen? Cada uno se copia, se verifica y se retira el guardado.'
      ],
      nothing: ['Rien à ranger : aucun fichier XML brut du SIA à la racine de data/sia/.',
        'Nothing to put away: no raw SIA XML file at the root of data/sia/.',
        'Nichts abzulegen: keine rohe SIA-XML-Datei im Stamm von data/sia/.',
        'Nada que guardar: ningún archivo XML bruto del SIA en la raíz de data/sia/.'
      ],
      nothingUndo: ['Rien à remettre : aucun rangement noté, ou déjà remis.',
        'Nothing to put back: no move noted, or already put back.',
        'Nichts zurückzulegen: keine Ablage vermerkt oder bereits zurückgelegt.',
        'Nada que devolver: ningún guardado anotado, o ya devuelto.'
      ],
      done: ['{n} fichier(s) rangé(s) ({b}).', '{n} file(s) put away ({b}).', '{n} Datei(en) abgelegt ({b}).',
        '{n} archivo(s) guardado(s) ({b}).'
      ],
      doneUndo: ['{n} fichier(s) remis à leur place ({b}).', '{n} file(s) put back ({b}).', '{n} Datei(en) zurückgelegt ({b}).',
        '{n} archivo(s) devuelto(s) ({b}).'
      ],
      already: ['{n} déjà au bon endroit.', '{n} already in the right place.', '{n} bereits am richtigen Ort.', '{n} ya en su sitio.'],
      kept: ['{n} ancien(s) gardé(s) : suivi(s) par git.', '{n} old one(s) kept: tracked by git.', '{n} alte behalten: von git verfolgt.',
        '{n} antiguo(s) conservado(s): seguido(s) por git.'
      ],
      refused: ['{n} refusé(s) :', '{n} refused:', '{n} abgelehnt:', '{n} rechazado(s):'],
      more: ['… et {n} autre(s)', '… and {n} more', '… und {n} weitere', '… y {n} más'],
      why: {
        present: ['le chemin d’origine est pris', 'the original path is taken', 'der ursprüngliche Pfad ist belegt',
          'la ruta de origen está ocupada'
        ],
        different: ['un autre fichier de même nom est déjà là', 'another file of the same name is already there',
          'eine andere Datei gleichen Namens ist schon da', 'ya hay otro archivo con el mismo nombre'
        ],
        missing: ['le fichier n’est plus là', 'the file is no longer there', 'die Datei ist nicht mehr da', 'el archivo ya no está'],
        'unsafe-path': ['chemin refusé', 'path refused', 'Pfad abgelehnt', 'ruta rechazada'],
        'too-large': ['trop gros', 'too large', 'zu groß', 'demasiado grande'],
        'sha-mismatch': ['la copie diffère de l’original', 'the copy differs from the original', 'die Kopie weicht vom Original ab',
          'la copia difiere del original'
        ],
        'write-failed': ['écriture impossible', 'could not write', 'Schreiben nicht möglich', 'no se pudo escribir'],
        other: ['raison inconnue', 'unknown reason', 'unbekannter Grund', 'motivo desconocido']
      },
      reason: {
        cancelled: ['Arrêté avant la fin.', 'Stopped before the end.', 'Vor dem Ende abgebrochen.', 'Detenido antes del final.'],
        failed: ['Rien n’a pu être déplacé.', 'Nothing could be moved.', 'Nichts konnte verschoben werden.', 'No se pudo mover nada.'],
        partial: ['Fait en partie : voir les refusés.', 'Partly done: see the refused ones.',
          'Teilweise erledigt: siehe die abgelehnten.', 'Hecho en parte: vea los rechazados.'
        ]
      },
      refusal: {
        forbidden: ['Le lanceur refuse : ce geste se fait depuis le poste, pas depuis un appareil apparié.',
          'The launcher refuses: this is done from the workstation, not from a paired device.',
          'Der Starter lehnt ab: Das geht vom Rechner aus, nicht von einem gekoppelten Gerät.',
          'El lanzador rechaza: esto se hace desde el puesto, no desde un dispositivo emparejado.'
        ],
        busy: ['Un autre travail du lanceur tourne : réessayez à sa fin.', 'Another launcher job is running: try again when it ends.',
          'Ein anderer Starter-Auftrag läuft: Versuchen Sie es nach seinem Ende erneut.',
          'Otro trabajo del lanzador está en curso: inténtelo cuando termine.'
        ],
        unknown: ['Ce lanceur ne connaît pas ce rangement : relancez-le à jour.',
          'This launcher does not know this move: restart it up to date.',
          'Dieser Starter kennt diese Ablage nicht: Starten Sie ihn aktuell neu.',
          'Este lanzador no conoce este guardado: reinícielo actualizado.'
        ],
        failed: ['Le lanceur n’a pas pu faire ce rangement.', 'The launcher could not do this move.',
          'Der Starter konnte diese Ablage nicht ausführen.', 'El lanzador no pudo hacer este guardado.'
        ],
        sync: ['Une fusion est en attente dans data/ : rien n’est déplacé, synchronisez d’abord.',
          'A merge is pending in data/: nothing is moved, synchronise first.',
          'In data/ steht eine Zusammenführung aus: Nichts wird verschoben, zuerst synchronisieren.',
          'Hay una fusión pendiente en data/: no se mueve nada, sincronice primero.'
        ],
        noLauncher: [
          'Lanceur non appairé : le rangement se fait depuis le poste qui porte le lanceur, cette carte est en lecture seule ici.',
          'Launcher not paired: the move is done from the workstation that carries the launcher, this card is read only here.',
          'Starter nicht gekoppelt: Die Ablage erfolgt am Rechner mit dem Starter, diese Karte ist hier nur lesbar.',
          'Lanzador no emparejado: el guardado se hace desde el puesto que lleva el lanzador, esta tarjeta es de solo lectura aquí.'
        ],
        unknownVerb: ['Verbe inconnu de ce lanceur : relancez-le à jour pour ranger les sources brutes.',
          'Verb unknown to this launcher: restart it up to date to put the raw sources away.',
          'Verb diesem Starter unbekannt: Starten Sie ihn aktuell neu, um die Rohquellen abzulegen.',
          'Verbo desconocido para este lanzador: reinícielo actualizado para guardar las fuentes brutas.'
        ],
        gateBusy: ['Une opération est en cours : attendez sa fin.', 'An operation is running: wait for it to end.',
          'Ein Vorgang läuft: Warten Sie sein Ende ab.', 'Hay una operación en curso: espere a que termine.'
        ]
      }
    },
    loading: ['Lecture de l’inventaire…', 'Reading the inventory…', 'Inventar wird gelesen…', 'Leyendo el inventario…'],
    unread: ['Inventaire illisible : le lanceur de ce poste ne répond pas, ou refuse. Rien n’est deviné.',
      'Inventory unreadable: this workstation’s launcher does not answer, or refuses. Nothing is guessed.',
      'Inventar nicht lesbar: Der Starter dieses Rechners antwortet nicht oder lehnt ab. Es wird nichts geraten.',
      'Inventario ilegible: el lanzador de este puesto no responde, o rechaza. No se adivina nada.'
    ],
    total: ['Total mesuré : {n}', 'Total measured: {n}', 'Gemessen insgesamt: {n}', 'Total medido: {n}'],
    absent: ['absent', 'absent', 'nicht vorhanden', 'ausente'],
    atLeast: ['au moins {n}', 'at least {n}', 'mindestens {n}', 'al menos {n}'],
    place: {
      repo: ['Dépôt des données (data/)', 'Data repository (data/)', 'Datenrepository (data/)', 'Repositorio de datos (data/)'],
      local: ['Local au poste (data/local/)', 'Local to the workstation (data/local/)', 'Lokal am Rechner (data/local/)',
        'Local al puesto (data/local/)'
      ],
      raw: ['Sources brutes du SIA (data/sia/*.xml, *.zip)', 'Raw SIA sources (data/sia/*.xml, *.zip)',
        'SIA-Rohquellen (data/sia/*.xml, *.zip)', 'Fuentes brutas del SIA (data/sia/*.xml, *.zip)'
      ],
      cache: ['Copie de l’appareil (navigateur)', 'This device’s copy (browser)', 'Kopie dieses Geräts (Browser)',
        'Copia del dispositivo (navegador)'
      ],
      suite: ['Dossiers de travail de la suite', 'The suite’s working folders', 'Arbeitsordner der Suite',
        'Carpetas de trabajo de la suite'
      ],
      downloads: ['Téléchargements', 'Downloads', 'Downloads', 'Descargas'],
      backup: ['Sauvegardes laissées (data_avant_…)', 'Backups left behind (data_avant_…)', 'Hinterlassene Sicherungen (data_avant_…)',
        'Copias dejadas (data_avant_…)'
      ]
    },
    state: {
      tracked: ['suivi', 'tracked', 'verfolgt', 'seguido'],
      local: ['local', 'local', 'lokal', 'local'],
      outside: ['hors dépôt', 'outside the repository', 'außerhalb des Repositorys', 'fuera del repositorio'],
      unknown: ['état inconnu', 'state unknown', 'Status unbekannt', 'estado desconocido']
    },
    writer: {
      'launcher+pilots': ['écrit par le lanceur et les pilotes', 'written by the launcher and the pilots',
        'vom Starter und den Piloten geschrieben', 'escrito por el lanzador y los pilotos'
      ],
      launcher: ['écrit par le lanceur', 'written by the launcher', 'vom Starter geschrieben', 'escrito por el lanzador'],
      user: ['déposé à la main', 'dropped in by hand', 'von Hand abgelegt', 'depositado a mano'],
      app: ['écrit par l’appli', 'written by the app', 'von der App geschrieben', 'escrito por la app'],
      suite: ['écrit par la suite', 'written by the suite', 'von der Suite geschrieben', 'escrito por la suite'],
      restoration: ['laissé par une restauration', 'left by a restoration', 'von einer Wiederherstellung hinterlassen',
        'dejado por una restauración'
      ],
      other: ['écrivain inconnu', 'writer unknown', 'Schreiber unbekannt', 'escritor desconocido']
    }
  },
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
