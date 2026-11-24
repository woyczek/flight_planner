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
    aboutVersion: ['Version {v} du {d}', 'Version {v} of {d}', 'Version {v} vom {d}', 'Versión {v} del {d}'],
    aboutVersionNoDate: ['Version {v}', 'Version {v}', 'Version {v}', 'Versión {v}'],
    aboutLicence: ['Licence : LICENSE.md', 'Licence: LICENSE.md', 'Lizenz: LICENSE.md', 'Licencia: LICENSE.md'],
    aboutCode: ['Le code de la suite', 'The suite’s code', 'Der Code der Suite', 'El código de la suite'],
    aboutReport: ['Signaler un problème', 'Report a problem', 'Ein Problem melden', 'Informar de un problema'],
    aboutRoadmap: ['Feuille de route : ce qui est livré, en cours, prévu', 'Roadmap: what is delivered, in progress, planned',
      'Fahrplan: was geliefert, in Arbeit, geplant ist', 'Hoja de ruta: lo entregado, en curso, previsto'
    ],
    diag: ['Diagnostic', 'Diagnostics', 'Diagnose', 'Diagnóstico'],
    diagHint: ['« Copier » met tout dans le presse-papiers : collez-le dans votre message pour signaler un problème.',
      '“Copy” puts everything on the clipboard: paste it in your message to report a problem.',
      '„Kopieren“ legt alles in die Zwischenablage: Fügen Sie es in Ihre Nachricht ein, um ein Problem zu melden.',
      '«Copiar» lo pone todo en el portapapeles: péguelo en su mensaje para señalar un problema.'
    ],
    // SOG-0430 (A2) : l'interrupteur du profil de la page pendant un gel (exception accordée par la session ergonomie sur ce fichier)
    profLabel: ['Enregistrer ce que fait la page pendant un gel', 'Record what the page does during a freeze',
      'Aufzeichnen, was die Seite bei einem Einfrieren tut',
      'Registrar lo que hace la página durante un bloqueo'
    ],
    profHint: [
      'Quand la page reste figée plus d’une seconde, les quinze fonctions les plus sollicitées (leurs noms seulement) sont gardées dans ce diagnostic, sur cet appareil ; aucune valeur, rien n’est envoyé. « Copier » les inclut avec le reste : à vous de voir où vous collez le diagnostic.',
      'When the page stays frozen for more than a second, the fifteen busiest functions (their names only) are kept in this diagnostic, on this device; no values, nothing is sent. “Copy” takes them along with the rest: mind where you paste the diagnostic.',
      'Bleibt die Seite länger als eine Sekunde eingefroren, werden die fünfzehn am stärksten beanspruchten Funktionen (nur ihre Namen) in dieser Diagnose auf diesem Gerät gespeichert; keine Werte, nichts wird gesendet. „Kopieren“ nimmt sie mit dem Rest mit: Achten Sie darauf, wo Sie die Diagnose einfügen.',
      'Cuando la página se queda bloqueada más de un segundo, las quince funciones más solicitadas (solo sus nombres) se guardan en este diagnóstico, en este dispositivo; ningún valor, no se envía nada. «Copiar» se las lleva con el resto: tenga cuidado de dónde pega el diagnóstico.'
    ],
    profUnavailable: ['Indisponible ici : cette page est servie sans l’autorisation du lanceur du poste.',
      'Not available here: this page is served without the permission of this computer’s launcher.',
      'Hier nicht verfügbar: Diese Seite wird ohne die Erlaubnis des Starters dieses Rechners geliefert.',
      'No disponible aquí: esta página se sirve sin el permiso del lanzador de este equipo.'
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
      refAircraft: ['Références aéronefs', 'Aircraft references', 'Flugzeugreferenzen', 'Referencias de aeronaves'],
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
      aeroError: ['Base aéro : erreur', 'Aero base: error', 'Luftfahrtbasis: Fehler', 'Base aeronáutica: error'],
      // SOG-0606 : les écritures que le navigateur a refusées (en mémoire chez le cadre, vidées au rechargement)
      writeFailures: ['Écritures refusées', 'Refused writes', 'Abgelehnte Schreibvorgänge', 'Escrituras rechazadas']
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
    // SOG-0606 : une entrée par écriture refusée (dix au plus) — l'heure, la tête du module, le texte brut du navigateur, le nom du fichier refusé (jamais son contenu) ;
    // le texte du navigateur n'est pas fiable : chaque morceau passe par esc(), la ligne est bâtie ici (h = déjà du HTML) ; la ligne n'existe pas quand il n'y a rien à dire
    const hhmmss = at => {
      const x = new Date(at);
      return isNaN(x) ? '' : [x.getHours(), x.getMinutes(), x.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    };
    const fails = (Array.isArray(pg.writeFailures) ? pg.writeFailures : []).slice(-10);
    if (fails.length) rows.push(['writeFailures', fails.map(f => `<span data-wf>${[hhmmss(f?.at), String(f?.head ?? '').slice(0, 80), String(f?.raw ?? '').slice(0, 200), String(f?.file ?? '').slice(0, 120)].filter(Boolean).map(x => esc(x)).join(' · ')}</span>`).join('<br>'), true]);
    dl.innerHTML = rows.map(([k, v, html]) => `<dt data-dg="${k}">${esc(t(T.dg[k]))}</dt><dd data-dg="${k}">${html ? v : esc(raw(v))}</dd>`).join('');
  }

  /** Carte À propos : liens vers l'aide et la feuille de route, puis le diagnostic replié et « Copier ». */
  function aboutHtml(env) {
    const {
      t,
      c
    } = env;
    // la version et sa date en tête (ctx.version(), le cadre : statut du lanceur ou version.json du site ; null : rien), puis la licence,
    // la feuille de route, et le dépôt du code et le signalement quand le cadre donne son adresse (web) ; l'aide n'a qu'une porte, le « ? »
    const v = c.version?.() || null,
      web = /^https:\/\/[\w.-]+\/[\w./-]+$/.test(v?.web || '') ? v.web : '',
      issues = web ? `${web}/${window.SogConfig?.providerOf?.(`${web}.git`).provider === 'github' ? 'issues/new' : '-/issues/new'}` : '',
      ver = v?.version ? `<p data-version><b>${esc(v.date ? t(T.aboutVersion, { v: v.version, d: v.date }) : t(T.aboutVersionNoDate, { v: v.version }))}</b></p>` : '',
      code = web ? `<p><a href="${esc(web)}" target="_blank" rel="noopener" data-code>${esc(t(T.aboutCode))}</a> · <a href="${esc(issues)}" target="_blank" rel="noopener" data-report>${esc(t(T.aboutReport))}</a></p>` : '';
    const prof = c.profiler?.(),
      profile = !prof ? '' : `<p class="f-row" data-profiler><label><input type="checkbox" data-act="profiler"${prof.state === 'unavailable' ? ' disabled' : ''}${prof.state === 'off' ? '' : prof.state === 'unavailable' ? '' : ' checked'}> ${esc(t(T.profLabel))}</label></p><p class="f-muted" data-profiler-hint>${esc(t(prof.state === 'unavailable' ? T.profUnavailable : T.profHint))}</p>`;
    return `<div class="f-card" data-card="about"><h2>${esc(t(T.about))}</h2>${ver}<p><a href="#help?d=licence" data-licence>${esc(t(T.aboutLicence))}</a></p>${code}<p><a href="#roadmap">${esc(t(T.aboutRoadmap))}</a></p>
      <details data-diagbox><summary>${esc(t(T.diag))}</summary><dl class="f-dl" data-diag></dl><p class="f-muted">${esc(t(T.diagHint))}</p>${profile}<div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button></div></details></div>`;
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
    if (act === 'profiler') c.setProfiler?.(!!b
      .checked); // l'interrupteur : localStorage de CE navigateur, rien d'écrit dans les données
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
    acts: ['copy', 'diagOpen', 'profiler'],
    aboutHtml,
    live,
    run
  };
})();
