(() => {
  'use strict';
  // Mission Report Core — registre YAML d'une famille (<famille>_missions.yaml, à côté des
  // pages de la famille). Source de vérité : le fichier du dossier local autorisé (Chrome /
  // Edge, autorisation mémorisée d'une session à l'autre), sinon la copie du navigateur
  // (partagée entre pages), sinon le fichier servi à côté de la page (lecture seule).
  // La version la plus récente (updatedAt) l'emporte. Export CSV simplifié pour tableurs.
  const M = window.MissionModel;
  const DB = 'missionCore', STORE = 'handles';
  const idb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const idbGet = async key => { try { const db = await idb(); return await new Promise(r => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch { return null; } };
  const idbSet = async (key, value) => { try { const db = await idb(); await new Promise(r => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = r; tx.onerror = r; }); } catch { /* navigateur sans IndexedDB */ } };

  function open(family) {
    const id = family.id, filename = `${id.toLowerCase()}_missions.yaml`, cacheKey = `missionCoreLedger:v1:${id}`;
    const state = { family: id, filename, missions: [], updatedAt: '', source: 'empty', folder: '' };
    let handle = null;

    const doc = () => ({ schemaVersion: M.SCHEMA_VERSION, family: id, updatedAt: state.updatedAt, missions: state.missions });
    const fromText = text => {
      const data = window.jsyaml.load(String(text).replace(/^﻿/, ''), { schema: window.jsyaml.CORE_SCHEMA }) || {};
      // Registre complet, liste de missions ou mission seule (export « Exporter la mission »).
      const missions = Array.isArray(data) ? data : data.missions || (data.metadata ? [data] : []);
      return { updatedAt: data.updatedAt || '', missions: missions.map(m => M.migrate(m, id)) };
    };
    async function folderFile(requestIfNeeded = false) {
      handle = handle || await idbGet(`folder:${id}`);
      if (!handle) return null;
      let permission = await handle.queryPermission?.({ mode: 'readwrite' });
      if (permission !== 'granted' && requestIfNeeded) permission = await handle.requestPermission?.({ mode: 'readwrite' });
      if (permission !== 'granted') return null;
      state.folder = handle.name;
      return handle;
    }
    async function load() {
      const candidates = [];
      try { const dir = await folderFile(false); if (dir) { const file = await (await dir.getFileHandle(filename)).getFile(); candidates.push({ source: 'folder', ...fromText(await file.text()) }); } } catch { /* fichier pas encore créé */ }
      try { const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); if (cached?.text) candidates.push({ source: 'browser', ...fromText(cached.text) }); } catch { /* copie illisible */ }
      if (!candidates.length) try { const response = await fetch(filename, { cache: 'no-store' }); if (response.ok) candidates.push({ source: 'file', ...fromText(await response.text()) }); } catch { /* file:// */ }
      const best = candidates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (best) Object.assign(state, { missions: best.missions, updatedAt: best.updatedAt, source: best.source });
      return state;
    }
    // Écrit la copie navigateur et, si autorisé, le fichier du dossier local.
    async function save() {
      state.updatedAt = new Date().toISOString();
      const text = M.toYaml(doc(), `Registre des missions ${id} — Mission Report — DEFA Virtual`);
      try { localStorage.setItem(cacheKey, JSON.stringify({ filename, text, updatedAt: state.updatedAt })); } catch { /* quota : le dossier local ou le téléchargement prennent le relais */ }
      let written = false;
      try {
        const dir = await folderFile(true);
        if (dir) { const writable = await (await dir.getFileHandle(filename, { create: true })).createWritable(); await writable.write(text); await writable.close(); written = true; }
      } catch { written = false; }
      return { written, text };
    }
    async function chooseFolder() {
      if (!window.showDirectoryPicker) throw new Error('API dossier local indisponible (Chrome / Edge requis)');
      handle = await window.showDirectoryPicker({ mode: 'readwrite', id: `missionCore-${id}` });
      await idbSet(`folder:${id}`, handle); state.folder = handle.name;
      return handle.name;
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
    const csv = () => [CSV_COLUMNS.map(c => c[0]).join(';')].concat(state.missions.map(m => CSV_COLUMNS.map(([, get]) => `"${String(get(m) ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';

    const normId = v => String(v ?? '').trim().toUpperCase();
    return {
      state, filename, load, save, chooseFolder,
      get missions() { return state.missions; },
      count: missionId => state.missions.filter(m => normId(m.metadata?.missionId) === normId(missionId)).length,
      nextId: prefix => `${prefix}-${String(Math.max(0, ...state.missions.map(m => Number(String(m.metadata?.missionId || '').match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))?.[1] || 0))) + 1).padStart(3, '0')}`,
      add: mission => { state.missions.push(structuredClone(mission)); return state.missions.length - 1; },
      replace: (index, mission) => { state.missions[index] = structuredClone(mission); },
      remove: index => state.missions.splice(index, 1),
      downloadYaml: () => download(filename, M.toYaml(doc(), `Registre des missions ${id} — Mission Report — DEFA Virtual`), 'text/yaml;charset=utf-8'),
      downloadCsv: () => download(filename.replace(/\.yaml$/, '.csv'), csv(), 'text/csv;charset=utf-8'),
      async importFile(text) { const data = fromText(text); data.missions.forEach(m => state.missions.push(m)); return data.missions.length; }
    };
  }

  window.MissionLedger = { open };
})();
