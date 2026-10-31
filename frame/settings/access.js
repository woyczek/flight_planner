(() => {
  'use strict';
  // V3 — Réglages, accès et transport (frame/settings/SPEC.md § 3.6, 3.7) : la carte Accès d'un appareil sans lanceur
  // (dépôt GitHub, branche, jeton jamais réaffiché ; tester ; couper l'accès) et la carte Synchronisation (dernière réussite,
  // écritures en attente, réseau, dernière erreur ; « Synchroniser maintenant »), vivante par FD.onStatus.
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
    // accès
    repo: ['Dépôt (compte/dépôt GitHub, ou adresse d’un projet GitLab)',
      'Repository (GitHub account/repository, or the address of a GitLab project)',
      'Repository (GitHub-Konto/Repository oder Adresse eines GitLab-Projekts)',
      'Repositorio (cuenta/repositorio de GitHub, o dirección de un proyecto GitLab)'
    ],
    // fournisseur GitLab (configuration reçue ou accès de l'appareil) : champ du dépôt et aide du jeton
    repoGl: ['Adresse du projet GitLab', 'GitLab project address', 'Adresse des GitLab-Projekts', 'Dirección del proyecto GitLab'],
    tokenHintGl: [
      'GitLab : collez l’adresse du projet et le jeton d’accès de projet que l’administrateur vous a donné (rôle Developer, portée api) ; il n’est envoyé qu’à cette instance. Gardé sur cet appareil seulement, jamais réaffiché ; ne le collez dans aucun message.',
      'GitLab: paste the project’s address and the project access token the administrator gave you (Developer role, api scope); it is sent to that instance only. Kept on this device only, never shown again; never paste it in a message.',
      'GitLab: Adresse des Projekts und das Projektzugangstoken einfügen, das der Administrator Ihnen gegeben hat (Rolle Developer, Umfang api); es wird nur an diese Instanz gesendet. Nur auf diesem Gerät gespeichert, nie wieder angezeigt; in keine Nachricht einfügen.',
      'GitLab: pegue la dirección del proyecto y el token de acceso de proyecto que le dio el administrador (rol Developer, alcance api); solo se envía a esa instancia. Guardado solo en este dispositivo, nunca se vuelve a mostrar; no lo pegue en ningún mensaje.'
    ],
    branch: ['Branche', 'Branch', 'Zweig', 'Rama'],
    token: ['Jeton personnel', 'Personal token', 'Persönliches Token', 'Token personal'],
    tokenSet: ['Jeton enregistré sur cet appareil (jamais réaffiché) : le remplacer, le coller de nouveau ci-dessus.',
      'Token saved on this device (never shown again): to replace it, paste it again above.',
      'Token auf diesem Gerät gespeichert (nie wieder angezeigt): zum Ersetzen oben erneut einfügen.',
      'Token guardado en este dispositivo (nunca se vuelve a mostrar): para sustituirlo, péguelo de nuevo arriba.'
    ],
    tokenHint: [
      'GitHub : jeton personnel « classique » avec la case « repo » pour le dépôt d’un utilisateur, à grain fin (ce seul dépôt, « Contents » en lecture et écriture) pour celui d’une organisation ; un an au plus. GitLab (gitlab.com, framagit…) : collez l’adresse du projet et le jeton d’accès de projet que l’administrateur vous a donné, il n’est envoyé qu’à cette instance. Gardé sur cet appareil seulement, jamais réaffiché ; ne le collez dans aucun message.',
      'GitHub: a “classic” personal token with the “repo” box for a user’s repository, fine-grained (this repository only, “Contents” read and write) for an organisation’s; one year at most. GitLab (gitlab.com, framagit…): paste the project’s address and the project access token the administrator gave you, it is sent to that instance only. Kept on this device only, never shown again; never paste it in a message.',
      'GitHub: persönliches Token „klassisch“ mit dem Kästchen „repo“ für das Repository eines Benutzers, feingranular (nur dieses Repository, „Contents“ lesen und schreiben) für das einer Organisation; höchstens ein Jahr. GitLab (gitlab.com, framagit…): Adresse des Projekts und das Projektzugangstoken einfügen, das der Administrator Ihnen gegeben hat; es wird nur an diese Instanz gesendet. Nur auf diesem Gerät gespeichert, nie wieder angezeigt; in keine Nachricht einfügen.',
      'GitHub: token personal «clásico» con la casilla «repo» para el repositorio de un usuario, de grano fino (solo este repositorio, «Contents» lectura y escritura) para el de una organización; un año como máximo. GitLab (gitlab.com, framagit…): pegue la dirección del proyecto y el token de acceso de proyecto que le dio el administrador; solo se envía a esa instancia. Guardado solo en este dispositivo, nunca se vuelve a mostrar; no lo pegue en ningún mensaje.'
    ],
    accessRead: [
      'Sans échange coché, l’accès ne sert qu’à lire les bases aéronautiques et des appareils publiées dans le dépôt des données : rien n’est envoyé.',
      'With no exchange ticked, the access only reads the aeronautical and aircraft bases published in the data repository: nothing is sent.',
      'Ohne angekreuzten Austausch dient der Zugang nur zum Lesen der im Datenrepository veröffentlichten Luftfahrt- und Flugzeugdaten: Es wird nichts gesendet.',
      'Sin intercambio marcado, el acceso solo sirve para leer las bases aeronáuticas y de aeronaves publicadas en el repositorio de datos: no se envía nada.'
    ],
    testOk: ['Dépôt joignable, branche {b} trouvée.', 'Repository reachable, branch {b} found.',
      'Repository erreichbar, Zweig {b} gefunden.',
      'Repositorio accesible, rama {b} encontrada.'
    ],
    newTarget: ['Nouvel hôte ou nouveau dépôt : {h} — collez le jeton pour celui-ci (l’ancien jeton n’y est jamais envoyé).',
      'New host or new repository: {h} — paste the token for it (the previous token is never sent there).',
      'Neuer Host oder neues Repository: {h} — fügen Sie das Token dafür ein (das bisherige Token wird nie dorthin gesendet).',
      'Nuevo alojamiento o nuevo repositorio: {h} — pegue el token para este (el token anterior nunca se envía allí).'
    ],
    needRepo: ['Dépôt et jeton nécessaires.', 'Repository and token needed.', 'Repository und Token nötig.',
      'Repositorio y token necesarios.'
    ],
    cut: ['Couper l’accès', 'Cut access', 'Zugang trennen', 'Cortar el acceso'],
    cutAsk: [
      'Couper l’accès ? Le jeton est effacé de cet appareil ; vos écritures en attente restent ici et partiront quand l’accès sera de nouveau réglé. Téléphone perdu ou volé : supprimez aussi le jeton chez l’hébergeur du dépôt (github.com, gitlab.com…).',
      'Cut access? The token is erased from this device; your pending writes stay here and will leave once access is set again. Lost or stolen phone: also delete the token at the repository’s host (github.com, gitlab.com…).',
      'Zugang trennen? Das Token wird von diesem Gerät gelöscht; ausstehende Änderungen bleiben hier und gehen hinaus, sobald der Zugang wieder eingestellt ist. Telefon verloren oder gestohlen: das Token auch beim Anbieter des Repositorys löschen (github.com, gitlab.com…).',
      '¿Cortar el acceso? El token se borra de este dispositivo; sus escrituras pendientes se quedan aquí y saldrán cuando el acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en el alojamiento del repositorio (github.com, gitlab.com…).'
    ],
    cutDone: ['Accès coupé : jeton effacé de cet appareil.', 'Access cut: token erased from this device.',
      'Zugang getrennt: Token von diesem Gerät gelöscht.', 'Acceso cortado: token borrado de este dispositivo.'
    ],
    // synchronisation
    sync: ['Synchronisation', 'Synchronisation', 'Synchronisation', 'Sincronización'],
    syncHint: [
      'Automatique au démarrage, toutes les 10 minutes en ligne et au retour du réseau ; vos écritures partent ensemble, en un envoi.',
      'Automatic at start, every 10 minutes online and when the network comes back; your writes leave together, in one sending.',
      'Automatisch beim Start, alle 10 Minuten online und bei Rückkehr des Netzes; Ihre Änderungen gehen zusammen, in einem Versand.',
      'Automática al inicio, cada 10 minutos en línea y al volver la red; sus escrituras salen juntas, en un envío.'
    ],
    last: ['Dernière réussie', 'Last success', 'Zuletzt erfolgreich', 'Última correcta'],
    never: ['jamais', 'never', 'nie', 'nunca'],
    pending: ['En attente', 'Pending', 'Ausstehend', 'Pendiente'],
    // écritures en attente (FD.status().queue) : chemin, module, heure, ✕ pour une suppression
    queue: ['Écritures en attente', 'Pending writes', 'Ausstehende Änderungen', 'Escrituras pendientes'],
    queueDel: ['suppression', 'deletion', 'Löschung', 'eliminación'],
    queueMore: ['… et {n} de plus', '… and {n} more', '… und {n} weitere', '… y {n} más'],
    lastError: ['Dernière erreur', 'Last error', 'Letzter Fehler', 'Último error'],
    network: ['Réseau', 'Network', 'Netz', 'Red'],
    online: ['en ligne', 'online', 'online', 'en línea'],
    offline: ['hors ligne', 'offline', 'offline', 'sin conexión'],
    syncNow: ['Synchroniser maintenant', 'Synchronise now', 'Jetzt synchronisieren', 'Sincronizar ahora'],
    // l'adresse du dépôt saisie, lue avant toute écriture (SogConfig.normalizeRepo)
    repoIncomplete: [
      'Adresse incomplète : hôte/compte/dépôt (par exemple gitlab.com/groupe/projet ou github.com/compte/dépôt). Rien n’est enregistré.',
      'Incomplete address: host/account/repository (for example gitlab.com/group/project or github.com/account/repository). Nothing is saved.',
      'Unvollständige Adresse: Host/Konto/Repository (zum Beispiel gitlab.com/gruppe/projekt oder github.com/konto/repository). Nichts wird gespeichert.',
      'Dirección incompleta: host/cuenta/repositorio (por ejemplo gitlab.com/grupo/proyecto o github.com/cuenta/repositorio). No se guarda nada.'
    ],
    repoProvider: ['Fournisseur : {p} — {u}', 'Provider: {p} — {u}', 'Anbieter: {p} — {u}', 'Proveedor: {p} — {u}'],
    // un GitLab hors de la table (gitlab.com, framagit.org) : la page sans lanceur ne le contacte pas (CSP), le lanceur ou le relais oui
    repoOtherGitlab: [
      'Cet appareil ne peut contacter que les fournisseurs prévus par la page (gitlab.com, framagit.org) ; un autre GitLab marche par le lanceur ou le relais.',
      'This device can only reach the providers the page allows (gitlab.com, framagit.org); another GitLab works through the launcher or the relay.',
      'Dieses Gerät erreicht nur die von der Seite vorgesehenen Anbieter (gitlab.com, framagit.org); ein anderes GitLab funktioniert über den Starter oder das Relais.',
      'Este dispositivo solo puede contactar con los proveedores previstos por la página (gitlab.com, framagit.org); otro GitLab funciona a través del lanzador o del relé.'
    ],
    conflicts: ['Voir les conflits ({n})', 'See the conflicts ({n})', 'Konflikte ansehen ({n})', 'Ver los conflictos ({n})'],
  });

  /** Carte Accès sans lanceur : dépôt GitHub ou projet GitLab, branche et jeton de l'appareil (sans échange coché : lecture des
   *  bases). Fournisseur GitLab (accès de l'appareil, ou configuration reçue) : le champ attend l'adresse du projet et l'aide
   *  est celle du jeton de projet ; GitHub (ou rien) : comme avant. */
  function accessHtml(env) {
    const {
      t,
      gh,
      jd,
      exchange,
      fld
    } = env;
    const gl = SogConfig.kind(gh?.provider ? gh : jd || {}) === 'gitlab',
      table = SogConfig.PROVIDER_TABLE,
      ph = gl ? (jd && !gh ? SogConfig.webUrl(jd) : table.gitlab.placeholder) : table.github.placeholder;
    return `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2>${exchange ? '' : `<p class="f-muted">${esc(t(T.accessRead))}</p>`}
        ${fld('repo', gl ? T.repoGl : T.repo, SogConfig.repoField(gh), { ph })}<p class="f-muted" data-repo-provider aria-live="polite"></p><p class="f-warn" data-repo-warn hidden></p>${fld('branch', T.branch, gh?.branch || 'main')}${fld('token', T.token, '', { type: 'password', ph: gh ? t(T.tokenSet) : '' })}
        ${gh?.token ? `<p data-token-set>${esc(t(T.tokenSet))}</p>` : ''}<p class="f-muted">${esc(t(gl ? T.tokenHintGl : T.tokenHint))}</p><p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="access">${esc(t(T.save))}</button><button type="button" data-act="test">${esc(t(T.test))}</button>${gh ? `<button type="button" data-act="cut">${esc(t(T.cut))}</button>` : ''}</div></div>`;
  }
  /** Carte Synchronisation : montrée si un échange est coché ou tant que des écritures attendent (suit l'état). */
  function syncHtml(env) {
    const {
      t,
      exchange,
      st
    } = env;
    return `<div class="f-card" data-card="sync"${exchange || st.pending ? '' : ' hidden'}><h2>${esc(t(T.sync))}</h2><dl class="f-dl" data-sync></dl><div data-queue></div><p class="f-muted">${esc(t(T.syncHint))}</p>
        <div class="f-row"><button type="button" class="primary" data-act="sync">${esc(t(T.syncNow))}</button>${st.conflicts ? `<a href="#conflicts">${esc(t(T.conflicts, { n: st.conflicts }))}</a>` : ''}</div></div>`;
  }
  /** Synchronisation vivante : chiffres et écritures en attente, redessinés à chaque changement d'état. */
  function live(env) {
    const {
      view,
      c,
      t,
      FD,
      exchange,
      st,
      mods
    } = env;
    // le fournisseur de l'adresse en cours de frappe, dit sous le champ avant l'enregistrement (ou la raison du refus)
    const repoIn = view.querySelector('[data-card="access"] [data-f="repo"]'),
      repoLine = view.querySelector('[data-card="access"] [data-repo-provider]');
    /** Écrit sous le champ du dépôt le fournisseur et l'adresse canonique de la saisie, ou ce qui manque ; rien pour un champ vide. */
    const paintRepo = () => {
      if (!repoIn || !repoLine) return;
      const v = repoIn.value.trim(),
        n = v ? SogConfig.normalizeRepo(v, env.known || []) : null;
      repoLine.textContent = !n ? '' : n.ok ? t(T.repoProvider, {
        p: SogConfig.PROVIDER_TABLE[n.provider].label,
        u: n.url
      }) : t(n.error === 'provider' ? T.providerUnknown : T.repoIncomplete);
      repoLine.dataset.state = !n ? '' : n.ok ? n.provider : n.error;
      // un GitLab hors des hôtes publics de la table : averti, jamais refusé (le lanceur ou le relais le joignent)
      const warn = view.querySelector('[data-card="access"] [data-repo-warn]'),
        other = !!n?.ok && n.provider === 'gitlab' && !SogConfig.PROVIDER_TABLE.gitlab.hosts.includes(n.host);
      if (warn) {
        warn.hidden = !other;
        warn.textContent = other ? t(T.repoOtherGitlab) : '';
      }
    };
    repoIn?.addEventListener('input', paintRepo);
    paintRepo();
    /** Redessine la carte de synchronisation d'après l'état du transport. */
    const paintSync = s => {
      const dl = view.querySelector('[data-sync]');
      if (!dl) return;
      dl.innerHTML = [
        [T.last, s.lastSync ? c.time.fmtDateZ(s.lastSync) : t(T.never)],
        [T.pending, String(s.pending || 0)],
        [T.network, t(s.online === false ? T.offline : T.online)],
        ...(s.lastError ? [
          [T.lastError, s.lastError]
        ] : [])
      ].map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('');
      // les écritures en attente, les plus récentes d'abord (20 au plus) : chemin, module, heure ; ✕ : suppression ; heures
      // de l'appli en UTC avec Z (frame/lib/time.js) : l'heure seule le jour même (UTC), sinon la date et l'heure
      const box = view.querySelector('[data-queue]'),
        q = s.queue || [],
        day = new Date().toISOString().slice(0, 10),
        when = at => String(at || '').slice(0, 10) === day ? c.time.fmtZ(at) : c.time.fmtDateZ(at),
        modName = id => t(mods.find(m => m.id === id)?.label || [id || '?']);
      if (box) box.closest('[data-card]').hidden = !exchange && !q.length;
      if (box) box.innerHTML = !q.length ? '' : `<h3>${esc(t(T.queue))}</h3><ul class="f-queue">${q.slice(0, 20).map(x => `<li>${x.deletion ? `<span aria-label="${esc(t(T.queueDel))}" title="${esc(t(T.queueDel))}">✕</span> ` : ''}<code>${esc(x.path)}</code> <span class="f-muted">${esc([modName(x.module), when(x.at)].filter(Boolean).join(' · '))}</span></li>`).join('')}${q.length > 20 ? `<li class="f-muted">${esc(t(T.queueMore, { n: q.length - 20 }))}</li>` : ''}</ul>`;
    };
    paintSync(st);
    const off = FD.onStatus(s => view.isConnected ? paintSync(s) : off?.());
  }
  /** Actions des cartes Accès (sans lanceur) et Synchronisation. */
  async function run(env, act, b, e) {
    const {
      c,
      t,
      FD,
      gh,
      card,
      val,
      say,
      again
    } = env;
    /** Ce que le jeton GitLab dit de lui (§ 10.36, whoami du transport) en avertissements à lire dans le message de la carte, jamais un refus : un jeton personnel, une expiration absente ou à plus d'un an, des droits en trop ;
     *  vide pour un jeton de projet en règle, pour un autre fournisseur, ou quand la lecture échoue (le test et l'enregistrement disent déjà leurs échecs). */
    const warnings = async cfg => {
      if (cfg.provider !== 'gitlab') return [];
      try {
        const who = await FD.gitlab(cfg).whoami();
        return [...(who.bot === true ? [] : [t(T.tokenPersonal)]), ...window.SogSettingsKit.tokenWarnings(t, who)];
      } catch {
        return [];
      }
    };
    if (act === 'access' || act === 'test') {
      const r = card('access'),
        // l'adresse saisie, normalisée d'abord : illisible ou sans fournisseur connu, refusée et rien n'est écrit
        n = SogConfig.normalizeRepo(val('repo', r), env.known || []);
      if (!n.ok) return say('access', t(n.error === 'provider' ? T.providerUnknown : T.repoIncomplete));
      // adresse d'un projet : l'instance et son api en viennent ; le jeton enregistré n'est repris que pour la même
      // cible (FD.github.resolve : fournisseur, origine de l'API, projet), jamais vers un nouvel hôte
      const cfg = FD.github.resolve({
        repo: n.value,
        branch: val('branch', r) || 'main',
        token: val('token', r),
        ...(gh?.api && gh.provider !== 'gitlab' ? {
          api: gh.api
        } : {})
      });
      if (!cfg.repo) return say('access', t(T.needRepo));
      if (!cfg.token) return say('access', gh ? t(T.newTarget, {
        h: cfg.newTarget
      }) : t(T.needRepo));
      if (act === 'test') {
        say('access', '…', 'ok');
        try {
          await FD.github(cfg).head();
          const warn = await warnings(cfg);
          return say('access', [t(T.testOk, {
            b: cfg.branch
          }), ...warn].join(' '), warn.length ? 'warn' : 'ok');
        } catch (err) {
          return say('access', err?.offline ? t(T.testOffline) : err?.message || String(err), err?.offline ? 'warn' : 'err');
        }
      }
      const warn = await warnings(
        cfg); // dit après l'enregistrement : jamais bloquant (seul avec son dépôt, un jeton personnel est le bon)
      FD.github.save(cfg);
      await c.reload();
      // la première synchronisation sur le nouveau dépôt, proposée par le bouton de la notification (jamais une fenêtre bloquante)
      c.notify(t(T.saved), 'ok', {
        action: {
          label: t(T.syncNow),
          run: () => c.syncNow()
        }
      });
      await again();
      if (warn.length) say('access', warn.join(' '), 'warn');
      return;
    }
    if (act === 'cut') {
      if (!await c.ask(t(T.cutAsk))) return;
      await c.cutAccess();
      c.notify(t(T.cutDone), 'ok');
      return again();
    }
    if (act === 'sync') return c.syncNow();
  }

  (window.SogSettingsParts ||= {}).access = {
    acts: ['access', 'test', 'cut', 'sync'],
    accessHtml,
    syncHtml,
    live,
    run
  };
})();
