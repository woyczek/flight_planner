// V3 frame/lib (propriétaire : frame) — le lanceur du poste vu par le cadre et par les modules (frame/INTEGRATION.md § 15).
// Un seul client des routes /__setup/ du lanceur (tools/launch.py) : le cadre lui-même (Réglages, fiches Little Navmap
// d'aerodb) s'en sert avec toutes ses routes ; un module reçoit ctx.launcher, réduit à ce que son meta.launcher déclare.
//   · request(route, { method, json, text, signal }) → { status, body } (corps JSON lu, {} s'il ne l'est pas) ou null
//     (pas de réponse : réseau, lanceur arrêté, appel abandonné) ; jamais d'exception ;
//   · forModule(decl, { life }) → { info(), call, job, resume, read } : routes et préfixes de lecture déclarés seulement,
//     tout le reste refusé sans appel ({ ok: false, status: 403, refused: true, route }) ; life (AbortSignal) : le
//     démontage du module arrête les suivis de travaux en cours (le travail, lui, continue sur le lanceur : resume) ;
//   · upload(route, fichier, { name, onProgress, signal }) : envoi d'un fichier (octets en corps) avec avancement et annulation (SOG-0199) ;
//   · protocole des travaux longs, fixe : POST <route> corps → { job: id } ; GET <route>?id=… → { id, state ('running' |
//     'done' | 'error' | 'cancelled'), step, done, total, unit, log, result } ; POST <route>/cancel { id } ; GET <route>
//     sans id → le travail en cours ou le dernier ({ job: null } sans travail). Déclarer la route d'un travail (« regen/job »)
//     déclare aussi son annulation (« regen/job/cancel ») : elle fait partie du protocole (29 oct. 2026).
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
/** Ce que le lanceur attendait, rendu avec son refus : `expected`, une liste fermée de mots courts (10 au plus, 20 signes, [a-z0-9_-] : les identifiants de
 *  sources d'AeroDB, par exemple) ; rien d'autre du corps ne passe. */
const expectedOf = b => Array.isArray(b?.expected) && b.expected.length <= 10 && b.expected.every(x => typeof x === 'string' &&
  /^[a-z0-9_-]{1,20}$/.test(x)) ? {
  expected: [...b.expected]
} : {};
/** L'opération en cours que le lanceur dit dans un refus « busy » (`running`, SOG-0245) : un jeu fermé de champs aux types bornés (mots courts [a-z0-9_-], nombres finis, `alive` parmi quatre mots, `step`
 *  un texte de 120 signes sans caractère de commande) ; rien d'autre du corps ne passe. Sans identifiant lisible : rien (un lanceur ancien). */
