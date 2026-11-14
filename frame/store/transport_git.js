(() => {
  'use strict';
  // Base commune des transports distants de la couche de données (transport_github.js, transport_gitlab.js ; refonte R-C6,
  // § 10.33) : ce qui était écrit deux fois, côte à côte. Chaque transport n'y ajoute que ses adresses, son en-tête
  // d'accès, la lecture de ses refus et sa façon de poser un commit.
  //   · call = FD.git.caller({ headers, ok, refuse }) : appel de l'API, jamais mis en cache, JAMAIS une redirection
  //     suivie (Fetch ne retire qu'Authorization d'une redirection vers une autre origine, pas un autre en-tête : le jeton
  //     n'est jamais recopié vers un autre hôte) ; erreur réseau → err.offline ; refus → refuse(réponse, corps JSON,
  //     options) = { message, conflict }, rendu en erreur avec err.status ;
  //   · FD.git.publish(groupes, options, { prepare, land }) : la boucle de publication (frame/INTEGRATION.md § 15.2) —
  //     un commit par groupe, dans l'ordre, annulation, 100 Mo au plus par fichier, progression, échec dit avec le rang
  //     du groupe ; prepare(fichier, blob) → l'entrée du transport, land(entrées, retirés, message) → { commit, removed } ;
  //   · FD.git.b64(blob) : contenu d'un Blob en base64.
  const FD = window.FrameData;
  if (!FD || FD.git) return;
  const MAX = 100 * 1024 * 1024;

  function caller({
    headers,
    ok = r => r.ok,
    refuse
  }) {
    return async function call(url, opts = {}) {
      const {
        method = 'GET', body
      } = opts;
      let r;
      try {
        r = await fetch(url, {
          method,
          cache: 'no-store',
          redirect: 'error',
          ...(opts.signal ? {
            signal: opts.signal
          } : {}),
          headers: {
            ...headers(opts),
            ...(body ? {
              'Content-Type': 'application/json'
            } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        if (e?.name === 'AbortError') throw Object.assign(new Error(
          'aborted'), { // abandonnée par celui qui la demandait (SOG-0349) : ni hors ligne, ni injoignable
          aborted: true
        });
        // « hors ligne » seulement quand le navigateur le dit ; en ligne, une exception de fetch (réseau, CORS, DNS, redirection
        // refusée, adresse illisible) est une erreur nommée, avec l'hôte seul, jamais l'adresse entière (31 oct. 2026 : le
        // téléphone disait « offline » en ligne depuis la veille)
        if (navigator.onLine === false) throw Object.assign(new Error('offline'), {
          offline: true
        });
        let host = '';
        try {
          host = new URL(url).host;
        } catch {
          /* adresse illisible */
        }
        throw Object.assign(new Error(`unreachable: ${host || '?'} (${e?.name || 'Error'})`), {
          unreachable: true,
          host
        });
      }
      if (ok(r)) return r;
      const lim = limitOf(r),
        why = refuse(r, await r.json().catch(() => ({})), opts);
      throw Object.assign(new Error(why.message), {
        status: r.status,
        conflict: why.conflict,
        ...(lim ? {
          rateLimited: true, // SOG-0337 : un 429 (ou le 403 de GitHub à quota épuisé) n'est pas un refus : le dépôt demande d'attendre
          retryAfter: lim.secs, // en secondes, ou null quand la page ne peut pas lire l'en-tête (CORS)
          limitInfo: lim
        } : {})
      });
    };
  }

  /** La limite de requêtes d'une réponse (SOG-0337) : { secs, source, remaining, limit } ou null. 429, ou 403 avec un quota GitHub épuisé. secs : le temps à attendre d'après
   *  Retry-After (secondes ou date) ou, à défaut, l'instant de remise à zéro (RateLimit-Reset, x-ratelimit-reset) ; null quand aucun en-tête n'est lisible depuis la page. */
  function limitOf(r) {
    const h = n => {
      try {
        return r.headers.get(n);
      } catch {
        return null;
      }
    };
    if (!(r.status === 429 || (r.status === 403 && h('x-ratelimit-remaining') === '0'))) return null;
    let secs = null,
      source = '';
    const ra = h('retry-after');
    if (ra) {
      const n = Number(ra),
        d = Date.parse(ra);
      if (Number.isFinite(n) && n >= 0) secs = n;
      else if (Number.isFinite(d)) secs = Math.max(0, (d - Date.now()) / 1000);
      if (secs !== null) source = 'retry-after';
    }
    if (secs === null) {
      const reset = Number(h('ratelimit-reset') ?? h('x-ratelimit-reset'));
      if (Number.isFinite(reset) && reset > 0) {
        secs = reset > 1e9 ? Math.max(0, reset - Date.now() / 1000) : reset; // un instant (epoch) ou un délai
        source = 'reset';
      }
    }
    return {
      secs,
      source,
      remaining: h('ratelimit-remaining') ?? h('x-ratelimit-remaining'),
      limit: h('ratelimit-limit') ?? h('x-ratelimit-limit')
    };
  }

  /** Garde d'un appel d'API (SOG-0337, « GitLab 429 sur le téléphone » ; SOG-0349) :
   *  (1) CADENCE : au plus `perMin` requêtes par fenêtre glissante (80 la minute : sous les 100 des offres gratuites) ; les demandes qui attendent leur tour font une FILE À PRIORITÉ : la plus
   *      haute `opts.priority` d'abord (l'écran en vue avant l'arbre de fond), et à priorité égale la DERNIÈRE demandée d'abord (ce que l'utilisateur regarde maintenant) ;
   *  (2) une LIMITE reconnue (429) n'est ni une erreur ni un recommencement : la garde se MET EN PAUSE pour toutes les demandes (Retry-After s'il est lisible, sinon 60 s doublé, entre 5 et 300 s : personne
   *      ne frappe pendant la pause) puis la demande refaite REPREND, trois fois au plus avant de lever l'erreur (err.rateLimited) — `opts.patient` (une lecture de fichier qu'on attend) ne lève jamais :
   *      elle attend, dite ; opts.suspectLimit : une réponse illisible (le 429 de GitLab peut venir sans en-tête CORS) en plein milieu d'une lecture déjà entamée est traitée de même ;
   *  (3) `opts.signal` : une demande qui n'est PAS ENCORE PARTIE peut sortir de la file (elle ne prend ni place ni part de la cadence) ; `opts.onStart` est appelé quand elle part vraiment.
   *  Chaque pause est DITE : waiting() { until, secs, status } tant qu'elle dure, onLimit() à chaque changement, queued() (demandes en file et pause), info (pauses, secondes, dernière limite lue). */
  function guard(call) {
    const stamps = [],
      queue = [], // { prio, seq, signal, go, stop }
      pacing = {
        perMin: 80,
        windowMs: 60000,
        gapMs: 0, // pause entre deux pages d'une lecture d'arbre (le transport la pose)
        retries: 3,
        minWait: 5,
        maxWait: 300,
        defWait: 60
      },
      info = {
        waits: 0,
        waitedS: 0,
        last: null
      };
    let pause = null, // { until, secs, status } : la pause de toutes les demandes
      seq = 0,
      pump = 0, // la minuterie qui réveille la file
      endTimer = 0;
    const aborted = () => Object.assign(new Error('aborted'), {
      aborted: true
    });
    /** Une attente que l'abandon (opts.signal) interrompt. */
    const sleep = (ms, signal) => new Promise((ok, no) => {
      if (signal?.aborted) return no(aborted());
      const t = setTimeout(() => {
        signal?.removeEventListener('abort', off);
        ok();
      }, ms);
      const off = () => {
        clearTimeout(t);
        no(aborted());
      };
      signal?.addEventListener('abort', off, {
        once: true
      });
    });
    const tell = () => {
      try {
        api.onLimit?.();
      } catch {
        /* un observateur ne casse pas l'appel */
      }
    };
    /** La file : donne leur tour, tant que la cadence et la pause le permettent, aux demandes dans l'ordre (priorité, puis la dernière demandée). */
    const run = () => {
      clearTimeout(pump);
      pump = 0;
      const t = Date.now();
      while (stamps.length && stamps[0] <= t - pacing.windowMs) stamps.shift();
      if (pause && pause.until <= t) {
        pause = null;
        tell(); // la pause est finie : la bande et l'état le savent tout de suite
      }
      while (queue.length && !pause && stamps.length < pacing.perMin) {
        let b = 0;
        for (let k = 1; k < queue.length; k++)
          if (queue[k].prio > queue[b].prio || (queue[k].prio === queue[b].prio && queue[k].seq > queue[b].seq)) b = k;
        const w = queue.splice(b, 1)[0];
        stamps.push(Date.now());
        w.go();
      }
      if (queue.length) {
        const wait = pause ? pause.until - t : stamps[0] + pacing.windowMs - t;
        pump = setTimeout(run, Math.max(5, Math.min(5000, wait + 5)));
      }
    };
    /** Une place dans la file : résolue quand la demande peut partir (sa part de cadence est prise à cet instant), rejetée (aborted) si elle est abandonnée avant. */
    const acquire = opts => new Promise((ok, no) => {
      if (opts.signal?.aborted) return no(aborted());
      const w = {
        prio: Number(opts.priority) || 1,
        seq: ++seq,
        signal: opts.signal,
        go: () => {
          opts.signal?.removeEventListener('abort', w.stop);
          ok();
        },
        stop: () => {
          const k = queue.indexOf(w);
          if (k >= 0) queue.splice(k, 1);
          no(aborted());
        }
      };
      opts.signal?.addEventListener('abort', w.stop, {
        once: true
      });
      queue.push(w);
      run();
    });
    async function guarded(url, opts = {}) {
      for (let attempt = 0;; attempt++) {
        await acquire(opts);
        try {
          opts.onStart?.();
          return await call(url, opts);
        } catch (e) {
          if (!(e?.rateLimited || (opts.suspectLimit && e?.unreachable))) throw e;
          info.last = {
            at: new Date().toISOString(),
            status: e.status || 0,
            kind: e.rateLimited ? 'limit' : 'unreadable',
            retryAfterS: e.retryAfter ?? null,
            source: e.limitInfo?.source || '',
            remaining: e.limitInfo?.remaining ?? null,
            limit: e.limitInfo?.limit ?? null
          };
          if (attempt >= pacing.retries && !opts.patient)
            throw e; // une lecture PATIENTE ne rend jamais « absent » à cause d'une limite : elle attend, dite
          const secs = Math.min(pacing.maxWait, Math.max(pacing.minWait, Math.ceil(e.retryAfter ?? pacing.defWait * 2 ** Math.min(
              attempt, 6)))),
            until = Date.now() + secs * 1000;
          if (!pause || until > pause
            .until) { // la pause est celle de TOUTES les demandes ; une pause déjà plus longue n'est pas raccourcie
            if (!pause) info.waits++;
            info.waitedS += pause ? Math.max(0, Math.ceil((until - pause.until) / 1000)) : secs;
            pause = {
              until,
              secs,
              status: e.status || 0
            };
            clearTimeout(endTimer);
            endTimer = setTimeout(() => {
              if (pause && pause.until <= Date.now()) pause = null;
              tell();
              run();
            }, secs * 1000 + 5);
            tell();
          }
          await sleep(Math.max(0, pause.until - Date.now()), opts.signal);
        }
      }
    }
    const api = {
      call: guarded,
      pacing,
      info,
      sleep,
      onLimit: null,
      /** La pause en cours : { until, secs, status } ou null. */
      waiting: () => pause && pause.until > Date.now() ? pause : null,
      /** Les demandes qui attendent leur tour (cadence ou pause). */
      queued: () => queue.length
    };
    return api;
  }

  /** Publication de fichiers générés : un commit par groupe [{ name, files: [{ path, text | blob }], removed: [path],
   *  message }], dans l'ordre ; from : rang du premier groupe (reprise après un échec). Rend { ok: true, groups: [{ name,
   *  commit, files, removed, bytes }] } ou { ok: false, at (rang du groupe en échec), group, conflict | offline |
   *  cancelled | tooBig | status, message, groups (ceux faits) }. */
  async function publish(groups, {
    onProgress,
    signal,
    from = 0
  } = {}, {
    prepare,
    land
  }) {
    const done = [],
      list = [].concat(groups || []);
    for (let gi = Math.max(0, from | 0); gi < list.length; gi++) {
      const g = list[gi] || {},
        files = [].concat(g.files || []),
        removed = [].concat(g.removed || []);
      const fail = (e, extra = {}) => ({
        ok: false,
        at: gi,
        group: g.name || '',
        groups: done,
        message: String(e?.message || e || ''),
        ...(e?.offline ? {
          offline: true
        } : {}),
        ...(e?.conflict ? {
          conflict: true
        } : {}),
        ...(e?.status && !e.conflict ? {
          status: e.status
        } : {}),
        ...extra
      });
      try {
        let bytes = 0;
        const items = [];
        for (const [k, f] of files.entries()) {
          if (signal?.aborted) return fail('cancelled', {
            cancelled: true
          });
          const blob = f.blob instanceof Blob ? f.blob : null,
            size = blob ? blob.size : new TextEncoder().encode(String(f.text ?? '')).length;
          if (size > MAX) return fail(`${f.path}: over 100 MB`, {
            tooBig: f.path
          });
          items.push(await prepare(f, blob));
          bytes += size;
          onProgress?.({
            group: g.name || '',
            index: gi,
            groups: list.length,
            files: k + 1,
            total: files.length,
            bytes
          });
        }
        const r = await land(items, removed, g.message || `Publication ${g.name || ''}`.trim());
        done.push({
          name: g.name || '',
          commit: r.commit,
          files: items.length,
          removed: r.removed,
          bytes
        });
      } catch (e) {
        return fail(e);
      }
    }
    return {
      ok: true,
      groups: done
    };
  }

  /** LE plafond d'une lecture de fichier du dépôt, pour tout le cadre (SOG-0358) : 32 Mio, tranché par l'ergonome — c'est le téléphone que la garde protège (un fichier lu pèse bien plus en mémoire : octets, texte UTF-16, JSON analysé) ;
   *  le plus gros fichier légitime d'aujourd'hui fait 14,5 Mo (les espaces aériens d'une zone) : un fichier de base qui approche 16 Mio doit être DÉCOUPÉ, pas toléré. */
  const MAX_READ = 32 * 1024 * 1024;
  /** Les octets d'une réponse, PLAFONNÉS (Sécurisation, classe de défaut ouverte : n'importe quel pilote peut commiter un fichier énorme) : la taille annoncée (Content-Length) au-delà du plafond refuse sans
   *  rien lire ; sinon les octets sont comptés EN LISANT (la réponse en flux : au-delà du plafond la lecture s'arrête et le flux est annulé, la mémoire ne suit jamais). Rend un ArrayBuffer, ou lève
   *  err.tooBig. Le plafond est celui de la politique du fichier (frame_data.js : une base compilée plus haut qu'un document de pilote). */
  async function bounded(r, want) {
    const max = Math.min(Number(want) > 0 ? Number(want) : MAX_READ,
      MAX_READ); // UNE valeur du cadre ; un module ne peut que l'abaisser (SOG-0358)
    const tooBig = n => Object.assign(new Error(`over ${max} bytes${n ? ` (${n} read)` : ''}`), {
      tooBig: true,
      max
    });
    const len = Number(r.headers?.get?.('content-length'));
    if (Number.isFinite(len) && len > max) {
      try {
        await r.body?.cancel?.();
      } catch {
        /* le flux est déjà fermé */
      }
      throw tooBig(len);
    }
    if (!r.body?.getReader) {
      const b = await r.arrayBuffer();
      if (b.byteLength > max) throw tooBig(b.byteLength);
      return b;
    }
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
      if (n > max) {
        try {
          await rd.cancel();
        } catch {
          /* rien à annuler */
        }
        throw tooBig(n);
      }
      chunks.push(value);
    }
    const out = new Uint8Array(n);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.byteLength;
    }
    return out.buffer;
  }

  /** Contenu d'un Blob en base64. */
  async function b64(blob) {
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  FD.git = {
    caller,
    guard,
    limitOf,
    bounded,
    MAX_READ,
    publish,
    b64
  };
})();
