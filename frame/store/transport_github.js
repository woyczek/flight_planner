(() => {
  'use strict';
  // Transport « github » de la couche de données (frame/store/frame_data.js) : dépôt des données GitHub par l'API git data,
  // jeton à grain fin de l'appareil (contenu en lecture et écriture, ce dépôt seulement), gardé dans ce navigateur
  // (localStorage githubData:frame, hors des sauvegardes : préfixe githubData exclu par shared/browser_store.js).
  //   · head() : tête de la branche (requête conditionnelle : un 304 ne compte pas dans la limite de l'API) ;
  //   · tree(tête) : chemins et empreintes de tous les fichiers (arbre récursif, une requête) ;
  //   · read(chemin, empreinte) : contenu d'un fichier (blob, immuable : jamais relu pour une même empreinte) ;
  //   · commit(lot, message, parent) : UN commit pour tout le lot (nouvel arbre sur celui du parent, commit, branche
  //     avancée sans forcer) ; branche partie ailleurs entre-temps : err.conflict (la couche tire et repousse).
  // Erreur réseau : err.offline. API : FrameData.github({ repo, branch, token, api }) → transport ;
  //   FrameData.github.config() / save(cfg) / clear() (réglage de l'appareil).
  const FD = window.FrameData;
  if (!FD || FD.github) return;
  const KEY = 'githubData:frame';
  /** Réglage gardé { repo, branch, token, api } ; null s'il n'y en a pas. */
  const config = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c?.repo && c.token ? c : null;
    } catch {
      return null;
    }
  };
  const save = c => localStorage.setItem(KEY, JSON.stringify({
    repo: String(c.repo || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, ''),
    branch: String(c.branch || 'main').trim() || 'main',
    token: String(c.token || '').trim(),
    ...(c.api ? {
      api: c.api
    } : {})
  }));
  const clear = () => localStorage.removeItem(KEY);

  function github(c = config()) {
    if (!c?.repo || !c.token) throw new Error('github transport: repository and token required');
    const api = (c.api || 'https://api.github.com').replace(/\/$/, ''),
      branch = c.branch || 'main',
      repo = `${api}/repos/${c.repo}`;
    let refTag = '',
      refSha = '';
    const treeOf = new Map(); // commit → arbre (sha)
    /** Appel de l'API ; erreur réseau → err.offline, refus → message lisible (jeton, droits), err.status. */
    async function call(url, {
      method = 'GET',
      body,
      accept = 'application/vnd.github+json',
      etag = '',
      ref = false
    } = {}) {
      let r;
      try {
        r = await fetch(url, {
          method,
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${c.token}`,
            Accept: accept,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(body ? {
              'Content-Type': 'application/json'
            } : {}),
            ...(etag ? {
              'If-None-Match': etag
            } : {})
          },
          body: body ? JSON.stringify(body) : undefined
        });
      } catch {
        throw Object.assign(new Error('offline'), {
          offline: true
        });
      }
      if (r.ok || r.status === 304) return r;
      const m = (await r.json().catch(() => ({}))).message || r.statusText;
      throw Object.assign(new Error(r.status === 401 ? 'GitHub token refused (expired or wrong)' : `GitHub ${r.status}: ${m}`), {
        status: r.status,
        conflict: ref && (r.status === 409 || r.status === 422) // branche partie ailleurs (avancée refusée)
      });
    }
    return {
      id: 'github',
      kind: 'remote',
      /** Tête de la branche (sha du dernier commit). */
      async head() {
        const r = await call(`${repo}/git/ref/heads/${encodeURIComponent(branch)}`, {
          etag: refTag
        });
        if (r.status === 304 && refSha) return refSha;
        refTag = r.headers.get('ETag') || '';
        refSha = (await r.json()).object.sha;
        return refSha;
      },
      /** Fichiers du commit : { chemin: empreinte du blob }. */
      async tree(commit) {
        const t = treeOf.get(commit) || (await (await call(`${repo}/git/commits/${commit}`)).json()).tree.sha;
        treeOf.set(commit, t);
        const j = await (await call(`${repo}/git/trees/${t}?recursive=1`)).json();
        if (j.truncated) throw new Error('GitHub tree truncated: repository too large for one listing');
        return Object.fromEntries(j.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha]));
      },
      /** Contenu d'un fichier (blob brut, UTF-8). */
      async read(path, sha) {
        return (await call(`${repo}/git/blobs/${sha}`, {
          accept: 'application/vnd.github.raw'
        })).text();
      },
      /** Un commit pour tout le lot [{ path, text (null : suppression) }] sur parent ; nouvelle tête. remote : arbre
       *  connu (une suppression d'un fichier absent du dépôt est sautée). */
      async commit(changes, message, parent, remote = null) {
        changes = changes.filter(x => x.text !== null || !remote?.tree || x.path in remote.tree);
        if (!changes.length) return parent;
        const base = treeOf.get(parent) || (await (await call(`${repo}/git/commits/${parent}`)).json()).tree.sha;
        const tree = (await (await call(`${repo}/git/trees`, {
          method: 'POST',
          body: {
            base_tree: base,
            tree: changes.map(x => x.text === null ? {
              path: x.path,
              mode: '100644',
              type: 'blob',
              sha: null
            } : {
              path: x.path,
              mode: '100644',
              type: 'blob',
              content: x.text
            })
          }
        })).json()).sha;
        const commit = (await (await call(`${repo}/git/commits`, {
          method: 'POST',
          body: {
            message,
            tree,
            parents: [parent]
          }
        })).json()).sha;
        // avancée sans forcer : refusée (422) si quelqu'un a poussé entre-temps → err.conflict
        await call(`${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
          method: 'PATCH',
          ref: true,
          body: {
            sha: commit,
            force: false
          }
        });
        treeOf.set(commit, tree);
        refSha = commit;
        refTag = '';
        return commit;
      }
    };
  }
  github.config = config;
  github.save = save;
  github.clear = clear;
  FD.github = github;
})();
