(() => {
  'use strict';
  // V3 — Réglages, diagnostic (frame/settings/SPEC.md § 3.10) : la carte À propos (aide, feuille de route, diagnostic
  // replié), les lignes lisibles du diagnostic du cadre et le JSON complet à copier pour signaler un problème (jamais de
  // jeton ni de clé).
  const {
    ROOT,
    esc,
    now,
    T,
    setup,
    copy,
    sameRepo,
    confirmOpen,
    AIRLINE,
    airlineDoc,
    howtoHtml
  } = window.SogSettingsKit;
  // textes de ce fichier, ajoutés aux textes communs des Réglages (window.SogSettingsT)
  Object.assign(T, {
    // diagnostic
    about: ['À propos', 'About', 'Über', 'Acerca de'],
    aboutHelp: ['Aide : le manuel de l’appli', 'Help: the app’s manual', 'Hilfe: das Handbuch der App',
      'Ayuda: el manual de la aplicación'
    ],
    aboutRoadmap: ['Feuille de route : ce qui est livré, en cours, prévu', 'Roadmap: what is delivered, in progress, planned',
      'Fahrplan: was geliefert, in Arbeit, geplant ist', 'Hoja de ruta: lo entregado, en curso, previsto'
    ],
    diag: ['Diagnostic', 'Diagnostics', 'Diagnose', 'Diagnóstico'],
    diagHint: ['« Copier » met tout dans le presse-papiers : collez-le dans votre message pour signaler un problème.',
      '“Copy” puts everything on the clipboard: paste it in your message to report a problem.',
      '„Kopieren“ legt alles in die Zwischenablage: Fügen Sie es in Ihre Nachricht ein, um ein Problem zu melden.',
      '«Copiar» lo pone todo en el portapapeles: péguelo en su mensaje para señalar un problema.'
    ],
    // lignes du diagnostic (valeurs brutes)
    dg: {
      transport: ['Transport', 'Transport', 'Transport', 'Transporte'],
      online: ['En ligne', 'Online', 'Online', 'En línea'],
      lastSync: ['Dernière synchro réussie', 'Last successful sync', 'Letzte erfolgreiche Synchronisation',
        'Última sincronización correcta'
      ],
      pending: ['Écritures en attente', 'Pending writes', 'Ausstehende Änderungen', 'Escrituras pendientes'],
      pageSecure: ['Page : contexte sûr', 'Page: secure context', 'Seite: sicherer Kontext', 'Página: contexto seguro'],
      pageOffline: ['Hors ligne', 'Offline use', 'Offline-Betrieb', 'Uso sin conexión'],
      lanHost: ['Lanceur', 'Launcher', 'Starter', 'Lanzador'],
      lastError: ['Dernière erreur', 'Last error', 'Letzter Fehler', 'Último error'],
      treeHead: ['Arbre du dépôt : tête', 'Repository tree: head', 'Repository-Baum: Kopf', 'Árbol del repositorio: cabeza'],
      treeAt: ['Arbre du dépôt : lu le', 'Repository tree: read at', 'Repository-Baum: gelesen am',
        'Árbol del repositorio: leído el'
      ],
      treeFiles: ['Arbre du dépôt : fichiers', 'Repository tree: files', 'Repository-Baum: Dateien',
        'Árbol del repositorio: ficheros'
      ],
      treeChecked: ['Arbre du dépôt : vérifié', 'Repository tree: checked', 'Repository-Baum: geprüft',
        'Árbol del repositorio: comprobado'
      ],
      refKnown: ['Références connues', 'Known references', 'Bekannte Referenzen', 'Referencias conocidas'],
      refSia: ['Références SIA', 'SIA references', 'SIA-Referenzen', 'Referencias SIA'],
      refAircraft: ['Références appareils', 'Aircraft references', 'Flugzeugreferenzen', 'Referencias de aeronaves'],
      refCached: ['Références en cache', 'Cached references', 'Referenzen im Cache', 'Referencias en caché'],
      lastReadError: ['Dernière erreur de lecture', 'Last read error', 'Letzter Lesefehler', 'Último error de lectura'],
      aeroSource: ['Base aéro : source', 'Aero base: source', 'Luftfahrtbasis: Quelle', 'Base aeronáutica: fuente'],
      aeroZones: ['Base aéro : zones publiées', 'Aero base: published zones', 'Luftfahrtbasis: veröffentlichte Zonen',
        'Base aeronáutica: zonas publicadas'
      ],
      aeroLoaded: ['Base aéro : zones ouvertes', 'Aero base: open zones', 'Luftfahrtbasis: geöffnete Zonen',
        'Base aeronáutica: zonas abiertas'
      ],
      aeroMissing: ['Base aéro : zones manquantes', 'Aero base: missing zones', 'Luftfahrtbasis: fehlende Zonen',
        'Base aeronáutica: zonas ausentes'
      ],
      aeroError: ['Base aéro : erreur', 'Aero base: error', 'Luftfahrtbasis: Fehler', 'Base aeronáutica: error']
    },
    yes: ['oui', 'yes', 'ja', 'sí'],
    no: ['non', 'no', 'nein', 'no'],
    offActive: ['actif', 'active', 'aktiv', 'activo'],
    offWaiting: ['pas encore actif', 'not yet active', 'noch nicht aktiv', 'aún no activo'],
    offNone: ['impossible : page en http hors de ce poste (il faut https ou le poste lui-même)',
      'impossible: page over http outside this computer (https or the computer itself is needed)',
      'nicht möglich: Seite über http außerhalb dieses Rechners (https oder der Rechner selbst nötig)',
      'imposible: página en http fuera de este equipo (se necesita https o el propio equipo)'
    ],
    viaLan: ['{h}, par le réseau local', '{h}, through the local network', '{h}, über das lokale Netz', '{h}, por la red local'],
    viaHere: ['{h}, ce poste', '{h}, this computer', '{h}, dieser Rechner', '{h}, este equipo'],
    copied: ['Diagnostic copié.', 'Diagnostics copied.', 'Diagnose kopiert.', 'Diagnóstico copiado.'],
  });

  /** Lignes lisibles du diagnostic du cadre (libellés traduits, valeurs brutes) ; absent : « — ». */
  function paintDiag(dl, d, t) {
    if (!dl) return;
    /** Valeur brute lisible : tiret si vide, liste jointe, objet en JSON. */
    const raw = v => v == null || v === '' ? '—' : Array.isArray(v) ? (v.length ? v.join(', ') : '—') : typeof v === 'object' ? JSON
      .stringify(v) : String(v);
    const tr = d.tree || {},
      pg = d.page || {},
      rf = d.references || {},
      ae = d.aerodb || {};
    const rows = [
      ['transport', d.transport],
      ['online', d.online],
      ['lastSync', d.lastSync],
      ['pending', d.pending],
      ['pageSecure', pg.secure == null ? null : t(pg.secure ? T.yes : T.no)],
      ['pageOffline', !pg.offline ? null : t(pg.offline === 'active' ? T.offActive : /^unavailable/.test(pg.offline) ? T.offNone : T
        .offWaiting)],
      ['lanHost', pg.launcher ? t(pg.launcher.lan ? T.viaLan : T.viaHere, {
        h: pg.launcher.host || '?'
      }) : null],
      ['lastError', d.lastError || d.error],
      ['treeHead', tr.head],
      ['treeAt', tr.at],
      ['treeFiles', tr.files],
      ['treeChecked', tr.checked],
      ['refKnown', rf.known],
      ['refSia', rf.sia],
      ['refAircraft', rf.aircraft],
      ['refCached', rf.cached],
      ['lastReadError', d.lastReadError],
      ['aeroSource', ae.source],
      ['aeroZones', ae.zones],
      ['aeroLoaded', ae.loaded],
      ['aeroMissing', ae.missing],
      ['aeroError', ae.error]
    ];
    dl.innerHTML = rows.map(([k, v]) => `<dt>${esc(t(T.dg[k]))}</dt><dd>${esc(raw(v))}</dd>`).join('');
  }

  /** Carte À propos : liens vers l'aide et la feuille de route, puis le diagnostic replié et « Copier ». */
  function aboutHtml(env) {
    const {
      t
    } = env;
    return `<div class="f-card" data-card="about"><h2>${esc(t(T.about))}</h2><p><a href="#help?m=settings">${esc(t(T.aboutHelp))}</a></p><p><a href="#roadmap">${esc(t(T.aboutRoadmap))}</a></p>
      <details data-diagbox><summary>${esc(t(T.diag))}</summary><dl class="f-dl" data-diag></dl><p class="f-muted">${esc(t(T.diagHint))}</p><div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button></div></details></div>`;
  }
  /** Diagnostic du cadre : lignes lisibles et JSON complet (env.diagJson) ; est : estimation du stockage, déjà lue. */
  async function live(env, est) {
    const {
      view,
      c,
      t,
      gh
    } = env;
    const dg = c.diagnostic ? await c.diagnostic().catch(e => ({
      error: e?.message || String(e)
    })) : {};
    env.diagJson = JSON.stringify({
      at: now(),
      app: 'pilot',
      ...dg,
      usages: c.usages(),
      launcher: c.launcher(),
      github: gh ? {
        repo: gh.repo,
        branch: gh.branch
      } : null,
      storage: est ? {
        usage: est.usage,
        quota: est.quota,
        persisted: await navigator.storage?.persisted?.().catch(() => null) ??
          null // le navigateur a-t-il promis de ne pas effacer
      } : null,
      online: navigator.onLine,
      agent: navigator.userAgent
    }, null, 1);
    paintDiag(view.querySelector('[data-diag]'), dg, t);
  }
  /** Actions : copier le diagnostic ; l'ouvrir depuis la carte Administration. */
  async function run(env, act, b, e) {
    const {
      view,
      c,
      t
    } = env;
    if (act === 'copy') {
      const how = await copy(env.diagJson, {
        near: b.closest('.f-row')
      });
      c.notify(t(how === 'shown' ? T.copyShown : T.copied), how === 'shown' ? 'warn' : 'ok');
    }
    if (act === 'diagOpen') {
      e.preventDefault(); // bouton de la carte Administration : le diagnostic replié de la carte À propos, ouvert
      const d = view.querySelector('[data-diagbox]');
      if (d) d.open = true;
      d?.closest('details.f-group')?.setAttribute('open', ''); // son groupe (Aide) ouvert aussi
      return d?.scrollIntoView({
        block: 'start'
      });
    }
  }

  (window.SogSettingsParts ||= {}).diagnostic = {
    acts: ['copy', 'diagOpen'],
    aboutHtml,
    live,
    run
  };
})();
