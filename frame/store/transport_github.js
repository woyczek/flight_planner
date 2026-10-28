(() => {
  'use strict';
  // Transport « github » de la couche de données (frame/store/frame_data.js) : dépôt des données GitHub par l'API git data,
  // jeton à grain fin de l'appareil (contenu en lecture et écriture, ce dépôt seulement). Le réglage est gardé comme
  // l'identité : document `device/keys.json` de la base IndexedDB du cadre (politique cache, jamais synchronisé, jamais
  // dans une sauvegarde : frame_data.js le laisse hors de dump()). Il était dans localStorage (githubData:frame) et
  // Safari l'y perdait au relancement alors que l'identité (IndexedDB) restait : frame/settings/DECISIONS.md, 25 oct 2026.
  //   · head() : tête de la branche (requête conditionnelle : un 304 ne compte pas dans la limite de l'API) ;
  //   · tree(tête) : chemins et empreintes de tous les fichiers (arbre récursif, une requête) ;
  //   · read(chemin, empreinte) : contenu d'un fichier (blob, immuable : jamais relu pour une même empreinte) ;
  //   · commit(lot, message, parent) : UN commit pour tout le lot (nouvel arbre sur celui du parent, commit, branche
  //     avancée sans forcer) ; branche partie ailleurs entre-temps : err.conflict (la couche tire et repousse).
  // Erreur réseau : err.offline. API : FrameData.github({ repo, branch, token, api }) → transport ;
  //   FrameData.github.config() / save(cfg) / clear() (réglage de l'appareil, lus et écrits en mémoire à l'instant) ;
  //   hold(cfg) : le cadre y met le réglage lu de device/keys.json (sans l'écrire) ; persist(fn) : le cadre donne la
  //   fonction qui garde le réglage (appelée par save et clear) ; legacy() : l'ancien réglage de localStorage, rendu et
  //   effacé (reprise une seule fois) ; scratch('lab/<trigramme>') : le transport réduit du laboratoire des données, sur
  //   une branche jetable (frame/aerodb/SPEC.md § 5 sexies) — jamais la branche principale, jamais hors de lab/.
  const FD = window.FrameData;
  if (!FD || FD.github) return;
  const LEGACY = 'githubData:frame'; // ancien rangement (localStorage), repris une fois par le cadre
  let held = null, // réglage { repo, branch, token, api } en mémoire ; null s'il n'y en a pas
    sink = null; // fonction du cadre qui le garde dans device/keys.json
  const clean = c => ({
    repo: String(c.repo || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, ''),
    branch: String(c.branch || 'main').trim() || 'main',
    token: String(c.token || '').trim(),
    ...(c.api ? {
      api: c.api
    } : {})
  });
  /** Réglage gardé { repo, branch, token, api } ; null s'il n'y en a pas. */
  const config = () => held?.repo && held.token ? {
    ...held
  } : null;
  const hold = c => {
    held = c && typeof c === 'object' ? clean(c) : null;
  };
  const save = c => {
    hold(c);
    sink?.(held ? {
      ...held
    } : null);
  };
  const clear = () => {
    held = null;
    sink?.(null);
  };
  /** L'ancien réglage de localStorage (rendu puis effacé) ; null s'il n'y en a pas ou si le stockage est fermé. */
  const legacy = () => {
    try {
      const c = JSON.parse(localStorage.getItem(LEGACY) || 'null');
      localStorage.removeItem(LEGACY);
      return c?.repo && c.token ? c : null;
    } catch {
      return null;
    }
  };

  /** Transport sur la branche de c ; refs : il sait aussi créer et supprimer SA branche (réservé à scratch). */
  function github(c = config(), refs = false) {
    if (!c?.repo || !c.token) throw new Error('github transport: repository and token required');
    const api = (c.api || 'https://api.github.com').replace(/\/$/, ''),
      branch = c.branch || 'main',
      ref = branch.split('/').map(encodeURIComponent).join('/'), // lab/ABC : chaque segment, jamais la barre
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
        const r = await call(`${repo}/git/ref/heads/${ref}`, {
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
        await call(`${repo}/git/refs/heads/${ref}`, {
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
      },
      ...(refs ? {
        /** Crée la branche sur le commit sha ; false si elle existe déjà. */
        async createBranch(sha) {
          try {
            await call(`${repo}/git/refs`, {
              method: 'POST',
              body: {
                ref: `refs/heads/${branch}`,
                sha
              }
            });
          } catch (e) {
            if (e.status === 422) return false;
            throw e;
          }
          refSha = sha;
          refTag = '';
          return true;
        },
        /** Supprime la branche ; false si elle n'existe pas (ou plus). */
        async deleteBranch() {
          try {
            await call(`${repo}/git/refs/heads/${ref}`, {
              method: 'DELETE'
            });
          } catch (e) {
            if (e.status === 404 || e.status === 422) return false;
            throw e;
          }
          refSha = '';
          refTag = '';
          return true;
        }
      } : {})
    };
  }
  /** Transport réduit du laboratoire des données : la branche jetable `name` (lab/<trigramme>) seulement, créée depuis la
   *  tête de la branche principale, supprimée par « Nettoyer ». Rend { branch, base, head() (null : pas de branche),
   *  create() (tête de la branche principale, branche créée dessus ; tête de lab si elle existe déjà), tree(commit),
   *  baseTree() (fichiers de la branche principale, lecture seule), commit(lot, message, parent) (chemins sous lab/
   *  seulement, sur la branche jetable), deleteBranch() } : ni commit générique, ni écriture sur la branche principale, ni
   *  jeton. */
  function scratch(name, c = config()) {
    if (!/^lab\/[A-Za-z0-9_-]{1,32}$/.test(String(name || ''))) throw new Error(`github scratch: branch lab/<name> expected, got ${name}`);
    if (!c?.repo || !c.token) throw new Error('github transport: repository and token required');
    const base = c.branch || 'main';
    if (name === base) throw new Error('github scratch: never the main branch');
    const main = github(c),
      lab = github({
        ...c,
        branch: name
      }, true);
    const head = async () => {
      try {
        return await lab.head();
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    };
    return Object.freeze({
      id: 'github-scratch',
      branch: name,
      base,
      head,
      async create() {
        const sha = await main.head();
        return await lab.createBranch(sha) ? sha : head();
      },
      tree: commit => lab.tree(commit),
      baseTree: async () => main.tree(await main.head()),
      commit(changes, message, parent) {
        const out = changes.find(x => !/^lab\/[^/].*$/.test(String(x.path || '')) || x.path.includes('..'));
        if (out) return Promise.reject(new Error(`github scratch: ${out.path} is outside lab/`));
        return lab.commit(changes, message, parent);
      },
      deleteBranch: () => lab.deleteBranch()
    });
  }
  github.config = config;
  github.save = save;
  github.clear = clear;
  github.hold = hold;
  github.legacy = legacy;
  github.scratch = scratch;
  github.persist = fn => {
    sink = fn;
  };
  FD.github = github;
})();
