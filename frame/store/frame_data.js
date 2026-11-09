(() => {
  'use strict';
  // Couche de données du cadre V3 (frame/SPEC.md § 2, frame/INTEGRATION.md) : le mode déconnecté au cœur.
  //   · un seul cache local (IndexedDB « sogFrame ») sert toutes les lectures, sans réseau ; une écriture va dans le
  //     cache et dans la file d'attente (pending), jamais sur le réseau ;
  //   · la synchronisation échange par lots, jamais à chaque clic : tirer (chemins changés depuis la dernière synchro,
  //     fusion à trois voies si une écriture locale attend), puis pousser toute la file en UN commit ; au démarrage, au
  //     bouton, et en fond toutes les 10 minutes si l'appareil est en ligne ; un seul onglet synchronise à la fois ;
  //   · transports interchangeables (frame/store/transport_*.js) : local (un seul utilisateur : le cache fait foi),
  //     github (API git data, jeton de l'appareil), plus tard lanceur, web service, site PHP ; un module ne sait jamais
  //     d'où viennent les données ;
  //   · politique d'un préfixe lu : « document » (fiches du pool, tirées d'avance) ou « reference » (lecture seule,
  //     gros fichier, lu à la première demande puis gardé tant que sa révision ne change pas, revalidé à la synchro) ;
  //     politique d'un préfixe écrit : « cache » (document local de l'appareil, jamais synchronisé : dernier OFP,
  //     réglages de l'appareil device/…) ; un préfixe peut être déclaré par plusieurs modules (partagé) ;
  //   · conflit sur une fiche : la plus récente (updated_at) gagne, la perdante est gardée (magasin conflicts) et
  //     signalée, jamais de question bloquante ; règles par préfixe déclarées par le module (record, keyed, journal).
  //   · sources des références : sans échange (transport local), les fichiers « reference » (bases SIA et appareils)
  //     viennent d'une source en lecture seule (configure({ references }) : le lanceur qui sert la page, ou le dépôt
  //     GitHub réglé), lus à la demande et revalidés à la synchronisation ; rien n'y est jamais écrit ;
  // API (window.FrameData) : configure({ transport, references, identity, every }), start(), adapter(déclaration) → data (get,
  //   read, list, cached, evict, abandon, revalidate, put, remove, watch, status, sync, onStatus), sync(), status(), conflicts(),
  //   conflictSeen(id), restore(id), cached(préfixe), evict(chemin), revalidate(chemins), dump() et load(sauvegarde, { mode })
  //   (sauvegarde de l’appareil),
  //   gitSha(texte), merge, transports.local().
  if (window.FrameData) return;
  const DB = 'sogFrame',
    DB_VERSION = 2, // 2 (29 Oct 2026) : index « policy » des docs (list sans charger les textes)
    EVERY = 10 * 60e3, // synchronisation de fond (en ligne)
    TRIES = 3; // poussées refusées (le dépôt a bougé entre-temps) : tirer puis repousser, au plus 3 fois
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sog-frame-data') : null;

  // ---------------------------------------------------------------- IndexedDB
  // docs : { path, text, base (texte reçu à la dernière synchro), rev, at, policy } · pending : { path, text (null :
  // suppression), at, author } · meta : { key, … } (remote : tête, arbre ; status) · conflicts : { id, path, kept,
  // lost, side, at }
  let dbP = null;
  const open = () => dbP ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const [name, opts] of [
          ['docs', {
            keyPath: 'path'
          }],
          ['pending', {
            keyPath: 'path'
          }],
          ['meta', {
            keyPath: 'key'
          }],
          ['conflicts', {
            keyPath: 'id',
            autoIncrement: true
          }]
        ])
        if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, opts);
      // index des politiques des copies : les chemins d'une politique (cache de l'appareil) lus sans leurs textes
      const docs = r.transaction.objectStore('docs');
      if (!docs.indexNames.contains('policy')) docs.createIndex('policy', 'policy');
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => {
        r.result.close();
        dbP = null;
      };
      res(r.result);
    };
    r.onerror = () => {
      dbP = null;
      rej(r.error);
    };
  });
  /** Requête sur un magasin : op (get, getAll, put, delete, clear) ; promesse de son résultat. */
  const idb = async (store, op, arg) => {
    const d = await open();
    return new Promise((res, rej) => {
      const q = d.transaction(store, /^get/.test(op) ? 'readonly' : 'readwrite').objectStore(store)[op](arg);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  };
  /** Clés seules d'un magasin (ou d'un index : « magasin.index »), dans une borne : jamais les textes. */
  const idbKeys = async (store, query) => {
    const d = await open(),
      [s, index] = store.split('.');
    return new Promise((res, rej) => {
      const os = d.transaction(s, 'readonly').objectStore(s),
        q = (index ? os.index(index) : os).getAllKeys(query);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  };
  /** Borne des chemins sous un préfixe (tous si vide) ; under() dit la même chose chemin par chemin. */
  const rangeOf = prefix => prefix ? IDBKeyRange.bound(prefix, `${prefix}\uffff`) : undefined;
  const getMeta = async key => (await idb('meta', 'get', key)) || null;
  const setMeta = (key, v) => idb('meta', 'put', {
    ...v,
    key
  });

  // ---------------------------------------------------------------- outils
  /** Empreinte git d'un texte (sha-1 de « blob <octets>\0<contenu> ») : révision exacte d'un fichier du dépôt. */
  async function gitSha(text) {
    const body = new TextEncoder().encode(text),
      head = new TextEncoder().encode(`blob ${body.length}\0`),
      all = new Uint8Array(head.length + body.length);
    all.set(head);
    all.set(body, head.length);
    if (!globalThis.crypto?.subtle) return sha1(all); // page en http hors de ce poste (réseau local) : pas de crypto.subtle
    return [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  /** SHA-1 d'octets, en hexadécimal (FIPS 180-4) : le navigateur n'offre crypto.subtle que dans un contexte sûr (https,
   *  ce poste) ; une page servie par le lanceur d'un autre poste du réseau local, en http, s'en passe. */
  function sha1(bytes) {
    const n = bytes.length,
      words = ((n + 8 >> 6) + 1) * 16,
      w = new Uint32Array(words),
      x = new Uint32Array(80);
    for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
    w[n >> 2] |= 0x80 << (24 - (n & 3) * 8);
    w[words - 2] = Math.floor(n / 0x20000000); // longueur en bits, sur 64 bits
    w[words - 1] = n * 8 >>> 0;
    let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    for (let o = 0; o < words; o += 16) {
      for (let i = 0; i < 16; i++) x[i] = w[o + i];
      for (let i = 16; i < 80; i++) {
        const v = x[i - 3] ^ x[i - 8] ^ x[i - 14] ^ x[i - 16];
        x[i] = v << 1 | v >>> 31;
      }
      let [a, b, c, d, e] = h;
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? (b & c | ~b & d) + 0x5a827999 : i < 40 ? (b ^ c ^ d) + 0x6ed9eba1 : i < 60 ? (b & c | b & d | c & d) +
          0x8f1bbcdc : (b ^ c ^ d) + 0xca62c1d6,
          t = ((a << 5 | a >>> 27) + f + e + x[i]) >>> 0;
        e = d;
        d = c;
        c = (b << 30 | b >>> 2) >>> 0;
        b = a;
        a = t;
      }
      h = h.map((v, i) => v + [a, b, c, d, e][i] >>> 0);
    }
    return h.map(v => v.toString(16).padStart(8, '0')).join('');
  }
  /** Texte d'une valeur écrite : JSON indenté d'un espace pour un .json (comme les fichiers du pool), sinon texte. */
  const textOf = (path, value) => /\.json$/i.test(path) ? JSON.stringify(value, null, 1) + '\n' : String(value ?? '');
  /** Valeur lue d'un texte : JSON analysé pour un .json (null s'il est illisible), sinon le texte. */
  const valueOf = (path, text) => {
    if (text == null) return null;
    if (!/\.json$/i.test(path)) return text;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  const under = (path, prefix) => !prefix || path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || path
    .startsWith(prefix);

  // ---------------------------------------------------------------- fusion à trois voies
  /** Date d'une fiche (updated_at, updatedAt) ; '' sans date. */
  const stampOf = v => v && typeof v === 'object' ? String(v.updated_at || v.updatedAt || '') : '';
  /** L'instant d'une date ISO en millisecondes ; 0 sans date ou illisible. Les dates se comparent par l'instant, jamais comme
   *  du texte (« …50Z » se range après « …50.400Z », « 09:…+02:00 » après « 07:…Z ») : la seule règle du cadre (SOG-0037, 6 nov. 2026 ;
   *  liveCheck de app.js compare de même). */
  const instantOf = d => Date.parse(d) || 0;
  /** La fiche a est strictement plus récente que b (par l'instant de son updated_at / updatedAt). */
  const isNewer = (a, b) => instantOf(stampOf(a)) > instantOf(stampOf(b));
  /** La fiche a est au moins aussi récente que b : à égalité d'instant, a (la locale) gagne. */
  const notOlder = (a, b) => !isNewer(b, a);
  const STAMPS = ['updated_at', 'updatedAt'];
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  /** JSON canonique : clés triées à tous les niveaux, pour comparer deux valeurs sans regarder l'ordre des clés ni la mise en forme. */
  const canon = v => JSON.stringify(v, (k, x) => isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);
  /** Deux valeurs analysées disent la même chose : mêmes données hors updated_at / updatedAt de premier niveau. */
  const sameData = (a, b) => {
    const bare = v => {
      if (!isObj(v)) return v;
      const o = {
        ...v
      };
      for (const k of STAMPS) delete o[k];
      return o;
    };
    return canon(bare(a)) === canon(bare(b));
  };
  /** Documents gardés entiers (jamais fusionnés par clé) : le vol courant — son plan et ses sections dérivées (profile, quote, ofp,
   *  weather, progress.plannedPos…) dépendent de la route et du niveau ; des clés prises de deux appareils feraient un état
   *  incohérent (décision du 6 nov. 2026, après la raison de Réglages pour data_sync). */
  const WHOLE = /(^|\/)current_flight\.json$/;
  /** Fusion par clé de premier niveau, avec la base : une clé changée d'un seul côté (depuis la base) est prise de ce côté ; changée
   *  des deux côtés en deux valeurs, la version la plus récente (instant) gagne la clé ; la perdante est gardée entière (restore la
   *  reprend comme un fichier), avec la liste des clés en conflit ; l'horodatage est celui de la plus récente. Pas plus profond que le
   *  premier niveau. */
  function fieldwise(base, local, remote) {
    const localWins = notOlder(local, remote),
      win = localWins ? local : remote,
      lose = localWins ? remote : local,
      value = {},
      lost = {};
    for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
      if (STAMPS.includes(k)) {
        if (k in win) value[k] = win[k];
        else if (k in lose) value[k] = lose[k];
        continue;
      }
      const cl = canon(local[k]) !== canon(base[k]),
        cr = canon(remote[k]) !== canon(base[k]),
        from = cl && !cr ? local : cr && !cl ? remote : win; // pas changée ou changée des deux côtés : la plus récente
      if (cl && cr && canon(local[k]) !== canon(remote[k])) lost[k] = k in lose ? lose[k] : null;
      if (k in from) value[k] = from[k];
    }
    return {
      value,
      lost: Object.keys(lost).length ? lose : null,
      keys: Object.keys(lost),
      side: localWins ? 'remote' : 'local'
    };
  }
  /** Règles de fusion (base, local, distant, chemin : valeurs analysées) → { value, lost } ; lost : version perdante gardée. */
  const merge = {
    /** Une fiche par fichier : avec une base, fusion par clé de premier niveau (fieldwise) ; sans base, ou pour un document gardé
     *  entier (WHOLE), la plus récente (instant de updated_at) gagne le fichier, la locale à égalité. */
    record(base, local, remote, path = '') {
      if (isObj(base) && isObj(local) && isObj(remote) && !WHOLE.test(path)) return fieldwise(base, local, remote);
      const localWins = notOlder(local, remote);
      return {
        value: localWins ? local : remote,
        lost: localWins ? remote : local,
        side: localWins ? 'remote' : 'local'
      };
    },
    /** Journal en ajout seul ({ entries: [...] }) : réunion, triée par date (at), jamais de perte. */
    journal(base, local, remote) {
      const seen = new Set(),
        entries = [];
      for (const e of [...(local?.entries || []), ...(remote?.entries || [])]) {
        const k = JSON.stringify(e);
        if (!seen.has(k)) {
          seen.add(k);
          entries.push(e);
        }
      }
      entries.sort((a, b) => String(a?.at || '').localeCompare(String(b?.at || '')));
      return {
        value: {
          ...remote,
          ...local,
          entries
        },
        lost: null
      };
    },
    /** Liste de fiches identifiées par une clé (champ field, clé key(fiche)) : fusion fiche par fiche, comme
     *  tools/data_sync.py ; fiche modifiée des deux côtés : la plus récente, la perdante gardée. */
    keyed(field, key) {
      return (base, local, remote) => {
        const map = v => new Map((v?.[field] || []).map(x => [key(x), x])),
          b = map(base),
          o = map(local),
          t = map(remote),
          out = [],
          lost = [];
        const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
        for (const k of new Set([...o.keys(), ...t.keys()])) {
          const x = b.get(k),
            y = o.get(k),
            z = t.get(k);
          if (y === undefined || z === undefined) {
            const other = y === undefined ? z : y;
            if (x !== undefined && same(other, x)) continue; // supprimée d'un côté, inchangée de l'autre
            out.push(other);
          } else if (same(y, z) || same(z, x)) out.push(y);
          else if (same(y, x)) out.push(z);
          else {
            const yWins = notOlder(y, z);
            out.push(yWins ? y : z);
            lost.push(yWins ? z : y);
          }
        }
        return {
          value: {
            ...remote,
            ...local,
            [field]: out
          },
          lost: lost.length ? {
            [field]: lost
          } : null,
          side: 'mixed'
        };
      };
    }
  };
  /** Fusion d'un fichier modifié des deux côtés (textes) : cas triviaux d'abord, puis la règle du préfixe ; texte non
   *  JSON : la version locale gagne, la distante gardée. Retour : { text, conflict: { kept, lost, side } | null }. */
  function mergeText(path, base, local, remote) {
    if (local === remote || remote === base) return {
      text: local,
      conflict: null
    };
    if (local === base) return {
      text: remote,
      conflict: null
    };
    const rule = ruleOf(path),
      [b, l, r] = [base, local, remote].map(t => valueOf(path, t));
    if (!/\.json$/i.test(path) || l === null || r === null) return {
      text: local,
      conflict: {
        kept: local,
        lost: remote,
        side: 'remote'
      }
    };
    // deux versions qui disent la même chose (hors updated_at / updatedAt, ordre des clés, mise en forme) : ni conflit ni perdante
    // gardée ; le texte de la plus récente (la locale à égalité), comme data_sync (Réglages, e43cdcf7c)
    if (sameData(l, r)) return {
      text: notOlder(l, r) ? local : remote,
      conflict: null
    };
    const m = rule(b, l, r, path),
      text = textOf(path, m.value);
    return {
      text,
      conflict: m.lost ? {
        kept: text,
        lost: textOf(path, m.lost),
        side: m.side,
        ...(m.keys?.length ? {
          keys: m.keys // clés de premier niveau changées des deux côtés (fusion par clé) ; absent : le fichier entier
        } : {})
      } : null
    };
  }

  // ---------------------------------------------------------------- déclarations des modules
  const reads = []; // { prefix, policy }
  const rules = []; // { prefix, rule }
  const caches = []; // préfixes écrits en politique « cache » (documents locaux, jamais synchronisés)
  /** Politique d'un chemin : 'document' ou 'reference' (préfixe déclaré le plus long), null s'il n'est lu par aucun
   *  module monté (pas tiré). */
  const policyOf = path => reads.filter(r => under(path, r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]?.policy ||
    null;
  const ruleOf = path => rules.filter(r => under(path, r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]?.rule || merge
    .record;
  /** Règle de fusion d'une déclaration : 'record' (défaut), 'journal', 'keyed:<champ>:<clé>[+<clé>…]', ou fonction. */
  const ruleFrom = m => typeof m === 'function' ? m : /^keyed:/.test(m || '') ? (() => {
    const [, field, keys] = m.split(':'),
      ks = String(keys || 'id').split('+');
    return merge.keyed(field, x => ks.map(k => x?.[k] ?? '').join('|'));
  })() : m === 'journal' ? merge.journal : merge.record;
  /** Enregistre ce qu'un module lit et écrit (préfixes, politiques, règles de fusion). */
  function declare(decl = {}) {
    for (const r of [].concat(decl.reads || [])) {
      const prefix = typeof r === 'string' ? r : r.prefix,
        policy = (typeof r === 'object' && r.policy) || 'document';
      if (!reads.some(x => x.prefix === prefix && x.policy === policy)) reads.push({
        prefix,
        policy
      });
    }
    for (const w of [].concat(decl.writes || [])) {
      if (typeof w === 'object' && w.merge && !rules.some(r => r.prefix === w.prefix)) rules.push({
        prefix: w.prefix,
        rule: ruleFrom(w.merge)
      }); // préfixe partagé : la règle du premier module qui le déclare
      if (typeof w === 'object' && w.policy === 'cache' && !caches.includes(w.prefix)) caches.push(w.prefix);
    }
  }
  // documents écrits sans trigramme (pilot/ANON/…) : gardés sur l'appareil, jamais envoyés ; le cadre les reprend sous
  // pilot/<TRI>/ dès que le trigramme est posé (frame/SPEC.md § 2). proc/local/ : procédures converties des CIFP de X-Plane,
  // propres au poste, jamais envoyées (licence, frame/aerodb/SPEC.md § 5 quinquies)
  const LOCAL_ONLY = ['pilot/ANON/', 'proc/local/'];
  const localOnly = path => LOCAL_ONLY.some(p => under(path, p));
  /** Vrai si un chemin s'écrit en politique « cache » (préfixe déclaré ainsi, ou documents sans trigramme). */
  const isCache = path => localOnly(path) || caches.some(c => under(path, c));

  // ---------------------------------------------------------------- réglage
  let cfg = {
    transport: null, // transport branché (transports.local(), FrameData.github(…)…)
    references: null, // source en lecture seule des fichiers « reference » quand le transport est local (head, tree, read)
    identity: {
      trigram: ''
    },
    every: EVERY,
    retry: 60e3 // premier nouvel essai après un passage « hors ligne » (doublé ensuite, plafonné à every)
  };
  /** Règle la couche : transport, source des références (transport local), identité ({ trigram }), période de la
   *  synchronisation de fond (ms). */
  function configure(o = {}) {
    cfg = {
      ...cfg,
      ...o,
      identity: {
        ...cfg.identity,
        ...(o.identity || {})
      }
    };
    return cfg;
  }

  // ---------------------------------------------------------------- observateurs
  const watchers = new Set(); // { prefix, fn }
  /** Prévient les observateurs (et les autres onglets, sauf remote) des chemins changés. */
  function changed(paths, {
    remote = false
  } = {}) {
    if (!paths.length) return;
    for (const p of paths) absent.delete(p); // arrivé ou changé : plus « absent »
    for (const w of watchers) {
      const hit = paths.filter(p => under(p, w.prefix));
      if (hit.length) try {
        w.fn(hit);
      } catch (e) {
        console.error(e);
      }
    }
    if (!remote) channel?.postMessage({
      paths
    });
  }
  channel?.addEventListener('message', e => {
    if (e.data?.paths) changed(e.data.paths, {
      remote: true
    });
    if (e.data?.status) emitStatus(false);
  });
  /** Observe un préfixe : fn(chemins) après une synchro, une écriture ici ou dans un autre onglet. Retour : arrêt. */
  function watch(prefix, fn) {
    const w = {
      prefix: String(prefix || ''),
      fn
    };
    watchers.add(w);
    return () => watchers.delete(w);
  }

  // ---------------------------------------------------------------- état
  let syncing = null,
    lastError = '';
  /** État : { transport, online, syncing, lastSync, lastError, pending, conflicts }. */
  async function status() {
    const s = await getMeta('status').catch(() => null),
      pend = await idb('pending', 'getAll').catch(() => []);
    return {
      transport: cfg.transport?.id || 'none',
      online: navigator.onLine !== false,
      syncing: !!syncing,
      lastSync: s?.lastSync || '',
      lastError: lastError || s?.lastError || '',
      pending: pend.length,
      // écritures en attente : chemin, module qui l'a faite, date, suppression ou non (les plus récentes d'abord)
      queue: pend.map(p => ({
        path: p.path,
        module: p.module || '',
        at: p.at,
        deletion: p.text === null
      })).sort((a, b) => String(b.at).localeCompare(String(a.at))),
      conflicts: (await idb('conflicts', 'getAll').catch(() => [])).filter(c => !c.seen).length
    };
  }
  /** La file d'attente pour la carte Synchronisation (Réglages, 1er nov. 2026) : [{ path, module, at, deletion, error }],
   *  sans le texte, les plus récentes d'abord ; error : l'erreur du dernier passage quand il a échoué (elle retient toute la
   *  file : une écriture refusée pour de bon, elle, va aux conflits), '' sinon. */
  async function pendingList() {
    const s = await status();
    return s.queue.map(q => ({
      ...q,
      error: s.lastError || ''
    }));
  }
  const PUSHED_MAX = 200; // fichiers gardés dans lastPushed (la file d'une longue période hors ligne en compte davantage)
  /** Ce qui est parti à la dernière synchronisation qui a tenté un envoi (1er nov. 2026, SOG-0029 ; Réglages : « parti à
   *  18 h 04 : fiches 2 ») : [{ path, at, result }], result 'ok' ou la raison dite par le transport ; la dernière
   *  synchronisation seulement, pas un journal ; gardé sur l'appareil, jamais vidé par la couche ; [] avant tout envoi.
   *  Lue sans effet (rien n'est écrit, aucun passage lancé), jamais le texte des fichiers. */
  async function lastPushed() {
    const m = await getMeta('lastPushed').catch(() => null);
    return (m?.list || []).map(x => ({
      path: x.path,
      at: m.at,
      result: x.result
    }));
  }
  const statusFns = new Set();
  /** Abonnement à l'état (bouton de synchronisation) : fn(état) à chaque changement. Retour : arrêt. */
  function onStatus(fn) {
    statusFns.add(fn);
    status().then(fn);
    return () => statusFns.delete(fn);
  }
  /** Diffuse l'état (ici, et aux autres onglets si share). */
  async function emitStatus(share = true) {
    const s = await status();
    for (const fn of statusFns) try {
      fn(s);
    } catch (e) {
      console.error(e);
    }
    window.dispatchEvent(new CustomEvent('frame-data-status', {
      detail: s
    }));
    if (share) channel?.postMessage({
      status: true
    });
  }

  // ---------------------------------------------------------------- lecture et écriture (cache seulement)
  // valeur analysée d'une référence (base aéronautique, procédures, types : jamais écrites par un module), gardée par
  // révision : relire une zone ne relance pas JSON.parse sur ses mégaoctets ; la même valeur est rendue à chaque lecteur,
  // gelée en profondeur à l'analyse (une fois par révision) : un lecteur qui la changerait (sort, champ ajouté) lève une
  // TypeError au lieu de changer la valeur de tous (INTEGRATION § 4). Au plus PARSED_MAX octets de texte gardés, les plus
  // anciennement lus partent.
  const PARSED_MAX = 48e6,
    ABSENT_MS = 30e3;
  const parsed = new Map(); // chemin → { rev, value, size }
  let parsedSize = 0;
  const absent = new Map(); // chemin d'une référence absente du dépôt → heure de la lecture qui l'a dit
  /** Gel profond d'une valeur analysée (objets et tableaux), une fois. */
  const deepFreeze = v => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      Object.freeze(v);
      for (const k in v) deepFreeze(v[k]);
    }
    return v;
  };

  function valueFor(path, e) {
    if (e.pending || e.policy !== 'reference') return valueOf(path, e.text);
    // référence sans révision (copie semée sans arbre : base des essais, reprise d'une sauvegarde) : gelée elle aussi, sans
    // mémoire — un module qui écrit sur une fiche tombe en noreg, pas chez l'utilisateur (30 oct. 2026, a._mb de la Carte)
    if (!e.rev) return deepFreeze(valueOf(path, e.text));
    const m = parsed.get(path);
    if (m && m.rev === e.rev) {
      parsed.delete(path);
      parsed.set(path, m); // la plus récemment lue passe en dernier
      return m.value;
    }
    const value = deepFreeze(valueOf(path, e.text)),
      size = e.text?.length || 0;
    if (m) parsedSize -= m.size;
    parsed.set(path, {
      rev: e.rev,
      value,
      size
    });
    parsedSize += size;
    for (const [k, v] of parsed) {
      if (parsedSize <= PARSED_MAX || k === path) break;
      parsed.delete(k);
      parsedSize -= v.size;
    }
    return value;
  }
  /** Enveloppe d'un fichier : écriture en attente d'abord, sinon copie du cache ; null s'il n'y a ni l'une ni l'autre. */
  async function local(path) {
    const [p, d] = await Promise.all([idb('pending', 'get', path), idb('docs', 'get', path)]);
    if (p) return p.text === null ? {
      deleted: true
    } : {
      text: p.text,
      rev: d?.rev || '',
      cached: true,
      pending: true,
      at: p.at
    };
    return d ? {
      text: d.text,
      rev: d.rev,
      cached: true,
      pending: false,
      at: d.at,
      policy: d.policy
    } : null;
  }
  /** Fichier du dépôt : { value, text, rev, cached, pending, at } ; null s'il est absent. policy 'reference' : lu à la
   *  première demande (wait : attendu, sinon null tout de suite et la valeur arrive par watch). */
  async function read(path, {
    policy = 'document',
    wait = false
  } = {}) {
    let e = await local(path);
    if (e?.deleted) return null;
    if (!e) {
      // référence que le dépôt n'a pas, dite il y a moins de 30 s : pas redemandée (un module qui cherche un terrain sans
      // procédures à chaque dessin ne relance ni l'arbre ni le réseau)
      if (policy === 'reference' && Date.now() - (absent.get(path) || 0) < ABSENT_MS) return null;
      const job = fetchOne(path, policy).then(r => {
        if (!r && policy === 'reference') absent.set(path, Date.now());
        return r;
      }).catch(() => null);
      if (!wait) return null;
      e = await job;
      if (!e) return null;
    }
    const {
      policy: _pol,
      ...env
    } = e;
    return {
      ...env,
      value: valueFor(path, e)
    };
  }
  /** Valeur d'un fichier (JSON analysé ou texte) ; null s'il est absent. */
  const get = async (path, opts) => (await read(path, opts))?.value ?? null;
  /** Chemins sous un préfixe : dernier arbre connu du dépôt, écritures en attente comprises ; null si aucun arbre n'a
   *  jamais été lu (transport local : les fichiers du cache). */
  async function list(prefix = '') {
    const remote = await getMeta('remote'),
      pend = await idb('pending', 'getAll');
    let paths;
    if (remote?.tree && cfg.transport?.kind !== 'local') paths = Object.keys((await liveTree(cfg.transport, remote)) || remote.tree);
    else if (cfg.transport?.kind === 'local') {
      paths = await idbKeys('docs', rangeOf(prefix)); // les chemins seuls, sous le préfixe (jamais les textes)
      // références de la source en lecture seule (arbre gardé ; lu une fois s'il ne l'a jamais été)
      const R = refSource(),
        tree = R && await refTree(R).catch(() => null);
      if (tree) paths.push(...Object.keys(tree).filter(p => policyOf(p) === 'reference'));
    } else return null;
    const set = new Set(paths);
    for (const p of pend) p.text === null ? set.delete(p.path) : set.add(p.path);
    for (const p of await idbKeys('docs.policy', 'cache')) set.add(p); // documents du cache de l'appareil, par l'index
    return [...set].filter(p => under(p, prefix)).sort();
  }
  /** Écrit un fichier : cache et file d'attente seulement (envoyé à la prochaine synchronisation) ; politique « cache »
   *  (préfixe déclaré ainsi, ou opts.policy) : document local de l'appareil, jamais en file ni envoyé. */
  async function put(path, value, opts = {}) {
    const text = textOf(path, value);
    if (opts.policy === 'cache' || isCache(path)) {
      await idb('docs', 'put', {
        path,
        text,
        base: text,
        rev: '',
        at: Date.now(),
        policy: 'cache'
      });
      changed([path]);
      return;
    }
    await idb('pending', 'put', {
      path,
      text,
      at: new Date().toISOString(),
      author: cfg.identity.trigram || '',
      module: opts.module || ''
    });
    changed([path]);
    emitStatus();
    if (!opts.quiet) soon();
  }
  // transport local au poste (le lanceur et son data/, T.quick) : une écriture part 2 s après la dernière, sans attendre
  // le passage de fond ; l'échange git (T.exchange) garde son rythme (passage « write » : sans échange) ; une écriture
  // fréquente et sans enjeu (opts.quiet : la position réelle d'un vol, toutes les 10 s) attend le passage de fond
  let soonTimer = null;
  const soon = () => {
    if (!cfg.transport?.quick) return;
    clearTimeout(soonTimer);
    soonTimer = setTimeout(() => sync({
      reason: 'write'
    }), 2e3);
  };
  /** Supprime un fichier (suppression envoyée à la prochaine synchronisation ; document en cache : effacé ici). */
  async function remove(path, opts = {}) {
    if (isCache(path) || (await idb('docs', 'get', path))?.policy === 'cache') {
      await idb('docs', 'delete', path);
      // un document sans trigramme déjà présent dans le dépôt (data/ d'avant cette règle) : sa suppression part, elle
      if (localOnly(path) && (await getMeta('remote'))?.tree?.[path]) await idb('pending', 'put', {
        path,
        text: null,
        at: new Date().toISOString(),
        author: cfg.identity.trigram || '',
        module: opts.module || ''
      });
      changed([path]);
      emitStatus();
      return;
    }
    await idb('pending', 'put', {
      path,
      text: null,
      at: new Date().toISOString(),
      author: cfg.identity.trigram || '',
      module: opts.module || ''
    });
    changed([path]);
    emitStatus();
    soon();
  }

  // ---------------------------------------------------------------- lecture d'un fichier absent du cache
  const fetching = new Map();
  // arbre du dépôt comparé à sa tête dans cette page (un passage a tiré, ou l'arbre vient d'être lu) : avant, l'arbre
  // gardé peut dater d'une session précédente (appli reprise sur le téléphone) et ignorer un fichier poussé depuis.
  // peek : arbre du moment lu pour une lecture ou une liste faites avant le premier passage (en mémoire seulement :
  // l'arbre gardé reste celui du dernier tirage, qui sait ainsi ce qui a changé depuis)
  let treeChecked = false,
    peek = null,
    peekP = null; // lecture de l'arbre du moment en cours : partagée par les lectures lancées en même temps
  /** Arbre à jour pour une lecture : celui du dernier tirage s'il a été comparé à la tête dans cette page, sinon celui
   *  du moment (tête relue, arbre lu si elle a bougé), lu une seule fois pour toutes les lectures qui l'attendent (un
   *  module qui lit ses références au premier passage en lance plusieurs à la fois) ; hors ligne ou en échec : l'arbre
   *  gardé. */
  async function liveTree(T, remote) {
    if (treeChecked || navigator.onLine === false) return remote?.tree || null;
    if (peek) return peek.tree;
    peekP ||= (async () => {
      try {
        const head = await T.head();
        peek = {
          head,
          tree: head === remote?.head && remote?.tree ? remote.tree : await T.tree(head)
        };
        return peek.tree;
      } catch {
        return remote?.tree || null;
      }
    })().finally(() => peekP = null);
    return peekP;
  }
  /** Lit un fichier absent du cache par le transport (arbre lu d'abord s'il n'est pas connu) ; enveloppe ou null. */
  let lastReadError = null; // { path, message, at } : dernière lecture d'un fichier en échec (diagnostic)
  let treeNowP = null; // { head, tree } du moment en cours de lecture, partagé tant qu'il n'est pas lu
  /** Tête et arbre du dépôt du moment, lus une seule fois pour toutes les demandes faites pendant la lecture : au
   *  premier passage, la reprise des copies locales et les premières lectures d'un module monté aussitôt partagent une
   *  seule chaîne ref → commit → arbre au lieu d'une chacune. Rien n'est gardé après : ni un échec (hors ligne), ni un
   *  arbre qui vieillirait. */
  const treeNow = T => treeNowP ||= (async () => {
    const head = await T.head();
    return {
      head,
      tree: await T.tree(head)
    };
  })().finally(() => treeNowP = null);

  /** Un fichier binaire du dépôt (le logo de la compagnie, 1er nov. 2026) : ArrayBuffer ou null — sa révision dans l'arbre
   *  connu (l'arbre du moment s'il ne le porte pas, comme une lecture), lu par le transport (readBytes), gardé sur l'appareil
   *  par révision (meta « bytes:<chemin> ») ; hors ligne ou en échec, la copie gardée ; plus gros que max : une erreur
   *  err.tooBig, rien de gardé. Le contenu n'est ni décodé ni vérifié ici : l'appelant contrôle le type. */
  async function readBytes(path, {
    max = 512 * 1024
  } = {}) {
    const key = `bytes:${path}`,
      kept = await getMeta(key).catch(() => null),
      T = cfg.transport;
    if (!T?.readBytes || T.kind === 'local') return kept?.buf || null;
    let buf;
    try {
      const remote = await getMeta('remote');
      let tree = remote?.tree || (await treeNow(T)).tree;
      if (!tree[path] && remote) tree = (await liveTree(T, remote)) || tree;
      const rev = tree[path];
      if (!rev) return null;
      if (kept?.rev === rev) return kept.buf;
      buf = await T.readBytes(path, rev);
      if (!(buf instanceof ArrayBuffer)) return null;
      if (buf.byteLength <= max) await setMeta(key, {
        rev,
        buf
      });
    } catch {
      return kept?.buf || null;
    }
    if (buf.byteLength > max) throw Object.assign(new Error(`${path}: larger than ${max} bytes`), {
      tooBig: true
    });
    return buf;
  }

  function fetchOne(path, policy) {
    if (fetching.has(path)) return fetching.get(path);
    const job = (async () => {
      let T = cfg.transport,
        tree;
      if (!T || T.kind === 'local') {
        // sans échange : une référence vient de la source en lecture seule, s'il y en a une
        if (policy !== 'reference' || !(T = refSource())) return null;
        tree = await refTree(T);
      } else {
        let remote = await getMeta('remote');
        // aucun arbre encore (tout premier passage) : celui du moment, lu une seule fois pour tout ce qui le demande
        if (!remote?.tree) {
          remote = {
            ...(await treeNow(T)),
            at: Date.now()
          };
          await setMeta('remote', remote);
          treeChecked = true;
        }
        tree = remote.tree;
        // fichier absent d'un arbre pas encore revérifié : arbre du moment (tête relue), sans attendre un passage
        if (!tree[path]) tree = (await liveTree(T, remote)) || tree;
      }
      const rev = tree[path];
      if (!rev) return null;
      const text = await T.read(path, rev);
      // lecture abandonnée entre-temps (abandon) : rendue à qui l'attend encore, sans rien écrire ni annoncer — une
      // révision plus ancienne arrivée tard n'écrase jamais celle d'une lecture plus récente (Sécurisation, ligne 129)
      if (fetching.get(path) !== job) return {
        text,
        rev,
        cached: false,
        pending: false,
        at: Date.now()
      };
      await idb('docs', 'put', {
        path,
        text,
        base: text,
        rev,
        at: Date.now(),
        policy
      });
      changed([path], {
        remote: false
      });
      return {
        text,
        rev,
        cached: false,
        pending: false,
        at: Date.now()
      };
    })().catch(e => {
      lastReadError = {
        path,
        message: e?.offline ? 'offline' : e?.message || String(e),
        at: new Date().toISOString()
      };
      throw e;
    }).finally(() => fetching.get(path) === job && fetching.delete(path)); // abandonnée entre-temps : la suivante n'est pas touchée
    fetching.set(path, job);
    return job;
  }
  /** Oublie la lecture partagée en cours de ce chemin (rien n'est annulé sur le réseau) : la demande suivante la relance
   *  au lieu d'attendre la même promesse ; l'ancienne, si elle finit, n'écrit rien dans le cache. Pour un lecteur qui a
   *  cessé d'attendre (borne d'aerodb, 31 oct. 2026). */
  const abandon = path => void fetching.delete(String(path || ''));

  // ---------------------------------------------------------------- source des références (transport local)
  /** Source en lecture seule des fichiers « reference » : seulement sans échange (transport local), si elle est réglée. */
  const refSource = () => (!cfg.transport || cfg.transport.kind === 'local') && cfg.references?.tree ? cfg.references : null;
  /** Arbre de la source des références (gardé dans meta « refs », relu s'il vient d'une autre source). */
  async function refTree(R) {
    const m = await getMeta('refs');
    if (m?.id === R.id && m.tree) return m.tree;
    const head = await R.head(),
      tree = await R.tree(head);
    await setMeta('refs', {
      id: R.id,
      head,
      tree,
      at: Date.now()
    });
    return tree;
  }
  /** Revalide les références du cache contre la source (tête changée : fichiers relus si leur révision change, retirés
   *  s'ils ont disparu) ; un échec (hors ligne) ne fait pas échouer le passage local, il est rapporté (warning). */
  async function pullRefs(result) {
    const R = refSource();
    if (!R) return;
    try {
      const m = await getMeta('refs'),
        head = await R.head();
      if (m?.id === R.id && m.head === head && m.tree) return;
      const tree = await R.tree(head);
      for (const doc of await idb('docs', 'getAll')) {
        if (doc.policy !== 'reference' || policyOf(doc.path) !== 'reference' || tree[doc.path] === doc.rev) continue;
        if (!tree[doc.path]) await idb('docs', 'delete', doc.path);
        else {
          const text = await R.read(doc.path, tree[doc.path]);
          await idb('docs', 'put', {
            ...doc,
            text,
            base: text,
            rev: tree[doc.path],
            at: Date.now()
          });
        }
        result.pulled.push(doc.path);
      }
      await setMeta('refs', {
        id: R.id,
        head,
        tree,
        at: Date.now()
      });
    } catch (e) {
      result.warning = e?.offline ? 'references offline' : e?.message || String(e);
    }
  }

  // ---------------------------------------------------------------- synchronisation
  /** Synchronise (un seul passage à la fois dans tous les onglets : Web Locks) : tirer puis pousser la file en un
   *  commit. Retour : { ok, pulled, pushed, conflicts, error }. */
  function sync({
    reason = 'manual'
  } = {}) {
    if (syncing) return syncing;
    const lock = fn => navigator.locks?.request ? navigator.locks.request('sog-frame-sync', fn) : fn();
    syncing = lock(() => run(reason)).finally(() => {
      syncing = null;
      emitStatus();
    });
    emitStatus(false);
    return syncing;
  }
  async function run(reason) {
    const T = cfg.transport,
      result = {
        ok: false,
        reason,
        pulled: [],
        pushed: 0,
        conflicts: 0,
        error: ''
      },
      // ce que ce passage a tenté d'envoyer, fichier par fichier : [{ path, result }] (lastPushed) ; result : 'ok', ou la
      // raison dite par le transport (refus, erreur) ; vide quand rien n'a été tenté (hors ligne avant l'envoi, file vide)
      sent = [];
    let tried = null; // la file de la dernière tentative d'envoi qui n'a pas encore d'issue
    try {
      if (!T) throw new Error('no transport');
      await holdLocal();
      // un seul utilisateur, un seul appareil : la file devient le cache, rien n'est envoyé
      if (T.kind === 'local') {
        const pend = await idb('pending', 'getAll');
        await applyPushed(pend, null, null);
        result.pushed = pend.length;
        result.ok = true;
        await pullRefs(result);
        return done(result, sent);
      }
      // sans trigramme, rien ne part : ni lot (ses écritures attendent sur l'appareil), ni échange au nom de personne
      const who = !!cfg.identity.trigram;
      // transport qui échange lui-même avec un dépôt distant (lanceur : passage git du poste) : avant, pour recevoir
      if (reason !== 'write' && who) await exchange(T, result, reason);
      // premier passage avec un dépôt après un usage sans échange : les copies écrites ici sont reprises
      const mode = await getMeta('mode');
      if (mode?.kind === 'local' || (!mode && !(await getMeta('remote')))) await adoptLocal(T, (await treeNow(T)).tree, result);
      for (let i = 0; i < TRIES; i++) {
        const head = await T.head();
        const pulled = await pull(T, head);
        result.pulled.push(...pulled.paths);
        result.conflicts += pulled.conflicts;
        const pend = await idb('pending', 'getAll');
        if (!pend.length || !who) {
          result.ok = true;
          result.held = who ? 0 : pend.length;
          return done(result, sent);
        }
        tried = pend;
        try {
          const remote = await getMeta('remote'),
            next = await T.commit(pend.map(p => ({
              path: p.path,
              text: p.text
            })), commitMessage(pend), head, remote);
          await applyPushed(pend, next, remote);
          for (const p of pend)
            if (!sent.some(s => s.path === p.path)) sent.push({
              path: p.path,
              result: 'ok'
            });
          tried = null;
          result.pushed = pend.length;
          result.ok = true;
          // puis après, pour envoyer le lot (ce qu'il a reçu en plus est tiré au passage suivant)
          if (reason !== 'write' && who) await exchange(T, result, reason);
          return done(result, sent);
        } catch (e) {
          // écriture refusée pour de bon (chemin ou type interdit) : sortie de la file vers les conflits, le reste repart
          if (e?.refused && await refuseWrite(e.refused, e.message, T.id)) {
            sent.push({
              path: e.refused,
              result: `refused: ${e.message || ''}`
            });
            i--;
            continue;
          }
          if (!e?.conflict) throw e; // le dépôt a bougé pendant l'envoi : tirer et repousser
        }
      }
      throw new Error('repository kept moving: try again');
    } catch (e) {
      result.error = e?.offline ? 'offline' : e?.message || String(e);
      // l'envoi tenté a échoué (refus du dépôt, erreur) : les fichiers de la file sont nommés avec la raison
      for (const p of tried || [])
        if (!sent.some(s => s.path === p.path)) sent.push({
          path: p.path,
          result: result.error
        });
      return done(result, sent);
    }
  }
  /** Écriture refusée définitivement par le transport (chemin ou type interdit) : retirée de la file, gardée dans les
   *  conflits (side 'refused' : ce qui devait être écrit, la raison, le transport) pour la reprendre ou l'écarter ; vrai
   *  si elle était en file. */
  async function refuseWrite(path, why, by) {
    const p = await idb('pending', 'get', path);
    if (!p) return false;
    await idb('pending', 'delete', path);
    await idb('conflicts', 'add', {
      path,
      kept: null,
      lost: p.text,
      side: 'refused',
      why: String(why || '').slice(0, 300),
      by: by || '',
      at: new Date().toISOString()
    });
    window.dispatchEvent(new CustomEvent('frame-data-conflict', {
      detail: {
        count: 1
      }
    }));
    emitStatus();
    return true;
  }
  /** Écritures en file sous un préfixe gardé sur l'appareil (pilot/ANON/, mises en file avant cette règle) : rangées dans
   *  le cache de l'appareil ; une suppression reste en file (elle retire du dépôt un fichier qui y était déjà). */
  async function holdLocal() {
    const moved = [];
    for (const p of await idb('pending', 'getAll')) {
      if (!localOnly(p.path) || p.text === null) continue;
      await idb('docs', 'put', {
        path: p.path,
        text: p.text,
        base: p.text,
        rev: '',
        at: Date.now(),
        policy: 'cache'
      });
      await idb('pending', 'delete', p.path);
      moved.push(p.path);
    }
    if (moved.length) emitStatus();
  }
  /** Reprise des copies écrites sans échange (transport local) au premier passage avec un dépôt : une copie absente du
   *  dépôt devient une écriture en attente ; présente des deux côtés et différente, fusion habituelle sans base commune
   *  (la plus récente gagne, l'autre est gardée dans les conflits) ; identique, rien. Ni le cache de l'appareil ni les
   *  références. Faite ici plutôt qu'au tirage, qui ne regarde que les préfixes des modules montés. */
  async function adoptLocal(T, tree, result) {
    const same = (path, a, b) => a === b || JSON.stringify(valueOf(path, a)) === JSON.stringify(valueOf(path, b));
    for (const d of await idb('docs', 'getAll')) {
      const pol = d.policy || policyOf(d.path) || 'document';
      if (pol === 'cache' || pol === 'reference' || isCache(d.path) || tree[d.path] === d.rev || await idb('pending', 'get', d.path))
        continue;
      const queue = text => idb('pending', 'put', {
        path: d.path,
        text,
        at: new Date().toISOString(),
        author: cfg.identity.trigram || ''
      });
      if (!tree[d.path]) {
        await queue(d.text);
        continue;
      }
      const remote = await T.read(d.path, tree[d.path]),
        m = same(d.path, d.text, remote) ? {
          text: remote,
          conflict: null
        } : mergeText(d.path, null, d.text, remote);
      await idb('docs', 'put', {
        ...d,
        text: remote,
        base: remote,
        rev: tree[d.path],
        at: Date.now()
      });
      if (!same(d.path, m.text, remote)) await queue(m.text);
      if (m.conflict) {
        result.conflicts++;
        await idb('conflicts', 'add', {
          path: d.path,
          ...m.conflict,
          at: new Date().toISOString()
        });
      }
      result.pulled.push(d.path);
    }
  }
  /** Échange propre au transport (T.exchange) ; un échec ne bloque pas le passage local, il est rapporté (warning). Passage
   *  « manual » (bouton de l'utilisateur) : un geste, le lanceur commite aussi la base aéronautique (sia/base) ; un passage de
   *  fond la laisse sur le poste. */
  async function exchange(T, result, reason) {
    if (!T.exchange) return;
    try {
      const r = await T.exchange({
        gesture: reason === 'manual'
      });
      // compte rendu du lanceur (tools/data_sync.run) : des nombres et son message, ni chemins ni sortie de git
      if (r && typeof r === 'object') result.exchange = {
        ok: r.ok === true,
        committed: +r.committed || 0,
        held: +r.held || 0,
        received: +r.received || 0,
        pushed: r.pushed === true,
        conflicts: Array.isArray(r.conflicts) ? r.conflicts.length : +r.conflicts || 0,
        refused: Array.isArray(r.refused) ? r.refused.length : +r.refused || 0,
        settled: typeof r.settled === 'string' ? r.settled : '',
        // code d'un refus que la page sait dire (rewritten : historique du dépôt réécrit, à reprendre par un geste)
        code: typeof r.code === 'string' ? r.code.slice(0, 30) : '',
        message: String(r.message || '').slice(0, 300)
      };
    } catch (e) {
      result.warning = e?.offline ? 'exchange offline' : e?.message || String(e);
    }
  }
  /** Fin d'un passage : état gardé (dernière synchro réussie, erreur, ce qui a été envoyé), observateurs prévenus. */
  async function done(r, sent = []) {
    lastError = r.error;
    // ce qui vient de partir (lastPushed) : la liste du passage qui a tenté un envoi ; un passage qui n'en tente pas la laisse
    if (sent.length) await setMeta('lastPushed', {
      at: new Date().toISOString(),
      list: sent.slice(0, PUSHED_MAX).map(s => ({
        path: s.path,
        result: String(s.result || '').slice(0, 120)
      }))
    });
    backoff(r);
    // genre du dernier passage réussi (local ou dépôt) : un passage avec un dépôt après des passages locaux reprend les
    // copies écrites ici (adoptLocal)
    const kind = cfg.transport?.kind === 'local' ? 'local' : 'remote';
    if (r.ok && (await getMeta('mode'))?.kind !== kind) await setMeta('mode', {
      kind
    });
    const prev = await getMeta('status');
    await setMeta('status', {
      lastSync: r.ok ? new Date().toISOString() : prev?.lastSync || '',
      lastError: r.error
    });
    // les cinq derniers échecs (date, erreur telle que le transport l'a dite), pour le diagnostic copiable
    if (r.error) await noteFailure(r.error);
    if (r.pulled.length) changed([...new Set(r.pulled)]);
    if (r.conflicts) window.dispatchEvent(new CustomEvent('frame-data-conflict', {
      detail: {
        count: r.conflicts
      }
    }));
    return r;
  }
  /** Un échec de plus aux cinq derniers gardés pour le diagnostic copiable (date, texte court) : ceux des passages, et ce que
   *  le cadre y ajoute (une violation de la liste des sites autorisés de la page, 31 oct. 2026). */
  async function noteFailure(error) {
    await setMeta('failures', {
      list: [{
        at: new Date().toISOString(),
        error: String(error).slice(0, 200)
      }, ...((await getMeta('failures'))?.list || [])].slice(0, 5)
    });
  }
  /** Message du commit d'un lot : « RBR : 3 fichier(s) — disponibilites/RBR/2026-W43.json, … ». */
  const commitMessage = pend => `${cfg.identity.trigram || '?'} : ${pend.length} fichier(s) — ${pend.slice(0, 3).map(p => p.path).join(', ')}${pend.length > 3 ? ', …' : ''}`;
  /** Tire les changements du dépôt depuis la dernière tête connue : fichiers suivis remplacés, ou fusionnés avec une
   *  écriture en attente ; références revalidées seulement si elles sont déjà dans le cache. */
  async function pull(T, head) {
    const remote = await getMeta('remote'),
      out = {
        paths: [],
        conflicts: 0
      };
    if (remote?.head === head && remote.tree) {
      treeChecked = true;
      peek = null;
      return out;
    }
    const tree = await T.tree(head),
      old = remote?.tree || {};
    for (const [path, rev] of Object.entries(tree)) {
      if (old[path] === rev && remote?.head) continue;
      const pol = policyOf(path),
        doc = await idb('docs', 'get', path);
      if (!pol || doc?.rev === rev) continue;
      // référence jamais lue, apparue ou changée dans le dépôt : pas lue maintenant (à la demande), mais signalée, pour
      // qu'un service qui en dresse la liste (aerodb : zones publiées) la relise
      if (pol === 'reference' && !doc) {
        out.paths.push(path);
        continue;
      }
      const text = await T.read(path, rev),
        pend = await idb('pending', 'get', path);
      if (pend && pend.text !== null) {
        const m = mergeText(path, doc?.base ?? null, pend.text, text);
        await idb('pending', 'put', {
          ...pend,
          text: m.text
        });
        if (m.conflict) {
          out.conflicts++;
          await idb('conflicts', 'add', {
            path,
            ...m.conflict,
            at: new Date().toISOString()
          });
        }
      }
      await idb('docs', 'put', {
        path,
        text,
        base: text,
        rev,
        at: Date.now(),
        policy: pol
      });
      out.paths.push(path);
    }
    for (const path of Object.keys(old))
      if (!(path in tree) && !(await idb('pending', 'get', path)) && await idb('docs', 'get', path)) {
        await idb('docs', 'delete', path);
        out.paths.push(path);
      }
    await setMeta('remote', {
      head,
      tree,
      at: Date.now()
    });
    treeChecked = true;
    peek = null;
    return out;
  }
  /** Écritures envoyées : la copie du cache devient la version écrite (révision : empreinte git), la file se vide
   *  (sauf une écriture refaite entre-temps), l'arbre connu suit. next : nouvelle tête (transport distant). */
  async function applyPushed(pend, next, remote) {
    const tree = {
      ...(remote?.tree || {})
    };
    for (const p of pend) {
      if (p.text === null) {
        await idb('docs', 'delete', p.path);
        delete tree[p.path];
      } else {
        const rev = await gitSha(p.text);
        await idb('docs', 'put', {
          path: p.path,
          text: p.text,
          base: p.text,
          rev,
          at: Date.now(),
          policy: policyOf(p.path) || 'document'
        });
        tree[p.path] = rev;
      }
      const now = await idb('pending', 'get', p.path);
      if (now && now.at === p.at && now.text === p.text) await idb('pending', 'delete', p.path);
    }
    if (next) await setMeta('remote', {
      head: next,
      tree,
      at: Date.now()
    });
  }

  // ---------------------------------------------------------------- synchronisation de fond
  // sans action de l'utilisateur : au démarrage, toutes les « every » ms en ligne, au retour du réseau, au réveil de la
  // page (téléphone rallumé, onglet revenu au premier plan, page reprise du cache de navigation) si une écriture attend
  // ou si la dernière synchronisation date de plus de « every » ; après un passage « hors ligne », nouvel essai après
  // retry, doublé à chaque échec, plafonné à every ; un seul onglet synchronise à la fois (Web Locks)
  let timer = null,
    retryTimer = null,
    retryDelay = 0;
  const remote = () => cfg.transport && (cfg.transport.kind !== 'local' || !!refSource());
  /** Passage de fond si l'appareil se dit en ligne et que le transport échange. */
  const tick = () => {
    if (navigator.onLine !== false && remote()) sync({
      reason: 'background'
    });
  };
  /** Vrai si un passage est dû : écriture en attente, ou dernière synchronisation plus vieille que every. */
  async function due() {
    const s = await status();
    return s.pending > 0 || !s.lastSync || Date.now() - Date.parse(s.lastSync) > (cfg.every || EVERY);
  }
  /** Réveil (page de nouveau visible, reprise du cache de navigation) : état rediffusé, passage s'il est dû. */
  async function wake() {
    emitStatus(false);
    if (remote() && await due()) tick();
  }
  /** Après un passage : « hors ligne » → nouvel essai programmé (délai doublé, plafonné) ; sinon délai remis à zéro. */
  function backoff(r) {
    clearTimeout(retryTimer);
    if (r.error !== 'offline' || !timer) {
      retryDelay = 0;
      return;
    }
    retryDelay = Math.min(cfg.every || EVERY, retryDelay ? retryDelay * 2 : cfg.retry || 60e3);
    retryTimer = setTimeout(tick, retryDelay);
  }
  /** Démarre la couche : synchronisation tout de suite, puis de fond (voir ci-dessus). */
  function start() {
    if (timer) return;
    timer = setInterval(tick, cfg.every || EVERY);
    tick();
    window.addEventListener('online', tick);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') wake();
    });
    window.addEventListener('pageshow', e => {
      if (e.persisted) wake();
    });
  }

  // ---------------------------------------------------------------- diagnostic (Réglages › Diagnostic, à copier)
  /** État de la couche pour un rapport : transport, état, arbre du dépôt gardé (tête, date, nombre de fichiers, comparé
   *  ou non à la tête dans cette page), chemins « reference » connus de l'arbre et gardés dans le cache, dernière
   *  lecture en échec. Sans réseau. */
  async function diagnostic() {
    const s = await status(),
      remote = await getMeta('remote'),
      tree = cfg.transport?.kind === 'local' ? (await getMeta('refs'))?.tree : remote?.tree,
      paths = Object.keys(tree || {}),
      refs = paths.filter(p => policyOf(p) === 'reference'),
      docs = await idb('docs', 'getAll');
    return {
      ...s,
      tree: tree ? {
        head: String((cfg.transport?.kind === 'local' ? (await getMeta('refs'))?.head : remote?.head) || '').slice(0, 12),
        at: new Date((cfg.transport?.kind === 'local' ? (await getMeta('refs'))?.at : remote?.at) || 0).toISOString(),
        files: paths.length,
        checked: treeChecked
      } : null,
      references: {
        known: refs.length,
        sia: refs.filter(p => p.startsWith('sia/base/')).length,
        aircraft: refs.filter(p => p.startsWith('AircraftDB/')).length,
        cached: docs.filter(d => d.policy === 'reference').length
      },
      lastReadError,
      failures: (await getMeta('failures'))?.list || [] // les cinq derniers échecs de synchronisation, du plus récent
    };
  }

  // ---------------------------------------------------------------- conflits gardés
  /** Versions perdantes gardées (consultables) : [{ id, path, kept, lost, side, at, seen }]. */
  const conflicts = () => idb('conflicts', 'getAll');
  /** Marque un conflit comme vu (il ne compte plus dans l'état). */
  async function conflictSeen(id) {
    const c = await idb('conflicts', 'get', id);
    if (c) await idb('conflicts', 'put', {
      ...c,
      seen: true
    });
    emitStatus();
  }

  /** Conflit trouvé hors d'une synchronisation (fichier d'un poste, ex. fiche .lnmperf d'aerodb) : version perdante
   *  gardée comme un conflit de synchronisation, comptée au bouton du cadre et reprenable (restore). c : { path, kept,
   *  lost (texte), side }. Retour : l'identifiant du conflit. */
  async function noteConflict(c) {
    if (!c?.path || c.lost == null) return null;
    const id = await idb('conflicts', 'add', {
      path: String(c.path),
      kept: c.kept == null || typeof c.kept === 'string' ? c.kept ?? null : JSON.stringify(c.kept, null, 1),
      lost: typeof c.lost === 'string' ? c.lost : JSON.stringify(c.lost, null, 1),
      side: c.side || 'external',
      at: new Date().toISOString()
    });
    emitStatus();
    window.dispatchEvent(new CustomEvent('frame-data-conflict', {
      detail: {
        count: 1
      }
    }));
    return id;
  }

  /** Reprend une version écartée : elle redevient l'écriture en attente de son fichier (envoyée à la prochaine
   *  synchronisation), le conflit est marqué vu. Retour : le chemin, ou '' si le conflit n'existe plus. */
  async function restore(id) {
    const c = await idb('conflicts', 'get', id);
    if (!c?.lost && !(c?.side === 'refused' && c.lost === null)) return ''; // une suppression refusée se reprend aussi
    await idb('pending', 'put', {
      path: c.path,
      text: c.lost,
      at: new Date().toISOString(),
      author: cfg.identity.trigram || ''
    });
    await idb('conflicts', 'put', {
      ...c,
      seen: true,
      restored: new Date().toISOString()
    });
    changed([c.path]);
    emitStatus();
    return c.path;
  }

  // ---------------------------------------------------------------- transport local
  const transports = {
    /** Un seul utilisateur sur cet appareil : pas d'échange, le cache fait foi. */
    local: () => ({
      id: 'local',
      kind: 'local'
    })
  };

  // ---------------------------------------------------------------- état du cache, éviction, sauvegarde de l'appareil
  const bytesOf = text => new Blob([text ?? '']).size;
  /** Copies locales sous un préfixe, sans réseau : [{ path, rev, bytes, at, policy }] (écritures en attente non comprises :
   *  status().pending les compte). */
  async function cached(prefix = '') {
    return (await idb('docs', 'getAll')).filter(d => under(d.path, prefix)).map(d => ({
      path: d.path,
      rev: d.rev || '',
      bytes: bytesOf(d.text),
      at: d.at || 0,
      policy: d.policy || 'document'
    })).sort((a, b) => a.path.localeCompare(b.path));
  }
  /** Retire la copie locale d'un fichier « reference » (ou de tous ceux d'un préfixe finissant par /) : rien en file, rien
   *  envoyé ; relu à la prochaine demande. Les autres copies (documents, cache de l'appareil) ne sont jamais retirées
   *  ainsi. Rend le nombre de copies retirées. */
  async function evict(path) {
    const p = String(path || '');
    if (!p) return 0;
    const all = p.endsWith('/') ? (await idb('docs', 'getAll')).filter(d => under(d.path, p)) : [await idb('docs', 'get', p)].filter(
      Boolean);
    let n = 0;
    for (const d of all) {
      if ((d.policy || policyOf(d.path)) !== 'reference' || await idb('pending', 'get', d.path)) continue;
      await idb('docs', 'delete', d.path);
      n++;
    }
    return n;
  }
  /** Revalide ces chemins seulement, sans attendre un passage (frame/INTEGRATION.md § 4) : tête et arbre du dépôt du moment
   *  (transport local : de la source des références) lus une fois pour tous ; une copie dont la révision a changé est relue
   *  et remplacée, une copie « reference » disparue du dépôt est retirée, puis watch(chemins) ; une écriture en attente
   *  l'emporte (rien n'y est touché), un fichier de politique « cache » n'a pas de dépôt. Ne lève jamais. Rend { changed,
   *  unchanged, offline, errors? } (offline : la lecture s'est arrêtée, ce qui suit n'est pas touché ; errors : [{ path,
   *  message }] des fichiers que le dépôt a refusé de rendre). */
  async function revalidate(paths) {
    const list = [...new Set([].concat(paths || []).map(p => String(p || '')).filter(Boolean))],
      out = {
        changed: [],
        unchanged: [],
        offline: false
      };
    if (!list.length) return out;
    let src = cfg.transport,
      tree;
    try {
      if (!src || src.kind === 'local') {
        src = refSource();
        if (!src) return {
          ...out,
          unchanged: list
        };
        const head = await src.head();
        tree = await src.tree(head);
        await setMeta('refs', {
          id: src.id,
          head,
          tree,
          at: Date.now()
        });
      } else tree = (await treeNow(src)).tree;
    } catch (e) {
      return {
        ...out,
        offline: true,
        ...(e?.offline ? {} : {
          message: e?.message || String(e)
        })
      };
    }
    for (const path of list) {
      try {
        const pol = policyOf(path),
          doc = await idb('docs', 'get', path);
        if (pol === 'cache' || isCache(path) || await idb('pending', 'get', path)) {
          out.unchanged.push(path);
          continue;
        }
        const rev = tree[path];
        if (!rev) {
          if (doc && (doc.policy || pol) === 'reference') {
            await idb('docs', 'delete', path);
            out.changed.push(path);
          } else out.unchanged.push(path);
          continue;
        }
        if (doc?.rev === rev) {
          out.unchanged.push(path);
          continue;
        }
        const text = await src.read(path, rev);
        await idb('docs', 'put', {
          ...(doc || {}),
          path,
          text,
          base: text,
          rev,
          at: Date.now(),
          policy: doc?.policy || pol || 'reference'
        });
        out.changed.push(path);
      } catch (e) {
        if (e?.offline) {
          out.offline = true;
          break;
        }
        // lecture refusée (droits, taille) ou stockage de l'appareil en échec : la copie gardée reste, l'erreur est dite
        out.unchanged.push(path);
        (out.errors ||= []).push({
          path,
          message: e?.message || String(e)
        });
      }
    }
    changed(out.changed);
    return out;
  }
  const EXPORT = 'sog-frame-export/1';
  // clés de l'appareil (jeton GitHub, clé météo) : un document « cache » comme l'identité, mais jamais dans une
  // sauvegarde ni reprise d'une sauvegarde, et gardé par un remplacement
  const KEYS = 'device/keys.json';
  // réserve météo de l'appareil (frame/lib/weather_store.js) : une réserve relisible à sa source, propre à cet appareil
  // (son décompte des appels compris), jamais dans une sauvegarde ni reprise d'une sauvegarde
  const WEATHER = 'cache/weather/';
  // trace volée de l'appareil (device/trail.json, décision du 30 oct. : la trace reste locale) : jamais dans une sauvegarde
  const TRAIL = 'device/trail.json';
  const saved = path => path !== KEYS && path !== TRAIL && !path.startsWith(WEATHER);
  /** Sauvegarde des données de l'appareil en un fichier JSON : { name, text, counts }. Copies (docs), écritures en attente,
   *  conflits ; les bases de référence (relisibles à leur source) seulement avec { references: true } ; ni jeton ni
   *  clé (device/keys.json laissé de côté), ni l'état du transport (meta, propre à l'appareil). */
  async function dump({
    references = false
  } = {}) {
    const docs = (await idb('docs', 'getAll')).filter(d => saved(d.path) && (references || d.policy !== 'reference')),
      pending = await idb('pending', 'getAll'),
      conflicts = await idb('conflicts', 'getAll'),
      at = new Date().toISOString();
    const text = JSON.stringify({
      format: EXPORT,
      at,
      trigram: cfg.identity.trigram || '',
      docs,
      pending,
      conflicts
    });
    return {
      name: `sog-appareil-${(cfg.identity.trigram || 'donnees').toLowerCase()}-${at.slice(0, 10)}.json`,
      text,
      counts: {
        docs: docs.length,
        pending: pending.length,
        conflicts: conflicts.length,
        bytes: bytesOf(text)
      }
    };
  }
  /** Reprend une sauvegarde (texte, File ou objet de dump). mode 'merge' (défaut) : rien de cet appareil n'est
   *  perdu — un fichier absent ici ou plus récent dans la sauvegarde (updated_at) devient une écriture en attente (copie
   *  de l'appareil, base de référence : copie directe), une écriture en attente d'ici l'emporte toujours ; les réglages
   *  de l'appareil (device/ : usages, identité, niveau) ne sont jamais repris (une sauvegarde restaure des données, pas
   *  le transport ni l'identité de cet appareil) ; mode 'replace' : copies, file et conflits de cet appareil remplacés
   *  par ceux de la sauvegarde, device/ compris (jamais de jeton : il n'est pas dans la sauvegarde). Rend { added,
   *  updated, kept, pending, conflicts, device (fichiers device/ laissés de côté) }. */
  async function load(input, {
    mode = 'merge'
  } = {}) {
    const src = typeof input === 'string' ? JSON.parse(input) : input instanceof Blob ? JSON.parse(await input.text()) : input;
    if (src?.format !== EXPORT || !Array.isArray(src.docs)) throw new Error('frame/store: not a device export (sog-frame-export/1)');
    const r = {
      added: 0,
      updated: 0,
      kept: 0,
      pending: 0,
      conflicts: 0,
      device: 0
    };
    let docs = src.docs.filter(d => d && typeof d.path === 'string' && typeof d.text === 'string' && saved(d.path)),
      pend = (src.pending || []).filter(p => p && typeof p.path === 'string' && (typeof p.text === 'string' || p.text === null) &&
        saved(p.path)),
      confl = (src.conflicts || []).filter(c => c && typeof c.path === 'string');
    const paths = [];
    if (mode !== 'replace') {
      // fusion : device/ laissé de côté (les usages d'un autre appareil changeraient le transport de celui-ci)
      const n = docs.length + pend.length;
      docs = docs.filter(d => !under(d.path, 'device/'));
      pend = pend.filter(p => !under(p.path, 'device/'));
      r.device = n - docs.length - pend.length;
    }
    if (mode === 'replace') {
      // les clés et la réserve météo de cet appareil ne sont pas dans une sauvegarde : gardées
      const own = (await idb('docs', 'getAll')).filter(d => !saved(d.path));
      for (const s of ['docs', 'pending', 'conflicts']) await idb(s, 'clear');
      for (const d of own) await idb('docs', 'put', d);
      for (const d of docs) await idb('docs', 'put', d);
      for (const p of pend) await idb('pending', 'put', p);
      for (const {
          id,
          ...c
        }
        of confl) await idb('conflicts', 'add', c);
      Object.assign(r, {
        added: docs.length,
        pending: pend.length,
        conflicts: confl.length
      });
      paths.push(...docs.map(d => d.path), ...pend.map(p => p.path));
    } else {
      const queue = async (path, text) => {
        await idb('pending', 'put', {
          path,
          text,
          at: new Date().toISOString(),
          author: cfg.identity.trigram || ''
        });
        r.pending++;
        paths.push(path);
      };
      for (const d of docs) {
        const mine = await idb('docs', 'get', d.path);
        if (await idb('pending', 'get', d.path) || mine?.text === d.text) {
          r.kept++;
          continue;
        }
        if (mine && !isNewer(valueOf(d.path, d.text), valueOf(d.path, mine.text))) {
          r.kept++;
          continue;
        }
        mine ? r.updated++ : r.added++;
        if (d.policy === 'cache' || d.policy === 'reference') {
          await idb('docs', 'put', {
            ...d,
            at: Date.now()
          });
          paths.push(d.path);
        } else await queue(d.path, d.text);
      }
      // écritures en attente de la sauvegarde : reprises si rien n'attend ici pour ce fichier et si la copie d'ici n'est
      // ni la même ni plus récente ; une suppression en attente n'est jamais reprise (rien d'ici n'est perdu)
      for (const p of pend) {
        const mine = await idb('docs', 'get', p.path);
        if (p.text === null || await idb('pending', 'get', p.path) || (mine && (mine.text === p.text || !isNewer(valueOf(p.path, p
              .text),
            valueOf(p.path, mine.text))))) r.kept++;
        else await queue(p.path, p.text);
      }
      const seen = new Set((await idb('conflicts', 'getAll')).map(c => `${c.path}|${c.at}|${c.lost}`));
      for (const {
          id,
          ...c
        }
        of confl)
        if (!seen.has(`${c.path}|${c.at}|${c.lost}`)) {
          await idb('conflicts', 'add', c);
          r.conflicts++;
        }
    }
    changed([...new Set(paths)]);
    emitStatus();
    return r;
  }

  // ---------------------------------------------------------------- adaptateur d'un module
  /** Partie « data » de l'adaptateur d'un module : ses préfixes lus et écrits sont enregistrés ; une écriture hors de
   *  ses préfixes déclarés est refusée (un préfixe déclaré par plusieurs modules est partagé : chacun y écrit).
   *  decl : { reads: [préfixe | { prefix, policy }], writes: [préfixe | { prefix, merge | policy: 'cache' }] }. */
  function adapter(decl = {}) {
    declare(decl);
    const writes = [].concat(decl.writes || []).map(w => typeof w === 'string' ? w : w.prefix);
    const allowed = path => writes.some(w => under(path, w));
    const guard = path => {
      if (!allowed(path)) throw new Error(`frame/store: ${decl.id || 'module'} may not write ${path} (not in its declared writes)`);
    };
    return {
      get,
      read,
      list,
      cached,
      evict,
      abandon,
      revalidate,
      put: (path, value, opts) => (guard(path), put(path, value, {
        ...(opts || {}),
        module: decl.id || ''
      })),
      remove: path => (guard(path), remove(path, {
        module: decl.id || ''
      })),
      watch,
      status,
      onStatus,
      // { gesture: true } : le geste de l'utilisateur dans le module (« Publier ») — un passage 'manual', comme le bouton de
      // l'en-tête (sia/base part aussi) ; sinon un passage de fond du module. Le compte rendu de l'échange : result.exchange
      sync: Object.assign((o = {}) => sync({
        reason: o?.gesture === true ? 'manual' : 'module'
      }), {
        gesture: true // le module sait que le cadre prend le geste (sinon « Publier » reste gris, jamais de repli sans geste)
      })
    };
  }

  // ---------------------------------------------------------------- la compagnie courante (V3_SPECIFICATION § 10.38, étape 1)
  // Plusieurs compagnies dans un même dépôt : data/airline/index.json = { airlines: [{ code, name }] } (écrit par la migration du
  // lanceur / Réglages), data/airline/<code>/settings.json et fleet.json ; la compagnie « personnel » (code perso) est implicite, sous
  // pilot/<trigramme>/airline/perso/ ; sans index.json (avant la migration), la compagnie d'aujourd'hui (data/airline/settings.json et
  // fleet.json, code default). La compagnie courante est un réglage de l'appareil (meta « airline »), jamais synchronisé.
  // Tout fichier de data/ est une entrée non fiable (§ 10.36) : codes ^[a-z0-9]{2,8}$, noms bornés et sans caractère de commande,
  // vingt compagnies au plus ; les contenus (settings, fleet) sont rendus tels que lus, à échapper par qui les affiche.
  const AIRLINE_CODE = /^[a-z0-9]{2,8}$/,
    AIRLINE_PERSO = 'perso',
    AIRLINE_DEFAULT = 'default',
    AIRLINES_MAX = 20,
    AIRLINE_NAME_MAX = 80;
  const airlineName = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, AIRLINE_NAME_MAX) : '';
  /** Les compagnies de data/airline/index.json : [{ code, name }] bornées et nettoyées ; null sans index (ou sans une seule entrée
   *  valide) : on est avant la migration. perso et default ne s'y déclarent pas (réservés). */
  async function airlineIndex() {
    declare({
      reads: ['airline/']
    }); // tiré même si aucun module ne l'a déclaré
    const v = await get('airline/index.json', {
      wait: true
    }).catch(() => null);
    if (!v || typeof v !== 'object' || !Array.isArray(v.airlines)) return null;
    const seen = new Set(),
      list = [];
    for (const a of v.airlines) {
      const code = typeof a?.code === 'string' ? a.code : '';
      if (!AIRLINE_CODE.test(code) || code === AIRLINE_PERSO || code === AIRLINE_DEFAULT || seen.has(code)) continue;
      seen.add(code);
      list.push({
        code,
        name: airlineName(a.name) || code
      });
      if (list.length >= AIRLINES_MAX) break;
    }
    return list.length ? list : null;
  }
  const persoRoot = () => `pilot/${cfg.identity?.trigram || 'ANON'}/airline/perso/`;
  /** Les compagnies connues de l'appareil : [{ code, name }] — celles de l'index (ou « default », la compagnie d'aujourd'hui, sans
   *  index), puis « personnel » toujours en dernier. */
  async function airlines() {
    const idx = await airlineIndex();
    let list = idx;
    if (!list) {
      const st = await get('airline/settings.json', {
        wait: true
      }).catch(() => null);
      list = [{
        code: AIRLINE_DEFAULT,
        name: airlineName(st?.name) || AIRLINE_DEFAULT
      }];
    }
    return [...list, {
      code: AIRLINE_PERSO,
      name: 'Personnel'
    }];
  }
  /** Le code de la compagnie courante : le choix de l'appareil s'il est connu, sinon la première de l'index, sinon default. */
  async function currentCode() {
    const chosen = (await getMeta('airline'))?.code,
      known = (await airlines()).map(a => a.code);
    return known.includes(chosen) ? chosen : known[0];
  }
  /** La compagnie courante : { code, root, name, settings, fleet } — settings et fleet tels que lus (objet / null, non fiables : à
   *  échapper), name nettoyé et borné. « personnel » est créée vide à la première demande (settings.json et fleet.json sous
   *  pilot/<trigramme>/airline/perso/). */
  async function airline() {
    const code = await currentCode(),
      list = await airlines(),
      known = list.find(a => a.code === code) || {
        code,
        name: code
      },
      base = code === AIRLINE_PERSO ? persoRoot() : code === AIRLINE_DEFAULT ? 'airline/' : `airline/${code}/`;
    declare({
      reads: [base]
    });
    let [settings, fleet] = await Promise.all(['settings.json', 'fleet.json'].map(f => get(base + f, {
      wait: true
    }).catch(() => null)));
    if (code === AIRLINE_PERSO && settings === null && fleet === null) {
      const at = new Date().toISOString();
      settings = {
        schema: 1,
        code: AIRLINE_PERSO,
        name: 'Personnel',
        updated_at: at
      };
      fleet = {
        schema: 1,
        aircraft: [],
        updated_at: at
      };
      await put(base + 'settings.json', settings, {
        module: 'frame-data'
      });
      await put(base + 'fleet.json', fleet, {
        module: 'frame-data'
      });
    }
    const plain = v => v && typeof v === 'object' ? v : null;
    return {
      code,
      root: base, // le dossier de la compagnie (« airline/<code>/ ») : un fichier qu'elle nomme (le logo) s'y trouve, nulle part ailleurs
      name: code === AIRLINE_PERSO ? known.name : airlineName(plain(settings)?.name) || known.name,
      settings: plain(settings) && !Array.isArray(settings) ? settings : {},
      fleet: plain(fleet)
    };
  }
  /** Choisit la compagnie courante de l'appareil : un code connu (airlines()) ; faux sans effet si le code est inconnu. Un
   *  changement de compagnie est annoncé (événement « frame-data-airline » sur window, detail { code, name }), pas un choix
   *  répété. */
  async function setAirline(code) {
    const list = await airlines();
    if (typeof code !== 'string' || !list.some(a => a.code === code)) return false;
    const before = await currentCode();
    await setMeta('airline', {
      code
    });
    if (before !== code) window.dispatchEvent(new CustomEvent('frame-data-airline', {
      detail: {
        code,
        name: list.find(a => a.code === code).name
      }
    }));
    return true;
  }

  window.FrameData = {
    configure,
    start,
    adapter,
    declare,
    airline, // la compagnie courante { code, name, settings, fleet } (§ 10.38) ; airlines() : les compagnies connues ; setAirline(code)
    airlines,
    setAirline,
    isNewer, // la fiche a est plus récente que b, par l'instant de updated_at / updatedAt (la seule règle de comparaison des dates)
    sync,
    status,
    onStatus,
    conflicts,
    conflictSeen,
    noteConflict,
    restore,
    diagnostic,
    noteFailure,
    pendingList,
    lastPushed,
    readBytes,
    cached,
    evict,
    revalidate,
    dump,
    load,
    gitSha,
    merge,
    mergeText,
    transports,
    // pour les essais : le cache entier oublié (base fermée et effacée)
    async reset() {
      const d = await open().catch(() => null);
      d?.close();
      dbP = null;
      await new Promise(res => {
        const r = indexedDB.deleteDatabase(DB);
        r.onsuccess = r.onerror = r.onblocked = () => res();
      });
      reads.length = rules.length = caches.length = 0;
      lastError = '';
      treeNowP = peekP = peek = null;
      treeChecked = false;
    }
  };
})();
