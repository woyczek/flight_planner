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
  //   author }) → transport ; FrameData.launcher.detect() → { data, dataGit } | null (page servie par un lanceur ?).
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
    if (!r.ok) throw Object.assign(new Error(j.message || j.error || `launcher ${r.status}`), {
      status: r.status,
      conflict: r.status === 409
    });
    return j;
  }

  function launcher(o = {}) {
    let last = null; // { head, tree } de la dernière réponse
    return {
      id: 'launcher',
      kind: 'remote',
      quick: true, // data/ du poste : un passage est local et rapide, la couche envoie une écriture aussitôt (2 s)
      async head() {
        const j = await call(`__setup/changes?since=${encodeURIComponent(last?.head || '')}`);
        if (!j.same) last = {
          head: j.head,
          tree: j.tree
        };
        return j.head;
      },
      async tree(head) {
        if (last?.head === head) return last.tree;
        const j = await call('__setup/changes');
        last = {
          head: j.head,
          tree: j.tree
        };
        return j.tree;
      },
      async read(path) {
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
        return r.text();
      },
      async commit(changes, message, parent) {
        const j = await call('__setup/batch', {
          parent,
          message,
          author: o.author?.() || '',
          changes
        });
        last = null;
        return j.head;
      },
      ...(o.exchange ? {
        exchange: () => call('__setup/sync', {
          author: o.author?.() || ''
        })
      } : {})
    };
  }
  /** Page servie par un lanceur ? { data, dataGit } ; null sinon (site, appli, fichier). */
  launcher.detect = async () => {
    if (!/^https?:$/.test(location.protocol)) return null;
    try {
      const j = await call('__setup/status');
      return j?.server ? {
        data: !!j.data,
        dataGit: !!j.dataGit
      } : null;
    } catch {
      return null;
    }
  };
  FD.launcher = launcher;
})();
