(() => {
  'use strict';
  // V3 — écran des réglages du cadre (#settings ; frame/settings/SPEC.md) : il remplace l'écran #device. Il fait partie du
  // cadre et non d'un module, parce qu'il règle le transport et le jeton de l'appareil, ce qu'un module ne touche jamais.
  //   · cartes courtes en une colonne (téléphone d'abord), chacune enregistrée seule ;
  //   · Identité (device/identity.json) ; Niveau (device/level.json : 1 découverte, 2 courant, 3 complet ; le menu du
  //     cadre suit) ; Design (vignettes des jeux du cadre, ton auto / jour / nuit : ctx.saveDesign, le cadre applique et garde
  //     device/design.json) ; Usages (device/usages.json) : « Seul sur cet appareil » n'est pas une case,
  //     c'est l'état quand aucun échange n'est coché ; export / import des données de l'appareil dans ce seul cas ;
  //   · Accès, toujours : sur un poste servi par le lanceur, le dépôt distant de data/ (GET / POST /__setup/sync-remote :
  //     vérifier, enregistrer ; autre dépôt confirmé dans une fenêtre du lanceur) ; sinon dépôt GitHub, jeton jamais
  //     réaffiché, « Couper l'accès » (sans échange coché : lecture des bases seulement) ; Synchronisation si un échange
  //     est coché ;
  //   · Données hors ligne (ctx.aerodb, stockage du navigateur) ; Clé météo (TAF avwx.rest, avec ou sans lanceur : weatherKey
  //     du cadre, clé dans device/keys.json avec le jeton GitHub, jamais réaffichée) ; Clés, si un lanceur sert la page ; diagnostic ;
  //   · reprise des réglages V2 de la même origine en un geste (identité, accès GitHub), proposée une fois ;
  //   · Administration (niveau Complet seulement) : UN BOUTON par page d'administrateur, déclarées dans
  //     frame/settings/admin_links.js (SogAdminLinks) — seuils de la carte, limite de la zone du vol (option « edge » de
  //     airline/map_profiles.json), export d'une configuration pour un pilote, feuille de route, diagnostic, bancs (actifs
  //     sur un poste avec lanceur), pages V2 du poste (avec un lanceur seulement) ; rien de l'administrateur ailleurs ;
  //   · configuration d'un pilote (frame/settings/config.js, SogConfig) : « Exporter une configuration pour un pilote… »
  //     dans la carte Accès d'un poste (fichier sog-config-<TRI>.json et lien #settings?config=…) ; « Importer une
  //     configuration… » (fichier), le lien, ou #settings?import=1 (carte d'accueil) : carte « Configuration reçue » en
  //     tête, « Appliquer » écrit identité, usages et accès (testé avant), puis synchronise et propose Données hors ligne.
  //   · Bloc « État » en première carte (règle 14 de V3_SPECIFICATION.md § 7.1 : les lignes de l'ancien pop-up « i »), dessiné par
  //     le cadre qui en a l'état (ctx.status.html()), posé ici, puis rendu vivant par le cadre (ctx.status.bind) ;
  // Fichiers de l'écran (INTEGRATION.md § 1, chargés avant celui-ci) : kit.js (aides et textes communs), launcher.js
  // (cartes du lanceur), access.js (accès et transport), diagnostic.js, admin.js (carte Administration) — chacun
  // s'inscrit dans window.SogSettingsParts ; ce fichier dessine l'écran, les cartes de l'appareil, et distribue les actions.
  // Contexte donné par frame/app.js : { t, notify, ask, FD, own (device/, politique cache), reload, identity(), usages(),
  // launcher(), transport(), aerodb(), syncNow, status { html, bind }, … }.
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
  const P = window.SogSettingsParts || {}; // cartes du lanceur, accès et transport, diagnostic, administration

  // textes de l'écran et de ses cartes de l'appareil (les autres fichiers ajoutent les leurs)
  Object.assign(T, {
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
    // niveau d'usage
    level: ['Niveau', 'Level', 'Stufe', 'Nivel'],
    levelHint: ['Ce que l’appli vous montre ; un module caché reste joignable par son adresse.',
      'What the app shows you; a hidden module stays reachable by its address.',
      'Was die App Ihnen zeigt; ein ausgeblendetes Modul bleibt über seine Adresse erreichbar.',
      'Lo que la aplicación le muestra; un módulo oculto sigue accesible por su dirección.'
    ],
    levels: [
      [
        ['Découverte', 'Discovery', 'Einstieg', 'Descubrimiento'],
        ['L’essentiel, pour commencer.', 'The essentials, to get started.',
          'Das Wesentliche, für den Anfang.', 'Lo esencial, para empezar.'
        ]
      ],
      [
        ['Courant', 'Everyday', 'Alltag', 'Habitual'],
        ['L’usage de tous les jours.', 'Day-to-day use.', 'Der tägliche Gebrauch.',
          'El uso de todos los días.'
        ]
      ],
      [
        ['Complet', 'Full', 'Vollständig', 'Completo'],
        ['Tout, outils avancés compris.', 'Everything, advanced tools included.',
          'Alles, einschließlich der erweiterten Werkzeuge.', 'Todo, herramientas avanzadas incluidas.'
        ]
      ]
    ],
    levelShows: ['Menu : {m}', 'Menu: {m}', 'Menü: {m}', 'Menú: {m}'],
    levelNone: ['aucun module', 'no module', 'kein Modul', 'ningún módulo'],
    levelSaved: ['Niveau « {l} » : le menu suit.', 'Level “{l}”: the menu follows.', 'Stufe „{l}“: das Menü folgt.',
      'Nivel «{l}»: el menú sigue.'
    ],
    // design
    design: ['Design', 'Design', 'Design', 'Diseño'],
    designHint: ['L’habillage de l’appli et son ton, sur cet appareil seulement ; appliqués aussitôt.',
      'The app’s look and its tone, on this device only; applied at once.',
      'Das Aussehen der App und ihr Ton, nur auf diesem Gerät; sofort angewandt.',
      'El aspecto de la aplicación y su tono, solo en este dispositivo; aplicados en el acto.'
    ],
    tone: ['Ton', 'Tone', 'Ton', 'Tono'],
    tones: {
      auto: ['Automatique (comme le système)', 'Automatic (as the system)', 'Automatisch (wie das System)',
        'Automático (como el sistema)'
      ],
      day: ['Jour', 'Day', 'Tag', 'Día'],
      night: ['Nuit', 'Night', 'Nacht', 'Noche']
    },
    textured: ['texturé', 'textured', 'texturiert', 'texturizado'],
    sample: ['Carte d’exemple', 'Sample card', 'Beispielkarte', 'Tarjeta de ejemplo'],
    backToList: ['← Réglages', '← Settings', '← Einstellungen', '← Ajustes'],
    // design choisi qui ne s'applique pas ici (Aqua : ordinateur seulement) : ce que l'appareil montre à la place
    designDesk: ['{d}, choisi sur ce poste, ne vaut que sur un ordinateur : {a} ici. Toucher une vignette remplace ce choix.',
      '{d}, chosen on this device, only applies on a computer: {a} here. Touching a thumbnail replaces this choice.',
      '{d}, auf diesem Gerät gewählt, gilt nur auf einem Computer: hier {a}. Ein Tippen auf eine Vorschau ersetzt diese Wahl.',
      '{d}, elegido en este dispositivo, solo vale en un ordenador: aquí {a}. Tocar una miniatura sustituye esta elección.'
    ],
    // usages
    usages: ['Usages', 'Usages', 'Nutzungen', 'Usos'],
    aloneLauncher: ['Ce poste lit et écrit le dossier data/ du lanceur ; cochez un usage d’échange pour le partager par git.',
      'This workstation reads and writes the launcher’s data/ folder; tick an exchange usage to share it through git.',
      'Dieser Rechner liest und schreibt den Ordner data/ des Starters; kreuzen Sie eine Austauschnutzung an, um ihn über git zu teilen.',
      'Este puesto lee y escribe la carpeta data/ del lanzador; marque un uso de intercambio para compartirla por git.'
    ],
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
    backend: ['Serveur (web service, site) — à venir', 'Server (web service, website) — to come',
      'Server (Webdienst, Website) — folgt',
      'Servidor (servicio web, sitio) — próximamente'
    ],
    viaLauncher: ['Échange par le lanceur de ce poste (dossier data/{g}).',
      'Exchange through this workstation’s launcher (data/ folder{g}).',
      'Austausch über den Starter dieses Rechners (Ordner data/{g}).',
      'Intercambio por el lanzador de este puesto (carpeta data/{g}).'
    ],
    viaLauncherGit: [', synchronisé par git', ', synchronised through git', ', über git synchronisiert', ', sincronizada por git'],
    viaLauncherNoRemote: [', dépôt git sans distant : rien ne part ailleurs',
      ', a git repository with no remote: nothing goes elsewhere',
      ', Git-Repository ohne entferntes: nichts geht anderswohin', ', repositorio git sin remoto: nada sale a otro lugar'
    ],
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
    import: ['Importer (fusion)…', 'Import (merge)…', 'Importieren (zusammenführen)…', 'Importar (fusión)…'],
    replace: ['Remplacer par un fichier…', 'Replace from a file…', 'Durch eine Datei ersetzen…', 'Sustituir por un fichero…'],
    exported: ['Sauvegarde exportée : {d} fichier(s), {p} écriture(s) en attente, {k}.',
      'Backup exported: {d} file(s), {p} pending write(s), {k}.',
      'Sicherung exportiert: {d} Datei(en), {p} ausstehende Änderung(en), {k}.',
      'Copia exportada: {d} fichero(s), {p} escritura(s) pendiente(s), {k}.'
    ],
    importAsk: [
      'Fusionner la sauvegarde du {d} ? Rien de cet appareil n’est perdu : seul ce qui manque ici ou y est plus ancien est repris.',
      'Merge the backup of {d}? Nothing of this device is lost: only what is missing here or older here is taken.',
      'Die Sicherung vom {d} zusammenführen? Nichts von diesem Gerät geht verloren: nur, was hier fehlt oder älter ist, wird übernommen.',
      '¿Fusionar la copia del {d}? Nada de este dispositivo se pierde: solo se retoma lo que falta aquí o es más antiguo aquí.'
    ],
    replaceAsk: [
      'Remplacer tout ce qui est sur cet appareil par la sauvegarde du {d} ? Copies, écritures en attente et conflits d’ici seront effacés.',
      'Replace everything on this device with the backup of {d}? This device’s copies, pending writes and conflicts will be erased.',
      'Alles auf diesem Gerät durch die Sicherung vom {d} ersetzen? Kopien, ausstehende Änderungen und Konflikte dieses Geräts werden gelöscht.',
      '¿Sustituir todo lo de este dispositivo por la copia del {d}? Se borrarán las copias, escrituras pendientes y conflictos de aquí.'
    ],
    imported: ['Sauvegarde reprise : {a} ajouté(s), {u} mis à jour, {k} gardé(s) tels quels, {c} conflit(s).',
      'Backup taken: {a} added, {u} updated, {k} kept as they were, {c} conflict(s).',
      'Sicherung übernommen: {a} hinzugefügt, {u} aktualisiert, {k} unverändert behalten, {c} Konflikt(e).',
      'Copia retomada: {a} añadido(s), {u} actualizado(s), {k} conservado(s) tal cual, {c} conflicto(s).'
    ],
    badFile: ['Ce fichier n’est pas une sauvegarde d’appareil SOG.', 'This file is not a SOG device backup.',
      'Diese Datei ist keine SOG-Gerätesicherung.', 'Este fichero no es una copia de dispositivo SOG.'
    ],
    // configuration d'un pilote (frame/settings/config.js)
    joinResume: ['Un assistant est en cours (pas {n} sur {m}) : reprenez-le là où vous en étiez.',
      'An assistant is in progress (step {n} of {m}): resume it where you left it.',
      'Ein Assistent läuft (Schritt {n} von {m}): Setzen Sie ihn dort fort, wo Sie waren.',
      'Hay un asistente en curso (paso {n} de {m}): retómelo donde lo dejó.'
    ],
    joinGo: ['Reprendre', 'Resume', 'Fortsetzen', 'Retomar'],
    cfgJoin: ['Rejoindre la compagnie…', 'Join the airline…', 'Der Fluggesellschaft beitreten…', 'Unirse a la aerolínea…'],
    cfgImport: ['Importer une configuration…', 'Import a configuration…', 'Konfiguration importieren…',
      'Importar una configuración…'
    ],
    cfgImportHint: [
      'Votre compagnie vous a envoyé une configuration (fichier sog-config ou lien) ? Elle règle cet appareil en quelques gestes.',
      'Did your airline send you a configuration (sog-config file or link)? It sets up this device in a few steps.',
      'Hat Ihnen Ihre Fluggesellschaft eine Konfiguration geschickt (sog-config-Datei oder Link)? Sie richtet dieses Gerät in wenigen Schritten ein.',
      '¿Su aerolínea le envió una configuración (archivo sog-config o enlace)? Configura este dispositivo en pocos pasos.'
    ],
    // presse-papiers indisponible (appareil appairé en http) : le texte est montré sélectionné
    copyShown: ['Copie impossible ici : le texte est sélectionné, copiez-le vous-même.',
      'Cannot copy here: the text is selected, copy it yourself.',
      'Kopieren hier nicht möglich: Der Text ist markiert, kopieren Sie ihn selbst.',
      'No se puede copiar aquí: el texto está seleccionado, cópielo usted mismo.'
    ],
    cfgTitle: ['Configuration reçue', 'Configuration received', 'Erhaltene Konfiguration', 'Configuración recibida'],
    cfgBadSchema: ['Ce fichier n’est pas une configuration SOG (schéma « {s} ») : rien n’est changé.',
      'This file is not a SOG configuration (schema “{s}”): nothing is changed.',
      'Diese Datei ist keine SOG-Konfiguration (Schema „{s}“): Nichts wird geändert.',
      'Este archivo no es una configuración SOG (esquema «{s}»): no se cambia nada.'
    ],
    cfgBadField: ['Configuration refusée : {f} invalide. Rien n’est changé.',
      'Configuration refused: {f} is invalid. Nothing is changed.',
      'Konfiguration abgelehnt: {f} ist ungültig. Nichts wird geändert.',
      'Configuración rechazada: {f} no es válido. No se cambia nada.'
    ],
    cfgBadFile: ['Configuration illisible : rien n’est changé.', 'Unreadable configuration: nothing is changed.',
      'Unlesbare Konfiguration: Nichts wird geändert.',
      'Configuración ilegible: no se cambia nada.'
    ],
    close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
    needRemote: [
      'À plusieurs par git, il faut un dépôt distant pour data/ : l’administrateur le règle dans Administration › « Dépôt distant de data/ » (niveau Complet).',
      'Several users through git need a remote repository for data/: the administrator sets it in Administration › “Remote repository of data/” (Full level).',
      'Mehrere Nutzer über git brauchen ein entferntes Repository für data/: der Administrator stellt es unter Verwaltung › „Entferntes Repository von data/“ ein (Stufe Vollständig).',
      'Varios usuarios por git necesitan un repositorio remoto para data/: el administrador lo configura en Administración › «Repositorio remoto de data/» (nivel Completo).'
    ],
    noBases: [
      'Aucune base sur cet appareil : ni accès au dépôt des données réglé, ni lanceur. Réglez l’accès ci-dessus, ou publiez les bases depuis un poste avec lanceur (V2 : Paramètres › Maintenance › Données aéronautiques et Types d’aéronefs).',
      'No base on this device: no access to the data repository set, and no launcher. Set the access above, or publish the bases from a workstation with the launcher (V2: Settings › Maintenance › Aeronautical data and Aircraft types).',
      'Keine Basis auf diesem Gerät: weder Zugang zum Datenrepository eingestellt noch Starter. Stellen Sie oben den Zugang ein oder veröffentlichen Sie die Basen von einem Rechner mit Starter (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen).',
      'Ninguna base en este dispositivo: ni acceso al repositorio de datos configurado, ni lanzador. Configure el acceso arriba, o publique las bases desde un puesto con lanzador (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave).'
    ],
    test: ['Tester', 'Test', 'Testen', 'Probar'],
    testOffline: ['Hors ligne : impossible de tester maintenant.', 'Offline: cannot test now.', 'Offline: jetzt kein Test möglich.',
      'Sin conexión: imposible probar ahora.'
    ],
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
    // clé météo de l'appareil (TAF par avwx.rest sans lanceur ; frame lot 12 : weatherKey du contexte)
    ivao: ['Compte IVAO', 'IVAO account', 'IVAO-Konto', 'Cuenta IVAO'],
    ivaoHint: [
      'Relie cet appareil à votre compte IVAO par le relais de la compagnie : l’appli lit alors vos vols sur le tracker d’IVAO directement. Le relais garde le secret de l’application ; votre jeton reste sur cet appareil, jamais dans une sauvegarde.',
      'Links this device to your IVAO account through the airline’s relay: the app then reads your flights on IVAO’s tracker directly. The relay keeps the application’s secret; your token stays on this device, never in a backup.',
      'Verbindet dieses Gerät über das Relais der Fluggesellschaft mit Ihrem IVAO-Konto: Die App liest dann Ihre Flüge direkt im IVAO-Tracker. Das Relais verwahrt das Geheimnis der Anwendung; Ihr Token bleibt auf diesem Gerät, nie in einer Sicherung.',
      'Vincula este dispositivo a su cuenta IVAO por el relé de la aerolínea: la aplicación lee entonces sus vuelos en el tracker de IVAO directamente. El relé guarda el secreto de la aplicación; su token se queda en este dispositivo, nunca en una copia de seguridad.'
    ],
    ivaoOn: ['Relié (jeton valable jusqu’au {d}, renouvelé de lui-même).', 'Linked (token valid until {d}, renewed by itself).',
      'Verbunden (Token gültig bis {d}, erneuert sich selbst).', 'Vinculado (token válido hasta el {d}, se renueva solo).'
    ],
    ivaoOff: ['Non relié.', 'Not linked.', 'Nicht verbunden.', 'No vinculado.'],
    ivaoConnect: ['Se connecter à IVAO', 'Sign in to IVAO', 'Bei IVAO anmelden', 'Iniciar sesión en IVAO'],
    ivaoAgain: ['Se reconnecter à IVAO', 'Sign in to IVAO again', 'Erneut bei IVAO anmelden', 'Volver a iniciar sesión en IVAO'],
    ivaoOut: ['Délier', 'Unlink', 'Trennen', 'Desvincular'],
    ivaoOutAsk: ['Délier le compte IVAO de cet appareil ? Le jeton est effacé d’ici.',
      'Unlink the IVAO account from this device? The token is erased here.',
      'Das IVAO-Konto von diesem Gerät trennen? Das Token wird hier gelöscht.',
      '¿Desvincular la cuenta IVAO de este dispositivo? El token se borra aquí.'
    ],
    ivaoNoApp: ['Pas d’application IVAO sur le relais (secrets/ivao_oauth.json) : à régler par l’administrateur.',
      'No IVAO application on the relay (secrets/ivao_oauth.json): for the administrator to set.',
      'Keine IVAO-Anwendung auf dem Relais (secrets/ivao_oauth.json): vom Administrator einzurichten.',
      'Ninguna aplicación IVAO en el relé (secrets/ivao_oauth.json): la configura el administrador.'
    ],
    ivaoErr: ['Connexion à IVAO impossible ({e}).', 'IVAO sign-in impossible ({e}).', 'IVAO-Anmeldung unmöglich ({e}).',
      'Inicio de sesión en IVAO imposible ({e}).'
    ],
    wx: ['Clé météo (TAF, avwx.rest)', 'Weather key (TAF, avwx.rest)', 'Wetterschlüssel (TAF, avwx.rest)',
      'Clave meteorológica (TAF, avwx.rest)'
    ],
    wxHint: [
      'Le METAR marche sans clé. Le TAF, sans lanceur, demande une clé personnelle d’avwx.rest (gratuite) : gardée sur cet appareil seulement, jamais dans le dépôt ni dans une sauvegarde, jamais réaffichée.',
      'METAR works without a key. TAF, without a launcher, needs a personal avwx.rest key (free): kept on this device only, never in the repository nor in a backup, never shown again.',
      'METAR funktioniert ohne Schlüssel. TAF braucht ohne Starter einen persönlichen avwx.rest-Schlüssel (kostenlos): nur auf diesem Gerät gespeichert, nie im Repository oder in einer Sicherung, nie wieder angezeigt.',
      'El METAR funciona sin clave. El TAF, sin lanzador, requiere una clave personal de avwx.rest (gratuita): guardada solo en este dispositivo, nunca en el repositorio ni en una copia, nunca vuelta a mostrar.'
    ],
    wxLauncher: ['Inutile ici : la page est servie par un lanceur, qui fournit le TAF.',
      'Not needed here: the page is served by a launcher, which provides the TAF.',
      'Hier nicht nötig: Die Seite wird von einem Starter bedient, der das TAF liefert.',
      'Innecesaria aquí: la página la sirve un lanzador, que proporciona el TAF.'
    ],
    wxSet: ['Clé enregistrée sur cet appareil.', 'Key saved on this device.', 'Schlüssel auf diesem Gerät gespeichert.',
      'Clave guardada en este dispositivo.'
    ],
    wxNone: ['Aucune clé sur cet appareil.', 'No key on this device.', 'Kein Schlüssel auf diesem Gerät.',
      'Ninguna clave en este dispositivo.'
    ],
    wxKey: ['Clé personnelle avwx.rest', 'Personal avwx.rest key', 'Persönlicher avwx.rest-Schlüssel', 'Clave personal de avwx.rest'],
    wxSignup: ['Créer une clé sur avwx.rest ↗', 'Create a key on avwx.rest ↗', 'Schlüssel auf avwx.rest erstellen ↗',
      'Crear una clave en avwx.rest ↗'
    ],
    wxOk: ['Clé valide : avwx.rest répond ({s}).', 'Key valid: avwx.rest answers ({s}).',
      'Schlüssel gültig: avwx.rest antwortet ({s}).',
      'Clave válida: avwx.rest responde ({s}).'
    ],
    wxKeySet: ['clé enregistrée — vide : inchangée', 'key saved — empty: unchanged', 'Schlüssel gespeichert — leer: unverändert',
      'clave guardada — vacío: sin cambios'
    ],
    wxNoKey: ['Aucune clé enregistrée sur cet appareil.', 'No key saved on this device.',
      'Kein Schlüssel auf diesem Gerät gespeichert.',
      'Ninguna clave guardada en este dispositivo.'
    ],
    wxRefused: ['Clé refusée par avwx.rest ({s}) : vérifiez-la ou créez-en une nouvelle.',
      'Key refused by avwx.rest ({s}): check it or create a new one.',
      'Schlüssel von avwx.rest abgelehnt ({s}): prüfen oder einen neuen erstellen.',
      'Clave rechazada por avwx.rest ({s}): compruébela o cree una nueva.'
    ],
    wxHttp: ['avwx.rest répond {s} : réessayez plus tard.', 'avwx.rest answers {s}: try again later.',
      'avwx.rest antwortet {s}: später erneut versuchen.',
      'avwx.rest responde {s}: vuelva a intentarlo más tarde.'
    ],
    wxEraseAsk: ['Effacer la clé météo de cet appareil ?', 'Erase the weather key from this device?',
      'Den Wetterschlüssel von diesem Gerät löschen?',
      '¿Borrar la clave meteorológica de este dispositivo?'
    ],
    erase: ['Effacer', 'Erase', 'Löschen', 'Borrar'],
  });

  /** Taille lisible (Ko, Mo, Go). */
  // unités de taille, par langue (octet, kilo, méga, giga)
  const UNITS = [
    ['o', 'B', 'B', 'B'],
    ['Ko', 'KB', 'KB', 'KB'],
    ['Mo', 'MB', 'MB', 'MB'],
    ['Go', 'GB', 'GB', 'GB']
  ];
  /** Taille lisible dans la langue de l'appli (t : textes du cadre). */
  const bytes = (n, t) => {
    if (!Number.isFinite(n)) return '?';
    const k = n < 1e3 ? 0 : n < 1e6 ? 1 : n < 1e9 ? 2 : 3,
      v = n / 10 ** (3 * k);
    return `${v.toLocaleString(document.documentElement.lang || undefined, { maximumFractionDigits: k > 1 ? 1 : 0 })} ${t(UNITS[k])}`;
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

  const DESK = new WeakSet(); // vues qui écoutent déjà « frame-desk »
  /** Dessine l'écran des réglages dans view ; c : contexte du cadre (voir l'en-tête). */
  async function render(view, c) {
    window.SogSettingsKit.bind(c.launcherRequest); // les routes du lanceur passent par le client du cadre
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
      st = await FD.status(),
      remote = L ? await P.launcher.readRemote() : null, // dépôt distant de data/ (lanceur)
      // état de data/ : absent, plain (dossier sans git), repo ; champ state du lanceur, sinon déduit
      gitState = !L ? '' : remote?.state || (!L.data ? 'absent' : remote?.repo ? 'repo' : 'plain');
    /** Champ libellé (data-f = k) ; o : type, ph (exemple affiché), cap (majuscules), mode (clavier). */
    const fld = (k, row, v, o = {}) => `<label class="f-field">${esc(t(row))}<input data-f="${k}" type="${o.type || 'text'}" value="${esc(v || '')}" autocomplete="off" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.cap ? 'autocapitalize="characters"' : 'autocapitalize="off"'} spellcheck="false"></label>`;
    const how = !exchange ? t(L?.data ? T.aloneLauncher : T.alone) : L?.data ? t(T.viaLauncher, {
      g: t(!L.dataGit ? T.viaLauncherNoGit : remote && !remote.url ? T.viaLauncherNoRemote : T.viaLauncherGit)
    }) : gh ? t(T.viaGithub, {
      r: gh.repo
    }) : t(T.viaNone);
    // bloc « État » en tête (les lignes de l'ancien pop-up « i » : vol démarré, CR à écrire, données, base, lanceur, position),
    // dessiné par le cadre qui en a l'état, posé ici en première carte
    const cards = [c.status?.html() || ''];
    // configuration d'un pilote : le lien #settings?config=… ou un fichier lancent l'assistant « Rejoindre la compagnie »
    // (frame/settings/join.js), que #settings?join=1 affiche à la place des cartes
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    // une carte atteinte par son adresse (#settings?card=<nom>, #settings?offline=1 de l'assistant) : seule, quel que soit
    // le niveau ; le niveau ne filtre que la liste (SPEC § 1)
    const focus = q.get('card') || (q.get('offline') ? 'offline' : '');
    // carte Administration (niveau Complet, ou atteinte par son adresse) : le filet de la limite de la zone du vol, option
    // enregistrée avec les seuils
    const edgeShow = (c.level?.() || 2) === 3 || focus === 'admin' ? await P.admin.readEdge(c) : true;
    let inErr = '';
    if (q.get('config') && window.SogConfig && window.SogJoin) {
      try {
        const r = SogConfig.validate(await SogConfig.unpack(q.get('config')));
        if (r.ok) {
          await SogJoin.start(c.own, r.cfg);
          history.replaceState(null, '', `${location.pathname}${location.search}#settings?join=1`);
        } else inErr = cfgError(r, t);
      } catch {
        inErr = t(T.cfgBadFile);
      }
    }
    const join = window.SogJoin ? await SogJoin.load(c.own) : {},
      jd = join.cfg?.data;
    // accès que la configuration réglerait sur cet appareil : same / other (data/ du lanceur déjà un dépôt), clone / adopt
    // (par le lanceur), github (transport de l'appareil), none (hôte sans transport sans lanceur), nodata
    const access = !jd ? 'nodata' : L ? (gitState === 'repo' ? (sameRepo(remote?.url, SogConfig.cloneUrl(jd)) ? 'same' : 'other') :
      gitState === 'absent' ? 'clone' : 'adopt') : SogConfig.kind(jd) === 'github' ? 'github' : 'none';
    if (window.SogJoin && /[?&]join=/.test(location.hash)) return SogJoin.render(view, {
      t,
      esc,
      fld,
      own: c.own,
      FD,
      c,
      access,
      remote,
      L,
      setup,
      confirmOpen,
      airlineDoc,
      AIRLINE,
      howtoHtml,
      copy,
      copyShown: T.copyShown,
      pick: () => pickConfig(c, view)
    });
    if (inErr) cards.push(`<div class="f-card" data-card="cfg"><h2>${esc(t(T.cfgTitle))}</h2><p class="f-msg" data-kind="err">${esc(inErr)}</p>
      <div class="f-row"><button type="button" data-act="cfgCancel">${esc(t(T.close))}</button></div></div>`);
    // assistant en cours : le reprendre là où il en était
    if (join.cfg && !join.finished && !join.quit) {
      const steps = SogJoin.stepsFor(access);
      cards.push(`<div class="f-card" data-card="joinresume"><h2>${esc(t(SogJoin.T.title))}</h2><p>${esc(t(T.joinResume, { n: Math.max(1, steps.indexOf(join.step) + 1), m: steps.length }))}</p>
        <div class="f-row"><a class="f-btn primary" href="#settings?join=1">${esc(t(T.joinGo))}</a></div></div>`);
    }
    // reprise V2, une fois
    if (v2) cards.push(`<div class="f-card" data-card="v2"><h2>${esc(t(T.v2))}</h2><p class="f-muted">${esc(t(T.v2Intro))}</p>
      <ul>${Object.entries(v2.identity).map(([k, v]) => `<li>${esc(t(T.pair, { k: t(T[k]) }))} <b>${esc(v)}</b></li>`).join('')}${v2.access ? `<li>${esc(t(T.v2Access, { r: v2.access.repo, b: v2.access.branch }))}</li>` : ''}</ul>
      <div class="f-row"><button type="button" class="primary" data-act="v2take">${esc(t(T.v2Take))}</button><button type="button" data-act="v2no">${esc(t(T.v2No))}</button></div></div>`);
    // identité
    cards.push(`<div class="f-card" data-card="identity"><h2>${esc(t(T.identity))}</h2><p class="f-muted">${esc(t(T.identityHint))}</p>
      ${fld('trigram', T.trigram, id.trigram, { cap: true, ph: 'ABC' })}${fld('ivao', T.ivao, id.ivao, { mode: 'numeric' })}${fld('vatsim', T.vatsim, id.vatsim, { mode: 'numeric' })}${fld('simbrief', T.simbrief, id.simbrief)}
      ${us.users && !id.trigram ? `<p class="f-warn">${esc(t(T.needTrigram))}</p>` : ''}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="identity">${esc(t(T.save))}</button></div></div>`);
    // niveau d'usage : un geste, le menu suit aussitôt
    const lvl = c.level?.() || 2,
      mods = (await c.modules?.()) || [],
      shows = n => mods.filter(m => m.level <= n).map(m => t(m.label)).join(', ') || t(T.levelNone);
    cards.push(`<div class="f-card" data-card="level"><h2>${esc(t(T.level))}</h2><p class="f-muted">${esc(t(T.levelHint))}</p>
      ${T.levels.map(([name, desc], i) => `<label class="f-check f-level"><input type="radio" name="sogLevel" data-level="${i + 1}" ${lvl === i + 1 ? 'checked' : ''}><span><b>${esc(t(name))}</b> — ${esc(t(desc))}<br><span class="f-muted">${esc(t(T.levelShows, { m: shows(i + 1) }))}</span></span></label>`).join('')}</div>`);
    // design : vignettes des jeux du cadre (chaque vignette porte son design et le ton du moment), ton auto / jour / nuit ;
    // le cadre applique et garde le choix (ctx.saveDesign), rien n'est écrit ici
    const sets = c.designs?.() || [];
    if (sets.length) {
      const cur = c.design?.() || {},
        night = cur.tone === 'night' || (cur.tone !== 'day' && matchMedia('(prefers-color-scheme: dark)').matches);
      /** Nom d'un design (son libellé s'il est dans la liste de cet appareil, sinon son identifiant). */
      const nameOf = id => {
        const d = sets.find(x => x.id === id);
        return d ? t(d.label) : String(id || '').replace(/^./, ch => ch.toUpperCase());
      };
      const desk = cur.applied && cur.design && cur.applied !== cur.design ? `<p class="f-muted" data-design-applied>${esc(t(T.designDesk, { d: nameOf(cur.design), a: nameOf(cur.applied) }))}</p>` : '';
      cards.push(`<div class="f-card" data-card="design"><h2>${esc(t(T.design))}</h2><p class="f-muted">${esc(t(T.designHint))}</p>
        <div class="f-designs">${sets.map(d => `<button type="button" class="f-design" data-design-pick="${esc(d.id)}" aria-pressed="${(cur.applied || cur.design) === d.id}">
          <span class="f-design-thumb" data-design="${esc(d.id)}" data-tone="${night ? 'night' : 'day'}"><span class="f-design-bar"></span><span class="f-design-card">${esc(t(T.sample))}<span class="f-design-chip"></span></span></span>
          <span class="f-design-name">${esc(t(d.label))}${d.textured ? ` <span class="f-muted">· ${esc(t(T.textured))}</span>` : ''}</span></button>`).join('')}</div>${desk}
        <h3>${esc(t(T.tone))}</h3>${['auto', 'day', 'night'].map(k => `<label class="f-check"><input type="radio" name="sogTone" data-tone-pick="${k}" ${(cur.tone || 'auto') === k ? 'checked' : ''}>${esc(t(T.tones[k]))}</label>`).join('')}</div>`);
    }
    // usages
    const chk = (k, row, dis) => `<label class="f-check"><input type="checkbox" data-u="${k}" ${us[k] ? 'checked' : ''} ${dis ? 'disabled' : ''}>${esc(t(row))}</label>`;
    cards.push(`<div class="f-card" data-card="usages"><h2>${esc(t(T.usages))}</h2><p><b>${esc(how)}</b></p><p class="f-muted">${esc(t(T.usagesHint))}</p>
      ${chk('devices', T.devices)}${chk('users', T.users)}${chk('backend', T.backend, true)}${us.users && L?.data && !remote?.url ? `<p class="f-warn">${esc(t(T.needRemote))}</p>` : ''}</div>`);
    // à Découverte : sept cartes au plus (SPEC § 1) — sauvegarde, données hors ligne, clé météo, accès du poste et
    // Little Navmap à partir du niveau Courant
    if (!exchange && (lvl > 1 || focus === 'backup')) cards.push(`<div class="f-card" data-card="backup"><h2>${esc(t(T.backup))}</h2><p class="f-muted">${esc(t(T.backupHint))}</p>
      <div class="f-row"><button type="button" class="primary" data-act="export">${esc(t(T.export))}</button><button type="button" data-act="import">${esc(t(T.import))}</button><button type="button" data-act="replace">${esc(t(T.replace))}</button><input type="file" accept="application/json,.json" data-file hidden></div></div>`);
    // carte Accès toujours : sur un lanceur, le dépôt distant de data/ ; sinon dépôt GitHub et jeton (sans échange coché :
    // lecture des bases seulement)
    // contexte des fichiers de l'écran (cartes du lanceur, accès et transport, diagnostic, administration) : les mêmes noms
    // que dans ce dessin ; card, val, say et again s'y ajoutent une fois la page posée
    const env = {
      view,
      c,
      t,
      FD,
      L,
      id,
      us,
      gh,
      prefs,
      exchange,
      remote,
      gitState,
      st,
      mods,
      fld,
      lvl,
      diagJson: '{}'
    };
    // carte Accès toujours : sur un lanceur, le dépôt distant de data/ (launcher.js) ; sinon dépôt GitHub et jeton (access.js)
    cards.push(L ? P.launcher.accessHtml(env) : P.access.accessHtml(env));
    // configuration d'un pilote, dans la carte Accès : importer (toujours, en tête), exporter (poste ou accès GitHub réglé)
    const cfgIn = window.SogConfig ? `<p class="f-muted">${esc(t(T.cfgImportHint))}</p><div class="f-row"><button type="button" data-act="cfgJoin">${esc(t(T.cfgJoin))}</button><button type="button" data-act="cfgImport">${esc(t(T.cfgImport))}</button><input type="file" accept="application/json,.json" data-cfgfile hidden></div>` : '';
    const cfgOut = P.admin.cfgPanel(env); // volet d'export de la carte Administration ; env.xsrc : le dépôt à exporter
    // l'import reste dans la carte Accès (affaire du pilote) ; l'export est une page de l'administrateur : carte Administration
    const ai = cards.findIndex(x => x.startsWith('<div class="f-card" data-card="access">'));
    if (ai >= 0) cards[ai] = cards[ai].replace(/^(<div class="f-card" data-card="access"><h2>[^<]*<\/h2>)/, `$1${cfgIn}`);
    // synchronisation : montrée si un échange est coché ou tant que des écritures attendent (access.js)
    cards.push(P.access.syncHtml(env));
    // données hors ligne
    if (lvl > 1 || focus === 'offline') cards.push(`<div class="f-card" data-card="offline"><h2>${esc(t(T.offlineData))}</h2><dl class="f-dl" data-offline><dt>${esc(t(T.zones))}</dt><dd>…</dd><dt>${esc(t(T.storage))}</dt><dd>…</dd></dl>
      <div data-zones></div>${!L?.data && !gh ? `<p class="f-warn">${esc(t(T.noBases))}</p>` : ''}<p class="f-muted">${esc(t(T.zoneHint))}</p></div>`);
    // compte IVAO du pilote par le relais (R1b) : avec un lanceur (le relais de la compagnie ou ce poste) ; le jeton n'est
    // jamais montré, seulement l'état
    const iv = c.ivao;
    if (iv && L && (lvl > 1 || focus === 'ivao')) {
      const st = iv.status();
      cards.push(`<div class="f-card" data-card="ivao"><h2>${esc(t(T.ivao))}</h2><p class="f-muted">${esc(t(T.ivaoHint))}</p>
        <p><b data-ivao-state="${st.connected ? 'on' : 'off'}">${esc(st.connected ? t(T.ivaoOn, { d: new Date(st.expires_at * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' }) : t(T.ivaoOff))}</b></p>
        <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="ivaoConnect">${esc(t(st.connected ? T.ivaoAgain : T.ivaoConnect))}</button>${st.connected ? `<button type="button" data-act="ivaoOut">${esc(t(T.ivaoOut))}</button>` : ''}</div></div>`);
    }
    // clé météo de l'appareil, avec ou sans lanceur (le cadre la garde hors de device/ et de toute sauvegarde)
    const wk = c.weatherKey;
    if (wk && (lvl > 1 || focus === 'wx')) cards.push(`<div class="f-card" data-card="wx"><h2>${esc(t(T.wx))}</h2><p class="f-muted">${esc(t(T.wxHint))}</p>
      ${L ? `<p class="f-muted">${esc(t(T.wxLauncher))}</p>` : ''}<p><b>${esc(t(wk.has() ? T.wxSet : T.wxNone))}</b></p>
      ${fld('wxKey', T.wxKey, '', { type: 'password', ph: wk.has() ? t(T.wxKeySet) : '' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="wxSave">${esc(t(T.save))}</button><button type="button" data-act="wxTest" ${wk.has() ? '' : 'disabled'}>${esc(t(T.test))}</button><button type="button" data-act="wxErase" ${wk.has() ? '' : 'disabled'}>${esc(t(T.erase))}</button></div>
      <p><a href="https://account.avwx.rest/" target="_blank" rel="noopener">${esc(t(T.wxSignup))}</a></p></div>`);
    // clés d'API de la compagnie et dépôt distant de data/ (lanceur) : volets de la carte Administration (admin.js)
    // accès des appareils du réseau local : sur le poste qui sert la page seulement (c.lan() nul ailleurs, même sur un
    // appareil appairé) ; état dessiné et relu toutes les 5 s par paintLan
    const lanCard = lvl > 1 || focus === 'lan' ? P.launcher.lanHtml(env) : '';
    if (lanCard) cards.push(lanCard);
    // fiches Little Navmap (.lnmperf), si un lanceur sert la page : carte écrite par aerodb (frame/aerodb/lnmperf.js)
    if (L && (lvl > 1 || focus === 'lnmperf') && c.aerodb()?.lnmperf) cards.push(
      '<div class="f-card" data-card="lnmperf" hidden></div>');
    const help = await c.helpPanel?.().catch(() => null);
    const adminHtml = lvl === 3 || focus === 'admin' ? P.admin.adminCard(t, L, {
      cfg: cfgOut,
      edge: edgeShow,
      remote: L ? P.launcher.remoteHtml(env) : '',
      keys: L ? P.launcher.keysHtml(env) : ''
    }) : '';
    const all = [...cards, P.diagnostic.aboutHtml(env), adminHtml],
      one = focus ? P.groups.pick(all, focus) : '';
    // carte demandée par l'adresse : elle seule, sous « ← Réglages » ; sinon la liste, rangée selon le niveau
    view.innerHTML = one ? `<h1>${esc(t(T.title))}</h1><p><a class="f-btn" href="#settings" data-settings-back>${esc(t(T.backToList))}</a></p>${one}` :
      `<h1>${esc(t(T.title))}</h1><p class="f-muted">${esc(t(T.intro))}</p>${P.groups.arrange(all, t, lvl)}`;
    P.groups.wireGroups(view);
    if (help && !one)(view.querySelector('[data-card="status"]') || view.querySelector('h1 + p'))?.after(help); // sous le bloc d'état

    /** Carte de l'écran par son nom (data-card). */
    const card = k => view.querySelector(`[data-card="${k}"]`);
    c.status?.bind(card('status')); // vivant : redessiné par le cadre quand l'état change, ses lignes mènent où elles disent
    if (card('lnmperf')) c.aerodb().lnmperf().then(x => x.card(card('lnmperf'), {
      t,
      notify: c.notify
    })).then(() => {
      const k = card('lnmperf');
      if (k?.firstChild) k.hidden = false;
    }).catch(() => {});
    /** Valeur saisie d'un champ (data-f), sans espaces autour. */
    const val = (k, root = view) => root.querySelector(`[data-f="${k}"]`)?.value.trim() ?? '';
    /** Message dans la carte (kind : ok, warn, err) ; vide l'efface. */
    const say = (k, text, kind = 'err') => {
      const m = card(k)?.querySelector('[data-msg]');
      if (m) {
        m.textContent = text || '';
        m.dataset.kind = kind;
      }
    };
    /** Redessine tout l'écran. */
    const again = () => render(view, c);
    P.groups.markAttention(view);
    // ordinateur ↔ téléphone (« frame-desk » du cadre) : la liste des designs et la ligne « réservé à l'ordinateur » suivent,
    // si l'écran est toujours là (une écoute par vue)
    if (!DESK.has(view)) {
      DESK.add(view);
      addEventListener('frame-desk', () => {
        if (view.querySelector('[data-card="design"]')) render(view, c);
      });
    }
    Object.assign(env, {
      card,
      val,
      say,
      again
    });

    // état vivant : synchronisation, données hors ligne, clés, diagnostic
    P.access.live(env); // synchronisation et écritures en attente, vivantes
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
      if (dl) dl.innerHTML = `<dt>${esc(t(T.zones))}</dt><dd>${esc(zones)}</dd><dt>${esc(t(T.storage))}</dt><dd>${esc(est ? t(T.storageState, { u: bytes(est.usage, t), q: bytes(est.quota, t) }) : t(T.unknown))}</dd>`;
      paintZones();
      await P.diagnostic.live(env, est); // diagnostic du cadre, lisible et à copier
    })();
    /** Zones publiées et base des appareils, avec leur état sur cet appareil (aerodb.offline) ; garder / libérer. */
    async function paintZones() {
      const box = view.querySelector('[data-zones]'),
        off = c.aerodb()?.offline;
      if (!box || !off) return;
      const can = off.supported?.() || {},
        zs = (await off.zones().catch(() => null)) || [],
        ac = await off.aircraft?.().catch(() => null);
      /** Libellé de l'état d'une zone hors ligne. */
      const st = z => t(T.zoneState[z.state] || T.zoneState.unknown);
      box.innerHTML = zs.map(z => `<div class="f-zone" data-zone="${esc(z.id)}"><div><b>${esc(t(z.names))}</b><br><span class="f-muted" data-zline>${esc(t(T.zoneLine, { s: st(z), c: z.cycle || '?', k: z.cachedKb ?? '?', p: z.publishedKb ?? '?' }))}</span></div>
        <div class="f-row">${z.state !== 'complete' ? `<button type="button" data-keep="${esc(z.id)}">${esc(t(T.keep))}</button>` : ''}${can.evict && z.cachedKb ? `<button type="button" data-release="${esc(z.id)}">${esc(t(T.release))}</button>` : ''}</div></div>`).join('') +
        (ac ? `<div class="f-zone"><div><b>${esc(t(T.aircraftDb))}</b><br><span class="f-muted">${esc(ac.types == null ? st(ac) : t(T.aircraftLine, { s: st(ac), n: ac.types }))}</span></div></div>` : '');
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
    P.launcher.live(env); // accès du poste (relève toutes les 5 s), clé IVAO, fenêtre Oui / Non annoncée

    // actions
    view.onclick = async e => {
      if (await P.launcher.onClick(env, e)) return; // un appareil appairé oublié
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      for (const part of [P.launcher, P.access, P.diagnostic, P.admin])
        if (part.acts.includes(act)) return part.run(env, act, b, e);
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
      if (act === 'import' || act === 'replace') {
        const f = view.querySelector('[data-file]');
        f.dataset.mode = act === 'replace' ? 'replace' : 'merge';
        return f.click();
      }
      if (act === 'ivaoConnect') {
        say('ivao', '…', 'warn');
        const r = await c.ivao.connect();
        if (!r.ok) say('ivao', r.status === 409 ? t(T.ivaoNoApp) : t(T.ivaoErr, {
          e: r.message || r.status || '?'
        }), 'err');
        return;
      }
      if (act === 'ivaoOut') {
        if (!await c.ask(t(T.ivaoOutAsk))) return;
        await c.ivao.disconnect();
        c.notify(t(T.saved), 'ok');
        return again();
      }
      if (act === 'wxSave') {
        const f = card('wx').querySelector('[data-f="wxKey"]'),
          k = f?.value.trim() || '';
        if (f) f.value = '';
        if (!k) return say('wx', '');
        await c.weatherKey.save(k);
        c.notify(t(T.saved), 'ok');
        return again();
      }
      if (act === 'wxTest') {
        say('wx', '…', 'warn');
        const r = await c.weatherKey.test('LFPG').catch(e => ({
          ok: false,
          message: e?.message || String(e)
        }));
        // messages du cadre : ok, no key, key refused, offline, HTTP <n> — traduits ici
        const m = String(r?.message || ''),
          http = /^HTTP (\d+)/.exec(m);
        return say('wx', r?.ok ? t(T.wxOk, {
          s: r.status || 200
        }) : m === 'no key' ? t(T.wxNoKey) : m === 'key refused' ? t(T.wxRefused, {
          s: r.status || '401'
        }) : m === 'offline' ? t(T.testOffline) : http ? t(T.wxHttp, {
          s: http[1]
        }) : m || '?', r?.ok ? 'ok' : m === 'offline' ? 'warn' : 'err');
      }
      if (act === 'wxErase') {
        if (!await c.ask(t(T.wxEraseAsk))) return;
        await c.weatherKey.clear();
        c.notify(t(T.saved), 'ok');
        return again();
      }
      // ---- configuration d'un pilote
      if (act === 'cfgImport') return view.querySelector('[data-cfgfile]')?.click();
      if (act === 'cfgCancel') {
        dropConfigHash();
        return again();
      }
      if (act === 'cfgJoin') {
        location.hash = '#settings?join=1';
        return;
      }
    };
    view.querySelector('[data-cfgfile]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await joinFromFile(c, f, view);
    });
    // #settings?offline=1 (fin de l'assistant) : la carte Données hors ligne seule (focus), l'adresse reste telle quelle
    // #settings?import=1 (carte d'accueil) : le bouton d'import à portée
    if (q.get('import')) {
      dropConfigHash(); // une fois : le dessin suivant (après le choix du fichier) reste en tête
      const b = view.querySelector('[data-act="cfgImport"]');
      b?.closest('details.f-group')?.setAttribute('open', ''); // son groupe (Accès) ouvert d'abord
      setTimeout(() => {
        b?.scrollIntoView({
          block: 'center'
        });
        b?.focus();
      }, 0);
    }
    view.querySelectorAll('[data-design-pick]').forEach(b => b.addEventListener('click', async () => {
      await c.saveDesign({
        ...(c.design?.() || {}),
        design: b.dataset.designPick
      });
      again();
    }));
    view.querySelectorAll('[data-tone-pick]').forEach(i => i.addEventListener('change', async () => {
      await c.saveDesign({
        ...(c.design?.() || {}),
        tone: i.dataset.tonePick
      });
      again();
    }));
    view.querySelectorAll('[data-level]').forEach(i => i.addEventListener('change', async () => {
      const n = +i.dataset.level;
      await c.own.put('device/level.json', {
        level: n,
        updated_at: now()
      });
      await c.reload();
      c.notify(t(T.levelSaved, {
        l: t(T.levels[n - 1][0])
      }), 'ok');
    }));
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
    P.admin.live(env); // filet de la limite de la zone du vol, enregistré aussitôt
    view.querySelector('[data-file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await importDevice(c, f, e.target.dataset.mode);
      again();
    });
  }

  // ---- configuration d'un pilote (frame/settings/config.js)
  /** Fichier de configuration choisi → vérifié, assistant « Rejoindre la compagnie » commencé et affiché ; refus : message. */
  async function joinFromFile(c, f, view) {
    let r = null;
    try {
      r = SogConfig.validate(await SogConfig.read(f));
    } catch {
      r = null;
    }
    if (!r?.ok) return c.notify(r ? cfgError(r, c.t) : c.t(T.cfgBadFile), 'err');
    await SogJoin.start(c.own, r.cfg);
    if (location.hash.includes('join=')) return render(view, c);
    location.hash = '#settings?join=1';
  }
  /** Choix d'un fichier de configuration depuis l'assistant (pas encore de configuration). */
  function pickConfig(c, view) {
    const i = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: 'application/json,.json'
    });
    i.onchange = () => i.files?.[0] && joinFromFile(c, i.files[0], view);
    i.click();
  }
  /** Message d'une configuration refusée (validate). */
  const cfgError = (r, t) => r.error === 'schema' ? t(T.cfgBadSchema, {
    s: r.schema
  }) : r.error === 'field' ? t(T.cfgBadField, {
    f: r.field
  }) : t(T.cfgBadFile);
  /** Retire config= / import= de l'adresse (la configuration n'est plus proposée au dessin suivant). */
  const dropConfigHash = () => {
    if (/[?&](config|import)=/.test(location.hash)) history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  };

  /** Exporte la sauvegarde de cet appareil en un fichier (FrameData.dump : copies, écritures en attente, conflits ; jamais
   *  de jeton ; bases de référence exclues). */
  async function exportDevice(c) {
    const d = await c.FD.dump(),
      a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([d.text], {
          type: 'application/json'
        })),
        download: d.name
      });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    c.notify(c.t(T.exported, {
      d: d.counts.docs,
      p: d.counts.pending,
      k: bytes(d.counts.bytes, c.t)
    }), 'ok');
  }
  /** Reprend une sauvegarde (FrameData.load) : fusion par défaut (rien d'ici n'est perdu), remplacement sur demande,
   *  chacun après une question qui dit ce qu'il fait. */
  async function importDevice(c, file, mode = 'merge') {
    let d = null;
    try {
      d = JSON.parse(await file.text());
    } catch {
      /* illisible */
    }
    if (!d || !Array.isArray(d.docs)) return c.notify(c.t(T.badFile), 'err');
    const day = String(d.at || '?').slice(0, 10);
    if (!await c.ask(c.t(mode === 'replace' ? T.replaceAsk : T.importAsk, {
        d: day
      }))) return;
    let r;
    try {
      r = await c.FD.load(d, {
        mode
      });
    } catch {
      return c.notify(c.t(T.badFile), 'err');
    }
    await c.reload();
    c.notify(c.t(T.imported, {
      a: r.added,
      u: r.updated,
      k: r.kept,
      c: r.conflicts
    }), 'ok');
  }

  window.SogSettings = {
    render,
    T
  };
})();