const runningOf = b => {
  const r = b?.running,
    w = x => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/.test(x) ? x : '',
    n = (x, max = 1e9) => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(x, max) : null;
  if (!r || typeof r !== 'object' || Array.isArray(r) || !w(r.id)) return {};
  const a = r.args && typeof r.args === 'object' && !Array.isArray(r.args) ? r.args : {},
    zones = Array.isArray(a.zones) ? a.zones.filter(z => w(z)).slice(0, 12) : [];
  return {
    running: {
      id: w(r.id),
      set: w(r.set),
      verb: w(r.verb),
      args: {
        ...(zones.length ? {
          zones
        } : {}),
        ...(w(a.icao) ? {
          icao: w(a.icao)
        } : {}),
        ...(w(a.action) ? {
          action: w(a.action)
        } : {})
      },
      started: n(r.started, 4e9),
      step: typeof r.step === 'string' ? r.step.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) : '',
      done: n(r.done),
      total: n(r.total),
      unit: w(r.unit),
      seen: n(r.seen, 4e9),
      silent: n(r.silent, 1e7),
      alive: ['alive', 'quiet', 'stuck', 'gone'].includes(r.alive) ? r.alive : '',
      cancelling: r.cancelling === true
    }
  };
};
/** Vrai si x relève d'un préfixe déclaré : égal, ou sous un préfixe terminé par « / ». */
const under = (x, list) => [].concat(list || []).some(p => typeof p === 'string' && p && (x === p || p.endsWith('/') && x.startsWith(p)));
/** Route permise par une déclaration : sous elle, ou l'annulation d'une route déclarée (<route>/cancel, protocole des travaux). */
const allowed = (x, list) => under(x, list) || (x.endsWith('/cancel') && under(x.slice(0, -'/cancel'.length), list));
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
  xhr: newXhr = () => new XMLHttpRequest(),
  onLost = () => {}, // un envoi qui échoue par le réseau (le lanceur ne répond plus) : le cadre le marque (SOG-0208)
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
      if (!r || !allowed(r, routes)) return refuse(route);
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
        } : {}),
        ...expectedOf(res.body),
        ...runningOf(res.body)
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
    /** Envoie un fichier (Blob ou File, jusqu'à plusieurs Go : il part du disque, pas de la mémoire) à une route déclarée du lanceur, le corps étant ses octets
     *  (POST, application/octet-stream) ; `name` : un indice du nom (en-tête X-SOG-Name, encodé, 200 caractères) ; onProgress(loaded, total) pendant l'envoi
     *  (XMLHttpRequest : fetch n'a pas d'avancement d'envoi) ; signal : annule. Mêmes refus que call (route non déclarée : 403 sans appel) ; même forme de réponse
     *  — le JSON du lanceur (`{ ok: true, status, body }`), un refus `{ ok: false, status, route, message, reason? }`, `{ ok: false, offline: true }` si le réseau est
     *  coupé, `{ ok: false, aborted: true }` si le signal l'a arrêté. Jamais d'exception. */
    function upload(route, file, {
      name = '',
      onProgress,
      signal
    } = {}) {
      const r = routeOf(route);
      if (!r || !allowed(r, routes)) return Promise.resolve(refuse(route));
      if (typeof Blob === 'undefined' || !(file instanceof Blob)) return Promise.resolve({
        ok: false,
        route: r,
        message: 'not a file'
      });
      if (signal?.aborted) return Promise.resolve({
        ok: false,
        aborted: true,
        route: r
      });
      return new Promise(done => {
        const x = newXhr();
        let over = false;
        const end = v => {
          if (over) return;
          over = true;
          signal?.removeEventListener('abort', stop);
          done(v);
        };
        const stop = () => {
          try {
            x.abort();
          } catch {
            /* déjà fini */
          }
          end({
            ok: false,
            aborted: true,
            route: r
          });
        };
        signal?.addEventListener('abort', stop, {
          once: true
        });
        x.open('POST', new URL(`__setup/${r}`, root).href);
        x.setRequestHeader('X-SOG-Setup', '1');
        x.setRequestHeader('Content-Type', 'application/octet-stream');
        const hint = encodeURIComponent(String(name || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200));
        if (hint) x.setRequestHeader('X-SOG-Name', hint);
        x.responseType = 'text';
        if (x.upload) x.upload.onprogress = e => {
          try {
            onProgress?.(e.loaded, e.lengthComputable ? e.total : file.size);
          } catch {
            /* écouteur du module en échec : l'envoi continue */
          }
        };
        x.onerror = x.ontimeout = () => {
          onLost();
          end({
            ok: false,
            offline: true,
            route: r
          });
        };
        x.onabort = () => end({
          ok: false,
          aborted: true,
          route: r
        });
        x.onload = () => {
          let body = {};
          try {
            body = JSON.parse(x.responseText || '{}');
          } catch {
            /* réponse qui n'est pas du JSON */
          }
          if (x.status >= 400) return end({
            ok: false,
            status: x.status,
            route: r,
            message: x.status === 404 ? 'unknown route' : String(body?.message || body?.error || `HTTP ${x.status}`),
            ...(typeof body?.reason === 'string' ? {
              reason: body.reason.slice(0, 40)
            } : {}),
            ...(Number.isFinite(body?.wait) ? {
              wait: body.wait
            } : {}),
            ...expectedOf(body),
            ...runningOf(body)
          });
          end({
            ok: true,
            status: x.status,
            body: body && typeof body === 'object' ? body : {}
          });
        };
        x.send(file);
      });
    }
    return Object.freeze({
      info: () => info ? {
        ...info
      } : null,
      call,
      job,
      resume,
      read,
      upload
    });
  }

  return {
    info: () => info,
    request,
    forModule
  };
}
