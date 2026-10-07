// Zones de données aéronautiques (window.AeroZones) : la carte de Paramètres › Maintenance › Données aéronautiques.
// Une zone (un ou plusieurs pays, contours : shared/carto/aero_zones_geo.js, tools/build_aero_zones.py) a ses sources ;
// l'utilisateur active des zones et coche leurs sources ; la base aéronautique (shared/sia_base.js) ne lit que les
// fichiers des sources cochées des zones actives, et découpe les données mondiales (X-Plane) aux contours de ces zones.
// États d'une zone : vierge (inactive, sans données) ; inactive avec des données ; active, données incomplètes ; active,
// toutes ses données. Réglages : localStorage aeroZones:v1 { on: { zone: true }, src: { zone: { source: false } } }.
// Fichiers (dossier SIA = data/sia/) : SIA à la racine (AIRAC du nom), axes ENR 5.7 (miam-enr-5-7-tracks.xml),
// openaip/<pays>_<couche>.geojson, aixm5/LE_… (ENAIRE), geojson/faa_<couche>.geojson, zones/<zone>/… (fichiers déposés
// à la main : NATS…), X-Plane : dossier du simulateur (FileAccess __xpnav).
(() => {
  'use strict';
  if (window.AeroZones) return;
  const KEY = 'aeroZones:v1';
  const L4 = (fr, en, de, es) => [fr, en, de || en, es || en];
  /** Sources : kind = download (bouton, lanceur : tools/aero_fetch.py), manual (commande ou inscription : lien et mode
   *  d'emploi), pdf (lien et mode d'emploi ; lu ou non par la suite), local (dossier de l'ordinateur), global (couvre
   *  toutes les zones, découpée à leurs contours). readable : la suite lit ses fichiers. */
  const SOURCES = {
    sia: {
      kind: 'manual',
      readable: true,
      label: L4('SIA France — AIXM 4.5 et XML_SIA (cycle AIRAC)', 'SIA France — AIXM 4.5 and XML_SIA (AIRAC cycle)',
        'SIA Frankreich — AIXM 4.5 und XML_SIA (AIRAC-Zyklus)', 'SIA Francia — AIXM 4.5 y XML_SIA (ciclo AIRAC)'),
      gives: L4('espaces, zones RTBA / AZBA, aérodromes, balises, obstacles, points VFR',
        'airspace, RTBA / AZBA areas, aerodromes, navaids, obstacles, VFR points',
        'Lufträume, RTBA-/AZBA-Gebiete, Flugplätze, Funkfeuer, Hindernisse, VFR-Punkte',
        'espacios, zonas RTBA / AZBA, aeródromos, radioayudas, obstáculos, puntos VFR'),
      howto: L4(
        'Commande gratuite (0 €) sur le site du SIA, à refaire à chaque cycle AIRAC : compte SIA, « Ajouter au panier », « Passer commande » en acceptant la licence, télécharger le ZIP ; puis « Récupérer le ZIP téléchargé » (le lanceur le prend dans Téléchargements) ou « ZIP d’export du SIA… ».',
        'Free order (0 €) on the SIA website, to redo at each AIRAC cycle: SIA account, “Add to cart”, “Place order” accepting the licence, download the ZIP; then “Fetch the downloaded ZIP” (the launcher takes it from Downloads) or “SIA export ZIP…”.',
        'Kostenlose Bestellung (0 €) auf der SIA-Website, bei jedem AIRAC-Zyklus erneut: SIA-Konto, „In den Warenkorb“, „Bestellen“ mit Annahme der Lizenz, ZIP herunterladen; dann „Heruntergeladenes ZIP holen“ (der Starter nimmt es aus dem Download-Ordner) oder „SIA-Export-ZIP…“.',
        'Pedido gratuito (0 €) en el sitio del SIA, a repetir en cada ciclo AIRAC: cuenta SIA, «Añadir al carrito», «Realizar pedido» aceptando la licencia, descargar el ZIP; luego «Recuperar el ZIP descargado» (el lanzador lo toma de Descargas) o «ZIP de exportación del SIA…».'
      ),
      licence: 'Licence ouverte du SIA',
      age: 'airac'
    },
    dircam: {
      kind: 'pdf',
      readable: true,
      label: L4('DIRCAM — MILAIP ENR 5.7 (axes de ravitaillement en vol)', 'DIRCAM — MILAIP ENR 5.7 (air refuelling tracks)',
        'DIRCAM — MILAIP ENR 5.7 (Luftbetankungsstrecken)', 'DIRCAM — MILAIP ENR 5.7 (ejes de reabastecimiento en vuelo)'),
      gives: L4('axes AAR nommés (studio, CR AAR)', 'named AAR tracks (studio, AAR reports)', 'benannte AAR-Strecken',
        'ejes AAR con nombre'),
      src: 'dircamMilaip',
      link: 'https://www.dircam.dsae.defense.gouv.fr/fr/milaip',
      howto: L4(
        'PDF de la MILAIP (section ENR 5.7) à télécharger sur le site de la DIRCAM, puis extraction des axes (procédure : MANUEL_EXPLOITATION § 9.1) vers data/sia/miam-enr-5-7-tracks.xml. Réutilisation non commerciale, en citant l’amendement.',
        'MILAIP PDF (section ENR 5.7) to download from the DIRCAM website, then track extraction (procedure: MANUEL_EXPLOITATION § 9.1) into data/sia/miam-enr-5-7-tracks.xml. Non-commercial reuse, citing the amendment.'
      ),
      licence: 'DIRCAM (non commercial)',
      age: 'file'
    },
    openaip: {
      kind: 'download',
      readable: true,
      provider: 'openaip',
      label: L4('openAIP — export du pays', 'openAIP — country export', 'openAIP — Länderexport', 'openAIP — exportación del país'),
      gives: L4('espaces, aérodromes, balises, points VFR (données communautaires)',
        'airspace, aerodromes, navaids, VFR points (community data)',
        'Lufträume, Flugplätze, Funkfeuer, VFR-Punkte (Gemeinschaftsdaten)',
        'espacios, aeródromos, radioayudas, puntos VFR (datos comunitarios)'),
      licence: 'CC BY-NC 4.0 (© openAIP)',
      age: 'file'
    },
    enaire: {
      kind: 'download',
      readable: true,
      provider: 'enaire',
      label: L4('ENAIRE — AIP Espagne (AIXM 5.1)', 'ENAIRE — Spain AIP (AIXM 5.1)', 'ENAIRE — AIP Spanien (AIXM 5.1)',
        'ENAIRE — AIP España (AIXM 5.1)'),
      gives: L4('espaces (R, D, P, TRA, TSA…), balises, points, routes', 'airspace (R, D, P, TRA, TSA…), navaids, points, routes',
        'Lufträume, Funkfeuer, Punkte, Strecken', 'espacios, radioayudas, puntos, rutas'),
      licence: 'ENAIRE (usage personnel)',
      age: 'file'
    },
    faa: {
      kind: 'download',
      readable: true,
      provider: 'faa',
      args: ['sua', 'mtr'],
      label: L4('FAA — zones à usage spécial et routes militaires', 'FAA — special use airspace and military routes',
        'FAA — Sonderlufträume und Militärrouten', 'FAA — espacios de uso especial y rutas militares'),
      gives: L4('MOA, R, W, A, P ; routes MTR (IR, VR, SR)', 'MOA, R, W, A, P; MTR routes (IR, VR, SR)'),
      licence: 'domaine public',
      age: 'file'
    },
    faaclass: {
      kind: 'download',
      readable: true,
      provider: 'faa',
      args: ['class'],
      label: L4('FAA — classes d’espace (B, C, D, E)', 'FAA — airspace classes (B, C, D, E)', 'FAA — Luftraumklassen (B, C, D, E)',
        'FAA — clases de espacio (B, C, D, E)'),
      gives: L4('espaces contrôlés (gros fichier)', 'controlled airspace (large file)', 'kontrollierte Lufträume (große Datei)',
        'espacios controlados (archivo grande)'),
      licence: 'domaine public',
      age: 'file',
      off: true
    },
    nats: {
      kind: 'manual',
      readable: true,
      label: L4('NATS — AIP Royaume-Uni (AIXM 5.1)', 'NATS — UK AIP (AIXM 5.1)', 'NATS — AIP Vereinigtes Königreich (AIXM 5.1)',
        'NATS — AIP Reino Unido (AIXM 5.1)'),
      gives: L4('espaces, balises, points, aérodromes', 'airspace, navaids, points, aerodromes',
        'Lufträume, Funkfeuer, Punkte, Flugplätze', 'espacios, radioayudas, puntos, aeródromos'),
      src: 'natsData',
      link: 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/',
      downloads: 'EG_*_DS_*_XML.zip', // ZIP NATS (AIP, obstacles, zones drones) pris dans Téléchargements par « Déposer les fichiers… »
      howto: L4(
        'Inscription gratuite sur le site de NATS, puis télécharger le « UK ICAO AIP Dataset » (AIXM 5.1) et le déposer dans data/sia/zones/gb/. À refaire à chaque cycle AIRAC.',
        'Free registration on the NATS website, then download the “UK ICAO AIP Dataset” (AIXM 5.1) and drop it into data/sia/zones/gb/. To redo at each AIRAC cycle.',
        'Kostenlose Registrierung auf der NATS-Website, dann das „UK ICAO AIP Dataset“ (AIXM 5.1) herunterladen und in data/sia/zones/gb/ ablegen. Bei jedem AIRAC-Zyklus erneut.',
        'Registro gratuito en el sitio de NATS, luego descargar el «UK ICAO AIP Dataset» (AIXM 5.1) y depositarlo en data/sia/zones/gb/. A repetir en cada ciclo AIRAC.'
      ),
      licence: 'NATS (usage personnel)',
      age: 'file'
    },
    // ENR 5.2 de la MILAIP britannique (adresse fixe, texte) : téléchargé et lu par le lanceur (tools/aero_fetch.py
    // ukmil → tools/ukmil_aip.py) ; zones/gb/ukmil_enr52.geojson (LFA, VATA, TVAA), ukmil_aara-tracks.xml (AARA)
    ukmil: {
      kind: 'download',
      provider: 'ukmil',
      args: [],
      readable: true,
      label: L4('UK Mil AIP — ENR 5.2 : basse altitude, VATA, ravitaillement (AARA)',
        'UK Mil AIP — ENR 5.2: low flying, VATA, air-to-air refuelling (AARA)',
        'UK Mil AIP — ENR 5.2: Tiefflug, VATA, Luftbetankung (AARA)',
        'UK Mil AIP — ENR 5.2: baja altura, VATA, reabastecimiento (AARA)'),
      gives: L4(
        'zones de vol à basse altitude (LFA, sol à 2000 ft AGL), Valley Aerial Tactics Area, zone d’évitement TVAA, axes de ravitaillement AARA (IP → CP)',
        'low flying areas (LFA, surface to 2000 ft AGL), Valley Aerial Tactics Area, TVAA avoidance area, AARA refuelling tracks (IP → CP)',
        'Tieffluggebiete (LFA, Boden bis 2000 ft AGL), Valley Aerial Tactics Area, Ausweichgebiet TVAA, Betankungsstrecken AARA (IP → CP)',
        'zonas de vuelo a baja altura (LFA, suelo a 2000 ft AGL), Valley Aerial Tactics Area, zona de evitación TVAA, ejes de reabastecimiento AARA (IP → CP)'
      ),
      src: 'ukMilAip',
      link: 'https://www.aidu.mod.uk/aip/aipVolumes.html',
      howto: L4(
        'PDF officiel en libre accès (Open Government Licence v3.0), téléchargé et lu par le lanceur ; contours décrits en toutes lettres approchés par des segments droits.',
        'Official freely available PDF (Open Government Licence v3.0), downloaded and read by the launcher; boundaries described in words approximated by straight segments.',
        'Offizielles frei zugängliches PDF (Open Government Licence v3.0), vom Starter heruntergeladen und gelesen; in Worten beschriebene Grenzen durch gerade Segmente angenähert.',
        'PDF oficial de libre acceso (Open Government Licence v3.0), descargado y leído por el lanzador; límites descritos con palabras aproximados por segmentos rectos.'
      ),
      licence: 'OGL v3.0',
      age: 'file'
    },
    // Designated Airspace Handbook (TP 1820, tous les 56 jours, nom daté lu sur la page des guides) : téléchargé et lu par
    // le lanceur (tools/aero_fetch.py navcan → tools/navcan_dah.py) ; zones/ca/navcan_dah.geojson (CYD, CYR, CYA)
    navcan: {
      kind: 'download',
      provider: 'navcan',
      args: [],
      readable: true,
      label: L4('NAV CANADA — manuel des espaces aériens désignés (DAH)',
        'NAV CANADA — Designated Airspace Handbook (DAH)',
        'NAV CANADA — Designated Airspace Handbook (DAH)',
        'NAV CANADA — Designated Airspace Handbook (DAH)'),
      gives: L4(
        'zones dangereuses (CYD), réglementées (CYR), consultatives (CYA : opérations militaires, voltige, école, parachutage, vol à voile…), avec limites verticales, horaires et organisme de contrôle',
        'danger (CYD), restricted (CYR) and advisory areas (CYA: military operations, aerobatics, training, parachuting, soaring…), with vertical limits, times and controlling agency',
        'Gefahrengebiete (CYD), Flugbeschränkungsgebiete (CYR) und Advisory Areas (CYA: militärischer Flugbetrieb, Kunstflug, Schulung, Fallschirmspringen, Segelflug…), mit Höhengrenzen, Zeiten und Kontrollstelle',
        'zonas peligrosas (CYD), restringidas (CYR) y de aviso (CYA: operaciones militares, acrobacia, escuela, paracaidismo, vuelo a vela…), con límites verticales, horarios y dependencia de control'
        ),
      src: 'navcanAip',
      link: 'https://www.navcanada.ca/en/aeronautical-information/operational-guides.aspx',
      howto: L4(
        'PDF officiel gratuit, édition en vigueur (tous les 56 jours) trouvée sur la page des guides opérationnels, téléchargée et lue par le lanceur ; à retélécharger à chaque édition. Les données numériques de NAV CANADA sont vendues sous licence : le PDF en tient lieu.',
        'Free official PDF, current edition (every 56 days) found on the operational guides page, downloaded and read by the launcher; download again at each edition. NAV CANADA digital data are sold under licence: the PDF stands in for them.',
        'Kostenloses offizielles PDF, gültige Ausgabe (alle 56 Tage) auf der Seite der Betriebshandbücher gefunden, vom Starter heruntergeladen und gelesen; bei jeder Ausgabe neu herunterladen. Die digitalen Daten von NAV CANADA werden unter Lizenz verkauft: das PDF ersetzt sie.',
        'PDF oficial gratuito, edición vigente (cada 56 días) encontrada en la página de guías operativas, descargada y leída por el lanzador; volver a descargar en cada edición. Los datos digitales de NAV CANADA se venden bajo licencia: el PDF los sustituye.'
      ),
      licence: 'NAV CANADA',
      age: 'file'
    },
    xplane: {
      kind: 'local',
      global: true,
      readable: true,
      label: L4('X-Plane — données de navigation du simulateur', 'X-Plane — simulator navigation data',
        'X-Plane — Navigationsdaten des Simulators', 'X-Plane — datos de navegación del simulador'),
      gives: L4('espaces (OpenAir), balises, points, voies aériennes, grille MORA ; découpés aux contours de la zone',
        'airspace (OpenAir), navaids, fixes, airways, MORA grid; cut to the zone outline',
        'Lufträume (OpenAir), Funkfeuer, Punkte, Luftstraßen, MORA-Gitter; auf die Zone zugeschnitten',
        'espacios (OpenAir), radioayudas, puntos, aerovías, rejilla MORA; recortados al contorno de la zona'),
      howto: L4(
        'Choisir une fois le dossier d’installation d’X-Plane (bouton ci-dessous). Données Navigraph de « Custom Data » : licence personnelle, jamais copiées.',
        'Choose the X-Plane installation folder once (button below). Navigraph data in “Custom Data”: personal licence, never copied.'
      ),
      licence: 'GPL (Laminar) / Navigraph (personnel)',
      age: 'xplane'
    },
    mora: {
      kind: 'computed',
      readable: true,
      label: L4('MORA calculée (relief, sommets OpenStreetMap, obstacles)', 'Computed MORA (terrain, OpenStreetMap peaks, obstacles)',
        'Berechnete MORA (Relief, OSM-Gipfel, Hindernisse)', 'MORA calculada (relieve, cumbres OSM, obstáculos)'),
      gives: L4('grille MORA de la zone (mora.csv) ; ODbL pour la part OpenStreetMap',
        'MORA grid of the zone (mora.csv); ODbL for the OpenStreetMap part'),
      licence: 'ODbL (part OSM)',
      age: 'file'
    }
  };
  // Toutes les zones du monde (un pays par zone : contours et noms de shared/carto/aero_zones_geo.js) : openAIP (export du
  // pays), MORA calculée et X-Plane partout ; sources propres à certains pays en tête de liste
  const COMMON = ['openaip', 'mora', 'xplane'];
  const EXTRA = {
    fr: ['sia', 'dircam'],
    gb: ['nats', 'ukmil'],
    es: ['enaire'],
    us: ['faa', 'faaclass'],
    ca: ['navcan']
  };
  let cache = null;
  /** Zones { id, name: [fr, en, de, es], sources, openaip } (construites une fois les contours chargés). */
  function zones() {
    const g = window.AERO_ZONES_GEO;
    if (cache && cache.geo === g) return cache.list;
    const list = Object.entries(g || {}).map(([id, z]) => ({
      id,
      name: z.n,
      sources: [...(EXTRA[id] || []), ...COMMON],
      openaip: [id]
    }));
    cache = {
      geo: g,
      list,
      by: Object.fromEntries(list.map(z => [z.id, z]))
    };
    return list;
  }
  /** Zone d'identifiant id ; zone de repli (nom = id en majuscules, sources communes et propres au pays) si les
   *  contours ne la connaissent pas. */
  const byIdOf = id => (zones(), cache?.by?.[id]) || {
    id,
    name: [id.toUpperCase()],
    sources: [...(EXTRA[id] || []), ...COMMON],
    openaip: [id]
  };

  // ---------------------------------------------------------------- réglages
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  };
  /** Réglages ; par défaut (jamais réglés) : France active (anciens réglages aeroSources:v1 repris s'ils existent). */
  function settings() {
    const s = read();
    if (s) return {
      on: s.on || {},
      src: s.src || {}
    };
    let old = null;
    try {
      old = JSON.parse(localStorage.getItem('aeroSources:v1') || 'null');
    } catch {
      /* illisible */
    }
    const on = {
      fr: old?.enabled?.sia !== false
    };
    for (const cc of String(old?.enabled?.openaip ? old.openaipCountries || '' : '').split(/\s+/).filter(Boolean)) {
      if (cc) on[cc] = true;
    }
    return {
      on,
      src: {}
    };
  }
  /** Enregistre les réglages s dans aeroZones:v1 (erreur de stockage ignorée), émet « aero-zones-change » et renvoie s. */
  const save = s => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* stockage refusé */
    }
    window.dispatchEvent(new CustomEvent('aero-zones-change', {
      detail: s
    }));
    return s;
  };
  const isOn = (zone, s = settings()) => !!s.on[zone];
  /** Source cochée dans la zone (cochée par défaut, sauf les sources marquées off). */
  const srcOn = (zone, src, s = settings()) => s.src[zone]?.[src] ?? !SOURCES[src]?.off;
  /** Active ou désactive une zone, enregistre et renvoie les réglages. */
  const setZone = (zone, on) => {
    const s = settings();
    s.on[zone] = !!on;
    return save(s);
  };
  /** Coche ou décoche la source src dans la zone, enregistre et renvoie les réglages. */
  const setSource = (zone, src, on) => {
    const s = settings();
    (s.src[zone] ||= {})[src] = !!on;
    return save(s);
  };

  // ---------------------------------------------------------------- fichiers → zone et source
  const SIA_ROOT = /^(AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)\d{4}-\d{2}-\d{2}\.xml$/i;
  /** Zone et source d'un fichier du dossier SIA (chemin relatif : « openaip/gb_asp.geojson ») ; null si inconnu. */
  function fileSource(rel) {
    const p = String(rel).replace(/\\/g, '/'),
      name = p.split('/').pop();
    if (!p.includes('/')) {
      if (SIA_ROOT.test(name)) return {
        zone: 'fr',
        source: 'sia'
      };
      if (/^miam-enr-5-7-tracks\.xml$/i.test(name)) return {
        zone: 'fr',
        source: 'dircam'
      };
      if (/^mora\.csv$/i.test(name)) return {
        zone: '*',
        source: 'mora'
      };
      return null;
    }
    const [dir, sub] = p.split('/');
    if (dir === 'openaip') {
      const cc = /^([a-z]{2})_/i.exec(name)?.[1]?.toLowerCase();
      return cc ? {
        zone: cc,
        source: 'openaip'
      } : null;
    }
    if (dir === 'aixm5' && /^LE_/i.test(name)) return {
      zone: 'es',
      source: 'enaire'
    };
    if (dir === 'geojson' && /^faa_class/i.test(name)) return {
      zone: 'us',
      source: 'faaclass'
    };
    if (dir === 'geojson' && /^faa_/i.test(name)) return {
      zone: 'us',
      source: 'faa'
    };
    // zones/<zone>/<source>_… : fichier d'une source nommée (ukmil_…) ; sinon la source déposée à la main de la zone
    const pre = /^([a-z]+)[_-]/i.exec(name)?.[1]?.toLowerCase();
    if (dir === 'zones' && sub && pre && byIdOf(sub).sources.includes(pre)) return {
      zone: sub,
      source: pre
    };
    if (dir === 'zones' && sub) return {
      zone: sub,
      source: byIdOf(sub).sources.find(s => SOURCES[s].kind === 'manual' && s !== 'sia') || 'manual'
    };
    return null;
  }
  /** Vrai si le fichier entre dans la base : sa zone est active et sa source y est cochée. */
  function fileWanted(rel, s = settings()) {
    const fs = fileSource(rel);
    if (!fs) return false;
    if (fs.zone === '*') return Object.keys(s.on).some(id => isOn(id, s) && srcOn(id, fs.source, s));
    return isOn(fs.zone, s) && srcOn(fs.zone, fs.source, s);
  }

  // ---------------------------------------------------------------- géométrie
  const geo = () => window.AERO_ZONES_GEO || {};
  const ringsOf = id => geo()[id]?.r || [];
  /** Point dans un contour [[lon, lat]…]. */
  const inRing = (ring, lon, lat) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  /** Cadre { w, e, s, n } (degrés) englobant tous les sommets [lon, lat] des contours donnés. */
  const bboxOf = rings => {
    let w = 180,
      e = -180,
      s = 90,
      n = -90;
    for (const r of rings)
      for (const [x, y] of r) {
        w = Math.min(w, x);
        e = Math.max(e, x);
        s = Math.min(s, y);
        n = Math.max(n, y);
      }
    return {
      w,
      e,
      s,
      n
    };
  };
  /** Test « point dans une des zones » (lat, lon), marge en degrés (côtes, eaux territoriales, espaces au large). */
  function inZones(zoneIds, margin = .5) {
    const parts = zoneIds.flatMap(id => ringsOf(id).map(r => ({
      r,
      b: bboxOf([r])
    })));
    return (lat, lon) => parts.some(({
      r,
      b
    }) => lon >= b.w - margin && lon <= b.e + margin && lat >= b.s - margin && lat <= b.n + margin && (inRing(r, lon, lat) || margin >
      0 && [
        [margin, 0],
        [-margin, 0],
        [0, margin],
        [0, -margin]
      ].some(([dx, dy]) => inRing(r, lon + dx, lat + dy))));
  }
  /** Cases d'un degré d'une zone (centre de la case dans un de ses contours) : Set « lat|lon » (degrés entiers du
   *  coin sud-ouest), par balayage des lignes (intersections des arêtes avec chaque parallèle à mi-degré) — coût du
   *  nombre de sommets, pas du nombre de cases ; gardé par zone. */
  const cellsCache = new Map();

  /** Cases de la zone id (Set « lat|lon » décrit ci-dessus), calculées au premier appel puis lues dans cellsCache. */
  function cellsOf(id) {
    if (cellsCache.has(id)) return cellsCache.get(id);
    const out = new Set();
    for (const r of ringsOf(id)) {
      const rows = new Map(); // ligne (lat entière) → abscisses des intersections
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [x1, y1] = r[j], [x2, y2] = r[i];
        if (y1 === y2) continue;
        const lo = Math.min(y1, y2),
          hi = Math.max(y1, y2);
        for (let la = Math.ceil(lo - .5); la + .5 < hi; la++) {
          const y = la + .5;
          if (y < lo) continue;
          (rows.get(la) || rows.set(la, []).get(la)).push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
        }
      }
      for (const [la, xs] of rows) {
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let lo = Math.ceil(xs[k] - .5); lo + .5 <= xs[k + 1]; lo++) out.add(`${la}|${lo}`);
      }
    }
    cellsCache.set(id, out);
    return out;
  }
  /** Cadre d'une zone (tous ses contours). */
  const zoneBox = id => bboxOf(ringsOf(id));
  /** Cadres d'une zone en degrés entiers, un par contour, regroupés s'ils se touchent (calcul de la MORA : la France
   *  et son outre-mer donnent quelques petits cadres, pas un cadre couvrant le monde). */
  function zoneBoxes(id) {
    let boxes = ringsOf(id).map(r => {
      const b = bboxOf([r]);
      return {
        s: Math.floor(b.s),
        n: Math.ceil(b.n),
        w: Math.floor(b.w),
        e: Math.ceil(b.e)
      };
    });
    for (let merged = true; merged;) {
      merged = false;
      for (let i = 0; i < boxes.length && !merged; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (a.w <= b.e && b.w <= a.e && a.s <= b.n && b.s <= a.n) {
            boxes[i] = {
              s: Math.min(a.s, b.s),
              n: Math.max(a.n, b.n),
              w: Math.min(a.w, b.w),
              e: Math.max(a.e, b.e)
            };
            boxes.splice(j, 1);
            merged = true;
            break;
          }
        }
    }
    return boxes;
  }
  /** Adresse d'une source : réglage « Sources externes » (Paramètres › Installation, RepositoryNav.source) s'il existe,
   *  sinon l'adresse du catalogue. */
  const linkOf = id => {
    const S = SOURCES[id];
    return (S?.src && window.RepositoryNav?.source?.(S.src)) || S?.link || '';
  };

  window.AeroZones = {
    KEY,
    SOURCES,
    zones,
    byId: byIdOf,
    ringsOf,
    settings,
    save,
    isOn,
    srcOn,
    setZone,
    setSource,
    fileSource,
    fileWanted,
    inZones,
    zoneBox,
    zoneBoxes,
    cellsOf,
    linkOf,
    bboxOf
  };
})();
