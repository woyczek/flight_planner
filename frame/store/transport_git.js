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
      const why = refuse(r, await r.json().catch(() => ({})), opts);
      throw Object.assign(new Error(why.message), {
        status: r.status,
        conflict: why.conflict
      });
    };
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
    publish,
    b64
  };
})();
