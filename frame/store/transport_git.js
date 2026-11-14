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
          headers: {
            ...headers(opts),
            ...(body ? {
              'Content-Type': 'application/json'
            } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) {
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

  /** Garde d'un appel d'API (SOG-0337, « GitLab 429 sur le téléphone ») : (1) CADENCE : au plus `perMin` requêtes par minute glissante (80 : sous les 100 par minute des offres gratuites), les
   *  suivantes attendent leur tour ; (2) une LIMITE reconnue (429) n'est ni une erreur ni un recommencement : le transport ATTEND (Retry-After s'il est lisible, sinon 60 s, doublé à chaque fois,
   *  entre 5 et 300 s) puis REPREND le même appel, trois fois au plus avant de lever l'erreur (err.rateLimited) ; opts.suspectLimit : une réponse illisible (le 429 de GitLab peut venir sans
   *  en-tête CORS : le navigateur ne dit alors que « réseau ») en plein milieu d'une lecture déjà entamée est traitée de même. Chaque attente est DITE : waiting() { until, secs, status } tant
   *  qu'elle dure, onLimit() à chaque changement, info (attentes, secondes, dernière limite lue) pour le diagnostic. */
  function guard(call) {
    const stamps = [],
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
    let waiting = null;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const tell = () => {
      try {
        api.onLimit?.();
      } catch {
        /* un observateur ne casse pas l'appel */
      }
    };
    async function guarded(url, opts = {}) {
      for (let attempt = 0;; attempt++) {
        for (;;) { // la cadence
          const t = Date.now();
          while (stamps.length && stamps[0] <= t - pacing.windowMs) stamps.shift();
          if (stamps.length < pacing.perMin) break;
          await sleep(Math.min(5000, stamps[0] + pacing.windowMs - t + 5));
        }
        stamps.push(Date.now());
        try {
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
          if (attempt >= pacing.retries) throw e;
          const secs = Math.min(pacing.maxWait, Math.max(pacing.minWait, Math.ceil(e.retryAfter ?? pacing.defWait * 2 ** attempt)));
          waiting = {
            until: Date.now() + secs * 1000,
            secs,
            status: e.status || 0
          };
          info.waits++;
          info.waitedS += secs;
          tell();
          await sleep(secs * 1000);
          waiting = null;
          tell();
        }
      }
    }
    const api = {
      call: guarded,
      pacing,
      info,
      sleep,
      onLimit: null,
      /** L'attente en cours : { until, secs, status } ou null. */
      waiting: () => waiting && waiting.until > Date.now() ? waiting : null
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
    publish,
    b64
  };
})();
