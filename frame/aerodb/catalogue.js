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
  // API : AeroCatalogue.{ SOURCES, ORDER, GROUPS, EAD_STATES (outcome, layout, names), COVERAGE, PARSER_VERSION, READ_REASONS (codes de lecture → [fr, en, de, es]), byId, urlOf, eaipBase, cifpName, cifpUrl, siaPage, siaFileInfo,
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
  /** Les régions de l'eAIP du SIA (SOG-0054) : le disque (…/eAIP_29_OCT_2026/) en publie cinq, de même disposition et de mêmes tables de codage ; chaque région a son dossier AIRAC, à SA date (écrite dans sa page d'accueil, non
   *  calculable : le lanceur la lit, proc/regions). Miroir de SIA_REGIONS de tools/proc_sia.py (vérifié par le cas K88) : les codes exacts avant les préfixes (LFVM et LFVP sont de CAR-SAM-NAM, non de FRANCE ; FM : la Réunion et Mayotte
   *  seulement, les autres terrains FM sont de Madagascar et des Comores). */
  const SIA_REGIONS = {
    FRANCE: {
      prefixes: ['LF'],
      codes: []
    },
    'PAC-P': {
      prefixes: ['NT'],
      codes: []
    },
    'PAC-N': {
      prefixes: ['NW', 'NL'],
      codes: []
    },
    RUN: {
      prefixes: [],
      codes: ['FMCZ', 'FMEE', 'FMEP']
    },
    'CAR-SAM-NAM': {
      prefixes: ['TF', 'SO'],
      codes: ['LFVM', 'LFVP']
    }
  };
  /** La région de l'eAIP du SIA qui publie ce terrain (« FRANCE », « PAC-P »…), ou null (un autre État, un code mal formé). */
  function siaRegionOf(icao) {
    const k = String(icao ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(k)) return null;
    for (const [region, r] of Object.entries(SIA_REGIONS))
      if (r.codes.includes(k)) return region;
    for (const [region, r] of Object.entries(SIA_REGIONS))
      if (r.prefixes.some(p => k.startsWith(p))) return region;
    return null;
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
  // va), lic [4] (licence ou conditions, d'après LICENSE.md), how [4] (facultatif : le geste pour l'obtenir), steps { page: { url, home }, files: [{ name, url?, gives [4] }] } (SOG-0189, facultatif : le pas-à-pas d'une source déposée à la main, lu par stepsOf), et, facultatifs, pour la page « Sources et licences » : pub (l'éditeur, texte ou [4] ; à défaut le début du nom),
  // credit [4] (le crédit obligatoire), date (la date ou l'édition : texte), localOnly (vrai : lu sur ce poste seulement) }. Données seules :
  // l'écran (sources.js) ne fait qu'afficher des liens, aucune récupération.
  const SOURCES = [{
    id: 'sia',
    group: 'base',
    steps: {
      page: {
        url: c => siaPage(c),
        home: 'https://www.sia.aviation-civile.gouv.fr/'
      },
      files: [{
        name: 'export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip',
        gives: ['XML SIA + AIXM 4.5 : toute la base de la France (espaces, terrains, balises, points, voies, obstacles)',
          'XML SIA + AIXM 4.5: the whole base of France (airspaces, aerodromes, navaids, points, airways, obstacles)',
          'XML SIA + AIXM 4.5: die ganze Basis Frankreichs (Lufträume, Flugplätze, Funkfeuer, Punkte, Luftstraßen, Hindernisse)',
          'XML SIA + AIXM 4.5: toda la base de Francia (espacios, aeródromos, radioayudas, puntos, aerovías, obstáculos)'
        ]
      }]
    },
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
    pub: 'SIA France (DGAC)',
    credit: ['Source : SIA, date de l’extraction', 'Source: SIA, date of the extract', 'Quelle: SIA, Datum des Auszugs',
      'Fuente: SIA, fecha de la extracción'
    ],
    localOnly: false,
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
    pub: 'GeoNames',
    credit: ['GeoNames, CC BY 4.0 (geonames.org)', 'GeoNames, CC BY 4.0 (geonames.org)', 'GeoNames, CC BY 4.0 (geonames.org)',
      'GeoNames, CC BY 4.0 (geonames.org)'
    ],
    localOnly: false,
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
    pub: 'Sources ouvertes multiples (relief, OpenStreetMap)',
    credit: ['Chaque source est citée ; OpenStreetMap : © contributeurs OpenStreetMap, ODbL',
      'Each source is cited; OpenStreetMap: © OpenStreetMap contributors, ODbL',
      'Jede Quelle wird genannt; OpenStreetMap: © OpenStreetMap-Mitwirkende, ODbL',
      'Se cita cada fuente; OpenStreetMap: © colaboradores de OpenStreetMap, ODbL'
    ],
    localOnly: false,
    lic: ['Sources ouvertes multiples, chacune citée', 'Several open sources, each named', 'Mehrere offene Quellen, jede genannt',
      'Varias fuentes abiertas, cada una citada'
    ]
  }, {
    id: 'dircam',
    group: 'base',
    steps: {
      page: {
        url: 'https://www.dircam.dsae.defense.gouv.fr/fr/milaip',
        home: 'https://www.dircam.dsae.defense.gouv.fr/'
      },
      files: [{
        name: 'MIAM_OACI_ENR 5.7.pdf',
        url: 'https://www.dircam.dsae.defense.gouv.fr/images/Stories/Doc/MIAM_OACI/MIAM_OACI_ENR%205.7.pdf',
        gives: ['ENR 5.7 · axes de ravitaillement en vol de la France', 'ENR 5.7 · air-to-air refuelling tracks of France',
          'ENR 5.7 · Luftbetankungsstrecken Frankreichs', 'ENR 5.7 · ejes de reabastecimiento en vuelo de Francia'
        ]
      }]
    },
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
    pub: 'DIRCAM (Armée de l’Air et de l’Espace)',
    credit: ['Source : DIRCAM, MILAIP (origine citée)', 'Source: DIRCAM, MILAIP (origin cited)',
      'Quelle: DIRCAM, MILAIP (Herkunft genannt)', 'Fuente: DIRCAM, MILAIP (origen citado)'
    ],
    localOnly: false,
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
    pub: 'UK Military AIP (Ministry of Defence)',
    credit: ['Contains public sector information licensed under the Open Government Licence v3.0',
      'Contains public sector information licensed under the Open Government Licence v3.0',
      'Contains public sector information licensed under the Open Government Licence v3.0',
      'Contains public sector information licensed under the Open Government Licence v3.0'
    ],
    localOnly: false,
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
    pub: 'NAV CANADA',
    credit: ['Source : NAV CANADA, Designated Airspace Handbook', 'Source: NAV CANADA, Designated Airspace Handbook',
      'Quelle: NAV CANADA, Designated Airspace Handbook', 'Fuente: NAV CANADA, Designated Airspace Handbook'
    ],
    localOnly: false,
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
    pub: 'openAIP',
    credit: ['© contributeurs openAIP, CC BY-NC 4.0 (non commercial)', '© openAIP contributors, CC BY-NC 4.0 (non-commercial)',
      '© openAIP-Mitwirkende, CC BY-NC 4.0 (nicht kommerziell)', '© colaboradores de openAIP, CC BY-NC 4.0 (no comercial)'
    ],
    localOnly: false,
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
    pub: 'ENAIRE (Espagne)',
    credit: ['Source : ENAIRE', 'Source: ENAIRE', 'Quelle: ENAIRE', 'Fuente: ENAIRE'],
    localOnly: false,
    lic: ['Conditions d’ENAIRE : usage personnel', 'ENAIRE’s terms: personal use', 'Bedingungen von ENAIRE: persönliche Nutzung',
      'Condiciones de ENAIRE: uso personal'
    ]
  }, {
    id: 'dfs',
    group: 'base',
    zones: ['de'],
    fetch: {
      how: 'launcher',
      provider: 'dfs'
    },
    build: {
      runtime: 'worker',
      id: 'aixm5'
    },
    publish: true,
    no: 19,
    status: 'used',
    n: ['DFS (Allemagne, routes ATS, AIXM 5.1)', 'DFS (Germany, ATS routes, AIXM 5.1)', 'DFS (Deutschland, ATS-Strecken, AIXM 5.1)',
      'DFS (Alemania, rutas ATS, AIXM 5.1)'
    ],
    url: 'https://aip.dfs.de/datasets/',
    gives: [
      'Les routes ATS (airways) de l’Allemagne (zone de), avec leurs niveaux et leur sens ; pas encore les espaces ni les points.',
      'The ATS routes (airways) of Germany (zone de), with their levels and direction; not the airspaces or the points yet.',
      'Die ATS-Strecken (Airways) Deutschlands (Zone de) mit Flugflächen und Richtung; noch keine Lufträume oder Punkte.',
      'Las rutas ATS (aerovías) de Alemania (zona de), con sus niveles y sentido; aún sin espacios ni puntos.'
    ],
    pub: 'DFS Deutsche Flugsicherung',
    credit: ['Source : DFS, CC BY 4.0', 'Source: DFS, CC BY 4.0', 'Quelle: DFS, CC BY 4.0', 'Fuente: DFS, CC BY 4.0'],
    date: '2026-10-28',
    localOnly: false,
    lic: ['CC BY 4.0, crédit DFS', 'CC BY 4.0, credit DFS', 'CC BY 4.0, Quellenangabe DFS', 'CC BY 4.0, crédito DFS']
  }, {
    id: 'airnav',
    group: 'base',
    zones: ['ie'],
    fetch: {
      how: 'launcher',
      provider: 'airnav'
    },
    build: {
      runtime: 'worker',
      id: 'geojson'
    },
    publish: true,
    no: 18,
    status: 'used',
    n: ['AirNav Ireland (eAIP d’Irlande)', 'AirNav Ireland (Irish eAIP)', 'AirNav Ireland (eAIP Irland)',
      'AirNav Ireland (eAIP de Irlanda)'
    ],
    url: 'https://www.airnav.ie/air-traffic-management/aeronautical-information-management',
    gives: [
      'Les points désignés et les routes RNAV de l’Irlande (zone ie) ; pas de procédures : l’eAIP irlandais n’en donne que sur cartes.',
      'The designated points and RNAV routes of Ireland (zone ie); no procedures: the Irish eAIP gives them on charts only.',
      'Die benannten Punkte und RNAV-Strecken Irlands (Zone ie); keine Verfahren: der irische eAIP gibt sie nur auf Karten.',
      'Los puntos designados y las rutas RNAV de Irlanda (zona ie); sin procedimientos: el eAIP irlandés los da solo en cartas.'
    ],
    pub: 'AirNav Ireland',
    credit: ['Source : AirNav Ireland (eAIP)', 'Source: AirNav Ireland (eAIP)', 'Quelle: AirNav Ireland (eAIP)',
      'Fuente: AirNav Ireland (eAIP)'
    ],
    localOnly: false,
    lic: ['Aucune licence de réutilisation trouvée : usage personnel', 'No reuse licence found: personal use',
      'Keine Weiterverwendungslizenz gefunden: persönliche Nutzung',
      'Sin licencia de reutilización: uso personal'
    ]
  }, {
    id: 'navpt',
    group: 'base',
    zones: ['pt'],
    fetch: {
      how: 'launcher',
      provider: 'navpt'
    },
    build: {
      runtime: 'worker',
      id: 'geojson'
    },
    publish: true,
    no: 21,
    status: 'used',
    n: ['NAV Portugal (eAIP du Portugal)', 'NAV Portugal (Portuguese eAIP)', 'NAV Portugal (eAIP Portugal)',
      'NAV Portugal (eAIP de Portugal)'
    ],
    url: 'https://www.nav.pt/ais',
    gives: [
      'Les points désignés et les routes (ENR 4.4, 3.1, 3.3) du Portugal (zone pt) ; pas de procédures.',
      'The designated points and routes (ENR 4.4, 3.1, 3.3) of Portugal (zone pt); no procedures.',
      'Die benannten Punkte und Strecken (ENR 4.4, 3.1, 3.3) Portugals (Zone pt); keine Verfahren.',
      'Los puntos designados y las rutas (ENR 4.4, 3.1, 3.3) de Portugal (zona pt); sin procedimientos.'
    ],
    pub: 'NAV Portugal, E.P.E.',
    credit: ['Source : NAV Portugal (eAIP)', 'Source: NAV Portugal (eAIP)', 'Quelle: NAV Portugal (eAIP)',
      'Fuente: NAV Portugal (eAIP)'
    ],
    localOnly: false,
    lic: ['Reproduction et redistribution par accord préalable de NAV Portugal (GEN 0.1) : usage personnel',
      'Reproduction and redistribution by prior agreement with NAV Portugal (GEN 0.1): personal use',
      'Vervielfältigung und Weitergabe nur nach vorheriger Vereinbarung mit NAV Portugal (GEN 0.1): persönliche Nutzung',
      'Reproducción y redistribución con acuerdo previo de NAV Portugal (GEN 0.1): uso personal'
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
    pub: 'FAA (États-Unis)',
    credit: ['Source : FAA (domaine public)', 'Source: FAA (public domain)', 'Quelle: FAA (gemeinfrei)',
      'Fuente: FAA (dominio público)'
    ],
    localOnly: false,
    lic: ['Domaine public (FAA)', 'Public domain (FAA)', 'Gemeinfrei (FAA)', 'Dominio público (FAA)']
  }, {
    id: 'nats',
    group: 'base',
    steps: {
      page: {
        url: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/',
        home: 'https://nats-uk.ead-it.com/'
      },
      files: [{
        name: 'EG_AIP_DS_<AAAAMMJJ>_XML.zip',
        gives: ['AIP · points, routes, balises, espaces et terrains du Royaume-Uni (zone gb)',
          'AIP · points, routes, navaids, airspaces and aerodromes of the United Kingdom (zone gb)',
          'AIP · Punkte, Strecken, Funkfeuer, Lufträume und Flugplätze des Vereinigten Königreichs (Zone gb)',
          'AIP · puntos, rutas, radioayudas, espacios y aeródromos del Reino Unido (zona gb)'
        ]
      }, {
        name: 'EG_OBS_DS_AREA1_FULL_<AAAAMMJJ>_XML.zip',
        gives: ['Obstacles du Royaume-Uni', 'Obstacles of the United Kingdom', 'Hindernisse des Vereinigten Königreichs',
          'Obstáculos del Reino Unido'
        ]
      }, {
        name: 'EG_UAS_…_XML.zip',
        gives: ['Zones UAS (drones) du Royaume-Uni', 'UAS (drone) zones of the United Kingdom',
          'UAS-Zonen (Drohnen) des Vereinigten Königreichs', 'Zonas UAS (drones) del Reino Unido'
        ]
      }]
    },
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
    pub: 'NATS (Royaume-Uni)',
    credit: ['Source : NATS, UK ICAO AIP Dataset', 'Source: NATS, UK ICAO AIP Dataset', 'Quelle: NATS, UK ICAO AIP Dataset',
      'Fuente: NATS, UK ICAO AIP Dataset'
    ],
    localOnly: false,
    lic: ['Conditions de NATS (inscription) : usage personnel', 'NATS terms (registration): personal use',
      'Bedingungen von NATS (Registrierung): persönliche Nutzung', 'Condiciones de NATS (registro): uso personal'
    ],
    how: ['Après inscription : le ZIP EG_…_DS_…_XML.zip.', 'After registering: the ZIP EG_…_DS_…_XML.zip.',
      'Nach der Registrierung: die ZIP-Datei EG_…_DS_…_XML.zip.', 'Tras registrarse: el ZIP EG_…_DS_…_XML.zip.'
    ]
  }, {
    id: 'lfv',
    group: 'base',
    steps: {
      page: {
        url: 'https://www.aro.lfv.se/content/eaip/default_offline.html',
        home: 'https://www.aro.lfv.se/'
      },
      files: [{
        name: 'AIP_OFFLINE.zip',
        url: 'https://aro.lfv.se/Content/eaip/AIP_OFFLINE.zip',
        gives: ['eAIP de la Suède hors ligne (environ 1 Go) · ENR 4.4 points désignés et ENR 3.2 routes RNAV (zone se)',
          'Sweden eAIP offline (about 1 GB) · ENR 4.4 designated points and ENR 3.2 RNAV routes (zone se)',
          'Schwedens eAIP offline (rund 1 GB) · ENR 4.4 benannte Punkte und ENR 3.2 RNAV-Strecken (Zone se)',
          'eAIP de Suecia sin conexión (unos 1 GB) · ENR 4.4 puntos designados y ENR 3.2 rutas RNAV (zona se)'
        ]
      }]
    },
    zones: ['se'],
    fetch: {
      how: 'pick',
      glob: 'AIP_OFFLINE*.zip',
      name: 'AIP_OFFLINE.zip'
    },
    build: {
      runtime: 'worker',
      id: 'geojson'
    },
    publish: true,
    no: 20,
    status: 'used',
    n: ['LFV (eAIP de Suède)', 'LFV (Sweden eAIP)', 'LFV (eAIP Schweden)', 'LFV (eAIP de Suecia)'],
    url: 'https://aro.lfv.se/Editorial/View/IAIP?folderId=4',
    gives: [
      'Les points désignés (ENR 4.4) et les routes RNAV (ENR 3.2) de la Suède (zone se) ; pas de procédures : les SID et STAR ne sont que sur cartes PDF.',
      'The designated points (ENR 4.4) and RNAV routes (ENR 3.2) of Sweden (zone se); no procedures: the SIDs and STARs are on PDF charts only.',
      'Die benannten Punkte (ENR 4.4) und RNAV-Strecken (ENR 3.2) Schwedens (Zone se); keine Verfahren: SID und STAR stehen nur auf PDF-Karten.',
      'Los puntos designados (ENR 4.4) y las rutas RNAV (ENR 3.2) de Suecia (zona se); sin procedimientos: las SID y STAR solo están en cartas PDF.'
    ],
    pub: 'LFV (Suède), sous l’autorité de l’Agence suédoise des transports',
    credit: ['Source : LFV, AIP Suède (aucune condition de réutilisation publiée)',
      'Source: LFV, AIP Sweden (no reuse condition published)',
      'Quelle: LFV, AIP Schweden (keine Weiterverwendungsbedingung veröffentlicht)',
      'Fuente: LFV, AIP Suecia (sin condición de reutilización publicada)'
    ],
    date: '2026-11-10',
    localOnly: false,
    lic: [
      'AIP publié sous l’autorité de l’Agence suédoise des transports, produit par LFV ; aucune condition de réutilisation donnée (ES-GEN 0.1) : usage personnel, lu sur ce poste',
      'AIP published by authority of the Swedish Transport Agency, produced by LFV; no reuse condition given (ES-GEN 0.1): personal use, read on this workstation',
      'AIP im Auftrag der schwedischen Verkehrsbehörde veröffentlicht, von LFV erstellt; keine Weiterverwendungsbedingung angegeben (ES-GEN 0.1): persönliche Nutzung, auf diesem Rechner gelesen',
      'AIP publicado por la Agencia sueca de transporte, producido por LFV; sin condición de reutilización (ES-GEN 0.1): uso personal, leído en este equipo'
    ],
    how: [
      'Le fichier AIP_OFFLINE.zip (eAIP hors ligne, environ 1 Go), laissé dans Téléchargements : seules quelques pages en sont lues.',
      'The file AIP_OFFLINE.zip (offline eAIP, about 1 GB), left in Downloads: only a few pages of it are read.',
      'Die Datei AIP_OFFLINE.zip (Offline-eAIP, rund 1 GB) im Download-Ordner: nur einige Seiten werden gelesen.',
      'El archivo AIP_OFFLINE.zip (eAIP sin conexión, unos 1 GB), dejado en Descargas: solo se leen algunas páginas.'
    ]
  }, {
    // Danemark (Naviair) : source déposée à la main, lecture À VENIR (SOG-0189 / SOG-0153, 10 nov. 2026). Rien n'est lu par le lanceur ;
    // le futur lecteur local écrira dans data/local seulement, jamais dans sia/base (les conditions de l'AIP danois, GEN 0.1 § 6,
    // interdisent toute reproduction sans accord écrit de l'autorité : frame/aerodb/NAVIAIR_LICENCE_REQUEST.md).
    id: 'naviair',
    localOnly: true,
    group: 'base',
    steps: {
      page: {
        url: 'https://aim.naviair.dk/en/',
        home: 'https://aim.naviair.dk/'
      },
      files: [{
        name: 'EK_ENR_3_2_en.pdf',
        url: 'https://aim.naviair.dk/media/files/mmsbfi0p2t1/EK_ENR_3_2_en.pdf',
        gives: [
          'ENR 3.2 · routes RNAV du Danemark, du Groenland et des îles Féroé (le lien direct donné est l’édition AIRAC 06/24 : la page liste le fichier du cycle en cours)',
          'ENR 3.2 · RNAV routes of Denmark, Greenland and the Faroe Islands (the direct link given is the AIRAC 06/24 edition: the page lists the file of the current cycle)',
          'ENR 3.2 · RNAV-Strecken Dänemarks, Grönlands und der Färöer (der angegebene Direktlink ist die Ausgabe AIRAC 06/24: die Seite listet die Datei des aktuellen Zyklus)',
          'ENR 3.2 · rutas RNAV de Dinamarca, Groenlandia y las Feroe (el enlace directo dado es la edición AIRAC 06/24: la página lista el archivo del ciclo en curso)'
        ]
      }, {
        name: 'EK_ENR_2_1_en.pdf',
        gives: ['ENR 2.1 · espaces aériens (FIR, TMA, CTA) du Danemark, du Groenland et des îles Féroé, à chercher sur la page',
          'ENR 2.1 · airspaces (FIR, TMA, CTA) of Denmark, Greenland and the Faroe Islands, to find on the page',
          'ENR 2.1 · Lufträume (FIR, TMA, CTA) Dänemarks, Grönlands und der Färöer, auf der Seite zu suchen',
          'ENR 2.1 · espacios aéreos (FIR, TMA, CTA) de Dinamarca, Groenlandia y las Feroe, para buscar en la página'
        ]
      }, {
        name: 'EK_AD_2_EKOD_RNP_RWY_24_2_en.pdf',
        url: 'https://aim.naviair.dk/media/files/sup1b1iyaxv/EK_AD_2_EKOD_RNP_RWY_24_2_en.pdf',
        gives: [
          'AD 2 · exemple de procédure (Odense, RNP piste 24) : les procédures sont des PDF, une carte par fichier, utile à la page 2',
          'AD 2 · example of a procedure (Odense, RNP runway 24): procedures are PDFs, one chart per file, useful on page 2',
          'AD 2 · Beispiel eines Verfahrens (Odense, RNP Piste 24): Verfahren sind PDFs, eine Karte je Datei, nützlich auf Seite 2',
          'AD 2 · ejemplo de procedimiento (Odense, RNP pista 24): los procedimientos son PDF, una carta por archivo, útil en la página 2'
        ]
      }]
    },
    zones: ['dk'],
    fetch: {
      how: 'pick',
      glob: 'EK_*.pdf',
      name: 'EK_….pdf'
    },
    build: {
      runtime: 'none',
      id: null
    },
    publish: false,
    no: null,
    status: 'candidate',
    n: ['Naviair (AIP du Danemark)', 'Naviair (AIP Denmark)', 'Naviair (AIP Dänemark)', 'Naviair (AIP de Dinamarca)'],
    url: 'https://aim.naviair.dk/en/',
    gives: [
      'Les routes (ENR 3.2), les espaces (ENR 2.1) et les procédures (AD 2) du Danemark : à déposer ; lecture à venir (le lanceur ne lit rien, le lecteur local n’est pas encore livré).',
      'The routes (ENR 3.2), airspaces (ENR 2.1) and procedures (AD 2) of Denmark: to be dropped by hand; reading to come (the launcher reads nothing, the local reader is not delivered yet).',
      'Die Strecken (ENR 3.2), Lufträume (ENR 2.1) und Verfahren (AD 2) Dänemarks: von Hand abzulegen; Lesen folgt (der Launcher liest nichts, der lokale Leser ist noch nicht geliefert).',
      'Las rutas (ENR 3.2), los espacios (ENR 2.1) y los procedimientos (AD 2) de Dinamarca: a depositar a mano; lectura por venir (el lanzador no lee nada, el lector local aún no está entregado).'
    ],
    pub: 'Naviair (Danemark), pour la Trafikstyrelsen',
    credit: ['Source : Naviair, AIP Danemark', 'Source: Naviair, AIP Denmark', 'Quelle: Naviair, AIP Dänemark',
      'Fuente: Naviair, AIP Dinamarca'
    ],
    date: '2026-11-10',
    lic: [
      'AIP du Danemark (GEN 0.1 § 6) : aucune reproduction sans accord écrit de l’autorité danoise ; lu sur ce poste seulement, jamais publié (demande d’accord prête)',
      'AIP of Denmark (GEN 0.1 § 6): no reproduction without the written permission of the Danish authority; read on this workstation only, never published (permission request ready)',
      'AIP Dänemarks (GEN 0.1 § 6): keine Vervielfältigung ohne schriftliche Erlaubnis der dänischen Behörde; nur auf diesem Rechner gelesen, nie veröffentlicht (Anfrage bereit)',
      'AIP de Dinamarca (GEN 0.1 § 6): ninguna reproducción sin permiso escrito de la autoridad danesa; leído solo en este equipo, nunca publicado (solicitud lista)'
    ],
    how: [
      'Les fichiers EK_….pdf de la page Naviair, laissés dans Téléchargements ; rien n’est lu pour l’instant.',
      'The EK_….pdf files from the Naviair page, left in Downloads; nothing is read for now.',
      'Die EK_….pdf-Dateien der Naviair-Seite im Download-Ordner; vorerst wird nichts gelesen.',
      'Los archivos EK_….pdf de la página de Naviair, dejados en Descargas; por ahora no se lee nada.'
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
    pub: 'FAA (États-Unis)',
    credit: ['Source : FAA, tracks NAT (domaine public)', 'Source: FAA, NAT tracks (public domain)',
      'Quelle: FAA, NAT-Tracks (gemeinfrei)', 'Fuente: FAA, tracks NAT (dominio público)'
    ],
    localOnly: false,
    lic: ['Domaine public (FAA)', 'Public domain (FAA)', 'Gemeinfrei (FAA)', 'Dominio público (FAA)']
  }, {
    id: 'vac',
    group: 'base',
    steps: {
      page: {
        url: c => `${eaipBase(c).replace(/\/FRANCE\/.*$/, '')}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFBD.pdf`,
        home: 'https://www.sia.aviation-civile.gouv.fr/'
      },
      files: [{
        name: 'AD-2.<OACI>.pdf',
        gives: ['Une carte VAC par terrain (exemple : AD-2.LFBD.pdf) · points de report VFR et leurs séquences',
          'One VAC chart per aerodrome (example: AD-2.LFBD.pdf) · VFR reporting points and their sequences',
          'Eine VAC-Karte je Flugplatz (Beispiel: AD-2.LFBD.pdf) · VFR-Meldepunkte und ihre Abfolgen',
          'Una carta VAC por aeródromo (ejemplo: AD-2.LFBD.pdf) · puntos de notificación VFR y sus secuencias'
        ]
      }]
    },
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
    pub: 'SIA (DGAC, France)',
    credit: ['Source : SIA, cartes VAC', 'Source: SIA, VAC charts', 'Quelle: SIA, VAC-Karten', 'Fuente: SIA, cartas VAC'],
    localOnly: false,
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
    pub: 'SIA (DGAC, France)',
    credit: ['Source : SIA, eAIP France', 'Source: SIA, eAIP France', 'Quelle: SIA, eAIP Frankreich', 'Fuente: SIA, eAIP Francia'],
    localOnly: false,
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
    pub: 'FAA (États-Unis)',
    credit: ['Source : FAA, CIFP (domaine public, avis conservé)', 'Source: FAA, CIFP (public domain, notice kept)',
      'Quelle: FAA, CIFP (gemeinfrei, Hinweis beibehalten)', 'Fuente: FAA, CIFP (dominio público, aviso conservado)'
    ],
    localOnly: false,
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
    pub: 'NOAA (États-Unis)',
    credit: ['Source : NOAA, NOMADS (domaine public)', 'Source: NOAA, NOMADS (public domain)', 'Quelle: NOAA, NOMADS (gemeinfrei)',
      'Fuente: NOAA, NOMADS (dominio público)'
    ],
    localOnly: false,
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
    pub: 'OACI, EUROCONTROL',
    credit: ['© OACI, © EUROCONTROL : dépôt privé seulement, jamais le site public',
      '© ICAO, © EUROCONTROL: private repository only, never the public site',
      '© ICAO, © EUROCONTROL: nur privates Repository, nie die öffentliche Seite',
      '© OACI, © EUROCONTROL: solo repositorio privado, nunca el sitio público'
    ],
    localOnly: false,
    lic: ['© OACI, © EUROCONTROL : dépôt privé seulement, jamais le site public',
      '© ICAO, © EUROCONTROL: private repository only, never the public site',
      '© ICAO, © EUROCONTROL: nur privates Repository, nie die öffentliche Website',
      '© OACI, © EUROCONTROL: solo repositorio privado, nunca el sitio público'
    ]
  }, {
    id: 'ead',
    localOnly: true, // lu sur CE poste seulement : propriétaire (X-Plane, EUROCONTROL), jamais dans la base publiée ni dans un export, coche « usage personnel » ou non (SOG-0162)
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
    localOnly: true, // lu sur CE poste seulement : propriétaire (X-Plane, EUROCONTROL), jamais dans la base publiée ni dans un export, coche « usage personnel » ou non (SOG-0162)
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
    pub: 'DFS Deutsche Flugsicherung',
    credit: ['Source : DFS (protégé par le droit d’auteur, licence de la DFS demandée)',
      'Source: DFS (copyrighted, DFS licence requested)', 'Quelle: DFS (urheberrechtlich geschützt, DFS-Lizenz angefragt)',
      'Fuente: DFS (protegido por derechos de autor, licencia de la DFS solicitada)'
    ],
    date: '2026-10-25',
    localOnly: false,
    lic: ['Protégé par le droit d’auteur (licence de la DFS)', 'Copyrighted (DFS licence)',
      'Urheberrechtlich geschützt (Lizenz der DFS)',
      'Protegido por derechos de autor (licencia de la DFS)'
    ]
  }, {
    id: 'eurocontrol_rad',
    localOnly: true, // lu sur CE poste seulement : propriétaire (X-Plane, EUROCONTROL), jamais dans la base publiée ni dans un export, coche « usage personnel » ou non (SOG-0162)
    group: 'proc',
    zones: [],
    steps: {
      page: {
        url: 'https://www.nm.eurocontrol.int/RAD/',
        home: 'https://www.nm.eurocontrol.int/'
      },
      files: [{
        name: 'RAD_<cycle>_v….xlsx',
        gives: ['Le RAD (Rolling RAD Document) : interdictions et conditions de route, un classeur par cycle',
          'The RAD (Rolling RAD Document): route restrictions and conditions, one workbook per cycle',
          'Das RAD (Rolling RAD Document): Streckeneinschränkungen und -bedingungen, eine Arbeitsmappe je Zyklus',
          'El RAD (Rolling RAD Document): restricciones y condiciones de ruta, un libro por ciclo'
        ]
      }, {
        name: 'eurocontrol-airac-<cycle>-fra-points-….xlsx',
        gives: ['Les points significatifs FRA : rôles entrée / sortie / intermédiaire, niveaux, horaires',
          'The FRA significant points: entry / exit / intermediate roles, levels, times',
          'Die signifikanten FRA-Punkte: Rollen Eintritt / Austritt / Zwischenpunkt, Ebenen, Zeiten',
          'Los puntos significativos FRA: funciones entrada / salida / intermedio, niveles, horarios'
        ]
      }]
    },
    fetch: {
      how: 'pick',
      glob: 'RAD_*.xlsx'
    },
    build: {
      runtime: 'python',
      id: 'route_engine/import_books'
    },
    publish: true,
    no: 17,
    status: 'used',
    cycled: true,
    n: ['EUROCONTROL : RAD et points FRA (classeurs)', 'EUROCONTROL: RAD and FRA points (workbooks)',
      'EUROCONTROL: RAD und FRA-Punkte (Arbeitsmappen)', 'EUROCONTROL: RAD y puntos FRA (libros)'
    ],
    url: 'https://www.nm.eurocontrol.int/RAD/',
    gives: [
      'Le calcul de route : interdictions et conditions du RAD (Rolling RAD Document, un classeur par cycle) et points significatifs FRA (rôles entrée / sortie / intermédiaire, niveaux, horaires), compilés dans data/route/ (job route/import-rad ; fichiers pris dans Téléchargements).',
      'Route calculation: the RAD restrictions and conditions (Rolling RAD Document, one workbook per cycle) and the FRA significant points (entry / exit / intermediate roles, levels, times), compiled into data/route/ (job route/import-rad; files taken from Downloads).',
      'Streckenberechnung: Einschränkungen und Bedingungen des RAD (Rolling RAD Document, eine Arbeitsmappe je Zyklus) und signifikante FRA-Punkte (Rollen Eintritt / Austritt / Zwischenpunkt, Ebenen, Zeiten), in data/route/ kompiliert (Job route/import-rad; Dateien aus Downloads).',
      'Cálculo de ruta: restricciones y condiciones del RAD (Rolling RAD Document, un libro por ciclo) y puntos significativos FRA (funciones entrada / salida / intermedio, niveles, horarios), compilados en data/route/ (trabajo route/import-rad; archivos tomados de Descargas).'
    ],
    lic: [
      'Documents EUROCONTROL Network Manager : usage de la compagnie, publiés dans son dépôt privé seulement (conditions de réutilisation à confirmer)',
      'EUROCONTROL Network Manager documents: use by the company, published in its private repository only (terms of reuse to be confirmed)',
      'EUROCONTROL-Network-Manager-Dokumente: Nutzung durch die Gesellschaft, nur in ihrem privaten Repository veröffentlicht (Weiterverwendungsbedingungen zu bestätigen)',
      'Documentos de EUROCONTROL Network Manager: uso de la compañía, publicados solo en su repositorio privado (condiciones de reutilización por confirmar)'
    ]
  }, {
    id: 'eurocontrol',
    localOnly: true, // lu sur CE poste seulement : propriétaire (X-Plane, EUROCONTROL), jamais dans la base publiée ni dans un export, coche « usage personnel » ou non (SOG-0162)
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
   *  'none' (rien obtenu). Seul 'read' rend la ligne « Lire un terrain » possible ; les autres la grisent avec leur raison.
   *  `names` : le nom de l'État [fr, en, de, es] (le module Données et aerodb.coverageByState() s'en servent ; un nom est une donnée, comme
   *  `n` des sources). */
  const EAD_STATES = {
    UD: {
      names: ['Arménie', 'Armenia', 'Armenien', 'Armenia'],
      outcome: 'read',
      layout: 'am-coding'
    },
    ED: {
      names: ['Allemagne', 'Germany', 'Deutschland', 'Alemania'],
      outcome: 'read',
      layout: 'de-route'
    },
    EG: {
      names: ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'],
      outcome: 'read',
      layout: 'uk-app',
      ocr: true
    },
    BI: {
      names: ['Islande', 'Iceland', 'Island', 'Islandia'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    EY: {
      names: ['Lituanie', 'Lithuania', 'Litauen', 'Lituania'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    LI: {
      names: ['Italie', 'Italy', 'Italien', 'Italia'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    LD: {
      names: ['Croatie', 'Croatia', 'Kroatien', 'Croacia'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    LA: {
      names: ['Albanie', 'Albania', 'Albanien', 'Albania'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    RP: {
      names: ['Philippines', 'Philippines', 'Philippinen', 'Filipinas'],
      outcome: 'read',
      layout: 'icao-tab'
    },
    EI: {
      names: ['Irlande', 'Ireland', 'Irland', 'Irlanda'],
      outcome: 'read',
      layout: 'ei-coding'
    },
    LO: {
      names: ['Autriche', 'Austria', 'Österreich', 'Austria'],
      outcome: 'read',
      layout: 'at-coding'
    },
    LZ: {
      names: ['Slovaquie', 'Slovakia', 'Slowakei', 'Eslovaquia'],
      outcome: 'read',
      layout: 'at-coding'
    },
    LU: {
      names: ['Moldavie', 'Moldova', 'Moldau', 'Moldavia'],
      outcome: 'read',
      layout: 'de-route'
    },
    LP: {
      names: ['Portugal', 'Portugal', 'Portugal', 'Portugal'],
      outcome: 'read',
      layout: 'de-route'
    },
    EP: {
      names: ['Pologne', 'Poland', 'Polen', 'Polonia'],
      outcome: 'read',
      layout: 'de-route'
    },
    EB: {
      names: ['Belgique', 'Belgium', 'Belgien', 'Bélgica'],
      outcome: 'read',
      layout: 'be-coding',
      ocr: true
    },
    UG: {
      names: ['Géorgie', 'Georgia', 'Georgien', 'Georgia'],
      outcome: 'read',
      layout: 'ge-coding',
      ocr: true
    },
    LQ: {
      names: ['Bosnie-Herzégovine', 'Bosnia and Herzegovina', 'Bosnien und Herzegowina', 'Bosnia y Herzegovina'],
      outcome: 'images'
    },
    LG: {
      names: ['Grèce', 'Greece', 'Griechenland', 'Grecia'],
      outcome: 'images'
    },
    UB: {
      names: ['Azerbaïdjan', 'Azerbaijan', 'Aserbaidschan', 'Azerbaiyán'],
      outcome: 'labels'
    },
    EK: {
      names: ['Danemark', 'Denmark', 'Dänemark', 'Dinamarca'],
      outcome: 'labels'
    },
    EE: {
      names: ['Estonie', 'Estonia', 'Estland', 'Estonia'],
      outcome: 'labels'
    },
    XX: {
      names: ['Autorité XX d’EAD (fichiers EK_)', 'EAD authority XX (EK_ files)', 'EAD-Behörde XX (EK_-Dateien)',
        'Autoridad XX de EAD (archivos EK_)'
      ],
      outcome: 'labels'
    },
    LH: {
      names: ['Hongrie', 'Hungary', 'Ungarn', 'Hungría'],
      outcome: 'labels'
    },
    LJ: {
      names: ['Slovénie', 'Slovenia', 'Slowenien', 'Eslovenia'],
      outcome: 'labels'
    },
    EH: {
      names: ['Pays-Bas', 'Netherlands', 'Niederlande', 'Países Bajos'],
      outcome: 'labels'
    },
    ES: {
      names: ['Suède', 'Sweden', 'Schweden', 'Suecia'],
      outcome: 'labels'
    },
    EV: {
      names: ['Lettonie', 'Latvia', 'Lettland', 'Letonia'],
      outcome: 'labels'
    },
    LY: {
      names: ['Serbie et Monténégro', 'Serbia and Montenegro', 'Serbien und Montenegro', 'Serbia y Montenegro'],
      outcome: 'labels'
    },
    UK: {
      names: ['Ukraine', 'Ukraine', 'Ukraine', 'Ucrania'],
      outcome: 'labels'
    },
    LK: {
      names: ['Tchéquie', 'Czechia', 'Tschechien', 'Chequia'],
      outcome: 'vfr'
    },
    LM: {
      names: ['Malte', 'Malta', 'Malta', 'Malta'],
      outcome: 'vfr'
    },
    LR: {
      names: ['Roumanie', 'Romania', 'Rumänien', 'Rumanía'],
      outcome: 'points'
    },
    EF: {
      names: ['Finlande', 'Finland', 'Finnland', 'Finlandia'],
      outcome: 'points'
    },
    EN: {
      names: ['Norvège', 'Norway', 'Norwegen', 'Noruega'],
      outcome: 'prose'
    },
    OJ: {
      names: ['Jordanie', 'Jordan', 'Jordanien', 'Jordania'],
      outcome: 'prose'
    },
    LE: {
      names: ['Espagne', 'Spain', 'Spanien', 'España'],
      outcome: 'prose'
    },
    LC: {
      names: ['Chypre', 'Cyprus', 'Zypern', 'Chipre'],
      outcome: 'prose'
    },
    LW: {
      names: ['Macédoine du Nord', 'North Macedonia', 'Nordmazedonien', 'Macedonia del Norte'],
      outcome: 'prose'
    },
    LS: {
      names: ['Suisse', 'Switzerland', 'Schweiz', 'Suiza'],
      outcome: 'prose'
    },
    BG: {
      names: ['Groenland', 'Greenland', 'Grönland', 'Groenlandia'],
      outcome: 'prose'
    },
    LF: {
      names: ['France', 'France', 'Frankreich', 'Francia'],
      outcome: 'sia'
    },
    BK: {
      names: ['Kosovo', 'Kosovo', 'Kosovo', 'Kosovo'],
      outcome: 'none'
    },
    LB: {
      names: ['Bulgarie', 'Bulgaria', 'Bulgarien', 'Bulgaria'],
      outcome: 'none'
    },
    LT: {
      names: ['Turquie', 'Türkiye', 'Türkei', 'Turquía'],
      outcome: 'none'
    },
    UA: {
      names: ['Kazakhstan', 'Kazakhstan', 'Kasachstan', 'Kazajistán'],
      outcome: 'none'
    },
    UC: {
      names: ['Kirghizistan', 'Kyrgyzstan', 'Kirgisistan', 'Kirguistán'],
      outcome: 'none'
    }
  };
  /** Libellés courts de la carte de couverture des procédures (SPEC § 5 et § 6, V3 § 10.22), pour une légende ou une
   *  infobulle de la Carte et du module Données : une entrée par raison de aerodb.coverage(icao) / coverageByState(), chacune
   *  [fr, en, de, es]. `partial` : un terrain détenu dont des pages ne sont pas lues ou des procédures sont à vérifier (V3 § 10.26). `lnm` est gardée pour plus tard mais aerodb ne la produit plus (pas de lecteur de Little Navmap, V3 § 10.29).
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
    partial: ['Lu en partie : pages non lues ou procédures à vérifier', 'Partly read: pages not read or procedures to check',
      'Teilweise gelesen: Seiten nicht gelesen oder Verfahren zu prüfen',
      'Leído en parte: páginas sin leer o procedimientos por revisar'
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
  /** Version du format de la base publiée que les constructeurs écrivent (`parserVersion` des meta.json) : la valeur de `VERSION` de
   *  shared/sia_base.js, DOIT la suivre (le cas K21 lit les deux fichiers et compare). Le module Données la montre à côté de celle d'une zone
   *  publiée pour dire « à reconstruire ». */
  const PARSER_VERSION = 28;
  const GROUPS = ['base', 'proc', 'aircraft', 'weather'];
  const ORDER = ['used', 'candidate', 'abandoned'];
  const byId = id => SOURCES.find(s => s.id === id) || null;
  /** Adresse d'une source pour un cycle (« 2610 », date ou rien : le cycle en vigueur). */
  const urlOf = (s, cycle) => typeof s.url === 'function' ? s.url(cycle || A.cycleOf().id) : s.url;
  /** SOG-0189 : le pas-à-pas d'une source que l'utilisateur dépose lui-même, ou null (une source que le lanceur télécharge n'en a pas) :
   *  { id, page: { url (le lien DIRECT de la page où est le fichier, résolu pour le cycle), home (la page d'accueil du site : le repli si le lien direct ne répond plus) },
   *  files: [{ name (le nom exact du fichier à prendre ; <…> : la partie qui change), url? (le lien direct du fichier lui-même, s'il y en a un), gives [4] (ce qu'il apporte) }] }.
   *  Le troisième pas (« Prendre le fichier téléchargé ») est le bouton de la page : il n'est pas ici. Données seules : aucun contrôle de lien (la page dit un lien mort et propose `home`). */
  function stepsOf(id, cycle) {
    const s = byId(id),
      st = s && s.steps;
    if (!st) return null;
    return {
      id: s.id,
      page: {
        url: typeof st.page.url === 'function' ? st.page.url(cycle || A.cycleOf().id) : st.page.url,
        home: st.page.home
      },
      files: st.files.map(f => ({
        name: f.name,
        ...(f.url ? {
          url: f.url
        } : {}),
        gives: f.gives.slice()
      }))
    };
  }
  const G = typeof window !== 'undefined' ? window : self;
  G.AeroCatalogue = {
    SOURCES,
    ORDER,
    GROUPS,
    EAD_STATES,
    COVERAGE,
    READ_REASONS,
    PARSER_VERSION,
    byId,
    urlOf,
    stepsOf,
    eaipBase,
    SIA_REGIONS,
    siaRegionOf,
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
