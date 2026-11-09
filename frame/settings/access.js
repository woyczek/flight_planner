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
    return `<div class="f-card" data-card="sync"${exchange || st.pending ? '' : ' hidden'}><h2>${esc(t(T.sync))}</h2><p data-sync-head></p><dl class="f-dl" data-sync></dl><div data-queue></div><div data-pushed-box></div><p class="f-muted">${esc(t(T.syncHint))}</p>
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
    title: ['Compagnie', 'Airline', 'Fluggesellschaft', 'Compañía'],
    hint: [
      'La compagnie courante de cet appareil : les missions, le compte rendu et la flotte lisent celle-ci. Le choix est propre à l’appareil.',
      'This device’s current airline: the missions, the report and the fleet read this one. The choice is per device.',
      'Die aktuelle Fluggesellschaft dieses Geräts: Missionen, Bericht und Flotte lesen diese. Die Wahl gilt pro Gerät.',
      'La compañía actual de este dispositivo: las misiones, el informe y la flota leen esta. La elección es por dispositivo.'
    ],
    perso: ['Personnel', 'Personal', 'Persönlich', 'Personal'],
    fleet: ['{n} appareil(s)', '{n} aircraft', '{n} Luftfahrzeug(e)', '{n} aeronave(s)'],
    choose: ['Choisir', 'Choose', 'Wählen', 'Elegir'],
    current: ['courante', 'current', 'aktuell', 'actual'],
    unavailable: ['Le choix n’est pas encore disponible dans ce cadre.', 'Choosing is not yet available in this frame.',
      'Die Auswahl ist in diesem Rahmen noch nicht verfügbar.', 'La elección aún no está disponible en este marco.'
    ],
    none: ['Aucune compagnie dans data/airline/index.json : ajoutez-en une.', 'No airline in data/airline/index.json: add one.',
      'Keine Fluggesellschaft in data/airline/index.json: Fügen Sie eine hinzu.',
      'Ninguna compañía en data/airline/index.json: añada una.'
    ],
    add: ['Ajouter une compagnie', 'Add an airline', 'Fluggesellschaft hinzufügen', 'Añadir una compañía'],
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
    save: ['Ajouter', 'Add', 'Hinzufügen', 'Añadir'],
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
  /** Lit l'index et, pour chaque compagnie, ses réglages et sa flotte ; rend les lignes [{ code, name, nets, fleet }] puis « Personnel ». Un fichier illisible : la ligne sans ses détails. */
  async function readAirlines(FD, t) {
    const ad = airlineData(FD),
      // la liste du cadre quand il la donne (FrameData.airlines() : celles de l'index, ou « default » avant la migration), sinon l'index lu ici ; « personnel » vient en dernier
      known = typeof FD.airlines === 'function' ? await Promise.resolve(FD.airlines()).catch(() => null) : null,
      list = known ? airlineList({
        airlines: known
      }) : airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null)),
      rows = await Promise.all(list.map(async a => {
        // avant la migration, la compagnie d'aujourd'hui (« default ») est à la racine de data/airline/
        const base = known && a.code === 'default' ? 'airline/' : `airline/${a.code}/`,
          [s, f] = await Promise.all([ad.get(`${base}settings.json`, {
            wait: true
          }).catch(() => null), ad.get(`${base}fleet.json`, {
            wait: true
          }).catch(() => null)]);
        return {
          ...a,
          name: typeof s?.name === 'string' && s.name ? s.name.slice(0, 60) : a.name,
          nets: airlineNets(s),
          fleet: airlineFleet(f)
        };
      }));
    return [...rows, {
      code: PERSO,
      name: t(TA.perso),
      nets: [],
      fleet: null
    }];
  }
  /** La carte Compagnie : le bloc des lignes (rempli par airlineLive) et le formulaire « Ajouter une compagnie » ; le niveau Complet, ou l'adresse #settings?card=company. */
  function airlineHtml(env) {
    const {
      t,
      lvl,
      focus,
      fld
    } = env;
    if (lvl !== 3 && focus !== 'company') return '';
    return `<div class="f-card" data-card="company"><h2>${esc(t(TA.title))}</h2><p class="f-muted">${esc(t(TA.hint))}</p><ul class="f-queue" data-airlines></ul><p class="f-warn" data-airline-note hidden></p><div data-mig hidden></div>
      <details data-airline-add><summary>${esc(t(TA.add))}</summary>${fld('co-name', TA.name, '')}${fld('co-code', TA.code, '')}
      <fieldset><legend>${esc(t(TA.networks))}</legend>${AIRLINE_NETWORKS.map(k => `<label class="f-check"><input type="checkbox" data-co-net="${k}"> ${esc(t(TA.net[k]))}</label>`).join('')}</fieldset>
      <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="companyAdd">${esc(t(TA.save))}</button></div></details></div>`;
  }
  /** Dessine les lignes : nom, code, réseaux, taille de flotte (quatre éléments, sous les sept permis) et « Choisir » (« courante » sur celle qui l'est) ; le choix passe par FrameData.setAirline, absent : bouton gris et dit. */
  async function airlineLive(env) {
    const {
      view,
      t,
      FD
    } = env,
    box = view.querySelector('[data-airlines]');
    if (!box) return;
    const rows = await readAirlines(FD, t);
    if (!view.isConnected) return;
    const can = typeof FD.setAirline === 'function',
      now = String((typeof FD.airline === 'function' ? await Promise.resolve(FD.airline()).catch(() => null) : null)?.code || ''),
      body = rows.map(r => `<li data-airline="${esc(r.code)}"${r.code === now ? ' data-current' : ''}><b>${esc(r.name)}</b> <code>${esc(r.code)}</code>${r.nets.length ? ` <span class="f-muted">${esc(r.nets.map(k => t(TA.net[k])).join(' · '))}</span>` : ''}${r.fleet === null ? '' : ` <span class="f-muted">${esc(t(TA.fleet, { n: r.fleet }))}</span>`}
        ${r.code === now ? `<span class="f-muted">${esc(t(TA.current))}</span>` : `<button type="button" data-act="companyChoose" data-code="${esc(r.code)}"${can ? '' : ' disabled'}>${esc(t(TA.choose))}</button>`}</li>`).join('');
    box.innerHTML = body;
    // la migration : seulement sur le poste du lanceur et tant que la compagnie d'aujourd'hui est encore à la racine
    const mig = view.querySelector('[data-mig]');
    if (mig) {
      const L = env.L && !env.L.lan,
        pending = L && rows.some(r => r.code === 'default');
      mig.hidden = !pending;
      if (pending && !mig.firstChild) mig.innerHTML = migHtml(env);
    }
    const note = view.querySelector('[data-airline-note]');
    if (note) {
      note.hidden = can && rows.length > 1;
      note.textContent = !can ? t(TA.unavailable) : rows.length > 1 ? '' : t(TA.none);
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
    return `<p class="f-muted">${esc(t(TA.migHint))}</p>${fld('mig-code', TA.migCode, '')}<div class="f-row"><button type="button" data-act="companyPlan">${esc(t(TA.migPlan))}</button></div><div data-mig-plan></div>`;
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
      await FD.setAirline(code);
      return again();
    }
    if (act === 'companyPlan' || act === 'companyMigrate') {
      const root = card('company'),
        out = root.querySelector('[data-mig-plan]'),
        typed = val('mig-code', root);
      if (typed && !AIRLINE_CODE.test(typed)) return say('company', t(TA.badCode));
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
        return say('company', '');
      }
      if (!dry && res.ok) {
        c.notify(t(TA.migDone, {
          c: res.code
        }), 'ok');
        return again();
      }
      if (out) out.innerHTML = '';
      return say('company', t(TA.migWhy[res.reason || 'failed']));
    }
    const r = card('company'),
      name = val('co-name', r).slice(0, 61),
      code = val('co-code', r);
    if (!name || name.length > 60) return say('company', t(TA.badName));
    if (!AIRLINE_CODE.test(code) || code === PERSO) return say('company', t(TA.badCode));
    const ad = airlineData(FD),
      list = airlineList(await ad.get(INDEX, {
        wait: true
      }).catch(() => null));
    if (list.some(a => a.code === code)) return say('company', t(TA.taken));
    if (list.length >= AIRLINE_MAX) return say('company', t(TA.full));
    const nets = Object.fromEntries(AIRLINE_NETWORKS.map(k => [k, !!r.querySelector(`[data-co-net="${k}"]`)?.checked])),
      stamp = {
        updated_at: now(),
        by: env.id?.trigram || ''
      };
    try {
      await ad.put(`airline/${code}/settings.json`, {
        schema: 1,
        name,
        networks: nets,
        ...stamp
      });
      await ad.put(`airline/${code}/fleet.json`, {
        schema: 1,
        aircraft: [],
        ...stamp
      });
      await ad.put(INDEX, {
        schema: 1,
        airlines: [...list, {
          code,
          name
        }],
        ...stamp
      });
    } catch {
      return say('company', t(TA.failed));
    }
    c.notify(t(TA.added, {
      n: name
    }), 'ok');
    return again();
  }

  (window.SogSettingsParts ||= {}).airline = {
    acts: ['companyChoose', 'companyAdd', 'companyPlan', 'companyMigrate'],
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
