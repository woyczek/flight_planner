/* SiaBase — base SIA analysée, commune au studio cartographique (apps/cpco/map_parser.html) et à
 * Paramètres › Maintenance › Données aéronautiques. Un seul code pour :
 *   - la lecture du dossier SIA (data/sia) : cycle AIRAC le plus récent, AIXM 4.5 (espaces R/D/P/CTR/TMA…, aérodromes,
 *     balises, obstacles), XML_SIA (contours de tous les autres espaces), villes, fond de carte, mora.csv, axes ENR 5.7 ;
 *   - le cache IndexedDB « sia-map-parser » (magasin cache, clé base) : lecture, écriture, mise à jour partielle, purge ;
 *   - le résumé léger siaBaseInfo:v1 (cycle, date, nombres : pastille AIRAC de l'en-tête, Maintenance) ;
 *   - la grille MORA : calcul complet (relief Terrarium + sommets OSM + obstacles) et recalcul simple (obstacles d'un
 *     nouveau cycle, relief du mora.csv existant), notation « 3⁵ », CSV ;
 *   - le bloc d'interface « Base de données SIA » (dossier, relire, purger, messages, inventaire), monté à l'identique
 *     dans les deux pages : SiaBase.panel(host, { onLoaded }).
 * Dépendances facultatives : window.SiaAero.parseAixm (shared/carto/aero_symbols.js : aérodromes, balises) ; window.FileAccess
 * (dossiers mémorisés) ; window.Airac (cycles). Valeurs MORA calculées, non certifiées.
 */
