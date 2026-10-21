(() => {
  'use strict';
  // Données de la compagnie sur GitHub (appli sans lanceur : GitHub Pages, appli iOS ; docs/technique/APPLI_AUTONOME.md) :
  // dépôt des données (copie du dépôt git de data/), branche et jeton personnel à grain fin (contenu en lecture et
  // écriture, ce dépôt seulement), réglés dans Mon profil › Accès aux données, gardés dans ce navigateur seulement
  // (localStorage githubData:v1, exclu des sauvegardes : shared/browser_store.js).
  //   · lectures : fetch des adresses data/… détourné vers le dépôt (API contents, requêtes conditionnelles, copie
  //     hors ligne dans IndexedDB sogGithubData) : MissionAssignments, MissionLedger, YAML des missions… inchangés ;
  //     fichiers de données chargés en <script> (shared/data_files.js : références, data_tree, base des types) : lus
  //     en synchrone (XMLHttpRequest, copie dans localStorage reprise tout de suite puis rafraîchie) ; index des
  //     dossiers (_index.json) refaits depuis l'arbre du dépôt s'il n'y en a pas ; tout cela dans la page, sans
  //     service worker (absent d'une appli iOS) ;
  //   · écritures : put / remove (API contents, avec le sha du fichier : un fichier changé entre-temps est signalé,
  //     jamais écrasé sans relecture), appelées par MissionAssignments (fichiers du pool) et MissionLedger (registre
  //     des CR) ; un commit par écriture, au nom du trigramme.
  // API (window.GitHubData) : on(), config(), enable({ repo, branch, token }), disable(), test(cfg), read(rel, { method })
  // → Response, list(préfixe) → chemins | null, readSync(rel) → texte | null, getText(rel) → { text, sha } | null, put(rel, text, { sha, message }) → sha,
  // remove(rel) ; erreur de conflit : err.conflict = true ; lastRead() → date ISO de la dernière lecture réussie dans le
  // dépôt (texte vide s'il n'y en a pas : githubData:readAt, posée au plus toutes les 30 s ; Paramètres › Installation).
  if (window.GitHubData) return;
  const API = 'https://api.github.com',
    KEY = 'githubData:v1', // réglage { repo, branch, token }
    READ_AT = 'githubData:readAt', // date ISO de la dernière lecture réussie (lastRead)
    REF = 'githubData:f:', // copies des fichiers lus en synchrone (références) : { etag, text }
    DB = 'sogGithubData',
    STORE = 'files'; // copies hors ligne des fichiers lus par fetch : { rel, etag, body }
  const here = document.currentScript?.src || location.href,
    ROOT = new URL('../', here).href, // racine de la suite
    DATA = `${ROOT}data/`;
  const nativeFetch = window.fetch.bind(window);
  const K = () => window.RepositoryKit;
  /** Texte d'une ligne [fr, en, de, es] dans la langue de la page (français si le kit n'est pas chargé). */
  const t = (row, v = {}) => K()?.tf ? K().tf(row, v) : String(row[0]).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

  // ---- réglage
  /** Réglage { repo, branch, token } ; null s'il n'y en a pas. */
  const config = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c?.token && c.repo ? c : null;
    } catch {
      return null;
    }
  };
  const on = () => !!config();
  let stamped = 0;
  /** Note la lecture réussie qui vient d'avoir lieu (au plus une écriture toutes les 30 s). */
  const stamp = () => {
    if (Date.now() - stamped < 30e3) return;
    stamped = Date.now();
    try {
      localStorage.setItem(READ_AT, new Date(stamped).toISOString());
    } catch {
      /* stockage indisponible : pas de date */
    }
  };
  /** Date ISO de la dernière lecture réussie dans le dépôt ; texte vide s'il n'y en a pas. */
  const lastRead = () => {
    try {
      return localStorage.getItem(READ_AT) || '';
    } catch {
      return '';
    }
  };
  /** Réglage exigé (erreur expliquée sinon). */
  const need = () => {
    const c = config();
    if (!c) throw new Error(t(['Accès aux données GitHub non réglé.', 'GitHub data access not set.',
      'GitHub-Datenzugang nicht eingestellt.', 'Acceso a los datos de GitHub no configurado.'
    ]));
    return c;
  };

  // ---- API GitHub
  /** En-têtes d'un appel authentifié (accept : raw pour le contenu, json pour les métadonnées). */
  const headers = (c, accept = 'application/vnd.github.raw', etag = '') => ({
    Authorization: `Bearer ${c.token}`,
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(etag ? {
      'If-None-Match': etag
    } : {})
  });
  /** Chemin d'un fichier du dépôt dans une adresse (chaque segment encodé). */
  const enc = rel => rel.split('/').map(encodeURIComponent).join('/');
  const fileUrl = (c, rel) => `${API}/repos/${c.repo}/contents/${enc(rel)}?ref=${encodeURIComponent(c.branch)}`;
  /** Texte UTF-8 → base64 (par morceaux : pas de dépassement de pile sur un gros fichier). */
  const b64 = text => {
    const bytes = new TextEncoder().encode(text);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  /** base64 (avec retours à la ligne, réponse de l'API) → texte UTF-8. */
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(String(s).replace(/\s/g, '')), c => c.charCodeAt(0)));
  /** Message d'erreur lisible d'une réponse refusée (jeton, droits, dépôt, limite). */
  async function why(r) {
    const body = await r.json().catch(() => ({}));
    const m = body.message || r.statusText;
    if (r.status === 401) return t(['Jeton GitHub refusé (expiré ou faux) : le refaire dans Mon profil › Accès aux données.',
      'GitHub token refused (expired or wrong): renew it in My profile › Data access.',
      'GitHub-Token abgelehnt (abgelaufen oder falsch): unter Mein Profil › Datenzugang erneuern.',
      'Token de GitHub rechazado (caducado o erróneo): renovarlo en Mi perfil › Acceso a los datos.'
    ]);
    if (r.status === 403 || r.status === 404) return t(['GitHub : {m} (droits du jeton sur le dépôt ?)',
      'GitHub: {m} (token rights on the repository?)',
      'GitHub: {m} (Rechte des Tokens auf das Repository?)', 'GitHub: {m} (¿derechos del token sobre el repositorio?)'
    ], {
      m
    });
    return `GitHub ${r.status} : ${m}`;
  }
  const MIME = {
    json: 'application/json',
    js: 'text/javascript',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    md: 'text/markdown',
    csv: 'text/csv',
    xml: 'application/xml',
    txt: 'text/plain',
    png: 'image/png',
    svg: 'image/svg+xml',
    pdf: 'application/pdf'
  };
  /** Type d'un fichier d'après son extension (texte en UTF-8). */
  const mimeOf = rel => {
    const m = MIME[(rel.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
    return /^(text|application\/(json|xml))/.test(m) ? `${m};charset=utf-8` : m;
  };

  // ---- copies hors ligne (IndexedDB) des fichiers lus par fetch
  let dbP = null;
  /** Base sogGithubData ouverte (magasin files) : une seule connexion, gardée. */
  const open = () => dbP ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, {
        keyPath: 'rel'
      });
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
  /** Opération sur le magasin des copies (get, put, delete, clear) ; null en cas d'échec (stockage indisponible). */
  const idb = async (op, arg) => {
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        const q = db.transaction(STORE, op === 'get' ? 'readonly' : 'readwrite').objectStore(STORE)[op](arg);
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      });
    } catch {
      return null;
    }
  };

  // ---- lecture d'un fichier du dépôt (fetch des adresses data/…)
  /** Réponse construite d'une copie ou d'un contenu : type d'après le nom, en-tête x-gh-etag. */
  const respond = (rel, body, etag, status = 200) => new Response(body, {
    status,
    headers: {
      'Content-Type': mimeOf(rel),
      'x-gh-etag': etag || '',
      'Cache-Control': 'no-cache'
    }
  });
  /** Fichier <rel> du dépôt : copie revalidée (If-None-Match), sinon dernière copie hors ligne ; 404 s'il est absent
   *  (index d'un dossier absent : refait depuis l'arbre) ; 503 hors ligne sans copie. method HEAD : sans corps. */
  async function read(rel, {
    method = 'GET'
  } = {}) {
    const c = need(),
      old = await idb('get', rel),
      body = r => method === 'HEAD' ? null : r;
    try {
      const r = await nativeFetch(fileUrl(c, rel), {
        headers: headers(c, 'application/vnd.github.raw', old?.etag),
        cache: 'no-store'
      });
      if (r.ok || r.status === 304) stamp();
      if (r.status === 304 && old) return respond(rel, body(old.body), old.etag);
      if (r.ok) {
        const text = /^(text|application\/(json|xml))/.test(mimeOf(rel)),
          data = text ? await r.text() : await r.arrayBuffer(),
          etag = r.headers.get('ETag') || '';
        await idb('put', {
          rel,
          etag,
          body: data,
          at: Date.now()
        });
        return respond(rel, body(data), etag);
      }
      if (r.status === 404) {
        if (old) await idb('delete', rel);
        const built = await builtIndex(rel);
        return built ? respond(rel, body(built), '') : new Response(null, {
          status: 404
        });
      }
      if (old) return respond(rel, body(old.body), old.etag);
      return new Response(null, {
        status: r.status
      });
    } catch {
      return old ? respond(rel, body(old.body), old.etag) : new Response(null, {
        status: 503
      }); // hors ligne, sans copie
    }
  }
  /** JSON d'un fichier du dépôt (lecture ci-dessus) ; null s'il est absent ou illisible. */
  const json = async rel => {
    const r = await read(rel);
    return r.ok ? r.json().catch(() => null) : null;
  };
  // ---- index des dossiers refaits depuis l'arbre du dépôt (mêmes champs que tools/launch.py : index_availability,
  // index_users) quand le dépôt ne les a pas (exclus des commits de synchronisation)
  let tree = null; // { at, paths }
  /** Chemins de tous les fichiers du dépôt (une requête, gardée 60 s) ; arbre illisible (hors ligne, jeton) : dernière
   *  liste connue, sinon [] (strict : null). */
  async function paths({
    strict = false
  } = {}) {
    if (tree && Date.now() - tree.at < 60e3) return tree.paths;
    const c = need(),
      r = await nativeFetch(`${API}/repos/${c.repo}/git/trees/${encodeURIComponent(c.branch)}?recursive=1`, {
        headers: headers(c, 'application/vnd.github+json'),
        cache: 'no-store'
      }).catch(() => null);
    if (!r?.ok) return tree?.paths || (strict ? null : []);
    tree = {
      at: Date.now(),
      paths: (await r.json()).tree.filter(x => x.type === 'blob').map(x => x.path)
    };
    return tree.paths;
  }
  /** Chemins des fichiers du dépôt qui commencent par prefix (« sia/base/ ») ; null si l'arbre n'a pas pu être lu. */
  const list = async (prefix = '') => (await paths({
    strict: true
  }))?.filter(x => x.startsWith(prefix)) ?? null;
  /** Index d'un dossier (disponibilites, utilisateurs) absent du dépôt, refait depuis l'arbre (texte JSON) ; null pour
   *  un autre fichier. */
  async function builtIndex(rel) {
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    if (rel === 'disponibilites/_index.json') {
      const pilots = {};
      for (const p of await paths()) {
        const legacy = /^disponibilites\/([A-Za-z0-9]{2,5})\.json$/.exec(p),
          week = /^disponibilites\/([A-Za-z0-9]{2,5})\/(\d{4}-W\d{2})\.json$/.exec(p);
        if (legacy) Object.assign(pilots[legacy[1].toUpperCase()] ||= {}, {
          legacy: true,
          legacy_at: String((await json(p))?.updated_at || '')
        });
        else if (week) {
          const e = pilots[week[1].toUpperCase()] ||= {};
          (e.weeks ||= []).push(week[2]);
          (e.at ||= {})[week[2]] = String((await json(p))?.updated_at || '');
        }
      }
      for (const e of Object.values(pilots)) e.weeks?.sort();
      return JSON.stringify({
        schema: 2,
        updated_at: now,
        pilots
      }, null, 1);
    }
    if (rel === 'utilisateurs/_index.json') {
      const users = {};
      for (const p of await paths()) {
        const m = /^utilisateurs\/([A-Z0-9]{2,5})\.json$/.exec(p);
        if (!m) continue;
        const u = await json(p);
        if (u) users[m[1]] = {
          role: u.role || 'utilisateur',
          actif: u.actif !== false,
          nom: u.nom || '',
          updated_at: String(u.updated_at || '')
        };
      }
      return JSON.stringify({
        schema: 1,
        va: '',
        updated_at: now,
        utilisateurs: users
      }, null, 1);
    }
    return null;
  }

  // ---- lecture synchrone (fichiers de données chargés en <script> pendant l'analyse de la page : shared/data_files.js)
  const refs = {}; // copies lues cette fois-ci (rafraîchissement asynchrone, une fois par page et par fichier)
  /** Copie localStorage d'un fichier lu en synchrone ; null si absente. */
  const refGet = rel => {
    try {
      return JSON.parse(localStorage.getItem(REF + rel) || 'null');
    } catch {
      return null;
    }
  };
  /** Garde (ou efface, v null) la copie localStorage d'un fichier ; fichier trop gros pour ce stockage : ignoré. */
  const refSet = (rel, v) => {
    try {
      if (v === null) localStorage.removeItem(REF + rel);
      else if (v.text.length < 1.5e6) localStorage.setItem(REF + rel, JSON.stringify(v));
    } catch {
      /* quota : sans copie */
    }
  };
  /** Texte d'un fichier du dépôt, tout de suite : copie de ce navigateur (rafraîchie ensuite, pour la prochaine page),
   *  sinon lecture bloquante (XMLHttpRequest synchrone, comme le <script> qu'elle remplace) ; null s'il est absent ou
   *  hors ligne sans copie. */
  function readSync(rel) {
    const c = config();
    if (!c) return null;
    const hit = refGet(rel);
    if (hit && !refs[rel]) {
      refs[rel] = true;
      nativeFetch(fileUrl(c, rel), {
        headers: headers(c, 'application/vnd.github.raw', hit.etag),
        cache: 'no-store'
      }).then(async r => {
        if (r.ok || r.status === 304) stamp();
        if (r.ok) refSet(rel, {
          etag: r.headers.get('ETag') || '',
          text: await r.text()
        });
        else if (r.status === 404) refSet(rel, null);
      }).catch(() => {});
    }
    if (hit) return hit.text;
    const x = new XMLHttpRequest();
    x.open('GET', fileUrl(c, rel), false);
    for (const [k, v] of Object.entries(headers(c))) x.setRequestHeader(k, v);
    try {
      x.send();
    } catch {
      return null;
    }
    if (x.status !== 200) return null;
    stamp();
    refSet(rel, {
      etag: x.getResponseHeader('ETag') || '',
      text: x.responseText
    });
    return x.responseText;
  }

  // ---- écritures
  /** Fichier du dépôt lu par l'API avec son sha : { text, sha } ; null s'il est absent. */
  async function getText(rel, cfg = null) {
    const c = cfg || need();
    const r = await nativeFetch(fileUrl(c, rel), {
      headers: headers(c, 'application/vnd.github+json'),
      cache: 'no-store'
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(await why(r));
    const j = await r.json();
    // plus de 1 Mo : contenu absent de la réponse, relu en brut
    const text = j.content ? unb64(j.content) : await (await nativeFetch(fileUrl(c, rel), {
      headers: headers(c),
      cache: 'no-store'
    })).text();
    return {
      text,
      sha: j.sha
    };
  }
  /** Message de commit : « RBR : disponibilites/RBR/2026-W43.json (appli) ». */
  const message = rel => `${window.MissionAssignments?.trigram?.() || window.SuiteUsers?.effective?.() || '?'} : ${rel} (appli)`;
  /** Fichier écrit : copies oubliées (relues au prochain accès), arbre relu. */
  const changed = rel => {
    tree = null;
    refSet(rel, null);
    idb('delete', rel);
  };
  /** Écrit un fichier du dépôt (un commit) ; sha : version lue (conflit s'il a changé depuis : err.conflict), sinon la
   *  version actuelle est relue juste avant. Retour : sha de la nouvelle version. */
  async function put(rel, text, {
    sha,
    message: msg
  } = {}) {
    const c = need(),
      known = sha !== undefined;
    let cur = known ? sha : (await getText(rel, c))?.sha;
    for (let i = 0; i < 2; i++) {
      const r = await nativeFetch(`${API}/repos/${c.repo}/contents/${enc(rel)}`, {
        method: 'PUT',
        headers: {
          ...headers(c, 'application/vnd.github+json'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: msg || message(rel),
          content: b64(text),
          branch: c.branch,
          ...(cur ? {
            sha: cur
          } : {})
        })
      });
      if (r.ok) {
        changed(rel);
        return (await r.json()).content?.sha || '';
      }
      // version changée depuis la lecture : signalée à l'appelant qui l'a lue (fusion), sinon relue une fois
      if (r.status === 409 || r.status === 422) {
        if (known) throw Object.assign(new Error(t(['« {f} » a changé sur GitHub depuis sa lecture.',
          '“{f}” changed on GitHub since it was read.', '„{f}“ hat sich seit dem Lesen auf GitHub geändert.',
          '«{f}» ha cambiado en GitHub desde su lectura.'
        ], {
          f: rel
        })), {
          conflict: true
        });
        cur = (await getText(rel, c))?.sha;
        continue;
      }
      throw new Error(await why(r));
    }
    throw new Error(`GitHub : ${rel}`);
  }
  /** Supprime un fichier du dépôt (absent : rien). */
  async function remove(rel) {
    const c = need(),
      cur = await getText(rel, c);
    if (!cur) return;
    const r = await nativeFetch(`${API}/repos/${c.repo}/contents/${enc(rel)}`, {
      method: 'DELETE',
      headers: {
        ...headers(c, 'application/vnd.github+json'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message(rel),
        sha: cur.sha,
        branch: c.branch
      })
    });
    if (!r.ok) throw new Error(await why(r));
    changed(rel);
  }
  /** Vérifie un réglage : dépôt lisible, branche présente, droit d'écriture. Retour : { ok, write, message }. */
  async function test(cfg) {
    try {
      const r = await nativeFetch(`${API}/repos/${cfg.repo}`, {
        headers: headers(cfg, 'application/vnd.github+json'),
        cache: 'no-store'
      });
      if (!r.ok) return {
        ok: false,
        message: await why(r)
      };
      const repo = await r.json(),
        b = await nativeFetch(`${API}/repos/${cfg.repo}/branches/${encodeURIComponent(cfg.branch)}`, {
          headers: headers(cfg, 'application/vnd.github+json'),
          cache: 'no-store'
        });
      if (!b.ok) return {
        ok: false,
        message: t(['Branche « {b} » introuvable dans {r}.', 'Branch “{b}” not found in {r}.', 'Zweig „{b}“ in {r} nicht gefunden.',
          'Rama «{b}» no encontrada en {r}.'
        ], {
          b: cfg.branch,
          r: cfg.repo
        })
      };
      const write = !!repo.permissions?.push;
      return {
        ok: true,
        write,
        message: write ? t(['Dépôt {r} lisible et modifiable (branche {b}).', 'Repository {r} readable and writable (branch {b}).',
          'Repository {r} lesbar und beschreibbar (Zweig {b}).', 'Repositorio {r} legible y modificable (rama {b}).'
        ], {
          r: repo.full_name,
          b: cfg.branch
        }) : t(['Dépôt {r} lisible, sans droit d’écriture : comptes rendus et disponibilités resteront dans ce navigateur.',
          'Repository {r} readable, without write access: reports and availability will stay in this browser.',
          'Repository {r} lesbar, ohne Schreibrecht: Berichte und Verfügbarkeiten bleiben in diesem Browser.',
          'Repositorio {r} legible, sin derecho de escritura: informes y disponibilidades quedarán en este navegador.'
        ], {
          r: repo.full_name
        })
      };
    } catch (e) {
      return {
        ok: false,
        message: e.message
      };
    }
  }
  /** Active le mode GitHub : réglage gardé dans ce navigateur (la page est ensuite rechargée par l'appelant : les
   *  données viennent alors du dépôt). */
  function enable(cfg) {
    localStorage.setItem(KEY, JSON.stringify({
      repo: String(cfg.repo || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, ''),
      branch: String(cfg.branch || 'main').trim() || 'main',
      token: String(cfg.token || '').trim()
    }));
  }
  /** Coupe le mode GitHub : réglage, jeton et copies effacés. */
  async function disable() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(READ_AT);
    for (const k of Object.keys(localStorage))
      if (k.startsWith(REF)) localStorage.removeItem(k);
    await idb('clear');
  }

  // ---- mode réglé : fetch des adresses data/… détourné vers le dépôt (toutes les pages, avant leurs scripts : chargé
  // par shared/kit.js) ; les autres adresses passent au réseau
  if (on()) window.fetch = (input, init) => {
    let url = '';
    try {
      url = new URL(input instanceof Request ? input.url : String(input), location.href).href;
    } catch {
      return nativeFetch(input, init);
    }
    if (!url.startsWith(DATA)) return nativeFetch(input, init);
    const rel = decodeURIComponent(url.slice(DATA.length).split(/[?#]/)[0]);
    return read(rel, {
      method: (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    });
  };
  // site web (GitHub Pages) : service worker pour le hors ligne du code de la suite ; sans effet dans l'appli iOS
  if (on() && navigator.serviceWorker && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register(new URL('sw.js', ROOT)
    .href, {
      scope: ROOT
    }).catch(() => {});

  window.GitHubData = {
    on,
    config,
    enable,
    disable,
    test,
    lastRead,
    read,
    list,
    readSync,
    getText,
    put,
    remove,
    ROOT
  };
})();
