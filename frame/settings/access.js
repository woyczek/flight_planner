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
    fleet: ['{n} appareil(s)', '{n} aircraft', '{n} Luftfahrzeug(e)', '{n} aeronave(s)'],
    unavailable: ['Le choix n’est pas encore disponible dans ce cadre.', 'Choosing is not yet available in this frame.',
      'Die Auswahl ist in diesem Rahmen noch nicht verfügbar.', 'La elección aún no está disponible en este marco.'
    ],
    none: ['Aucune compagnie dans data/airline/index.json : ajoutez-en une.', 'No airline in data/airline/index.json: add one.',
      'Keine Fluggesellschaft in data/airline/index.json: Fügen Sie eine hinzu.',
      'Ninguna compañía en data/airline/index.json: añada una.'
    ],
    add: ['Créer une compagnie', 'Create an airline', 'Fluggesellschaft anlegen', 'Crear una compañía'],
    join: ['Rejoindre une compagnie', 'Join an airline', 'Einer Fluggesellschaft beitreten', 'Unirse a una compañía'],
    joinHint: [
      'Pas encore disponible : vous collerez ici l’adresse du site de la flotte de la compagnie ; elle sera lue sur ce poste et montrée avant que rien ne soit écrit.',
      'Not available yet: you will paste the address of the airline’s fleet website here; it will be read on this workstation and shown before anything is written.',
      'Noch nicht verfügbar: Sie fügen hier die Adresse der Flottenseite der Gesellschaft ein; sie wird auf diesem Rechner gelesen und gezeigt, bevor etwas geschrieben wird.',
      'Aún no disponible: pegará aquí la dirección del sitio de la flota de la compañía; se leerá en este equipo y se mostrará antes de escribir nada.'
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
      summary: ['Résumé', 'Summary', 'Zusammenfassung', 'Resumen']
    },
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
      fleet: ['la flotte', 'the fleet', 'die Flotte', 'la flota'],
      index: ['l’inscription dans la liste', 'the entry in the list', 'der Eintrag in der Liste', 'la inscripción en la lista']
    },
    partial: [
      'Création interrompue : {done} écrit(s), il reste {todo}. « Reprendre » finit sans rien écraser.',
      'Creation interrupted: {done} written, {todo} left. “Resume” finishes without overwriting anything.',
      'Anlegen unterbrochen: {done} geschrieben, offen: {todo}. „Fortsetzen“ beendet es, ohne etwas zu überschreiben.',
      'Creación interrumpida: {done} escrito(s), falta {todo}. «Reanudar» termina sin sobrescribir nada.'
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
      va: ['Une compagnie commerciale : fret, passagers, VIP, entraînement, transit, essais en vol, plus vos propres catégories.',
        'A commercial airline: cargo, passengers, VIP, training, transit, test flights, plus your own categories.',
        'Eine kommerzielle Gesellschaft: Fracht, Passagiere, VIP, Training, Transit, Testflüge, dazu Ihre eigenen Kategorien.',
        'Una compañía comercial: carga, pasajeros, VIP, entrenamiento, tránsito, vuelos de prueba, más sus propias categorías.'
      ],
      sog: ['Une escadrille SO : ses missions préparées, sans catégorie commerciale, avec vos propres catégories.',
        'An SO squadron: its prepared missions, no commercial category, with your own categories.',
        'Eine SO-Staffel: ihre vorbereiteten Missionen, keine kommerzielle Kategorie, dazu Ihre eigenen Kategorien.',
        'Un escuadrón SO: sus misiones preparadas, sin categoría comercial, con sus propias categorías.'
      ]
    },
    kindUnset: ['Choisissez le genre : les catégories du socle en dépendent.', 'Choose the kind: the base categories depend on it.',
      'Wählen Sie die Art: die Basiskategorien hängen davon ab.', 'Elija el tipo: las categorías base dependen de él.'
    ],
    persoNote: ['Personnel : vos vols hors compagnie, avec les catégories commerciales du socle ; rien à régler ici.',
      'Personal: your flights outside any airline, with the base commercial categories; nothing to set here.',
      'Persönlich: Ihre Flüge ohne Gesellschaft, mit den kommerziellen Basiskategorien; hier ist nichts einzustellen.',
      'Personal: sus vuelos fuera de toda compañía, con las categorías comerciales base; nada que ajustar aquí.'
    ],
    ficheTitle: ['Compagnie choisie : {n}', 'Chosen airline: {n}', 'Gewählte Gesellschaft: {n}', 'Compañía elegida: {n}'],
    catNone: ['Aucune pour l’instant.', 'None yet.', 'Noch keine.', 'Ninguna por ahora.'],
    catAdd: ['Ajouter une catégorie', 'Add a category', 'Kategorie hinzufügen', 'Añadir una categoría'],
    kindSaved: ['Genre enregistré.', 'Kind saved.', 'Art gespeichert.', 'Tipo guardado.'],
    catSummary: ['Catégories de missions ({n})', 'Mission categories ({n})', 'Missionskategorien ({n})',
      'Categorías de misiones ({n})'
    ],
    catName: ['Nom de la catégorie', 'Category name', 'Name der Kategorie', 'Nombre de la categoría'],
    catDel: ['Retirer', 'Remove', 'Entfernen', 'Quitar'],
    catBad: ['Nom refusé : 1 à 40 caractères, avec au moins une lettre ou un chiffre.',
      'Name refused: 1 to 40 characters, with at least one letter or digit.',
      'Name abgelehnt: 1 bis 40 Zeichen, mit mindestens einem Buchstaben oder einer Ziffer.',
      'Nombre rechazado: 1 a 40 caracteres, con al menos una letra o cifra.'
    ],
    catDup: ['Cette catégorie existe déjà.', 'This category already exists.', 'Diese Kategorie gibt es schon.',
      'Esta categoría ya existe.'
    ],
    catFull: ['Quarante catégories au plus.', 'Forty categories at most.', 'Höchstens vierzig Kategorien.',
      'Cuarenta categorías como máximo.'
    ],
    catSaved: ['Catégories enregistrées.', 'Categories saved.', 'Kategorien gespeichert.', 'Categorías guardadas.'],
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
          [s, f, cats] = await Promise.all([ad.get(`${base}settings.json`, {
            wait: true
          }).catch(() => null), ad.get(`${base}fleet.json`, {
            wait: true
          }).catch(() => null), ad.get(`${base}categories.json`, {
            wait: true
          }).catch(() => null)]);
        return {
          ...a,
          name: typeof s?.name === 'string' && s.name ? s.name.slice(0, 60) : a.name,
          nets: airlineNets(s),
          fleet: airlineFleet(f),
          kind: KINDS.includes(s?.kind) ? s.kind : '',
          cats // le categories.json lu, tel quel : le module des catégories le filtre
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
  let catLibP = null;
  /** Le module pur des catégories (frame/lib/mission_categories.js), chargé une fois ; null s'il ne se charge pas (la ligne n'a alors ni genre ni catégories). */
  const catLib = () => catLibP ||= import(new URL('frame/lib/mission_categories.js', ROOT).href).catch(() => null);
  /** Le dossier d'une compagnie sous data/ : « airline/ » avant la migration (code default), sinon « airline/<code>/ ». */
  const airlineBase = code => code === 'default' ? 'airline/' : `airline/${code}/`;
  /** La ligne de la liste (jamais un bouton « Choisir ») : bouton radio, nom, code, puis une ligne grise : le genre dit en toutes lettres, les réseaux, la flotte. Le HTML ne dit rien de l'état courant (posé ensuite sur le nœud) : deux dessins qui ne diffèrent que par le choix donnent le même texte. */
  function airlineRowHtml(r, t, can, CL) {
    const KN = CL?.KIND_NAMES,
      kind = KN ? t(KN[r.code === PERSO ? 'perso' : r.kind || 'none']) : '',
      meta = [kind, ...r.nets.map(k => t(TA.net[k])), ...(r.fleet === null ? [] : [t(TA.fleet, {
        n: r.fleet
      })])].join(' · '),
      code = esc(r.code);
    return `<label class="f-co" data-airline="${code}"><input type="radio" name="co-current" value="${code}" data-act="companyChoose" data-code="${code}"${can ? '' : ' disabled'}><span class="f-co-name"><b>${esc(r.name)}</b> <code>${code}</code></span><span class="f-muted" data-co-meta>${esc(meta)}</span></label>`;
  }
  /** La fiche de la compagnie CHOISIE (les autres n'en ont pas) : le genre en deux boutons radio, une ligne d'explication chacun ; puis les catégories de missions de ce genre, visibles, avec « Ajouter une catégorie ». « Personnel » : une ligne, rien à régler. `lang` : la langue des noms. */
  function airlineFicheHtml(r, CL, lang, t) {
    if (!r) return '';
    if (r.code === PERSO) return `<p class="f-muted" data-fiche-perso>${esc(t(TA.persoNote))}</p>`;
    if (!CL) return '';
    const info = CL.forAirline(r.cats, {
        code: r.code,
        settings: {
          kind: r.kind
        }
      }),
      code = esc(r.code);
    return `<h3>${esc(t(TA.ficheTitle, { n: r.name }))}</h3>
      <fieldset data-kind-set><legend>${esc(t(TA.kindLabel))}</legend>${KINDS.map(k => `<label class="f-check f-kind"><input type="radio" name="co-kind" value="${k}" data-act="companyKind" data-code="${code}" data-kind="${k}"${r.kind === k ? ' checked' : ''}><span><b>${esc(t(CL.KIND_NAMES[k]))}</b><span class="f-muted">${esc(t(TA.kindHelp[k]))}</span></span></label>`).join('')}</fieldset>
      <h4 data-cats-title>${esc(t(TA.catSummary, { n: info.all.length }))}</h4>${r.kind ? '' : `<p class="f-muted">${esc(t(TA.kindUnset))}</p>`}
      ${info.groups.map(g => `<p data-cat-group="${esc(g.id)}"><b>${esc(g.names[lang] || g.id)}</b></p>${g.categories.length ? `<ul class="f-cats">${g.categories.map(c => `<li data-cat="${esc(c.id)}">${esc(c.names[lang] || c.id)}${g.id === 'virtuel' ? ` <button type="button" data-act="companyCatDel" data-code="${code}" data-cat="${esc(c.id)}">${esc(t(TA.catDel))}</button>` : ''}</li>`).join('')}</ul>` : `<p class="f-muted">${esc(t(TA.catNone))}</p>`}`).join('')}
      <div class="f-row"><input type="text" maxlength="40" data-f="cat-${code}" aria-label="${esc(t(TA.catName))}" placeholder="${esc(t(TA.catName))}"><button type="button" data-act="companyCatAdd" data-code="${code}">${esc(t(TA.catAdd))}</button></div><p class="f-msg" data-fiche-msg></p>`;
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
  /** Modifie le groupe « virtuel » (les catégories propres de la compagnie) de son categories.json : le fichier d'aujourd'hui, à défaut la base commune, devient le fichier de la compagnie (il remplace la base). `edit(own, file)` rend '' (fait) ou la clé du refus. Rend '' ou la clé du refus. */
  async function writeCats(env, code, edit) {
    const CL = await catLib();
    if (!CL) return 'failed';
    const ad = airlineData(env.FD),
      path = `${airlineBase(code)}categories.json`,
      file = CL.clean(await ad.get(path, {
        wait: true
      }).catch(() => null)) || CL.clean(CL.BASE);
    let own = file.groups.find(g => g.id === 'virtuel');
    if (!own) {
      if (file.groups.length >= CL.GROUPS_MAX) return 'catFull';
      own = {
        id: 'virtuel',
        names: CL.BASE.groups[1].names,
        categories: []
      };
      file.groups.push(own);
    }
    const refused = edit(own, file, CL);
    if (refused) return refused;
    try {
      await ad.put(path, {
        schema: 1,
        groups: file.groups,
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
      <details data-airline-join><summary>${esc(t(TA.join))}</summary><p class="f-muted">${esc(t(TA.joinHint))}</p></details>
      <div data-mig hidden></div></div>`;
  }
  // les pas de « Créer une compagnie » (V3_SPECIFICATION § 10.38 bis) ; les catégories et la flotte s'y ajoutent avant le résumé (lots B2 et B3)
  const WZ_STEPS = ['identity', 'summary'];
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
        companyBack: name === 'summary',
        companyNext: name === 'identity',
        companyAdd: name === 'summary' && !resume,
        companyResume: name === 'summary' && resume
      };
    for (const [act, show] of Object.entries(on)) nav.querySelector(`[data-act="${act}"]`).hidden = !show;
    nav.hidden = name === 'done';
  }
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
    const KN = AIR.get(env.view)?.CL?.KIND_NAMES;
    return [v.name, KN ? env.t(KN[v.kind]) : '', ...AIRLINE_NETWORKS.filter(k => v.nets[k]).map(k => env.t(TA.net[k]))].filter(Boolean)
      .join(' · ');
  }
  /** « Suivant » et « Retour » : du pas Identité (vérifié) au résumé, et retour sans rien perdre. */
  async function wizardMove(env, dir) {
    const {
      view,
      t
    } = env, w = view.querySelector('[data-wizard]'), at = w?.dataset.step;
    if (!w) return;
    wizardSay(view, '');
    if (dir < 0) return wizardShow(view, 'identity');
    if (at !== 'identity') return;
    const v = wizardValues(view),
      why = await wizardCheck(env, v);
    if (why) return wizardSay(view, why);
    w.querySelector('[data-wz-summary]').textContent = wizardSummary(env, v);
    wizardShow(view, 'summary');
  }
  /** Les noms des genres dans les boutons du stepper (une seule source : KIND_NAMES), posés quand le module des catégories est là. */
  function wizardKindNames(view, CL, t) {
    if (!CL?.KIND_NAMES) return;
    for (const b of view.querySelectorAll('[data-wizard] [data-kind-name]')) b.textContent = t(CL.KIND_NAMES[b.dataset.kindName]);
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
      todo = [
        ['settings', `airline/${v.code}/settings.json`, {
          schema: 1,
          name: v.name,
          networks: v.nets,
          kind: v.kind,
          ...stamp
        }],
        ['fleet', `airline/${v.code}/fleet.json`, {
          schema: 1,
          aircraft: [],
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
  const WZ_WIRED = new WeakSet();

  function wizardWire(view) {
    if (WZ_WIRED.has(view)) return;
    WZ_WIRED.add(view);
    view.addEventListener('input', e => {
      const f = e.target?.dataset?.f;
      if (f === 'co-code') e.target.dataset.touched = '1';
      if (f !== 'co-name') return;
      const code = view.querySelector('[data-wizard] [data-f="co-code"]');
      if (code && !code.dataset.touched) code.value = proposeCode(e.target.value);
    });
  }
  // par vue : ce que la dernière lecture a rendu (lignes, module des catégories, langue, choix possible, compagnie courante), pour repeindre la fiche sans relire
  const AIR = new WeakMap();
  /** Met la liste à jour SANS la redessiner : une ligne dont le HTML est inchangé garde son nœud (le focus, la hauteur, rien ne bouge) ; seule une ligne qui change est remplacée, une ligne nouvelle insérée, une ligne disparue retirée. */
  function paintRows(box, rows, t, can, CL) {
    const keys = new Set(rows.map(r => r.code));
    for (const n of [...box.children])
      if (!keys.has(n.dataset.airline)) n.remove();
    rows.forEach((r, i) => {
      const html = airlineRowHtml(r, t, can, CL),
        cur = box.children[i];
      if (cur && cur.dataset.airline === r.code && cur.__html === html) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const n = tpl.content.firstElementChild;
      n.__html = html;
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
    const [rows, CL] = await Promise.all([readAirlines(FD, t), catLib()]),
      lang = env.c.lang?.() || 'fr';
    if (!view.isConnected) return;
    const can = typeof FD.setAirline === 'function',
      now = String((typeof FD.airline === 'function' ? await Promise.resolve(FD.airline()).catch(() => null) : null)?.code || '');
    AIR.set(view, {
      rows,
      CL,
      lang,
      now
    });
    wizardWire(view);
    wizardKindNames(view, CL, t);
    paintRows(box, rows, t, can, CL);
    markCurrent(view, now);
    paintFiche(env);
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
    if (act === 'companyKind' || act === 'companyCatAdd' || act === 'companyCatDel') {
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
      let why;
      if (act === 'companyCatDel') {
        const id = b.dataset.cat || '';
        why = await writeCats(env, code, own => {
          own.categories = own.categories.filter(x => x.id !== id);
          return '';
        });
      } else {
        const name = val(`cat-${code}`, card('company')).replace(/\s+/g, ' ').slice(0, 41),
          id = catId(name);
        if (!name || name.length > 40 || !id) return ficheSay(env, t(TA.catBad));
        why = await writeCats(env, code, (own, file, CL) => {
          if (file.groups.some(g => g.categories.some(x => x.id === id))) return 'catDup';
          if (file.groups.reduce((n, g) => n + g.categories.length, 0) >= CL.CATEGORIES_MAX) return 'catFull';
          own.categories.push({
            id,
            names: {
              fr: name,
              en: name,
              de: name,
              es: name
            }
          });
          return '';
        });
      }
      if (why) return ficheSay(env, t(TA[why] || TA.failed));
      c.notify(t(TA.catSaved), 'ok');
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
    if (act === 'companyFly') {
      // « Voler pour cette compagnie » : la compagnie devient la courante, puis Missions
      const code = WZ.get(env.view)?.code || '';
      if (AIRLINE_CODE.test(code) && typeof FD.setAirline === 'function') await FD.setAirline(code);
      wizardReset(env.view);
      location.hash = '#missions';
    }
  }

  (window.SogSettingsParts ||= {}).airline = {
    acts: ['companyChoose', 'companyAdd', 'companyNext', 'companyBack', 'companyResume', 'companyStay', 'companyFly', 'companyPlan',
      'companyMigrate', 'companyKind', 'companyCatAdd', 'companyCatDel'
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
