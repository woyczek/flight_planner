(() => {
  'use strict';
  // V3 aerodb — le catalogue des sources de données aéronautiques (SPEC § 5 sexies ; contrat du module Données, 28 octobre 2026) :
  // données seules, aucun appel réseau, servi aux modules par aerodb.sources() (un module ne charge pas les fichiers d'aerodb) et
  // lu par l'écran « Sources » (sources.js) tant qu'il existe. Une ligne par source utilisée, envisagée ou écartée :
  //   { id, no (ligne du tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md, ou null), status ('used' | 'candidate' |
  //     'abandoned'), group ('base' | 'proc' | 'aircraft' | 'weather' : le groupe du module Données), zones (zones nourries, '*' :
  //     toutes celles de la couverture), fetch { how: 'launcher' | 'pick' | 'none', provider?, glob?, name? } (comment la source
  //     arrive sur le poste : téléchargée par le lanceur, prise dans Téléchargements ou un sélecteur, ou rien), build { runtime:
  //     'worker' | 'python' | 'none', id } (le constructeur, SPEC § 5 septies), publish (vers le dépôt des données ; jamais pour
  //     X-Plane / Navigraph), cycled (adresse du cycle AIRAC), n [fr, en, de, es], url (chaîne, ou fonction du cycle), gives [4],
  //     lic [4] (d'après LICENSE.md), how [4]? (le geste pour l'obtenir) }.
  // Les cycles sont ceux d'airac.js (AeroAirac) : une adresse se construit pour une date d'effet « AAAA-MM-JJ » ou un « AANN ».
  // API : AeroCatalogue.{ SOURCES, ORDER, GROUPS, EAD_STATES, COVERAGE, READ_REASONS (codes de lecture → [fr, en, de, es]), byId, urlOf, eaipBase, cifpName, cifpUrl, siaPage, siaFileInfo,
  //   cifpFileInfo } ; AeroSources : le même objet avec cycleOf / cycleDate (écran « Sources », jusqu'à son retrait).
  const A = (typeof window !== 'undefined' ? window : self).AeroAirac;
  if (!A) throw new Error('catalogue.js: airac.js must be loaded first');
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  /** Date d'effet d'un cycle donné en « AANN », en date, ou rien (le cycle en vigueur). */
  const dateOf = c => (/^\d{4}$/.test(String(c || '')) ? A.cycleDate(c) : c ? A.cycleOf(c).date : A.cycleOf().date);
  /** Dossier AIRAC de l'eAIP du SIA : …/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01 (cycle « 2610 » ou date). Les
   *  dossiers des cycles passés sont retirés (404 le 26 octobre pour 2607 à 2609) ; celui du suivant paraît quelques jours avant. */
  function eaipBase(cycle) {
    const d = dateOf(cycle),
      [y, m, j] = d.split('-');
    return `https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_${j}_${MON[+m - 1]}_${y}/FRANCE/AIRAC-${d}`;
  }
  /** Nom du paquet CIFP de la FAA : CIFP_<aammjj> (date d'effet du cycle : 2610 → CIFP_261001). */
  function cifpName(cycle) {
    const [y, m, j] = dateOf(cycle).split('-');
    return `CIFP_${y.slice(2)}${m}${j}.zip`;
  }
  const cifpUrl = cycle => `https://aeronav.faa.gov/Upload_313-d/cifp/${cifpName(cycle)}`;
  /** Page du SIA du produit « Données aéronautiques XML » du cycle (rang dans l'année, deux chiffres, et année). */
  function siaPage(cycle) {
    const c = /^\d{4}$/.test(String(cycle || '')) ? cycle : A.idOf(dateOf(cycle));
    return `https://www.sia.aviation-civile.gouv.fr/produits-numeriques-en-libre-disposition/donnees-aeronautiques-xml-airac-${c.slice(2)}-${c.slice(0, 2)}.html`;
  }

  /** Nom d'un ZIP du SIA export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip (casse libre, copie « (1) » admise) : { ok, date, version, cycle
   *  (date d'effet du cycle en vigueur à cette date), id } ; ok faux si le nom ne suit pas le modèle. */
  function siaFileInfo(name) {
    const m = /^export_xml_bd_sia_(\d{4})-(\d{2})-(\d{2})(?:-v(\d+))?(?:\s*\(\d+\))?\.zip$/i.exec(String(name || '').trim());
    if (!m) return {
      ok: false
    };
    const date = `${m[1]}-${m[2]}-${m[3]}`,
      c = A.cycleOf(date);
    return {
      ok: true,
      date,
      version: m[4] ? +m[4] : 1,
      cycle: c.date,
      id: c.id
    };
  }
  /** Nom d'un CIFP fourni : CIFP_<aammjj>.zip → { ok, date, cycle (date d'effet), id }. */
  function cifpFileInfo(name) {
    const m = /^CIFP_(\d{2})(\d{2})(\d{2})(?:\s*\(\d+\))?\.zip$/i.exec(String(name || '').trim());
    if (!m) return {
      ok: false
    };
    const date = `20${m[1]}-${m[2]}-${m[3]}`,
      c = A.cycleOf(date);
    return {
      ok: true,
      date,
      cycle: c.date,
      id: c.id
    };
  }

  // ---------------------------------------------------------------------------------------------------- les sources
  // Une ligne par source : { id, no (ligne du tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md, ou null), status
  // ('used' : la suite s'en sert aujourd'hui ; 'candidate' : envisagée ; 'abandoned' : écartée, avec sa raison), cycled (adresse
  // du cycle AIRAC en vigueur), n [fr, en, de, es], url (chaîne, ou fonction du cycle), gives [4] (ce qu'elle donne et où cela
  // va), lic [4] (licence ou conditions, d'après LICENSE.md), how [4] (facultatif : le geste pour l'obtenir) }. Données seules :
  // l'écran (sources.js) ne fait qu'afficher des liens, aucune récupération.
  const SOURCES = [{
    id: 'sia',
    group: 'base',
    zones: ['fr'],
    fetch: {
      how: 'pick',
      glob: 'export_xml_bd_sia_*.zip',
      name: 'export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip'
    },
    build: {
      runtime: 'worker',
      id: 'sia'
    },
    publish: true,
    no: 1,
    status: 'used',
    cycled: true,
    n: ['SIA France (XML SIA + AIXM 4.5)', 'SIA France (XML SIA + AIXM 4.5)', 'SIA Frankreich (XML SIA + AIXM 4.5)',
      'SIA Francia (XML SIA + AIXM 4.5)'
    ],
    url: c => siaPage(c),
    gives: ['La base de la France : espaces, terrains, balises, points, points de report VFR, voies, obstacles (zone fr).',
      'The base of France: airspaces, aerodromes, navaids, points, VFR reporting points, airways, obstacles (zone fr).',
      'Die Basis Frankreichs: Lufträume, Flugplätze, Funkfeuer, Punkte, VFR-Meldepunkte, Luftstraßen, Hindernisse (Zone fr).',
      'La base de Francia: espacios, aeródromos, radioayudas, puntos, puntos de notificación VFR, aerovías, obstáculos (zona fr).'
    ],
    lic: ['Licence ouverte du SIA (source et date citées)', 'SIA open licence (source and date named)',
      'Offene Lizenz des SIA (Quelle und Datum genannt)', 'Licencia abierta del SIA (fuente y fecha citadas)'
    ],
    how: ['Sur la page du produit : la commande (0 €), puis le ZIP export_xml_bd_SIA_<date>-v<nn>.zip.',
      'On the product page: the order (0 €), then the ZIP export_xml_bd_SIA_<date>-v<nn>.zip.',
      'Auf der Produktseite: die Bestellung (0 €), dann die ZIP-Datei export_xml_bd_SIA_<Datum>-v<nn>.zip.',
      'En la página del producto: el pedido (0 €), luego el ZIP export_xml_bd_SIA_<fecha>-v<nn>.zip.'
    ]
  }, {
    id: 'geonames',
    group: 'base',
    zones: '*',
    fetch: {
      how: 'launcher',
      provider: 'geonames'
    },
    build: {
      runtime: 'worker',
      id: 'cities'
    },
    publish: true,
    no: 2,
    status: 'used',
    n: ['Villes (GeoNames)', 'Towns (GeoNames)', 'Städte (GeoNames)', 'Ciudades (GeoNames)'],
    url: 'https://download.geonames.org/export/dump/',
    gives: ['Les villes de chaque zone et les grandes villes du monde (carte, recherche de lieux).',
      'The towns of each zone and the world’s major towns (map, place search).',
      'Die Städte jeder Zone und die Großstädte der Welt (Karte, Ortssuche).',
      'Las ciudades de cada zona y las grandes ciudades del mundo (mapa, búsqueda de lugares).'
    ],
    lic: ['CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0', 'CC BY 4.0']
  }, {
    id: 'mora',
    group: 'base',
    zones: '*',
    fetch: {
      how: 'launcher',
      provider: 'terrain'
    },
    build: {
      runtime: 'worker',
      id: 'mora'
    },
    publish: true,
    no: 3,
    status: 'used',
    n: ['Relief (Terrain Tiles, Terrarium)', 'Elevation (Terrain Tiles, Terrarium)', 'Relief (Terrain Tiles, Terrarium)',
      'Relieve (Terrain Tiles, Terrarium)'
    ],
    url: 'https://registry.opendata.aws/terrain-tiles/',
    gives: ['Le relief : coupe verticale, grille MORA.', 'The terrain: vertical cut, MORA grid.',
      'Das Gelände: Vertikalschnitt, MORA-Gitter.',
      'El relieve: corte vertical, rejilla MORA.'
    ],
    lic: ['Sources ouvertes multiples, chacune citée', 'Several open sources, each named', 'Mehrere offene Quellen, jede genannt',
      'Varias fuentes abiertas, cada una citada'
    ]
  }, {
    id: 'dircam',
    group: 'base',
    zones: ['fr'],
    fetch: {
      how: 'pick',
      glob: '*ENR*5.7*.pdf'
    },
    build: {
      runtime: 'worker',
      id: 'aar'
    },
    publish: true,
    no: 4,
    status: 'used',
    n: ['DIRCAM MIAM ENR 5.7 (axes de ravitaillement)', 'DIRCAM MIAM ENR 5.7 (refuelling tracks)',
      'DIRCAM MIAM ENR 5.7 (Luftbetankung)', 'DIRCAM MIAM ENR 5.7 (reabastecimiento)'
    ],
    url: 'https://www.dircam.dsae.defense.gouv.fr/images/Stories/Doc/MIAM_OACI/MIAM_OACI_ENR%205.7.pdf',
    gives: ['Les axes de ravitaillement en vol de la France.', 'The air-to-air refuelling tracks of France.',
      'Die Luftbetankungsstrecken Frankreichs.', 'Los ejes de reabastecimiento en vuelo de Francia.'
    ],
    lic: ['MILAIP : réutilisation non commerciale, origine citée', 'MILAIP: non-commercial reuse, origin named',
      'MILAIP: nichtkommerzielle Nutzung, Herkunft genannt', 'MILAIP: reutilización no comercial, origen citado'
    ]
  }, {
    id: 'ukmil',
    group: 'base',
    zones: ['gb'],
    fetch: {
      how: 'launcher',
      provider: 'ukmil'
    },
    build: {
      runtime: 'python',
      id: 'ukmil_aip'
    },
    publish: true,
    no: 5,
    status: 'used',
    n: ['UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2'],
    url: 'https://www.aidu.mod.uk/aip/pdf/enr/ENR-5-2.pdf',
    gives: ['Les zones de vol à basse altitude et les axes de ravitaillement du Royaume-Uni (zone gb).',
      'The low-flying areas and refuelling tracks of the United Kingdom (zone gb).',
      'Die Tiefflugzonen und Betankungsstrecken des Vereinigten Königreichs (Zone gb).',
      'Las zonas de vuelo a baja altitud y los ejes de reabastecimiento del Reino Unido (zona gb).'
    ],
    lic: ['Open Government Licence v3.0', 'Open Government Licence v3.0', 'Open Government Licence v3.0',
      'Open Government Licence v3.0'
    ]
  }, {
    id: 'navcan',
    group: 'base',
    zones: ['ca'],
    fetch: {
      how: 'launcher',
      provider: 'navcan'
    },
    build: {
      runtime: 'python',
      id: 'navcan_dah'
    },
    publish: true,
    no: 6,
    status: 'used',
    n: ['NAV CANADA DAH', 'NAV CANADA DAH', 'NAV CANADA DAH', 'NAV CANADA DAH'],
    url: 'https://www.navcanada.ca/en/aeronautical-information/operational-guides.aspx',
    gives: ['Les espaces du Canada (zone ca), d’après le guide DAH daté.',
      'The airspaces of Canada (zone ca), from the dated DAH guide.',
      'Die Lufträume Kanadas (Zone ca), aus dem datierten DAH-Leitfaden.',
      'Los espacios de Canadá (zona ca), según la guía DAH fechada.'
    ],
    lic: ['NAV CANADA, usage de la suite', 'NAV CANADA, the suite’s use', 'NAV CANADA, Nutzung der Suite',
      'NAV CANADA, uso de la suite'
    ]
  }, {
    id: 'openaip',
    group: 'base',
    zones: '*',
    fetch: {
      how: 'launcher',
      provider: 'openaip'
    },
    build: {
      runtime: 'worker',
      id: 'openaip'
    },
    publish: true,
    no: 7,
    status: 'used',
    n: ['openAIP (exports par pays)', 'openAIP (exports per country)', 'openAIP (Exporte pro Land)',
      'openAIP (exportaciones por país)'
    ],
    url: 'https://www.openaip.net/',
    gives: ['Espaces, terrains, balises et points de report des zones sans source officielle ouverte.',
      'Airspaces, aerodromes, navaids and reporting points of the zones without an open official source.',
      'Lufträume, Flugplätze, Funkfeuer und Meldepunkte der Zonen ohne offene amtliche Quelle.',
      'Espacios, aeródromos, radioayudas y puntos de notificación de las zonas sin fuente oficial abierta.'
    ],
    lic: ['CC BY-NC 4.0 (non commercial)', 'CC BY-NC 4.0 (non-commercial)', 'CC BY-NC 4.0 (nicht kommerziell)',
      'CC BY-NC 4.0 (no comercial)'
    ]
  }, {
    id: 'enaire',
    group: 'base',
    zones: ['es'],
    fetch: {
      how: 'launcher',
      provider: 'enaire'
    },
    build: {
      runtime: 'worker',
      id: 'aixm5'
    },
    publish: true,
    no: 8,
    status: 'used',
    n: ['ENAIRE (Espagne, AIXM 5.1)', 'ENAIRE (Spain, AIXM 5.1)', 'ENAIRE (Spanien, AIXM 5.1)', 'ENAIRE (España, AIXM 5.1)'],
    url: 'https://aip.enaire.es/AIP/',
    gives: ['La base de l’Espagne (zone es) ; pas de procédures dans les jeux publiés.',
      'The base of Spain (zone es); no procedures in the published sets.',
      'Die Basis Spaniens (Zone es); keine Verfahren in den veröffentlichten Datensätzen.',
      'La base de España (zona es); sin procedimientos en los conjuntos publicados.'
    ],
    lic: ['Conditions d’ENAIRE : usage personnel', 'ENAIRE’s terms: personal use', 'Bedingungen von ENAIRE: persönliche Nutzung',
      'Condiciones de ENAIRE: uso personal'
    ]
  }, {
    id: 'adds',
    group: 'base',
    zones: ['us'],
    fetch: {
      how: 'launcher',
      provider: 'adds'
    },
    build: {
      runtime: 'worker',
      id: 'adds'
    },
    publish: true,
    no: 9,
    status: 'used',
    n: ['FAA ADDS (espaces à usage spécial, classes)', 'FAA ADDS (special use airspace, classes)',
      'FAA ADDS (Sonderlufträume, Klassen)',
      'FAA ADDS (espacios de uso especial, clases)'
    ],
    url: 'https://adds-faa.opendata.arcgis.com/',
    gives: ['Les espaces des États-Unis (zone us).', 'The airspaces of the United States (zone us).',
      'Die Lufträume der Vereinigten Staaten (Zone us).',
      'Los espacios de Estados Unidos (zona us).'
    ],
    lic: ['Domaine public (FAA)', 'Public domain (FAA)', 'Gemeinfrei (FAA)', 'Dominio público (FAA)']
  }, {
    id: 'nats',
    group: 'base',
    zones: ['gb'],
    fetch: {
      how: 'pick',
      glob: 'EG_*_DS_*_XML.zip',
      name: 'EG_…_DS_…_XML.zip'
    },
    build: {
      runtime: 'worker',
      id: 'aixm5'
    },
    publish: true,
    no: 10,
    status: 'used',
    n: ['NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)'],
    url: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/',
    gives: ['La base du Royaume-Uni (zone gb).', 'The base of the United Kingdom (zone gb).',
      'Die Basis des Vereinigten Königreichs (Zone gb).',
      'La base del Reino Unido (zona gb).'
    ],
    lic: ['Conditions de NATS (inscription) : usage personnel', 'NATS terms (registration): personal use',
      'Bedingungen von NATS (Registrierung): persönliche Nutzung', 'Condiciones de NATS (registro): uso personal'
    ],
    how: ['Après inscription : le ZIP EG_…_DS_…_XML.zip.', 'After registering: the ZIP EG_…_DS_…_XML.zip.',
      'Nach der Registrierung: die ZIP-Datei EG_…_DS_…_XML.zip.', 'Tras registrarse: el ZIP EG_…_DS_…_XML.zip.'
    ]
  }, {
    id: 'nat',
    group: 'weather',
    zones: ['nat'],
    fetch: {
      how: 'none'
    },
    build: {
      runtime: 'none',
      id: null
    },
    publish: false,
    no: 12,
    status: 'used',
    n: ['Routes NAT du jour (FAA)', 'NAT tracks of the day (FAA)', 'NAT-Routen des Tages (FAA)', 'Rutas NAT del día (FAA)'],
    url: 'https://nms.aim.faa.gov/datanat/nat.json',
    gives: ['Les routes de l’Atlantique Nord, deux fois par jour (zone nat).', 'The North Atlantic tracks, twice a day (zone nat).',
      'Die Nordatlantik-Routen, zweimal täglich (Zone nat).', 'Las rutas del Atlántico Norte, dos veces al día (zona nat).'
    ],
    lic: ['Domaine public (FAA)', 'Public domain (FAA)', 'Gemeinfrei (FAA)', 'Dominio público (FAA)']
  }, {
    id: 'vac',
    group: 'base',
    zones: ['fr'],
    fetch: {
      how: 'pick',
      glob: 'AD-2.*.pdf'
    },
    build: {
      runtime: 'python',
      id: 'report_vfr'
    },
    publish: true,
    no: 13,
    status: 'used',
    cycled: true,
    n: ['Cartes VAC du SIA', 'SIA VAC charts', 'SIA VAC-Karten', 'Cartas VAC del SIA'],
    url: c => `${eaipBase(c).replace(/\/FRANCE\/.*$/, '')}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFBD.pdf`,
    gives: ['Les points de report VFR et leurs séquences, carte par carte (exemple : LFBD).',
      'The VFR reporting points and their sequences, chart by chart (example: LFBD).',
      'Die VFR-Meldepunkte und ihre Abfolgen, Karte für Karte (Beispiel: LFBD).',
      'Los puntos de notificación VFR y sus secuencias, carta por carta (ejemplo: LFBD).'
    ],
    lic: ['Licence ouverte du SIA (source et date citées)', 'SIA open licence (source and date named)',
      'Offene Lizenz des SIA (Quelle und Datum genannt)', 'Licencia abierta del SIA (fuente y fecha citadas)'
    ]
  }, {
    id: 'eaip',
    group: 'proc',
    zones: ['fr'],
    fetch: {
      how: 'launcher',
      provider: 'eaip'
    },
    build: {
      runtime: 'python',
      id: 'proc_sia'
    },
    publish: true,
    no: 14,
    status: 'used',
    cycled: true,
    n: ['eAIP France', 'eAIP France', 'eAIP Frankreich', 'eAIP Francia'],
    url: c => `${eaipBase(c)}/html/eAIP/FR-menu-fr-FR.html`,
    gives: ['Les procédures RNAV et RNP (tables de codage des pages AD 2).',
      'The RNAV and RNP procedures (coding tables of the AD 2 pages).',
      'Die RNAV- und RNP-Verfahren (Codiertabellen der AD-2-Seiten).',
      'Los procedimientos RNAV y RNP (tablas de codificación de las páginas AD 2).'
    ],
    lic: ['Licence ouverte du SIA (source et date citées)', 'SIA open licence (source and date named)',
      'Offene Lizenz des SIA (Quelle und Datum genannt)', 'Licencia abierta del SIA (fuente y fecha citadas)'
    ]
  }, {
    id: 'cifp',
    group: 'proc',
    zones: ['us'],
    fetch: {
      how: 'launcher',
      provider: 'cifp',
      glob: 'CIFP_*.zip',
      name: 'CIFP_<aammjj>.zip'
    },
    build: {
      runtime: 'python',
      id: 'proc_cifp'
    },
    publish: true,
    no: 15,
    status: 'used',
    cycled: true,
    n: ['FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)'],
    url: c => cifpUrl(c),
    gives: ['Les procédures codées des États-Unis (SID, STAR, approches).',
      'The coded procedures of the United States (SID, STAR, approaches).',
      'Die codierten Verfahren der Vereinigten Staaten (SID, STAR, Anflüge).',
      'Los procedimientos codificados de Estados Unidos (SID, STAR, aproximaciones).'
    ],
    lic: ['Domaine public (FAA), avis conservé', 'Public domain (FAA), notice kept', 'Gemeinfrei (FAA), Hinweis beibehalten',
      'Dominio público (FAA), aviso conservado'
    ]
  }, {
    id: 'weather',
    group: 'weather',
    zones: [],
    fetch: {
      how: 'none'
    },
    build: {
      runtime: 'none',
      id: null
    },
    publish: false,
    no: 17,
    status: 'used',
    n: ['Météo mondiale (NOAA GFS, NOMADS)', 'World weather (NOAA GFS, NOMADS)', 'Weltwetter (NOAA GFS, NOMADS)',
      'Meteo mundial (NOAA GFS, NOMADS)'
    ],
    url: 'https://nomads.ncep.noaa.gov/',
    gives: ['Les vents et températures du monde, publiés avec le site toutes les 6 heures.',
      'The world’s winds and temperatures, published with the site every 6 hours.',
      'Winde und Temperaturen der Welt, alle 6 Stunden mit der Website veröffentlicht.',
      'Los vientos y temperaturas del mundo, publicados con el sitio cada 6 horas.'
    ],
    lic: ['Domaine public (NOAA)', 'Public domain (NOAA)', 'Gemeinfrei (NOAA)', 'Dominio público (NOAA)']
  }, {
    id: 'aircraft',
    group: 'aircraft',
    zones: [],
    fetch: {
      how: 'launcher',
      provider: 'aircraft'
    },
    build: {
      runtime: 'python',
      id: 'update_aircraft_db'
    },
    publish: true,
    no: 16,
    status: 'used',
    n: ['Types et performances d’aéronefs', 'Aircraft types and performance', 'Luftfahrzeugmuster und Leistungen',
      'Tipos y prestaciones de aeronaves'
    ],
    url: 'https://www.icao.int/publications/DOC8643/',
    gives: [
      'La base des types (OACI Doc 8643, recoupée EUROCONTROL, Wikidata) et des performances (EUROCONTROL APD, SimBrief) : AircraftDB/.',
      'The base of types (ICAO Doc 8643, cross-checked with EUROCONTROL, Wikidata) and of performance (EUROCONTROL APD, SimBrief): AircraftDB/.',
      'Die Musterbasis (ICAO Doc 8643, mit EUROCONTROL und Wikidata abgeglichen) und die Leistungen (EUROCONTROL APD, SimBrief): AircraftDB/.',
      'La base de tipos (OACI Doc 8643, cotejada con EUROCONTROL, Wikidata) y de prestaciones (EUROCONTROL APD, SimBrief): AircraftDB/.'
    ],
    lic: ['© OACI, © EUROCONTROL : dépôt privé seulement, jamais le site public',
      '© ICAO, © EUROCONTROL: private repository only, never the public site',
      '© ICAO, © EUROCONTROL: nur privates Repository, nie die öffentliche Website',
      '© OACI, © EUROCONTROL: solo repositorio privado, nunca el sitio público'
    ]
  }, {
    id: 'ead',
    group: 'proc',
    zones: '*',
    fetch: {
      how: 'launcher',
      provider: 'ead'
    },
    build: {
      runtime: 'python',
      id: 'proc_ead'
    },
    publish: true,
    no: null,
    status: 'candidate',
    n: ['EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)'],
    url: 'https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/login/ead-basic/',
    gives: ['Une bibliothèque des AIP en PDF (pages AD 2 des autres États), non opérationnelle ; à la main pour l’instant.',
      'A library of AIPs in PDF (AD 2 pages of other States), not operational; by hand for now.',
      'Eine Bibliothek der AIP als PDF (AD-2-Seiten anderer Staaten), nicht operationell; vorerst von Hand.',
      'Una biblioteca de AIP en PDF (páginas AD 2 de otros Estados), no operativa; a mano por ahora.'
    ],
    lic: ['Compte personnel EUROCONTROL ; droits de chaque État', 'EUROCONTROL personal account; each State’s rights',
      'Persönliches EUROCONTROL-Konto; Rechte jedes Staates', 'Cuenta personal de EUROCONTROL; derechos de cada Estado'
    ]
  }, {
    id: 'xpcifp',
    group: 'proc',
    zones: '*',
    fetch: {
      how: 'pick'
    },
    build: {
      runtime: 'python',
      id: 'xplane'
    },
    publish: false,
    no: null,
    status: 'candidate',
    n: ['CIFP d’X-Plane, Navigraph', 'X-Plane CIFP, Navigraph', 'X-Plane-CIFP, Navigraph', 'CIFP de X-Plane, Navigraph'],
    url: 'https://navigraph.com/',
    gives: ['Les procédures codées complètes, lues sur le poste seulement (secours).',
      'The full coded procedures, read on the workstation only (fallback).',
      'Die vollständigen codierten Verfahren, nur am Arbeitsplatz gelesen (Rückfall).',
      'Los procedimientos codificados completos, leídos solo en el puesto (recurso).'
    ],
    lic: ['Licence personnelle : jamais copiées ni publiées', 'Personal licence: never copied nor published',
      'Persönliche Lizenz: nie kopiert noch veröffentlicht', 'Licencia personal: nunca copiados ni publicados'
    ]
  }, {
    id: 'dfs',
    group: 'proc',
    zones: ['de'],
    fetch: {
      how: 'none'
    },
    build: {
      runtime: 'none',
      id: null
    },
    publish: false,
    no: null,
    status: 'abandoned',
    n: ['DFS (Allemagne, AIXM 5.1)', 'DFS (Germany, AIXM 5.1)', 'DFS (Deutschland, AIXM 5.1)', 'DFS (Alemania, AIXM 5.1)'],
    url: 'https://aip.dfs.de/datasets/',
    gives: ['Les procédures de l’Allemagne (« ED Procedure ») ; écartée : licence nécessaire, demande abandonnée (28 octobre 2026).',
      'The procedures of Germany (“ED Procedure”); set aside: a licence is needed, request abandoned (28 October 2026).',
      'Die Verfahren Deutschlands („ED Procedure“); zurückgestellt: Lizenz nötig, Anfrage aufgegeben (28. Oktober 2026).',
      'Los procedimientos de Alemania («ED Procedure»); descartada: hace falta licencia, solicitud abandonada (28 de octubre de 2026).'
    ],
    lic: ['Protégé par le droit d’auteur (licence de la DFS)', 'Copyrighted (DFS licence)',
      'Urheberrechtlich geschützt (Lizenz der DFS)',
      'Protegido por derechos de autor (licencia de la DFS)'
    ]
  }, {
    id: 'eurocontrol',
    group: 'proc',
    zones: [],
    fetch: {
      how: 'none'
    },
    build: {
      runtime: 'none',
      id: null
    },
    publish: false,
    no: null,
    status: 'abandoned',
    n: ['EUROCONTROL : jeux AIXM nationaux et échantillons', 'EUROCONTROL: national AIXM sets and samples',
      'EUROCONTROL: nationale AIXM-Datensätze und Beispiele', 'EUROCONTROL: conjuntos AIXM nacionales y muestras'
    ],
    url: 'https://ext.eurocontrol.int/aixm_confluence/',
    gives: [
      'Jeux AIXM 5.1 des États (Pologne 2018 sans segments, Suisse 2013) ; écartée : conditions inconnues, échantillons anciens.',
      'AIXM 5.1 sets of the States (Poland 2018 without legs, Switzerland 2013); set aside: unknown terms, old samples.',
      'AIXM-5.1-Datensätze der Staaten (Polen 2018 ohne Segmente, Schweiz 2013); zurückgestellt: Bedingungen unbekannt, alte Beispiele.',
      'Conjuntos AIXM 5.1 de los Estados (Polonia 2018 sin tramos, Suiza 2013); descartada: condiciones desconocidas, muestras antiguas.'
    ],
    lic: ['Conditions inconnues', 'Unknown terms', 'Bedingungen unbekannt', 'Condiciones desconocidas']
  }];
  /** Issue d'EAD Basic par État (EAD_BASIC.md § 8.1, relevé des 47 autorités du 28 octobre 2026) : 'read' (une disposition connue,
   *  `layout` ; `ocr` : des pages dessinées, lues par OCR), 'images' (cartes en image), 'labels' (étiquettes éparses), 'vfr' (VFR
   *  seulement), 'points' (listes de points seulement), 'prose' (descriptions en texte), 'sia' (la France vient du SIA, jamais d'EAD),
   *  'none' (rien obtenu). Seul 'read' rend la ligne « Lire un terrain » possible ; les autres la grisent avec leur raison. */
  const EAD_STATES = {
    UD: {
      outcome: 'read',
      layout: 'am-coding'
    },
    ED: {
      outcome: 'read',
      layout: 'de-route'
    },
    EG: {
      outcome: 'read',
      layout: 'uk-app',
      ocr: true
    },
    BI: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    EY: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    LI: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    LD: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    LA: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    RP: {
      outcome: 'read',
      layout: 'icao-tab'
    },
    EI: {
      outcome: 'read',
      layout: 'ei-coding'
    },
    LO: {
      outcome: 'read',
      layout: 'at-coding'
    },
    LZ: {
      outcome: 'read',
      layout: 'at-coding'
    },
    LU: {
      outcome: 'read',
      layout: 'de-route'
    },
    LP: {
      outcome: 'read',
      layout: 'de-route'
    },
    EP: {
      outcome: 'read',
      layout: 'de-route'
    },
    EB: {
      outcome: 'read',
      layout: 'be-coding',
      ocr: true
    },
    UG: {
      outcome: 'read',
      layout: 'ge-coding',
      ocr: true
    },
    LQ: {
      outcome: 'images'
    },
    LG: {
      outcome: 'images'
    },
    UB: {
      outcome: 'labels'
    },
    EK: {
      outcome: 'labels'
    },
    EE: {
      outcome: 'labels'
    },
    XX: {
      outcome: 'labels'
    },
    LH: {
      outcome: 'labels'
    },
    LJ: {
      outcome: 'labels'
    },
    EH: {
      outcome: 'labels'
    },
    ES: {
      outcome: 'labels'
    },
    EV: {
      outcome: 'labels'
    },
    LY: {
      outcome: 'labels'
    },
    UK: {
      outcome: 'labels'
    },
    LK: {
      outcome: 'vfr'
    },
    LM: {
      outcome: 'vfr'
    },
    LR: {
      outcome: 'points'
    },
    EF: {
      outcome: 'points'
    },
    EN: {
      outcome: 'prose'
    },
    OJ: {
      outcome: 'prose'
    },
    LE: {
      outcome: 'prose'
    },
    LC: {
      outcome: 'prose'
    },
    LW: {
      outcome: 'prose'
    },
    LS: {
      outcome: 'prose'
    },
    BG: {
      outcome: 'prose'
    },
    LF: {
      outcome: 'sia'
    },
    BK: {
      outcome: 'none'
    },
    LB: {
      outcome: 'none'
    },
    LT: {
      outcome: 'none'
    },
    UA: {
      outcome: 'none'
    },
    UC: {
      outcome: 'none'
    }
  };
  /** Libellés courts de la carte de couverture des procédures (SPEC § 5 et § 6, V3 § 10.22), pour une légende ou une
   *  infobulle de la Carte et du module Données : une entrée par raison de aerodb.coverage(icao) / coverageByState(), chacune
   *  [fr, en, de, es]. `lnm` est gardée pour plus tard mais aerodb ne la produit plus (pas de lecteur de Little Navmap, V3 § 10.29).
   *  C'est la même exception que `n`, `gives` et `lic` à l'invariant 4 de la SPEC (aerodb sans texte d'interface) :
   *  des textes du catalogue, dans les quatre langues, servis avec lui. Français : espace fine insécable (U+202F) avant : ; ! ? et
   *  dans « ». */
  const COVERAGE = {
    held: ['Procédures détenues', 'Procedures held', 'Verfahren vorhanden', 'Procedimientos disponibles'],
    sia: ['Lisible à la demande (eAIP du SIA)', 'Readable on demand (SIA eAIP)', 'Auf Anfrage lesbar (eAIP des SIA)',
      'Legible bajo demanda (eAIP del SIA)'
    ],
    ead: ['Lisible à la demande (EAD Basic)', 'Readable on demand (EAD Basic)', 'Auf Anfrage lesbar (EAD Basic)',
      'Legible bajo demanda (EAD Basic)'
    ],
    lnm: ['Lisible par Little Navmap (base du poste)', 'Readable by Little Navmap (workstation database)',
      'Von Little Navmap lesbar (Datenbank des Rechners)', 'Legible por Little Navmap (base del equipo)'
    ],
    images: ['Tables publiées en images', 'Tables published as images', 'Tabellen als Bilder veröffentlicht',
      'Tablas publicadas como imágenes'
    ],
    labels: ['Étiquettes seules, sans table', 'Labels only, no table', 'Nur Beschriftungen, keine Tabelle',
      'Solo etiquetas, sin tabla'
    ],
    points: ['Points publiés, sans table', 'Points published, no table', 'Punkte veröffentlicht, keine Tabelle',
      'Puntos publicados, sin tabla'
    ],
    prose: ['Procédures décrites en texte', 'Procedures described in text', 'Verfahren als Text beschrieben',
      'Procedimientos descritos en texto'
    ],
    vfr: ['Terrains VFR seulement', 'VFR aerodromes only', 'Nur VFR-Flugplätze', 'Solo aeródromos VFR'],
    none: ['Aucune procédure publiée', 'No procedure published', 'Keine Verfahren veröffentlicht', 'Ningún procedimiento publicado'],
    unknown: ['État non relevé', 'State not surveyed', 'Staat nicht erfasst', 'Estado no relevado']
  };
  /** Raisons de lecture des procédures (SPEC § 5 quinquies, V3 § 10.29 (c)) : UN code pour une page non lue (`formats[].reason`) ou une
   *  procédure douteuse (`doubt`), et le libellé court [fr, en, de, es] que Carburant (« N non lues ») et la Carte en montrent. aerodb ne produit
   *  jamais de phrase : `stats.reasons` ([code, nombre]) et ces codes se traduisent ici. Pages : layout (mise en page inconnue), low-read (moins
   *  de 85 % des lignes lues), title (titre non reconnu), no-legs (aucun tronçon), counts (comptes du bloc incohérents), vector (page dessinée,
   *  sans texte), timeout (lecture abandonnée). Procédures : geometry, unresolved, name, repeat, zigzag, unread. Même exception que COVERAGE à
   *  l'invariant 4 de la SPEC ; français : espace fine insécable (U+202F) avant : ; ! ? % et dans « ». */
  const READ_REASONS = {
    layout: ['mise en page non reconnue', 'layout not recognised', 'Seitenaufbau nicht erkannt', 'formato de página no reconocido'],
    'low-read': ['moins de 85 % des lignes lues', 'under 85 % of the rows read', 'unter 85 % der Zeilen gelesen',
      'menos del 85 % de las líneas leídas'
    ],
    title: ['titre de la page non reconnu', 'page title not recognised', 'Seitentitel nicht erkannt', 'título de página no reconocido'],
    'no-legs': ['aucun tronçon lisible', 'no readable leg', 'kein lesbarer Abschnitt', 'ningún tramo legible'],
    counts: ['comptes du bloc incohérents', 'block counts do not agree', 'Zählung des Blocks widersprüchlich',
      'recuentos del bloque incoherentes'
    ],
    vector: ['page dessinée, sans texte', 'drawn page, no text layer', 'gezeichnete Seite ohne Textebene',
      'página dibujada, sin capa de texto'
    ],
    timeout: ['lecture abandonnée (délai)', 'reading given up (time limit)', 'Lesen abgebrochen (Zeitlimit)',
      'lectura abandonada (tiempo límite)'
    ],
    geometry: ['géométrie incohérente', 'inconsistent geometry', 'inkonsistente Geometrie', 'geometría incoherente'],
    unresolved: ['positions non résolues', 'unresolved positions', 'Positionen nicht aufgelöst', 'posiciones sin resolver'],
    name: ['sans nom', 'no name', 'ohne Namen', 'sin nombre'],
    repeat: ['point répété hors attente', 'point repeated outside a holding', 'Punkt außerhalb einer Warteschleife wiederholt',
      'punto repetido fuera de una espera'
    ],
    zigzag: ['trajet en zigzag', 'zigzag path', 'Zickzack-Verlauf', 'trayecto en zigzag'],
    unread: ['lignes de la table non lues', 'table rows not read', 'Tabellenzeilen nicht gelesen', 'filas de la tabla sin leer']
  };
  const GROUPS = ['base', 'proc', 'aircraft', 'weather'];
  const ORDER = ['used', 'candidate', 'abandoned'];
  const byId = id => SOURCES.find(s => s.id === id) || null;
  /** Adresse d'une source pour un cycle (« 2610 », date ou rien : le cycle en vigueur). */
  const urlOf = (s, cycle) => typeof s.url === 'function' ? s.url(cycle || A.cycleOf().id) : s.url;
  const G = typeof window !== 'undefined' ? window : self;
  G.AeroCatalogue = {
    SOURCES,
    ORDER,
    GROUPS,
    EAD_STATES,
    COVERAGE,
    READ_REASONS,
    byId,
    urlOf,
    eaipBase,
    cifpName,
    cifpUrl,
    siaPage,
    siaFileInfo,
    cifpFileInfo
  };
  // l'écran « Sources » (sources.js) lit AeroSources, avec les fonctions de cycle : jusqu'à son retrait (lot D1 du module Données)
  G.AeroSources = {
    ...G.AeroCatalogue,
    cycleOf: A.cycleOf,
    cycleDate: A.cycleDate
  };
})();
