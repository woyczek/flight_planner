(() => {
  'use strict';
  // Transport « launcher » de la couche de données (frame/store/frame_data.js) : poste de travail avec lanceur
  // (tools/launch.py) ; le dossier data/ du poste est le dépôt, servi par le lanceur.
  //   · head() / tree() : GET /__setup/changes?since=<tête> — tête (empreinte de l'arbre de data/) et, si elle a changé,
  //     l'arbre { chemin: empreinte git du fichier } ;
  //   · read(chemin) : le fichier servi (data/<chemin>) ;
  //   · commit(lot, message, parent) : POST /__setup/batch — toute la file en une fois (écrite dans data/, un commit
  //     local si data/ est un dépôt git) ; tête changée entre-temps : err.conflict ;
  //   · exchange() (si demandé : usages « plusieurs appareils » ou « plusieurs utilisateurs ») : POST /__setup/sync, le
  //     passage git du poste (commit du pool, fusion fiche par fiche, envoi).
  // En-tête X-SOG-Setup sur chaque route du lanceur ; réseau coupé → err.offline. API : FrameData.launcher({ exchange,
  //   author }) → transport ; FrameData.launcher.detect() → { data, dataGit, host, lan, lnm } | null (page servie par un
  //   lanceur ? host : nom du poste ; lan : page ouverte depuis un autre appareil du réseau local ; lnm : genres de bases de
  //   Little Navmap présents sur le poste, noms seulement : indice pour aerodb).
  const FD = window.FrameData;
  if (!FD || FD.launcher) return;
  const ROOT = new URL('../../', document.currentScript?.src || location.href).href;
  /** Appel d'une route du lanceur ; erreur réseau → err.offline ; refus → message, err.conflict sur 409. */
  async function call(path, body) {
    let r;
    try {
      r = await fetch(new URL(path, ROOT), {
        method: body ? 'POST' : 'GET',
        cache: 'no-store',
        headers: {
          'X-SOG-Setup': '1',
          ...(body ? {
            'Content-Type': 'application/json'
          } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw Object.assign(new Error('offline'), {
        offline: true
      });
    }
    const j = await r.json().catch(() => ({}));
    // 400 qui nomme un chemin : cette écriture est refusée pour de bon (la couche la sort de la file)
    if (r.status === 400 && j.path) throw Object.assign(new Error(j.message || 'refused'), {
      refused: String(j.path)
    });
    if (!r.ok) throw Object.assign(new Error(j.message || j.error || `launcher ${r.status}`), {
      status: r.status,
      conflict: r.status === 409
    });
    return j;
  }

  // Une seule lecture de l'arbre de data/ à la fois, pour tous les transports de cette page (SOG-0063, 9 nov. 2026 : deux lectures de
  // 946 Ko, en parallèle, à chaque chargement) : la dernière réponse { head, tree } et la requête en vol sont partagées.
  const shared = {
    last: null,
    flying: new Map()
  };
  const changes = path => {
    if (!shared.flying.has(path)) shared.flying.set(path, call(path).finally(() => shared.flying.delete(path)));
    return shared.flying.get(path);
  };

  function launcher(o = {}) {
    return {
      id: 'launcher',
      kind: 'remote',
      quick: true, // data/ du poste : un passage est local et rapide, la couche envoie une écriture aussitôt (2 s)
      /** hint : la tête que l'appelant connaît déjà avec son arbre (la couche : meta « remote ») ; le lanceur répond « same » sans
       *  l'arbre, qui n'est alors pas relu. */
      async head(hint = '') {
        const j = await changes(`__setup/changes?since=${encodeURIComponent(shared.last?.head || hint || '')}`);
        if (!j.same) shared.last = {
          head: j.head,
          tree: j.tree
        };
        return j.head;
      },
      async tree(head) {
        if (shared.last?.head === head) return shared.last.tree;
        const j = await changes('__setup/changes');
        shared.last = {
          head: j.head,
          tree: j.tree
        };
        return j.tree;
      },
      async read(path) {
        return (await fileOf(path)).text();
      },
      /** Octets d'un fichier de data/ (une image : le logo de la compagnie), sans décodage. */
      async readBytes(path) {
        return (await fileOf(path)).arrayBuffer();
      },
      async commit(changes, message, parent) {
        const j = await call('__setup/batch', {
          parent,
          message,
          author: o.author?.() || '',
          changes
        });
        shared.last = null; // l'arbre lu n'est plus celui de data/ : la prochaine lecture le relit (SOG-0063 l'a rangé dans `shared`)
        return j.head;
      },
      ...(o.exchange ? {
        exchange: (opts = {}) => call('__setup/sync', {
          author: o.author?.() || '',
          ...(opts.gesture ? {
            gesture: true
          } : {})
        })
      } : {})
    };
  }
  /** Réponse du lanceur pour un fichier de data/ ; erreur réseau → err.offline, refus → erreur. */
  async function fileOf(path) {
    let r;
    try {
      r = await fetch(new URL(`data/${path.split('/').map(encodeURIComponent).join('/')}`, ROOT), {
        cache: 'no-store'
      });
    } catch {
      throw Object.assign(new Error('offline'), {
        offline: true
      });
    }
    if (!r.ok) throw new Error(`launcher: ${path} ${r.status}`);
    return r;
  }
  /** Page servie par un lanceur ? { data, dataGit } ; null sinon (site, appli, fichier). */
  launcher.detect = async () => {
    // un lanceur ne sert qu'en http (ce poste, ou une adresse privée du réseau local) : en https (GitHub Pages), aucun
    // aller-retour au démarrage
    if (location.protocol !== 'http:') return null;
    try {
      const j = await call('__setup/status');
      return j?.server ? {
        data: !!j.data,
        dataGit: !!j.dataGit,
        host: String(j.host || ''),
        lan: !!j.lan,
        lnm: Array.isArray(j.lnm) ? j.lnm.filter(k => typeof k === 'string').map(k => k.slice(0, 40)).slice(0, 20) : [],
        // la version de la suite (git describe, date du commit) que le lanceur sert
        version: j.version && typeof j.version.version === 'string' ? {
          version: j.version.version.slice(0, 80),
          date: String(j.version.date || '').slice(0, 10),
          web: typeof j.version.web === 'string' ? j.version.web.slice(0, 200) : null
        } : null
      } : null;
    } catch {
      return null;
    }
  };
  FD.launcher = launcher;
})();
