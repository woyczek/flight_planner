(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE, SPEC § « Laboratoire ») : les mesures de la PAGE (le fil principal) —
  // l'appareil, le test d'une adresse (fetch cronométré et son diagnostic), la lecture d'un fichier du sélecteur, la chaîne
  // de V2 sur le ZIP du SIA (mode a : zip_store → XML → sia_base, DOMParser compris), les deux modes du Worker (b, c : voir
  // lab_run.js), les chaînes des autres fichiers (CIFP : le seul enregistrement « PA » ; JSON ; HTML ; PDF ; binaire), la
  // trace « lab-run-started » qui dit au prochain chargement qu'un essai n'a pas fini (onglet tué), et l'essai de
  // publication par le transport GitHub du cadre (jamais le jeton : le lab ne reçoit que le transport). Rien n'est écrit
  // ailleurs ; le rapport est tenu par lab_report.js.
  const G = window;
  const now = () => performance.now();
  const BASE = (document.currentScript && document.currentScript.src) || location.href;
  const url = p => new URL(p, BASE).href;
  const GUARD = 'sogLab:run-started';
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* stockage fermé : la détection d'un plantage est alors perdue */
      }
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* idem */
      }
    }
  };

  // ------------------------------------------------------------------------------------------ appareil et garde
  /** L'appareil, tel que le navigateur le dit (rien d'inventé : null quand il ne le dit pas). */
  /** Partage de fichiers (Web Share niveau 2) : ce que cet appareil permet, mesuré avec deux petits fichiers sans contenu. */
  function webShare() {
    try {
      const can = typeof navigator.canShare === 'function',
        f = (n, t) => new File(['{}'], n, {
          type: t
        });
      return {
        share: typeof navigator.share === 'function',
        canShare: can,
        json: can ? !!navigator.canShare({
          files: [f('test.json', 'application/json')]
        }) : false,
        geojson: can ? !!navigator.canShare({
          files: [f('test.geojson', 'application/geo+json')]
        }) : false
      };
    } catch (e) {
      return {
        error: String(e && e.message || e)
      };
    }
  }

  function device() {
    const mem = G.performance && performance.memory;
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform || '',
      deviceMemoryGB: navigator.deviceMemory ?? null,
      cores: navigator.hardwareConcurrency ?? null,
      online: navigator.onLine,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${innerWidth}x${innerHeight}`,
      pixelRatio: devicePixelRatio,
      standalone: !!(navigator.standalone || (matchMedia && matchMedia('(display-mode: standalone)').matches)),
      secureContext: !!G.isSecureContext,
      crossOriginIsolated: !!G.crossOriginIsolated,
      heapApi: mem ? 'performance.memory' : (typeof performance.measureUserAgentSpecificMemory === 'function' ?
        'measureUserAgentSpecificMemory' :
        'none'),
      heapLimitMB: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
      decompressionStream: typeof G.DecompressionStream !== 'undefined',
      worker: typeof Worker !== 'undefined',
      domParser: typeof DOMParser !== 'undefined',
      lang: navigator.language,
      share: webShare(),
      connection: navigator.connection ? {
        type: navigator.connection.effectiveType || null,
        downlinkMbps: navigator.connection.downlink ?? null,
        saveData: !!navigator.connection.saveData
      } : null
    };
  }
  /** Stockage du navigateur (quota et usage) quand il le dit ; {} sinon. */
  async function storage() {
    try {
      const e = await navigator.storage.estimate();
      return {
        usageMB: Math.round(e.usage / 1048576),
        quotaMB: Math.round(e.quota / 1048576)
      };
    } catch {
      return {};
    }
  }
  /** Mémoire du moment : { heapMB, limitMB } (performance.memory) puis, si le navigateur la propose, { uaMB }. */
  async function memory() {
    const out = {},
      m = performance.memory;
    if (m) {
      out.heapMB = +(m.usedJSHeapSize / 1048576).toFixed(1);
      out.limitMB = Math.round(m.jsHeapSizeLimit / 1048576);
    }
    if (typeof performance.measureUserAgentSpecificMemory === 'function' && G.crossOriginIsolated) try {
      out.uaMB = +((await performance.measureUserAgentSpecificMemory()).bytes / 1048576).toFixed(1);
    } catch {
      /* refusée : page non isolée ou mesure déjà en cours */
    }
    return out;
  }
  /** La trace de garde : posée avant un essai, mise à jour à chaque étape, effacée à sa fin. check() rend celle d'un essai
   *  qui n'a pas fini (onglet tué par le système, page rechargée) et l'efface. */
  const guard = {
    start(label) {
      store.set(GUARD, JSON.stringify({
        at: new Date().toISOString(),
        label,
        step: 'start'
      }));
    },
    step(step) {
      try {
        const g = JSON.parse(store.get(GUARD) || 'null');
        if (g) store.set(GUARD, JSON.stringify({
          ...g,
          step
        }));
      } catch {
        /* trace illisible : ignorée */
      }
    },
    end() {
      store.del(GUARD);
    },
    check() {
      let g = null;
      try {
        g = JSON.parse(store.get(GUARD) || 'null');
      } catch {
        /* illisible */
      }
      store.del(GUARD);
      return g;
    }
  };

  // ------------------------------------------------------------------------------------------ une adresse
  /** Teste une adresse depuis la page : fetch cronométré (cors, sans cookie), lecture du corps jusqu'à `cap` octets (0 = tout),
   *  diagnostic de l'échec : 'csp' (la politique de la page), 'offline', 'cors' (le serveur répond, sans autorisation : une
   *  requête no-cors aboutit), 'unreachable' (rien ne répond), 'timeout', 'aborted'. Rend un objet, ne lève jamais.
   *  { url, ok, status, statusText, type, length (en-tête), bytes, truncated, ttfbMs, ms, diag, error, blob (si keep et complet) }. */
  async function probe(u, {
    cap = 0,
    keep = false,
    signal,
    timeoutMs = 120000,
    onProgress,
    method = 'GET', // POST : le formulaire de connexion d'EAD Basic, champs vides (jamais d'identifiant)
    body,
    headers
  } = {}) {
    const t0 = now(),
      ctl = new AbortController(),
      out = {
        url: u,
        method,
        ok: false
      };
    let violation = null,
      timedOut = false;
    const onv = e => {
      if (e.violatedDirective && /^connect-src/.test(e.violatedDirective) && String(e.blockedURI || '').startsWith(new URL(u).origin))
        violation = e;
    };
    document.addEventListener('securitypolicyviolation', onv);
    const timer = setTimeout(() => (timedOut = true, ctl.abort()), timeoutMs);
    signal?.addEventListener('abort', () => ctl.abort(), {
      once: true
    });
    try {
      const r = await fetch(u, {
        method,
        body,
        headers,
        cache: 'no-store',
        credentials: 'omit',
        signal: ctl.signal
      });
      out.status = r.status;
      out.statusText = r.statusText;
      out.type = r.headers.get('content-type') || '';
      out.length = r.headers.get('content-length') ? +r.headers.get('content-length') : null;
      out.lastModified = r.headers.get('last-modified') || '';
      out.ttfbMs = Math.round(now() - t0);
      out.redirected = r.redirected;
      const rd = r.body.getReader(),
        chunks = [];
      let n = 0;
      for (;;) {
        const {
          done,
          value
        } = await rd.read();
        if (done) break;
        n += value.byteLength;
        if (keep) chunks.push(value);
        onProgress?.(n, out.length);
        if (cap && n >= cap) {
          out.truncated = !(out.length != null && n >= out.length); // la limite tombe pile sur la fin : le corps est entier
          if (out.truncated) ctl.abort();
          break;
        }
      }
      out.bytes = n;
      out.ms = Math.round(now() - t0);
      out.ok = r.ok;
      if (keep && !out.truncated) out.blob = new Blob(chunks, {
        type: out.type
      });
      if (!r.ok) out.diag = 'http';
    } catch (e) {
      out.ms = Math.round(now() - t0);
      if (out.truncated) { // coupure voulue par la limite : un succès partiel
        out.ok = true;
        out.bytes = out.bytes || 0;
      } else if (timedOut) out.diag = 'timeout';
      else if (signal?.aborted) out.diag = 'aborted';
      else {
        out.error = String(e && e.message || e);
        if (violation) out.diag = 'csp';
        else if (!navigator.onLine) out.diag = 'offline';
        else {
          // un fetch no-cors aboutit dès les en-têtes si le serveur répond : alors c'est l'absence d'autorisation CORS
          const c2 = new AbortController();
          try {
            await Promise.race([fetch(u, {
              method,
              body,
              headers,
              mode: 'no-cors',
              cache: 'no-store',
              credentials: 'omit',
              signal: c2.signal
            }), new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 15000))]);
            out.diag = 'cors';
          } catch {
            out.diag = 'unreachable';
          }
          c2.abort();
        }
      }
    } finally {
      clearTimeout(timer);
      document.removeEventListener('securitypolicyviolation', onv);
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------ un fichier du sélecteur
  /** Temps de lecture d'un File : en flux (tranches jetées) puis en ArrayBuffer ; { name, size, streamMs, bufferMs }. */
  async function readFile(file) {
    const out = {
      name: file.name,
      size: file.size,
      type: file.type
    };
    let t0 = now();
    const rd = file.stream().getReader();
    let n = 0;
    for (;;) {
      const {
        done,
        value
      } = await rd.read();
      if (done) break;
      n += value.byteLength;
    }
    out.streamMs = Math.round(now() - t0);
    t0 = now();
    try {
      out.bufferBytes = (await file.arrayBuffer()).byteLength;
      out.bufferMs = Math.round(now() - t0);
    } catch (e) {
      out.bufferError = String(e && e.message || e);
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------ scripts de V2 (mode a)
  const loaded = new Map;
  const load = src => loaded.get(src) || loaded.set(src, new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url(src);
    s.onload = res;
    s.onerror = () => {
      loaded.delete(src);
      s.remove();
      rej(new Error(`script ${src}`));
    };
    document.head.append(s);
  })).get(src);
  async function needV2() {
    if (!G.ZipStore) await load('../../shared/zip_store.js?v=0');
    if (!G.SiaAero) await load('../../shared/carto/aero_symbols.js?v=0');
    if (!G.SiaBase) {
      // sia_base.js prend window.RepositoryKit.esc en tête de fichier (shared/kit.js, que le cadre ne charge pas : ce fichier
      // ajoute d'autres scripts et ouvre des bases) : une doublure d'une ligne le temps du chargement, puis retirée
      const stub = !G.RepositoryKit;
      if (stub) G.RepositoryKit = {
        esc: s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
      };
      try {
        await load('../../shared/sia_base.js?v=0');
      } finally {
        if (stub) delete G.RepositoryKit;
      }
    }
    if (!G.AeroLabXml) await load('lab_xml.js?v=0');
    if (!G.AeroLabZip) await load('lab_zip.js?v=0');
    if (!G.AeroLabRun) await load('lab_run.js?v=0');
  }
  /** Le seul lecteur de ZIP en flux et le suivi des étapes (CIFP, ZIP quelconque) : sans les scripts de V2. */
  async function needZip() {
    if (!G.AeroLabZip) await load('lab_zip.js?v=0');
    if (!G.AeroLabRun) await load('lab_run.js?v=0');
  }

  /** Mode a : la chaîne de V2 sur le fil principal (ZipStore → texte → parseXmlSia* → DOMParser sur l'AIXM → SiaAero → découpage
   *  par sorte de SiaBase.splitZones, une zone). Le tas n'est observé qu'entre les étapes (une étape synchrone le bloque :
   *  le pic dans le DOMParser n'est pas visible, le chiffre est un minorant). */
  async function modeA(file, {
    emit
  } = {}) {
    await needV2();
    const T = G.AeroLabRun.tracker(emit),
      res = {};
    const entries = await T.step('zip', () => ZipStore.read(file), {
      bytes: file.size
    });
    let aero = null,
      airspaces = [],
      vrp = [],
      aixmAir = [],
      obstacleMax = {},
      cycle = '';
    for (const e of entries) {
      const sia = G.AeroLabRun.isSia(e.name),
        aixm = G.AeroLabRun.isAixm(e.name);
      if (!sia && !aixm) continue;
      const k = sia ? 'sia' : 'aixm';
      const bytes = await T.step(`inflate ${k}`, () => e.bytes(), {
        bytes: e.size
      });
      const text = await T.step(`decode ${k}`, async () => new TextDecoder(sia ? 'iso-8859-1' : 'utf-8').decode(bytes), {
        chars: e.size
      });
      cycle = cycle || (/\d{4}-\d{2}-\d{2}/.exec(e.name) || [])[0] || '';
      if (sia) {
        airspaces = await T.step('parse sia: airspaces (strings)', async () => SiaBase.parseXmlSiaAirspaces(text));
        vrp = await T.step('parse sia: vfr points (regex)', async () => SiaBase.parseXmlSiaVfrPoints(text));
      } else {
        const doc = await T.step('parse aixm: DOMParser', async () => {
          const d = new DOMParser().parseFromString(text, 'application/xml');
          if (d.querySelector('parsererror')) throw new Error('AIXM 4.5 invalid');
          return d;
        });
        aixmAir = await T.step('parse aixm: airspaces (DOM)', async () => SiaBase.parseAixmAirspaces(doc));
        obstacleMax = await T.step('parse aixm: obstacle cells', async () => SiaBase.parseAixmObstacles(text));
        aero = await T.step('parse aixm: aerodromes, navaids, points (SiaAero)', async () => SiaAero.parseAixm(text));
      }
      await new Promise(r => setTimeout(r, 0));
    }
    const sizes = await T.step('compile (split by kind, JSON)', async () => {
      const b = {
          airspaces: airspaces.filter(a => !new Set(['R', 'D', 'P', 'CTR', 'TMA', 'CTA', 'TRA', 'SUR', 'PRN']).has(a.type))
            .concat(aixmAir),
          aero: {
            ...aero,
            vrp
          },
          obstacleMax,
          parserVersion: SiaBase.VERSION
        },
        part = SiaBase.splitZones(b, ['fr'], null, {}).fr,
        enc = new TextEncoder(),
        n = v => enc.encode(JSON.stringify(v)).length,
        o = {
          airspaces: n(part.airspaces),
          obstaclemax: n(part.obstacleMax)
        };
      for (const [kind, v] of Object.entries(part.aero)) o[kind] = n(v);
      return o;
    });
    const nav = (aero && aero.navaids) || [];
    return {
      mode: 'a',
      cycle,
      steps: T.steps,
      peak: T.peak(),
      sizes,
      summary: {
        airspacesSia: airspaces.length,
        ringsSia: airspaces.reduce((n, a) => n + a.rings.length, 0),
        pointsSia: airspaces.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length, 0), 0),
        vrp: vrp.length,
        airspacesAixm: aixmAir.length,
        pointsAixm: aixmAir.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length, 0), 0),
        aerodromes: aero ? aero.aerodromes.length : 0,
        navaids: nav.length,
        navaidKinds: nav.reduce((o, v) => (o[v.kind] = (o[v.kind] || 0) + 1, o), {}),
        points: aero && aero.points ? aero.points.length : 0,
        obstacles: aero && aero.obstacles ? aero.obstacles.length : 0,
        obstacleCells: Object.keys(obstacleMax).length,
        withIcao: aero ? aero.aerodromes.filter(a => a.icao).length : 0
      }
    };
  }

  /** Modes b et c dans un Worker (lab_worker.js) ; `file` est transmis par structured clone (un File n'est pas copié : c'est une
   *  référence). Rend le résultat de lab_run.js ; `emit` reçoit les étapes. */
  function modeWorker(mode, file, {
    emit,
    signal
  } = {}) {
    return new Promise((resolve, reject) => {
      let w;
      try {
        w = new Worker(url('lab_worker.js?v=0'));
      } catch (e) {
        return reject(new Error(`Worker: ${e.message || e}`));
      }
      const done = fn => v => (w.terminate(), fn(v));
      const ok = done(resolve),
        ko = done(reject);
      signal?.addEventListener('abort', () => ko(new DOMException('aborted', 'AbortError')), {
        once: true
      });
      w.onmessage = ev => {
        const m = ev.data || {};
        if (m.type === 'done') ok(m.result);
        else if (m.type === 'error') ko(new Error(m.message));
        else emit?.(m);
      };
      w.onerror = ev => ko(new Error(`Worker error: ${ev.message || 'unknown'}`));
      w.onmessageerror = () => ko(new Error('Worker message error'));
      w.postMessage({
        cmd: 'run',
        mode,
        file
      });
    });
  }

  // ------------------------------------------------------------------------------------------ les autres fichiers
  /** CIFP de la FAA : ouvre le ZIP, lit FAACIFP18 en flux, compte les enregistrements (132 colonnes) et ne lit en entier que
   *  le « PA » (point de référence d'aérodrome : section P, sous-section A en colonne 13). */
  async function chainCifp(blob, {
    emit
  } = {}) {
    await needZip();
    const T = G.AeroLabRun.tracker(emit);
    const entries = await T.step('zip', () => AeroLabZip.entries(blob), {
      bytes: blob.size
    });
    const e = entries.find(x => /FAACIFP18/i.test(x.name)) || entries.sort((a, b) => b.size - a.size)[0];
    if (!e) throw new Error('no CIFP file in the archive');
    let records = 0,
      airports = [],
      bytes = 0,
      cycle = '',
      sections = {};
    await T.step('stream + scan records', async () => {
      const rd = (await AeroLabZip.stream(blob, e)).getReader(),
        dec = new TextDecoder('iso-8859-1');
      let tail = '',
        next = 4 << 20;
      const COORD = /[NS]\d{8}[EW]\d{9}/;
      for (;;) {
        const {
          done,
          value
        } = await rd.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes >= next) {
          next += 4 << 20;
          T.sample();
        }
        const lines = (tail + dec.decode(value, {
          stream: true
        })).split('\n');
        tail = lines.pop();
        for (let l of lines) {
          if (l.charCodeAt(l.length - 1) === 13) l = l.slice(0, -1);
          if (l.startsWith('HDR01')) { // l'en-tête porte le cycle ; ce n'est pas un enregistrement
            cycle = (/(\d{4})\s{2}\d\d-[A-Z]{3}-\d{4}/.exec(l) || [])[1] || cycle;
            continue;
          }
          if (l.length < 100) continue;
          records++;
          const s = l.slice(4, 6);
          sections[s] = (sections[s] || 0) + 1;
          if (l[4] === 'P' && l[5] === ' ' && l[12] === 'A') { // « PA » : point de référence d'aérodrome
            const m = COORD.exec(l.slice(32, 51));
            if (m) {
              const c = m[0],
                lat = +c.slice(1, 3) + +c.slice(3, 5) / 60 + +c.slice(5, 9) / 100 / 3600,
                lon = +c.slice(10, 13) + +c.slice(13, 15) / 60 + +c.slice(15, 19) / 100 / 3600;
              airports.push({
                icao: l.slice(6, 10).trim(),
                name: l.slice(93, 123).trim(),
                lat: c[0] === 'S' ? -lat : lat,
                lon: c[9] === 'W' ? -lon : lon
              });
            }
          }
        }
      }
    }, {
      bytes: e.size
    });
    return {
      entry: e.name,
      cycle,
      records,
      airports: airports.length,
      sample: airports.slice(0, 3).map(a => a.icao).join(' '),
      topSections: Object.entries(sections).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(' '),
      steps: T.steps,
      peak: T.peak(),
      inflatedBytes: bytes
    };
  }
  /** JSON / GeoJSON : lecture (texte puis JSON.parse), forme et nombre d'objets. */
  async function chainJson(blob) {
    const t0 = now(),
      text = await blob.text(),
      t1 = now();
    const v = JSON.parse(text),
      t2 = now();
    const shape = Array.isArray(v) ? `array[${v.length}]` : v && v.type === 'FeatureCollection' ? `FeatureCollection[${(v.features || []).length}]` :
      `object{${Object.keys(v || {}).slice(0, 6).join(',')}}`;
    return {
      readMs: Math.round(t1 - t0),
      parseMs: Math.round(t2 - t1),
      shape,
      chars: text.length
    };
  }
  /** HTML : titre, nombre de liens et de liens PDF. Un PDF des tables de codage n'est pas lisible ici sans pypdf. */
  async function chainHtml(blob) {
    const t0 = now(),
      text = await blob.text();
    return {
      readMs: Math.round(now() - t0),
      title: ((/<title[^>]*>([^<]*)/i.exec(text) || [])[1] || '').trim().slice(0, 80),
      links: (text.match(/href\s*=/gi) || []).length,
      pdfLinks: (text.match(/\.pdf["'?#]/gi) || []).length,
      zipLinks: (text.match(/\.zip["'?#]/gi) || []).length
    };
  }
  /** PDF ou binaire : octets magiques et taille. */
  async function chainBin(blob) {
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer()),
      s = String.fromCharCode(...head);
    return {
      magic: s.startsWith('%PDF') ? 'PDF' : s.startsWith('GRIB') ? 'GRIB' : s.startsWith('\x89PNG') ? 'PNG' : s.startsWith('PK') ?
        'ZIP' : 'unknown',
      pdfText: s.startsWith('%PDF') ?
        'not readable in the page without pypdf or pdf.js (table rows are rebuilt by pypdf on the workstation)' : ''
    };
  }
  async function chainZip(blob) {
    await needZip();
    const e = await AeroLabZip.entries(blob);
    return {
      entries: e.length,
      inflatedMB: +(e.reduce((n, x) => n + x.size, 0) / 1048576).toFixed(1),
      names: e.slice(0, 5).map(x => x.name).join(' | ')
    };
  }
  /** La chaîne d'une source sur un Blob (adresse testée ou fichier choisi) ; `chain` vient de lab_sources.js. */
  async function chainOf(chain, blob, opts) {
    if (chain === 'cifp') return chainCifp(blob, opts);
    if (chain === 'json') return chainJson(blob);
    if (chain === 'html') return chainHtml(blob);
    if (chain === 'zip' || chain === 'sia') return chainZip(blob);
    return chainBin(blob);
  }

  // ------------------------------------------------------------------------------------------ publication d'essai
  /** Un bloc de texte JSON de la taille demandée (octets), sans aucune donnée : remplissage numéroté. */
  function filler(bytes) {
    const row = '{"i":%,"pad":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-0123456789abcdef"},',
      parts = ['{"schema":1,"kind":"lab-filler","rows":['];
    let n = parts[0].length,
      i = 0;
    while (n < bytes - 8) {
      const r = row.replace('%', i++);
      parts.push(r);
      n += r.length;
    }
    parts.push('{}]}');
    return parts.join('');
  }
  /** Commit d'essai sur la branche jetable du transport réduit (`tr` : frame/store/transport_github.js, scratch) : sa tête,
   *  ou la branche créée depuis la tête de la branche principale, puis un commit de [{ path, text }] ; temps de chaque appel.
   *  Un conflit (branche avancée ou supprimée ailleurs) est repris une fois. Rend { ok, ms, bytes, branch, base, created,
   *  commit, error, status }. */
  async function publish(tr, changes, message) {
    const out = {
      ok: false,
      bytes: changes.reduce((n, c) => n + (c.text ? new TextEncoder().encode(c.text).length : 0), 0),
      files: changes.length,
      branch: tr.branch,
      base: tr.base,
      created: false
    };
    const t0 = now();
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let head = await tr.head();
        if (!head) {
          head = await tr.create();
          out.created = true;
        }
        out.headMs = Math.round(now() - t0);
        try {
          out.commit = await tr.commit(changes, message, head);
          out.ok = true;
          break;
        } catch (e) {
          if (!e.conflict || attempt) throw e;
        }
      }
    } catch (e) {
      out.error = String(e && e.message || e);
      out.status = e && e.status || null;
      out.offline = !!(e && e.offline);
    }
    out.ms = Math.round(now() - t0);
    return out;
  }
  /** Nettoyage : les fichiers d'essai de la branche jetable (ceux qu'elle a de plus que la branche principale), puis la
   *  branche supprimée ; et, en lecture seule, les fichiers `lab/essai-…` restés sur la branche principale (publiés avant le
   *  28 octobre 2026 : à purger sur le poste, frame/aerodb/INTEGRATION.md). Rend { ok, branch, deleted, listed, paths,
   *  onMain, ms, treeMs, error, status }. */
  async function clean(tr) {
    const t0 = now(),
      out = {
        ok: false,
        branch: tr.branch,
        deleted: false,
        listed: 0,
        paths: []
      },
      trial = tree => Object.keys(tree).filter(p => /^lab\/essai-/.test(p));
    try {
      const head = await tr.head();
      let main = null;
      try {
        main = await tr.baseTree();
        out.onMain = trial(main);
      } catch {
        out.onMain = null; // illisible (arbre trop grand, droits) : le rapport le dit
      }
      if (head) {
        const tree = await tr.tree(head);
        out.paths = trial(tree).filter(p => !main || main[p] !== tree[p]);
        out.listed = out.paths.length;
        out.treeMs = Math.round(now() - t0);
        out.deleted = await tr.deleteBranch();
      }
      out.ok = true;
    } catch (e) {
      out.error = String(e && e.message || e);
      out.status = e && e.status || null;
    }
    out.ms = Math.round(now() - t0);
    return out;
  }

  G.AeroLabMeasure = {
    device,
    webShare,
    storage,
    memory,
    guard,
    probe,
    readFile,
    modeA,
    modeWorker,
    chainOf,
    chainCifp,
    chainJson,
    chainHtml,
    chainBin,
    chainZip,
    filler,
    publish,
    clean,
    needV2,
    needZip
  };
})();
