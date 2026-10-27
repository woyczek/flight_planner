(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE, frame/aerodb/SPEC.md § « Laboratoire ») : la table des sources du
  // tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md (16 lignes : les 17 sources sans X-Plane, ligne 11, ni les
  // types d'avion, ligne 16, qui restent sur le poste, plus EAD Basic, no 18, passe 2), avec l'adresse réelle, vérifiée le 26 octobre 2026 depuis le
  // conteneur quand le proxy le permettait (curl -sI : code, taille, en-tête Access-Control-Allow-Origin ; voir
  // frame/aerodb/DECISIONS.md), la taille attendue, la licence et le geste humain.
  //   · une adresse est une chaîne ou une fonction du cycle AIRAC (eAIP, CIFP, page du SIA) ;
  //   · `human` : le fichier vient d'un geste de l'utilisateur (compte, panier, licence) ; la ligne le dit, et le fichier
  //     entre par « Depuis un fichier » (iOS n'ouvre pas un dossier donné : Fichiers › Téléchargements) ;
  //   · `name` : le nom attendu d'un fichier fourni (le cycle est lu dans le nom) ; `downloads` : motif du ramassage dans
  //     Téléchargements par le lanceur (GET /__setup/downloads?glob=…, tools/launch.py download_patterns lit ce fichier) ;
  //   · `cycled` : l'adresse dépend du cycle AIRAC (page du SIA, VAC, eAIP, CIFP) : le lien direct de la ligne montre le cycle en
  //     vigueur, et celui du suivant quand il est demandé ou que son test a répondu (linkSet) ;
  //   · `get` : pour une adresse qui est une PAGE, ce qu'il faut y télécharger (4 langues) ; `login` : l'adresse du formulaire de
  //     connexion que « Tester la connexion (à vide) » appelle (EAD Basic : champs vides, jamais d'identifiant) ;
  //   · `chain` : ce que fait la mesure du fichier (sia : trois modes ; cifp : l'enregistrement PA ; json : lecture JSON ;
  //     html, pdf, grib : taille et en-tête seulement) ; `cap` : octets lus au plus par « Tester l'adresse » (0 : tout).
  // Aucun jeton, aucune adresse personnelle. API : AeroLabSources.{ SOURCES, cycleOf, cycleDate, eaipBase, cifpName,
  // cifpUrl, siaPage, siaFileInfo, byId, urlOf, rawUrl, linkSet }.
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
  /** Lit le nom d'un ZIP du SIA export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip (casse libre : le téléphone peut la changer) :
   *  { ok, date, version, cycle } ; ok faux si le nom ne suit pas le modèle. */
  function siaFileInfo(name) {
    const m = /^export_xml_bd_sia_(\d{4})-(\d{2})-(\d{2})(?:-v(\d+))?(?:\s*\(\d+\))?\.zip$/i.exec(String(name || '').trim());
    if (!m) return {
      ok: false
    };
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    return {
      ok: true,
      date,
      version: m[4] ? +m[4] : 1,
      cycle: cycleOf(Date.parse(date)).id
    };
  }
  /** Nom d'un CIFP fourni : CIFP_<aammjj>.zip → { ok, date, cycle }. */
  function cifpFileInfo(name) {
    const m = /^CIFP_(\d{2})(\d{2})(\d{2})(?:\s*\(\d+\))?\.zip$/i.exec(String(name || '').trim());
    if (!m) return {
      ok: false
    };
    const date = `20${m[1]}-${m[2]}-${m[3]}`;
    return {
      ok: true,
      date,
      cycle: cycleOf(Date.parse(date)).id
    };
  }
  const MB = 1048576;

  // ---------------------------------------------------------------------------------------------------- les sources
  // n : [fr, en, de, es] ; lic : licence en une ligne (même texte dans les quatre langues : sigle) ; human : geste, 4 langues
  const SOURCES = [{
    id: 'sia',
    cycled: true,
    no: 1,
    n: ['SIA France (XML SIA + AIXM 4.5)', 'SIA France (XML SIA + AIXM 4.5)', 'SIA Frankreich (XML SIA + AIXM 4.5)',
      'SIA Francia (XML SIA + AIXM 4.5)'
    ],
    url: c => siaPage(c),
    asPage: true,
    get: [
      'Sur la page du produit : la commande (0 €), puis le lien du ZIP export_xml_bd_SIA_<date>-v<nn>.zip ; appui long sur ce lien.',
      'On the product page: the order (0 €), then the link of the ZIP export_xml_bd_SIA_<date>-v<nn>.zip; long-press that link.',
      'Auf der Produktseite: die Bestellung (0 €), dann der Link zur ZIP-Datei export_xml_bd_SIA_<Datum>-v<nn>.zip; diesen Link lange drücken.',
      'En la página del producto: el pedido (0 €), luego el enlace del ZIP export_xml_bd_SIA_<fecha>-v<nn>.zip; mantenga pulsado ese enlace.'
    ],
    chain: 'sia',
    accept: '.zip,application/zip',
    name: /^export_xml_bd_sia_\d{4}-\d{2}-\d{2}/i,
    nameText: 'export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip',
    downloads: 'export_xml_bd_sia_*.zip',
    size: 5.6 * MB,
    cap: 262144,
    lic: 'Licence d’utilisation du SIA',
    human: [
      'Geste humain : le compte du SIA, le panier à 0 € et la licence. Le ZIP (5,6 Mo) arrive dans Téléchargements ; ici, « Depuis un fichier » (sur iPhone : Fichiers › Téléchargements).',
      'Human gesture: the SIA account, the 0 € cart and the licence. The ZIP (5.6 MB) lands in Downloads; here, “From a file” (on iPhone: Files › Downloads).',
      'Menschliche Geste: SIA-Konto, Warenkorb zu 0 € und Lizenz. Die ZIP-Datei (5,6 MB) landet in Downloads; hier „Aus einer Datei“ (iPhone: Dateien › Downloads).',
      'Gesto humano: la cuenta del SIA, el carrito a 0 € y la licencia. El ZIP (5,6 MB) llega a Descargas; aquí, «Desde un archivo» (en iPhone: Archivos › Descargas).'
    ]
  }, {
    id: 'geonames',
    no: 2,
    n: ['Villes (GeoNames)', 'Towns (GeoNames)', 'Städte (GeoNames)', 'Ciudades (GeoNames)'],
    url: 'https://download.geonames.org/export/dump/FR.zip',
    chain: 'zip',
    accept: '.zip',
    size: 4 * MB,
    cap: 0,
    lic: 'CC BY 4.0'
  }, {
    id: 'mora',
    no: 3,
    n: ['MORA : tuile de relief (Terrarium)', 'MORA: elevation tile (Terrarium)', 'MORA: Höhenkachel (Terrarium)',
      'MORA: tesela de relieve (Terrarium)'
    ],
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/16/11.png',
    chain: 'bin',
    accept: '.png',
    size: 87345,
    cap: 0,
    lic: 'Mapzen / AWS Terrain Tiles (sources ouvertes)'
  }, {
    id: 'dircam',
    no: 4,
    n: ['DIRCAM MIAM ENR 5.7 (axes de ravitaillement)', 'DIRCAM MIAM ENR 5.7 (refuelling tracks)',
      'DIRCAM MIAM ENR 5.7 (Luftbetankung)', 'DIRCAM MIAM ENR 5.7 (reabastecimiento)'
    ],
    url: 'https://www.dircam.dsae.defense.gouv.fr/images/Stories/Doc/MIAM_OACI/MIAM_OACI_ENR%205.7.pdf',
    chain: 'pdf',
    accept: '.pdf',
    size: 0.3 * MB,
    cap: 0,
    lic: 'MILAIP (DIRCAM), usage de la suite'
  }, {
    id: 'ukmil',
    no: 5,
    n: ['UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2', 'UK Mil AIP ENR 5.2'],
    url: 'https://www.aidu.mod.uk/aip/pdf/enr/ENR-5-2.pdf',
    chain: 'pdf',
    accept: '.pdf',
    size: 1 * MB,
    cap: 0,
    lic: 'OGL v3.0'
  }, {
    id: 'navcan',
    no: 6,
    n: ['NAV CANADA DAH (page des guides)', 'NAV CANADA DAH (guides page)', 'NAV CANADA DAH (Leitfäden-Seite)',
      'NAV CANADA DAH (página de guías)'
    ],
    url: 'https://www.navcanada.ca/en/aeronautical-information/operational-guides.aspx',
    asPage: true,
    get: ['Sur la page, repérez le guide DAH (fichier dah<aaaammjj>.pdf) ; appui long sur son lien.',
      'On the page, find the DAH guide (file dah<yyyymmdd>.pdf); long-press its link.',
      'Auf der Seite den DAH-Leitfaden suchen (Datei dah<jjjjmmtt>.pdf); seinen Link lange drücken.',
      'En la página, localice la guía DAH (archivo dah<aaaammdd>.pdf); mantenga pulsado su enlace.'
    ],
    chain: 'html',
    accept: '.pdf,.html',
    size: 0.3 * MB,
    cap: 2 * MB,
    lic: 'NAV CANADA, usage de la suite'
  }, {
    id: 'openaip',
    no: 7,
    n: ['openAIP : espaces de la France', 'openAIP: airspaces of France', 'openAIP: Lufträume Frankreichs',
      'openAIP: espacios de Francia'
    ],
    url: 'https://s3.openaip.net/openaip-system-exports/fr_asp.geojson',
    note: [
      'L’export S3 d’openAIP peut mettre longtemps à répondre (le serveur, pas la page) : n’attendez pas l’onglet, faites l’appui long sur le lien pour enregistrer le fichier.',
      'The openAIP S3 export can be slow to answer (the server, not the page): do not wait on the tab, long-press the link to save the file.',
      'Der S3-Export von openAIP kann lange brauchen (der Server, nicht die Seite): nicht auf den Tab warten, den Link lange drücken, um die Datei zu speichern.',
      'La exportación S3 de openAIP puede tardar en responder (el servidor, no la página): no espere a la pestaña, mantenga pulsado el enlace para guardar el archivo.'
    ],
    chain: 'json',
    accept: '.geojson,.json',
    size: 6 * MB,
    cap: 0,
    lic: 'CC BY-NC 4.0'
  }, {
    id: 'enaire',
    no: 8,
    n: ['ENAIRE (Espagne, AIXM 5.1) : page des données', 'ENAIRE (Spain, AIXM 5.1): data page',
      'ENAIRE (Spanien, AIXM 5.1): Datenseite', 'ENAIRE (España, AIXM 5.1): página de datos'
    ],
    url: 'https://aip.enaire.es/AIP/',
    asPage: true,
    get: ['L’index s’ouvre : téléchargez-y le jeu de données AIXM 5.1 (fichier .xml ou .zip) ; appui long sur son lien.',
      'The index opens: download the AIXM 5.1 data set there (.xml or .zip file); long-press its link.',
      'Der Index öffnet sich: laden Sie dort den AIXM-5.1-Datensatz (.xml- oder .zip-Datei) herunter; seinen Link lange drücken.',
      'Se abre el índice: descargue allí el conjunto de datos AIXM 5.1 (archivo .xml o .zip); mantenga pulsado su enlace.'
    ],
    chain: 'html',
    accept: '.xml,.zip',
    size: 0.05 * MB,
    cap: 2 * MB,
    lic: 'ENAIRE, usage de la suite'
  }, {
    id: 'adds',
    no: 9,
    n: ['FAA ADDS : espaces à usage spécial (une page de 250)', 'FAA ADDS: special use airspace (one page of 250)',
      'FAA ADDS: Sonderlufträume (eine Seite zu 250)', 'FAA ADDS: espacios de uso especial (una página de 250)'
    ],
    url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/Special_Use_Airspace/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultOffset=0&resultRecordCount=250&maxAllowableOffset=0.0005&geometryPrecision=5',
    chain: 'json',
    accept: '.geojson,.json',
    size: 1 * MB,
    cap: 0,
    lic: 'Domaine public (FAA)'
  }, {
    id: 'nats',
    no: 10,
    n: ['NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)', 'NATS UK (AIXM 5.1)'],
    url: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/',
    asPage: true,
    get: ['Sur la page des jeux de données (après inscription) : le ZIP EG_…_DS_…_XML.zip ; appui long sur son lien.',
      'On the data sets page (after registering): the ZIP EG_…_DS_…_XML.zip; long-press its link.',
      'Auf der Datensatz-Seite (nach der Registrierung): die ZIP-Datei EG_…_DS_…_XML.zip; ihren Link lange drücken.',
      'En la página de conjuntos de datos (tras registrarse): el ZIP EG_…_DS_…_XML.zip; mantenga pulsado su enlace.'
    ],
    chain: 'zip',
    accept: '.zip',
    name: /^EG_.*_DS_.*_XML\.zip$/i,
    nameText: 'EG_…_DS_…_XML.zip',
    downloads: 'EG_*_DS_*_XML.zip',
    size: 2 * MB,
    cap: 262144,
    lic: 'Conditions NATS (inscription)',
    human: ['Geste humain : l’inscription sur le site de NATS, puis le ZIP dans Téléchargements ; ici, « Depuis un fichier ».',
      'Human gesture: registration on the NATS site, then the ZIP in Downloads; here, “From a file”.',
      'Menschliche Geste: Registrierung bei NATS, dann die ZIP-Datei in Downloads; hier „Aus einer Datei“.',
      'Gesto humano: el registro en el sitio de NATS, luego el ZIP en Descargas; aquí, «Desde un archivo».'
    ]
  }, {
    id: 'ead',
    no: 18,
    n: ['EAD Basic (EUROCONTROL) : page de connexion', 'EAD Basic (EUROCONTROL): login page', 'EAD Basic (EUROCONTROL): Anmeldeseite',
      'EAD Basic (EUROCONTROL): página de conexión'
    ],
    url: 'https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/login/ead-basic/',
    login: 'https://www.ead.eurocontrol.int/fwf-eadbasic/ajaxlogin/ajax_security_check.jspx',
    asPage: true,
    chain: 'pdf',
    pageChain: 'html',
    accept: '.pdf,.zip,application/pdf',
    size: 0.05 * MB,
    cap: 2 * MB,
    lic: 'EUROCONTROL EAD Basic (compte de l’utilisateur, usage non opérationnel)',
    human: [
      'Aucun identifiant n’est demandé ni envoyé par le laboratoire : « Tester la connexion (à vide) » envoie le formulaire de connexion avec des champs vides, rien d’autre.',
      'The laboratory neither asks for nor sends any credential: “Test the login call (empty)” sends the login form with empty fields, nothing else.',
      'Das Labor fragt keine Zugangsdaten ab und sendet keine: „Anmeldeaufruf testen (leer)“ sendet das Anmeldeformular mit leeren Feldern, sonst nichts.',
      'El laboratorio no pide ni envía ninguna credencial: «Probar la conexión (vacía)» envía el formulario de conexión con los campos vacíos, nada más.'
    ],
    get: [
      'Connectez-vous sur la page, téléchargez les pages AD 2 d’un terrain dans Fichiers (un PDF, ou un ZIP), puis « Depuis un fichier ».',
      'Log in on the page, download the AD 2 pages of an aerodrome into Files (a PDF, or a ZIP), then “From a file”.',
      'Melden Sie sich auf der Seite an, laden Sie die AD-2-Seiten eines Flugplatzes in Dateien (ein PDF oder ein ZIP) und wählen Sie dann „Aus einer Datei“.',
      'Conéctese en la página, descargue las páginas AD 2 de un aeródromo en Archivos (un PDF o un ZIP) y luego «Desde un archivo».'
    ]
  }, {
    id: 'nat',
    no: 12,
    n: ['Routes NAT du jour (FAA)', 'NAT tracks of the day (FAA)', 'NAT-Routen des Tages (FAA)', 'Rutas NAT del día (FAA)'],
    url: 'https://nms.aim.faa.gov/datanat/nat.json',
    chain: 'json',
    accept: '.json',
    size: 0.02 * MB,
    cap: 0,
    lic: 'Domaine public (FAA)'
  }, {
    id: 'vac',
    cycled: true,
    no: 13,
    n: ['Cartes VAC du SIA (une carte : LFBD)', 'SIA VAC charts (one chart: LFBD)', 'SIA VAC-Karten (eine Karte: LFBD)',
      'Cartas VAC del SIA (una carta: LFBD)'
    ],
    url: c => `${eaipBase(c).replace(/\/FRANCE\/.*$/, '')}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFBD.pdf`,
    chain: 'pdf',
    accept: '.pdf',
    size: 0.55 * MB,
    cap: 0,
    lic: 'Licence d’utilisation du SIA'
  }, {
    id: 'eaip',
    cycled: true,
    no: 14,
    n: ['eAIP France (menu du cycle)', 'eAIP France (cycle menu)', 'eAIP Frankreich (Zyklusmenü)', 'eAIP Francia (menú del ciclo)'],
    url: c => `${eaipBase(c)}/html/eAIP/FR-menu-fr-FR.html`,
    asPage: true,
    get: [
      'Le menu de l’eAIP s’ouvre dans Safari : ouvrez une partie (par exemple AD 2) et enregistrez un de ses PDF (appui long sur le lien du PDF).',
      'The eAIP menu opens in Safari: open a part (for example AD 2) and save one of its PDFs (long-press the PDF link).',
      'Das eAIP-Menü öffnet sich in Safari: einen Teil öffnen (zum Beispiel AD 2) und eines seiner PDFs speichern (PDF-Link lange drücken).',
      'El menú del eAIP se abre en Safari: abra una parte (por ejemplo AD 2) y guarde uno de sus PDF (mantenga pulsado el enlace del PDF).'
    ],
    chain: 'html',
    accept: '.html,.pdf',
    size: 2.3 * MB,
    cap: 0,
    lic: 'Licence d’utilisation du SIA'
  }, {
    id: 'cifp',
    cycled: true,
    no: 15,
    n: ['FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)', 'FAA CIFP (ARINC 424-18)'],
    url: c => cifpUrl(c),
    chain: 'cifp',
    accept: '.zip',
    name: /^CIFP_\d{6}\.zip$/i,
    nameText: 'CIFP_<aammjj>.zip',
    downloads: 'CIFP_*.zip',
    size: 9.1 * MB,
    cap: 0,
    lic: 'Domaine public (FAA), avis conservé'
  }, {
    id: 'weather',
    no: 17,
    n: ['Météo mondiale (NOMADS, un champ GRIB2)', 'World weather (NOMADS, one GRIB2 field)', 'Weltwetter (NOMADS, ein GRIB2-Feld)',
      'Meteo mundial (NOMADS, un campo GRIB2)'
    ],
    url: () => {
      const t = new Date(Math.floor((Date.now() - 3 * 3600000) / 21600000) * 21600000),
        d = t.toISOString().slice(0, 10).replace(/-/g, ''),
        h = p2(t.getUTCHours());
      return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl?file=gfs.t${h}z.pgrb2.1p00.f000&var_PRMSL=on&lev_mean_sea_level=on&subregion=&toplat=80&bottomlat=-80&leftlon=0&rightlon=359&dir=%2Fgfs.${d}%2F${h}%2Fatmos`;
    },
    chain: 'bin',
    accept: '.grib2,.grb2',
    size: 116099,
    cap: 0,
    lic: 'Domaine public (NOAA)'
  }];

  const byId = id => SOURCES.find(s => s.id === id) || null;
  /** Adresse de la table d'une source pour un cycle (« 2610 », date ou rien : le cycle en vigueur). */
  const rawUrl = (s, cycle) => typeof s.url === 'function' ? s.url(cycle || cycleOf().id) : s.url;
  /** Le crochet d'essai n'existe que sur une page servie depuis la machine elle-même (localhost / 127.0.0.1 : le lanceur, les
   *  essais de tests/v3) : jamais sur le site publié, où un reste de localStorage ne doit rien pouvoir changer. */
  const isLocalPage = () => typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  /** Adresse de remplacement d'une source (essais : un faux serveur local, localStorage « sogLab:urls » = { id: adresse }).
   *  '' hors page locale, pour tout ce qui n'est pas une chaîne https (ou http vers la machine locale : les faux serveurs). */
  const override = id => {
    if (!isLocalPage()) return '';
    try {
      const all = JSON.parse(localStorage.getItem('sogLab:urls') || 'null'),
        v = all && typeof all === 'object' && !Array.isArray(all) && Object.prototype.hasOwnProperty.call(all, id) ? all[id] : '';
      if (typeof v !== 'string') return '';
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ? v : '';
    } catch {
      return ''; // pas de stockage (Worker), texte illisible ou adresse invalide
    }
  };
  /** Adresse effective d'une source : celle de remplacement s'il y en a une, sinon celle de la table. */
  const urlOf = (s, cycle) => override(s.id) || rawUrl(s, cycle);
  /** Adresse du formulaire de connexion d'une source (EAD Basic) ; remplaçable dans les essais par `sogLab:urls` { '<id>-login': … }. */
  const loginOf = s => override(`${s.id}-login`) || s.login || '';
  /** Les liens directs d'une ligne : [{ cycle?, url, next? }]. Une adresse qui ne dépend pas du cycle : un seul lien. Sinon le
   *  cycle en vigueur, puis celui du suivant quand il est demandé (`wanted` : son id, choisi dans la liste) ou quand le dernier
   *  test de son adresse a répondu (`seen` : Map adresse → { ok, diag } ; « bloqué par CORS » ne dit pas si le fichier existe :
   *  il ne suffit pas). Deux cycles qui donnent la même adresse (adresse de remplacement des essais) : un seul lien. */
  function linkSet(s, seen, cyc = cycleOf(), wanted = '') {
    const a = urlOf(s, cyc.id);
    if (!s.cycled) return [{
      url: a
    }];
    const out = [{
      cycle: cyc.id,
      url: a
    }];
    const b = urlOf(s, cyc.next.id),
      st = seen && seen.get ? seen.get(b) : null;
    if (b !== a && (wanted === cyc.next.id || st && st.ok)) out.push({
      cycle: cyc.next.id,
      url: b,
      next: true
    });
    return out;
  }
  /** Hôtes (origines https) des adresses de la table, pour la politique de contenu (tools/csp_policy.py les lit aussi). */
  const hosts = () => [...new Set(SOURCES.map(s => new URL(rawUrl(s, '2610')).origin))];
  const api = {
    SOURCES,
    cycleOf,
    cycleDate,
    eaipBase,
    cifpName,
    cifpUrl,
    siaPage,
    siaFileInfo,
    cifpFileInfo,
    byId,
    urlOf,
    rawUrl,
    linkSet,
    loginOf,
    hosts
  };
  if (typeof window !== 'undefined') window.AeroLabSources = api;
  else self.AeroLabSources = api;
})();
