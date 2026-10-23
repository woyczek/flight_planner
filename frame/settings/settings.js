(() => {
  'use strict';
  // V3 — écran des réglages du cadre (#settings ; frame/settings/SPEC.md) : il remplace l'écran #device. Il fait partie du
  // cadre et non d'un module, parce qu'il règle le transport et le jeton de l'appareil, ce qu'un module ne touche jamais.
  //   · cartes courtes en une colonne (téléphone d'abord), chacune enregistrée seule ;
  //   · Identité (device/identity.json) ; Niveau (device/level.json : 1 découverte, 2 courant, 3 complet ; le menu du
  //     cadre suit) ; Usages (device/usages.json) : « Seul sur cet appareil » n'est pas une case,
  //     c'est l'état quand aucun échange n'est coché ; export / import des données de l'appareil dans ce seul cas ;
  //   · Accès, toujours : sur un poste servi par le lanceur, le dépôt distant de data/ (GET / POST /__setup/sync-remote :
  //     vérifier, enregistrer ; autre dépôt confirmé dans une fenêtre du lanceur) ; sinon dépôt GitHub, jeton jamais
  //     réaffiché, « Couper l'accès » (sans échange coché : lecture des bases seulement) ; Synchronisation si un échange
  //     est coché ;
  //   · Données hors ligne (ctx.aerodb, stockage du navigateur) ; Clés, si un lanceur sert la page ; diagnostic replié ;
  //   · reprise des réglages V2 de la même origine en un geste (identité, accès GitHub), proposée une fois.
  // Contexte donné par frame/app.js : { t, notify, ask, FD, own (device/, politique cache), reload, identity(), usages(),
  // launcher(), transport(), aerodb(), syncNow }.
  const ROOT = new URL('../../', document.currentScript.src).href; // racine de la suite (routes /__setup du lanceur)
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const now = () => new Date().toISOString();

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
    // accès
    access: ['Accès aux données', 'Data access', 'Datenzugang', 'Acceso a los datos'],
    remote: ['Dépôt distant de data/', 'Remote repository of data/', 'Entferntes Repository von data/', 'Repositorio remoto de data/'],
    remoteNow: ['Actuel : {u} (branche {b})', 'Current: {u} (branch {b})', 'Aktuell: {u} (Zweig {b})', 'Actual: {u} (rama {b})'],
    remoteNowBare: ['Actuel : {u}', 'Current: {u}', 'Aktuell: {u}', 'Actual: {u}'],
    remoteNone: ['Aucun dépôt distant : rien ne part ailleurs que ce poste.', 'No remote repository: nothing leaves this workstation.',
      'Kein entferntes Repository: nichts verlässt diesen Rechner.', 'Ningún repositorio remoto: nada sale de este puesto.'
    ],
    remoteUrl: ['Adresse du dépôt (git@hôte:compte/dépôt.git ou https://…)',
      'Repository address (git@host:account/repo.git or https://…)',
      'Repository-Adresse (git@host:konto/repo.git oder https://…)',
      'Dirección del repositorio (git@host:cuenta/repo.git o https://…)'
    ],
    remoteCheck: ['Vérifier', 'Check', 'Prüfen', 'Comprobar'],
    remoteSaving: [
      'Enregistrement, puis vérification… Autre dépôt que l’actuel : confirmez dans la fenêtre que le lanceur ouvre sur l’ordinateur.',
      'Saving, then checking… Another repository than the current one: confirm in the window the launcher opens on the computer.',
      'Speichern, dann prüfen… Anderes Repository als das aktuelle: im Fenster bestätigen, das der Starter auf dem Computer öffnet.',
      'Guardando y comprobando… Otro repositorio distinto del actual: confirme en la ventana que el lanzador abre en el equipo.'
    ],
    remoteChecking: ['Vérification…', 'Checking…', 'Prüfen…', 'Comprobando…'],
    gitWhy: [
      'data/ est un dossier ignoré par le dépôt du code : il devient son propre dépôt git, relié au dépôt des données (pas un sous-module).',
      'data/ is a folder ignored by the code repository: it becomes its own git repository, linked to the data repository (not a submodule).',
      'data/ ist ein vom Code-Repository ignorierter Ordner: Er wird ein eigenes Git-Repository, verbunden mit dem Datenrepository (kein Submodul).',
      'data/ es una carpeta ignorada por el repositorio del código: se convierte en su propio repositorio git, enlazado al repositorio de datos (no un submódulo).'
    ],
    stateAbsent: ['Pas encore de données sur ce poste (data/ absent).', 'No data on this workstation yet (data/ missing).',
      'Noch keine Daten auf diesem Rechner (data/ fehlt).', 'Aún no hay datos en este puesto (data/ ausente).'
    ],
    statePlain: ['data/ est là, mais n’est pas un dépôt git (données d’exemple ou archive) : rien ne part ailleurs que ce poste.',
      'data/ is here, but is not a git repository (example data or archive): nothing leaves this workstation.',
      'data/ ist da, aber kein Git-Repository (Beispieldaten oder Archiv): nichts verlässt diesen Rechner.',
      'data/ está aquí, pero no es un repositorio git (datos de ejemplo o archivo): nada sale de este puesto.'
    ],
    gitUser: ['Identifiant (facultatif)', 'Username (optional)', 'Benutzername (optional)', 'Usuario (opcional)'],
    gitSecret: ['Mot de passe ou jeton (facultatif, jamais gardé par la page)', 'Password or token (optional, never kept by the page)',
      'Passwort oder Token (optional, nie von der Seite gespeichert)', 'Contraseña o token (opcional, nunca guardado por la página)'
    ],
    gitRemember: ['Se souvenir de ces identifiants dans Git, sur cet ordinateur', 'Remember these credentials in Git, on this computer',
      'Diese Zugangsdaten in Git auf diesem Computer merken', 'Recordar estas credenciales en Git, en este equipo'
    ],
    gitCredHint: ['Sans identifiant, ceux que Git connaît déjà sur cet ordinateur servent (clé SSH, identifiants enregistrés).',
      'Without a username, those Git already knows on this computer are used (SSH key, stored credentials).',
      'Ohne Benutzernamen werden die verwendet, die Git auf diesem Computer schon kennt (SSH-Schlüssel, gespeicherte Zugangsdaten).',
      'Sin usuario, se usan las que Git ya conoce en este equipo (clave SSH, credenciales guardadas).'
    ],
    clone: ['Récupérer les données', 'Fetch the data', 'Daten holen', 'Recuperar los datos'],
    adopt: ['Reprendre data/ dans ce dépôt', 'Take data/ into this repository', 'data/ in dieses Repository übernehmen',
      'Retomar data/ en este repositorio'
    ],
    launcherOld: ['Le lanceur de ce poste ne connaît pas encore cette opération : relancez-le à jour (lancer.cmd), puis réessayez.',
      'This workstation’s launcher does not know this operation yet: restart it up to date (lancer.cmd), then try again.',
      'Der Starter dieses Rechners kennt diesen Vorgang noch nicht: aktualisiert neu starten (lancer.cmd), dann erneut versuchen.',
      'El lanzador de este puesto aún no conoce esta operación: reinícielo actualizado (lancer.cmd) y vuelva a intentarlo.'
    ],
    gitWorking: ['En cours… (quelques secondes à quelques minutes ; rien ne bloque)',
      'Working… (a few seconds to a few minutes; nothing blocks)',
      'Läuft… (einige Sekunden bis einige Minuten; nichts blockiert)', 'En curso… (de unos segundos a unos minutos; nada bloquea)'
    ],
    noGitAnchor: ['un-dépôt-git-pour-data', 'a-git-repository-for-data', 'ein-git-repository-für-data', 'un-repositorio-git-para-data'],
    helpLink: ['Ouvrir l’aide', 'Open the help', 'Hilfe öffnen', 'Abrir la ayuda'],
    needRemote: ['À plusieurs par git, il faut un dépôt distant pour data/ : réglez-le dans « Accès aux données » ci-dessous.',
      'Several users through git need a remote repository for data/: set it in “Data access” below.',
      'Mehrere Nutzer über git brauchen ein entferntes Repository für data/: unter „Datenzugang“ unten einstellen.',
      'Varios usuarios por git necesitan un repositorio remoto para data/: configúrelo en «Acceso a los datos» abajo.'
    ],
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
    accessRead: [
      'Sans échange coché, l’accès ne sert qu’à lire les bases aéronautiques et des appareils publiées dans le dépôt des données : rien n’est envoyé.',
      'With no exchange ticked, the access only reads the aeronautical and aircraft bases published in the data repository: nothing is sent.',
      'Ohne angekreuzten Austausch dient der Zugang nur zum Lesen der im Datenrepository veröffentlichten Luftfahrt- und Flugzeugdaten: Es wird nichts gesendet.',
      'Sin intercambio marcado, el acceso solo sirve para leer las bases aeronáuticas y de aeronaves publicadas en el repositorio de datos: no se envía nada.'
    ],
    noBases: [
      'Aucune base sur cet appareil : ni accès au dépôt des données réglé, ni lanceur. Réglez l’accès ci-dessus, ou publiez les bases depuis un poste avec lanceur (V2 : Paramètres › Maintenance › Données aéronautiques et Types d’aéronefs).',
      'No base on this device: no access to the data repository set, and no launcher. Set the access above, or publish the bases from a workstation with the launcher (V2: Settings › Maintenance › Aeronautical data and Aircraft types).',
      'Keine Basis auf diesem Gerät: weder Zugang zum Datenrepository eingestellt noch Starter. Stellen Sie oben den Zugang ein oder veröffentlichen Sie die Basen von einem Rechner mit Starter (V2: Einstellungen › Wartung › Luftfahrtdaten und Luftfahrzeugtypen).',
      'Ninguna base en este dispositivo: ni acceso al repositorio de datos configurado, ni lanzador. Configure el acceso arriba, o publique las bases desde un puesto con lanzador (V2: Ajustes › Mantenimiento › Datos aeronáuticos y Tipos de aeronave).'
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
      st = await FD.status(),
      remote = L ? await setup('sync-remote') : null, // dépôt distant de data/ (lanceur)
      // état de data/ : absent, plain (dossier sans git), repo ; champ state du lanceur, sinon déduit
      gitState = !L ? '' : remote?.state || (!L.data ? 'absent' : remote?.repo ? 'repo' : 'plain');
    const fld = (k, row, v, o = {}) => `<label class="f-field">${esc(t(row))}<input data-f="${k}" type="${o.type || 'text'}" value="${esc(v || '')}" autocomplete="off" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.cap ? 'autocapitalize="characters"' : 'autocapitalize="off"'} spellcheck="false"></label>`;
    const how = !exchange ? t(T.alone) : L?.data ? t(T.viaLauncher, {
      g: t(!L.dataGit ? T.viaLauncherNoGit : remote && !remote.url ? T.viaLauncherNoRemote : T.viaLauncherGit)
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
    // niveau d'usage : un geste, le menu suit aussitôt
    const lvl = c.level?.() || 2,
      mods = (await c.modules?.()) || [],
      shows = n => mods.filter(m => m.level <= n).map(m => t(m.label)).join(', ') || t(T.levelNone);
    cards.push(`<div class="f-card" data-card="level"><h2>${esc(t(T.level))}</h2><p class="f-muted">${esc(t(T.levelHint))}</p>
      ${T.levels.map(([name, desc], i) => `<label class="f-check f-level"><input type="radio" name="sogLevel" data-level="${i + 1}" ${lvl === i + 1 ? 'checked' : ''}><span><b>${esc(t(name))}</b> — ${esc(t(desc))}<br><span class="f-muted">${esc(t(T.levelShows, { m: shows(i + 1) }))}</span></span></label>`).join('')}</div>`);
    // usages
    const chk = (k, row, dis) => `<label class="f-check"><input type="checkbox" data-u="${k}" ${us[k] ? 'checked' : ''} ${dis ? 'disabled' : ''}>${esc(t(row))}</label>`;
    cards.push(`<div class="f-card" data-card="usages"><h2>${esc(t(T.usages))}</h2><p><b>${esc(how)}</b></p><p class="f-muted">${esc(t(T.usagesHint))}</p>
      ${chk('devices', T.devices)}${chk('users', T.users)}${chk('backend', T.backend, true)}${us.users && L?.data && !remote?.url ? `<p class="f-warn">${esc(t(T.needRemote))}</p>` : ''}</div>`);
    if (!exchange) cards.push(`<div class="f-card" data-card="backup"><h2>${esc(t(T.backup))}</h2><p class="f-muted">${esc(t(T.backupHint))}</p>
      <div class="f-row"><button type="button" class="primary" data-act="export">${esc(t(T.export))}</button><button type="button" data-act="import">${esc(t(T.import))}</button><button type="button" data-act="replace">${esc(t(T.replace))}</button><input type="file" accept="application/json,.json" data-file hidden></div></div>`);
    // carte Accès toujours : sur un lanceur, le dépôt distant de data/ ; sinon dépôt GitHub et jeton (sans échange coché :
    // lecture des bases seulement)
    cards.push(L ? `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2><p>${esc(t(T.accessLauncher))}</p>${gitState === 'repo' ? `<h3>${esc(t(T.remote))}</h3><p>${esc(remote.url ? (/^[\w./-]+$/.test(remote.branch || '') ? t(T.remoteNow, { u: remote.url, b: remote.branch }) : t(T.remoteNowBare, { u: remote.url })) : t(T.remoteNone))}</p>
        ${fld('remote', T.remoteUrl, remote.url || remote.default || '')}<p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="remoteSave">${esc(t(T.save))}</button><button type="button" data-act="remoteCheck">${esc(t(T.remoteCheck))}</button></div>` : gitDoor(gitState, t, fld, remote)}</div>` :
      `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2>${exchange ? '' : `<p class="f-muted">${esc(t(T.accessRead))}</p>`}
        ${fld('repo', T.repo, gh?.repo, { ph: 'compte/flight_planner_data' })}${fld('branch', T.branch, gh?.branch || 'main')}${fld('token', T.token, '', { type: 'password', ph: gh ? t(T.tokenSet) : '' })}
        <p class="f-muted">${esc(t(T.tokenHint))}</p><p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="access">${esc(t(T.save))}</button><button type="button" data-act="test">${esc(t(T.test))}</button>${gh ? `<button type="button" data-act="cut">${esc(t(T.cut))}</button>` : ''}</div></div>`);
    // synchronisation, si un échange est coché
    if (exchange) {
      cards.push(`<div class="f-card" data-card="sync"><h2>${esc(t(T.sync))}</h2><dl class="f-dl" data-sync></dl><p class="f-muted">${esc(t(T.syncHint))}</p>
        <div class="f-row"><button type="button" class="primary" data-act="sync">${esc(t(T.syncNow))}</button>${st.conflicts ? `<a href="#conflicts">${esc(t(T.conflicts, { n: st.conflicts }))}</a>` : ''}</div></div>`);
    }
    // données hors ligne
    cards.push(`<div class="f-card" data-card="offline"><h2>${esc(t(T.offlineData))}</h2><dl class="f-dl" data-offline><dt>${esc(t(T.zones))}</dt><dd>…</dd><dt>${esc(t(T.storage))}</dt><dd>…</dd></dl>
      <div data-zones></div>${!L?.data && !gh ? `<p class="f-warn">${esc(t(T.noBases))}</p>` : ''}<p class="f-muted">${esc(t(T.zoneHint))}</p></div>`);
    // clés, si un lanceur sert la page
    if (L) cards.push(`<div class="f-card" data-card="keys"><h2>${esc(t(T.keys))}</h2><p class="f-muted">${esc(t(T.keysHint))}</p>
      <p>${esc(t(T.pair, { k: t(T.ivaoKey) }))} <b data-key>…</b></p>${fld('ivaoKey', T.keyNew, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="keySave">${esc(t(T.save))}</button><button type="button" data-act="keyTest">${esc(t(T.test))}</button><button type="button" data-act="keyErase">${esc(t(T.erase))}</button></div></div>`);
    const help = await c.helpPanel?.().catch(() => null);
    view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted">${esc(t(T.intro))}</p>${cards.join('')}
      <details class="f-card"><summary>${esc(t(T.diag))}</summary><pre data-diag></pre><div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button></div></details>`;
    if (help) view.querySelector('h1 + p')?.after(help);

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
      dl.innerHTML = `<dt>${esc(t(T.zones))}</dt><dd>${esc(zones)}</dd><dt>${esc(t(T.storage))}</dt><dd>${esc(est ? t(T.storageState, { u: bytes(est.usage, t), q: bytes(est.quota, t) }) : t(T.unknown))}</dd>`;
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
      if (act === 'import' || act === 'replace') {
        const f = view.querySelector('[data-file]');
        f.dataset.mode = act === 'replace' ? 'replace' : 'merge';
        return f.click();
      }
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
        await c.cutAccess();
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
      if (act === 'remoteCheck' || act === 'remoteSave') {
        const url = val('remote', card('access')),
          save = act === 'remoteSave';
        say('access', t(save ? T.remoteSaving : T.remoteChecking), 'warn');
        const r = await setup('sync-remote', {
          url,
          ...(save ? {
            save: true
          } : {})
        });
        const ck = r?.check || {},
          text = [r?.saved?.message, ck.message].filter(Boolean).join(' — ') || '?';
        say('access', text, r?.saved && !r.saved.ok ? 'err' : ck.ok ? 'ok' : 'warn');
        // enregistré : la ligne « Actuel » suit, le compte rendu de la vérification reste affiché
        if (save && r?.saved?.ok) {
          const now = card('access').querySelector('h3 + p');
          if (now) now.textContent = t(T.remoteNowBare, {
            u: url
          });
          c.notify(t(T.saved), 'ok');
        }
        return;
      }
      if (act === 'gitClone' || act === 'gitAdopt') {
        const r0 = card('access'),
          body = {
            url: val('gitUrl', r0),
            user: val('gitUser', r0),
            secret: r0.querySelector('[data-f="gitSecret"]')?.value || '',
            remember: !!r0.querySelector('[data-f="gitRemember"]')?.checked
          };
        // le secret n'est gardé nulle part dans la page : champ vidé avant l'appel
        const sec = r0.querySelector('[data-f="gitSecret"]');
        if (sec) sec.value = '';
        r0.querySelectorAll('button').forEach(x => x.disabled = true);
        say('access', t(T.gitWorking), 'warn');
        const r = await setup(act === 'gitClone' ? 'clone' : 'adopt', body);
        r0.querySelectorAll('button').forEach(x => x.disabled = false);
        say('access', r?.message || t(T.launcherOld), r?.ok ? 'ok' : 'err');
        if (r?.ok) {
          await c.redetect?.();
          c.notify(r.message || t(T.saved), 'ok');
          return again();
        }
        return;
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
    view.querySelector('[data-file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await importDevice(c, f, e.target.dataset.mode);
      again();
    });
  }

  /** Porte de la carte Accès quand data/ n'est pas un dépôt git (lanceur) : absent → récupérer les données (clone) ;
   *  plain → reprendre data/ dans un dépôt (adopt) ; identifiant et secret facultatifs, jamais gardés par la page. */
  function gitDoor(state, t, fld, remote) {
    return `<p class="f-warn">${esc(t(state === 'absent' ? T.stateAbsent : T.statePlain))}</p><p class="f-muted">${esc(t(T.gitWhy))}</p>
      ${fld('gitUrl', T.remoteUrl, remote?.default || '')}${fld('gitUser', T.gitUser, '')}${fld('gitSecret', T.gitSecret, '', { type: 'password' })}
      <label class="f-check"><input type="checkbox" data-f="gitRemember">${esc(t(T.gitRemember))}</label><p class="f-muted">${esc(t(T.gitCredHint))}</p><p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="${state === 'absent' ? 'gitClone' : 'gitAdopt'}">${esc(t(state === 'absent' ? T.clone : T.adopt))}</button></div>
      <p><a href="#help?a=${encodeURIComponent(t(T.noGitAnchor))}">${esc(t(T.helpLink))}</a></p>`;
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
