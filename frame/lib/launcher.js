// V3 frame/lib (propriétaire : frame) — le lanceur du poste vu par le cadre et par les modules (frame/INTEGRATION.md § 15).
// Un seul client des routes /__setup/ du lanceur (tools/launch.py) : le cadre lui-même (Réglages, fiches Little Navmap
// d'aerodb) s'en sert avec toutes ses routes ; un module reçoit ctx.launcher, réduit à ce que son meta.launcher déclare.
//   · request(route, { method, json, text, signal }) → { status, body } (corps JSON lu, {} s'il ne l'est pas) ou null
//     (pas de réponse : réseau, lanceur arrêté, appel abandonné) ; jamais d'exception ;
//   · forModule(decl, { life }) → { info(), call, job, resume, read } : routes et préfixes de lecture déclarés seulement,
//     tout le reste refusé sans appel ({ ok: false, status: 403, refused: true, route }) ; life (AbortSignal) : le
//     démontage du module arrête les suivis de travaux en cours (le travail, lui, continue sur le lanceur : resume) ;
//   · protocole des travaux longs, fixe : POST <route> corps → { job: id } ; GET <route>?id=… → { id, state ('running' |
//     'done' | 'error' | 'cancelled'), step, done, total, unit, log, result } ; POST <route>/cancel { id } ; GET <route>
//     sans id → le travail en cours ou le dernier ({ job: null } sans travail).
// Ni page ni stockage ; fetch et racine donnés (le banc frame/lib/test/launcher.html les simule).

const ROUTE_RX = /^[a-z0-9][a-z0-9/_-]*$/i;

