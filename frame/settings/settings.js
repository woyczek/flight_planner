(() => {
  'use strict';
  // V3 — écran des réglages du cadre (#settings ; frame/settings/SPEC.md) : il remplace l'écran #device. Il fait partie du
  // cadre et non d'un module, parce qu'il règle le transport et le jeton de l'appareil, ce qu'un module ne touche jamais.
  //   · cartes courtes en une colonne (téléphone d'abord), chacune enregistrée seule ;
  //   · Identité (device/identity.json) ; Usages (device/usages.json) : « Seul sur cet appareil » n'est pas une case,
  //     c'est l'état quand aucun échange n'est coché ; export / import des données de l'appareil dans ce seul cas ;
  //   · Accès (dépôt GitHub, jeton jamais réaffiché, « Couper l'accès ») et Synchronisation, si un échange est coché ;
  //   · Données hors ligne (ctx.aerodb, stockage du navigateur) ; Clés, si un lanceur sert la page ; diagnostic replié ;
  //   · reprise des réglages V2 de la même origine en un geste (identité, accès GitHub), proposée une fois.
  // Contexte donné par frame/app.js : { t, notify, ask, FD, own (device/, politique cache), reload, identity(), usages(),
  // launcher(), transport(), aerodb(), syncNow }.
  const ROOT = new URL('../../', document.currentScript.src).href; // racine de la suite (routes /__setup du lanceur)
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const now = () => new Date().toISOString();
  // fichiers de référence (bases publiées, relues à la demande) : jamais dans l'export d'un appareil
  const REFERENCE = ['sia/', 'AircraftDB/'];
  const EXPORT_FORMAT = 'sog-device-export';

  const T = {
    title: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
    intro: ['Réglages de cet appareil, gardés ici seulement : ils décident comment les données sont échangées.',
      'Settings of this device, kept here only: they decide how data are exchanged.',
      'Einstellungen dieses Geräts, nur hier gespeichert: Sie bestimmen, wie Daten ausgetauscht werden.',
      'Ajustes de este dispositivo, guardados solo aquí: deciden cómo se intercambian los datos.'
    ],
    save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
    saved: ['Enregistré.', 'Saved.', 'Gespeichert.', 'Guardado.'],
    // reprise V2
    v2: ['Réglages de la V2 trouvés', 'V2 settings found', 'V2-Einstellungen gefunden', 'Ajustes de la V2 encontrados'],
    v2Intro: ['Ce navigateur a déjà servi à la V2 : reprendre ces réglages ici ? La V2 garde les siens.',
      'This browser was already used for V2: take these settings over here? V2 keeps its own.',
      'Dieser Browser wurde schon für V2 benutzt: diese Einstellungen hier übernehmen? V2 behält ihre eigenen.',
      'Este navegador ya se usó para la V2: ¿retomar estos ajustes aquí? La V2 conserva los suyos.'
    ],
    v2Access: ['dépôt {r} (branche {b}), jeton compris — jamais affiché', 'repository {r} (branch {b}), token included — never shown',
      'Repository {r} (Zweig {b}), Token inbegriffen — nie angezeigt', 'repositorio {r} (rama {b}), token incluido — nunca mostrado'
    ],
    pair: ['{k} :', '{k}:', '{k}:', '{k}:'],
    v2Take: ['Reprendre', 'Take over', 'Übernehmen', 'Retomar'],
    v2No: ['Non merci', 'No thanks', 'Nein danke', 'No, gracias'],
    v2Done: ['Réglages V2 repris.', 'V2 settings taken over.', 'V2-Einstellungen übernommen.', 'Ajustes V2 retomados.'],
    // identité
    identity: ['Identité', 'Identity', 'Identität', 'Identidad'],
    identityHint: ['Votre trigramme et vos identifiants de réseau, passés aux modules (préremplissage, missions).',
      'Your trigram and network IDs, given to the modules (prefill, missions).',
      'Ihr Kürzel und Ihre Netzwerk-IDs, an die Module weitergegeben (Vorausfüllen, Missionen).',
      'Su trigrama y sus identificadores de red, pasados a los módulos (prerrelleno, misiones).'
    ],
    trigram: ['Trigramme', 'Trigram', 'Kürzel', 'Trigrama'],
    ivao: ['VID IVAO', 'IVAO VID', 'IVAO-VID', 'VID IVAO'],
    vatsim: ['CID VATSIM', 'VATSIM CID', 'VATSIM-CID', 'CID VATSIM'],
    simbrief: ['Identifiant SimBrief (nom ou numéro)', 'SimBrief ID (name or number)', 'SimBrief-ID (Name oder Nummer)',
      'Identificador SimBrief (nombre o número)'
    ],
    badTrigram: ['Trigramme : 2 à 5 lettres ou chiffres.', 'Trigram: 2 to 5 letters or digits.',
      'Kürzel: 2 bis 5 Buchstaben oder Ziffern.',
      'Trigrama: de 2 a 5 letras o cifras.'
    ],
    badNumber: ['{f} : des chiffres seulement.', '{f}: digits only.', '{f}: nur Ziffern.', '{f}: solo cifras.'],
    needTrigram: ['À plusieurs, le trigramme est nécessaire : il signe chaque envoi et range vos fichiers.',
      'With several users the trigram is needed: it signs each sending and files your records.',
      'Mit mehreren Nutzern ist das Kürzel nötig: Es zeichnet jedes Senden und ordnet Ihre Dateien.',
      'Con varios usuarios el trigrama es necesario: firma cada envío y ordena sus ficheros.'
    ],
    // usages
    usages: ['Usages', 'Usages', 'Nutzungen', 'Usos'],
    alone: ['Seul sur cet appareil : rien n’est échangé, les données restent ici.',
      'Alone on this device: nothing is exchanged, data stay here.',
      'Allein auf diesem Gerät: nichts wird ausgetauscht, die Daten bleiben hier.',
      'Solo en este dispositivo: nada se intercambia, los datos se quedan aquí.'
    ],
    usagesHint: ['Cochez ce que vous faites ; plusieurs cases possibles.', 'Tick what you do; several boxes possible.',
      'Kreuzen Sie an, was Sie tun; mehrere Kästchen möglich.', 'Marque lo que hace; varias casillas posibles.'
    ],
    devices: ['Seul, sur plusieurs appareils', 'Alone, on several devices', 'Allein, auf mehreren Geräten',
      'Solo, en varios dispositivos'
    ],
    users: ['À plusieurs (dépôt git des données)', 'Several users (git data repository)', 'Mehrere Nutzer (Git-Datenrepository)',
      'Varios usuarios (repositorio git de datos)'
    ],
    backend: ['Serveur (web service, site) — à venir', 'Server (web service, website) — to come', 'Server (Webdienst, Website) — folgt',
      'Servidor (servicio web, sitio) — próximamente'
    ],
    viaLauncher: ['Échange par le lanceur de ce poste (dossier data/{g}).',
      'Exchange through this workstation’s launcher (data/ folder{g}).',
      'Austausch über den Starter dieses Rechners (Ordner data/{g}).',
      'Intercambio por el lanzador de este puesto (carpeta data/{g}).'
    ],
    viaLauncherGit: [', synchronisé par git', ', synchronised through git', ', über git synchronisiert', ', sincronizada por git'],
    viaLauncherNoGit: [' : pas un dépôt git, rien ne part ailleurs', ': not a git repository, nothing goes elsewhere',
      ': kein Git-Repository, nichts geht anderswohin', ': no es un repositorio git, nada sale a otro lugar'
    ],
    viaGithub: ['Échange par le dépôt GitHub {r}.', 'Exchange through the GitHub repository {r}.',
      'Austausch über das GitHub-Repository {r}.',
      'Intercambio por el repositorio GitHub {r}.'
    ],
    viaNone: ['Aucun moyen d’échange ici : réglez l’accès ci-dessous ; d’ici là, les données restent sur cet appareil.',
      'No way to exchange here: set the access below; until then, data stay on this device.',
      'Hier kein Austausch möglich: den Zugang unten einstellen; bis dahin bleiben die Daten auf diesem Gerät.',
      'Ningún medio de intercambio aquí: configure el acceso abajo; mientras tanto, los datos se quedan en este dispositivo.'
    ],
    // export / import
    backup: ['Sauvegarde de cet appareil', 'Backup of this device', 'Sicherung dieses Geräts', 'Copia de este dispositivo'],
    backupHint: ['Seul sur cet appareil, ce fichier est la seule copie de vos données : exportez-le de temps en temps.',
      'Alone on this device, this file is the only copy of your data: export it from time to time.',
      'Allein auf diesem Gerät ist diese Datei die einzige Kopie Ihrer Daten: exportieren Sie sie ab und zu.',
      'Solo en este dispositivo, este fichero es la única copia de sus datos: expórtelo de vez en cuando.'
    ],
    export: ['Exporter (un fichier)', 'Export (one file)', 'Exportieren (eine Datei)', 'Exportar (un fichero)'],
    import: ['Importer un fichier…', 'Import a file…', 'Datei importieren…', 'Importar un fichero…'],
    exported: ['{n} fichier(s) exporté(s).', '{n} file(s) exported.', '{n} Datei(en) exportiert.', '{n} fichero(s) exportado(s).'],
    importAsk: ['Importer {n} fichier(s) du {d} ? Ceux de même nom sur cet appareil seront remplacés.',
      'Import {n} file(s) of {d}? Those with the same name on this device will be replaced.',
      '{n} Datei(en) vom {d} importieren? Gleichnamige auf diesem Gerät werden ersetzt.',
      '¿Importar {n} fichero(s) del {d}? Los del mismo nombre en este dispositivo se sustituirán.'
    ],
    imported: ['{n} fichier(s) importé(s).', '{n} file(s) imported.', '{n} Datei(en) importiert.', '{n} fichero(s) importado(s).'],
    badFile: ['Ce fichier n’est pas une sauvegarde d’appareil SOG.', 'This file is not a SOG device backup.',
      'Diese Datei ist keine SOG-Gerätesicherung.', 'Este fichero no es una copia de dispositivo SOG.'
    ],
    // accès
    access: ['Accès aux données', 'Data access', 'Datenzugang', 'Acceso a los datos'],
    accessLauncher: ['Ce poste passe par son lanceur : pas de jeton à régler ici.',
      'This workstation goes through its launcher: no token to set here.',
      'Dieser Rechner nutzt seinen Starter: hier ist kein Token einzustellen.',
      'Este puesto pasa por su lanzador: no hay token que configurar aquí.'
    ],
    repo: ['Dépôt (compte/dépôt)', 'Repository (account/repository)', 'Repository (Konto/Repository)',
      'Repositorio (cuenta/repositorio)'
    ],
    branch: ['Branche', 'Branch', 'Zweig', 'Rama'],
    token: ['Jeton personnel', 'Personal token', 'Persönliches Token', 'Token personal'],
    tokenSet: ['jeton enregistré — vide : inchangé', 'token saved — empty: unchanged', 'Token gespeichert — leer: unverändert',
      'token guardado — vacío: sin cambios'
    ],
    tokenHint: [
      'Jeton à grain fin (github.com › Settings › Developer settings › Fine-grained tokens) : ce seul dépôt, « Contents » en lecture et écriture, 90 jours au plus. Gardé sur cet appareil seulement, jamais réaffiché ; ne le collez dans aucun message.',
      'Fine-grained token (github.com › Settings › Developer settings › Fine-grained tokens): this repository only, “Contents” read and write, 90 days at most. Kept on this device only, never shown again; never paste it in a message.',
      'Feingranulares Token (github.com › Settings › Developer settings › Fine-grained tokens): nur dieses Repository, „Contents“ lesen und schreiben, höchstens 90 Tage. Nur auf diesem Gerät gespeichert, nie wieder angezeigt; in keine Nachricht einfügen.',
      'Token de grano fino (github.com › Settings › Developer settings › Fine-grained tokens): solo este repositorio, «Contents» lectura y escritura, 90 días como máximo. Guardado solo en este dispositivo, nunca se vuelve a mostrar; no lo pegue en ningún mensaje.'
    ],
    test: ['Tester', 'Test', 'Testen', 'Probar'],
    testOk: ['Dépôt joignable, branche {b} trouvée.', 'Repository reachable, branch {b} found.',
      'Repository erreichbar, Zweig {b} gefunden.',
      'Repositorio accesible, rama {b} encontrada.'
    ],
    testOffline: ['Hors ligne : impossible de tester maintenant.', 'Offline: cannot test now.', 'Offline: jetzt kein Test möglich.',
      'Sin conexión: imposible probar ahora.'
    ],
    needRepo: ['Dépôt et jeton nécessaires.', 'Repository and token needed.', 'Repository und Token nötig.',
      'Repositorio y token necesarios.'
    ],
    cut: ['Couper l’accès', 'Cut access', 'Zugang trennen', 'Cortar el acceso'],
    cutAsk: [
      'Couper l’accès ? Le jeton est effacé de cet appareil ; vos écritures en attente restent ici et partiront quand l’accès sera de nouveau réglé. Téléphone perdu ou volé : supprimez aussi le jeton sur github.com.',
      'Cut access? The token is erased from this device; your pending writes stay here and will leave once access is set again. Lost or stolen phone: also delete the token on github.com.',
      'Zugang trennen? Das Token wird von diesem Gerät gelöscht; ausstehende Änderungen bleiben hier und gehen hinaus, sobald der Zugang wieder eingestellt ist. Telefon verloren oder gestohlen: das Token auch auf github.com löschen.',
      '¿Cortar el acceso? El token se borra de este dispositivo; sus escrituras pendientes se quedan aquí y saldrán cuando el acceso vuelva a configurarse. Teléfono perdido o robado: borre también el token en github.com.'
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
    lastError: ['Dernière erreur', 'Last error', 'Letzter Fehler', 'Último error'],
    network: ['Réseau', 'Network', 'Netz', 'Red'],
    online: ['en ligne', 'online', 'online', 'en línea'],
    offline: ['hors ligne', 'offline', 'offline', 'sin conexión'],
    syncNow: ['Synchroniser maintenant', 'Synchronise now', 'Jetzt synchronisieren', 'Sincronizar ahora'],
    conflicts: ['Voir les conflits ({n})', 'See the conflicts ({n})', 'Konflikte ansehen ({n})', 'Ver los conflictos ({n})'],
    // données hors ligne
    offlineData: ['Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'],
    zones: ['Bases aéronautiques', 'Aeronautical bases', 'Luftfahrtdaten', 'Bases aeronáuticas'],
    zonesState: ['{p} zone(s) publiée(s), {l} ouverte(s) sur cet appareil{c}', '{p} published zone(s), {l} open on this device{c}',
      '{p} veröffentlichte Zone(n), {l} auf diesem Gerät geöffnet{c}',
      '{p} zona(s) publicada(s), {l} abierta(s) en este dispositivo{c}'
    ],
    cycle: [', cycle {c}', ', cycle {c}', ', Zyklus {c}', ', ciclo {c}'],
    zonesNone: ['aucune base publiée lue pour l’instant', 'no published base read yet', 'noch keine veröffentlichte Basis gelesen',
      'ninguna base publicada leída por ahora'
    ],
    zoneHint: [
      'Garder une zone la télécharge entière (France : environ 6,5 Mo), de préférence en Wi-Fi ; une zone servie normalement n’est gardée qu’en partie.',
      'Keeping a zone downloads it whole (France: about 6.5 MB), preferably on Wi-Fi; a zone used normally is kept only in part.',
      'Eine Zone behalten lädt sie ganz herunter (Frankreich: etwa 6,5 MB), am besten im WLAN; eine normal genutzte Zone ist nur teilweise gespeichert.',
      'Guardar una zona la descarga entera (Francia: unos 6,5 MB), mejor por wifi; una zona usada normalmente solo se guarda en parte.'
    ],
    zoneState: {
      absent: ['pas sur cet appareil', 'not on this device', 'nicht auf diesem Gerät', 'no está en este dispositivo'],
      partial: ['en partie sur cet appareil', 'partly on this device', 'teilweise auf diesem Gerät', 'en parte en este dispositivo'],
      complete: ['gardée hors ligne', 'kept offline', 'offline gespeichert', 'guardada sin conexión'],
      unknown: ['état inconnu', 'state unknown', 'Status unbekannt', 'estado desconocido']
    },
    zoneLine: ['{s} · cycle {c} · {k} Ko sur {p} Ko', '{s} · cycle {c} · {k} KB of {p} KB', '{s} · Zyklus {c} · {k} KB von {p} KB',
      '{s} · ciclo {c} · {k} KB de {p} KB'
    ],
    keep: ['Garder hors ligne', 'Keep offline', 'Offline behalten', 'Guardar sin conexión'],
    release: ['Libérer', 'Free', 'Freigeben', 'Liberar'],
    kept: ['Zone {z} gardée hors ligne ({k} Ko lus).', 'Zone {z} kept offline ({k} KB read).',
      'Zone {z} offline gespeichert ({k} KB gelesen).',
      'Zona {z} guardada sin conexión ({k} KB leídos).'
    ],
    keptFailed: ['Zone {z} : {n} fichier(s) non lu(s) (hors ligne ?).', 'Zone {z}: {n} file(s) not read (offline?).',
      'Zone {z}: {n} Datei(en) nicht gelesen (offline?).', 'Zona {z}: {n} fichero(s) no leído(s) (¿sin conexión?).'
    ],
    released: ['Zone {z} libérée sur cet appareil.', 'Zone {z} freed on this device.', 'Zone {z} auf diesem Gerät freigegeben.',
      'Zona {z} liberada en este dispositivo.'
    ],
    aircraftDb: ['Base des appareils', 'Aircraft base', 'Flugzeugbasis', 'Base de aeronaves'],
    aircraftLine: ['{s} · {n} types', '{s} · {n} types', '{s} · {n} Typen', '{s} · {n} tipos'],
    storage: ['Stockage du navigateur', 'Browser storage', 'Browser-Speicher', 'Almacenamiento del navegador'],
    storageState: ['{u} utilisé(s) sur {q}', '{u} used of {q}', '{u} von {q} belegt', '{u} usado(s) de {q}'],
    unknown: ['inconnu', 'unknown', 'unbekannt', 'desconocido'],
    // clés du lanceur
    keys: ['Clés du lanceur', 'Launcher keys', 'Schlüssel des Starters', 'Claves del lanzador'],
    keysHint: ['Gardées par le lanceur de ce poste (dossier secrets/), jamais par le navigateur ni dans les données.',
      'Kept by this workstation’s launcher (secrets/ folder), never by the browser nor in the data.',
      'Vom Starter dieses Rechners verwahrt (Ordner secrets/), nie im Browser oder in den Daten.',
      'Guardadas por el lanzador de este puesto (carpeta secrets/), nunca por el navegador ni en los datos.'
    ],
    ivaoKey: ['Clé de l’API IVAO', 'IVAO API key', 'IVAO-API-Schlüssel', 'Clave de la API IVAO'],
    keySet: ['enregistrée ({h})', 'saved ({h})', 'gespeichert ({h})', 'guardada ({h})'],
    keyEnv: ['donnée par l’environnement du lanceur ({h})', 'given by the launcher’s environment ({h})',
      'aus der Umgebung des Starters ({h})', 'dada por el entorno del lanzador ({h})'
    ],
    keyMissing: ['absente', 'missing', 'fehlt', 'ausente'],
    keyNew: ['Nouvelle clé (vide : inchangée)', 'New key (empty: unchanged)', 'Neuer Schlüssel (leer: unverändert)',
      'Nueva clave (vacío: sin cambios)'
    ],
    erase: ['Effacer', 'Erase', 'Löschen', 'Borrar'],
    eraseAsk: ['Effacer la clé IVAO du lanceur ?', 'Erase the IVAO key from the launcher?', 'Den IVAO-Schlüssel vom Starter löschen?',
      '¿Borrar la clave IVAO del lanzador?'
    ],
    keyOk: ['Clé valide : l’API IVAO répond.', 'Key valid: the IVAO API answers.', 'Schlüssel gültig: die IVAO-API antwortet.',
      'Clave válida: la API IVAO responde.'
    ],
    keyBad: ['Clé IVAO : {e}', 'IVAO key: {e}', 'IVAO-Schlüssel: {e}', 'Clave IVAO: {e}'],
    // diagnostic
    diag: ['Diagnostic', 'Diagnostics', 'Diagnose', 'Diagnóstico'],
    copy: ['Copier', 'Copy', 'Kopieren', 'Copiar'],
    copied: ['Diagnostic copié.', 'Diagnostics copied.', 'Diagnose kopiert.', 'Diagnóstico copiado.']
  };

  /** Taille lisible (Ko, Mo, Go). */
  const bytes = n => {
    const f = x => x.toLocaleString(document.documentElement.lang || undefined, {
      maximumFractionDigits: 1
    });
    return !Number.isFinite(n) ? '?' : n < 1e6 ? `${Math.round(n / 1e3)} Ko` : n < 1e9 ? `${f(n / 1e6)} Mo` : `${f(n / 1e9)} Go`;
  };
  /** Lecture JSON d'une clé de localStorage ; null si absente ou illisible. */
  const lsJson = k => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null');
    } catch {
      return null;
    }
  };
  /** Réglages V2 de cette origine : { identity, access } (champs vides retirés) ; null s'il n'y a rien. */
  function v2Settings() {
    const p = lsJson('missionReportingConfig:v1') || {},
      g = lsJson('githubData:v1') || {};
    const identity = Object.fromEntries(Object.entries({
      trigram: String(p.trigram || '').toUpperCase(),
      ivao: String(p.ivaoId || ''),
      vatsim: String(p.vatsimId || ''),
      simbrief: String(p.simbriefUser || '')
    }).filter(([, v]) => v));
    const access = g.repo && g.token ? {
      repo: g.repo,
      branch: g.branch || 'main',
      token: g.token
    } : null;
    return Object.keys(identity).length || access ? {
      identity,
      access
    } : null;
  }

  /** Dessine l'écran des réglages dans view ; c : contexte du cadre (voir l'en-tête). */
  async function render(view, c) {
    const {
      t,
      FD
    } = c;
    const id = c.identity(),
      us = c.usages(),
      L = c.launcher(),
      exchange = !!(us.devices || us.users),
      gh = FD.github.config(),
      prefs = (await c.own.get('device/settings.json')) || {},
      v2 = !prefs.v2 ? v2Settings() : null,
      st = await FD.status();
    const fld = (k, row, v, o = {}) => `<label class="f-field">${esc(t(row))}<input data-f="${k}" type="${o.type || 'text'}" value="${esc(v || '')}" autocomplete="off" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.cap ? 'autocapitalize="characters"' : 'autocapitalize="off"'} spellcheck="false"></label>`;
    const how = !exchange ? t(T.alone) : L?.data ? t(T.viaLauncher, {
      g: t(L.dataGit ? T.viaLauncherGit : T.viaLauncherNoGit)
    }) : gh ? t(T.viaGithub, {
      r: gh.repo
    }) : t(T.viaNone);
    const cards = [];
    // reprise V2, une fois
    if (v2) cards.push(`<div class="f-card" data-card="v2"><h2>${esc(t(T.v2))}</h2><p class="f-muted">${esc(t(T.v2Intro))}</p>
      <ul>${Object.entries(v2.identity).map(([k, v]) => `<li>${esc(t(T.pair, { k: t(T[k]) }))} <b>${esc(v)}</b></li>`).join('')}${v2.access ? `<li>${esc(t(T.v2Access, { r: v2.access.repo, b: v2.access.branch }))}</li>` : ''}</ul>
      <div class="f-row"><button type="button" class="primary" data-act="v2take">${esc(t(T.v2Take))}</button><button type="button" data-act="v2no">${esc(t(T.v2No))}</button></div></div>`);
    // identité
    cards.push(`<div class="f-card" data-card="identity"><h2>${esc(t(T.identity))}</h2><p class="f-muted">${esc(t(T.identityHint))}</p>
      ${fld('trigram', T.trigram, id.trigram, { cap: true, ph: 'ABC' })}${fld('ivao', T.ivao, id.ivao, { mode: 'numeric' })}${fld('vatsim', T.vatsim, id.vatsim, { mode: 'numeric' })}${fld('simbrief', T.simbrief, id.simbrief)}
      ${us.users && !id.trigram ? `<p class="f-warn">${esc(t(T.needTrigram))}</p>` : ''}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="identity">${esc(t(T.save))}</button></div></div>`);
    // usages
    const chk = (k, row, dis) => `<label class="f-check"><input type="checkbox" data-u="${k}" ${us[k] ? 'checked' : ''} ${dis ? 'disabled' : ''}>${esc(t(row))}</label>`;
    cards.push(`<div class="f-card" data-card="usages"><h2>${esc(t(T.usages))}</h2><p><b>${esc(how)}</b></p><p class="f-muted">${esc(t(T.usagesHint))}</p>
      ${chk('devices', T.devices)}${chk('users', T.users)}${chk('backend', T.backend, true)}</div>`);
    if (!exchange) cards.push(`<div class="f-card" data-card="backup"><h2>${esc(t(T.backup))}</h2><p class="f-muted">${esc(t(T.backupHint))}</p>
      <div class="f-row"><button type="button" class="primary" data-act="export">${esc(t(T.export))}</button><button type="button" data-act="import">${esc(t(T.import))}</button><input type="file" accept="application/json,.json" data-file hidden></div></div>`);
    // accès et synchronisation, si un échange est coché
    if (exchange) {
      cards.push(L?.data ? `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2><p>${esc(t(T.accessLauncher))}</p></div>` :
        `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2>
        ${fld('repo', T.repo, gh?.repo, { ph: 'compte/flight_planner_data' })}${fld('branch', T.branch, gh?.branch || 'main')}${fld('token', T.token, '', { type: 'password', ph: gh ? t(T.tokenSet) : '' })}
        <p class="f-muted">${esc(t(T.tokenHint))}</p><p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="access">${esc(t(T.save))}</button><button type="button" data-act="test">${esc(t(T.test))}</button>${gh ? `<button type="button" data-act="cut">${esc(t(T.cut))}</button>` : ''}</div></div>`);
      cards.push(`<div class="f-card" data-card="sync"><h2>${esc(t(T.sync))}</h2><dl class="f-dl" data-sync></dl><p class="f-muted">${esc(t(T.syncHint))}</p>
        <div class="f-row"><button type="button" class="primary" data-act="sync">${esc(t(T.syncNow))}</button>${st.conflicts ? `<a href="#conflicts">${esc(t(T.conflicts, { n: st.conflicts }))}</a>` : ''}</div></div>`);
    }
    // données hors ligne
    cards.push(`<div class="f-card" data-card="offline"><h2>${esc(t(T.offlineData))}</h2><dl class="f-dl" data-offline><dt>${esc(t(T.zones))}</dt><dd>…</dd><dt>${esc(t(T.storage))}</dt><dd>…</dd></dl>
      <div data-zones></div><p class="f-muted">${esc(t(T.zoneHint))}</p></div>`);
    // clés, si un lanceur sert la page
    if (L) cards.push(`<div class="f-card" data-card="keys"><h2>${esc(t(T.keys))}</h2><p class="f-muted">${esc(t(T.keysHint))}</p>
      <p>${esc(t(T.pair, { k: t(T.ivaoKey) }))} <b data-key>…</b></p>${fld('ivaoKey', T.keyNew, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="keySave">${esc(t(T.save))}</button><button type="button" data-act="keyTest">${esc(t(T.test))}</button><button type="button" data-act="keyErase">${esc(t(T.erase))}</button></div></div>`);
    view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted">${esc(t(T.intro))}</p>${cards.join('')}
      <details class="f-card"><summary>${esc(t(T.diag))}</summary><pre data-diag></pre><div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button></div></details>`;

    const card = k => view.querySelector(`[data-card="${k}"]`);
    const val = (k, root = view) => root.querySelector(`[data-f="${k}"]`)?.value.trim() ?? '';
    /** Message dans la carte (kind : ok, warn, err) ; vide l'efface. */
    const say = (k, text, kind = 'err') => {
      const m = card(k)?.querySelector('[data-msg]');
      if (m) {
        m.textContent = text || '';
        m.dataset.kind = kind;
      }
    };
    const again = () => render(view, c);

    // état vivant : synchronisation, données hors ligne, clés, diagnostic
    const paintSync = s => {
      const dl = view.querySelector('[data-sync]');
      if (!dl) return;
      dl.innerHTML = [
        [T.last, s.lastSync ? new Date(s.lastSync).toLocaleString() : t(T.never)],
        [T.pending, String(s.pending || 0)],
        [T.network, t(s.online === false ? T.offline : T.online)],
        ...(s.lastError ? [
          [T.lastError, s.lastError]
        ] : [])
      ].map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('');
    };
    paintSync(st);
    const off = FD.onStatus(s => view.isConnected ? paintSync(s) : off?.());
    (async () => {
      const dl = view.querySelector('[data-offline]'),
        a = c.aerodb(),
        s = a ? await a.status().catch(() => null) : null;
      const pub = s?.published ? Object.keys(s.published).length : 0,
        open = s ? Object.keys(s.loaded || {}).length : 0;
      const zones = pub || open ? t(T.zonesState, {
        p: pub,
        l: open,
        c: s.cycle ? t(T.cycle, {
          c: s.cycle
        }) : ''
      }) : t(T.zonesNone);
      const est = await navigator.storage?.estimate?.().catch(() => null);
      dl.innerHTML = `<dt>${esc(t(T.zones))}</dt><dd>${esc(zones)}</dd><dt>${esc(t(T.storage))}</dt><dd>${esc(est ? t(T.storageState, { u: bytes(est.usage), q: bytes(est.quota) }) : t(T.unknown))}</dd>`;
      paintZones();
      view.querySelector('[data-diag]').textContent = JSON.stringify({
        at: now(),
        app: 'pilot',
        transport: (await FD.status()).transport,
        status: await FD.status(),
        usages: c.usages(),
        launcher: c.launcher(),
        github: gh ? {
          repo: gh.repo,
          branch: gh.branch
        } : null,
        aerodb: s,
        storage: est ? {
          usage: est.usage,
          quota: est.quota
        } : null,
        online: navigator.onLine,
        agent: navigator.userAgent
      }, null, 1);
    })();
    /** Zones publiées et base des appareils, avec leur état sur cet appareil (aerodb.offline) ; garder / libérer. */
    async function paintZones() {
      const box = view.querySelector('[data-zones]'),
        off = c.aerodb()?.offline;
      if (!box || !off) return;
      const can = off.supported?.() || {},
        zs = (await off.zones().catch(() => null)) || [],
        ac = await off.aircraft?.().catch(() => null);
      const st = z => t(T.zoneState[z.state] || T.zoneState.unknown);
      box.innerHTML = zs.map(z => `<div class="f-zone" data-zone="${esc(z.id)}"><div><b>${esc(t(z.names))}</b><br><span class="f-muted" data-zline>${esc(t(T.zoneLine, { s: st(z), c: z.cycle || '?', k: z.cachedKb ?? '?', p: z.publishedKb ?? '?' }))}</span></div>
        <div class="f-row">${z.state !== 'complete' ? `<button type="button" data-keep="${esc(z.id)}">${esc(t(T.keep))}</button>` : ''}${can.evict && z.cachedKb ? `<button type="button" data-release="${esc(z.id)}">${esc(t(T.release))}</button>` : ''}</div></div>`).join('') +
        (ac ? `<div class="f-zone"><div><b>${esc(t(T.aircraftDb))}</b><br><span class="f-muted">${esc(t(T.aircraftLine, { s: st(ac), n: ac.types ?? '?' }))}</span></div></div>` : '');
      box.onclick = async e => {
        const k = e.target.closest('[data-keep]')?.dataset.keep,
          r = e.target.closest('[data-release]')?.dataset.release;
        if (!k && !r) return;
        const row = box.querySelector(`[data-zone="${CSS.escape(k || r)}"]`),
          name = t(zs.find(z => z.id === (k || r))?.names || [k || r]);
        row.querySelectorAll('button').forEach(b => b.disabled = true);
        try {
          if (k) {
            const z = await off.keep(k, {
              onProgress: p => {
                row.querySelector('[data-zline]').textContent = `${p.done} / ${p.total}`;
              }
            });
            c.notify(z?.failed?.length ? t(T.keptFailed, {
              z: name,
              n: z.failed.length
            }) : t(T.kept, {
              z: name,
              k: z?.readKb ?? '?'
            }), z?.failed?.length ? 'warn' : 'ok');
          } else {
            await off.release(r);
            c.notify(t(T.released, {
              z: name
            }), 'ok');
          }
        } catch (err) {
          c.notify(err?.message || String(err), 'err');
        }
        paintZones();
      };
    }
    if (L) launcherKey().then(k => {
      const b = view.querySelector('[data-key]');
      if (b) b.textContent = !k?.set ? t(T.keyMissing) : t(k.env ? T.keyEnv : T.keySet, {
        h: k.hint || '••••'
      });
    });

    // actions
    view.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'v2take') {
        const d = v2Settings();
        if (d) {
          await c.own.put('device/identity.json', {
            ...id,
            ...d.identity,
            updated_at: now()
          });
          if (d.access && !FD.github.config()) FD.github.save(d.access);
        }
        await c.own.put('device/settings.json', {
          ...prefs,
          v2: 'taken',
          updated_at: now()
        });
        await c.reload();
        c.notify(t(T.v2Done), 'ok');
        return again();
      }
      if (act === 'v2no') {
        await c.own.put('device/settings.json', {
          ...prefs,
          v2: 'declined',
          updated_at: now()
        });
        return again();
      }
      if (act === 'identity') {
        const r = card('identity'),
          tri = val('trigram', r).toUpperCase(),
          ivao = val('ivao', r),
          vatsim = val('vatsim', r);
        if (tri && !/^[A-Z0-9]{2,5}$/.test(tri)) return say('identity', t(T.badTrigram));
        if (ivao && !/^\d+$/.test(ivao)) return say('identity', t(T.badNumber, {
          f: t(T.ivao)
        }));
        if (vatsim && !/^\d+$/.test(vatsim)) return say('identity', t(T.badNumber, {
          f: t(T.vatsim)
        }));
        await c.own.put('device/identity.json', {
          trigram: tri,
          ivao,
          vatsim,
          simbrief: val('simbrief', r),
          updated_at: now()
        });
        await c.reload();
        c.notify(t(T.saved), 'ok');
        return again();
      }
      if (act === 'export') return exportDevice(c);
      if (act === 'import') return view.querySelector('[data-file]').click();
      if (act === 'access' || act === 'test') {
        const r = card('access'),
          cfg = {
            repo: val('repo', r),
            branch: val('branch', r) || 'main',
            token: val('token', r) || gh?.token || '',
            ...(gh?.api ? {
              api: gh.api
            } : {})
          };
        if (!cfg.repo || !cfg.token) return say('access', t(T.needRepo));
        if (act === 'test') {
          say('access', '…', 'ok');
          try {
            await FD.github(cfg).head();
            return say('access', t(T.testOk, {
              b: cfg.branch
            }), 'ok');
          } catch (err) {
            return say('access', err?.offline ? t(T.testOffline) : err?.message || String(err), err?.offline ? 'warn' : 'err');
          }
        }
        FD.github.save(cfg);
        await c.reload();
        c.notify(t(T.saved), 'ok');
        return again();
      }
      if (act === 'cut') {
        if (!await c.ask(t(T.cutAsk))) return;
        FD.github.clear();
        await c.reload();
        c.notify(t(T.cutDone), 'ok');
        return again();
      }
      if (act === 'sync') return c.syncNow();
      if (act === 'keySave' || act === 'keyErase') {
        const k = val('ivaoKey', card('keys'));
        if (act === 'keySave' && !k) return say('keys', '');
        if (act === 'keyErase' && !await c.ask(t(T.eraseAsk))) return;
        const r = await setup('secrets', {
          scope: 'app',
          service: 'ivao',
          values: {
            apiKey: act === 'keyErase' ? '' : k
          }
        });
        if (!r?.ok) return say('keys', r?.message || '?');
        c.notify(t(T.saved), 'ok');
        return again();
      }
      if (act === 'keyTest') {
        const r = await setup('secrets/test?service=ivao');
        return say('keys', r?.ok ? t(T.keyOk) : t(T.keyBad, {
          e: r?.error || '?'
        }), r?.ok ? 'ok' : 'err');
      }
      if (act === 'copy') {
        await navigator.clipboard?.writeText(view.querySelector('[data-diag]').textContent).catch(() => null);
        c.notify(t(T.copied), 'ok');
      }
    };
    view.querySelectorAll('[data-u]').forEach(i => i.addEventListener('change', async () => {
      const u = {
        ...us,
        updated_at: now()
      };
      for (const x of view.querySelectorAll('[data-u]')) u[x.dataset.u] = x.checked;
      u.single = !(u.devices || u.users || u.backend); // « seul sur cet appareil » : l'état sans échange
      await c.own.put('device/usages.json', u);
      await c.reload();
      again();
    }));
    view.querySelector('[data-file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await importDevice(c, f);
      again();
    });
  }

  /** Appel d'une route du lanceur (/__setup/<route>) ; GET sans corps, POST avec ; null en cas d'échec. */
  async function setup(route, body) {
    try {
      const r = await fetch(new URL(`__setup/${route}`, ROOT), {
        method: body ? 'POST' : 'GET',
        cache: 'no-store',
        headers: {
          'X-SOG-Setup': '1',
          ...(body ? {
            'Content-Type': 'application/json'
          } : {})
        },
        ...(body ? {
          body: JSON.stringify(body)
        } : {})
      });
      return await r.json();
    } catch {
      return null;
    }
  }
  /** État de la clé IVAO du lanceur : { set, hint, env } ; null sans réponse. */
  async function launcherKey() {
    return (await setup('secrets'))?.app?.ivao?.apiKey || null;
  }

  /** Exporte en un fichier JSON les données de cet appareil (identité comprise, bases de référence exclues). */
  async function exportDevice(c) {
    const all = c.FD.adapter({
        id: 'settings-backup',
        reads: [],
        writes: ['']
      }),
      files = {};
    for (const p of (await all.list('')) || []) {
      if (REFERENCE.some(r => p.startsWith(r)) || (p.startsWith('device/') && p !== 'device/identity.json')) continue;
      const r = await all.read(p).catch(() => null);
      if (r) files[p] = r.text ?? (typeof r.value === 'string' ? r.value : JSON.stringify(r.value));
    }
    const blob = new Blob([JSON.stringify({
        format: EXPORT_FORMAT,
        version: 1,
        at: now(),
        app: 'pilot',
        files
      }, null, 1)], {
        type: 'application/json'
      }),
      a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `sog-appareil-${now().slice(0, 10)}.json`
      });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    c.notify(c.t(T.exported, {
      n: Object.keys(files).length
    }), 'ok');
  }
  /** Importe un fichier exporté : chaque fichier remis sur cet appareil (identité dans device/, le reste en écriture). */
  async function importDevice(c, file) {
    let d = null;
    try {
      d = JSON.parse(await file.text());
    } catch {
      /* illisible */
    }
    if (d?.format !== EXPORT_FORMAT || !d.files || typeof d.files !== 'object') return c.notify(c.t(T.badFile), 'err');
    const entries = Object.entries(d.files).filter(([p, v]) => typeof v === 'string' && p && !p.startsWith('/') && !p.includes('..') &&
      !REFERENCE.some(r => p.startsWith(r)) && (!p.startsWith('device/') || p === 'device/identity.json'));
    if (!await c.ask(c.t(T.importAsk, {
        n: entries.length,
        d: String(d.at || '?').slice(0, 10)
      }))) return;
    const all = c.FD.adapter({
      id: 'settings-backup',
      reads: [],
      writes: ['']
    });
    for (const [p, text] of entries) {
      let v = text;
      if (p.endsWith('.json')) try {
        v = JSON.parse(text);
      } catch {
        /* gardé en texte */
      }
      if (p.startsWith('device/')) await c.own.put(p, v);
      else await all.put(p, v);
    }
    await c.reload();
    c.notify(c.t(T.imported, {
      n: entries.length
    }), 'ok');
  }

  window.SogSettings = {
    render,
    T
  };
})();
