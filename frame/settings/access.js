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
    // écritures en attente (sync_summary.js) : ✕ pour une suppression, « … et n de plus »
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
    return `<div class="f-card" data-card="sync"${exchange || st.pending ? '' : ' hidden'}><h2>${esc(t(T.sync))}</h2><p data-sync-head></p><dl class="f-dl" data-sync></dl><div data-sync-timings-box></div><div data-queue></div><div data-pushed-box></div><p class="f-muted">${esc(t(T.syncHint))}</p>
        <div class="f-row"><button type="button" class="primary" data-act="sync">${esc(t(T.sendAll))}</button>${st.conflicts ? `<a href="#conflicts">${esc(t(T.conflicts, { n: st.conflicts }))}</a>` : ''}</div></div>`;
  }
  /** Synchronisation vivante : chiffres et écritures en attente, redessinés à chaque changement d'état. */
  function live(env) {
    const {
      view,
      c,
      t,
      FD,
      exchange,
      st
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
        [T.network, t(s.online === false ? T.offline : T.online)],
        ...(s.lastError ? [
          [T.lastError, s.lastError]
        ] : [])
      ].map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('');
      // la tête (un compte par sorte) et les listes repliées des éléments qui attendent : la synthèse (sync_summary.js)
      window.SogSyncSummary?.paint(env, s);
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

  // ---- Compagnie (V3_SPECIFICATION § 10.38 étape 1, SOG-0039) : le choix de la compagnie courante parmi celles de data/airline/index.json et « Personnel », et « Ajouter une compagnie ».
  // Chaque fichier lu de data/airline/ est une entrée non fiable (§ 10.36) : codes ^[a-z0-9]{2,8}$, noms par esc(), au plus AIRLINE_MAX compagnies, réseaux par liste fermée, flotte en nombre borné.
  const AIRLINE_CODE = /^[a-z0-9]{2,8}$/,
    AIRLINE_MAX = 20,
    AIRLINE_NETWORKS = ['ivao', 'vatsim', 'offline'],
    PERSO = 'perso',
    INDEX = 'airline/index.json';
  const TA = {
    title: ['Compagnie de cet appareil', 'This device’s airline', 'Fluggesellschaft dieses Geräts', 'Compañía de este dispositivo'],
    hint: [
      'La compagnie courante de cet appareil : les missions, le compte rendu et la flotte lisent celle-ci. Le choix est propre à l’appareil.',
      'This device’s current airline: the missions, the report and the fleet read this one. The choice is per device.',
      'Die aktuelle Fluggesellschaft dieses Geräts: Missionen, Bericht und Flotte lesen diese. Die Wahl gilt pro Gerät.',
      'La compañía actual de este dispositivo: las misiones, el informe y la flota leen esta. La elección es por dispositivo.'
    ],
    perso: ['Personnel', 'Personal', 'Persönlich', 'Personal'],
    // un nom avec ses deux formes par langue (fr, en, de, es) : le nombre l'accorde (frame/lib/plural.js), jamais « (s) »
    noun: {
      aircraft: [
        ['appareil', 'appareils'],
        ['aircraft', 'aircraft'],
        ['Luftfahrzeug', 'Luftfahrzeuge'],
        ['aeronave', 'aeronaves']
      ],
      theme: [
        ['thème', 'thèmes'],
        ['theme', 'themes'],
        ['Thema', 'Themen'],
        ['tema', 'temas']
      ],
      operator: [
        ['opérateur', 'opérateurs'],
        ['operator', 'operators'],
        ['Betreiber', 'Betreiber'],
        ['operador', 'operadores']
      ]
    },
    unavailable: ['Le choix n’est pas encore disponible dans ce cadre.', 'Choosing is not yet available in this frame.',
      'Die Auswahl ist in diesem Rahmen noch nicht verfügbar.', 'La elección aún no está disponible en este marco.'
    ],
    none: ['Aucune compagnie dans data/airline/index.json : ajoutez-en une.', 'No airline in data/airline/index.json: add one.',
      'Keine Fluggesellschaft in data/airline/index.json: Fügen Sie eine hinzu.',
      'Ninguna compañía en data/airline/index.json: añada una.'
    ],
    add: ['Créer une compagnie', 'Create an airline', 'Fluggesellschaft anlegen', 'Crear una compañía'],
    join: ['Rejoindre une compagnie', 'Join an airline', 'Einer Fluggesellschaft beitreten', 'Unirse a una compañía'],
    jnHint: [
      'Copiez la page « Flotte » du site de la compagnie et collez-la ici : elle est lue sur cet appareil, et ce qu’elle contient vous est montré avant que rien ne soit écrit.',
      'Copy the “Fleet” page of the airline’s website and paste it here: it is read on this device, and what it holds is shown to you before anything is written.',
      'Kopieren Sie die Seite „Flotte“ der Webseite der Gesellschaft und fügen Sie sie hier ein: Sie wird auf diesem Gerät gelesen, und ihr Inhalt wird gezeigt, bevor etwas geschrieben wird.',
      'Copie la página «Flota» del sitio de la compañía y péguela aquí: se lee en este dispositivo y se le muestra lo que contiene antes de escribir nada.'
    ],
    jnPage: ['Collez la page de la flotte', 'Paste the fleet page', 'Seite der Flotte einfügen', 'Pegue la página de la flota'],
    jnClip: ['Lire le presse-papiers', 'Read the clipboard', 'Zwischenablage lesen', 'Leer el portapapeles'],
    jnRead: ['Lire la page', 'Read the page', 'Seite lesen', 'Leer la página'],
    jnGo: ['Rejoindre', 'Join', 'Beitreten', 'Unirse'],
    jnEmpty: ['Collez d’abord la page de la flotte.', 'Paste the fleet page first.', 'Fügen Sie zuerst die Seite der Flotte ein.',
      'Pegue primero la página de la flota.'
    ],
    jnNone: ['Aucun appareil lu : collez la page « Flotte » du site (le tableau des appareils).',
      'No aircraft read: paste the “Fleet” page of the website (the table of aircraft).',
      'Kein Luftfahrzeug gelesen: Fügen Sie die Seite „Flotte“ der Webseite ein (die Tabelle der Luftfahrzeuge).',
      'Ningún avión leído: pegue la página «Flota» del sitio (la tabla de aeronaves).'
    ],
    jnCounts: ['{a} · {b}', '{a} · {b}', '{a} · {b}', '{a} · {b}'],
    jnSite: ['Adresse du site (facultatif, pour la relire plus tard)', 'Website address (optional, to read it again later)',
      'Adresse der Webseite (optional, zum späteren erneuten Lesen)', 'Dirección del sitio (opcional, para releerla más tarde)'
    ],
    jnBadSite: ['Adresse refusée : une adresse https:// de 200 signes au plus.',
      'Address refused: an https:// address of 200 characters at most.',
      'Adresse abgelehnt: eine https://-Adresse mit höchstens 200 Zeichen.',
      'Dirección rechazada: una dirección https:// de 200 caracteres como máximo.'
    ],
    jnTaken: [
      'Cette compagnie est déjà dans la liste : la flotte se met à jour par le collage du site, dans l’écran du site de la compagnie.',
      'This airline is already in the list: its fleet is refreshed by pasting the website, in the airline website screen.',
      'Diese Gesellschaft steht schon in der Liste: ihre Flotte wird durch Einfügen der Webseite aktualisiert, im Bildschirm der Webseite der Gesellschaft.',
      'Esta compañía ya está en la lista: su flota se actualiza pegando el sitio, en la pantalla del sitio de la compañía.'
    ],
    jnMissions: ['Les missions préparées de cette compagnie sont dans Missions, une fois la compagnie choisie.',
      'This airline’s prepared missions are in Missions, once the airline is chosen.',
      'Die vorbereiteten Missionen dieser Gesellschaft stehen unter Missionen, sobald die Gesellschaft gewählt ist.',
      'Las misiones preparadas de esta compañía están en Misiones, una vez elegida la compañía.'
    ],
    name: ['Nom', 'Name', 'Name', 'Nombre'],
    code: ['Code (2 à 8 lettres ou chiffres)', 'Code (2 to 8 letters or digits)', 'Code (2 bis 8 Buchstaben oder Ziffern)',
      'Código (2 a 8 letras o cifras)'
    ],
    networks: ['Réseaux', 'Networks', 'Netzwerke', 'Redes'],
    net: {
      ivao: ['IVAO', 'IVAO', 'IVAO', 'IVAO'],
      vatsim: ['VATSIM', 'VATSIM', 'VATSIM', 'VATSIM'],
      offline: ['hors ligne', 'off-line', 'offline', 'sin conexión']
    },
    save: ['Créer la compagnie', 'Create the airline', 'Fluggesellschaft anlegen', 'Crear la compañía'],
    steps: {
      identity: ['Identité', 'Identity', 'Identität', 'Identidad'],
      themes: ['Thèmes de vols', 'Flight themes', 'Flugthemen', 'Temas de vuelos'],
      fleet: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
      summary: ['Résumé', 'Summary', 'Zusammenfassung', 'Resumen']
    },
    wzFleetTitle: ['Flotte · {x}', 'Fleet · {x}', 'Flotte · {x}', 'Flota · {x}'],
    wzFleetHint: [
      'Choisissez un type dans la base des fiches, puis tapez l’immatriculation. Vous pouvez aussi ajouter les appareils plus tard, depuis Appareils.',
      'Choose a type in the sheets base, then type the registration. You can also add the aircraft later, from Aircraft.',
      'Wählen Sie einen Typ in der Datenblatt-Basis, dann tippen Sie das Kennzeichen. Sie können die Luftfahrzeuge auch später unter Luftfahrzeuge hinzufügen.',
      'Elija un tipo en la base de fichas y escriba la matrícula. También puede añadir las aeronaves más tarde, desde Aeronaves.'
    ],
    wzSheetQ: ['Type ou nom d’appareil', 'Aircraft type or name', 'Typ oder Name des Luftfahrzeugs', 'Tipo o nombre de aeronave'],
    wzReg: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
    wzRegAdd: ['Ajouter l’appareil', 'Add the aircraft', 'Luftfahrzeug hinzufügen', 'Añadir la aeronave'],
    wzLater: ['Plus tard', 'Later', 'Später', 'Más tarde'],
    wzNoSheets: ['Aucune fiche d’appareil lue : ajoutez les appareils plus tard.', 'No aircraft sheet read: add the aircraft later.',
      'Kein Datenblatt gelesen: Luftfahrzeuge später hinzufügen.', 'Ninguna ficha leída: añada las aeronaves más tarde.'
    ],
    wzNoHit: ['Aucune fiche ne correspond.', 'No sheet matches.', 'Kein Datenblatt passt.', 'Ninguna ficha coincide.'],
    wzPickFirst: ['Choisissez d’abord un type dans la liste.', 'Choose a type in the list first.',
      'Wählen Sie zuerst einen Typ aus der Liste.',
      'Elija primero un tipo de la lista.'
    ],
    wzRegBad: ['Immatriculation refusée : 2 à 10 lettres, chiffres ou tirets.',
      'Registration refused: 2 to 10 letters, digits or dashes.',
      'Kennzeichen abgelehnt: 2 bis 10 Buchstaben, Ziffern oder Bindestriche.',
      'Matrícula rechazada: 2 a 10 letras, cifras o guiones.'
    ],
    wzRegDup: ['Cette immatriculation est déjà dans la liste.', 'This registration is already in the list.',
      'Dieses Kennzeichen steht schon in der Liste.', 'Esta matrícula ya está en la lista.'
    ],
    wzThemeHint: [
      'Ceux du genre sont cochés d’avance : décochez ce que vous ne volez pas.',
      'The kind’s own are ticked in advance: untick what you do not fly.',
      'Die der Art sind vorab angekreuzt: entfernen Sie, was Sie nicht fliegen.',
      'Los del tipo vienen marcados: desmarque lo que no vuela.'
    ],
    next: ['Suivant', 'Next', 'Weiter', 'Siguiente'],
    back: ['Retour', 'Back', 'Zurück', 'Atrás'],
    resume: ['Reprendre', 'Resume', 'Fortsetzen', 'Reanudar'],
    fly: ['Voler pour cette compagnie', 'Fly for this airline', 'Für diese Gesellschaft fliegen', 'Volar para esta compañía'],
    stay: ['Rester ici', 'Stay here', 'Hier bleiben', 'Quedarme aquí'],
    noKind: ['Choisissez un genre.', 'Choose a kind.', 'Wählen Sie eine Art.', 'Elija un tipo.'],
    dirExists: ['Un dossier existe déjà pour ce code : choisissez-en un autre.',
      'A folder already exists for this code: choose another.',
      'Für diesen Code gibt es schon einen Ordner: wählen Sie einen anderen.', 'Ya existe una carpeta para este código: elija otro.'
    ],
    part: {
      settings: ['les réglages', 'the settings', 'die Einstellungen', 'los ajustes'],
      themes: ['les thèmes', 'the themes', 'die Themen', 'los temas'],
      fleet: ['la flotte', 'the fleet', 'die Flotte', 'la flota'],
      index: ['l’inscription dans la liste', 'the entry in the list', 'der Eintrag in der Liste', 'la inscripción en la lista']
    },
    partial: [
      'Création interrompue. Déjà écrit : {done}. Il reste : {todo}. « Reprendre » finit sans rien écraser.',
      'Creation interrupted. Already written: {done}. Left: {todo}. “Resume” finishes without overwriting anything.',
      'Anlegen unterbrochen. Bereits geschrieben: {done}. Offen: {todo}. „Fortsetzen“ beendet es, ohne etwas zu überschreiben.',
      'Creación interrumpida. Ya escrito: {done}. Falta: {todo}. «Reanudar» termina sin sobrescribir nada.'
    ],
    badName: ['Donnez un nom (60 caractères au plus).', 'Give a name (60 characters at most).',
      'Geben Sie einen Namen an (höchstens 60 Zeichen).', 'Indique un nombre (60 caracteres como máximo).'
    ],
    badCode: ['Code refusé : 2 à 8 lettres minuscules ou chiffres.', 'Code refused: 2 to 8 lower-case letters or digits.',
      'Code abgelehnt: 2 bis 8 Kleinbuchstaben oder Ziffern.', 'Código rechazado: 2 a 8 letras minúsculas o cifras.'
    ],
    taken: ['Ce code est déjà pris.', 'This code is already taken.', 'Dieser Code ist schon vergeben.', 'Este código ya está en uso.'],
    full: ['Vingt compagnies au plus.', 'Twenty airlines at most.', 'Höchstens zwanzig Fluggesellschaften.',
      'Veinte compañías como máximo.'
    ],
    // le genre de la compagnie et ses catégories de missions (SOG-0041, § 10.38)
    kindLabel: ['Genre', 'Kind', 'Art', 'Tipo'],
    kindHelp: {
      va: [
        'Une compagnie commerciale : le thème Commercial (fret, passagers, rapatriement à vide, VIP, entraînement, transit, essais en vol).',
        'A commercial airline: the Commercial theme (cargo, passengers, empty leg, VIP, training, transit, test flights).',
        'Eine kommerzielle Gesellschaft: das Thema Kommerziell (Fracht, Passagiere, Leerflug, VIP, Training, Transit, Testflüge).',
        'Una compañía comercial: el tema Comercial (carga, pasajeros, vuelo en vacío, VIP, entrenamiento, tránsito, vuelos de prueba).'
      ],
      sog: ['Une escadrille SO : ses missions préparées, les seize thèmes militaires.',
        'An SO squadron: its prepared missions, the sixteen military themes.',
        'Eine SO-Staffel: ihre vorbereiteten Missionen, die sechzehn militärischen Themen.',
        'Un escuadrón SO: sus misiones preparadas, los dieciséis temas militares.'
      ]
    },
    kindUnset: ['Choisissez le genre : les thèmes cochés d’avance en dépendent.',
      'Choose the kind: the themes ticked in advance depend on it.',
      'Wählen Sie die Art: die vorab angekreuzten Themen hängen davon ab.',
      'Elija el tipo: los temas marcados de antemano dependen de él.'
    ],
    persoNote: ['Personnel : vos vols hors compagnie, avec tous les thèmes ; rien à régler ici.',
      'Personal: your flights outside any airline, with every theme; nothing to set here.',
      'Persönlich: Ihre Flüge ohne Gesellschaft, mit allen Themen; hier ist nichts einzustellen.',
      'Personal: sus vuelos fuera de toda compañía, con todos los temas; nada que ajustar aquí.'
    ],
    ficheTitle: ['Compagnie choisie : {n}', 'Chosen airline: {n}', 'Gewählte Gesellschaft: {n}', 'Compañía elegida: {n}'],
    kindSaved: ['Genre enregistré.', 'Kind saved.', 'Art gespeichert.', 'Tipo guardado.'],
    // les thèmes de missions de la compagnie (SOG-0202 T3, V3_SPECIFICATION § 10.48) : cochés d'avance par le genre, écrits seulement quand on coche autrement
    themeSummary: ['Thèmes de missions ({n} sur {m})', 'Mission themes ({n} of {m})', 'Missionsthemen ({n} von {m})',
      'Temas de misiones ({n} de {m})'
    ],
    themeHint: ['Les thèmes que cette compagnie vole : ses missions et le compte rendu ne proposent que ceux-là.',
      'The themes this airline flies: its missions and the report offer only these.',
      'Die Themen, die diese Gesellschaft fliegt: ihre Missionen und der Bericht bieten nur diese an.',
      'Los temas que vuela esta compañía: sus misiones y el informe solo ofrecen estos.'
    ],
    themeOne: ['Gardez au moins un thème.', 'Keep at least one theme.', 'Behalten Sie mindestens ein Thema.',
      'Conserve al menos un tema.'
    ],
    themeSaved: ['Thèmes enregistrés.', 'Themes saved.', 'Themen gespeichert.', 'Temas guardados.'],
    del: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
    added: ['Compagnie ajoutée : {n}.', 'Airline added: {n}.', 'Fluggesellschaft hinzugefügt: {n}.', 'Compañía añadida: {n}.'],
    failed: ['Écriture impossible.', 'Could not write.', 'Schreiben nicht möglich.', 'No se pudo escribir.'],
    // la migration de la compagnie unique d'aujourd'hui vers son dossier (verbe airline/migrate du lanceur)
    migHint: [
      'Votre compagnie est encore à la racine de data/airline/ : le lanceur peut la ranger dans son propre dossier. Il montre d’abord ce qu’il ferait ; rien n’est supprimé ni écrasé.',
      'Your airline is still at the root of data/airline/: the launcher can move it into its own folder. It first shows what it would do; nothing is deleted or overwritten.',
      'Ihre Fluggesellschaft liegt noch im Stammordner von data/airline/: Der Launcher kann sie in einen eigenen Ordner legen. Er zeigt zuerst, was er täte; nichts wird gelöscht oder überschrieben.',
      'Su compañía sigue en la raíz de data/airline/: el lanzador puede pasarla a su propia carpeta. Primero muestra lo que haría; nada se borra ni se sobrescribe.'
    ],
    migCode: ['Code de la compagnie (laissez vide : proposé d’après le nom)', 'Airline code (leave empty: proposed from the name)',
      'Code der Gesellschaft (leer lassen: nach dem Namen vorgeschlagen)',
      'Código de la compañía (vacío: propuesto según el nombre)'
    ],
    migPlan: ['Voir ce qui serait fait', 'See what would be done', 'Anzeigen, was geschähe', 'Ver lo que se haría'],
    migGo: ['Migrer vers « {c} »', 'Migrate to “{c}”', 'Nach „{c}“ migrieren', 'Migrar a «{c}»'],
    migPlanned: ['« {n} » ira dans data/airline/{c}/ :', '“{n}” will go to data/airline/{c}/:', '„{n}“ kommt nach data/airline/{c}/:',
      '«{n}» irá a data/airline/{c}/:'
    ],
    migFile: ['{f} ({b} o)', '{f} ({b} B)', '{f} ({b} B)', '{f} ({b} B)'],
    migFleet: ['La flotte y sera vide : celle d’aujourd’hui reste dans les fiches. Les fichiers actuels restent en place comme copie.',
      'The fleet will be empty there: today’s fleet stays in the sheets. The current files stay in place as a copy.',
      'Die Flotte ist dort leer: die heutige bleibt in den Fiches. Die jetzigen Dateien bleiben als Kopie liegen.',
      'La flota estará vacía allí: la de hoy sigue en las fichas. Los archivos actuales quedan como copia.'
    ],
    migDone: ['Compagnie migrée vers {c}.', 'Airline migrated to {c}.', 'Gesellschaft nach {c} migriert.', 'Compañía migrada a {c}.'],
    migWhy: {
      'no-source': ['Pas de data/airline/settings.json lisible : rien à migrer.',
        'No readable data/airline/settings.json: nothing to migrate.',
        'Keine lesbare data/airline/settings.json: nichts zu migrieren.',
        'No hay data/airline/settings.json legible: nada que migrar.'
      ],
      'bad-code': ['Code refusé ou impossible à proposer : donnez 2 à 8 lettres minuscules ou chiffres.',
        'Code refused or impossible to propose: give 2 to 8 lower-case letters or digits.',
        'Code abgelehnt oder nicht vorschlagbar: 2 bis 8 Kleinbuchstaben oder Ziffern angeben.',
        'Código rechazado o imposible de proponer: indique 2 a 8 letras minúsculas o cifras.'
      ],
      exists: ['Cette compagnie a déjà son dossier : rien n’est écrit.', 'This airline already has its folder: nothing is written.',
        'Diese Gesellschaft hat schon ihren Ordner: nichts wird geschrieben.',
        'Esta compañía ya tiene su carpeta: no se escribe nada.'
      ],
      partial: ['Fait en partie : un fichier existait déjà et n’a pas été écrasé.',
        'Partly done: a file already existed and was not overwritten.',
        'Teilweise erledigt: eine Datei gab es schon, sie wurde nicht überschrieben.',
        'Hecho en parte: ya existía un archivo y no se sobrescribió.'
      ],
      failed: ['Écriture impossible.', 'Could not write.', 'Schreiben nicht möglich.', 'No se pudo escribir.'],
      none: ['Le lanceur n’a pas répondu (ou ne connaît pas encore cette opération).',
        'The launcher did not answer (or does not know this operation yet).',
        'Der Launcher hat nicht geantwortet (oder kennt diese Operation noch nicht).',
        'El lanzador no respondió (o aún no conoce esta operación).'
      ]
    }
  };
  const MIG_FILES = ['settings.json', 'map_profiles.json', 'fleet.json'];
  let airlineA = null;
  /** L'adaptateur (créé une fois) qui lit data/airline/ et écrit l'index et les dossiers des compagnies ; l'index est fusionné par code. */
  const airlineData = FD => airlineA ||= FD.adapter({
    id: 'settings-company',
    reads: ['airline/'],
    writes: [{
      prefix: INDEX,
      merge: 'keyed:airlines:code'
    }, {
      prefix: 'airline/',
      merge: 'record'
    }]
  });
  /** Les compagnies de l'index, bornées : [{ code, name }] (code selon la règle, nom en texte de 60 caractères, un code une fois, vingt au plus). */
  function airlineList(index) {
    const out = [],
      seen = new Set();
    for (const x of Array.isArray(index?.airlines) ? index.airlines.slice(0, AIRLINE_MAX * 2) : []) {
      const code = typeof x?.code === 'string' && AIRLINE_CODE.test(x.code) ? x.code : '';
      if (!code || seen.has(code) || code === PERSO) continue;
      seen.add(code);
      out.push({
        code,
        name: typeof x.name === 'string' ? x.name.slice(0, 60) : code
      });
      if (out.length >= AIRLINE_MAX) break;
    }
    return out;
  }
  /** Les réseaux d'une compagnie (settings.networks : { ivao, vatsim, offline } en booléens) : la liste fermée, dans l'ordre ; sans réglage, rien. */
  const airlineNets = s => AIRLINE_NETWORKS.filter(k => s?.networks?.[k] === true);
  /** Le nombre d'appareils de la flotte (fleet.aircraft) : un entier borné, 0 sans fichier. */
  const airlineFleet = f => Array.isArray(f?.aircraft) ? Math.min(f.aircraft.length, 9999) : 0;
  /** La liste des compagnies, SANS rien lire de plus que l'index (SOG-0218 : la liste se dessine aussitôt, les détails viennent après) : { list: [{ code, name }], known } — la liste du cadre quand il la donne (FrameData.airlines() : celles de l'index, ou « default » avant la migration), sinon l'index lu ici. */
  async function readAirlineList(FD) {
    const ad = airlineData(FD),
      known = typeof FD.airlines === 'function' ? await Promise.resolve(FD.airlines()).catch(() => null) : null;
    return {
      known: !!known,
      list: known ? airlineList({
        airlines: known
      }) : airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null))
    };
  }
  /** Les lignes d'après la liste, sans détail encore (réseaux, flotte et genre viennent de la lecture suivante), puis « Personnel » : { code, name, nets: [], fleet: null, kind: '', cats: null, loading: true }. */
  const quickRows = (list, t) => [...list.map(a => ({
    ...a,
    nets: [],
    fleet: null,
    kind: '',
    themes: null,
    loading: true
  })), {
    code: PERSO,
    name: t(TA.perso),
    nets: [],
    fleet: null
  }];
  /** Les détails de chaque compagnie de la liste, tous en même temps (réglages, flotte, catégories de chacune) : les lignes [{ code, name, nets, fleet, kind, cats }] puis « Personnel ». Un fichier illisible : la ligne sans ses détails. */
  async function readAirlines(FD, t, {
    list,
    known
  }) {
    const ad = airlineData(FD),
      rows = await Promise.all(list.map(async a => {
        // avant la migration, la compagnie d'aujourd'hui (« default ») est à la racine de data/airline/
        const base = known && a.code === 'default' ? 'airline/' : `airline/${a.code}/`,
          [s, f, themes] = await Promise.all([ad.get(`${base}settings.json`, {
            wait: true
          }).catch(() => null), ad.get(`${base}fleet.json`, {
            wait: true
          }).catch(() => null), ad.get(`${base}themes.json`, {
            wait: true
          }).catch(() => null)]);
        return {
          ...a,
          name: typeof s?.name === 'string' && s.name ? s.name.slice(0, 60) : a.name,
          nets: airlineNets(s),
          fleet: airlineFleet(f),
          kind: KINDS.includes(s?.kind) ? s.kind : '',
          themes // le themes.json lu, tel quel : le module des thèmes le filtre (cleanThemes)
        };
      }));
    return [...rows, {
      code: PERSO,
      name: t(TA.perso),
      nets: [],
      fleet: null
    }];
  }
  const KINDS = ['va', 'sog'];
  let plP = null;
  /** Le module pur de l'accord (frame/lib/plural.js), chargé une fois ; null s'il ne se charge pas (les noms restent alors au pluriel). */
  const plLib = () => plP ||= import(new URL('frame/lib/plural.js', ROOT).href).catch(() => null);
  let catLibP = null;
  /** Les modules purs des thèmes de missions (frame/lib/mission_themes.js) et du genre de la compagnie (frame/lib/airline.js), chargés une fois et réunis ; null s'ils ne se chargent pas (la ligne n'a alors ni genre ni thèmes). */
  const catLib = () => catLibP ||= Promise.all([import(new URL('frame/lib/mission_themes.js', ROOT).href), import(new URL(
    'frame/lib/airline.js', ROOT).href)]).then(([T, A]) => ({
    ...T,
    KIND_NAMES: A.KIND_NAMES,
    kindOf: A.kindOf
  })).catch(() => null);
  /** Le dossier d'une compagnie sous data/ : « airline/ » avant la migration (code default), sinon « airline/<code>/ ». */
  const airlineBase = code => code === 'default' ? 'airline/' : `airline/${code}/`;
  /** La ligne de la liste (jamais un bouton « Choisir ») : bouton radio, nom, code, puis une ligne grise : le genre dit en toutes lettres, les réseaux, la flotte. Le HTML ne dit rien de l'état courant (posé ensuite sur le nœud) : deux dessins qui ne diffèrent que par le choix donnent le même texte. */
  function airlineRowParts(r, t, can, CL, aircraft = n => String(n)) {
    const KN = CL?.KIND_NAMES,
      kind = KN ? t(KN[r.code === PERSO ? 'perso' : r.kind || 'none']) : '',
      meta = [kind, ...r.nets.map(k => t(TA.net[k])), ...(r.fleet === null ? [] : [aircraft(r.fleet)])].join(' · '),
      code = esc(r.code);
    return [`<label class="f-co" data-airline="${code}"><input type="radio" name="co-current" value="${code}" data-act="companyChoose" data-code="${code}"${can ? '' : ' disabled'}><span class="f-co-name"><b>${esc(r.name)}</b> <code>${code}</code></span>`, meta];
  }
  /** Les thèmes dans l'ordre d'AFFICHAGE : COMMERCIAL en tête (le thème d'une compagnie commerciale), puis ceux de la table dans son ordre. */
  const themesShown = (CL, lang) => {
    const all = CL.themes(lang);
    return [...all.filter(x => x.id === 'COMMERCIAL'), ...all.filter(x => x.id !== 'COMMERCIAL')];
  };
  /** Des identifiants de thèmes dans l'ordre d'ÉCRITURE (celui de la table de frame/lib/mission_themes.js), sans doublon. */
  const themesInTableOrder = (CL, ids) => CL.themes('fr').map(x => x.id).filter(id => ids.includes(id));
  /** La fiche de la compagnie CHOISIE (les autres n'en ont pas) : le genre en deux boutons radio, une ligne d'explication chacun ; puis les thèmes de missions, un par case (le sigle, le nom), cochés d'après son fichier ou, sans fichier, d'après le genre (rien n'est écrit tant qu'on ne coche pas). « Personnel » : une ligne, rien à régler. `lang` : la langue des noms. */
  function airlineFicheHtml(r, CL, lang, t) {
    if (!r) return '';
    if (r.code === PERSO) return `<p class="f-muted" data-fiche-perso>${esc(t(TA.persoNote))}</p>`;
    if (!CL) return '';
    const list = themesShown(CL, lang),
      chosen = new Set(CL.chosenOf(r.themes, r.kind)),
      code = esc(r.code);
    return `<h3>${esc(t(TA.ficheTitle, { n: r.name }))}</h3>
      <fieldset data-kind-set><legend>${esc(t(TA.kindLabel))}</legend>${KINDS.map(k => `<label class="f-check f-kind"><input type="radio" name="co-kind" value="${k}" data-act="companyKind" data-code="${code}" data-kind="${k}"${r.kind === k ? ' checked' : ''}><span><b>${esc(t(CL.KIND_NAMES[k]))}</b><span class="f-muted">${esc(t(TA.kindHelp[k]))}</span></span></label>`).join('')}</fieldset>
      <h4 data-themes-title>${esc(t(TA.themeSummary, { n: list.filter(x => chosen.has(x.id)).length, m: list.length }))}</h4>${r.kind ? '' : `<p class="f-muted">${esc(t(TA.kindUnset))}</p>`}<p class="f-muted">${esc(t(TA.themeHint))}</p>
      <ul class="f-themes" data-themes>${list.map(x => `<li data-theme="${esc(x.id)}"><label class="f-check"><input type="checkbox" data-act="companyTheme" data-code="${code}" data-theme="${esc(x.id)}"${chosen.has(x.id) ? ' checked' : ''}><span>${esc(x.label)}</span></label></li>`).join('')}</ul><p class="f-msg" data-fiche-msg></p>`;
  }
  /** Écrit le genre d'une compagnie dans son settings.json (le fichier lu, le champ `kind` posé ou retiré) ; faux si le fichier manque ou ne s'écrit pas. */
  async function writeKind(env, code, kind) {
    const ad = airlineData(env.FD),
      path = `${airlineBase(code)}settings.json`,
      s = await ad.get(path, {
        wait: true
      }).catch(() => null);
    if (s === null || typeof s !== 'object' || Array.isArray(s)) return false;
    const next = {
      ...s,
      updated_at: now(),
      by: env.id?.trigram || ''
    };
    if (KINDS.includes(kind)) next.kind = kind;
    else delete next.kind;
    try {
      await ad.put(path, next);
      return true;
    } catch {
      return false;
    }
  }
  /** Un identifiant de catégorie d'après son nom : minuscules sans accent, tirets, 24 signes au plus ; '' si rien ne reste. */
  const catId = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(
    /^-+|-+$/g, '').slice(0, 24).replace(/-+$/g, '');
  /** Écrit les thèmes cochés d'une compagnie dans son themes.json : { schema, chosen, added (celui du fichier déjà là, jamais perdu), updated_at, by } ; '' (fait) ou la clé du refus. */
  async function writeThemes(env, code, picked) {
    const CL = await catLib();
    if (!CL) return 'failed';
    if (!picked.length) return 'themeOne';
    const chosen = themesInTableOrder(CL, picked); // l'ordre d'écriture est celui de la table, pas celui de l'affichage
    const ad = airlineData(env.FD),
      path = `${airlineBase(code)}themes.json`,
      old = CL.cleanThemes(await ad.get(path, {
        wait: true
      }).catch(() => null));
    try {
      await ad.put(path, {
        schema: 1,
        chosen,
        added: old?.added || {
          themes: [],
          series: {}
        },
        updated_at: now(),
        by: env.id?.trigram || ''
      });
      return '';
    } catch {
      return 'failed';
    }
  }
  /** La carte Compagnie : « Compagnie de cet appareil » (la liste à boutons radio, remplie par airlineLive), la fiche de la compagnie choisie, puis trois gestes dans cet ordre : « Créer une compagnie », « Rejoindre une compagnie », la migration quand elle s'applique ; le niveau Complet, ou l'adresse #settings?card=company. */
  function airlineHtml(env) {
    const {
      t,
      lvl,
      focus,
      fld
    } = env;
    if (lvl !== 3 && focus !== 'company') return '';
    return `<div class="f-card" data-card="company"><h2>${esc(t(TA.title))}</h2><p class="f-muted">${esc(t(TA.hint))}</p><div class="f-cos" role="radiogroup" aria-label="${esc(t(TA.title))}" data-airlines></div><p class="f-warn" data-airline-note hidden></p><div class="f-fiche" data-airline-fiche></div>
      ${wizardHtml(env)}
      ${joinHtml(env)}
      <div data-mig hidden></div></div>`;
  }
  // les pas de « Créer une compagnie » (V3_SPECIFICATION § 10.38 bis) ; les thèmes et la flotte s'y ajoutent avant le résumé (lots B2 et B3, SOG-0202 T3)
  const WZ_STEPS = ['identity', 'themes', 'fleet', 'summary'];
  const WZ_REG = /^[A-Z0-9][A-Z0-9-]{1,9}$/,
    WZ_FLEET_MAX = 200;
  // par vue : le pas montré et la reprise d'une création interrompue
  const WZ = new WeakMap();
  /** Le stepper « Créer une compagnie » : un bloc construit une fois, à hauteur réservée (règle 22), un volet par pas ; rien n'est écrit avant le dernier bouton. Le genre est préchoisi « Commerciale ». */
  function wizardHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<details data-airline-add><summary>${esc(t(TA.add))}</summary><div class="f-wizard" data-wizard data-step="identity">
      <ol class="f-steps" data-steps>${WZ_STEPS.map((k, i) => `<li data-step-dot="${k}"${i === 0 ? ' data-current' : ''}>${i + 1}. ${esc(t(TA.steps[k]))}</li>`).join('')}</ol>
      <section data-step-pane="identity">${fld('co-name', TA.name, '')}${fld('co-code', TA.code, '')}
        <fieldset data-wz-kind><legend>${esc(t(TA.kindLabel))}</legend>${KINDS.map(k => `<label class="f-check f-kind"><input type="radio" name="wz-kind" value="${k}"${k === 'va' ? ' checked' : ''}><span><b data-kind-name="${k}"></b><span class="f-muted">${esc(t(TA.kindHelp[k]))}</span></span></label>`).join('')}</fieldset>
        <fieldset><legend>${esc(t(TA.networks))}</legend>${AIRLINE_NETWORKS.map(k => `<label class="f-check"><input type="checkbox" data-co-net="${k}"> ${esc(t(TA.net[k]))}</label>`).join('')}</fieldset></section>
      <section data-step-pane="themes" hidden></section>
      <section data-step-pane="fleet" hidden><h4 data-wz-fleet-title></h4><p class="f-muted">${esc(t(TA.wzFleetHint))}</p>
        ${fld('wz-sheet-q', TA.wzSheetQ, '')}<div data-wz-results></div>
        <div data-wz-pick hidden><p data-wz-picked></p>${fld('wz-reg', TA.wzReg, '', { cap: true })}<div class="f-row"><button type="button" data-act="companyWzReg">${esc(t(TA.wzRegAdd))}</button></div></div>
        <ul class="f-cats" data-wz-fleet></ul><div class="f-row"><button type="button" data-act="companyWzLater">${esc(t(TA.wzLater))}</button></div></section>
      <section data-step-pane="summary" hidden><p data-wz-summary></p></section>
      <section data-step-pane="done" hidden><p data-wz-done></p><div class="f-row"><button type="button" class="primary" data-act="companyFly">${esc(t(TA.fly))}</button><button type="button" data-act="companyStay">${esc(t(TA.stay))}</button></div></section>
      <p class="f-msg" data-msg></p>
      <div class="f-row" data-wz-nav><button type="button" data-act="companyBack" hidden>${esc(t(TA.back))}</button><button type="button" class="primary" data-act="companyNext">${esc(t(TA.next))}</button><button type="button" class="primary" data-act="companyAdd" hidden>${esc(t(TA.save))}</button><button type="button" class="primary" data-act="companyResume" hidden>${esc(t(TA.resume))}</button></div></div></details>`;
  }
  /** Montre le pas `name` (identity, summary, done) : les volets, les pastilles, les boutons de navigation ; rien d'autre ne change. */
  function wizardShow(view, name) {
    const w = view.querySelector('[data-wizard]');
    if (!w) return;
    // la hauteur du bloc ne diminue jamais d'un pas à l'autre : ce qui est dessous ne bouge pas (règle 22) ; « Rester ici » la libère
    w.style.minHeight = `${Math.max(w.offsetHeight, parseFloat(w.style.minHeight) || 0)}px`;
    w.dataset.step = name;
    for (const pane of w.querySelectorAll('[data-step-pane]')) pane.hidden = pane.dataset.stepPane !== name;
    WZ_STEPS.forEach(k => {
      const dot = w.querySelector(`[data-step-dot="${k}"]`);
      if (dot) dot.toggleAttribute('data-current', k === name);
    });
    const nav = w.querySelector('[data-wz-nav]'),
      resume = !!WZ.get(view)?.resume,
      on = {
        companyBack: name !== 'identity',
        companyNext: name === 'identity' || name === 'themes' || name === 'fleet',
        companyAdd: name === 'summary' && !resume,
        companyResume: name === 'summary' && resume
      };
    for (const [act, show] of Object.entries(on)) nav.querySelector(`[data-act="${act}"]`).hidden = !show;
    nav.hidden = name === 'done';
  }
  /** Le volet « Thèmes de vols » : les thèmes du genre cochés d'avance (CL.defaultChosen), les autres décochés ; construit quand le genre change seulement : une coche ne se perd pas d'un aller-retour. */
  function wizardThemesBuild(env, kind) {
    const {
      view,
      t
    } = env, pane = view.querySelector('[data-step-pane="themes"]'), A = AIR.get(view), CL = A?.CL, lang = A?.lang || 'fr';
    if (!pane || pane.dataset.kind === kind) return;
    pane.dataset.kind = kind;
    const on = new Set(CL ? CL.defaultChosen(kind) : []);
    pane.innerHTML = `<p class="f-muted">${esc(t(TA.wzThemeHint))}</p>
      <ul class="f-themes" data-wz-themes>${CL ? themesShown(CL, lang).map(x => `<li><label class="f-check"><input type="checkbox" data-wz-theme="${esc(x.id)}"${on.has(x.id) ? ' checked' : ''}><span>${esc(x.label)}</span></label></li>`).join('') : ''}</ul>`;
  }
  /** Les thèmes cochés au pas ② : { chosen: [identifiants dans l'ordre de la table], n }. */
  function wizardThemes(view) {
    const CL = AIR.get(view)?.CL,
      ticked = [...view.querySelectorAll('[data-step-pane="themes"] [data-wz-theme]')].filter(b => b.checked).map(b => b.dataset
        .wzTheme);
    const chosen = CL ? themesInTableOrder(CL, ticked) : ticked; // l'ordre d'écriture est celui de la table, pas celui de l'affichage
    return {
      chosen,
      n: chosen.length
    };
  }
  /** Le fichier themes.json du stepper ; null quand les thèmes cochés sont ceux du genre (rien n'est alors écrit : le genre reste la règle). */
  function wizardThemesFile(view, v, now_, by) {
    const CL = AIR.get(view)?.CL,
      c = wizardThemes(view);
    if (!CL || !c.n) return null;
    const def = CL.defaultChosen(v.kind);
    if (def.length === c.n && def.every(id => c.chosen.includes(id))) return null;
    return {
      schema: 1,
      chosen: c.chosen,
      added: {
        themes: [],
        series: {}
      },
      updated_at: now_,
      by
    };
  }
  /** Les fiches d'appareils de la base (aerodb, aircraft().sheets.list()), lues une fois par vue : [{ id, name, type }] bornées (texte de 60 signes, 500 fiches) ; [] sans aerodb. */
  async function wizardSheets(env) {
    const st = WZ.get(env.view) || {};
    if (st.sheets) return st.sheets;
    let list = [];
    try {
      const A = await env.c.aerodb?.()?.aircraft?.();
      list = (await A?.sheets?.list?.()) || [];
    } catch {
      list = [];
    }
    const sheets = (Array.isArray(list) ? list : []).slice(0, 500).map(x => ({
      id: String(x?.id ?? '').slice(0, 24),
      name: String(x?.name ?? x?.id ?? '').slice(0, 60),
      type: String(x?.icao ?? x?.type ?? x?.id ?? '').toUpperCase().slice(0, 8)
    })).filter(x => x.id);
    WZ.set(env.view, {
      ...st,
      sheets
    });
    return sheets;
  }
  /** Le titre du pas ③ et sa pastille disent combien d'appareils sont ajoutés (« Flotte · 3 appareils »), le bouton « Plus tard » ne se montre que sans appareil. */
  function wizardFleetPaint(view, t) {
    const n = view.querySelectorAll('[data-wz-fleet] li').length,
      title = n ? t(TA.wzFleetTitle, {
        x: nounText(view, 'aircraft', n)
      }) : t(TA.steps.fleet),
      h = view.querySelector('[data-wz-fleet-title]'),
      dot = view.querySelector('[data-step-dot="fleet"]'),
      later = view.querySelector('[data-act="companyWzLater"]');
    if (h) h.textContent = title;
    if (dot) dot.textContent = `${WZ_STEPS.indexOf('fleet') + 1}. ${title}`;
    if (later) later.hidden = n > 0;
    return n;
  }
  /** Les fiches qui répondent à la recherche (nom, type ou identifiant), huit au plus, une ligne chacune ; la dernière demande seule est dessinée. */
  async function wizardSheetSearch(env) {
    const {
      view,
      t
    } = env, box = view.querySelector('[data-wz-results]'), q = (view.querySelector('[data-wizard] [data-f="wz-sheet-q"]')?.value || '')
      .trim().toLowerCase(),
      seq = (view.__wzSeq = (view.__wzSeq || 0) + 1), all = await wizardSheets(env);
    if (!box || seq !== view.__wzSeq) return;
    const hits = all.filter(x => !q || `${x.id} ${x.name} ${x.type}`.toLowerCase().includes(q)).slice(0, 8);
    box.innerHTML = !all.length ? `<p class="f-muted">${esc(t(TA.wzNoSheets))}</p>` : hits.length ? `<ul class="f-queue">${hits.map(x => `<li><button type="button" data-act="companyWzSheet" data-id="${esc(x.id)}">${esc(x.name)}${x.type && x.type !== x.name ? ` · ${esc(x.type)}` : ''}</button></li>`).join('')}</ul>` : `<p class="f-muted">${esc(t(TA.wzNoHit))}</p>`;
  }
  /** Un type choisi dans la liste : il attend l'immatriculation (le champ prend le focus). */
  async function wizardSheetPick(env, id) {
    const {
      view
    } = env, x = (await wizardSheets(env)).find(s => s.id === id), pick = view.querySelector('[data-wz-pick]');
    if (!x || !pick) return;
    pick.dataset.type = x.type;
    pick.dataset.variant = x.name;
    pick.querySelector('[data-wz-picked]').textContent = `${x.name}${x.type && x.type !== x.name ? ` · ${x.type}` : ''}`;
    pick.hidden = false;
    pick.querySelector('[data-f="wz-reg"]')?.focus();
  }
  /** « Ajouter l'appareil » : l'immatriculation (majuscules, 2 à 10 signes, une fois) avec le type choisi, ajoutée à la liste du pas ③ ; rien n'est écrit. */
  function wizardRegAdd(env) {
    const {
      view,
      t
    } = env, pick = view.querySelector('[data-wz-pick]'), field = pick.querySelector('[data-f="wz-reg"]'), reg = field.value.trim()
      .toUpperCase();
    wizardSay(view, '');
    if (!pick.dataset.type) return wizardSay(view, t(TA.wzPickFirst));
    if (!WZ_REG.test(reg)) return wizardSay(view, t(TA.wzRegBad));
    const list = view.querySelector('[data-wz-fleet]');
    if ([...list.children].some(li => li.dataset.reg === reg)) return wizardSay(view, t(TA.wzRegDup));
    if (list.children.length >= WZ_FLEET_MAX) return wizardSay(view, t(TA.full));
    const li = document.createElement('li');
    li.dataset.reg = reg;
    li.dataset.type = pick.dataset.type;
    li.dataset.variant = pick.dataset.variant || '';
    li.append(`${reg} · ${pick.dataset.type} `);
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = 'companyWzRegDel';
    b.textContent = t(TA.del);
    li.append(b);
    list.append(li);
    field.value = '';
    field.focus();
    wizardFleetPaint(view, t);
  }
  /** Les appareils du pas ③ : [{ registration, type, variant }]. */
  const wizardFleet = view => [...view.querySelectorAll('[data-wz-fleet] li')].map(li => ({
    registration: li.dataset.reg,
    type: li.dataset.type,
    variant: li.dataset.variant
  }));
  /** Ce que l'utilisateur a saisi : { name, code, kind, nets } (la valeur des champs, jamais écrite avant le dernier bouton). */
  function wizardValues(view) {
    const w = view.querySelector('[data-wizard]'),
      v = k => w.querySelector(`[data-f="${k}"]`)?.value.trim() ?? '';
    return {
      name: v('co-name').slice(0, 61),
      code: v('co-code'),
      kind: w.querySelector('input[name="wz-kind"]:checked')?.value || '',
      nets: Object.fromEntries(AIRLINE_NETWORKS.map(k => [k, !!w.querySelector(`[data-co-net="${k}"]`)?.checked]))
    };
  }
  /** Dit un message dans le stepper (vide : l'efface). */
  function wizardSay(view, text) {
    const m = view.querySelector('[data-wizard] [data-msg]');
    if (m) {
      m.textContent = text || '';
      m.dataset.kind = 'err';
    }
  }
  /** Le code proposé d'après le nom (le premier mot, lettres et chiffres sans accent, 8 signes au plus) ; '' si rien ne s'y prête. */
  const proposeCode = name => catId(name.split(/\s+/)[0] || '').replace(/-/g, '').slice(0, 8);
  /** La vérification du pas « Identité » : le nom, le code (règle, pas `perso`, pas déjà pris, pas de dossier orphelin), le genre, vingt compagnies au plus ; rend '' ou la phrase du refus. `resume` : une création interrompue (son dossier est le nôtre). */
  async function wizardCheck(env, v, resume = false) {
    const {
      t,
      FD
    } = env;
    if (!v.name || v.name.length > 60) return t(TA.badName);
    if (!AIRLINE_CODE.test(v.code) || v.code === PERSO) return t(TA.badCode);
    if (!KINDS.includes(v.kind)) return t(TA.noKind);
    const ad = airlineData(FD),
      list = airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null));
    if (list.some(a => a.code === v.code)) return t(TA.taken);
    if (list.length >= AIRLINE_MAX) return t(TA.full);
    if (!resume && await ad.get(`airline/${v.code}/settings.json`, {
        wait: true
      }).catch(() => null)) return t(TA.dirExists);
    return '';
  }
  /** Le résumé du dernier pas, en mots de pilote : « Rennes Motoculture · Commerciale · IVAO » (les pas de la catégorie et de la flotte s'y ajoutent). */
  function wizardSummary(env, v) {
    const KN = AIR.get(env.view)?.CL?.KIND_NAMES,
      nets = AIRLINE_NETWORKS.filter(k => v.nets[k]).map(k => env.t(TA.net[k]));
    return [v.name, KN ? env.t(KN[v.kind]) : '', ...nets, nounText(env.view, 'theme', wizardThemes(env.view).n), nounText(env.view,
      'aircraft', wizardFleet(env.view).length)].filter(Boolean).join(' · ');
  }
  /** « Suivant » et « Retour » : d'un pas à l'autre (l'identité est vérifiée en quittant le premier), sans rien perdre ; le résumé est composé en y arrivant. */
  async function wizardMove(env, dir) {
    const {
      view
    } = env, w = view.querySelector('[data-wizard]'), at = w?.dataset.step, i = WZ_STEPS.indexOf(at), to = WZ_STEPS[i + dir];
    if (!w || !to) return;
    wizardSay(view, '');
    if (dir > 0 && at === 'identity') {
      const v = wizardValues(view),
        why = await wizardCheck(env, v);
      if (why) return wizardSay(view, why);
      wizardThemesBuild(env, v.kind);
    }
    if (to === 'fleet') {
      wizardFleetPaint(view, env.t);
      wizardSheetSearch(env);
    }
    if (to === 'summary') w.querySelector('[data-wz-summary]').textContent = wizardSummary(env, wizardValues(view));
    wizardShow(view, to);
  }
  /** Les noms des genres dans les boutons du stepper (une seule source : KIND_NAMES), posés quand le module des catégories est là. */
  function wizardKindNames(view, CL, t) {
    if (!CL?.KIND_NAMES) return;
    for (const b of view.querySelectorAll('[data-wizard] [data-kind-name], [data-join] [data-kind-name]')) b.textContent = t(CL
      .KIND_NAMES[b.dataset.kindName]);
  }
  /** « Créer la compagnie » (ou « Reprendre ») : les fichiers dans l'ordre — réglages, flotte, puis l'INDEX en dernier (une compagnie n'est dans la liste que complète) — sans jamais écraser un fichier existant ; un échec à mi-chemin dit ce qui est fait et propose « Reprendre ». */
  async function createAirline(env, resume) {
    const {
      view,
      t,
      FD,
      c
    } = env, v = wizardValues(view);
    wizardSay(view, '');
    const why = await wizardCheck(env, v, resume);
    if (why) return wizardSay(view, why);
    const ad = airlineData(FD),
      list = airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null)),
      stamp = {
        updated_at: now(),
        by: env.id?.trigram || ''
      },
      themesFile = wizardThemesFile(view, v, stamp.updated_at, stamp.by),
      FL = await import(new URL('modules/aircraft/fleet.js', ROOT).href).catch(() => null),
      fleet = wizardFleet(view).map(a => FL ? FL.normalize(a) : a),
      todo = [
        ['settings', `airline/${v.code}/settings.json`, {
          schema: 1,
          name: v.name,
          networks: v.nets,
          kind: v.kind,
          ...stamp
        }],
        ...(themesFile ? [
          ['themes', `airline/${v.code}/themes.json`, themesFile]
        ] : []),
        ['fleet', `airline/${v.code}/fleet.json`, {
          schema: 1,
          aircraft: fleet,
          ...stamp
        }],
        ['index', INDEX, {
          schema: 1,
          airlines: [...list, {
            code: v.code,
            name: v.name
          }],
          ...stamp
        }]
      ],
      done = [];
    try {
      for (const [part, path, body] of todo) {
        // un fichier déjà là (une création reprise) n'est jamais réécrit ; l'index se fusionne par code
        if (part !== 'index' && await ad.get(path, {
            wait: true
          }).catch(() => null)) {
          done.push(part);
          continue;
        }
        await ad.put(path, body);
        done.push(part);
      }
    } catch {
      WZ.set(view, {
        resume: true
      });
      wizardShow(view, 'summary');
      return wizardSay(view, t(TA.partial, {
        done: done.map(k => t(TA.part[k])).join(', ') || '—',
        todo: todo.map(x => x[0]).filter(k => !done.includes(k)).map(k => t(TA.part[k])).join(', ')
      }));
    }
    WZ.set(view, {
      resume: false,
      code: v.code
    });
    view.querySelector('[data-wz-done]').textContent = t(TA.added, {
      n: v.name
    });
    wizardShow(view, 'done');
    c.notify(t(TA.added, {
      n: v.name
    }), 'ok');
    return airlineLive(env);
  }
  /** « Rester ici » : le stepper se vide et revient au premier pas. */
  function wizardReset(view) {
    const w = view.querySelector('[data-wizard]');
    if (!w) return;
    for (const i of w.querySelectorAll('input[data-f]')) {
      i.value = '';
      delete i.dataset.touched;
    }
    for (const i of w.querySelectorAll('[data-co-net]')) i.checked = false;
    w.querySelector('[data-wz-fleet]')?.replaceChildren();
    w.querySelector('[data-wz-results]')?.replaceChildren();
    const pick = w.querySelector('[data-wz-pick]');
    if (pick) {
      pick.hidden = true;
      delete pick.dataset.type;
    }
    const pane = w.querySelector('[data-step-pane="themes"]');
    if (pane) {
      pane.innerHTML = '';
      delete pane.dataset.kind;
    }
    const va = w.querySelector('input[name="wz-kind"][value="va"]');
    if (va) va.checked = true;
    WZ.set(view, {
      resume: false
    });
    wizardSay(view, '');
    w.style.minHeight = '';
    wizardShow(view, 'identity');
    w.style.minHeight = '';
  }
  /** Les saisies du stepper : le code se propose d'après le nom tant qu'il n'a pas été touché (une écoute par vue). */
  const WZ_WIRED = new WeakSet(),
    WZ_ENV = new WeakMap();

  function wizardWire(view) {
    if (WZ_WIRED.has(view)) return;
    WZ_WIRED.add(view);
    // la page de la flotte collée : le HTML du presse-papiers est gardé (les tableaux et les titres d'opérateur), meilleur que le texte
    view.addEventListener('paste', e => {
      if (e.target?.dataset?.f !== 'jn-page') return;
      JN.set(view, {
        ...JN.get(view),
        html: e.clipboardData?.getData('text/html') || ''
      });
    });
    view.addEventListener('input', e => {
      if (e.target?.dataset?.f === 'jn-page' && !e.target.value) JN.set(view, {
        ...JN.get(view),
        html: ''
      });
      const f = e.target?.dataset?.f;
      if (f === 'co-code') e.target.dataset.touched = '1';
      if (f === 'wz-sheet-q' && WZ_ENV.get(view)) wizardSheetSearch(WZ_ENV.get(view));
      if (f !== 'co-name') return;
      const code = view.querySelector('[data-wizard] [data-f="co-code"]');
      if (code && !code.dataset.touched) code.value = proposeCode(e.target.value);
    });
  }
  // « Rejoindre une compagnie » (§ 10.38 bis) : la page de la flotte collée, lue sur cet appareil, montrée avant d'écrire
  const JN = new WeakMap(); // par vue : { aircraft (lus), html (la page collée en HTML), resume, code }
  const JN_MAX = 2000;
  /** L'assistant « Rejoindre » : un bloc construit une fois, deux pas (la page, ce qui en a été lu) et une fin. */
  function joinHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<details data-airline-join><summary>${esc(t(TA.join))}</summary><div class="f-wizard" data-join data-step="site">
      <section data-jn-pane="site"><p class="f-muted">${esc(t(TA.jnHint))}</p>
        <label class="f-field">${esc(t(TA.jnPage))}<textarea data-f="jn-page" rows="6" autocomplete="off" spellcheck="false"></textarea></label>
        <div class="f-row"><button type="button" data-act="companyJnClip">${esc(t(TA.jnClip))}</button></div></section>
      <section data-jn-pane="read" hidden><p data-jn-counts></p>${fld('jn-name', TA.name, '')}${fld('jn-code', TA.code, '')}
        <fieldset><legend>${esc(t(TA.kindLabel))}</legend>${KINDS.map(k => `<label class="f-check f-kind"><input type="radio" name="jn-kind" value="${k}"${k === 'sog' ? ' checked' : ''}><span><b data-kind-name="${k}"></b><span class="f-muted">${esc(t(TA.kindHelp[k]))}</span></span></label>`).join('')}</fieldset>
        <fieldset><legend>${esc(t(TA.networks))}</legend>${AIRLINE_NETWORKS.map(k => `<label class="f-check"><input type="checkbox" data-jn-net="${k}"> ${esc(t(TA.net[k]))}</label>`).join('')}</fieldset>
        ${fld('jn-site', TA.jnSite, '')}<p class="f-muted" data-jn-missions>${esc(t(TA.jnMissions))}</p></section>
      <section data-jn-pane="done" hidden><p data-jn-done></p><div class="f-row"><button type="button" class="primary" data-act="companyJnFly">${esc(t(TA.fly))}</button><button type="button" data-act="companyJnStay">${esc(t(TA.stay))}</button></div></section>
      <p class="f-msg" data-jn-msg></p>
      <div class="f-row" data-jn-nav><button type="button" data-act="companyJnBack" hidden>${esc(t(TA.back))}</button><button type="button" class="primary" data-act="companyJnNext">${esc(t(TA.jnRead))}</button><button type="button" class="primary" data-act="companyJnGo" hidden>${esc(t(TA.jnGo))}</button><button type="button" class="primary" data-act="companyJnResume" hidden>${esc(t(TA.resume))}</button></div></div></details>`;
  }
  /** Montre un pas de l'assistant (site, read, done) : volets et boutons ; la hauteur du bloc ne diminue pas (règle 22). */
  function joinShow(view, name) {
    const w = view.querySelector('[data-join]');
    if (!w) return;
    w.style.minHeight = `${Math.max(w.offsetHeight, parseFloat(w.style.minHeight) || 0)}px`;
    w.dataset.step = name;
    for (const pane of w.querySelectorAll('[data-jn-pane]')) pane.hidden = pane.dataset.jnPane !== name;
    const resume = !!JN.get(view)?.resume,
      nav = w.querySelector('[data-jn-nav]'),
      on = {
        companyJnBack: name === 'read',
        companyJnNext: name === 'site',
        companyJnGo: name === 'read' && !resume,
        companyJnResume: name === 'read' && resume
      };
    for (const [act, show] of Object.entries(on)) nav.querySelector(`[data-act="${act}"]`).hidden = !show;
    nav.hidden = name === 'done';
  }
  /** Dit un message dans l'assistant (vide : l'efface). */
  function joinSay(view, text) {
    const m = view.querySelector('[data-jn-msg]');
    if (m) {
      m.textContent = text || '';
      m.dataset.kind = 'err';
    }
  }
  /** Un appareil lu de la page, ramené à des textes bornés (la page est une entrée non fiable) : l'immatriculation, le type, la variante, l'opérateur, les indicatifs, la base, l'emplacement. */
  function joinClean(a) {
    const tx = (v, n) => String(v ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, n);
    return {
      registration: tx(a?.registration, 12).toUpperCase(),
      type: tx(a?.type, 12).toUpperCase(),
      variant: tx(a?.variant, 40),
      operator: tx(a?.operator, 60),
      callsigns: (Array.isArray(a?.callsigns) ? a.callsigns : []).slice(0, 6).map(c => tx(c, 12).toUpperCase()).filter(Boolean),
      base: tx(a?.base, 40),
      tacticalNumber: tx(a?.tacticalNumber, 20),
      number: tx(a?.number, 20),
      operational: a?.operational !== false,
      location: tx(a?.location, 40)
    };
  }
  /** Lit la page collée (le HTML copié s'il y en a, sinon le texte) par l'analyseur du module Site : les appareils, bornés. */
  async function joinParse(view) {
    const st = JN.get(view) || {},
      raw = String(st.html || view.querySelector('[data-f="jn-page"]')?.value || '').slice(0, 2e6);
    if (!raw.trim()) return null;
    const M = await import(new URL('modules/website/model.js', ROOT).href).catch(() => null);
    return M ? M.parseFleet(raw).slice(0, JN_MAX).map(joinClean).filter(a => a.registration) : [];
  }
  /** « Lire la page » : les appareils lus, avec leur nombre et celui des opérateurs, le nom et le code proposés (l'opérateur le plus présent), puis le pas « ce qui a été lu » ; rien n'est écrit. */
  async function joinNext(env) {
    const {
      view,
      t
    } = env;
    joinSay(view, '');
    const list = await joinParse(view);
    if (list === null) return joinSay(view, t(TA.jnEmpty));
    if (!list.length) return joinSay(view, t(TA.jnNone));
    JN.set(view, {
      ...JN.get(view),
      aircraft: list
    });
    const ops = new Map();
    for (const a of list) ops.set(a.operator, (ops.get(a.operator) || 0) + 1);
    const top = [...ops.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || '',
      w = view.querySelector('[data-join]'),
      name = w.querySelector('[data-f="jn-name"]'),
      code = w.querySelector('[data-f="jn-code"]');
    w.querySelector('[data-jn-counts]').textContent = t(TA.jnCounts, {
      a: nounText(view, 'aircraft', list.length),
      b: nounText(view, 'operator', ops.size)
    });
    if (!name.value) name.value = top.slice(0, 60);
    if (!code.value) code.value = proposeCode(name.value);
    joinShow(view, 'read');
  }
  /** Les saisies du pas « ce qui a été lu » : { name, code, kind, nets, site }. */
  function joinValues(view) {
    const w = view.querySelector('[data-join]'),
      v = k => w.querySelector(`[data-f="${k}"]`)?.value.trim() ?? '';
    return {
      name: v('jn-name').slice(0, 61),
      code: v('jn-code'),
      kind: w.querySelector('input[name="jn-kind"]:checked')?.value || '',
      nets: Object.fromEntries(AIRLINE_NETWORKS.map(k => [k, !!w.querySelector(`[data-jn-net="${k}"]`)?.checked])),
      site: v('jn-site')
    };
  }
  /** « Rejoindre » (ou « Reprendre ») : la compagnie vérifiée comme à la création (une compagnie déjà dans la liste n'est pas rejointe), puis les réglages (avec le genre et, s'il est valable, l'adresse du site), la flotte lue et l'INDEX en dernier ; aucun fichier existant n'est réécrit. */
  async function joinGo(env, resume) {
    const {
      view,
      t,
      FD,
      c
    } = env, v = joinValues(view), aircraft = JN.get(view)?.aircraft || [];
    joinSay(view, '');
    if (!aircraft.length) return joinSay(view, t(TA.jnNone));
    let site = '';
    if (v.site) {
      try {
        const u = new URL(v.site);
        if (u.protocol !== 'https:' || v.site.length > 200) throw new Error('site');
        site = u.origin + u.pathname.replace(/\/$/, '');
      } catch {
        return joinSay(view, t(TA.jnBadSite));
      }
    }
    const why = await wizardCheck(env, v, resume);
    if (why) return joinSay(view, why === t(TA.taken) ? t(TA.jnTaken) : why);
    const ad = airlineData(FD),
      list = airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null)),
      stamp = {
        updated_at: now(),
        by: env.id?.trigram || ''
      },
      todo = [
        ['settings', `airline/${v.code}/settings.json`, {
          schema: 1,
          name: v.name,
          networks: v.nets,
          kind: v.kind,
          ...(site ? {
            site
          } : {}),
          ...stamp
        }],
        ['fleet', `airline/${v.code}/fleet.json`, {
          schema: 1,
          aircraft,
          ...stamp
        }],
        ['index', INDEX, {
          schema: 1,
          airlines: [...list, {
            code: v.code,
            name: v.name
          }],
          ...stamp
        }]
      ],
      done = [];
    try {
      for (const [part, path, body] of todo) {
        if (part !== 'index' && await ad.get(path, {
            wait: true
          }).catch(() => null)) {
          done.push(part);
          continue;
        }
        await ad.put(path, body);
        done.push(part);
      }
    } catch {
      JN.set(view, {
        ...JN.get(view),
        resume: true
      });
      joinShow(view, 'read');
      return joinSay(view, t(TA.partial, {
        done: done.map(k => t(TA.part[k])).join(', ') || '—',
        todo: todo.map(x => x[0]).filter(k => !done.includes(k)).map(k => t(TA.part[k])).join(', ')
      }));
    }
    JN.set(view, {
      ...JN.get(view),
      resume: false,
      code: v.code
    });
    view.querySelector('[data-jn-done]').textContent = t(TA.added, {
      n: v.name
    });
    joinShow(view, 'done');
    c.notify(t(TA.added, {
      n: v.name
    }), 'ok');
    return airlineLive(env);
  }
  /** Le presse-papiers (le HTML d'abord, le texte sinon) dans la zone de l'assistant, comme le fait le module Site. */
  async function joinClip(env) {
    const {
      view,
      t
    } = env;
    try {
      let html = '',
        text = '';
      if (navigator.clipboard?.read) {
        for (const item of await navigator.clipboard.read()) {
          if (item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
          if (item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
        }
      } else text = await navigator.clipboard.readText();
      JN.set(view, {
        ...JN.get(view),
        html
      });
      view.querySelector('[data-f="jn-page"]').value = (text || html).slice(0, 2e6);
      return joinNext(env);
    } catch {
      joinSay(view, t(TA.jnEmpty));
    }
  }
  /** « Rester ici » : l'assistant se vide et revient à la page. */
  function joinReset(view) {
    const w = view.querySelector('[data-join]');
    if (!w) return;
    for (const i of w.querySelectorAll('input[data-f], textarea')) i.value = '';
    for (const i of w.querySelectorAll('[data-jn-net]')) i.checked = false;
    const sog = w.querySelector('input[name="jn-kind"][value="sog"]');
    if (sog) sog.checked = true;
    JN.set(view, {});
    joinSay(view, '');
    w.style.minHeight = '';
    joinShow(view, 'site');
    w.style.minHeight = '';
  }
  // par vue : ce que la dernière lecture a rendu (lignes, module des catégories, langue, choix possible, compagnie courante), pour repeindre la fiche sans relire
  const AIR = new WeakMap();
  /** « 3 appareils », « 1 appareil » : le nombre et le nom accordé (TA.noun) dans la langue de l'écran. */
  function nounText(view, key, n) {
    const A = AIR.get(view),
      i = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(A?.lang || 'fr')),
      forms = TA.noun[key][i];
    return `${n} ${A?.PL ? A.PL.plural(A.lang, n, forms) : forms[1]}`;
  }
  /** Met la liste à jour SANS la redessiner : une ligne dont le HTML est inchangé garde son nœud (le focus, la hauteur, rien ne bouge) ; seule une ligne qui change est remplacée, une ligne nouvelle insérée, une ligne disparue retirée. */
  function paintRows(box, rows, t, can, CL, aircraft) {
    const metaSpan = m => `<span class="f-muted" data-co-meta>${esc(m)}</span></label>`;
    const keys = new Set(rows.map(r => r.code));
    for (const n of [...box.children])
      if (!keys.has(n.dataset.airline)) n.remove();
    rows.forEach((r, i) => {
      const [head, meta] = airlineRowParts(r, t, can, CL, aircraft),
        html = head + metaSpan(meta),
        cur = box.children[i];
      if (cur && cur.dataset.airline === r.code && cur.__html === html) return;
      // la même ligne dont seul le texte gris change (les détails arrivent) : le texte est remplacé EN PLACE, rien ne bouge et le bouton radio garde son focus
      if (cur && cur.dataset.airline === r.code && cur.__head === head) {
        cur.querySelector('[data-co-meta]').textContent = meta;
        cur.__html = html;
        return;
      }
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const n = tpl.content.firstElementChild;
      n.__html = html;
      n.__head = head;
      if (cur && cur.dataset.airline === r.code) cur.replaceWith(n);
      else box.insertBefore(n, cur || null);
    });
  }
  /** La compagnie courante : le bouton radio coché et `data-current` sur sa ligne, rien d'autre ne change. */
  function markCurrent(view, now) {
    for (const row of view.querySelectorAll('[data-airlines] [data-airline]')) {
      const on = row.dataset.airline === now;
      row.toggleAttribute('data-current', on);
      row.querySelector('input').checked = on;
    }
  }
  /** Repeint la fiche de la compagnie choisie d'après la dernière lecture ; le nœud n'est touché que si son HTML change, et le focus d'un bouton radio du genre est rendu. */
  function paintFiche(env) {
    const {
      view,
      t
    } = env, host = view.querySelector('[data-airline-fiche]'), s = AIR.get(view);
    if (!host || !s) return;
    const html = airlineFicheHtml(s.rows.find(r => r.code === s.now), s.CL, s.lang, t);
    if (host.__html === html) return;
    const kind = document.activeElement?.closest?.('[data-airline-fiche]') ? document.activeElement.dataset?.kind : '';
    host.innerHTML = html;
    host.__html = html;
    if (kind) host.querySelector(`[data-kind="${kind}"]`)?.focus();
  }
  /** Dit un message sous la fiche (vide : l'efface). */
  function ficheSay(env, text) {
    const m = env.view.querySelector('[data-fiche-msg]');
    if (m) m.textContent = text || '';
  }
  /** Lit les compagnies et peint : la liste à boutons radio (sans redessin des lignes inchangées), la compagnie courante, sa fiche ; la migration et la note comme avant. Le choix passe par FrameData.setAirline, absent : boutons gris et dit. */
  async function airlineLive(env) {
    const {
      view,
      t,
      FD
    } = env,
    box = view.querySelector('[data-airlines]');
    if (!box) return;
    const lang = env.t(['fr', 'en', 'de',
        'es'
      ]), // la langue de l'écran : le texte de la ligne qui lui correspond (le contexte n'en donne pas toujours la fonction)
      token = (view.__airToken = (view.__airToken || 0) + 1), // une lecture plus récente (un geste vient d'écrire) reprend la main
      libs = Promise.all([catLib(), plLib()]), // les deux modules se chargent pendant les lectures, jamais l'un après l'autre
      can = typeof FD.setAirline === 'function',
      // la compagnie courante se lit en même temps que la liste, mais la liste ne l'attend pas (elle lit les réglages de la compagnie : lente sur un appareil lent)
      nowP = typeof FD.airline === 'function' ? Promise.resolve(FD.airline()).then(a => String(a?.code || '')).catch(() => '') : Promise
      .resolve(''),
      // 1) la liste se dessine aussitôt (SOG-0218) : l'index seul, la ligne grise vient après
      index = await readAirlineList(FD);
    if (!view.isConnected || token !== view.__airToken) return;
    const prev = AIR.get(view),
      // la compagnie courante connue sans attendre : celle du dessin précédent, sinon celle que le cadre a déjà lue
      now0 = prev?.now || String(env.c?.airline?.code || ''),
      quick = prev?.rows?.length && prev.token !== undefined ? prev.rows.filter(r => r.code === PERSO || index.list.some(a => a.code ===
        r.code)) : quickRows(index.list, t);
    // les lignes déjà lues le restent (un nouveau dessin ne les vide pas) ; celles que la liste a de plus sont sans détail
    const first = quickRows(index.list, t).map(r => quick.find(q => q.code === r.code) || r);
    AIR.set(view, {
      rows: first,
      CL: prev?.CL || null,
      PL: prev?.PL || null,
      lang,
      now: now0,
      token
    });
    WZ_ENV.set(view, env);
    wizardWire(view);
    paintRows(box, first, t, can, prev?.CL || null, n => nounText(view, 'aircraft', n));
    markCurrent(view, now0);
    paintAirlineNotes(env, index.list, can);
    // 2) les détails de chaque compagnie (et les deux modules) : la ligne grise, la fiche de la compagnie choisie
    const [rows, [CL, PL], now] = await Promise.all([readAirlines(FD, t, index), libs, nowP]);
    if (!view.isConnected || token !== view.__airToken) return;
    AIR.set(view, {
      rows,
      CL,
      PL,
      lang,
      now,
      token
    });
    wizardKindNames(view, CL, t);
    paintRows(box, rows, t, can, CL, n => nounText(view, 'aircraft', n));
    markCurrent(view, now);
    paintFiche(env);
  }
  /** La migration (seulement sur le poste du lanceur et tant que la compagnie d'aujourd'hui est encore à la racine de data/airline/) et la note sous la liste (le choix pas encore possible, ou aucune compagnie). */
  function paintAirlineNotes(env, list, can) {
    const {
      view,
      t
    } = env, mig = view.querySelector('[data-mig]');
    if (mig) {
      const L = env.L && !env.L.lan,
        pending = L && list.some(r => r.code === 'default');
      mig.hidden = !pending;
      if (pending && !mig.firstChild) mig.innerHTML = migHtml(env);
    }
    const note = view.querySelector('[data-airline-note]'),
      n = list.length + 1;
    if (note) {
      note.hidden = can && n > 1 && list.length > 0;
      note.textContent = !can ? t(TA.unavailable) : list.length ? '' : t(TA.none);
    }
  }
  /** Lance airline/migrate sur le lanceur du poste et attend sa fin (quelques secondes) : le résultat (objet) ou null (pas de lanceur, pas de réponse, travail en échec). */
  async function runMigrate(c, args) {
    const r = await c.launcherRequest('regen/job', {
      json: {
        set: 'airline',
        verb: 'migrate',
        args
      }
    }).catch(() => null);
    const id = r?.body?.job;
    if (!id || r.status >= 400) return null;
    for (let i = 0; i < 40; i++) {
      await new Promise(ok => setTimeout(ok, 400));
      const st = (await c.launcherRequest(`regen/job?id=${encodeURIComponent(id)}`).catch(() => null))?.body;
      if (st?.state && st.state !== 'running') return st.state === 'done' && st.result && typeof st.result === 'object' ? st.result :
        null;
    }
    return null;
  }
  /** Le résultat du lanceur lu en liste fermée (audit 157) : { ok, code, name, files: [{ name, bytes }], reason }. */
  const migResult = r => ({
    ok: r?.ok === true,
    code: typeof r?.code === 'string' && AIRLINE_CODE.test(r.code) ? r.code : '',
    name: typeof r?.name === 'string' ? r.name.slice(0, 80) : '',
    files: (Array.isArray(r?.files) ? r.files : []).filter(f => MIG_FILES.includes(f?.name)).slice(0, 3).map(f => ({
      name: f.name,
      bytes: Number.isInteger(f.bytes) && f.bytes >= 0 ? Math.min(f.bytes, 1e9) : 0
    })),
    reason: typeof r?.reason === 'string' && Object.hasOwn(TA.migWhy, r.reason) ? r.reason : r ? '' : 'none'
  });
  /** Le bloc de migration (compagnie encore à la racine de data/airline/ : « default » dans la liste du cadre) : un code facultatif, « Voir ce qui serait fait », puis « Migrer ». */
  function migHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<p class="f-muted">${esc(t(TA.migHint))}</p>${fld('mig-code', TA.migCode, '')}<div class="f-row"><button type="button" data-act="companyPlan">${esc(t(TA.migPlan))}</button></div><div data-mig-plan></div><p class="f-msg" data-msg></p>`;
  }
  /** Les gestes de la carte : « Choisir » (FrameData.setAirline(code), le code revérifié) et « Ajouter » (nom, code, réseaux : les dossiers et l'index écrits, jamais un fichier existant écrasé). */
  async function airlineRun(env, act, b) {
    const {
      t,
      FD,
      c,
      card,
      val,
      say,
      again
    } = env;
    if (act === 'companyChoose') {
      const code = b.dataset.code || '';
      if (!(AIRLINE_CODE.test(code) || code === PERSO) || typeof FD.setAirline !== 'function') return;
      // le choix s'applique à l'appui : seuls l'état des radios et la fiche changent (aucun redessin de la liste) ; refusé (faux), la lecture dit ce qui est
      const ok = await FD.setAirline(code),
        s = AIR.get(env.view);
      if (ok === false || !s) return airlineLive(env);
      s.now = code;
      markCurrent(env.view, code);
      return paintFiche(env);
    }
    if (act === 'companyKind' || act === 'companyTheme') {
      const code = b.dataset.code || '';
      if (!AIRLINE_CODE.test(code)) return;
      if (act === 'companyKind') {
        const k = KINDS.includes(b.dataset.kind) ? b.dataset.kind : '';
        if (!k) return;
        if (!await writeKind(env, code, k)) {
          // le radio a changé d'état pour rien : la fiche se repeint d'après la dernière lecture, puis le dit
          const host = env.view.querySelector('[data-airline-fiche]');
          if (host) host.__html = '';
          paintFiche(env);
          return ficheSay(env, t(TA.failed));
        }
        c.notify(t(TA.kindSaved), 'ok');
        return airlineLive(env);
      }
      // un thème coché ou décoché : les cases de la fiche, dans l'ordre de la table, sont le nouveau choix (au moins un) ; themes.json est écrit, `added` gardé
      const chosen = [...env.view.querySelectorAll('[data-airline-fiche] [data-themes] input[data-theme]')].filter(i => i.checked).map(
          i => i.dataset.theme),
        why = await writeThemes(env, code, chosen);
      if (why) {
        const host = env.view.querySelector('[data-airline-fiche]');
        if (host) host.__html = '';
        paintFiche(env);
        return ficheSay(env, t(TA[why] || TA.failed));
      }
      c.notify(t(TA.themeSaved), 'ok');
      return airlineLive(env);
    }
    if (act === 'companyPlan' || act === 'companyMigrate') {
      const root = card('company'),
        out = root.querySelector('[data-mig-plan]'),
        typed = val('mig-code', root),
        // le message de la migration se dit dans son propre bloc (celui de « Créer une compagnie » est replié)
        migSay = text => {
          const m = root.querySelector('[data-mig] [data-msg]');
          if (m) {
            m.textContent = text || '';
            m.dataset.kind = 'err';
          }
        };
      if (typed && !AIRLINE_CODE.test(typed)) return migSay(t(TA.badCode));
      const dry = act === 'companyPlan',
        res = migResult(await runMigrate(c, {
          dry,
          ...(typed ? {
            code: typed
          } : {})
        }));
      if (dry && res.ok && res.code) {
        out.innerHTML = `<p>${esc(t(TA.migPlanned, { n: res.name, c: res.code }))}</p><ul>${res.files.map(f => `<li>${esc(t(TA.migFile, { f: f.name, b: f.bytes }))}</li>`).join('')}</ul><p class="f-muted">${esc(t(TA.migFleet))}</p>
          <div class="f-row"><button type="button" class="primary" data-act="companyMigrate">${esc(t(TA.migGo, { c: res.code }))}</button></div>`;
        const field = root.querySelector('[data-f="mig-code"]');
        if (field) field.value = res.code;
        return migSay('');
      }
      if (!dry && res.ok) {
        c.notify(t(TA.migDone, {
          c: res.code
        }), 'ok');
        return again();
      }
      if (out) out.innerHTML = '';
      return migSay(t(TA.migWhy[res.reason || 'failed']));
    }
    if (act === 'companyNext' || act === 'companyBack') return wizardMove(env, act === 'companyNext' ? 1 : -1);
    if (act === 'companyAdd' || act === 'companyResume') return createAirline(env, act === 'companyResume');
    if (act === 'companyStay') return wizardReset(env.view);
    if (act === 'companyJnClip') return joinClip(env);
    if (act === 'companyJnNext') return joinNext(env);
    if (act === 'companyJnBack') return joinShow(env.view, 'site');
    if (act === 'companyJnGo' || act === 'companyJnResume') return joinGo(env, act === 'companyJnResume');
    if (act === 'companyJnStay') return joinReset(env.view);
    if (act === 'companyJnFly') {
      const code = JN.get(env.view)?.code || '';
      if (AIRLINE_CODE.test(code) && typeof FD.setAirline === 'function') await FD.setAirline(code);
      joinReset(env.view);
      location.hash = '#missions';
    }
    if (act === 'companyWzSheet') return wizardSheetPick(env, b.dataset.id || '');
    if (act === 'companyWzReg') return wizardRegAdd(env);
    if (act === 'companyWzRegDel') {
      b.closest('li')?.remove();
      return wizardFleetPaint(env.view, env.t);
    }
    if (act === 'companyWzLater') return wizardMove(env, 1);
    if (act === 'companyFly') {
      // « Voler pour cette compagnie » : la compagnie devient la courante, puis Missions
      const code = WZ.get(env.view)?.code || '';
      if (AIRLINE_CODE.test(code) && typeof FD.setAirline === 'function') await FD.setAirline(code);
      wizardReset(env.view);
      location.hash = '#missions';
    }
  }

  (window.SogSettingsParts ||= {}).airline = {
    acts: ['companyChoose', 'companyAdd', 'companyNext', 'companyBack', 'companyResume', 'companyStay', 'companyFly',
      'companyJnClip', 'companyJnNext', 'companyJnBack', 'companyJnGo', 'companyJnResume', 'companyJnStay', 'companyJnFly',
      'companyWzSheet', 'companyWzReg', 'companyWzRegDel', 'companyWzLater', 'companyPlan',
      'companyMigrate', 'companyKind', 'companyTheme'
    ],
    html: airlineHtml,
    live: airlineLive,
    list: airlineList,
    run: airlineRun
  };
  (window.SogSettingsParts ||= {}).access = {
    acts: ['access', 'test', 'cut', 'sync'],
    accessHtml,
    syncHtml,
    live,
    run
  };
})();
