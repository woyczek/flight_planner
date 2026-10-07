(() => {
  'use strict';
  // Mission Report Core — registre UNIQUE des missions, toutes familles : data/cr/missions.yaml
  // (chaque mission porte sa famille). Sources, la plus récente (updatedAt) l'emporte :
  // fichier du dossier « CR » autorisé (Chrome / Edge, une seule autorisation), copie du
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
  const idb = () => window.RepositoryKit?.idb ? window.RepositoryKit.idb(DB, 1, db => db.objectStoreNames.contains(STORE) || db
    .createObjectStore(STORE)) : new Promise((resolve, reject) => {
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
  /** Dossier du registre (CR) autorisé ; request : demande l'autorisation. null sinon. */
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
  // ---- écritures concurrentes (docs/technique/INDEX_DONNEES.md § 5) : un autre onglet, un autre poste sur le même dossier
  // Base = missions telles que lues ou écrites en dernier par cette page ; à l'enregistrement, si le registre a changé
  // ailleurs depuis, fusion mission par mission (base, mienne, la leur) au lieu d'écraser.
  let base = new Map(),
    baseStamp = '';
  const PATH = 'data/cr/missions.yaml',
    CONFLICTS = 'missionCoreLedger:conflits:v1'; // versions écartées sans dossier autorisé
  /** Note l'état actuel du registre comme base de fusion : missions sérialisées par clé (famille | n° | date) et date
   *  updatedAt correspondante. */
  const remember = () => {
    base = new Map(store.missions.map(m => [key(m), JSON.stringify(m)]));
    baseStamp = store.updatedAt;
  };
  /** Fusion à trois : modifiée d'un seul côté → ce côté ; ajoutée d'un côté → gardée ; supprimée d'un côté sans
   *  changement de l'autre → supprimée ; changée des deux côtés (ou supprimée d'un côté, changée de l'autre) → conflit :
   *  ma version est gardée, la leur est retournée dans conflicts. Ordre : le leur, puis mes ajouts. */
  function merge(mineList, theirsList) {
    const mine = new Map(mineList.map(m => [key(m), m])),
      theirs = new Map(theirsList.map(m => [key(m), m])),
      out = [],
      conflicts = [],
      seen = new Set();
    /** Version retenue pour une clé (la mienne, la leur ou null si supprimée) ; ajoute la leur à conflicts au besoin. */
    const pick = k => {
      const b = base.get(k),
        mi = mine.get(k),
        th = theirs.get(k),
        ms = mi && JSON.stringify(mi),
        ts = th && JSON.stringify(th);
      if (mi && th) {
        if (ms === ts || ts === b) return mi;
        if (ms === b) return th;
        conflicts.push(th);
        return mi;
      }
      if (mi) { // absente chez eux
        if (b === undefined) return mi; // ajoutée ici
        if (ms === b) return null; // supprimée ailleurs, pas modifiée ici
        return mi; // modifiée ici, supprimée ailleurs : gardée (la suppression est perdue, pas la saisie)
      }
      if (th) { // absente ici
        if (b === undefined) return th; // ajoutée ailleurs
        if (ts === b) return null; // supprimée ici
        conflicts.push(th); // supprimée ici, modifiée ailleurs : leur version gardée et signalée
        return th;
      }
      return null;
    };
    for (const list of [theirsList, mineList])
      for (const m of list) {
        const k = key(m);
        if (seen.has(k)) continue;
        seen.add(k);
        const r = pick(k);
        if (r) out.push(r);
      }
    return {
      missions: out,
      conflicts
    };
  }
  /** Registre tel qu'il est maintenant (dossier, copie indexée et copie texte du navigateur, partagées par les
   *  onglets) : le plus récent de ceux qui ont changé depuis la dernière lecture ou écriture de cette page (signatures :
   *  rien n'est relu ni analysé sinon) ; null si rien n'a changé. */
  async function current(dir) {
    const found = [];
    if (dir) try {
      const file = await (await dir.getFileHandle(FILE)).getFile();
      if (`${file.lastModified}:${file.size}` !== lastSig.folder) found.push(parse(await file.text()));
    } catch {
      /* absent ou illisible : ignoré */
    }
    if (window.ReportIndex) {
      const meta = await window.ReportIndex.meta();
      if (meta && meta.updatedAt !== baseStamp) {
        const i = await window.ReportIndex.load();
        if (i) found.push({
          updatedAt: i.meta.updatedAt || '',
          legacyImported: i.meta.legacyImported || {},
          missions: i.missions
        });
      }
    }
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (cached?.text && String(cached.updatedAt || '') > String(baseStamp)) found.push(parse(cached.text));
    } catch {
      /* copie illisible */
    }
    return found.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
  }
  // autres onglets : prévenus après chaque écriture, ils relisent le registre (événement mission-ledger-change)
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('defa-data') : null;
  channel?.addEventListener('message', e => {
    if (e.data?.path !== PATH || e.data.updatedAt === store.updatedAt) return;
    // relecture à la suite des enregistrements de cette page (jamais pendant : elle remettrait une version dépassée)
    serial(async () => {
      loading = null;
      await load(true);
    }).then(() => window.dispatchEvent(new CustomEvent('mission-ledger-change', {
      detail: {
        updatedAt: store.updatedAt
      }
    })));
  });
  // enregistrements et relectures de cette page, l'un après l'autre
  let queue = Promise.resolve();
  /** Met fn en file derrière les opérations précédentes de la page (même après un échec) ; renvoie sa promesse. */
  const serial = fn => {
    const p = queue.then(fn, fn);
    queue = p.catch(() => {});
    return p;
  };
  const withLock = fn => navigator.locks?.request ? navigator.locks.request('defa:' + PATH, fn) : fn();
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
  // Statut conservé : un fichier absent (404) n'est pas une erreur de chargement. validators : { etag, lastModified }
  // de la lecture précédente → requête conditionnelle (304, sans texte, si le fichier n'a pas changé).
  const fetchStatus = async (url, validators = null) => {
    try {
      const headers = {};
      if (validators?.etag) headers['If-None-Match'] = validators.etag;
      if (validators?.lastModified) headers['If-Modified-Since'] = validators.lastModified;
      const r = await fetch(url, {
        cache: 'no-store',
        headers
      });
      return {
        status: r.status,
        text: r.ok ? await r.text() : null,
        validators: {
          etag: r.headers.get('ETag') || '',
          lastModified: r.headers.get('Last-Modified') || ''
        }
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
      // copie indexée (shared/data_index.js) : un fichier n'est relu et analysé que si sa signature a changé
      const idx = window.ReportIndex ? await window.ReportIndex.load() : null;
      /** Candidat tiré de la copie indexée, étiqueté source (« folder » ou « browser ») ; null sans index. */
      const fromIndex = source => idx && {
        source,
        updatedAt: idx.meta.updatedAt || '',
        legacyImported: idx.meta.legacyImported || {},
        missions: idx.missions,
        indexed: true
      };
      const sig = {
        ...(idx?.meta?.sig || {})
      };
      const dir = await directory(false);
      if (dir) {
        let file = null;
        try {
          file = await (await dir.getFileHandle(FILE)).getFile();
        } catch {
          file = null;
        }
        if (file) {
          const fsig = `${file.lastModified}:${file.size}`;
          if (idx && idx.meta.sig?.folder === fsig) candidates.push(fromIndex('folder'));
          else try {
            candidates.push({
              source: 'folder',
              ...parse(await file.text())
            });
            sig.folder = fsig;
          } catch {
            /* illisible */
          }
        }
      }
      if (idx) candidates.push(fromIndex('browser'));
      // ancienne copie du navigateur (version antérieure de la suite, sauvegarde restaurée) : lue si plus récente
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE) || 'null');
        if (cached?.text && (!idx || String(cached.updatedAt || '') > String(idx.meta.updatedAt || ''))) candidates.push({
          source: 'browser',
          ...parse(cached.text)
        });
      } catch {
        /* copie illisible */
      }
      // fichier servi : requête conditionnelle (304 = inchangé depuis la dernière lecture), toujours tentée — un
      // registre mis à jour par synchronisation (git, webservice) est vu même avec une copie dans le navigateur
      let unavailable = false;
      const served = await fetchStatus(new URL(FILE, APP), sig.served);
      if (served.text) try {
        candidates.push({
          source: 'file',
          ...parse(served.text)
        });
        sig.served = served.validators;
      } catch {
        unavailable = !candidates.length;
      }
      else if (!candidates.length) unavailable = served.status !== 404 && served.status !==
      304; // erreur réseau / serveur : registre inconnu, pas « vide »
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
      remember(); // version lue : base de la fusion si un autre onglet ou poste écrit entre-temps
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
      lastSig = sig;
      if (changed) await saveNow({
        request: false
      });
      // copie indexée à jour : registre relu d'un fichier, ou signatures changées
      else if (window.ReportIndex && (!best?.indexed || JSON.stringify(sig) !== JSON.stringify(idx?.meta?.sig || {})))
        await writeIndex().catch(() => {});
      store.migrated = migrated;
      return store;
    })();
    return loading;
  }
  // ---- copie indexée (shared/data_index.js, docs/technique/INDEX_DONNEES.md § 2) : remplace l'ancienne copie texte du
  // navigateur (missionCoreLedger:v2), gardée pour la compatibilité tant qu'elle fait moins de 2 Mo
  let lastSig = {};
  const MIRROR_MAX = 2e6;
  /** Enregistrements de l'index : clé unique, famille, année, n° du CR, mission, date, CR. */
  function records() {
    const seen = new Set();
    return store.missions.map(m => {
      let k = key(m);
      while (seen.has(k)) k += '#'; // doublon gardé, pas écrasé
      seen.add(k);
      const id = String(m.metadata?.missionId || '');
      return {
        key: k,
        family: m.family || '',
        year: String(m.metadata?.date || '').slice(0, 4),
        missionId: id,
        mission: window.MissionVocab?.parseCrId?.(id)?.mission || String(m.metadata?.missionNumber || '').trim().toUpperCase(),
        date: m.metadata?.date || '',
        m
      };
    });
  }
  /** Réécrit la copie indexée (ReportIndex) avec les missions, la date, les anciens registres repris et les signatures
   *  sig des sources (retenues dans lastSig) ; rien sans ReportIndex. */
  async function writeIndex(sig = lastSig) {
    if (!window.ReportIndex) return;
    lastSig = sig;
    await window.ReportIndex.save(records(), {
      updatedAt: store.updatedAt,
      legacyImported: store.legacyImported,
      sig
    });
  }

  /** Document du registre (schéma, date, missions) à écrire. */
  const doc = () => ({
    schemaVersion: M.SCHEMA_VERSION,
    updatedAt: store.updatedAt,
    legacyImported: store.legacyImported,
    missions: store.missions
  });
  /** Texte YAML du registre (ou d'une sélection de missions). */
  const yaml = (missions = store.missions, title = 'Registre des missions — toutes familles — Mission Report — SO Group Virtual') => M
    .toYaml({
      ...doc(),
      missions
    }, title);
  // Écrit la copie navigateur et, si autorisé, data/cr/missions.yaml (à la suite des autres enregistrements et
  // relectures de la page).
  const save = options => serial(() => saveNow(options));
  /** Enregistrement immédiat : relit le registre sous verrou, fusionne s'il a changé ailleurs, écrit index, copie texte et
   *  fichier du dossier (request : demande l'autorisation), range les conflits ; renvoie { written, text }. */
  async function saveNow({
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
    let dir = null;
    try {
      dir = await directory(request);
    } catch {
      dir = null;
    }
    // relecture et écriture sous un même verrou (onglets du navigateur) ; changé ailleurs depuis la lecture → fusion
    const result = await withLock(async () => {
      const now = await current(dir);
      let conflicts = [];
      if (now && now.updatedAt && now.updatedAt !== baseStamp) {
        const merged = merge(store.missions, now.missions);
        store.missions.splice(0, store.missions.length, ...merged.missions); // même tableau : les vues par famille le gardent
        conflicts = merged.conflicts;
        // anciens registres déjà repris : réunion, la date la plus récente de chaque côté
        const mineImported = {
          ...store.legacyImported
        };
        for (const [fam, stamp] of Object.entries(now.legacyImported || {}))
          if (!mineImported[fam] || String(stamp) > String(mineImported[fam])) mineImported[fam] = stamp;
        store.legacyImported = mineImported;
      }
      store.updatedAt = new Date().toISOString();
      const text = yaml();
      // copie indexée d'abord ; copie texte de compatibilité tant qu'elle est petite (toujours sans index)
      let indexed = false;
      try {
        await writeIndex();
        indexed = true;
      } catch {
        indexed = false;
      }
      try {
        if (!indexed || text.length < MIRROR_MAX) localStorage.setItem(CACHE, JSON.stringify({
          filename: FILE,
          text,
          updatedAt: store.updatedAt
        }));
        else localStorage.removeItem(CACHE);
      } catch {
        /* quota : l'index, le dossier local ou le téléchargement prennent le relais */
        try {
          if (indexed) localStorage.removeItem(CACHE);
        } catch {
          /* stockage indisponible */
        }
      }
      let written = false;
      try {
        if (dir) {
          const handle = await dir.getFileHandle(FILE, {
            create: true
          });
          const writable = await handle.createWritable();
          await writable.write(text);
          await writable.close();
          written = true;
          // signature du fichier écrit : la prochaine relecture ne l'analysera pas (inchangé depuis)
          const file = await handle.getFile();
          lastSig = {
            ...lastSig,
            folder: `${file.lastModified}:${file.size}`
          };
          await writeIndex().catch(() => {});
          // versions écartées d'un conflit gardées à côté : rien n'est perdu
          if (conflicts.length) {
            const sub = await dir.getDirectoryHandle('_conflits', {
              create: true
            });
            const w = await (await sub.getFileHandle(`missions_${store.updatedAt.replace(/[:.]/g, '-')}.yaml`, {
              create: true
            })).createWritable();
            await w.write(M.toYaml({
              ...doc(),
              missions: conflicts
            }, 'Versions écartées lors d’une fusion du registre des CR'));
            await w.close();
          }
        }
      } catch {
        written = false;
      }
      // sans dossier : versions écartées gardées dans le navigateur (20 dernières ; vue dans Paramètres : étape 6 de
      // docs/technique/INDEX_DONNEES.md)
      if (conflicts.length && !written) try {
        const kept = JSON.parse(localStorage.getItem(CONFLICTS) || '[]');
        kept.unshift(...conflicts.map(m => ({
          at: store.updatedAt,
          mission: m
        })));
        localStorage.setItem(CONFLICTS, JSON.stringify(kept.slice(0, 20)));
      } catch {
        /* quota */
      }
      remember();
      return {
        written,
        text,
        conflicts,
        updatedAt: store.updatedAt
      };
    });
    channel?.postMessage({
      path: PATH,
      updatedAt: result.updatedAt // date posée sous le verrou
    });
    const tf = window.RepositoryKit?.tf || (row => row[0]);
    if (result.conflicts.length) window.AppFramework?.notify?.(result.written ? tf([
      '{n} compte(s) rendu(s) modifié(s) en même temps ailleurs : votre version est gardée, l’autre est rangée dans data/cr/_conflits.',
      '{n} report(s) changed elsewhere at the same time: your version is kept, the other one is stored in data/cr/_conflits.',
      '{n} Bericht(e) gleichzeitig anderswo geändert: Ihre Fassung bleibt, die andere liegt in data/cr/_conflits.',
      '{n} informe(s) modificado(s) a la vez en otro lugar: se conserva su versión, la otra se guarda en data/cr/_conflits.'
    ], {
      n: result.conflicts.length
    }) : tf([
      '{n} compte(s) rendu(s) modifié(s) en même temps ailleurs : votre version est gardée, l’autre est conservée dans ce navigateur.',
      '{n} report(s) changed elsewhere at the same time: your version is kept, the other one is kept in this browser.',
      '{n} Bericht(e) gleichzeitig anderswo geändert: Ihre Fassung bleibt, die andere wird in diesem Browser aufbewahrt.',
      '{n} informe(s) modificado(s) a la vez en otro lugar: se conserva su versión, la otra se guarda en este navegador.'
    ], {
      n: result.conflicts.length
    }), 'warn');
    return {
      written: result.written,
      text: result.text
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
    if (!window.showDirectoryPicker) throw new Error(window.RepositoryKit?.noFolderAccess?.() ||
      'API dossier local indisponible (Chrome / Edge requis)');
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
  const csv = missions => [CSV_COLUMNS.map(c => c[0]).join(';')].concat(missions.map(m => CSV_COLUMNS.map(([, get]) => `"${String(get(m) ?? '').replace(/"/g, '""')}"`).join(
    ';'))).join('\n') + '\n';
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
      /** Ajoute une copie de la mission à la famille ; renvoie son rang dans la vue de la famille. */
      add: mission => {
        store.missions.push(withFamily(mission));
        return list().length - 1;
      },
      /** Remplace la index-ième mission de la famille par une copie de mission (rien si le rang n'existe pas). */
      replace: (index, mission) => {
        const k = position(index);
        if (k >= 0) store.missions[k] = withFamily(mission);
      },
      /** Retire la index-ième mission de la famille ; renvoie le tableau des missions retirées ([] si rang inconnu). */
      remove: index => {
        const k = position(index);
        return k >= 0 ? store.missions.splice(k, 1) : [];
      },
      // Remplace toutes les missions de la famille (édition YAML de la page Paramétrage).
      setMissions: missions => {
        store.missions = store.missions.filter(m => m.family !== id).concat(missions.map(withFamily));
      },
      downloadYaml: () => download(`${id.toLowerCase()}_missions.yaml`, yaml(list(), `Missions ${id} (extrait du registre ${FILE}) — Mission Report — SO Group Virtual`), 'text/yaml;charset=utf-8'),
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
    /** Remplace tout le registre (toutes familles) par missions, sans enregistrer. */
    setAll: missions => {
      store.missions = missions;
    }
  };
})();