(() => {
  const DB = 'sia-map-parser',
    STORE = 'cache',
    KEY = 'base',
    INFO = 'siaBaseInfo:v1',
    PREV = 'siaBaseInfo:prev',
    FOLDER_NAME = 'siaFolderName';
  /** Version du format de la base mémorisée : une base d'une autre version est ignorée (à relire). */
  const COMPAT = 14; // plus ancien format encore utilisable tel quel (15 n'ajoute que aero.vrp)
  const VERSION =
    16; // 13 : gestionnaire (admin) et mode d'activation (act) des espaces AIXM ; 14 : voies aériennes (aero.airways) ; 15 : points de report VFR (aero.vrp) ; 16 : sources (src) et données d'autres pays (shared/aero_sources.js)
  const SCRIPT_URL = document.currentScript?.src || location.href;
  /** URL d'un fichier de l'application (chemin depuis la racine : « shared/carto/… »). */
  const appUrl = path => new URL('../' + path, SCRIPT_URL).href;
  /** Lecteurs et réglages des autres sources (shared/aero_sources.js), chargés à la demande ; null s'ils manquent. */
  let aeroLoad = null;
  const needAero = () => aeroLoad ||= window.AeroSources ? Promise.resolve(window.AeroSources) : new Promise(res => {
    const sc = document.createElement('script');
    sc.src = new URL('aero_sources.js?v=d5cffeb9', SCRIPT_URL).href;
    sc.onload = () => res(window.AeroSources || null);
    sc.onerror = () => res(null);
    document.head.append(sc);
  });
  /** Zones de données (shared/aero_zones.js et leurs contours, shared/carto/aero_zones_geo.js), chargées à la demande ;
   *  null si elles manquent (tout est lu, comme avant les zones). */
  let zonesLoad = null;
  const loadScript = src => new Promise(res => {
    const sc = document.createElement('script');
    sc.src = new URL(src, SCRIPT_URL).href;
    sc.onload = () => res(true);
    sc.onerror = () => res(false);
    document.head.append(sc);
  });
  const needZones = () => zonesLoad ||= (async () => {
    if (!window.AERO_ZONES_GEO) await loadScript('carto/aero_zones_geo.js?v=6e9678c4');
    if (!window.AeroZones) await loadScript('aero_zones.js?v=8ab45427');
    return window.AeroZones || null;
  })();
  /** Sous-dossiers du dossier SIA par source (fichiers d'autres pays rangés à part) ; zones/<zone>/ : fichiers déposés
   *  à la main (NATS…). */
  const SOURCE_DIRS = ['aixm5', 'geojson', 'openaip'];

  // ===================================================================== cache IndexedDB
  /** Base IndexedDB ; create = false : null si elle n'existe pas encore (rien n'est créé). */
  function openDb({
    create = true
  } = {}) {
    return new Promise((resolve, reject) => {
      let r;
      try {
        r = indexedDB.open(DB, 1);
      } catch {
        return resolve(null);
      }
      const guard = setTimeout(() => reject(new Error(
        'La base du navigateur (IndexedDB) ne répond pas : fermer les autres onglets du studio et de Paramètres, puis relancer.'
      )), 15000);
      const done = f => (...a) => {
        clearTimeout(guard);
        f(...a);
      };
      resolve = done(resolve);
      reject = done(reject);
      r.onblocked = () => reject(new Error(
        'La base du navigateur est bloquée par un autre onglet : fermer les autres onglets du studio et de Paramètres, puis relancer.'
      ));
      r.onupgradeneeded = () => {
        if (create) r.result.createObjectStore(STORE);
        else {
          r.transaction.abort();
          resolve(null);
        }
      };
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          return resolve(null);
        }
        resolve(db);
      };
      r.onerror = () => resolve(null);
    });
  }

  function tx(db, mode, run) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode),
        q = run(t.objectStore(STORE));
      t.oncomplete = () => {
        db.close();
        resolve(q?.result);
      };
      t.onerror = () => {
        db.close();
        reject(t.error);
      };
    });
  }
  /** Base mémorisée (objet complet) ; null si absente. any = true : même d'une autre version du format. */
  async function get({
    any = false
  } = {}) {
    const db = await openDb({
      create: false
    });
    if (!db) return null;
    const b = await tx(db, 'readonly', s => s.get(KEY)).catch(() => null);
    // format antérieur compatible (COMPAT…VERSION) : utilisable, seules manquent les données ajoutées depuis (b.outdated)
    if (b && !any && b.parserVersion >= COMPAT && b.parserVersion < VERSION) b.outdated = true;
    return b && (any || (b.parserVersion >= COMPAT && b.parserVersion <= VERSION)) ? b : null;
  }
  /** Mémorise la base (et son résumé siaBaseInfo:v1). Une base nouvellement lue (cachedAt différent) garde le résumé de la
   *  précédente (siaBaseInfo:prev) pour la comparaison des deux bases (Maintenance, étape 5), quelle que soit la page qui relit. */
  async function put(base) {
    const old = await get({
      any: true
    });
    if (old && old.cachedAt !== base.cachedAt) {
      try {
        localStorage.setItem(PREV, JSON.stringify({
          ...summarize(old),
          storedAt: new Date().toISOString()
        }));
      } catch {
        /* quota */
      }
    }
    const db = await openDb();
    if (!db) throw new Error('IndexedDB indisponible');
    await tx(db, 'readwrite', s => s.put({
      ...base,
      parserVersion: VERSION
    }, KEY));
    remember(summarize(base));
    try {
      if (base.folderName) localStorage.setItem(FOLDER_NAME, base.folderName);
    } catch {
      /* quota */
    }
  }
  /** Met à jour des champs de la base mémorisée (ex. moraCells après un recalcul) ; faux si elle est absente. */
  async function patch(fields) {
    const b = await get({
      any: true
    });
    if (!b) return false;
    await put({
      ...b,
      ...fields
    });
    return true;
  }
  /** Purge : vide le magasin (jamais bloqué par un onglet ouvert, contrairement à deleteDatabase) et oublie le résumé. */
  async function purge() {
    const had = !!(await get({
      any: true
    }));
    const db = await openDb({
      create: false
    });
    if (db) await tx(db, 'readwrite', s => s.clear()).catch(() => {});
    try {
      localStorage.removeItem(INFO);
    } catch {
      /* stockage indisponible */
    }
    window.dispatchEvent(new CustomEvent('sia-base-change', {
      detail: {
        purged: true
      }
    }));
    return had;
  }

  // ===================================================================== résumé (siaBaseInfo:v1)
  const cycleDate = b => b?.airac || (b?.xmlInventoryData || []).map(x => /(\d{4}-\d{2}-\d{2})/.exec(x.name)?.[1]).filter(Boolean).sort()
    .pop() || '';
  /** Résumé d'une base : cycle, date, fichiers, nombres (par type d'espace), noms d'espaces (comparaison de deux bases). */
  function summarize(b) {
    if (!b) return null;
    const types = {};
    for (const a of b.airspaces || []) types[a.type || '?'] = (types[a.type || '?'] || 0) + 1;
    const aero = b.aero || {},
      count = v => Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
    return {
      parserVersion: b.parserVersion ?? VERSION,
      folderName: b.folderName || '',
      cachedAt: b.cachedAt || 0,
      airac: cycleDate(b),
      mixed: false,
      cycles: cycleDate(b) ? [cycleDate(b)] : [],
      files: (b.xmlInventoryData || []).map(x => ({
        name: x.name,
        role: x.role,
        mb: x.mb
      })),
      counts: {
        airspaces: (b.airspaces || []).length,
        byType: types,
        aerodromes: count(aero.aerodromes),
        navaids: count(aero.navaids || aero.navaid),
        cities: (b.cities || []).length,
        mora: (b.moraCells || []).length,
        obstacleCells: Object.keys(b.obstacleMax || {}).length
      },
      names: (b.airspaces || []).map(a => `${a.type || '?'}|${a.name || a.key || ''}`)
    };
  }
  /** Résumé léger mémorisé (siaBaseInfo:v1) : { airac, cachedAt, folderName, counts, checkedAt } ; lu par toutes les pages. */
  const info = () => {
    try {
      return JSON.parse(localStorage.getItem(INFO) || 'null');
    } catch {
      return null;
    }
  };
  /** Résumé de la base précédente (gardé à chaque nouvelle lecture) ; null si aucune. */
  const previous = () => {
    try {
      return JSON.parse(localStorage.getItem(PREV) || 'null');
    } catch {
      return null;
    }
  };

  function remember(s) {
    if (!s) return;
    const next = {
      airac: s.airac,
      mixed: s.mixed,
      cachedAt: s.cachedAt,
      folderName: s.folderName,
      counts: {
        ...s.counts,
        byType: undefined
      }
    };
    // résumé inchangé : pas de réécriture (chaque écriture réveille les autres onglets, événement storage)
    const cur = info();
    if (cur && JSON.stringify([cur.airac, cur.mixed, cur.cachedAt, cur.folderName, cur.counts]) === JSON.stringify([next.airac, next
        .mixed, next.cachedAt, next.folderName, JSON.parse(JSON.stringify(next.counts))
      ])) return;
    try {
      localStorage.setItem(INFO, JSON.stringify({
        ...next,
        checkedAt: new Date().toISOString()
      }));
    } catch {
      /* quota */
    }
    window.dispatchEvent(new CustomEvent('sia-base-change', {
      detail: {
        summary: s
      }
    }));
  }
  /** Résumé de la base mémorisée (et mise à jour de siaBaseInfo:v1). */
  async function summary() {
    const s = summarize(await get());
    if (s) remember(s);
    return s;
  }

  // ===================================================================== CSV
  /** Lignes d'un CSV (virgule, guillemets doubles, BOM ignoré) ; lignes vides écartées. */
  function csvRows(text) {
    const rows = [];
    let row = [],
      field = '',
      q = false;
    const s = String(text).replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) {
        if (ch === '"') {
          if (s[i + 1] === '"') {
            field += '"';
            i++;
          } else q = false;
        } else field += ch;
        continue;
      }
      if (ch === '"') q = true;
      else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        field = '';
      } else field += ch;
    }
    if (field !== '' || row.length) {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
    }
    return rows.filter(r => r.some(c => c !== ''));
  }
  const csvField = v => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  /** Villes (name, lat, lon, population). */
  function parseCities(text) {
    const rows = csvRows(text),
      h = (rows.shift() || []).map(x => x.trim().toLowerCase()),
      ix = n => h.indexOf(n);
    if (['name', 'lat', 'lon', 'population'].some(n => ix(n) < 0)) throw new Error(
      'CSV villes : colonnes name,lat,lon,population requises.');
    return rows.filter(c => c.length >= h.length).map(c => ({
        name: c[ix('name')],
        lat: +c[ix('lat')],
        lon: +c[ix('lon')],
        population: +c[ix('population')]
      }))
      .filter(c => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lon) && Number.isFinite(c.population));
  }

  // ===================================================================== MORA
  const sup = s => String(s).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹' [+d]);
  /** Notation OACI « 3⁵ » (3500 ft). */
  const moraLabel = ft => {
    const h = Math.round(ft / 100);
    return Math.floor(h / 10) + sup(h % 10);
  };
  /** MORA (ft) d'une cellule : point le plus haut + 1000 ft (2000 ft au-delà de 5000 ft), à la centaine supérieure. */
  const moraOf = top => Math.ceil((top + (top > 5000 ? 2000 : 1000)) / 100) * 100;
  /** MORA (ft) d'une cellule lue (moraFt, sinon notation « 3⁵ »). */
  const moraFtOf = c => c.moraFt ?? +String(c.mora).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)) * 100;
  /** Cellules d'un mora.csv (lat, lon, mora, mora_ft, lat_step, lon_step) ; une par position. */
  function parseMora(text) {
    const rows = csvRows(text),
      h = (rows.shift() || []).map(x => x.trim().toLowerCase()),
      ix = n => h.indexOf(n);
    if (['lat', 'lon', 'mora'].some(n => ix(n) < 0)) throw new Error('MORA CSV : colonnes lat,lon,mora requises.');
    const unique = new Map;
    for (const c of rows) {
      const cell = {
        lat: +c[ix('lat')],
        lon: +c[ix('lon')],
        mora: c[ix('mora')],
        moraFt: ix('mora_ft') >= 0 ? +c[ix('mora_ft')] : null,
        latStep: ix('lat_step') >= 0 ? (+c[ix('lat_step')] || 1) : 1,
        lonStep: ix('lon_step') >= 0 ? (+c[ix('lon_step')] || 1) : 1,
        // gardés pour une réécriture (calcul d'une zone, MORA d'X-Plane) : sans eux, les autres cases perdaient leur
        // relief (recalcul simple impossible ensuite) et leur source
        terrainFt: ix('terrain_ft') >= 0 && c[ix('terrain_ft')] !== '' ? +c[ix('terrain_ft')] : null,
        obstacleFt: ix('obstacle_ft') >= 0 && c[ix('obstacle_ft')] !== '' ? +c[ix('obstacle_ft')] : null,
        source: ix('source') >= 0 ? c[ix('source')] || '' : ''
      };
      if (Number.isFinite(cell.lat) && Number.isFinite(cell.lon) && cell.mora && !unique.has(cell.lat + '|' + cell.lon)) unique.set(cell
        .lat + '|' + cell.lon, cell);
    }
    return [...unique.values()];
  }
  /** Cycle des obstacles d'un mora.csv (mention « obstacles AIRAC … » de la colonne source) ; '' si inconnu. */
  const moraCycle = text => /obstacles AIRAC (\d{4}-\d{2}-\d{2})/.exec(String(text || ''))?.[1] || '';
  const MORA_SOURCE = 'Calculée : relief Terrarium (AWS Terrain Tiles) + sommets OSM + obstacles AIXM SIA — non certifiée';
  /** mora.csv d'une grille calculée (computeMoraGrid). */
  function moraCsv(cells, {
    airac = ''
  } = {}) {
    const source = MORA_SOURCE + (cells.peaksOk === false ? ' (sommets OSM indisponibles : relief majoré de 100 m)' : '') + (airac ?
      ` — obstacles AIRAC ${airac}` : '');
    return '﻿' + ['lat,lon,mora,mora_ft,lat_step,lon_step,terrain_ft,obstacle_ft,source',
      // source propre à la case (relue de mora.csv, MORA d'X-Plane) gardée ; sinon celle du calcul
      ...cells.map(m => [m.lat.toFixed(1), m.lon.toFixed(1), m.mora, m.moraFt, 1, 1, m.terrainFt ?? '', m.obstacleFt ?? '', m
        .keepSource && m.source ? m.source : source
      ].map(csvField).join(','))
    ].join('\r\n') + '\r\n';
  }
  /** Recalcul simple : obstacles obstacleMax ({ 'lat|lon' : ft }) d'un nouveau cycle, relief (terrain_ft) du mora.csv existant.
   *  { csv, cells, changes: [{ lat, lon, before, after, obstacleBefore, obstacleAfter }], skipped }. */
  function moraFromObstacles(text, obstacleMax, cycle) {
    const rows = csvRows(text),
      head = (rows.shift() || []).map(h => h.trim().toLowerCase()),
      ix = n => head.indexOf(n);
    if (['lat', 'lon', 'mora_ft', 'terrain_ft'].some(n => ix(n) < 0)) throw new Error(
      'mora.csv : colonnes lat, lon, mora_ft, terrain_ft requises (fichier produit par le calcul complet).');
    if (ix('obstacle_ft') < 0) head.push('obstacle_ft');
    if (ix('source') < 0) head.push('source');
    const changes = [],
      cells = [],
      tag = cycle ? ` — obstacles AIRAC ${cycle} (recalcul simple)` : '';
    let skipped = 0;
    const out = rows.map(r => {
      const lat = +r[ix('lat')],
        lon = +r[ix('lon')],
        terrain = +r[ix('terrain_ft')];
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(terrain)) {
        skipped++;
        return r;
      }
      const key = Math.floor(lat) + '|' + Math.floor(lon),
        obstBefore = Math.round(+(r[ix('obstacle_ft')] || 0) || 0),
        obst = Math.round(obstacleMax?.[key] || 0),
        before = +r[ix('mora_ft')],
        after = moraOf(Math.max(terrain, obst));
      if (after !== before || obst !== obstBefore) changes.push({
        lat,
        lon,
        before,
        after,
        obstacleBefore: obstBefore,
        obstacleAfter: obst
      });
      const line = head.map((h, i) => r[i] ?? '');
      line[head.indexOf('mora')] = moraLabel(after);
      line[head.indexOf('mora_ft')] = after;
      line[head.indexOf('obstacle_ft')] = obst;
      line[head.indexOf('source')] = String(line[head.indexOf('source')] || '').replace(
        / — obstacles AIRAC [\d-]+( \(recalcul simple\))?$/, '') + tag;
      cells.push({
        lat,
        lon,
        mora: moraLabel(after),
        moraFt: after,
        latStep: +r[ix('lat_step')] || 1,
        lonStep: +r[ix('lon_step')] || 1
      });
      return line;
    });
    return {
      csv: '﻿' + [head.join(','), ...out.map(r => r.map(csvField).join(','))].join('\r\n') + '\r\n',
      cells,
      changes,
      skipped
    };
  }
  // Calcul complet : cellule de 1° × 1°, point le plus haut — relief (tuiles Terrarium z9 puis z12, SRTM / GMTED…),
  // sommet OSM ou obstacle de l'AIXM SIA — + 1000 ft (2000 ft au-delà de 5000 ft), centaine supérieure. Réseau requis.
  async function terrariumTile(z, x, y) {
    const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`);
    if (!r.ok) throw new Error(`Tuile de relief ${z}/${x}/${y} : ${r.status}`);
    const img = await createImageBitmap(await r.blob()),
      c = new OffscreenCanvas(256, 256),
      g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return despike(g.getImageData(0, 0, 256, 256).data);
  }

  /** Altitudes (m) d'une tuile Terrarium ; pixel parasite → NaN. Les tuiles portent des pixels isolés faux (trous de la
   *  source mal comblés : 5 389 m au bord de mer à La Réunion) : un pixel qui dépasse de plus de SPIKE_M la médiane de ses
   *  voisins est écarté. Relevé : un vrai sommet ne dépasse cette médiane que de 390 m au plus en z9, 70 m en z12
   *  (Mont Blanc, Cervin, Dru, Ossau, Piton des Neiges) ; les parasites, de 2 000 à 5 400 m. */
  const SPIKE_M = 1000;

  function despike(d) {
    const h = new Float32Array(65536),
      out = new Float32Array(65536),
      nb = [];
    for (let i = 0; i < 65536; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    for (let py = 0; py < 256; py++)
      for (let px = 0; px < 256; px++) {
        nb.length = 0;
        for (let b = -1; b <= 1; b++)
          for (let a = -1; a <= 1; a++)
            if ((a || b) && px + a >= 0 && px + a < 256 && py + b >= 0 && py + b < 256) nb.push(h[(py + b) * 256 + px + a]);
        nb.sort((u, v) => u - v);
        const i = py * 256 + px;
        out[i] = h[i] - nb[nb.length >> 1] > SPIKE_M ? NaN : h[i];
      }
    return out;
  }

  function scanTile(d, z, x, y, box, visit) {
    for (let py = 0; py < 256; py++) {
      const k = Math.PI - 2 * Math.PI * (y + (py + .5) / 256) / 2 ** z,
        lat = 180 / Math.PI * Math.atan(Math.sinh(k));
      if (lat < box.s || lat >= box.n) continue;
      for (let px = 0; px < 256; px++) {
        const lon = (x + (px + .5) / 256) / 2 ** z * 360 - 180;
        if (lon < box.w || lon >= box.e) continue;
        const h = d[py * 256 + px];
        if (h === h) visit(lat, lon, h);
      }
    }
  }
  /** Grille MORA complète sur l'emprise { s, n, w, e } ; obstacleMax : obstacles par cellule (base SIA). progress(done, total, étape). */
  /** Théâtres couverts par la grille MORA (cellules de 1° × 1°) : métropole et Corse, puis outre-mer. */
  const MORA_ZONES = [{
    name: 'métropole',
    s: 41,
    n: 51,
    w: -5,
    e: 10
  }, {
    name: 'Antilles',
    s: 14,
    n: 17,
    w: -62,
    e: -60
  }, {
    name: 'Guyane',
    s: 2,
    n: 6,
    w: -55,
    e: -51
  }, {
    name: 'Saint-Pierre-et-Miquelon',
    s: 46,
    n: 48,
    w: -57,
    e: -56
  }, {
    name: 'Réunion',
    s: -22,
    n: -20,
    w: 55,
    e: 56
  }, {
    name: 'Mayotte',
    s: -14,
    n: -12,
    w: 44,
    e: 46
  }, {
    name: 'Nouvelle-Calédonie',
    s: -23,
    n: -19,
    w: 163,
    e: 169
  }, {
    name: 'Polynésie (îles de la Société)',
    s: -18,
    n: -16,
    w: -152,
    e: -148
  }, {
    name: 'Wallis-et-Futuna',
    s: -15,
    n: -13,
    w: -179,
    e: -176
  }];
  /** Emprises MORA des missions situées hors des théâtres couverts (missions du registre : points de leur route
   *  probable) : degrés entiers, marge d'un demi-degré, emprises qui se recouvrent fusionnées ; une emprise de plus de
   *  12° de côté est écartée (mission trop étendue : à calculer par morceaux). [{ name, s, n, w, e }]. */
  function moraZonesOfMissions(missions) {
    const inZone = p => MORA_ZONES.some(z => p.lat >= z.s && p.lat < z.n && p.lon >= z.w && p.lon < z.e);
    let boxes = [];
    for (const m of missions || []) {
      const pts = (m.estimate?.points || []).filter(p => Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && !inZone(p));
      if (!pts.length) continue;
      const la = pts.map(p => +p.lat),
        lo = pts.map(p => +p.lon);
      boxes.push({
        name: String(m.id || m.title || 'mission'),
        s: Math.floor(Math.min(...la) - .5),
        n: Math.ceil(Math.max(...la) + .5),
        w: Math.floor(Math.min(...lo) - .5),
        e: Math.ceil(Math.max(...lo) + .5)
      });
    }
    for (let merged = true; merged;) {
      merged = false;
      for (let i = 0; i < boxes.length && !merged; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (a.s <= b.n && b.s <= a.n && a.w <= b.e && b.w <= a.e) {
            boxes[i] = {
              name: `${a.name}, ${b.name}`,
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
    return boxes.filter(b => b.n - b.s <= 12 && b.e - b.w <= 12).map(b => ({
      ...b,
      name: `missions ${b.name}`
    }));
  }
  /** Grille MORA : une emprise (box : s, n, w, e) ou, sans emprise, tous les théâtres (MORA_ZONES) et les emprises
   *  supplémentaires (extra : missions hors théâtres, moraZonesOfMissions), cellules réunies. */
  async function computeMoraGrid(obstacleMax = {}, box = {}, progress, extra = []) {
    if (Number.isFinite(box?.s)) return computeMoraBox(obstacleMax, box, progress);
    const all = [];
    let peaksOk = true;
    const zones = [...MORA_ZONES, ...extra];
    for (const [zi, zone] of zones.entries()) {
      // progression : étape de l'emprise (d / n) et rang de l'emprise (zi / nombre) pour une jauge à deux niveaux
      const cells = await computeMoraBox(obstacleMax, zone, (d, n, step) => progress?.(d, n, `${zone.name} — ${step}`, zi, zones.length));
      peaksOk = peaksOk && cells.peaksOk;
      all.push(...cells);
    }
    all.peaksOk = peaksOk;
    return all;
  }
  // peaks : sommets OSM (Overpass, une requête par emprise) ; false pour les grandes zones calculées par blocs (relief
  // seul, majoré de 100 m : pas de charge sur les serveurs publics d'OpenStreetMap). fineMax : tuiles fines relues par case.
  async function computeMoraBox(obstacleMax = {}, {
    s = 41,
    n = 51,
    w = -5,
    e = 10,
    z = 9,
    fine = 12,
    peaks: withPeaks = true,
    fineMax = 8
  } = {}, progress) {
    const cell = {},
      spots = {},
      tiles = [];
    const tileX = (lon, zz) => Math.floor((lon + 180) / 360 * 2 ** zz),
      tileY = (lat, zz) => {
        const r = lat * Math.PI / 180;
        return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** zz);
      };
    for (let x = tileX(w, z); x <= tileX(e - 1e-9, z); x++)
      for (let y = tileY(n - 1e-9, z); y <= tileY(s, z); y++) tiles.push([x, y]);
    const pool = async (jobs, run) => {
      const queue = [...jobs];
      await Promise.all(Array.from({
        length: 8
      }, async () => {
        while (queue.length) await run(queue.shift());
      }));
    };
    let done = 0;
    await pool(tiles, async ([x, y]) => {
      scanTile(await terrariumTile(z, x, y), z, x, y, {
        s,
        n,
        w,
        e
      }, (lat, lon, h) => {
        const key = Math.floor(lat) + '|' + Math.floor(lon),
          t = tileX(lon, fine) + '/' + tileY(lat, fine),
          sp = spots[key] ??= {};
        if (!(h <= cell[key])) cell[key] = h;
        if (!(h <= sp[t])) sp[t] = h;
      });
      progress?.(++done, tiles.length, 'relief');
    });
    // Sommets lissés à ~200 m : relecture à ~25 m (z12) des tuiles proches du maximum de chaque cellule (8 au plus).
    const jobs = Object.entries(spots).flatMap(([key, sp]) => Object.entries(sp).filter(([, h]) => h >= cell[key] - 100).sort((a, b) =>
      b[1] - a[1]).slice(0, fineMax).map(([t]) => [key, t]));
    const cache = {};
    let fineDone = 0;
    await pool(jobs, async ([key, t]) => {
      const [x, y] = t.split('/').map(Number), [cl, co] = key.split('|').map(Number), d = await (cache[t] ??= terrariumTile(fine,
        x, y));
      scanTile(d, fine, x, y, {
        s: cl,
        n: cl + 1,
        w: co,
        e: co + 1
      }, (a, b, h) => {
        if (h > cell[key]) cell[key] = h;
      });
      progress?.(++fineDone, jobs.length, 'sommets');
    });
    // Le relief Terrarium (~90 m à la source) écrête les sommets de 20 à 90 m : altitudes des sommets OSM (natural=peak).
    const peak = {};
    let peaksOk = withPeaks;
    if (withPeaks) try {
      progress?.(0, 1, 'sommets OSM');
      const q = `[out:json][timeout:90];node["natural"="peak"]["ele"~"^[1-4][0-9]{3}([.,][0-9]+)?$"](${s},${w},${n},${e});out;`;
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(25000)
      });
      if (!r.ok) throw new Error(r.status);
      for (const node of (await r.json()).elements || []) {
        const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*(m|ft)?/i.exec(node.tags?.ele || '');
        if (!m) continue;
        const h = +m[1].replace(',', '.') * (/ft/i.test(m[2] || '') ? .3048 : 1),
          key = Math.floor(node.lat) + '|' + Math.floor(node.lon);
        if (h < 9000 && !(h <= peak[key])) peak[key] = h;
      }
    } catch {
      peaksOk = false;
    }
    const cells = Object.entries(cell).map(([key, m]) => {
      const [lat, lon] = key.split('|').map(Number), terrainFt = Math.max(0, m > 0 && !peaksOk ? m + 100 : m, peak[key] || 0) *
        3.28084,
        obstacleFt = obstacleMax[key] || 0, moraFt = moraOf(Math.max(terrainFt, obstacleFt));
      return {
        lat,
        lon,
        mora: moraLabel(moraFt),
        moraFt,
        terrainFt: Math.round(terrainFt),
        obstacleFt: Math.round(obstacleFt),
        latStep: 1,
        lonStep: 1
      };
    }).sort((a, b) => b.lat - a.lat || a.lon - b.lon);
    cells.peaksOk = peaksOk;
    return cells;
  }

  // ===================================================================== parseurs SIA
  const txt = (node, local) => {
    const e = node.getElementsByTagNameNS('*', local)[0];
    return e ? e.textContent.trim() : '';
  };
  /** Coordonnée AIXM « 471530N » / « 0023015E » / décimale → degrés décimaux. */
  function aixmDms(value, isLat) {
    value = (value || '').trim();
    if (!value) return NaN;
    const hemi = value.slice(-1).toUpperCase(),
      parts = value.slice(0, -1).split('.'),
      digits = parts[0],
      degLen = isLat ? 2 : 3;
    if (digits.length < degLen + 4) return NaN;
    const deg = +digits.slice(0, degLen),
      min = +digits.slice(degLen, degLen + 2),
      sec = +digits.slice(degLen + 2, degLen + 4) + (parts[1] ? +('0.' + parts[1]) : 0);
    return (hemi === 'S' || hemi === 'W' ? -1 : 1) * (deg + min / 60 + sec / 3600);
  }
  /** Arc AIXM (CWA / CCA) entre deux sommets autour d'un centre → suite de points. */
  function expandAixmArc(start, end, center, clockwise) {
    const cos = Math.cos(center[0] * Math.PI / 180),
      angle = p => Math.atan2(p[0] - center[0], (p[1] - center[1]) * cos);
    const a = angle(start);
    let delta = angle(end) - a;
    if (clockwise) {
      while (delta >= 0) delta -= Math.PI * 2;
    } else
      while (delta <= 0) delta += Math.PI * 2;
    const steps = Math.max(3, Math.ceil(Math.abs(delta) * 12)),
      r = Math.hypot((start[1] - center[1]) * cos, start[0] - center[0]),
      out = [];
    for (let i = 1; i < steps; i++) {
      const q = a + delta * i / steps;
      out.push([center[0] + Math.sin(q) * r, center[1] + Math.cos(q) * r / cos]);
    }
    out.push(end);
    return out;
  }
  const AIXM_TYPES = new Set(['R', 'D', 'P', 'CTR', 'TMA', 'CTA', 'TRA', 'SUR', 'PRN']);
  /** AIXM 4.5 : espaces R, D, P, CTR, TMA, CTA, TRA, survol interdit (SUR) et parcs (PRN), avec classes, limites verticales,
   *  zones AZBA, arcs et cercles ; SUR et PRN réduits à un point gardés (symbole seul). Remplacent ceux de XML_SIA pour ces types. */
  /** Gestionnaire et activation d'un espace d'après sa remarque AIXM (« Administrator : CDPGE Athis-Mons.# … AZBA charts »). */
  function activationOf(rmk) {
    // remarque sans séparateur (« Administrator : CCER Bordeaux Airspace defined… ») : nom arrêté au début de la phrase suivante
    const r = String(rmk || ''),
      admin = (/(?:Administrator|Gestionnaire)\s*:\s*([^#\n\r.]+)/i.exec(r)?.[1] || '').split(
        /\s+(?=(?:Airspace|Area|Zone|Activ\w*|Avoidance|Espace|Except\w*|Excluding|When|Lorsque)\b)/)[0].trim(),
      info = /(?:Activity known on|Actual activity provided by|Renseignements?\s*(?:sur l'activité)?)\s*:?\s*#?\s*-?\s*([^#\n\r]+)/i.exec(
        r)?.[1]?.trim().replace(/[.,;:]+$/, '') || '',
      act = /AZBA/i.test(r) ? 'AZBA' : /NOTAM/i.test(r) ? 'NOTAM' : /without notice|sans préavis/i.test(r) ? 'sans préavis' : '';
    return {
      admin,
      act,
      info
    };
  }

  function parseAixmAirspaces(doc) {
    const meta = new Map;
    for (const ase of doc.getElementsByTagName('Ase')) {
      const uid = ase.getElementsByTagName('AseUid')[0];
      if (!uid) continue;
      const mid = uid.getAttribute('mid'),
        raw = txt(uid, 'codeType').toUpperCase(),
        local = txt(ase, 'txtLocalType').toUpperCase(),
        type = raw === 'D-OTHER' && /SIV|FIS/.test(local) ? 'SIV' : raw === 'D-OTHER' && /^(SUR|PRN)$/.test(local) ? local : raw;
      const lim = (c, v, u) => {
        const code = txt(ase, c).toUpperCase(),
          val = txt(ase, v),
          uom = txt(ase, u).toUpperCase();
        if (!val && !code) return '';
        if (uom === 'FL' || code === 'STD') return 'FL ' + val;
        if (code === 'HEI' && +val === 0) return 'SFC';
        return `${val} ${uom === 'M' ? 'm' : 'ft'} ${code === 'HEI' ? 'ASFC' : 'AMSL'}`;
      };
      meta.set(mid, {
        type,
        cls: txt(ase, 'codeClass').toUpperCase(),
        name: txt(ase, 'txtName') || txt(uid, 'codeId'),
        key: txt(uid, 'codeId') || mid,
        lower: lim('codeDistVerLower', 'valDistVerLower', 'uomDistVerLower'),
        upper: lim('codeDistVerUpper', 'valDistVerUpper', 'uomDistVerUpper'),
        azba: /AZBA/i.test(txt(ase, 'txtRmk')),
        ...activationOf(txt(ase, 'txtRmk'))
      });
    }
    const grouped = new Map;
    for (const abd of doc.getElementsByTagName('Abd')) {
      const uid = abd.getElementsByTagName('AseUid')[0];
      if (!uid) continue;
      const mid = uid.getAttribute('mid'),
        meta1 = meta.get(mid) || {
          type: txt(uid, 'codeType').toUpperCase(),
          name: txt(uid, 'codeId'),
          key: txt(uid, 'codeId') || mid
        };
      if (!AIXM_TYPES.has(meta1.type)) continue;
      const ring = [],
        vx = [];
      for (const avx of abd.getElementsByTagName('Avx')) {
        const pt = [aixmDms(txt(avx, 'geoLat'), true), aixmDms(txt(avx, 'geoLong'), false)];
        if (Number.isFinite(pt[0]) && Number.isFinite(pt[1])) vx.push({
          pt,
          kind: txt(avx, 'codeType').toUpperCase(),
          center: [aixmDms(txt(avx, 'geoLatArc'), true), aixmDms(txt(avx, 'geoLongArc'), false)]
        });
      }
      vx.forEach((v, i) => {
        ring.push(v.pt);
        const next = vx[(i + 1) % vx.length];
        if ((v.kind === 'CWA' || v.kind === 'CCA') && vx.length > 1 && Number.isFinite(v.center[0]) && Number.isFinite(v.center[1]))
          ring.push(...expandAixmArc(v.pt, next.pt, v.center, v.kind === 'CWA').slice(0, -1));
      });
      const circle = abd.getElementsByTagName('Circle')[0];
      if (circle && !vx.length) {
        const c = [aixmDms(txt(circle, 'geoLatCen'), true), aixmDms(txt(circle, 'geoLongCen'), false)],
          km = +txt(circle, 'valRadius') * ({
            NM: 1.852,
            KM: 1,
            M: .001,
            FT: .0003048
          } [txt(circle, 'uomRadius').toUpperCase()] || 1.852);
        if (Number.isFinite(c[0]) && Number.isFinite(c[1]) && km > 0)
          for (let k = 0; k < 72; k++) {
            const t = k / 72 * 2 * Math.PI;
            ring.push([c[0] + km / 111.32 * Math.cos(t), c[1] + km / (111.32 * Math.cos(c[0] * Math.PI / 180)) * Math.sin(t)]);
          }
      }
      if (ring.length < 3 && !(/^(SUR|PRN)$/.test(meta1.type) && ring.length)) continue;
      const key = meta1.type + '|' + mid;
      if (!grouped.has(key)) grouped.set(key, {
        ...meta1,
        rings: []
      });
      grouped.get(key).rings.push(ring);
    }
    return [...grouped.values()];
  }
  /** Obstacles de l'AIXM : hauteur maximale (ft) par cellule de 1° ({ 'lat|lon': ft }). */
  function parseAixmObstacles(text) {
    const out = {};
    for (const chunk of text.split('<Obs>').slice(1)) {
      const b = chunk.slice(0, chunk.indexOf('</Obs>')),
        la = /<geoLat>([^<]+)<\/geoLat>/.exec(b),
        lo = /<geoLong>([^<]+)<\/geoLong>/.exec(b),
        el = /<valElev>([\d.]+)<\/valElev>/.exec(b),
        uom = /<uomDistVer>(\w+)<\/uomDistVer>/.exec(b);
      if (!la || !lo || !el) continue;
      const lat = aixmDms(la[1], true),
        lon = aixmDms(lo[1], false),
        ft = +el[1] * (uom && /^M$/i.test(uom[1]) ? 3.28084 : 1);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const k = Math.floor(lat) + '|' + Math.floor(lon);
      if (!(ft <= out[k])) out[k] = ft;
    }
    return out;
  }
  /** XML_SIA_<date>.xml (ISO-8859-1) : contours de tous les espaces (SIV, RMZ/TMZ, AP, FIR…) — <EspaceS> (type, nom) et
   *  <PartieS> (<Geometrie> « lat,lon » par ligne, arcs déjà densifiés). Découpage de chaînes, sans DOM : ≈ 40 ms pour 27 Mo. */
  function parseXmlSiaAirspaces(text) {
    const section = tag => {
      const a = text.indexOf(`<${tag}>`),
        b = a < 0 ? -1 : text.indexOf(`</${tag}>`, a);
      return a < 0 || b < 0 ? '' : text.slice(a, b);
    };
    const val = (b, t) => {
      const i = b.indexOf(`<${t}>`);
      if (i < 0) return '';
      return b.slice(i + t.length + 2, b.indexOf('<', i + t.length + 2)).trim();
    };
    const esp = new Map,
      out = new Map;
    for (const chunk of section('EspaceS').split('</Espace>')) {
      const m = /<Espace pk="(\d+)" lk="([^"]*)">/.exec(chunk);
      if (m) esp.set(m[1], {
        type: val(chunk, 'TypeEspace').toUpperCase(),
        name: val(chunk, 'Nom'),
        key: m[2]
      });
    }
    for (const chunk of section('PartieS').split('</Partie>')) {
      const i = chunk.indexOf('<Espace pk="');
      if (i < 0) continue;
      const pk = chunk.slice(i + 12, chunk.indexOf('"', i + 12)),
        e = esp.get(pk),
        g = val(chunk, 'Geometrie');
      if (!e || !g) continue;
      const ring = [];
      for (const p of g.split(/\s+/)) {
        const k = p.indexOf(','),
          lat = +p.slice(0, k),
          lon = +p.slice(k + 1);
        if (k > 0 && Number.isFinite(lat) && Number.isFinite(lon)) ring.push([lat, lon]);
      }
      if (ring.length < 2) continue;
      (out.get(pk) || out.set(pk, {
        ...e,
        rings: []
      }).get(pk)).rings.push(ring);
    }
    return [...out.values()];
  }
  /** Ancien fichier dérivé sia-airspaces-<date>.xml : lu seulement en l'absence de XML_SIA du même cycle. */
  function parseLegacyAirspaces(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML sia-airspaces invalide.');
    return [...doc.getElementsByTagNameNS('*', 'Airspace')].map(a => ({
      type: txt(a, 'type').toUpperCase(),
      name: txt(a, 'name'),
      key: txt(a, 'sourceKey'),
      rings: [...a.getElementsByTagNameNS('*', 'posList')].map(p => {
        const v = p.textContent.trim().split(/\s+/).map(Number),
          r = [];
        for (let i = 0; i + 1 < v.length; i += 2) r.push([v[i], v[i + 1]]);
        return r;
      }).filter(r => r.length > 1)
    }));
  }
  /** Rôle d'un XML du dossier, d'après son nom et son début (sans le charger entièrement). */
  async function inspectXml(file) {
    const head = await file.slice(0, 131072).text(),
      root = (head.match(/<([\w.-]+:)?([\w.-]+)(?:\s|>)/) || [])[2] || 'XML';
    let role = 'XML SIA annexe';
    if (/AirspaceDataset/i.test(root + head)) role = 'Contours dérivés (ancien format) — ignorés quand XML_SIA est présent';
    else if (/AIXM-Snapshot|AIXMBasicMessage/i.test(root + head) || /AIXM4\.5/i.test(file.name)) role =
      'AIXM complet — espaces, aérodromes, balises, obstacles';
    else if (/CoordinateDataset|miam/i.test(root + head)) role = 'Coordonnées ENR / MIAM';
    else if (/XML_SIA/i.test(file.name)) role = 'Export XML-SIA complet — contours d’espaces (SIV, RMZ/TMZ, AP…)';
    return {
      file,
      root,
      role
    };
  }
  const inRing = (ring, lat, lon) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [yi, xi] = ring[i], [yj, xj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  /** Aérodrome contrôlé : unité TWR dans l'AIXM, ou situé dans une CTR. */
  /** Points de report VFR du XML_SIA (NavFix de type VFR) : [{ id (« MM-CV »), name (« VRP-Cavaillon (…) »), lat, lon }]. */
  function parseXmlSiaVfrPoints(text) {
    const out = [];
    for (const m of String(text).matchAll(/<NavFix\b[^>]*>([\s\S]*?)<\/NavFix>/g)) {
      const b = m[1];
      if (!/<NavType>\s*VFR\s*<\/NavType>/.test(b)) continue;
      const tag = n => (new RegExp(`<${n}>([^<]*)</${n}>`).exec(b) || [])[1] || '';
      const lat = parseFloat(tag('Latitude')),
        lon = parseFloat(tag('Longitude'));
      if (Number.isFinite(lat) && Number.isFinite(lon)) out.push({
        id: tag('Ident').trim(),
        name: tag('Description').trim().replace(/^VRP-\s*/i, ''),
        lat,
        lon
      });
    }
    return out;
  }

  function markControlledAerodromes(aero, airspaces) {
    const ctr = airspaces.filter(a => a.type === 'CTR');
    for (const ad of aero?.aerodromes || [])
      if (!ad.controlled) ad.controlled = ctr.some(c => c.rings.some(r => inRing(r, ad.lat, ad.lon)));
  }

  // ===================================================================== lecture du dossier
  /** Laisse le navigateur respirer (affichage de la jauge) sans minuterie : MessageChannel n'est pas ralenti dans un
   *  onglet en arrière-plan, contrairement à setTimeout / requestAnimationFrame. */
  const breathe = () => new Promise(r => {
    const c = new MessageChannel();
    c.port1.onmessage = () => r();
    c.port2.postMessage(0);
  });
  /** Texte d'un fichier lu en flux (octets lus → onBytes) ; signal : annulation. */
  async function readText(file, {
    encoding = 'utf-8',
    onBytes,
    signal
  } = {}) {
    const dec = new TextDecoder(encoding),
      reader = file.stream().getReader(),
      parts = [];
    let n = 0;
    for (;;) {
      if (signal?.aborted) {
        reader.cancel().catch(() => {});
        throw new DOMException('Relecture annulée', 'AbortError');
      }
      const {
        done,
        value
      } = await reader.read();
      if (done) break;
      n += value.byteLength;
      parts.push(dec.decode(value, {
        stream: true
      }));
      onBytes?.(n);
    }
    parts.push(dec.decode());
    return parts.join('');
  }
  const mb = n => (n / 1048576).toFixed(1).replace('.', ',') + ' Mo';
  /** Fichiers (File) d'un dossier autorisé, sans les sous-dossiers. */
  async function filesOf(dir) {
    const out = [];
    for await (const h of dir.values()) if (h.kind === 'file') try {
      out.push(await h.getFile());
    } catch {
      /* verrouillé */
    }
    return out;
  }
  /** Sous-dossier d'un dossier (null s'il n'existe pas). */
  const subDir = async (dir, ...names) => {
    try {
      for (const n of names) dir = await dir.getDirectoryHandle(n);
      return dir;
    } catch {
      return null;
    }
  };
  const X_FILES = ['earth_nav.dat', 'earth_fix.dat', 'earth_awy.dat', 'earth_mora.dat'];
  /** Fichiers X-Plane d'un dossier du simulateur (racine, « Custom Data » prioritaire sur « Resources/default data »,
   *  ou dossier qui contient lui-même les earth_*.dat) et ses espaces OpenAir (dossier « airspace(s) » des données). */
  async function xplaneFiles(root) {
    const out = [],
      seen = new Set;
    for (const d of [root, await subDir(root, 'Custom Data'), await subDir(root, 'Resources', 'default data')].filter(Boolean)) {
      for (const n of X_FILES)
        if (!seen.has(n)) try {
          out.push(await (await d.getFileHandle(n)).getFile());
          seen.add(n);
        } catch {
          /* absent */
        }
      for (const a of ['airspace', 'airspaces']) {
        const sd = await subDir(d, a);
        // espaces OpenAir (airspace.txt ; pas borders.txt) : ceux de « Custom Data » d'abord, un seul de chaque nom
        if (sd)
          for (const f of await filesOf(sd))
            if (/airspace.*\.(txt|air)$/i.test(f.name) && !seen.has(f.name)) {
              out.push(f);
              seen.add(f.name);
            }
      }
    }
    return out;
  }
  /** Fichiers des autres sources : sous-dossiers aixm5/, geojson/, openaip/ du dossier SIA ; dossier X-Plane mémorisé
   *  (__xpnav), seulement si la source est active (demande d'accès seulement si request, depuis un clic). */
  async function extraFiles(dir, {
    request = false
  } = {}) {
    const AS = await needAero(),
      Z = await needZones();
    if (!AS) return {};
    const out = {},
      ok = f => /\.(xml|geojson|json|txt|air)$/i.test(f.name);
    // chemin relatif au dossier SIA gardé sur chaque fichier (zone et source : AeroZones.fileSource)
    for (const id of SOURCE_DIRS) {
      const sd = await subDir(dir, id);
      if (sd) out[id] = (await filesOf(sd)).filter(ok).map(f => Object.assign(f, {
        __rel: `${id}/${f.name}`
      }));
    }
    const zd = await subDir(dir, 'zones');
    if (zd)
      for await (const h of zd.values())
    if (h.kind === 'directory')
      for (const f of (await filesOf(h)).filter(ok))(out.aixm5 ||= []).push(Object.assign(f, {
        __rel: `zones/${h.name}/${f.name}`
      })); // lecteur choisi par l'extension
    const s = Z?.settings(),
      xp = !Z || Object.keys(s.on).some(id => Z.isOn(id, s) && Z.srcOn(id, 'xplane', s));
    if (xp) {
      const st = await window.FileAccess?.status?.('__xpnav');
      let ok = st?.handle && st.permission === 'granted';
      if (st?.handle && !ok && request) ok = await st.handle.requestPermission({
        mode: 'read'
      }) === 'granted';
      if (ok) out.xplane = await xplaneFiles(st.handle);
    }
    return out;
  }
  /** Fichier livré avec l'application (shared/carto/) : fetch (page servie en http), sinon dossier de l'application
   *  mémorisé (__repo) s'il est déjà autorisé — jamais d'invite en pleine lecture (en file://, fetch est refusé). */
  async function appAsset(name) {
    try {
      const r = await fetch(appUrl('shared/carto/' + encodeURIComponent(name)));
      if (r.ok) return new File([await r.blob()], name);
    } catch {
      /* file:// */
    }
    try {
      const st = await window.FileAccess?.status?.('__repo');
      if (st?.handle && st.permission === 'granted') {
        let d = st.handle;
        for (const part of ['shared', 'carto']) d = await d.getDirectoryHandle(part);
        return await (await d.getFileHandle(name)).getFile();
      }
    } catch {
      /* absent */
    }
    return null;
  }
  const AIRAC_NAME = /^(?:AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)(\d{4}-\d{2}-\d{2})\.xml$/i;
  /** Analyse d'un dossier SIA (liste de File) → base (non mémorisée) + compte rendu.
   *  Un seul cycle : le plus récent des fichiers datés (les autres sont écartés, sinon contours mélangés).
   *  progress(texte) : étape en cours. Résultat : { base, report: { airac, skipped, xmlCount, aixmAirspaces, noCities } }. */
  async function build(files, {
    folderName = 'Dossier SIA',
    progress = () => {},
    signal,
    extra = {}
  } = {}) {
    const t0 = performance.now(),
      timings = [];
    const AS = await needAero(),
      Z = await needZones(),
      zs = Z?.settings(),
      // zones actives et sources cochées (Paramètres › Maintenance › Données aéronautiques) ; sans zones : tout est lu
      wanted = rel => !Z || Z.fileWanted(rel, zs),
      xpZones = Z ? Object.keys(zs.on).filter(id => Z.isOn(id, zs) && Z.srcOn(id, 'xplane', zs)) : null;
    // dossier choisi par le sélecteur natif (chemins relatifs) : fichiers des sous-dossiers des sources rangés à part
    extra = {
      ...extra
    };
    files = files.filter(f => {
      const parts = (f.webkitRelativePath || '').split('/'),
        dir = parts.slice(-2, -1)[0];
      if (parts[parts.length - 3] === 'zones') {
        f.__rel = `zones/${dir}/${f.name}`;
        (extra.aixm5 ||= []).push(f);
        return false;
      }
      if (!SOURCE_DIRS.includes(dir)) return true;
      f.__rel = `${dir}/${f.name}`;
      (extra[dir] ||= []).push(f);
      return false;
    });
    const extraOk = (id, f) => id === 'xplane' ? !xpZones || xpZones.length > 0 : wanted(f.__rel || `${id}/${f.name}`);
    let xmlFiles = files.filter(f => /\.xml$/i.test(f.name) && !/^miam-enr-5-7-/i.test(f.name) && wanted(f.name));
    const extraCount = Object.entries(extra).reduce((n, [id, l]) => n + l.filter(f => extraOk(id, f)).length, 0);
    if (!xmlFiles.length && !extraCount) throw new Error(Z && !Object.values(zs.on).some(Boolean) ?
      'Aucune zone active : Paramètres › Maintenance › Données aéronautiques, cliquer les zones voulues sur la carte.' :
      'Aucun fichier pour les zones actives et leurs sources cochées : Paramètres › Maintenance › Données aéronautiques.');
    const airacOf = f => AIRAC_NAME.exec(f.name)?.[1] || '',
      dates = [...new Set(xmlFiles.map(airacOf).filter(Boolean))].sort(),
      airac = dates[dates.length - 1] || '';
    const skipped = xmlFiles.filter(f => airacOf(f) && airacOf(f) !== airac);
    xmlFiles = xmlFiles.filter(f => !skipped.includes(f));
    const hasXmlSia = xmlFiles.some(f => /^XML_SIA_/i.test(f.name));
    const isAixm = f => /AIXM4\.5_all/i.test(f.name),
      isSia = f => /^XML_SIA_/i.test(f.name);
    // Jauge : chaque octet lu compte 1 ; analyse de l'AIXM (DOM) ≈ 0,8 × sa taille ; enregistrement ≈ 15 % du total lu.
    const moraFile = wanted('mora.csv') ? files.find(f => /^mora\.csv$/i.test(f.name)) : null,
      tracks = wanted('miam-enr-5-7-tracks.xml') ? files.find(f => /^miam-enr-5-7-tracks\.xml$/i.test(f.name)) : null;
    const extraSize = Object.entries(extra).reduce((n, [id, l]) => n + l.filter(f => extraOk(id, f)).reduce((m, f) => m + f.size, 0),
      0);
    const readSize = xmlFiles.reduce((n, f) => n + f.size, 0) + (moraFile?.size || 0) + (tracks?.size || 0) + 2.5e6 + 1.5 * extraSize;
    const total = readSize + 0.8 * xmlFiles.filter(isAixm).reduce((n, f) => n + f.size, 0) + 0.15 * readSize;
    let doneUnits = 0,
      phase = '',
      phaseAt = t0;
    const step = async (label, units = 0) => {
      if (phase) timings.push([phase, performance.now() - phaseAt]);
      phase = label;
      phaseAt = performance.now();
      doneUnits += units;
      progress(label, Math.min(1, doneUnits / total));
      if (signal?.aborted) throw new DOMException('Relecture annulée', 'AbortError');
      await breathe();
    };
    const reading = (label, file) => {
      const base = doneUnits;
      return n => progress(`${label} — ${mb(n)} / ${mb(file.size)}`, Math.min(1, (base + n) / total));
    };
    const text = async (label, file, encoding) => {
      await step(label);
      const t = await readText(file, {
        encoding,
        signal,
        onBytes: reading(label, file)
      });
      doneUnits += file.size;
      return t;
    };

    await step('Villes (livrées avec l’application)…');
    const city = files.find(f => /^villes_geonames\.csv$/i.test(f.name)) || await appAsset('villes_geonames.csv');
    let airspaces = [],
      aixmAirspaces = [],
      obstacleMax = {},
      aero = null,
      vfrPoints = [];
    const inventory = [];
    for (const f of xmlFiles) {
      const x = await inspectXml(f);
      inventory.push(x);
      if (/AirspaceDataset/i.test(x.root + x.role)) {
        if (!hasXmlSia) airspaces.push(...parseLegacyAirspaces(await text(`Lecture de ${f.name}`, f)));
        else doneUnits += f.size;
      } else if (isSia(f)) {
        const t = await text(`Lecture de ${f.name}`, f, 'iso-8859-1');
        await step('Contours d’espaces (XML_SIA)…');
        airspaces.push(...parseXmlSiaAirspaces(t));
        vfrPoints = parseXmlSiaVfrPoints(t);
      } else if (isAixm(f) || /AIXM-Snapshot|AIXMBasicMessage/i.test(x.root)) {
        const t = await text(`Lecture de ${f.name}`, f);
        await step('Analyse de l’AIXM : espaces R / D / P / CTR / TMA…');
        const doc = new DOMParser().parseFromString(t, 'application/xml');
        if (doc.querySelector('parsererror')) throw new Error(`AIXM 4.5 invalide : ${f.name}`);
        aixmAirspaces = parseAixmAirspaces(doc);
        await step('Analyse de l’AIXM : obstacles…', 0.3 * f.size);
        obstacleMax = parseAixmObstacles(t);
        await step('Analyse de l’AIXM : aérodromes et balises…', 0.2 * f.size);
        aero = window.SiaAero?.parseAixm ? window.SiaAero.parseAixm(t) : null;
        doneUnits += 0.3 * f.size;
      } else doneUnits += f.size;
    }
    if (aixmAirspaces.length) airspaces = airspaces.filter(a => !AIXM_TYPES.has(a.type)).concat(aixmAirspaces);
    const seen = new Set;
    airspaces = airspaces.filter(a => {
      const k = a.type + '|' + a.name + '|' + a.key;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // sources : SIA (zones AZBA / RTBA : DIRCAM), désactivables
    for (const a of airspaces) a.src ||= a.azba ? 'dircam' : 'sia';
    if (aero) {
      await step('Aérodromes contrôlés (CTR)…');
      markControlledAerodromes(aero, airspaces);
      aero.vrp = vfrPoints;
    }
    const cities = city ? parseCities(await text('Villes (villes_geonames.csv)', city)) : [];
    const moraCells = moraFile ? parseMora(await text('Grille MORA (mora.csv)', moraFile)) : [];
    const aarXml = tracks ? await text('Axes de ravitaillement (ENR 5.7)', tracks) : '';
    await step('Enregistrement dans le navigateur…');
    // axes de ravitaillement d'autres pays (zones/<zone>/…-tracks.xml, format de la MILAIP française : UK Mil AIP AARA),
    // déclarés avant la base qui les référence
    const aarExtra = [];
    const base = {
      parserVersion: VERSION,
      airac,
      skippedXml: skipped.map(f => f.name),
      folderName,
      airspaces,
      cities,
      moraCells,
      obstacleMax,
      aarXml,
      aarXmlExtra: aarExtra,
      aero,
      xmlInventoryData: inventory.map(i => ({
        name: i.file.name,
        role: i.role,
        mb: (i.file.size / 1048576).toFixed(1)
      })),
      cachedAt: Date.now()
    };
    // autres sources (shared/aero_sources.js) : ajoutées sans doublon après le SIA, dans l'ordre des réglages ; dans les
    // FIR françaises (contours XML_SIA), le SIA seul : un espace d'une autre source dont le centre y tombe est écarté
    // (les autres sources découpent et nomment les mêmes espaces autrement)
    const bySource = {};
    const FR_FIR = /^(PARIS|REIMS|BREST|BORDEAUX|MARSEILLE|CAYENNE)$/i,
      cover = base.airspaces.filter(a => a.type === 'FIR' && a.src === 'sia' && FR_FIR.test(a.name)).map(a => a.rings[0]).filter(
        Boolean);
    const inFrance = a => {
      let la0 = 90,
        la1 = -90,
        lo0 = 180,
        lo1 = -180;
      for (const [la, lo] of a.rings?.[0] || []) {
        la0 = Math.min(la0, la);
        la1 = Math.max(la1, la);
        lo0 = Math.min(lo0, lo);
        lo1 = Math.max(lo1, lo);
      }
      return la0 <= la1 && cover.some(r => inRing(r, (la0 + la1) / 2, (lo0 + lo1) / 2));
    };
    // axes de ravitaillement d'autres pays : remplis plus bas (même tableau que base.aarXmlExtra)
    if (AS)
      for (const src of AS.SOURCES.filter(x => x.dir || x.id === 'xplane')) {
        const list = (extra[src.id] || []).filter(f => extraOk(src.id, f));
        if (!list.length) continue;
        const parts = [];
        for (const f of list) {
          const t = await text(`${src.id} : lecture de ${f.name}`, f);
          await step(`${src.id} : analyse de ${f.name}…`, 0.5 * f.size);
          let part = null,
            role = '';
          try {
            if (src.id === 'xplane' && /^earth_\w+\.dat$/i.test(f.name)) {
              part = AS.xplane(f.name, t);
              role = 'X-Plane — ' + f.name;
            } else if (/\.(geo)?json$/i.test(f.name)) {
              part = AS.geojson(JSON.parse(t), f.name);
              role = 'GeoJSON';
            } else if (/\.(txt|air|openair)$/i.test(f.name)) {
              part = {
                airspaces: AS.openair(t, src.id)
              };
              role = 'OpenAir';
            } else if (/-tracks\.xml$/i.test(f.name)) {
              aarExtra.push(t);
              role = 'axes de ravitaillement';
            } else if (/\.xml$/i.test(f.name)) {
              part = AS.aixm5(t);
              role = 'AIXM 5.1';
            }
          } catch (e) {
            role = `illisible (${e.message})`;
          }
          inventory.push({
            file: f,
            role: `${src.id} — ${role || 'format inconnu, ignoré'}`
          });
          if (part) parts.push(part);
        }
        if (src.id === 'xplane') {
          // voies : extrémités prises dans les points et balises lus ; points : seulement ceux de la route (ENRT)
          const pts = parts.flatMap(p => p.aero?.points || []),
            navs = parts.flatMap(p => p.aero?.navaids || []);
          for (const p of parts)
            if (p.aero?.airways?.length) p.aero.airways = AS.resolveAirways(p.aero.airways, pts, navs);
          for (const p of parts)
            if (p.aero?.points) p.aero.points = p.aero.points.filter(x => x.type === 'ICAO');
          // données mondiales : découpées aux contours des zones actives qui ont coché X-Plane (marge d'un demi-degré)
          if (xpZones) {
            const inZ = Z.inZones(xpZones),
              mid = a => {
                const r = a.rings?.[0] || [];
                let la = 0,
                  lo = 0;
                for (const [y, x] of r) {
                  la += y;
                  lo += x;
                }
                return r.length ? inZ(la / r.length, lo / r.length) : false;
              };
            for (const p of parts) {
              if (p.airspaces) p.airspaces = p.airspaces.filter(mid);
              if (p.aero) {
                for (const k of ['navaids', 'points', 'vrp'])
                  if (p.aero[k]) p.aero[k] = p.aero[k].filter(x => inZ(x.lat, x.lon));
                if (p.aero.airways) p.aero.airways = p.aero.airways.filter(w => inZ(w.a.lat, w.a.lon) || inZ(w.b.lat, w.b.lon));
              }
              if (p.moraCells) p.moraCells = p.moraCells.filter(c => inZ(c.lat, c.lon));
            }
          }
        }
        const before = base.airspaces.length;
        for (const p of parts) {
          for (const a of p.airspaces || []) a.src ||= src.id;
          if (cover.length && p.airspaces) p.airspaces = p.airspaces.filter(a => !inFrance(a));
          AS.merge(base, p);
        }
        bySource[src.id] = {
          files: list.length,
          airspaces: base.airspaces.length - before
        };
      }
    base.sources = Z ? {
      zones: Object.keys(zs.on).filter(id => Z.isOn(id, zs))
    } : {};
    base.xmlInventoryData = inventory.map(i => ({
      name: i.file.name,
      role: i.role,
      mb: (i.file.size / 1048576).toFixed(1)
    }));
    const report = {
      airac,
      skipped: base.skippedXml,
      xmlCount: inventory.length,
      aixmAirspaces: aixmAirspaces.length,
      noCities: !city,
      noMora: !moraFile,
      bySource,
      timings
    };
    report.finish = () => {
      timings.push([phase, performance.now() - phaseAt]);
      report.total = performance.now() - t0;
      progress('Terminé', 1);
    };
    return {
      base,
      report
    };
  }
  /** Relit le dossier SIA mémorisé (__sia, ou dir) et mémorise la base. request : demander l'autorisation si besoin
   *  (à appeler depuis un clic). Résultat de build(). */
  async function rebuild({
    dir = null,
    request = true,
    progress,
    signal
  } = {}) {
    if (!dir) {
      const st = await window.FileAccess?.status?.('__sia');
      if (!st?.handle) throw new Error(
        'Dossier SIA non choisi : Paramètres › Installation › Sources et dossiers (dossier des données).');
      dir = st.handle;
      if (st.permission !== 'granted') {
        if (!request || await dir.requestPermission({
            mode: 'readwrite'
          }) !== 'granted') throw new Error('Accès au dossier SIA refusé.');
      }
    }
    progress?.(`Liste des fichiers du dossier « ${dir.name} »…`, 0);
    const extra = await extraFiles(dir, {
      request
    });
    const r = await build(await filesOf(dir), {
      folderName: dir.name,
      progress,
      signal,
      extra
    });
    await put(r.base);
    r.report.finish();
    return r;
  }

  // ===================================================================== bloc d'interface commun
  const L = row => row[Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'))] || row[0];
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  const T = {
    folder: ['Dossier SIA', 'SIA folder', 'SIA-Ordner', 'Carpeta SIA'],
    reread: ['Reconstruire la base aéronautique', 'Rebuild the aeronautical database', 'Luftfahrtdatenbank neu aufbauen',
      'Reconstruir la base aeronáutica'
    ],
    purge: ['Purger le cache', 'Purge the cache', 'Cache leeren', 'Vaciar la caché'],
    pick: ['Choisir le dossier SIA…', 'Choose the SIA folder…', 'SIA-Ordner wählen…', 'Elegir la carpeta SIA…'],
    none: ['Aucune base mémorisée.', 'No stored base.', 'Keine gespeicherte Basis.', 'Ninguna base guardada.'],
    reading: ['Relecture en cours…', 'Re-reading…', 'Wird eingelesen…', 'Releyendo…'],
    confirmPurge: ['Purger la base aéronautique mémorisée dans ce navigateur ? Elle sera reconstruite à la prochaine reconstruction.',
      'Purge the aeronautical database stored in this browser? It is rebuilt at the next rebuild.',
      'Die in diesem Browser gespeicherte Luftfahrtdatenbank leeren? Sie wird beim nächsten Neuaufbau wiederhergestellt.',
      '¿Vaciar la base aeronáutica guardada en este navegador? Se reconstruirá en la próxima reconstrucción.'
    ],
    purged: ['Cache purgé : reconstruire la base aéronautique.', 'Cache purged: rebuild the aeronautical database.',
      'Cache geleert: Luftfahrtdatenbank neu aufbauen.', 'Caché vaciada: reconstruir la base aeronáutica.'
    ],
    empty: ['Cache déjà vide.', 'Cache already empty.'],
    old: ['Base mémorisée d’une version précédente : reconstruire la base aéronautique.',
      'Stored base from an earlier version: rebuild the aeronautical database.',
      'Gespeicherte Basis einer früheren Version: Luftfahrtdatenbank neu aufbauen.',
      'Base guardada de una versión anterior: reconstruir la base aeronáutica.'
    ],
    files: ['Fichiers analysés', 'Analysed files', 'Analysierte Dateien', 'Archivos analizados'],
    cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    cancelled: ['Relecture annulée : la base mémorisée n’a pas changé.', 'Re-read cancelled: the stored base is unchanged.'],
    stall: [
      'Aucun avancement depuis {s} s sur « {p} ». Causes possibles : onglet en arrière-plan (le laisser au premier plan), fichier en cours de téléchargement par Synology Drive (fichier « à la demande » : le rendre disponible hors ligne), autre onglet du studio ou de Paramètres ouvert. Annuler puis relancer si cela persiste.',
      'No progress for {s} s on “{p}”. Possible causes: background tab, file being downloaded by the sync client (on-demand file), another studio / Settings tab open. Cancel and retry if it persists.'
    ],
    durations: ['Durées', 'Durations', 'Dauer', 'Duraciones']
  };
  /** Ligne d'état de la base mémorisée (cycle, date, périmé ?). */
  function stateLine(b) {
    if (!b) return esc(L(T.none));
    const cur = window.Airac?.cycle?.(),
      date = b.cachedAt ? new Date(b.cachedAt).toLocaleString() : '';
    const late = cur && b.airac && b.airac < cur.date;
    return `${esc(L(['Base mémorisée', 'Stored base', 'Gespeicherte Basis', 'Base guardada']))} : <b>${esc(b.folderName || '?')}</b>${b.airac ? ` — AIRAC <b>${esc(b.airac)}</b>` : ''}${date ? ` — ${esc(date)}` : ''}${late ? ` <span class="err">${esc(L([`cycle périmé (en vigueur : ${cur.label} du ${cur.date})`, `outdated cycle (in force: ${cur.label} since ${cur.date})`]))}</span>` : ''}`;
  }
  /** Compte rendu d'une relecture (message de succès et avertissements). */
  function reportHtml(base, r) {
    const warn = [];
    if (r.skipped.length) warn.push(L([`Autre(s) cycle(s) écarté(s) : ${r.skipped.join(', ')} — à archiver (Paramètres › Maintenance).`, `Other cycle(s) skipped: ${r.skipped.join(', ')} — archive them.`]));
    if (r.noCities) warn.push(L(['villes_geonames.csv introuvable (shared/carto/) : noms de villes indisponibles.',
      'villes_geonames.csv not found: no city names.'
    ]));
    return `<span class="ok">✓ ${esc(L(['Base chargée et mémorisée', 'Base loaded and stored', 'Basis geladen und gespeichert', 'Base cargada y guardada']))}${r.airac ? ` (AIRAC ${esc(r.airac)})` : ''} : ${r.xmlCount} XML, ${base.airspaces.length} ${esc(L(['espaces', 'airspaces']))}, ${(base.aero?.aerodromes || []).length} ${esc(L(['aérodromes', 'aerodromes']))}, ${Object.keys(base.obstacleMax || {}).length} ${esc(L(['cellules d’obstacles', 'obstacle cells']))}, ${base.cities.length} ${esc(L(['villes', 'cities']))}.</span>${Object.keys(r.bySource || {}).length ? `<br><span class="small">${esc(L(['Autres sources', 'Other sources', 'Weitere Quellen', 'Otras fuentes']))} : ${Object.entries(r.bySource).map(([k, v]) => `${esc(k)} ${v.files} ${esc(L(['fichier(s)', 'file(s)', 'Datei(en)', 'archivo(s)']))}, +${v.airspaces} ${esc(L(['espaces', 'airspaces', 'Lufträume', 'espacios']))}`).join(' · ')}</span>` : ''}${warn.map(w => `<br><span class="err">${esc(w)}</span>`).join('')}`;
  }
  /** Bloc « Base de données SIA » : dossier (bouton FileAccess), Relire, Purger, état, compte rendu, fichiers analysés.
   *  opts.onLoaded(base, report) après une relecture ; opts.onCached(base) quand la base mémorisée est affichée ;
   *  opts.onPurged(). Renvoie { reread(request), refresh(), setMessage(html), el }. Sans File System Access (Firefox) :
   *  sélecteur de dossier natif. */
  function panel(host, opts = {}) {
    host.classList.add('sia-base-panel');
    host.innerHTML = `<div class="sia-base-actions"><span class="sia-base-folder"></span><button type="button" class="primary sia-base-reread" data-icon="refresh">${esc(L(opts.rereadLabel || T.reread))}</button><button type="button" class="secondary sia-base-purge" data-icon="trash">${esc(L(T.purge))}</button><label class="secondary sia-base-native" hidden>${esc(L(T.pick))}<input type="file" webkitdirectory directory multiple hidden></label></div>
      <p class="sia-base-state small"></p><div class="sia-base-progress" hidden><progress max="1" value="0"></progress><span class="sia-base-pct"></span><button type="button" class="secondary sia-base-cancel">${esc(L(T.cancel))}</button><div class="sia-base-step small"></div><div class="sia-base-stall small err" hidden></div></div><div class="sia-base-msg" aria-live="polite" data-status></div><details class="sia-base-files small" hidden><summary>${esc(L(T.files))}</summary><ul></ul></details>`;
    // libellés des boutons repris une fois la langue de la page réglée (le bloc peut être créé avant : ils restaient en
    // français), puis à chaque changement de langue ; l'icône du bouton est gardée (seul le nœud texte change)
    const relabel = () => [
      ['.sia-base-reread', opts.rereadLabel || T.reread],
      ['.sia-base-purge', T.purge]
    ].forEach(([sel, row]) => {
      const b = host.querySelector(sel),
        tn = b && [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (tn) tn.textContent = L(row);
    });
    setTimeout(relabel);
    window.addEventListener('repository-language-change', relabel);
    const $ = s => host.querySelector(s),
      msg = $('.sia-base-msg'),
      state = $('.sia-base-state');
    const setMessage = html => {
      msg.innerHTML = html || '';
    };
    window.AppFramework?.watchStatus?.(host); // erreurs de lecture → notification
    const showFiles = b => {
      const list = b?.xmlInventoryData || [];
      $('.sia-base-files').hidden = !list.length;
      $('.sia-base-files ul').innerHTML = list.map(i => `<li><code>${esc(i.name)}</code> — ${esc(i.role)} (${esc(i.mb)} Mo)</li>`).join('');
    };
    let busy = false,
      controller = null;
    async function refresh() {
      const any = await get({
          any: true
        }),
        b = any?.parserVersion === VERSION ? any : null;
      state.innerHTML = any && !b ? `<span class="err">${esc(L(T.old))}</span>` : stateLine(b);
      showFiles(b);
      if (b) opts.onCached?.(b);
      return b;
    }
    const gauge = $('.sia-base-progress'),
      bar = gauge.querySelector('progress'),
      pct = gauge.querySelector('.sia-base-pct'),
      stepEl = gauge.querySelector('.sia-base-step'),
      stall = gauge.querySelector('.sia-base-stall');
    const secs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
    async function run(task) {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      host.querySelectorAll('button:not(.sia-base-cancel)').forEach(x => {
        x.disabled = true;
      });
      state.textContent = L(T.reading);
      setMessage('');
      // tâche déclarée au socle (sa jauge reste celle du panneau) : avertissement avant de quitter la page
      const job = window.AppFramework?.task?.(L(T.reading), {
        quiet: true
      });
      const t0 = Date.now();
      let last = {
        label: L(T.reading),
        at: t0
      };
      const paint = () => {
        const el = Math.round((Date.now() - t0) / 1000),
          idle = Math.round((Date.now() - last.at) / 1000);
        stepEl.textContent = `${last.label} · ${el} s`;
        stall.hidden = idle < 15;
        if (!stall.hidden) stall.textContent = L(T.stall).replace('{s}', idle).replace('{p}', last.label);
      };
      const onProgress = (label, fraction) => {
        if (label !== last.label || fraction !== last.fraction) last = {
          label,
          fraction,
          at: Date.now()
        };
        if (fraction != null) {
          bar.value = fraction;
          pct.textContent = Math.round(fraction * 100) + ' %';
        }
        paint();
        console.info('[SiaBase]', secs(Date.now() - t0), label, fraction != null ? Math.round(fraction * 100) + ' %' : '');
      };
      bar.value = 0;
      pct.textContent = '0 %';
      gauge.hidden = false;
      stall.hidden = true;
      const ticker = setInterval(paint, 1000);
      try {
        const r = await task(onProgress, controller.signal);
        const times = (r.report.timings || []).filter(([, ms]) => ms >= 50).map(([k, ms]) => `${esc(k.replace(/…$/, ''))} ${secs(ms)}`).join(' · ');
        setMessage(reportHtml(r.base, r.report) + `<details class="small"><summary>${esc(L(T.durations))} : ${secs(r.report.total || (Date.now() - t0))}</summary>${times}</details>`);
        state.innerHTML = stateLine(r.base);
        showFiles(r.base);
        opts.onLoaded?.(r.base, r.report);
      } catch (e) {
        setMessage(e?.name === 'AbortError' ? `<span class="small">${esc(L(T.cancelled))}</span>` : `<span class="err">${esc(e.message)}</span>`);
        console.warn('[SiaBase]', e);
        await refresh();
      } finally {
        job?.end();
        clearInterval(ticker);
        gauge.hidden = true;
        busy = false;
        controller = null;
        host.querySelectorAll('button').forEach(x => {
          x.disabled = false;
        });
      }
    }
    $('.sia-base-cancel').onclick = () => controller?.abort();
    const reread = (request = true) => run((progress, signal) => rebuild({
      request,
      progress,
      signal
    }));
    $('.sia-base-reread').onclick = () => reread(true);
    $('.sia-base-purge').onclick = async () => {
      if (!confirm(L(T.confirmPurge))) return;
      const had = await purge();
      setMessage(`<span class="${had ? 'ok' : 'small'}">${esc(L(had ? T.purged : T.empty))}</span>`);
      await refresh();
      opts.onPurged?.();
    };
    const input = $('.sia-base-native input');
    input.onchange = () => {
      const files = [...input.files];
      input.value = '';
      if (files.length) run(async (progress, signal) => {
        const r = await build(files, {
          folderName: (files[0].webkitRelativePath || '').split('/')[0] || 'SIA',
          progress,
          signal
        });
        await put(r.base);
        r.report.finish();
        return r;
      });
    };
    // Bouton du dossier mémorisé (FileAccess) ; sinon sélecteur natif.
    (function folderButton(tries = 0) {
      if (!window.FileAccess) {
        if (tries < 50) setTimeout(() => folderButton(tries + 1), 100);
        else {
          $('.sia-base-native').hidden = false;
          $('.sia-base-reread').hidden = true;
        }
        return;
      }
      if (!window.showDirectoryPicker) {
        $('.sia-base-native').hidden = false;
        $('.sia-base-reread').hidden = true;
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary';
      b.textContent = L(T.folder) + ' : …';
      b.onclick = async () => {
        try {
          await window.FileAccess.pickFolder('__sia');
          await reread(false);
        } catch (e) {
          if (e?.name !== 'AbortError') setMessage(`<span class="err">${esc(e.message)}</span>`);
        }
      };
      window.FileAccess.decorate?.(b, '__sia');
      $('.sia-base-folder').replaceChildren(b);
    })();
    refresh();
    return {
      el: host,
      reread,
      refresh,
      setMessage
    };
  }
  if (!document.getElementById('siaBaseStyle')) document.head.insertAdjacentHTML('beforeend',
    '<style id="siaBaseStyle">.sia-base-actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}.sia-base-msg{margin:.4rem 0}.sia-base-state{margin:.4rem 0}.sia-base-progress{margin:.5rem 0;display:flex;flex-wrap:wrap;gap:.3rem .6rem;align-items:center}.sia-base-progress progress{flex:1 1 240px;height:14px}.sia-base-progress .sia-base-step,.sia-base-progress .sia-base-stall{flex-basis:100%}</style>'
  );

  window.SiaBase = {
    VERSION,
    aero: needAero,
    zones: needZones,
    extraFiles,
    get,
    put,
    patch,
    purge,
    summarize,
    summary,
    info,
    previous,
    remember,
    filesOf,
    build,
    rebuild,
    appAsset,
    inspectXml,
    parseXmlSiaAirspaces,
    parseAixmAirspaces,
    parseAixmObstacles,
    parseLegacyAirspaces,
    aixmDms,
    expandAixmArc,
    markControlledAerodromes,
    inRing,
    csvRows,
    csvField,
    parseCities,
    parseMora,
    moraLabel,
    moraOf,
    moraFtOf,
    moraCycle,
    moraCsv,
    moraFromObstacles,
    computeMoraGrid,
    moraZonesOfMissions,
    MORA_ZONES,
    MORA_SOURCE,
    panel
  };
})();
