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
  //   effacé (reprise une seule fois). L'appel, la boucle de publication et le base64 sont ceux de la base commune
  //   (transport_git.js, refonte R-C6).
  const FD = window.FrameData;
  if (!FD?.git || FD.github) return;
  const G = FD.git;
  const LEGACY = 'githubData:frame'; // ancien rangement (localStorage), repris une fois par le cadre
  let held = null, // réglage { repo, branch, token, api } en mémoire ; null s'il n'y en a pas
    sink = null; // fonction du cadre qui le garde dans device/keys.json
  /** Réglage nettoyé. Une adresse collée dit l'hébergeur : https://github.com/compte/dépôt → GitHub ; toute autre adresse
   *  https://hôte/groupe/projet → une instance GitLab (gitlab.com, framagit…), api https://hôte/api/v4 (transport_gitlab.js,
   *  29 oct. 2026) ; provider 'gitlab' donné tel quel aussi. */
  const clean = c => {
    let repo = String(c.repo || '').trim().replace(/\.git$/, '').replace(/\/+$/, ''),
      api = c.api || '',
      provider = c.provider === 'gitlab' ? 'gitlab' : 'github';
    // un hôte de lettres, chiffres, points et tirets (et un port) : « https://gitlab.com@hote-attaquant/x/y » ou tout autre
    // caractère dans l'hôte est refusé d'emblée (dépôt vide : « Dépôt et jeton nécessaires »), jamais un hôte trompeur affiché
    if (/^https?:\/\//i.test(repo) && !/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?\/[^\s@]+$/.test(repo)) repo = '';
    const u = /^https:\/\/([A-Za-z0-9.-]+(?::\d+)?)\/(.+)$/.exec(repo);
    if (u) {
      provider = u[1].toLowerCase() === 'github.com' ? 'github' : 'gitlab';
      if (provider === 'gitlab') api = `https://${u[1].toLowerCase()}/api/v4`; // l'hôte collé, jamais un api d'avant
      repo = u[2];
    }
    // GitLab : une api de la seule forme https://hôte/api/v4 (sinon ignorée : le transport refuse un réglage sans elle)
    if (provider === 'gitlab' && !GITLAB_API.test(api)) api = '';
    return {
      repo,
      branch: String(c.branch || 'main').trim() || 'main',
      token: String(c.token || '').trim(),
      ...(provider === 'gitlab' ? {
        provider
      } : {}),
      ...(api ? {
        api
      } : {})
    };
  };
  const GITLAB_API = /^https:\/\/[^/\s]+\/api\/v4$/;
  /** Cible d'un réglage : fournisseur, origine de l'API, projet — un jeton ne vaut que pour la sienne. */
  const target = c => `${c?.provider === 'gitlab' ? 'gitlab' : 'github'}|${c?.provider === 'gitlab' ? String(c.api || '').toLowerCase() :
    (c?.api || 'https://api.github.com').replace(/\/$/, '').toLowerCase()}|${String(c?.repo || '').toLowerCase()}`;
  /** Réglage de la carte d'accès (adresse collée, jeton peut-être vide) → réglage complet : le jeton enregistré n'est repris
   *  que si le fournisseur, l'origine de l'API et le projet sont ceux du réglage enregistré (jamais vers un nouvel hôte :
   *  un lien d'invitation malveillant ne fait pas partir l'ancien jeton) ; sinon token vide et newTarget (l'hôte à dire). */
  const resolve = c => {
    const x = clean(c || {});
    if (x.token) return x;
    if (held?.token && target(held) === target(x)) return {
      ...x,
      token: held.token
    };
    return {
      ...x,
      newTarget: x.provider === 'gitlab' ? String(x.api || '').replace(/\/api\/v4$/, '').replace(/^https:\/\//, '') : 'github.com'
    };
  };
  /** Réglage gardé { repo, branch, token, api } ; null s'il n'y en a pas. */
  const config = () => held?.repo && held.token ? {
    ...held
  } : null;
  const hold = c => {
    held = c && typeof c === 'object' ? clean(c) : null;
  };
  const save = c => {
    if (!clean(c || {}).token) throw new Error('github.save: token required (resolve() first)'); // jamais un réglage sans jeton
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

  function github(c = config()) {
    if (!c?.repo || !c.token) throw new Error('github transport: repository and token required');
    // réglage d'une instance GitLab : son transport (même forme)
    if (c.provider === 'gitlab') {
      if (!FD.gitlab) throw new Error('gitlab transport not loaded');
      return FD.gitlab(c);
    }
    const api = (c.api || 'https://api.github.com').replace(/\/$/, ''),
      branch = c.branch || 'main',
      repo = `${api}/repos/${c.repo}`;
    let refTag = '',
      refSha = '';
    const treeOf = new Map(); // commit → arbre (sha)
    /** Appel de l'API (base commune) ; un 304 est une réponse (tête inchangée) ; refus → message lisible (jeton, droits),
     *  err.status ; err.conflict pour l'avancée de la branche refusée (ref). */
    const call = G.caller({
      headers: ({
        accept = 'application/vnd.github+json',
        etag = ''
      }) => ({
        Authorization: `Bearer ${c.token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(etag ? {
          'If-None-Match': etag
        } : {})
      }),
      ok: r => r.ok || r.status === 304,
      refuse: (r, j, {
        ref = false
      }) => ({
        message: r.status === 401 ? 'GitHub token refused (expired or wrong)' : `GitHub ${r.status}: ${j.message || r.statusText}`,
        conflict: ref && (r.status === 409 || r.status === 422) // branche partie ailleurs (avancée refusée)
      })
    });
    const self = {
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
      },
      /** Publication de fichiers générés, hors de la file de la couche de données (frame/INTEGRATION.md § 15.2 ; boucle de
       *  la base commune) : un commit par groupe, chacun sur la tête relue juste avant ; blobs envoyés un à un, arbre sur
       *  celui du parent, avancée sans forcer. */
      publish: (groups, opts) => G.publish(groups, opts, {
        prepare: async (f, blob) => ({
          path: f.path,
          mode: '100644',
          type: 'blob',
          sha: (await (await call(`${repo}/git/blobs`, {
            method: 'POST',
            body: blob ? {
              content: await G.b64(blob),
              encoding: 'base64'
            } : {
              content: String(f.text ?? ''),
              encoding: 'utf-8'
            }
          })).json()).sha
        }),
        async land(entries, removed, message) {
          const parent = await self.head(),
            base = treeOf.get(parent) || (await (await call(`${repo}/git/commits/${parent}`)).json()).tree.sha;
          treeOf.set(parent, base);
          let gone = removed;
          const tree = async () => (await (await call(`${repo}/git/trees`, {
            method: 'POST',
            body: {
              base_tree: base,
              tree: [...entries, ...gone.map(path => ({
                path,
                mode: '100644',
                type: 'blob',
                sha: null
              }))]
            }
          })).json()).sha;
          let t;
          try {
            t = await tree();
          } catch (e) {
            // une suppression d'un fichier absent du dépôt fait refuser l'arbre : les absents écartés, un seul nouvel essai
            if (e.status !== 422 || !gone.length) throw e;
            const keep = [];
            for (const path of gone) {
              try {
                await call(`${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${parent}`);
                keep.push(path);
              } catch (x) {
                if (x.status !== 404) throw x;
              }
            }
            gone = keep;
            t = await tree();
          }
          const commit = (await (await call(`${repo}/git/commits`, {
            method: 'POST',
            body: {
              message,
              tree: t,
              parents: [parent]
            }
          })).json()).sha;
          await call(`${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
            method: 'PATCH',
            ref: true,
            body: {
              sha: commit,
              force: false
            }
          });
          treeOf.set(commit, t);
          refSha = commit;
          refTag = '';
          return {
            commit,
            removed: gone.length
          };
        }
      })
    };
    return self;
  }
  github.config = config;
  github.save = save;
  github.clear = clear;
  github.hold = hold;
  github.clean = clean; // réglage tel que la carte d'accès le donne (adresse collée) → réglage du transport
  github.resolve = resolve; // … avec le jeton enregistré seulement pour la même cible
  github.legacy = legacy;
  github.persist = fn => {
    sink = fn;
  };
  FD.github = github;
})();
