// Index des données (docs/technique/INDEX_DONNEES.md) : base IndexedDB « defaIndex », copie organisée des fichiers de data/ pour
// lire vite. Les fichiers font foi ; l'index se reconstruit à tout moment (DataIndex.rebuild, Paramètres › Maintenance).
// Chargé par shared/kit.js sur toutes les pages, avant leurs scripts.
//
//   DataIndex.all(store[, index, requête]) · get · put · del · replace · clear · rebuild
//   MissionIndex : registre des missions (remplace localStorage « missionRegistry:v1 », limité par le quota du
//     stockage ; une copie de compatibilité y reste tant qu'elle fait moins de 2 Mo) ; lecture synchrone sur une copie
//     en mémoire chargée à l'ouverture de la page :
//       await MissionIndex.ready → MissionIndex.all() · byId(id) · updatedAt() · save(missions)
//     les autres onglets sont prévenus (BroadcastChannel « defa-data ») et la page reçoit « mission-index-change ».
(() => {
  'use strict';
  if (window.DataIndex) return;
  const NAME = 'defaIndex',
    VERSION = 2; // 2 : index « mission » des CR
  // stores et index secondaires (docs/technique/INDEX_DONNEES.md § 2) ; un store ajouté plus tard = VERSION + 1
  const STORES = {
    // enregistrement { k, m } : k = identifiant de la mission (ou dossier | titre pour une entrée sans identifiant)
    missions: { keyPath: 'k', indexes: { id: 'm.id', family: 'm.type', status: 'm.status', folder: 'm.folder' } },
    reports: { keyPath: 'key', indexes: { family: 'family', year: 'year', missionId: 'missionId', mission: 'mission', date: 'date' } },
    assignments: { keyPath: 'k', indexes: { pilot: 'pilot', day: 'day', mission: 'mission', pilotDay: ['pilot', 'day'] } },
    availability: { keyPath: ['pilot', 'week'], indexes: { week: 'week' } },
    readMarks: { keyPath: 'k', indexes: { takeoff: 'takeoff' } },
    files: { keyPath: 'path' },
    meta: { keyPath: 'key' }
  };
  let dbp = null;
  /** Connexion à la base (une par page, refermée si une autre page change de version). */
  function open() {
    return dbp ||= new Promise((resolve, reject) => {
      if (!self.indexedDB) return reject(new Error('IndexedDB indisponible'));
      const q = indexedDB.open(NAME, VERSION);
      q.onupgradeneeded = () => {
        const db = q.result;
        for (const [name, s] of Object.entries(STORES)) {
          const os = db.objectStoreNames.contains(name) ? q.transaction.objectStore(name) : db.createObjectStore(name, { keyPath: s.keyPath });
          for (const [i, path] of Object.entries(s.indexes || {}))
            if (!os.indexNames.contains(i)) os.createIndex(i, path); // index ajoutés d'une version à l'autre
        }
      };
      q.onsuccess = () => {
        const db = q.result;
        db.onversionchange = () => {
          db.close();
          dbp = null;
        };
        resolve(db);
      };
      q.onerror = () => {
        dbp = null;
        reject(q.error);
      };
      q.onblocked = () => console.warn('defaIndex : mise à jour de la base en attente (autre onglet ouvert)');
    });
  }
  const req = r => new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const done = tx => new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction annulée'));
  });
  /** Enregistrements d'un store (tous, ou par index secondaire et valeur / IDBKeyRange). */
  async function all(store, index, query) {
    const os = (await open()).transaction(store).objectStore(store);
    return req((index ? os.index(index) : os).getAll(query));
  }
  async function get(store, key) {
    return req((await open()).transaction(store).objectStore(store).get(key));
  }
  /** Écrit un ou plusieurs enregistrements (une transaction). */
  async function put(store, values) {
    const tx = (await open()).transaction(store, 'readwrite');
    for (const v of [].concat(values)) tx.objectStore(store).put(v);
    return done(tx);
  }
  async function del(store, keys) {
    const tx = (await open()).transaction(store, 'readwrite');
    for (const k of [].concat(keys)) tx.objectStore(store).delete(k);
    return done(tx);
  }
  async function clear(store) {
    const tx = (await open()).transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    return done(tx);
  }
  /** Remplace tout le contenu d'un store, et des enregistrements d'autres stores dans la même transaction
   *  (extra : { store: valeurs }) : jamais d'état à moitié écrit. */
  async function replace(store, values, extra = {}) {
    const names = [store, ...Object.keys(extra)];
    const tx = (await open()).transaction(names, 'readwrite');
    tx.objectStore(store).clear();
    for (const v of values) tx.objectStore(store).put(v);
    for (const [s, vs] of Object.entries(extra))
      for (const v of [].concat(vs)) tx.objectStore(s).put(v);
    return done(tx);
  }
  /** Efface toute la base (elle se reconstruit à partir des fichiers au prochain chargement des pages). */
  async function rebuild() {
    try {
      (await dbp)?.close();
    } catch {
      /* base non ouverte */
    }
    dbp = null;
    await req(indexedDB.deleteDatabase(NAME));
    channel?.postMessage({ index: '*' });
  }

  // ---- autres onglets
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('defa-data') : null;
  const changed = (store, detail = {}) => channel?.postMessage({ index: store, ...detail });

  // ---- registre des missions
  const LEGACY = 'missionRegistry:v1';
  const MissionIndex = (() => {
    let list = [],
      meta = { key: 'missions', updatedAt: '', order: [] },
      fallback = false, // sans IndexedDB : ancienne copie du stockage du navigateur
      loaded = false, // index lu (ready résolu)
      saved = new Map(); // k → texte JSON de l'entrée telle que lue ou écrite en dernier : écritures limitées aux changements
    const legacy = () => {
      try {
        return JSON.parse(localStorage.getItem(LEGACY) || 'null');
      } catch {
        return null;
      }
    };
    /** Missions de l'index dans l'ordre du registre (meta.order), les inconnues de l'ordre à la fin. */
    async function read() {
      const [rows, m] = await Promise.all([all('missions'), get('meta', 'missions')]);
      meta = m || meta;
      const pos = new Map((meta.order || []).map((k, i) => [k, i]));
      saved = new Map(rows.map(r => [r.k, JSON.stringify(r.m)]));
      return rows.sort((a, b) => (pos.get(a.k) ?? 1e9) - (pos.get(b.k) ?? 1e9)).map(r => r.m);
    }
    /** Ancienne clé du navigateur (première ouverture, sauvegarde restaurée, écriture par une version antérieure de la
     *  suite) : reprise si l'index est vide ou plus ancien. true si reprise. */
    async function adoptLegacy() {
      if (fallback) return false;
      const old = legacy();
      if (!old?.missions?.length || (list.length && String(old.updatedAt || '') <= String(meta.updatedAt || ''))) return false;
      saved = new Map(); // tout réécrire : l'ancienne clé fait foi
      await save(old.missions, old.updatedAt || new Date().toISOString());
      list = await read();
      return true;
    }
    // copie de compatibilité sous l'ancienne clé, tant qu'elle reste petite : une version antérieure de la suite (autre
    // branche, autre onglet pas encore rechargé) voit le même registre ; au-delà, retirée (quota du stockage)
    const MIRROR_MAX = 2e6;
    function mirror(missions, updatedAt) {
      try {
        const text = JSON.stringify({ schema: 'mission-registry', version: 1, updatedAt, missions });
        if (text.length > MIRROR_MAX) localStorage.removeItem(LEGACY);
        else localStorage.setItem(LEGACY, text);
      } catch {
        try {
          localStorage.removeItem(LEGACY);
        } catch {
          /* stockage indisponible */
        }
      }
    }
    const ready = (async () => {
      try {
        list = await read();
        await adoptLegacy();
      } catch (e) {
        // sans IndexedDB (navigation privée stricte…) : ancienne copie du navigateur, en lecture et écriture
        console.warn('defaIndex indisponible, registre gardé dans le stockage du navigateur :', e?.message || e);
        fallback = true;
        const old = legacy();
        list = old?.missions || [];
        meta.updatedAt = old?.updatedAt || '';
      }
      loaded = true;
      return list;
    })();
    /** Enregistre le registre : seules les entrées ajoutées, modifiées ou retirées depuis la dernière lecture ou écriture
     *  de cette page sont écrites (une transaction) ; une entrée changée par un autre onglet et pas ici n'est pas
     *  écrasée. L'ordre est gardé dans meta.order. */
    async function save(missions, updatedAt = new Date().toISOString(), { quiet = false } = {}) {
      list = missions;
      const seen = new Set();
      const rows = missions.filter(Boolean).map(m => {
        let k = m.id || `~${m.folder || ''}|${m.title || ''}`;
        while (seen.has(k)) k += '+'; // doublon : gardé, pas écrasé
        seen.add(k);
        return { k, m };
      });
      meta = { key: 'missions', updatedAt, order: rows.map(r => r.k) };
      if (fallback) {
        localStorage.setItem(LEGACY, JSON.stringify({ schema: 'mission-registry', version: 1, updatedAt, missions }));
      } else {
        const json = new Map(rows.map(r => [r.k, JSON.stringify(r.m)]));
        const tx = (await open()).transaction(['missions', 'meta'], 'readwrite'),
          os = tx.objectStore('missions');
        for (const r of rows)
          if (saved.get(r.k) !== json.get(r.k)) os.put(r);
        for (const k of saved.keys())
          if (!json.has(k)) os.delete(k);
        tx.objectStore('meta').put(meta);
        await done(tx);
        saved = json;
        mirror(missions, updatedAt);
      }
      if (!quiet) changed('missions', { updatedAt });
    }
    // sauvegarde des données locales restaurée (menu ☰) : registre qu'elle contient repris s'il est plus récent
    window.addEventListener('local-store-restored', async () => {
      await ready;
      if (await adoptLegacy().catch(() => false)) window.dispatchEvent(new CustomEvent('mission-index-change', { detail: { updatedAt: meta.updatedAt } }));
    });
    channel?.addEventListener('message', async e => {
      if (e.data?.index !== 'missions' && e.data?.index !== '*') return;
      if (e.data.updatedAt && e.data.updatedAt === meta.updatedAt) return;
      try {
        list = await read();
      } catch {
        return;
      }
      window.dispatchEvent(new CustomEvent('mission-index-change', { detail: { updatedAt: meta.updatedAt } }));
    });
    return {
      ready,
      get fallback() {
        return fallback;
      },
      get loaded() {
        return loaded;
      },
      adoptLegacy,
      all: () => list,
      byId: id => list.find(m => m.id === id) || null,
      updatedAt: () => meta.updatedAt,
      save,
      /** Relit l'index (après une restauration de sauvegarde, par exemple). */
      reload: async () => (list = await read())
    };
  })();

  // ---- registre des CR (data/cr/missions.yaml) : copie indexée, lue à la demande (pas à chaque page)
  // Enregistrement { key, pos, family, year, missionId, mission, date, m } : m = le CR tel que dans le fichier, pos = rang
  // dans le registre ; meta « reports » : { updatedAt, legacyImported, sig } (signatures des fichiers lus : la relecture
  // YAML n'a lieu que si le fichier a changé). Écrit par MissionLedger (shared/mission_core/ledger.js).
  const ReportIndex = (() => {
    let saved = new Map(); // key → texte JSON de l'enregistrement tel que lu ou écrit en dernier
    /** { meta, missions } dans l'ordre du registre ; null si l'index est vide ou indisponible. */
    async function load() {
      try {
        const [rows, meta] = await Promise.all([all('reports'), get('meta', 'reports')]);
        if (!meta) return null;
        saved = new Map(rows.map(r => [r.key, JSON.stringify(r)]));
        return {
          meta,
          missions: rows.sort((a, b) => a.pos - b.pos).map(r => r.m)
        };
      } catch {
        return null;
      }
    }
    /** Enregistre le registre (records : [{ key, family, year, missionId, mission, date, m }] dans l'ordre) et sa méta ;
     *  seuls les enregistrements changés sont écrits. */
    async function save(records, meta) {
      const rows = records.map((r, pos) => ({ ...r, pos }));
      const json = new Map(rows.map(r => [r.key, JSON.stringify(r)]));
      const tx = (await open()).transaction(['reports', 'meta'], 'readwrite'),
        os = tx.objectStore('reports');
      for (const r of rows)
        if (saved.get(r.key) !== json.get(r.key)) os.put(r);
      for (const k of saved.keys())
        if (!json.has(k)) os.delete(k);
      tx.objectStore('meta').put({ ...meta, key: 'reports' });
      await done(tx);
      saved = json;
    }
    /** Méta seule (date, signatures). */
    const meta = () => get('meta', 'reports').catch(() => null);
    /** CR d'une mission (identifiant de mission, index secondaire) sans tout lire. */
    async function ofMission(id) {
      try {
        return (await all('reports', 'mission', id)).sort((a, b) => a.pos - b.pos).map(r => r.m);
      } catch {
        return [];
      }
    }
    /** Nombre de CR de la copie indexée. */
    async function count() {
      try {
        return await req((await open()).transaction('reports').objectStore('reports').count());
      } catch {
        return 0;
      }
    }
    return { load, save, meta, ofMission, count };
  })();

  window.DataIndex = { NAME, STORES, open, all, get, put, del, clear, replace, rebuild, changed };
  window.MissionIndex = MissionIndex;
  window.ReportIndex = ReportIndex;
})();
