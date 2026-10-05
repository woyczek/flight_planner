// Sonde de performance (audit tools/perf_audit.html) — chargée seulement si localStorage « perfProbe » vaut « 1 »
// (kit.js l'insère avant les scripts de la page). Compte, sans rien changer au comportement :
//   requêtes (fetch : nombre, octets, 404, en cours), stockage du navigateur (lectures / écritures, octets), JSON.parse
//   (appels, caractères), ouvertures IndexedDB, accès aux dossiers (File System Access : getFileHandle,
//   getDirectoryHandle, entries, getFile, createWritable), rappels des MutationObserver (nombre, durée, par fichier qui
//   les a créés), et le temps où la page ne répond pas (retard d'une minuterie de 20 ms).
// Mode « sans serveur » (localStorage perfNoServer = 1) : les données (data/…) ne sont plus servies — comme une page
// ouverte en file:// — et les dossiers autorisés sont simulés par des dossiers lus sur le serveur (chaque accès compté),
// pour mesurer le chemin « dossier » de la suite sans dialogue de choix de dossier.
// API : window.__perf = { snapshot(), reset(), inflight() }.
(() => {
  'use strict';
  if (window.__perf) return;
  const now = () => performance.now();
  const c = {};
  const add = (k, n = 1) => {
    c[k] = (c[k] || 0) + n;
  };
  const byObs = {}; // fichier créateur → { calls, ms }
  const byCaller = {}; // « compteur fichier:ligne » → appels (JSON.parse, IndexedDB.open)
  const byKey = {}; // clé du stockage → lectures
  const caller = kind => {
    const f = (new Error().stack || '').split('\n').slice(3).map(s => /\/([\w.-]+\.(?:js|html))(?:\?[^:)\s]*)?:(\d+)/.exec(s)).find(m => m && m[1] !== 'perf_probe.js');
    const k = `${kind} ${f ? f[1] + ':' + f[2] : '?'}`;
    byCaller[k] = (byCaller[k] || 0) + 1;
  };
  let inflight = 0;
  const noServer = (() => {
    try {
      return localStorage.getItem('perfNoServer') === '1';
    } catch {
      return false;
    }
  })();
  const ROOT = new URL('../', document.currentScript?.src || location.href).href;

  // ---- requêtes
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input?.url || input);
    add('fetch');
    if (/\/data\//.test(new URL(url, location.href).pathname)) add('fetch.data');
    if (noServer && new URL(url, location.href).pathname.includes('/data/')) {
      add('fetch.blocked');
      throw new TypeError('perfNoServer : données non servies (file://)');
    }
    inflight++;
    try {
      const r = await realFetch(input, init);
      if (r.status === 404) add('fetch.404');
      if (r.status === 304) add('fetch.304');
      return r;
    } finally {
      inflight--;
    }
  };

  // ---- stockage du navigateur
  const SP = Storage.prototype,
    gi = SP.getItem,
    si = SP.setItem;
  SP.getItem = function(k) {
    const v = gi.call(this, k);
    add('storage.get');
    add('storage.getBytes', v ? v.length : 0);
    byKey[k] = (byKey[k] || 0) + 1;
    return v;
  };
  SP.setItem = function(k, v) {
    add('storage.set');
    add('storage.setBytes', String(v).length);
    return si.call(this, k, v);
  };
  const jp = JSON.parse;
  JSON.parse = function(s, r) {
    add('json.parse');
    caller('json');
    add('json.chars', typeof s === 'string' ? s.length : 0);
    return jp.call(this, s, r);
  };

  // ---- IndexedDB
  const io = indexedDB.open.bind(indexedDB);
  indexedDB.open = (...a) => {
    add('idb.open');
    caller('idb');
    return io(...a);
  };

  // ---- dossiers (File System Access)
  const wrap = (proto, name, key) => {
    if (!proto?.[name]) return;
    const f = proto[name];
    proto[name] = function(...a) {
      add(key);
      return f.apply(this, a);
    };
  };
  if (window.FileSystemDirectoryHandle) {
    wrap(FileSystemDirectoryHandle.prototype, 'getFileHandle', 'fs.getFileHandle');
    wrap(FileSystemDirectoryHandle.prototype, 'getDirectoryHandle', 'fs.getDirectoryHandle');
    wrap(FileSystemDirectoryHandle.prototype, 'entries', 'fs.list');
    wrap(FileSystemDirectoryHandle.prototype, 'values', 'fs.list');
  }
  if (window.FileSystemFileHandle) {
    wrap(FileSystemFileHandle.prototype, 'getFile', 'fs.getFile');
    wrap(FileSystemFileHandle.prototype, 'createWritable', 'fs.write');
  }

  // ---- observateurs : rappels comptés et chronométrés, par fichier créateur
  const MO = window.MutationObserver;
  window.MutationObserver = function(cb) {
    const where = (new Error().stack || '').split('\n').slice(2).map(s => /\/([\w.-]+\.(?:js|html))/.exec(s)?.[1]).find(f => f && f !== 'perf_probe.js') || '?';
    const slot = byObs[where] ||= {
      calls: 0,
      ms: 0
    };
    return new MO(function(...a) {
      const t = now();
      try {
        return cb.apply(this, a);
      } finally {
        slot.calls++;
        slot.ms += now() - t;
        add('mo.calls');
        add('mo.ms', now() - t);
      }
    });
  };
  window.MutationObserver.prototype = MO.prototype;

  // ---- temps sans réponse : retard d'une minuterie de 20 ms (au-delà de 50 ms : « bloqué »)
  let last = now();
  const tick = () => {
    const t = now(),
      lag = t - last - 20;
    if (lag > 50) {
      add('blocked.ms', lag);
      add('blocked.n');
    }
    last = t;
    setTimeout(tick, 20);
  };
  setTimeout(tick, 20);
  // tâches longues (> 50 ms) vues par le navigateur : temps de blocage total (au-delà de 50 ms par tâche), mesure
  // standard, plus fiable que l'échantillonneur ci-dessus (minuterie de 20 ms, ralentie quand l'onglet est caché)
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        add('longtask.n');
        add('longtask.ms', e.duration - 50);
      }
    }).observe({
      type: 'longtask'
    });
  } catch {
    /* navigateur sans tâches longues */
  }

  // ---- mode sans serveur : dossiers autorisés simulés (lecture par le serveur, accès comptés)
  if (noServer) {
    const realFetchText = async path => {
      const r = await realFetch(new URL(path, ROOT).href, {
        cache: 'no-cache'
      });
      if (!r.ok) throw new DOMException('absent', 'NotFoundError');
      return r;
    };
    const listing = async path => {
      const r = await realFetch(new URL(path.replace(/\/?$/, '/'), ROOT).href);
      if (!r.ok) throw new DOMException('absent', 'NotFoundError');
      const html = await r.text();
      return [...html.matchAll(/href="([^"?#]+)"/g)].map(m => decodeURIComponent(m[1])).filter(h => !h.startsWith('/') && !h.startsWith('..') && !h.startsWith('?'));
    };
    const fileH = (path, name) => ({
      kind: 'file',
      name,
      async getFile() {
        add('fs.getFile');
        const r = await realFetchText(path);
        const b = await r.blob();
        return new File([b], name, {
          lastModified: Date.parse(r.headers.get('last-modified') || '') || 0
        });
      },
      async createWritable() {
        add('fs.write');
        let data = '';
        return {
          write: async d => {
            data += typeof d === 'string' ? d : '';
          },
          close: async () => {
            add('fs.writeBytes', data.length); // écriture simulée : non enregistrée
          }
        };
      },
      isSameEntry: async o => o?.name === name,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted'
    });
    const dirH = (path, name) => ({
      kind: 'directory',
      name,
      async getFileHandle(n, o = {}) {
        add('fs.getFileHandle');
        if (!o.create) await realFetchText(path + n).then(r => r.body?.cancel?.());
        return fileH(path + n, n);
      },
      async getDirectoryHandle(n) {
        add('fs.getDirectoryHandle');
        return dirH(path + n + '/', n);
      },
      async * entries() {
        add('fs.list');
        for (const h of await listing(path)) yield h.endsWith('/') ? [h.slice(0, -1), dirH(path + h, h.slice(0, -1))] : [h, fileH(path + h, h)];
      },
      async * values() {
        for await (const [, h] of this.entries()) yield h;
      },
      isSameEntry: async o => o?.name === name,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted'
    });
    const FOLDERS = {
      __repo: ['', 'DEFA'],
      __data: ['data/', 'data'],
      __missions: ['data/missions/', 'missions'],
      __ledger: ['data/cr/', 'cr'],
      __sia: ['data/sia/', 'sia'],
      __perf: ['data/planner/', 'planner']
    };
    // FileAccess arrive après : ses accès aux dossiers mémorisés sont remplacés dès qu'il existe
    const patch = () => {
      const FA = window.FileAccess;
      if (!FA || FA.__perf) return !!FA;
      FA.__perf = true;
      FA.get = async key => FOLDERS[key] ? dirH(...FOLDERS[key]) : null;
      FA.status = async key => FOLDERS[key] ? {
        key,
        name: FOLDERS[key][1],
        permission: 'granted',
        handle: dirH(...FOLDERS[key])
      } : {
        key,
        name: '',
        permission: 'none',
        handle: null
      };
      FA.sameAsServed = async () => null; // file:// : pas de contrôle possible
      return true;
    };
    const iv = setInterval(() => patch() && clearInterval(iv), 5);
  }

  window.__perf = {
    noServer,
    inflight: () => inflight,
    add,
    /** Durée et nombre d'appels de fn sous le nom name (compteurs name.ms et name.n). */
    time(name, fn) {
      const t0 = now();
      try {
        return fn();
      } finally {
        add(`${name}.ms`, now() - t0);
        add(`${name}.n`);
      }
    },
    reset() {
      for (const k of Object.keys(c)) delete c[k];
      for (const k of Object.keys(byCaller)) delete byCaller[k];
      for (const k of Object.keys(byKey)) delete byKey[k];
      for (const k of Object.keys(byObs)) byObs[k] = {
        calls: 0,
        ms: 0
      };
    },
    snapshot() {
      const res = performance.getEntriesByType('resource');
      return {
        counters: {
          ...c
        },
        observers: structuredClone(byObs),
        callers: Object.fromEntries(Object.entries(byCaller).sort((x, y) => y[1] - x[1]).slice(0, 12)),
        storageKeys: Object.fromEntries(Object.entries(byKey).sort((x, y) => y[1] - x[1]).slice(0, 12)),
        resources: res.length,
        transferKB: Math.round(res.reduce((s, e) => s + (e.transferSize || 0), 0) / 1024),
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        nodes: document.getElementsByTagName('*').length
      };
    }
  };
})();