/** Route nue (sans « /__setup/ » ni requête) ; '' si elle sort du lanceur (« .. », caractères hors liste). */
export function routeOf(route) {
  const r = String(route || '').replace(/^\/+/, '').replace(/^__setup\//, '').split(/[?#]/)[0];
  return ROUTE_RX.test(r) && !r.split('/').includes('..') ? r : '';
}
/** Chemin de data/ normalisé (« sia/base/x.json ») ; '' s'il est absolu, remonte (« .. »), encodé ou vide. */
export function dataPathOf(path) {
  const p = String(path || '');
  if (!p || /^[\\/]|\\|%|:/.test(p)) return '';
  const parts = p.split('/');
  return parts.some(x => x === '..' || x === '.' || x === '') ? '' : p;
}
/** Vrai si x relève d'un préfixe déclaré : égal, ou sous un préfixe terminé par « / ». */
const under = (x, list) => [].concat(list || []).some(p => typeof p === 'string' && p && (x === p || p.endsWith('/') && x.startsWith(p)));
const sleep = (ms, signal) => new Promise(r => {
  const t = setTimeout(r, ms);
  signal?.addEventListener('abort', () => (clearTimeout(t), r()), {
    once: true
  });
});

/** Client du lanceur servi à root ({ host, data, dataGit, lan } pour info), par fetch (celui de la page par défaut). */
export function launcherClient({
  root,
  info = null,
  fetch: get = (...a) => fetch(...a),
  poll = 1000
}) {
  async function request(route, {
    method,
    json,
    text,
    signal
  } = {}) {
    const r = String(route || '').replace(/^\/+/, '').replace(/^__setup\//, '');
    if (!routeOf(r)) return null;
    let res;
    try {
      res = await get(new URL(`__setup/${r}`, root), {
        method: method || (json !== undefined || text !== undefined ? 'POST' : 'GET'),
        cache: 'no-store',
        signal,
        headers: {
          'X-SOG-Setup': '1',
          ...(json !== undefined ? {
            'Content-Type': 'application/json'
          } : text !== undefined ? {
            'Content-Type': 'application/xml'
          } : {})
        },
        body: json !== undefined ? JSON.stringify(json) : text
      });
    } catch {
      return null;
    }
    return {
      status: res.status,
      body: await res.json().catch(() => ({}))
    };
  }

  /** ctx.launcher d'un module : decl = meta.launcher { routes: [...], read: [...] } ; life : signal du démontage. */
  function forModule(decl = {}, {
    life,
    author = () => '' // trigramme de l'appareil : ajouté au départ d'un travail (l'auteur de ses commits, côté lanceur)
  } = {}) {
    const routes = [].concat(decl.routes || []),
      reads = [].concat(decl.read || []);
    const refuse = (route, why = 'route not declared') => ({
      ok: false,
      status: 403,
      refused: true,
      route: String(route || ''),
      message: why
    });
    /** Un appel JSON ; GET sans corps, POST avec ; { ok: false, … } au lieu d'une exception. */
    async function call(route, body, {
      signal
    } = {}) {
      const r = routeOf(route);
      if (!r || !under(r, routes)) return refuse(route);
      const q = String(route).includes('?') ? String(route).slice(String(route).indexOf('?')) : '',
        res = await request(r + q, {
          json: body,
          signal
        });
      if (!res) return {
        ok: false,
        offline: !signal?.aborted,
        aborted: !!signal?.aborted,
        route: r
      };
      if (res.status >= 400) return {
        ok: false,
        status: res.status,
        route: r,
        // 404 : un lanceur plus ancien que le module (« relancez-le à jour ») ; sinon son message
        message: res.status === 404 ? 'unknown route' : String(res.body?.message || res.body?.error || `HTTP ${res.status}`),
        // refus motivé d'un travail (429 'too-soon' : `wait` secondes) : le code et le délai, rien d'autre du corps
        ...(typeof res.body?.reason === 'string' ? {
          reason: res.body.reason.slice(0, 40)
        } : {}),
        ...(Number.isFinite(res.body?.wait) ? {
          wait: res.body.wait
        } : {})
      };
      return res.body && typeof res.body === 'object' && !Array.isArray(res.body) ? res.body : {
        ok: true,
        value: res.body
      };
    }
    /** Suivi d'un travail id jusqu'à sa fin ; arrêt du suivi au démontage (detached) ; annulation sur signal. */
    async function follow(r, id, {
      onProgress,
      signal
    }) {
      for (;;) {
        await sleep(poll, AbortSignal.any ? AbortSignal.any([signal, life].filter(Boolean)) : signal || life);
        if (signal?.aborted) {
          const c = await call(`${r}/cancel`, {
            id
          });
          return {
            ok: false,
            cancelled: true,
            job: id,
            ...(c.ok === false ? {
              cancel: c
            } : {})
          };
        }
        if (life?.aborted) return {
          ok: false,
          detached: true,
          job: id
        };
        const st = await call(`${r}?id=${encodeURIComponent(id)}`);
        if (st.ok === false && !st.state) {
          if (st.offline) continue; // lanceur un instant injoignable : on réessaie au tour suivant
          return {
            ...st,
            job: id
          };
        }
        try {
          onProgress?.(st);
        } catch {
          /* écouteur du module en échec : le suivi continue */
        }
        if (st.state && st.state !== 'running') return {
          ...st,
          ok: st.state === 'done',
          job: id
        };
      }
    }
    /** Lance un travail long et le suit : { ok, state, result, … } à la fin. */
    async function job(route, body, opts = {}) {
      const r = routeOf(route);
      if (!r || !under(r, routes)) return refuse(route);
      const who = String(author() || ''),
        s = await call(r, body && typeof body === 'object' && !Array.isArray(body) ? {
          ...body,
          ...(who ? {
            author: who
          } : {})
        } : body ?? {});
      if (s.ok === false) return s;
      if (!s.job) return {
        ok: false,
        route: r,
        message: String(s.message || s.error || 'no job started')
      };
      return follow(r, s.job, opts);
    }
    /** Reprend le suivi du travail en cours de cette route (page rechargée) ; null sans travail en cours. */
    async function resume(route, opts = {}) {
      const r = routeOf(route);
      if (!r || !under(r, routes)) return refuse(route);
      const s = await call(r);
      if (s.ok === false && !s.state) return s;
      const cur = s.job && typeof s.job === 'object' ? s.job : s.state ? s : null;
      if (!cur?.id) return null;
      if (cur.state !== 'running') return {
        ...cur,
        ok: cur.state === 'done',
        job: cur.id
      };
      return follow(r, cur.id, opts);
    }
    /** Fichier de data/ en flux, même origine : { ok, stream, size } ou { ok: false, … } ; onBytes(n) au fil de la lecture. */
    async function read(path, {
      signal,
      onBytes
    } = {}) {
      const p = dataPathOf(path);
      if (!p || !under(p, reads)) return refuse(path, 'path not declared');
      let res;
      try {
        res = await get(new URL(`data/${p.split('/').map(encodeURIComponent).join('/')}`, root), {
          cache: 'no-store',
          signal
        });
      } catch {
        return {
          ok: false,
          offline: !signal?.aborted,
          aborted: !!signal?.aborted,
          path: p
        };
      }
      if (!res.ok || !res.body) return {
        ok: false,
        status: res.status,
        path: p
      };
      let n = 0;
      const stream = onBytes ? res.body.pipeThrough(new TransformStream({
        transform(chunk, ctl) {
          n += chunk.byteLength;
          try {
            onBytes(n);
          } catch {
            /* écouteur en échec : la lecture continue */
          }
          ctl.enqueue(chunk);
        }
      })) : res.body;
      return {
        ok: true,
        stream,
        size: +res.headers.get('Content-Length') || null
      };
    }
    return Object.freeze({
      info: () => info ? {
        ...info
      } : null,
      call,
      job,
      resume,
      read
    });
  }

  return {
    info: () => info,
    request,
    forModule
  };
}
