(() => {
  'use strict';
  // V3 aerodb — la liste des sources de données aéronautiques que la suite utilise ou envisagerait (écran « Sources », #sources,
  // frame/aerodb/sources.js ; SPEC § 5 sexies) : données seules, aucun appel réseau. Elle reprend la table des sources du
  // laboratoire des données (retiré le 28 octobre 2026 ; tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md), EAD Basic
  // et les AIP nationaux de AIP_OPEN_DATA_INVENTORY.md ; licences d'après LICENSE.md. Une adresse est une chaîne ou une
  // fonction du cycle AIRAC (page du SIA, VAC, eAIP, CIFP) : l'écran montre le cycle en vigueur.
  // API : AeroSources.{ SOURCES, ORDER, cycleOf, cycleDate, eaipBase, cifpName, cifpUrl, siaPage, byId, urlOf }.
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DAY = 86400000;
  const ANCHOR = Date.UTC(2026, 0, 22); // AIRAC 2601 : 22 janvier 2026 ; 28 jours entre deux cycles
  const p2 = n => String(n).padStart(2, '0');
  const iso = ms => new Date(ms).toISOString().slice(0, 10);

  /** Cycle AIRAC en vigueur à la date (Date ou ms, aujourd'hui par défaut) : { id: '2610', date: '2026-10-01', num: 10,
   *  next: { id, date } } — le numéro est le rang de la date d'effet dans son année (la première tombe avant le 29 janvier). */
  function cycleOf(when = Date.now()) {
    const t = +when,
      ms = ANCHOR + Math.floor((t - ANCHOR) / (28 * DAY)) * 28 * DAY,
      mk = m => {
        const y = new Date(m).getUTCFullYear(),
          num = Math.floor((m - Date.UTC(y, 0, 1)) / (28 * DAY)) + 1;
        return {
          id: p2(y % 100) + p2(num),
          date: iso(m),
          num,
          year: y
        };
      };
    return {
      ...mk(ms),
      next: (n => ({
        id: n.id,
        date: n.date
      }))(mk(ms + 28 * DAY))
    };
  }
  /** Date d'effet (AAAA-MM-JJ) d'un cycle « AANN ». */
  function cycleDate(id) {
    const m = /^(\d\d)(\d\d)$/.exec(String(id));
    if (!m) return '';
    const y = 2000 + +m[1];
    let ms = ANCHOR;
    for (let i = 0; i < 40 * 14; i++, ms += 28 * DAY) { // 14 ans de cycles au plus
      const c = new Date(ms);
      if (c.getUTCFullYear() === y && Math.floor((ms - Date.UTC(y, 0, 1)) / (28 * DAY)) + 1 === +m[2]) return iso(ms);
    }
    for (let i = 1; i < 40 * 14; i++) { // avant 2026
      const ms2 = ANCHOR - i * 28 * DAY;
      const c = new Date(ms2);
      if (c.getUTCFullYear() === y && Math.floor((ms2 - Date.UTC(y, 0, 1)) / (28 * DAY)) + 1 === +m[2]) return iso(ms2);
    }
    return '';
  }
  const dateOf = c => (/^\d{4}$/.test(c) ? cycleDate(c) : String(c || cycleOf().date));
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
    const c = /^\d{4}$/.test(cycle) ? cycle : cycleOf(Date.parse(dateOf(cycle))).id;
    return `https://www.sia.aviation-civile.gouv.fr/produits-numeriques-en-libre-disposition/donnees-aeronautiques-xml-airac-${c.slice(2)}-${c.slice(0, 2)}.html`;
  }

  // ---------------------------------------------------------------------------------------------------- les sources
  // Une ligne par source : { id, no (ligne du tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md, ou null), status
  // ('used' : la suite s'en sert aujourd'hui ; 'candidate' : envisagée ; 'abandoned' : écartée, avec sa raison), cycled (adresse
  // du cycle AIRAC en vigueur), n [fr, en, de, es], url (chaîne, ou fonction du cycle), gives [4] (ce qu'elle donne et où cela
  // va), lic [4] (licence ou conditions, d'après LICENSE.md), how [4] (facultatif : le geste pour l'obtenir) }. Données seules :
  // l'écran (sources.js) ne fait qu'afficher des liens, aucune récupération.
  const SOURCES = [{
    id: 'sia',
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
    id: 'ead',
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
  const ORDER = ['used', 'candidate', 'abandoned'];
  const byId = id => SOURCES.find(s => s.id === id) || null;
  /** Adresse d'une source pour un cycle (« 2610 », date ou rien : le cycle en vigueur). */
  const urlOf = (s, cycle) => typeof s.url === 'function' ? s.url(cycle || cycleOf().id) : s.url;
  window.AeroSources = {
    SOURCES,
    ORDER,
    cycleOf,
    cycleDate,
    eaipBase,
    cifpName,
    cifpUrl,
    siaPage,
    byId,
    urlOf
  };
})();
