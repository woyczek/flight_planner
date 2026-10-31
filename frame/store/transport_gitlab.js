(() => {
  'use strict';
  // Transport « gitlab » de la couche de données (frame/store/frame_data.js) : dépôt des données sur une instance GitLab
  // (gitlab.com, framagit…) par l'API REST v4, jeton d'accès de PROJET de l'appareil (un par pilote, nommé par son
  // trigramme, portée api ou write_repository, créé par l'administrateur, révocable, à expiration). Même forme que le
  // transport « github » (transport_github.js), qui y renvoie quand le réglage de l'appareil désigne une instance GitLab :
  // le réglage reste celui de FD.github (device/keys.json : { provider: 'gitlab', api, repo, branch, token }).
  //   · head() : tête de la branche (GET /projects/:id/repository/branches/:branche) ;
  //   · tree(tête) : chemins et empreintes (sha git des blobs, comme GitHub) de tous les fichiers, page par page (100 par
  //     page, pagination par clés) ; gardé par tête ;
  //   · read(chemin, empreinte) : contenu d'un blob (immuable : jamais relu pour une même empreinte) ;
  //   · commit(lot, message, parent) : UN commit atomique pour tout le lot (POST /repository/commits, actions create /
  //     update / delete), auteur = le trigramme de l'appareil ; la tête relue juste avant doit être le parent, sinon
  //     err.conflict (la couche tire et repousse) ; un commit posé sur une branche partie ailleurs entre-temps le dit
  //     aussi (err.conflict : la couche tire, sa fusion trouve ses propres changements déjà là) ;
  //   · publish(groupes) : publication de fichiers générés (frame/INTEGRATION.md § 15.2), un commit par groupe.
  // Erreur réseau : err.offline ; jeton refusé : message lisible. Le jeton ne sort jamais de l'en-tête PRIVATE-TOKEN :
  // ni dans une adresse, ni dans un message, ni dans la console. L'appel, la boucle de publication et le base64 sont ceux
  // de la base commune (transport_git.js, refonte R-C6).
  const FD = window.FrameData;
  if (!FD?.git || FD.gitlab) return;
  const G = FD.git;

  function gitlab(c) {
    if (!c?.repo || !c.token) throw new Error('gitlab transport: project and token required');
    // l'api de l'instance, de la seule forme https://hôte/api/v4 : jamais un jeton vers une autre forme d'adresse
    if (!/^https:\/\/[^/\s]+\/api\/v4$/.test(String(c.api || ''))) throw new Error('gitlab transport: api must be https://<host>/api/v4');
    const api = c.api,
      branch = c.branch || 'main',
      project = `${api}/projects/${encodeURIComponent(c.repo)}`,
      who = () => {
        const t = typeof c.author === 'function' ? String(c.author() || '') : '';
        return /^[A-Z0-9]{2,5}$/.test(t) ? t : '';
      };
    const treeOf = new Map(); // tête → { chemin: empreinte }
    let headSha = '';
    /** Appel de l'API (base commune) ; refus → message lisible (jeton, droits), err.status ; err.conflict pour un refus
     *  qui dit que le dépôt a bougé (fichier déjà là, absent, changé entre-temps). */
    const call = G.caller({
      headers: () => ({
        'PRIVATE-TOKEN': c.token
      }),
      refuse(r, j) {
        const m = String((typeof j.message === 'string' ? j.message : j.message && JSON.stringify(j.message)) || j.error || r
          .statusText).slice(0, 120);
        return {
          // « GitLab <statut> : <message du serveur, 120 signes> » : le cadre dit la phrase du statut (404 : projet introuvable
          // ou jeton sans accès ; 401 : refusé ou expiré ; 403 : sans droit d'écriture ; 400 sur la branche), jamais le jeton
          message: `GitLab ${r.status}: ${m}`,
          conflict: [400, 409, 422].includes(r.status) && /exist|changed|already|conflict|does not/i.test(m)
        };
      }
    });
    const conflict = why => Object.assign(new Error(why), {
      conflict: true
    });
    /** Actions d'un lot sur l'arbre connu : create si le fichier n'y est pas, update sinon, delete pour text null. */
    const actionsOf = (changes, known) => changes.map(x => x.text === null ? {
      action: 'delete',
      file_path: x.path
    } : x.blob ? {
      action: x.path in known ? 'update' : 'create',
      file_path: x.path,
      content: x.blob,
      encoding: 'base64'
    } : {
      action: x.path in known ? 'update' : 'create',
      file_path: x.path,
      content: x.text
    });
    /** Un commit des actions sur la branche ; nouvelle tête. parent : la tête attendue (posé ailleurs : err.conflict). */
    async function post(actions, message, parent) {
      const author = who(),
        j = await (await call(`${project}/repository/commits`, {
          method: 'POST',
          body: {
            branch,
            commit_message: message,
            actions,
            ...(author ? {
              author_name: author,
              author_email: `${author.toLowerCase()}@defa.local`
            } : {})
          }
        })).json();
      headSha = j.id;
      if (parent && (j.parent_ids || [])[0] !== parent) throw Object.assign(conflict('branch moved during the commit'), {
        head: j.id
      });
      return j.id;
    }
    const self = {
      id: 'gitlab',
      kind: 'remote',
      /** Qui est le jeton (§ 10.36 : « Tester » de Réglages avertit d'un jeton personnel ou d'une expiration absente ou au-delà d'un an) : { bot (true : jeton de projet
       *  ou de groupe, porté par un robot), username, scopes, expiresAt } — bot et username par GET /user ; scopes et expiresAt par
       *  /personal_access_tokens/self (qui ne dit pas bot, seulement user_id), null s'ils ne se lisent pas ; même jeton, même hôte, mêmes erreurs que le reste. */
      async whoami() {
        const u = await (await call(`${api}/user`)).json();
        let scopes = null,
          expiresAt = null;
        try {
          const t = await (await call(`${api}/personal_access_tokens/self`)).json();
          scopes = Array.isArray(t?.scopes) ? t.scopes.map(String) : null;
          expiresAt = typeof t?.expires_at === 'string' ? t.expires_at : null;
        } catch (e) {
          if (e?.offline) throw e; // hors ligne : dit comme pour /user ; un refus de cette route seule laisse null
        }
        return {
          bot: u?.bot === true,
          username: typeof u?.username === 'string' ? u.username : null,
          scopes,
          expiresAt
        };
      },
      /** Tête de la branche (sha du dernier commit). */
      async head() {
        const j = await (await call(`${project}/repository/branches/${encodeURIComponent(branch)}`)).json();
        headSha = j.commit?.id || '';
        if (!headSha) throw new Error('GitLab: branch without commit');
        return headSha;
      },
      /** Fichiers du commit : { chemin: empreinte du blob } (pages de 100, pagination par clés, lien « next »). */
      async tree(commit) {
        if (treeOf.has(commit)) return {
          ...treeOf.get(commit)
        };
        const out = {};
        let url = `${project}/repository/tree?ref=${encodeURIComponent(commit)}&recursive=true&per_page=100&pagination=keyset`,
          pages = 0;
        while (url) {
          if (++pages > 2000) throw new Error('GitLab tree: too many pages');
          const r = await call(url);
          for (const x of await r.json())
            if (x.type === 'blob') out[x.path] = x.id;
          const next = /<([^>]+)>\s*;\s*rel="next"/.exec(r.headers.get('Link') || '');
          // le lien suivant doit rester sur l'API de cette instance (jamais ailleurs avec le jeton)
          url = next && next[1].startsWith(`${api}/`) ? next[1] : '';
        }
        treeOf.set(commit, out);
        return {
          ...out
        };
      },
      /** Contenu d'un fichier (blob brut, UTF-8). */
      async read(path, sha) {
        return (await call(`${project}/repository/blobs/${encodeURIComponent(sha)}/raw`)).text();
      },
      /** Un commit pour tout le lot [{ path, text (null : suppression) }] sur parent ; nouvelle tête. remote : arbre
       *  connu (une suppression d'un fichier absent du dépôt est sautée). */
      async commit(changes, message, parent, remote = null) {
        const known = remote?.tree || await self.tree(parent);
        changes = changes.filter(x => x.text !== null || x.path in known);
        if (!changes.length) return parent;
        if (await self.head() !== parent) throw conflict('branch moved');
        return post(actionsOf(changes, known), message, parent);
      },
      /** Publication de fichiers générés (frame/INTEGRATION.md § 15.2 ; boucle de la base commune) : un commit par groupe,
       *  chacun sur la tête relue juste avant ; une suppression d'un fichier absent est sautée. */
      publish: (groups, opts) => G.publish(groups, opts, {
        prepare: async (f, blob) => blob ? {
          path: f.path,
          blob: await G.b64(blob)
        } : {
          path: f.path,
          text: String(f.text ?? '')
        },
        async land(changes, removed, message) {
          const parent = await self.head(),
            known = await self.tree(parent),
            gone = removed.filter(p => p in known);
          const commit = await post(actionsOf([...changes, ...gone.map(path => ({
            path,
            text: null
          }))], known), message, '');
          return {
            commit,
            removed: gone.length
          };
        }
      })
    };
    return self;
  }
  FD.gitlab = gitlab;
})();
