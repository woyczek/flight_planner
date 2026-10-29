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
  procByStatus: ['Terrains par statut', 'Aerodromes by status', 'Flugplätze nach Status', 'Aeródromos por estado']
};
