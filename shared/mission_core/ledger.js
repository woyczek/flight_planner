(() => {
  'use strict';
  // Mission Report Core — registre UNIQUE des missions, toutes familles : CR DEFA/missions.yaml
  // (chaque mission porte sa famille). Sources, la plus récente (updatedAt) l'emporte :
  // fichier du dossier « CR DEFA » autorisé (Chrome / Edge, une seule autorisation), copie du
  // navigateur (partagée entre pages), fichier servi avec le dépôt (lecture seule).
  //
  // Vues par famille : MissionLedger.open(famille) — missions de la famille, index propres à
  // la vue (CR, reporting), même interface que l'ancien registre par famille.
  //
  // Migration : les anciens registres par famille (<DOSSIER>/<famille>_missions.yaml : dossier
  // autorisé, copie navigateur « missionCoreLedger:v1:<FAMILLE> », fichier servi) sont fusionnés
  // une fois (sans doublon : famille + n° + date) ; ce qui a été repris est noté dans le registre
  // (legacyImported) pour qu'une mission supprimée ensuite ne revienne pas. Les anciens fichiers
  // ne sont pas effacés.
  const M = window.MissionModel;
  const FILE = 'missions.yaml', CACHE = 'missionCoreLedger:v2', HANDLE = 'folder:__ledger';
  const HERE = document.currentScript?.src || location.href;
  const APP = new URL('../../CR%20DEFA/', HERE); // dossier de l'application (à côté de shared/)
  const DB = 'missionCore', STORE = 'handles';
  const idb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const idbGet = async key => { try { const db = await idb(); return await new Promise(r => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch { return null; } };
  const idbSet = async (key, value) => { try { const db = await idb(); await new Promise(r => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = r; tx.onerror = r; }); } catch { /* navigateur sans IndexedDB */ } };

  const store = { missions: [], updatedAt: '', source: 'empty', folder: '', legacyImported: {} };
  let handle = null, loading = null;
  const key = m => `${m.family}|${String(m.metadata?.missionId || '').trim().toUpperCase()}|${m.metadata?.date || ''}`;

  const parse = (text, family = '') => {
    const data = window.jsyaml.load(String(text).replace(/^﻿/, ''), { schema: window.jsyaml.CORE_SCHEMA }) || {};
    // Registre complet, ancien registre de famille, liste de missions ou mission seule.
    const missions = Array.isArray(data) ? data : data.missions || (data.metadata ? [data] : []);
    return { updatedAt: data.updatedAt || '', legacyImported: data.legacyImported || {}, missions: missions.map(m => M.migrate(m, m?.family || data.family || family)) };
  };
  async function directory(request = false, id = HANDLE) {
    const h = id === HANDLE ? (handle = handle || await idbGet(HANDLE)) : await idbGet(id);
    if (!h) return null;
    let permission = await h.queryPermission?.({ mode: 'readwrite' });
    if (permission !== 'granted' && request) { try { permission = await h.requestPermission?.({ mode: 'readwrite' }); } catch { permission = 'denied'; } }
    if (permission !== 'granted') return null;
    if (id === HANDLE) store.folder = h.name;
    return h;
  }
  const readFile = async (dir, name) => { try { return await (await (await dir.getFileHandle(name)).getFile()).text(); } catch { return null; } };
  const fetchText = async url => { try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch { return null; } };

  // Anciens registres par famille : la version la plus récente de chaque famille.
  const familyFolders = () => [...(window.MissionVocab?.families || []).map(f => [f.id, f.cr.split('/')[0]]), ['DEMO', 'MissionCore']];
  async function legacyLedgers() {
    const out = [];
    for (const [id, folder] of familyFolders()) {
      const name = `${id.toLowerCase()}_missions.yaml`, candidates = [];
      const dir = await directory(false, `folder:${id}`);
      if (dir) { const text = await readFile(dir, name); if (text) candidates.push(text); }
      try { const cached = JSON.parse(localStorage.getItem(`missionCoreLedger:v1:${id}`) || 'null'); if (cached?.text) candidates.push(cached.text); } catch { /* copie illisible */ }
      const served = await fetchText(new URL(`${folder}/${name}`, APP)); if (served) candidates.push(served);
      const parsed = candidates.map(text => { try { return parse(text, id); } catch { return null; } }).filter(Boolean);
      const best = parsed.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (best?.missions.length) out.push({ id, ...best });
    }
    return out;
  }

  async function load(force = false) {
    if (loading && !force) return loading;
    loading = (async () => {
      const candidates = [];
      const dir = await directory(false);
      if (dir) { const text = await readFile(dir, FILE); if (text) try { candidates.push({ source: 'folder', ...parse(text) }); } catch { /* illisible */ } }
      try { const cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (cached?.text) candidates.push({ source: 'browser', ...parse(cached.text) }); } catch { /* copie illisible */ }
      if (!candidates.length) { const served = await fetchText(new URL(FILE, APP)); if (served) try { candidates.push({ source: 'file', ...parse(served) }); } catch { /* illisible */ } }
      const best = candidates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (best) Object.assign(store, { missions: best.missions, updatedAt: best.updatedAt, source: best.source, legacyImported: best.legacyImported || {} });
      // Migration des anciens registres par famille (une fois par version de chacun).
      let migrated = 0;
      const known = new Set(store.missions.map(key));
      for (const legacy of await legacyLedgers()) {
        const stamp = legacy.updatedAt || 'imported';
        if (store.legacyImported[legacy.id] && stamp <= store.legacyImported[legacy.id]) continue;
        legacy.missions.forEach(m => { m.family = m.family || legacy.id; if (!known.has(key(m))) { known.add(key(m)); store.missions.push(m); migrated++; } });
        store.legacyImported[legacy.id] = stamp;
      }
      // Casse : missions converties à la lecture (M.migrate) ; enregistrées si quelque chose a changé.
      const changed = migrated || (best && best.missions.some(m => m.__caseChanged));
      store.missions.forEach(m => { delete m.__caseChanged; });
      if (changed) await save({ request: false });
      store.migrated = migrated;
      return store;
    })();
    return loading;
  }

  const doc = () => ({ schemaVersion: M.SCHEMA_VERSION, updatedAt: store.updatedAt, legacyImported: store.legacyImported, missions: store.missions });
  const yaml = (missions = store.missions, title = 'Registre des missions — toutes familles — Mission Report — DEFA Virtual') => M.toYaml({ ...doc(), missions }, title);
  // Écrit la copie navigateur et, si autorisé, CR DEFA/missions.yaml.
  async function save({ request = true } = {}) {
    store.updatedAt = new Date().toISOString();
    const text = yaml();
    try { localStorage.setItem(CACHE, JSON.stringify({ filename: FILE, text, updatedAt: store.updatedAt })); } catch { /* quota : le dossier local ou le téléchargement prennent le relais */ }
    let written = false;
    try {
      const dir = await directory(request);
      if (dir) { const writable = await (await dir.getFileHandle(FILE, { create: true })).createWritable(); await writable.write(text); await writable.close(); written = true; }
    } catch { written = false; }
    return { written, text };
  }
  async function chooseFolder() {
    if (!window.showDirectoryPicker) throw new Error('API dossier local indisponible (Chrome / Edge requis)');
    const picked = await window.showDirectoryPicker({ mode: 'readwrite', id: 'missionCore-ledger' });
    // Dossier attendu : « CR DEFA » (celui qui contient mission_cr.html).
    let isApp = false; try { await picked.getFileHandle('mission_cr.html'); isApp = true; } catch { /* autre dossier */ }
    if (!isApp && !confirm(`Le dossier « ${picked.name} » ne contient pas mission_cr.html : est-ce bien le dossier « CR DEFA » ? Le registre ${FILE} y sera écrit.`)) throw new Error('Dossier refusé');
    handle = picked; await idbSet(HANDLE, picked); store.folder = picked.name; loading = null;
    return picked.name;
  }

  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  // Export CSV simplifié (une ligne par mission) — généré, jamais relu comme source.
  const CSV_COLUMNS = [
    ['missionId', m => m.metadata.missionId], ['date', m => m.metadata.date], ['family', m => m.family], ['series', m => m.series], ['subtype', m => m.subtype],
    ['aircraft', m => m.aircraft?.[0]?.type], ['registration', m => m.aircraft?.[0]?.registration], ['callsign', m => m.aircraft?.[0]?.callsign], ['aircraftCount', m => m.aircraft?.length],
    ['dep', m => m.navigation?.dep || m.aircraft?.[0]?.baseDeparture], ['arr', m => m.navigation?.arr || m.aircraft?.[0]?.baseReturn], ['capabilities', m => (m.capabilities || []).join(' ')],
    ['outcome', m => m.results?.outcome], ['blockMinutes', m => M.computeStatistics(m).blockMinutes], ['flightMinutes', m => M.computeStatistics(m).flightMinutes],
    ['timeOnStationMinutes', m => M.computeStatistics(m).timeOnStationMinutes], ['missionMinutes', m => M.computeStatistics(m).missionMinutes],
    ['fuelUsed', m => M.computeStatistics(m).fuelUsed], ['fuelUnit', m => m.fuel?.unit], ['onlineNetwork', m => m.network?.onlineNetwork], ['trackerUrl', m => m.network?.trackerUrl]
  ];
  const csv = missions => [CSV_COLUMNS.map(c => c[0]).join(';')].concat(missions.map(m => CSV_COLUMNS.map(([, get]) => `"${String(get(m) ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';
  const normId = v => String(v ?? '').trim().toUpperCase();

  // Vue d'une famille sur le registre unique.
  function open(family) {
    const id = family.id;
    const list = () => store.missions.filter(m => m.family === id);
    const position = index => { let n = -1; for (let k = 0; k < store.missions.length; k++) if (store.missions[k].family === id && ++n === index) return k; return -1; };
    const withFamily = mission => ({ ...structuredClone(mission), family: id });
    return {
      filename: FILE,
      state: { family: id, filename: FILE, get missions() { return list(); }, get updatedAt() { return store.updatedAt; }, get source() { return store.source; }, get folder() { return store.folder; }, get migrated() { return store.migrated; } },
      load: (force = false) => load(force), save, chooseFolder,
      get missions() { return list(); },
      count: missionId => list().filter(m => normId(m.metadata?.missionId) === normId(missionId)).length,
      nextId: prefix => `${prefix}-${String(Math.max(0, ...list().map(m => Number(String(m.metadata?.missionId || '').match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))?.[1] || 0))) + 1).padStart(3, '0')}`,
      add: mission => { store.missions.push(withFamily(mission)); return list().length - 1; },
      replace: (index, mission) => { const k = position(index); if (k >= 0) store.missions[k] = withFamily(mission); },
      remove: index => { const k = position(index); return k >= 0 ? store.missions.splice(k, 1) : []; },
      // Remplace toutes les missions de la famille (édition YAML de la page Paramétrage).
      setMissions: missions => { store.missions = store.missions.filter(m => m.family !== id).concat(missions.map(withFamily)); },
      downloadYaml: () => download(`${id.toLowerCase()}_missions.yaml`, yaml(list(), `Missions ${id} (extrait du registre ${FILE}) — Mission Report — DEFA Virtual`), 'text/yaml;charset=utf-8'),
      downloadCsv: () => download(`${id.toLowerCase()}_missions.csv`, csv(list()), 'text/csv;charset=utf-8'),
      // Import : missions sans famille rattachées à celle-ci ; les autres gardent la leur.
      async importFile(text) { const data = parse(text, id); data.missions.forEach(m => store.missions.push(m)); return data.missions.length; }
    };
  }

  window.MissionLedger = {
    open, load, save, chooseFolder, FILE, APP, store,
    downloadAll: () => download(FILE, yaml(), 'text/yaml;charset=utf-8'),
    downloadAllCsv: () => download(FILE.replace(/\.yaml$/, '.csv'), csv(store.missions), 'text/csv;charset=utf-8'),
    setAll: missions => { store.missions = missions; }
  };
})();
