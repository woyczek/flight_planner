(() => {
  'use strict';
  // Mission Report Core — registre UNIQUE des missions, toutes familles : data/cr/missions.yaml
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
  const FILE = 'missions.yaml',
    CACHE = 'missionCoreLedger:v2',
    HANDLE = 'folder:__ledger';
  const HERE = document.currentScript?.src || location.href;
  const APP = new URL('../../data/cr/', HERE); // dossier des registres : data/cr (dépôt de données, v3)
  const DB = 'missionCore',
    STORE = 'handles';
  /** Base IndexedDB « missionCore » (magasin handles) : dossier du registre. */
  // connexion partagée par la page (RepositoryKit.idb) : plus une ouverture par lecture
  const idb = () => window.RepositoryKit?.idb ? window.RepositoryKit.idb(DB, 1, db => db.objectStoreNames.contains(STORE) || db.createObjectStore(STORE)) : new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  /** Valeur d'une clé du magasin handles ; null si absente. */
  const idbGet = async key => {
    try {
      const db = await idb();
      return await new Promise(r => {
        const q = db.transaction(STORE).objectStore(STORE).get(key);
        q.onsuccess = () => r(q.result || null);
        q.onerror = () => r(null);
      });
    } catch {
      return null;
    }
  };
  /** Écrit une valeur dans le magasin handles. */
  const idbSet = async (key, value) => {
    try {
      const db = await idb();
      await new Promise(r => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = r;
        tx.onerror = r;
      });
    } catch {
      /* navigateur sans IndexedDB */
    }
  };

  const store = {
    missions: [],
    updatedAt: '',
    source: 'empty',
    folder: '',
    legacyImported: {}
  };
  let handle = null,
    loading = null;
  /** Clé d'identité d'une mission : famille | n° de mission | date (doublons à l'import). */
  const key = m => `${m.family}|${String(m.metadata?.missionId || '').trim().toUpperCase()}|${m.metadata?.date || ''}`;

  /** Contenu d'un fichier de registre YAML : { missions, … } au schéma courant. */
  const parse = (text, family = '') => {
    const data = window.jsyaml.load(String(text).replace(/^﻿/, ''), {
      schema: window.jsyaml.CORE_SCHEMA
    }) || {};
    // Registre complet, ancien registre de famille, liste de missions ou mission seule.
    const missions = Array.isArray(data) ? data : data.missions || (data.metadata ? [data] : []);
    return {
      updatedAt: data.updatedAt || '',
      legacyImported: data.legacyImported || {},
      missions: missions.map(m => M.migrate(m, m?.family || data.family || family))
    };
  };
  /** Dossier du registre (CR DEFA) autorisé ; request : demande l'autorisation. null sinon. */
  async function directory(request = false, id = HANDLE) {
    const h = id === HANDLE ? (handle = handle || await idbGet(HANDLE)) : await idbGet(id);
    if (!h) return null;
    let permission = await h.queryPermission?.({
      mode: 'readwrite'
    });
    if (permission !== 'granted' && request) {
      try {
        permission = await h.requestPermission?.({
          mode: 'readwrite'
        });
      } catch {
        permission = 'denied';
      }
    }
    if (permission !== 'granted') return null;
    if (id === HANDLE) store.folder = h.name;
    return h;
  }
  /** Texte d'un fichier du dossier ; null s'il n'existe pas. */
  const readFile = async (dir, name) => {
    try {
      return await (await (await dir.getFileHandle(name)).getFile()).text();
    } catch {
      return null;
    }
  };
  /** Texte d'une URL (fichier à côté de la page) ; null en cas d'échec. */
  const fetchText = async url => {
    try {
      const r = await fetch(url, {
        cache: 'no-store'
      });
      return r.ok ? await r.text() : null;
    } catch {
      return null;
    }
  };
  // Statut conservé : un fichier absent (404) n'est pas une erreur de chargement.
  const fetchStatus = async url => {
    try {
      const r = await fetch(url, {
        cache: 'no-store'
      });
      return {
        status: r.status,
        text: r.ok ? await r.text() : null
      };
    } catch {
      return {
        status: 0,
        text: null
      };
    }
  };

  // Anciens registres par famille : la version la plus récente de chaque famille.
  const familyFolders = () => [...(window.MissionVocab?.families || []).map(f => [f.id, f.cr.split('/')[0]]), ['DEMO', 'MissionCore']];
  /** Anciens registres par famille (fichiers <famille>_missions.yaml), la version la plus récente de chacun, pour la reprise dans le registre unique. */
  async function legacyLedgers() {
    const out = [];
    for (const [id, folder] of familyFolders()) {
      const name = `${id.toLowerCase()}_missions.yaml`,
        candidates = [];
      const dir = await directory(false, `folder:${id}`);
      if (dir) {
        const text = await readFile(dir, name);
        if (text) candidates.push(text);
      }
      try {
        const cached = JSON.parse(localStorage.getItem(`missionCoreLedger:v1:${id}`) || 'null');
        if (cached?.text) candidates.push(cached.text);
      } catch {
        /* copie illisible */
      }
      // Fichier servi absent (cas normal depuis le registre unique) : pas de nouvelle requête
      // avant un jour (évite une série d'erreurs 404 à chaque chargement).
      const absentKey = 'missionCoreLedger:legacyAbsent:v1';
      let absent = {};
      try {
        absent = JSON.parse(localStorage.getItem(absentKey) || '{}');
      } catch {
        absent = {};
      }
      if (!(Date.now() - (absent[id] || 0) < 86400000)) {
        const served = await fetchText(new URL(`${folder}/${name}`, APP));
        if (served) {
          candidates.push(served);
          delete absent[id];
        } else absent[id] = Date.now();
        try {
          localStorage.setItem(absentKey, JSON.stringify(absent));
        } catch {
          /* stockage indisponible */
        }
      }
      const parsed = candidates.map(text => {
        try {
          return parse(text, id);
        } catch {
          return null;
        }
      }).filter(Boolean);
      const best = parsed.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (best?.missions.length) out.push({
        id,
        ...best
      });
    }
    return out;
  }

  /** Charge le registre unique : dossier autorisé, fichier à côté de la page, copie navigateur ; retient la source la plus récente (updatedAt), puis reprend les missions des anciens registres de famille qui n'y sont pas. Un seul chargement à la fois (force : recharge). */
  async function load(force = false) {
    if (loading && !force) return loading;
    loading = (async () => {
      const candidates = [];
      const dir = await directory(false);
      if (dir) {
        const text = await readFile(dir, FILE);
        if (text) try {
          candidates.push({
            source: 'folder',
            ...parse(text)
          });
        } catch {
          /* illisible */
        }
      }
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE) || 'null');
        if (cached?.text) candidates.push({
          source: 'browser',
          ...parse(cached.text)
        });
      } catch {
        /* copie illisible */
      }
      let unavailable = false;
      if (!candidates.length) {
        const served = await fetchStatus(new URL(FILE, APP));
        if (served.text) try {
          candidates.push({
            source: 'file',
            ...parse(served.text)
          });
        } catch {
          unavailable = true;
        }
        else unavailable = served.status !== 404; // erreur réseau / serveur : registre inconnu, pas « vide »
      }
      // Registre illisible : rien n'est migré ni enregistré (sinon une copie partielle
      // remplacerait le registre complet) ; nouvel essai au prochain chargement / enregistrement.
      if (unavailable) {
        Object.assign(store, {
          missions: [],
          updatedAt: '',
          source: 'unavailable',
          legacyImported: {}
        });
        store.migrated = 0;
        loading = null;
        return store;
      }
      const best = candidates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (best) Object.assign(store, {
        missions: best.missions,
        updatedAt: best.updatedAt,
        source: best.source,
        legacyImported: best.legacyImported || {}
      });
      // Migration des anciens registres par famille (une fois par version de chacun).
      let migrated = 0;
      const known = new Set(store.missions.map(key));
      for (const legacy of await legacyLedgers()) {
        const stamp = legacy.updatedAt || 'imported';
        if (store.legacyImported[legacy.id] && stamp <= store.legacyImported[legacy.id]) continue;
        legacy.missions.forEach(m => {
          m.family = m.family || legacy.id;
          if (!known.has(key(m))) {
            known.add(key(m));
            store.missions.push(m);
            migrated++;
          }
        });
        store.legacyImported[legacy.id] = stamp;
      }
      // Casse : missions converties à la lecture (M.migrate) ; enregistrées si quelque chose a changé.
      const changed = migrated || (best && best.missions.some(m => m.__caseChanged));
      store.missions.forEach(m => {
        delete m.__caseChanged;
      });
      if (changed) await save({
        request: false
      });
      store.migrated = migrated;
      return store;
    })();
    return loading;
  }

  /** Document du registre (schéma, date, missions) à écrire. */
  const doc = () => ({
    schemaVersion: M.SCHEMA_VERSION,
    updatedAt: store.updatedAt,
    legacyImported: store.legacyImported,
    missions: store.missions
  });
  /** Texte YAML du registre (ou d'une sélection de missions). */
  const yaml = (missions = store.missions, title = 'Registre des missions — toutes familles — Mission Report — DEFA Virtual') => M.toYaml({
    ...doc(),
    missions
  }, title);
  // Écrit la copie navigateur et, si autorisé, data/cr/missions.yaml.
  async function save({
    request = true
  } = {}) {
    // Registre non chargé (erreur réseau) : nouvel essai, puis fusion des missions saisies
    // entre-temps ; jamais d'écriture d'un registre partiel.
    if (store.source === 'unavailable') {
      const pending = store.missions.slice();
      await load(true);
      if (store.source === 'unavailable') throw new Error(`Registre ${FILE} illisible (serveur ou fichier indisponible) : mission conservée en brouillon, réessayez.`);
      const known = new Set(store.missions.map(key));
      pending.forEach(m => {
        if (!known.has(key(m))) store.missions.push(m);
      });
    }
    store.updatedAt = new Date().toISOString();
    const text = yaml();
    try {
      localStorage.setItem(CACHE, JSON.stringify({
        filename: FILE,
        text,
        updatedAt: store.updatedAt
      }));
    } catch {
      /* quota : le dossier local ou le téléchargement prennent le relais */
    }
    let written = false;
    try {
      const dir = await directory(request);
      if (dir) {
        const writable = await (await dir.getFileHandle(FILE, {
          create: true
        })).createWritable();
        await writable.write(text);
        await writable.close();
        written = true;
      }
    } catch {
      written = false;
    }
    return {
      written,
      text
    };
  }
  /** Choix du dossier du registre (data/cr), puis rechargement. */
  async function chooseFolder() {
    if (window.FileAccess) {
      const picked = await window.FileAccess.pickFolder('__ledger');
      handle = picked;
      store.folder = picked.name;
      loading = null;
      return picked.name;
    }
    if (!window.showDirectoryPicker) throw new Error(window.RepositoryKit?.noFolderAccess?.() || 'API dossier local indisponible (Chrome / Edge requis)');
    const current = handle || await idbGet(HANDLE);
    const picked = await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'missionCore-ledger',
      ...(current ? {
        startIn: current
      } : {})
    });
    // Dossier attendu (v3) : data/cr du dépôt de données.
    if (picked.name !== 'cr' && !confirm(`Le dossier « ${picked.name} » n'est pas data/cr (dépôt de données) : y écrire quand même le registre ${FILE} ?`)) throw new Error('Dossier refusé');
    handle = picked;
    await idbSet(HANDLE, picked);
    store.folder = picked.name;
    loading = null;
    return picked.name;
  }

  /** Fait télécharger un fichier. */
  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {
      type
    }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // Export CSV simplifié (une ligne par mission) — généré, jamais relu comme source.
  const CSV_COLUMNS = [
    ['missionId', m => m.metadata.missionId],
    ['date', m => m.metadata.date],
    ['family', m => m.family],
    ['series', m => m.series],
    ['subtype', m => m.subtype],
    ['aircraft', m => m.aircraft?.[0]?.type],
    ['registration', m => m.aircraft?.[0]?.registration],
    ['callsign', m => m.aircraft?.[0]?.callsign],
    ['aircraftCount', m => m.aircraft?.length],
    ['dep', m => m.navigation?.dep || m.aircraft?.[0]?.baseDeparture],
    ['arr', m => m.navigation?.arr || m.aircraft?.[0]?.baseReturn],
    ['capabilities', m => (m.capabilities || []).join(' ')],
    ['outcome', m => m.results?.outcome],
    ['blockMinutes', m => M.computeStatistics(m).blockMinutes],
    ['flightMinutes', m => M.computeStatistics(m).flightMinutes],
    ['timeOnStationMinutes', m => M.computeStatistics(m).timeOnStationMinutes],
    ['missionMinutes', m => M.computeStatistics(m).missionMinutes],
    ['fuelUsed', m => M.computeStatistics(m).fuelUsed],
    ['fuelUnit', m => m.fuel?.unit],
    ['onlineNetwork', m => m.network?.onlineNetwork],
    ['trackerUrl', m => m.network?.trackerUrl]
  ];
  /** Registre en CSV « ; » (colonnes CSV_COLUMNS). */
  const csv = missions => [CSV_COLUMNS.map(c => c[0]).join(';')].concat(missions.map(m => CSV_COLUMNS.map(([, get]) => `"${String(get(m) ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';
  /** N° de mission normalisé (majuscules, sans blancs). */
  const normId = v => String(v ?? '').trim().toUpperCase();

  // Vue d'une famille sur le registre unique.
  function open(family) {
    const id = family.id;
    /** Missions de la famille ouverte. */
    const list = () => store.missions.filter(m => m.family === id);
    /** Rang dans le registre unique de la index-ième mission de la famille ; −1 sinon. */
    const position = index => {
      let n = -1;
      for (let k = 0; k < store.missions.length; k++)
        if (store.missions[k].family === id && ++n === index) return k;
      return -1;
    };
    /** Copie de la mission rattachée à la famille ouverte. */
    const withFamily = mission => ({
      ...structuredClone(mission),
      family: id
    });
    return {
      filename: FILE,
      state: {
        family: id,
        filename: FILE,
        get missions() {
          return list();
        },
        get updatedAt() {
          return store.updatedAt;
        },
        get source() {
          return store.source;
        },
        get folder() {
          return store.folder;
        },
        get migrated() {
          return store.migrated;
        }
      },
      load: (force = false) => load(force),
      save,
      chooseFolder,
      get missions() {
        return list();
      },
      count: missionId => list().filter(m => normId(m.metadata?.missionId) === normId(missionId)).length,
      /** Identifiant du prochain CR (MissionVocab.crId) : CR + mission + n° d'essai (CRM-016-2), ou CR sans mission (CRM-A04-0) ;
       *  tous les CR du registre comptent (toutes familles). */
      nextId: (_prefix, missionNumber = '') => window.MissionVocab.crId({
        family: id,
        missionNumber,
        crIds: store.missions.map(m => normId(m.metadata?.missionId))
      }),
      add: mission => {
        store.missions.push(withFamily(mission));
        return list().length - 1;
      },
      replace: (index, mission) => {
        const k = position(index);
        if (k >= 0) store.missions[k] = withFamily(mission);
      },
      remove: index => {
        const k = position(index);
        return k >= 0 ? store.missions.splice(k, 1) : [];
      },
      // Remplace toutes les missions de la famille (édition YAML de la page Paramétrage).
      setMissions: missions => {
        store.missions = store.missions.filter(m => m.family !== id).concat(missions.map(withFamily));
      },
      downloadYaml: () => download(`${id.toLowerCase()}_missions.yaml`, yaml(list(), `Missions ${id} (extrait du registre ${FILE}) — Mission Report — DEFA Virtual`), 'text/yaml;charset=utf-8'),
      downloadCsv: () => download(`${id.toLowerCase()}_missions.csv`, csv(list()), 'text/csv;charset=utf-8'),
      // Import : missions sans famille rattachées à celle-ci ; les autres gardent la leur.
      async importFile(text) {
        const data = parse(text, id);
        data.missions.forEach(m => store.missions.push(m));
        return data.missions.length;
      }
    };
  }

  window.MissionLedger = {
    open,
    load,
    save,
    chooseFolder,
    FILE,
    APP,
    store,
    downloadAll: () => download(FILE, yaml(), 'text/yaml;charset=utf-8'),
    downloadAllCsv: () => download(FILE.replace(/\.yaml$/, '.csv'), csv(store.missions), 'text/csv;charset=utf-8'),
    setAll: missions => {
      store.missions = missions;
    }
  };
})();
