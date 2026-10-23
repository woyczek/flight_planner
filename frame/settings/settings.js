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
  //     du cadre, clé dans localStorage githubData:avwx, jamais réaffichée) ; Clés, si un lanceur sert la page ; diagnostic ;
  //   · reprise des réglages V2 de la même origine en un geste (identité, accès GitHub), proposée une fois ;
  //   · Administration (niveau Complet seulement) : liens déclarés dans frame/settings/admin_links.js (SogAdminLinks) —
  //     pages de l'appli, bancs (actifs sur un poste avec lanceur), pages V2 du poste (avec un lanceur seulement) ;
  //   · configuration d'un pilote (frame/settings/config.js, SogConfig) : « Exporter une configuration pour un pilote… »
  //     dans la carte Accès d'un poste (fichier sog-config-<TRI>.json et lien #settings?config=…) ; « Importer une
  //     configuration… » (fichier), le lien, ou #settings?import=1 (carte d'accueil) : carte « Configuration reçue » en
  //     tête, « Appliquer » écrit identité, usages et accès (testé avant), puis synchronise et propose Données hors ligne.
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
    // configuration d'un pilote (frame/settings/config.js)
    joinResume: ['Un assistant est en cours (pas {n} sur {m}) : reprenez-le là où vous en étiez.',
      'An assistant is in progress (step {n} of {m}): resume it where you left it.',
      'Ein Assistent läuft (Schritt {n} von {m}): Setzen Sie ihn dort fort, wo Sie waren.',
      'Hay un asistente en curso (paso {n} de {m}): retómelo donde lo dejó.'
    ],
    joinGo: ['Reprendre', 'Resume', 'Fortsetzen', 'Retomar'],
    cfgJoin: ['Rejoindre la compagnie…', 'Join the airline…', 'Der Fluggesellschaft beitreten…', 'Unirse a la aerolínea…'],
    cfgImport: ['Importer une configuration…', 'Import a configuration…', 'Konfiguration importieren…', 'Importar una configuración…'],
    cfgImportHint: [
      'Votre compagnie vous a envoyé une configuration (fichier sog-config ou lien) ? Elle règle cet appareil en quelques gestes.',
      'Did your airline send you a configuration (sog-config file or link)? It sets up this device in a few steps.',
      'Hat Ihnen Ihre Fluggesellschaft eine Konfiguration geschickt (sog-config-Datei oder Link)? Sie richtet dieses Gerät in wenigen Schritten ein.',
      '¿Su aerolínea le envió una configuración (archivo sog-config o enlace)? Configura este dispositivo en pocos pasos.'
    ],
    cfgExport: ['Exporter une configuration pour un pilote…', 'Export a configuration for a pilot…',
      'Konfiguration für einen Piloten exportieren…',
      'Exportar una configuración para un piloto…'
    ],
    cfgExportHint: [
      'Un fichier et un lien pour un pilote : la compagnie, le dépôt des données, son trigramme et le mode d’emploi du jeton. Jamais de jeton ni de secret.',
      'A file and a link for a pilot: the airline, the data repository, their trigram and how to create the token. Never a token or a secret.',
      'Eine Datei und ein Link für einen Piloten: die Fluggesellschaft, das Datenrepository, sein Kürzel und die Anleitung für das Token. Nie ein Token oder Geheimnis.',
      'Un archivo y un enlace para un piloto: la aerolínea, el repositorio de datos, su trigrama y cómo crear el token. Nunca un token ni un secreto.'
    ],
    // gestes de l'administrateur, dans l'ordre
    cfgSteps: ['Vos gestes', 'Your steps', 'Ihre Schritte', 'Sus pasos'],
    cfgInvite: ['Invitez le nom {h} du pilote sur le dépôt avec le droit Write : {u}',
      'Invite the pilot’s {h} name to the repository with the Write role: {u}',
      'Laden Sie den {h}-Namen des Piloten mit der Rolle Write in das Repository ein: {u}',
      'Invite el nombre de {h} del piloto al repositorio con el rol Write: {u}'
    ],
    cfgInviteGl: ['Ajoutez le nom {h} du pilote au projet avec le rôle Developer : {u}',
      'Add the pilot’s {h} name to the project with the Developer role: {u}',
      'Fügen Sie den {h}-Namen des Piloten dem Projekt mit der Rolle Developer hinzu: {u}',
      'Añada el nombre de {h} del piloto al proyecto con el rol Developer: {u}'
    ],
    cfgInviteOther: ['Donnez au pilote un accès en écriture au dépôt.', 'Give the pilot write access to the repository.',
      'Geben Sie dem Piloten Schreibzugriff auf das Repository.', 'Dé al piloto acceso de escritura al repositorio.'
    ],
    cfgStepExport: ['Exportez sa configuration : son trigramme, l’adresse de l’appli, « Créer le fichier et le lien ».',
      'Export their configuration: their trigram, the app’s address, “Create the file and the link”.',
      'Exportieren Sie seine Konfiguration: sein Kürzel, die Adresse der App, „Datei und Link erstellen“.',
      'Exporte su configuración: su trigrama, la dirección de la aplicación, «Crear el archivo y el enlace».'
    ],
    cfgStepSend: [
      'Envoyez-lui le lien ou le fichier, ou montrez-lui le code QR : il le scanne avec l’appareil photo de son téléphone, et l’assistant « Rejoindre la compagnie » le guide.',
      'Send them the link or the file, or show them the QR code: they scan it with their phone’s camera, and the “Join the airline” assistant guides them.',
      'Senden Sie ihm den Link oder die Datei, oder zeigen Sie ihm den QR-Code: Er scannt ihn mit der Kamera seines Telefons, und der Assistent „Der Fluggesellschaft beitreten“ führt ihn.',
      'Envíele el enlace o el archivo, o muéstrele el código QR: lo escanea con la cámara de su teléfono, y el asistente «Unirse a la aerolínea» le guía.'
    ],
    cfgQr: ['À scanner avec le téléphone du pilote', 'To scan with the pilot’s phone', 'Mit dem Telefon des Piloten scannen',
      'Para escanear con el teléfono del piloto'
    ],
    cfgPilot: ['Trigramme du pilote', 'Pilot’s trigram', 'Kürzel des Piloten', 'Trigrama del piloto'],
    cfgApp: ['Adresse de l’appli publiée (pour le lien)', 'Address of the published app (for the link)',
      'Adresse der veröffentlichten App (für den Link)',
      'Dirección de la aplicación publicada (para el enlace)'
    ],
    cfgMake: ['Créer le fichier et le lien', 'Create the file and the link', 'Datei und Link erstellen',
      'Crear el archivo y el enlace'
    ],
    cfgLink: ['Lien d’import (un toucher sur le téléphone du pilote)', 'Import link (one tap on the pilot’s phone)',
      'Import-Link (ein Tippen auf dem Telefon des Piloten)', 'Enlace de importación (un toque en el teléfono del piloto)'
    ],
    cfgCopy: ['Copier le lien', 'Copy the link', 'Link kopieren', 'Copiar el enlace'],
    cfgCopied: ['Lien copié.', 'Link copied.', 'Link kopiert.', 'Enlace copiado.'],
    // presse-papiers indisponible (appareil appairé en http) : le texte est montré sélectionné
    copyShown: ['Copie impossible ici : le texte est sélectionné, copiez-le vous-même.',
      'Cannot copy here: the text is selected, copy it yourself.',
      'Kopieren hier nicht möglich: Der Text ist markiert, kopieren Sie ihn selbst.',
      'No se puede copiar aquí: el texto está seleccionado, cópielo usted mismo.'
    ],
    cfgMade: ['{f} enregistré : envoyez-le au pilote, ou le lien ci-dessous.', '{f} saved: send it to the pilot, or the link below.',
      '{f} gespeichert: Senden Sie sie dem Piloten, oder den Link unten.', '{f} guardado: envíelo al piloto, o el enlace de abajo.'
    ],
    cfgLocal: ['Cette adresse ne s’ouvre que sur ce poste : donnez celle de l’appli publiée pour un téléphone.',
      'This address only opens on this workstation: give the published app’s address for a phone.',
      'Diese Adresse öffnet sich nur auf diesem Rechner: Geben Sie für ein Telefon die Adresse der veröffentlichten App an.',
      'Esta dirección solo se abre en este puesto: indique la de la aplicación publicada para un teléfono.'
    ],
    cfgNoRepo: ['Aucun dépôt des données à transmettre : le fichier ne réglera que la compagnie et l’identité.',
      'No data repository to pass on: the file will only set the airline and the identity.',
      'Kein Datenrepository weiterzugeben: Die Datei richtet nur die Fluggesellschaft und die Identität ein.',
      'Ningún repositorio de datos que transmitir: el archivo solo configurará la aerolínea y la identidad.'
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
    confirmHint: ['Une fenêtre Oui / Non s’ouvrira sur ce poste (pas dans cette page) : répondez-lui avant de revenir ici.',
      'A Yes / No window will open on this workstation (not in this page): answer it before coming back here.',
      'Ein Ja-/Nein-Fenster öffnet sich auf diesem Rechner (nicht auf dieser Seite): Beantworten Sie es, bevor Sie hierher zurückkehren.',
      'Se abrirá una ventana Sí / No en este puesto (no en esta página): respóndala antes de volver aquí.'
    ],
    confirmWait: ['Répondez à la fenêtre Oui / Non ouverte sur ce poste (elle peut être derrière les autres fenêtres)…',
      'Answer the Yes / No window open on this workstation (it may be behind other windows)…',
      'Beantworten Sie das auf diesem Rechner geöffnete Ja-/Nein-Fenster (es kann hinter anderen Fenstern liegen)…',
      'Responda a la ventana Sí / No abierta en este puesto (puede estar detrás de otras ventanas)…'
    ],
    confirmOpen: ['Cherchez-la derrière les autres fenêtres (barre des tâches), répondez, puis réessayez.',
      'Look for it behind the other windows (taskbar), answer it, then try again.',
      'Suchen Sie es hinter den anderen Fenstern (Taskleiste), beantworten Sie es, dann erneut versuchen.',
      'Búsquela detrás de las otras ventanas (barra de tareas), respóndala y vuelva a intentarlo.'
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
      'Jeton personnel GitHub : « classique » avec la case « repo » pour le dépôt d’un utilisateur, à grain fin (ce seul dépôt, « Contents » en lecture et écriture) pour celui d’une organisation ; un an au plus. Gardé sur cet appareil seulement, jamais réaffiché ; ne le collez dans aucun message.',
      'GitHub personal token: “classic” with the “repo” box for a user’s repository, fine-grained (this repository only, “Contents” read and write) for an organisation’s; one year at most. Kept on this device only, never shown again; never paste it in a message.',
      'Persönliches GitHub-Token: „klassisch“ mit dem Kästchen „repo“ für das Repository eines Benutzers, feingranular (nur dieses Repository, „Contents“ lesen und schreiben) für das einer Organisation; höchstens ein Jahr. Nur auf diesem Gerät gespeichert, nie wieder angezeigt; in keine Nachricht einfügen.',
      'Token personal de GitHub: «clásico» con la casilla «repo» para el repositorio de un usuario, de grano fino (solo este repositorio, «Contents» lectura y escritura) para el de una organización; un año como máximo. Guardado solo en este dispositivo, nunca se vuelve a mostrar; no lo pegue en ningún mensaje.'
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
    // écritures en attente (FD.status().queue) : chemin, module, heure, ✕ pour une suppression
    queue: ['Écritures en attente', 'Pending writes', 'Ausstehende Änderungen', 'Escrituras pendientes'],
    queueDel: ['suppression', 'deletion', 'Löschung', 'eliminación'],
    queueMore: ['… et {n} de plus', '… and {n} more', '… und {n} weitere', '… y {n} más'],
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
    // clé météo de l'appareil (TAF par avwx.rest sans lanceur ; frame lot 12 : weatherKey du contexte)
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
    keysHint: ['Gardées par le lanceur de ce poste (dossier secrets/), jamais par le navigateur ni dans les données.',
      'Kept by this workstation’s launcher (secrets/ folder), never by the browser nor in the data.',
      'Vom Starter dieses Rechners verwahrt (Ordner secrets/), nie im Browser oder in den Daten.',
      'Guardadas por el lanzador de este puesto (carpeta secrets/), nunca por el navegador ni en los datos.'
    ],
    ivaoKey: ['Clé de l’API IVAO', 'IVAO API key', 'IVAO-API-Schlüssel', 'Clave de la API IVAO'],
    // accès des appareils du réseau local (carte écrite par la session du cadre, lot 18)
    lan: ['Accès du poste', 'Computer access', 'Zugang des Rechners', 'Acceso del equipo'],
    lanHint: [
      'Ouvrez l’appli Pilote sur une tablette ou un téléphone du même réseau local : il voit les données de ce poste et la position du simulateur. L’accès se ferme avec le lanceur.',
      'Open the Pilot application on a tablet or a phone of the same local network: it sees this computer’s data and the simulator’s position. Access closes with the launcher.',
      'Öffnen Sie die Pilot-App auf einem Tablet oder Telefon im selben lokalen Netz: Es sieht die Daten dieses Rechners und die Position des Simulators. Der Zugang schließt sich mit dem Starter.',
      'Abra la aplicación Piloto en una tableta o un teléfono de la misma red local: ve los datos de este equipo y la posición del simulador. El acceso se cierra con el lanzador.'
    ],
    lanWarn: [
      'Réseau local en http, sans chiffrement : à n’ouvrir que sur un réseau de confiance (à la maison), jamais sur un wifi public ou d’hôtel.',
      'Local network over http, unencrypted: open it only on a trusted network (at home), never on public or hotel wifi.',
      'Lokales Netz über http, unverschlüsselt: nur in einem vertrauenswürdigen Netz (zu Hause) öffnen, nie in einem öffentlichen oder Hotel-WLAN.',
      'Red local en http, sin cifrado: ábrala solo en una red de confianza (en casa), nunca en una wifi pública o de hotel.'
    ],
    lanOpen: ['Ouvrir aux appareils du réseau local', 'Open to devices of the local network', 'Für Geräte im lokalen Netz öffnen',
      'Abrir a los dispositivos de la red local'
    ],
    lanClose: ['Fermer l’accès', 'Close access', 'Zugang schließen', 'Cerrar el acceso'],
    lanForget: ['Oublier les appareils', 'Forget the devices', 'Geräte vergessen', 'Olvidar los dispositivos'],
    lanForgetAsk: ['Oublier tous les appareils appairés ? Chacun devra saisir un nouveau code.',
      'Forget all paired devices? Each will have to enter a new code.',
      'Alle gekoppelten Geräte vergessen? Jedes muss einen neuen Code eingeben.',
      '¿Olvidar todos los dispositivos vinculados? Cada uno tendrá que introducir un código nuevo.'
    ],
    lanForgotten: ['Appareils oubliés.', 'Devices forgotten.', 'Geräte vergessen.', 'Dispositivos olvidados.'],
    lanState: ['État', 'State', 'Zustand', 'Estado'],
    lanOn: ['ouvert jusqu’à la fermeture du lanceur', 'open until the launcher closes', 'geöffnet bis zum Schließen des Starters',
      'abierto hasta que se cierre el lanzador'
    ],
    lanOff: ['fermé : seul ce poste ouvre l’appli', 'closed: only this computer opens the application',
      'geschlossen: nur dieser Rechner öffnet die App', 'cerrado: solo este equipo abre la aplicación'
    ],
    lanUrl: ['Adresse à ouvrir sur l’appareil', 'Address to open on the device', 'Auf dem Gerät zu öffnende Adresse',
      'Dirección que abrir en el dispositivo'
    ],
    lanOther: ['Autres adresses de ce poste', 'Other addresses of this computer', 'Weitere Adressen dieses Rechners',
      'Otras direcciones de este equipo'
    ],
    lanQr: ['À scanner avec l’appareil photo de la tablette ou du téléphone', 'To scan with the tablet’s or the phone’s camera',
      'Mit der Kamera des Tablets oder Telefons scannen', 'Para escanear con la cámara de la tableta o del teléfono'
    ],
    lanCode: ['Code d’appairage', 'Pairing code', 'Kopplungscode', 'Código de vinculación'],
    lanCodeHint: [
      'Un code sert une seule fois et dure 10 minutes. 5 essais par minute et par appareil ; après 30 codes faux en une heure, l’appairage se ferme jusqu’au prochain « Nouveau code ».',
      'A code works only once and lasts 10 minutes. 5 tries a minute per device; after 30 wrong codes in an hour, pairing closes until the next “New code”.',
      'Ein Code gilt nur einmal und 10 Minuten. 5 Versuche pro Minute und Gerät; nach 30 falschen Codes in einer Stunde schließt sich die Kopplung bis zum nächsten „Neuer Code“.',
      'Un código sirve una sola vez y dura 10 minutos. 5 intentos por minuto y dispositivo; tras 30 códigos erróneos en una hora, la vinculación se cierra hasta el siguiente «Código nuevo».'
    ],
    lanCodeLeft: ['{c} — encore {m} min', '{c} — {m} min left', '{c} — noch {m} min', '{c} — quedan {m} min'],
    lanNoCode: ['aucun code en cours : « Nouveau code » pour appairer un appareil', 'no code in progress: “New code” to pair a device',
      'kein gültiger Code: „Neuer Code“, um ein Gerät zu koppeln',
      'ningún código en curso: «Código nuevo» para vincular un dispositivo'
    ],
    lanClosed: ['appairage fermé après trop de codes faux : « Nouveau code » le rouvre',
      'pairing closed after too many wrong codes: “New code” reopens it',
      'Kopplung nach zu vielen falschen Codes geschlossen: „Neuer Code“ öffnet sie wieder',
      'vinculación cerrada tras demasiados códigos erróneos: «Código nuevo» la vuelve a abrir'
    ],
    lanNewCode: ['Nouveau code', 'New code', 'Neuer Code', 'Código nuevo'],
    lanOtherClosed: ['Autres adresses de ce poste (VPN, machines virtuelles…), fermées : {u}',
      'Other addresses of this computer (VPN, virtual machines…), closed: {u}',
      'Weitere Adressen dieses Rechners (VPN, virtuelle Maschinen…), geschlossen: {u}',
      'Otras direcciones de este equipo (VPN, máquinas virtuales…), cerradas: {u}'
    ],
    lanOpenAll: ['Les ouvrir aussi', 'Open them too', 'Auch öffnen', 'Abrirlas también'],
    lanForgetOne: ['Oublier', 'Forget', 'Vergessen', 'Olvidar'],
    lanForgetOneAsk: ['Oublier l’appareil « {d} » ? Il devra saisir un nouveau code.',
      'Forget the device “{d}”? It will have to enter a new code.',
      'Das Gerät „{d}“ vergessen? Es muss einen neuen Code eingeben.',
      '¿Olvidar el dispositivo «{d}»? Tendrá que introducir un código nuevo.'
    ],
    lanDevices: ['Appareils appairés', 'Paired devices', 'Gekoppelte Geräte', 'Dispositivos vinculados'],
    lanOpened: ['Accès ouvert. Windows peut demander d’autoriser Python : acceptez pour les réseaux privés seulement.',
      'Access open. Windows may ask to allow Python: accept for private networks only.',
      'Zugang geöffnet. Windows fragt eventuell, ob Python erlaubt werden soll: nur für private Netzwerke zulassen.',
      'Acceso abierto. Windows puede pedir que autorice Python: acéptelo solo para redes privadas.'
    ],
    lanNone: ['Aucune adresse de réseau local sur ce poste (10.x, 172.16-31.x ou 192.168.x) : rien à ouvrir.',
      'No local-network address on this computer (10.x, 172.16-31.x or 192.168.x): nothing to open.',
      'Keine Adresse eines lokalen Netzes auf diesem Rechner (10.x, 172.16-31.x oder 192.168.x): nichts zu öffnen.',
      'Ninguna dirección de red local en este equipo (10.x, 172.16-31.x o 192.168.x): nada que abrir.'
    ],
    lanFail: ['Le lanceur ne répond pas : redémarrez-le à jour.', 'The launcher does not answer: restart it up to date.',
      'Der Starter antwortet nicht: aktualisiert neu starten.', 'El lanzador no responde: reinícielo actualizado.'
    ],
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
    about: ['À propos', 'About', 'Über', 'Acerca de'],
    aboutHelp: ['Aide : le manuel de l’appli', 'Help: the app’s manual', 'Hilfe: das Handbuch der App',
      'Ayuda: el manual de la aplicación'
    ],
    aboutRoadmap: ['Feuille de route : ce qui est livré, en cours, prévu', 'Roadmap: what is delivered, in progress, planned',
      'Fahrplan: was geliefert, in Arbeit, geplant ist', 'Hoja de ruta: lo entregado, en curso, previsto'
    ],
    diag: ['Diagnostic', 'Diagnostics', 'Diagnose', 'Diagnóstico'],
    // carte Administration (niveau Complet)
    admin: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
    adminHint: ['Les pages d’administration et d’essai, réunies ici.', 'The administration and test pages, gathered here.',
      'Die Verwaltungs- und Testseiten, hier gesammelt.', 'Las páginas de administración y de prueba, reunidas aquí.'
    ],
    launcherOnly: ['poste avec lanceur seulement', 'workstation with launcher only', 'nur Rechner mit Starter',
      'solo puesto con lanzador'
    ],
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
      treeAt: ['Arbre du dépôt : lu le', 'Repository tree: read at', 'Repository-Baum: gelesen am', 'Árbol del repositorio: leído el'],
      treeFiles: ['Arbre du dépôt : fichiers', 'Repository tree: files', 'Repository-Baum: Dateien', 'Árbol del repositorio: ficheros'],
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
      remote = remoteNow = L ? (Object.keys(dryCache).forEach(k => delete dryCache[k]), await setup('sync-remote')) :
      null, // dépôt distant de data/ (lanceur)
      // état de data/ : absent, plain (dossier sans git), repo ; champ state du lanceur, sinon déduit
      gitState = !L ? '' : remote?.state || (!L.data ? 'absent' : remote?.repo ? 'repo' : 'plain');
    const fld = (k, row, v, o = {}) => `<label class="f-field">${esc(t(row))}<input data-f="${k}" type="${o.type || 'text'}" value="${esc(v || '')}" autocomplete="off" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.cap ? 'autocapitalize="characters"' : 'autocapitalize="off"'} spellcheck="false"></label>`;
    const how = !exchange ? t(L?.data ? T.aloneLauncher : T.alone) : L?.data ? t(T.viaLauncher, {
      g: t(!L.dataGit ? T.viaLauncherNoGit : remote && !remote.url ? T.viaLauncherNoRemote : T.viaLauncherGit)
    }) : gh ? t(T.viaGithub, {
      r: gh.repo
    }) : t(T.viaNone);
    const cards = [];
    // configuration d'un pilote : le lien #settings?config=… ou un fichier lancent l'assistant « Rejoindre la compagnie »
    // (frame/settings/join.js), que #settings?join=1 affiche à la place des cartes
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
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
      cards.push(`<div class="f-card" data-card="design"><h2>${esc(t(T.design))}</h2><p class="f-muted">${esc(t(T.designHint))}</p>
        <div class="f-designs">${sets.map(d => `<button type="button" class="f-design" data-design-pick="${esc(d.id)}" aria-pressed="${cur.design === d.id}">
          <span class="f-design-thumb" data-design="${esc(d.id)}" data-tone="${night ? 'night' : 'day'}"><span class="f-design-bar"></span><span class="f-design-card">${esc(t(T.sample))}<span class="f-design-chip"></span></span></span>
          <span class="f-design-name">${esc(t(d.label))}${d.textured ? ` <span class="f-muted">· ${esc(t(T.textured))}</span>` : ''}</span></button>`).join('')}</div>
        <h3>${esc(t(T.tone))}</h3>${['auto', 'day', 'night'].map(k => `<label class="f-check"><input type="radio" name="sogTone" data-tone-pick="${k}" ${(cur.tone || 'auto') === k ? 'checked' : ''}>${esc(t(T.tones[k]))}</label>`).join('')}</div>`);
    }
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
        <div class="f-row"><button type="button" class="primary" data-act="remoteSave">${esc(t(T.save))}</button><button type="button" data-act="remoteCheck">${esc(t(T.remoteCheck))}</button></div><p class="f-muted" data-confirm-hint hidden>${esc(t(T.confirmHint))}</p>` : gitDoor(gitState, t, fld, remote)}</div>` :
      `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2>${exchange ? '' : `<p class="f-muted">${esc(t(T.accessRead))}</p>`}
        ${fld('repo', T.repo, gh?.repo, { ph: 'compte/flight_planner_data' })}${fld('branch', T.branch, gh?.branch || 'main')}${fld('token', T.token, '', { type: 'password', ph: gh ? t(T.tokenSet) : '' })}
        <p class="f-muted">${esc(t(T.tokenHint))}</p><p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="access">${esc(t(T.save))}</button><button type="button" data-act="test">${esc(t(T.test))}</button>${gh ? `<button type="button" data-act="cut">${esc(t(T.cut))}</button>` : ''}</div></div>`);
    // configuration d'un pilote, dans la carte Accès : importer (toujours, en tête), exporter (poste ou accès GitHub réglé)
    const src = L ? (remote?.url ? window.SogConfig?.parseRepo(remote.url) : null) : gh ? {
      host: gh.api ? new URL(gh.api).host : 'github.com',
      repo: gh.repo
    } : null;
    const xsrc = src ? {
      ...src,
      branch: L ? (/^[\w./-]+$/.test(remote?.branch || '') ? remote.branch : 'main') : gh.branch || 'main',
      ...(!L && gh?.api ? {
        api: gh.api
      } : {})
    } : null;
    const cfgIn = window.SogConfig ? `<p class="f-muted">${esc(t(T.cfgImportHint))}</p><div class="f-row"><button type="button" data-act="cfgJoin">${esc(t(T.cfgJoin))}</button><button type="button" data-act="cfgImport">${esc(t(T.cfgImport))}</button><input type="file" accept="application/json,.json" data-cfgfile hidden></div>` : '';
    const xk = xsrc ? SogConfig.kind(xsrc) : 'other',
      xhost = xk === 'github' && !xsrc?.api ? 'GitHub' : xsrc?.host || '',
      xinv = !xsrc ? '' : xk === 'github' ? `https://github.com/${xsrc.repo}/settings/access` : xk === 'gitlab' ? `${SogConfig.webUrl(xsrc)}/-/project_members` : '',
      xa = u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`,
      xfill = (row, v) => esc(t(row)).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
    const cfgSteps = `<h3>${esc(t(T.cfgSteps))}</h3><ol class="f-join-steps"><li>${xinv ? xfill(xk === 'github' ? T.cfgInvite : T.cfgInviteGl, { h: esc(xhost), u: xa(xinv) }) : esc(t(T.cfgInviteOther))}</li><li>${esc(t(T.cfgStepExport))}</li><li>${esc(t(T.cfgStepSend))}</li></ol>`;
    const cfgOut = window.SogConfig && (L || gh) ? `<details class="f-cfgx" data-cfgx><summary>${esc(t(T.cfgExport))}</summary><p class="f-muted">${esc(t(T.cfgExportHint))}</p>${cfgSteps}
      ${xsrc ? '' : `<p class="f-warn">${esc(t(T.cfgNoRepo))}</p>`}${fld('cfgPilot', T.cfgPilot, '', { cap: true, ph: 'ABC' })}${fld('cfgApp', T.cfgApp, appUrl(), { ph: 'https://…/v3/frame/' })}
      <div class="f-row"><button type="button" class="primary" data-act="cfgMake">${esc(t(T.cfgMake))}</button></div><p class="f-msg" data-xmsg></p>
      <div data-cfgout hidden><label class="f-field">${esc(t(T.cfgLink))}<textarea data-cfglink rows="3" readonly spellcheck="false"></textarea></label><div class="f-row"><button type="button" data-act="cfgCopy">${esc(t(T.cfgCopy))}</button></div><figure class="f-qr" data-cfgqr hidden><div></div><figcaption class="f-muted">${esc(t(T.cfgQr))}</figcaption></figure></div></details>` : '';
    const ai = cards.findIndex(x => x.startsWith('<div class="f-card" data-card="access">'));
    if (ai >= 0) cards[ai] = cards[ai].replace(/^(<div class="f-card" data-card="access"><h2>[^<]*<\/h2>)/, `$1${cfgIn}`).replace(
      /<\/div>$/, `${cfgOut}</div>`);
    // synchronisation : montrée si un échange est coché ou tant que des écritures attendent (suit l'état)
    {
      cards.push(`<div class="f-card" data-card="sync"${exchange || st.pending ? '' : ' hidden'}><h2>${esc(t(T.sync))}</h2><dl class="f-dl" data-sync></dl><div data-queue></div><p class="f-muted">${esc(t(T.syncHint))}</p>
        <div class="f-row"><button type="button" class="primary" data-act="sync">${esc(t(T.syncNow))}</button>${st.conflicts ? `<a href="#conflicts">${esc(t(T.conflicts, { n: st.conflicts }))}</a>` : ''}</div></div>`);
    }
    // données hors ligne
    cards.push(`<div class="f-card" data-card="offline"><h2>${esc(t(T.offlineData))}</h2><dl class="f-dl" data-offline><dt>${esc(t(T.zones))}</dt><dd>…</dd><dt>${esc(t(T.storage))}</dt><dd>…</dd></dl>
      <div data-zones></div>${!L?.data && !gh ? `<p class="f-warn">${esc(t(T.noBases))}</p>` : ''}<p class="f-muted">${esc(t(T.zoneHint))}</p></div>`);
    // clé météo de l'appareil, avec ou sans lanceur (le cadre la garde hors de device/ et de toute sauvegarde)
    const wk = c.weatherKey;
    if (wk) cards.push(`<div class="f-card" data-card="wx"><h2>${esc(t(T.wx))}</h2><p class="f-muted">${esc(t(T.wxHint))}</p>
      ${L ? `<p class="f-muted">${esc(t(T.wxLauncher))}</p>` : ''}<p><b>${esc(t(wk.has() ? T.wxSet : T.wxNone))}</b></p>
      ${fld('wxKey', T.wxKey, '', { type: 'password', ph: wk.has() ? t(T.wxKeySet) : '' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="wxSave">${esc(t(T.save))}</button><button type="button" data-act="wxTest" ${wk.has() ? '' : 'disabled'}>${esc(t(T.test))}</button><button type="button" data-act="wxErase" ${wk.has() ? '' : 'disabled'}>${esc(t(T.erase))}</button></div>
      <p><a href="https://account.avwx.rest/" target="_blank" rel="noopener">${esc(t(T.wxSignup))}</a></p></div>`);
    // clés, si un lanceur sert la page
    if (L) cards.push(`<div class="f-card" data-card="keys"><h2>${esc(t(T.keys))}</h2><p class="f-muted">${esc(t(T.keysHint))}</p>
      <p>${esc(t(T.pair, { k: t(T.ivaoKey) }))} <b data-key>…</b></p>${fld('ivaoKey', T.keyNew, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="keySave">${esc(t(T.save))}</button><button type="button" data-act="keyTest">${esc(t(T.test))}</button><button type="button" data-act="keyErase">${esc(t(T.erase))}</button></div></div>`);
    // accès des appareils du réseau local : sur le poste qui sert la page seulement (c.lan() nul ailleurs, même sur un
    // appareil appairé) ; état dessiné et relu toutes les 5 s par paintLan
    const lanApi = c.lan?.() || null;
    if (lanApi) cards.push(`<div class="f-card" data-card="lan"><h2>${esc(t(T.lan))}</h2><p class="f-muted">${esc(t(T.lanHint))}</p>
      <div data-lanstate><p class="f-muted">…</p></div><p class="f-msg" data-kind="warn">${esc(t(T.lanWarn))}</p><p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="lanToggle">${esc(t(T.lanOpen))}</button><button type="button" data-act="lanCode" hidden>${esc(t(T.lanNewCode))}</button><button type="button" data-act="lanForget" disabled>${esc(t(T.lanForget))}</button></div></div>`);
    // fiches Little Navmap (.lnmperf), si un lanceur sert la page : carte écrite par aerodb (frame/aerodb/lnmperf.js)
    if (L && c.aerodb()?.lnmperf) cards.push('<div class="f-card" data-card="lnmperf" hidden></div>');
    const help = await c.helpPanel?.().catch(() => null);
    let diagJson = '{}'; // diagnostic complet (bouton « Copier »)
    view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-muted">${esc(t(T.intro))}</p>${cards.join('')}
      <div class="f-card" data-card="about"><h2>${esc(t(T.about))}</h2><p><a href="#help?m=settings">${esc(t(T.aboutHelp))}</a></p><p><a href="#roadmap">${esc(t(T.aboutRoadmap))}</a></p>
      <details data-diagbox><summary>${esc(t(T.diag))}</summary><dl class="f-dl" data-diag></dl><p class="f-muted">${esc(t(T.diagHint))}</p><div class="f-row"><button type="button" data-act="copy">${esc(t(T.copy))}</button></div></details></div>${lvl === 3 ? adminCard(t, L) : ''}`;
    if (help) view.querySelector('h1 + p')?.after(help);

    const card = k => view.querySelector(`[data-card="${k}"]`);
    if (card('lnmperf')) c.aerodb().lnmperf().then(x => x.card(card('lnmperf'), {
      t,
      notify: c.notify
    })).then(() => {
      const k = card('lnmperf');
      if (k?.firstChild) k.hidden = false;
    }).catch(() => {});
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
      const dg = c.diagnostic ? await c.diagnostic().catch(e => ({
        error: e?.message || String(e)
      })) : {};
      diagJson = JSON.stringify({
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
          quota: est.quota
        } : null,
        online: navigator.onLine,
        agent: navigator.userAgent
      }, null, 1);
      paintDiag(view.querySelector('[data-diag]'), dg, t);
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
    // accès du réseau local : état, adresse et son code QR, code d'appairage, appareils ; redessiné seulement s'il change
    let lanKey = '';
    const paintLan = s => {
      const k = card('lan');
      if (!k) return;
      // les minutes restantes du code, pas ses secondes : la carte n'est redessinée qu'au changement
      const min = s?.code ? Math.max(1, Math.ceil(s.expires / 60)) : 0,
        key = JSON.stringify(s && {
          ...s,
          expires: min
        });
      if (key === lanKey) return;
      lanKey = key;
      const btn = k.querySelector('[data-act="lanToggle"]'),
        nc = k.querySelector('[data-act="lanCode"]');
      btn.textContent = t(s?.on ? T.lanClose : T.lanOpen);
      btn.classList.toggle('primary', !s?.on);
      if (nc.hidden === !!s?.on) nc.hidden = !s?.on;
      nc.classList.toggle('primary', !!s?.on && !s.code);
      k.querySelector('[data-act="lanForget"]').disabled = !s?.devices;
      const box = k.querySelector('[data-lanstate]');
      if (!s) return void(box.innerHTML = `<p class="f-msg" data-kind="err">${esc(t(T.lanFail))}</p>`);
      const url = s.urls?.[0] || '',
        row = (label, v) => `<dt>${esc(t(label))}</dt><dd>${v}</dd>`,
        closedIps = (s.available || []).filter(ip => !(s.urls || []).some(u => u.includes(`//${ip}:`))),
        code = s.closed ? `<span class="f-msg" data-kind="err">${esc(t(T.lanClosed))}</span>` : s.code ? esc(t(T.lanCodeLeft, {
          c: s.code,
          m: min
        })).replace(esc(s.code), `<b class="f-num">${esc(s.code)}</b>`) : esc(t(T.lanNoCode)),
        devs = (s.paired || []).map(d => `<div class="f-row"><span>${esc(d.label)} — ${esc(d.at ? new Date(d.at).toLocaleDateString() : '?')}</span><button type="button" data-forget="${esc(d.id)}" data-label="${esc(d.label)}">${esc(t(T.lanForgetOne))}</button></div>`).join('');
      let qr = '';
      if (s.on && url && window.SogQR) try {
        qr = `<figure class="f-qr"><div>${SogQR.svg(url, { ecl: 'M', scale: 4 })}</div><figcaption class="f-muted">${esc(t(T.lanQr))}</figcaption></figure>`;
      } catch {
        qr = ''; // adresse trop longue pour un code QR : elle reste écrite
      }
      box.innerHTML = `<dl class="f-dl">${row(T.lanState, esc(t(s.on ? T.lanOn : T.lanOff)))}${s.on ? row(T.lanUrl, `<b>${esc(url)}</b>`) +
        (s.urls.length > 1 ? row(T.lanOther, esc(s.urls.slice(1).join(', '))) : '') + row(T.lanCode, code) : ''}${row(T.lanDevices, esc(String(s.devices ?? 0)))}</dl>${devs}${qr}${s.on ? `<p class="f-muted">${esc(t(T.lanCodeHint))}</p>` : ''}${s.on && closedIps.length ? `<p class="f-muted">${esc(t(T.lanOtherClosed, { u: closedIps.join(', ') }))}</p><div class="f-row"><button type="button" data-act="lanAll">${esc(t(T.lanOpenAll))}</button></div>` : ''}`;
    };
    if (lanApi) {
      const el = card('lan'),
        tick = async () => {
          if (!el.isConnected) return; // écran quitté ou redessiné : la relève s'arrête
          paintLan(await lanApi.state().catch(() => null));
          setTimeout(tick, 5e3); // un nouveau code (trop d'essais faux) ou un appareil appairé apparaissent seuls
        };
      tick();
    }
    if (L) launcherKey().then(k => {
      const b = view.querySelector('[data-key]');
      if (b) b.textContent = !k?.set ? t(T.keyMissing) : t(k.env ? T.keyEnv : T.keySet, {
        h: k.hint || '••••'
      });
    });

    // actions
    view.onclick = async e => {
      const fg = e.target.closest('[data-forget]');
      if (fg && c.lan?.()) {
        // un appareil appairé oublié : il devra saisir un nouveau code
        if (!await c.ask(t(T.lanForgetOneAsk, {
            d: fg.dataset.label
          }))) return;
        fg.disabled = true;
        const s = await c.lan().forget(fg.dataset.forget).catch(() => null);
        lanKey = '';
        paintLan(s);
        if (s) c.notify(t(T.lanForgotten), 'ok');
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'lanToggle' || act === 'lanForget' || act === 'lanCode' || act === 'lanAll') {
        const api = c.lan?.();
        if (!api) return;
        if (act === 'lanForget' && !await c.ask(t(T.lanForgetAsk))) return;
        b.disabled = true;
        try {
          const before = await api.state(),
            s = act === 'lanForget' ? await api.forget() : act === 'lanCode' ? await api.newCode() : act === 'lanAll' ? await api
            .openAll() :
            before.on ? await api.close() : await api.open();
          say('lan', !before.on && act === 'lanToggle' && !s.on ? t(T.lanNone) : '', 'warn');
          b.disabled = false; // avant le dessin : paintLan décide ensuite de « Oublier » (aucun appareil → grisé)
          lanKey = '';
          paintLan(s);
          if (act === 'lanForget') c.notify(t(T.lanForgotten), 'ok');
          else if (s.on && !before.on) c.notify(t(T.lanOpened), 'info');
        } catch {
          b.disabled = false;
          say('lan', t(T.lanFail));
        }
        return;
      }
      if (act === 'diagOpen') {
        e.preventDefault(); // lien de la carte Administration : le diagnostic replié de la carte À propos, ouvert
        const d = view.querySelector('[data-diagbox]');
        if (d) d.open = true;
        return d?.scrollIntoView({
          block: 'start'
        });
      }
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
        say('access', t(!save ? T.remoteChecking : needsConfirm(url, 'remote') ? T.confirmWait : T.remoteSaving), 'warn');
        const r = await setup('sync-remote', {
          url,
          ...(save ? {
            save: true
          } : {})
        });
        const ck = r?.check || {},
          text = [r?.saved?.message, confirmOpen(r?.saved) ? t(T.confirmOpen) : '', ck.message].filter(Boolean).join(' — ') || '?';
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
            remember: !!r0.querySelector('[data-f="gitRemember"]')?.checked,
            // auteur du commit de reprise (« Reprise du poste <TRI> ») : le trigramme de l'appareil s'il est réglé
            ...(c.identity().trigram ? {
              author: c.identity().trigram
            } : {})
          };
        // le secret n'est gardé nulle part dans la page : champ vidé avant l'appel
        const sec = r0.querySelector('[data-f="gitSecret"]');
        if (sec) sec.value = '';
        r0.querySelectorAll('button').forEach(x => x.disabled = true);
        say('access', t(act === 'gitAdopt' && needsConfirm(body.url, 'adopt') ? T.confirmWait : T.gitWorking), 'warn');
        const r = await setup(act === 'gitClone' ? 'clone' : 'adopt', body);
        r0.querySelectorAll('button').forEach(x => x.disabled = false);
        say('access', [r?.message || t(T.launcherOld), confirmOpen(r) ? t(T.confirmOpen) : ''].filter(Boolean).join(' '), r?.ok ?
          'ok' : 'err');
        if (r?.ok) {
          await c.redetect?.();
          c.notify(r.message || t(T.saved), 'ok');
          // carte redessinée depuis le nouvel état, le compte rendu du lanceur y reste lisible
          await again();
          return say('access', r.message || t(T.saved), 'ok');
        }
        return;
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
      if (act === 'keyTest') {
        const r = await setup('secrets/test?service=ivao');
        return say('keys', r?.ok ? t(T.keyOk) : t(T.keyBad, {
          e: r?.error || '?'
        }), r?.ok ? 'ok' : 'err');
      }
      if (act === 'copy') {
        const how = await copy(diagJson, {
          near: b.closest('.f-row')
        });
        c.notify(t(how === 'shown' ? T.copyShown : T.copied), how === 'shown' ? 'warn' : 'ok');
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
      if (act === 'cfgMake') return makeConfig(c, view, xsrc);
      if (act === 'cfgCopy') {
        const box = view.querySelector('[data-cfglink]'),
          how = await copy(box?.value || '', {
            box
          });
        return c.notify(t(how === 'shown' ? T.copyShown : T.cfgCopied), how === 'shown' ? 'warn' : 'ok');
      }
    };
    view.querySelector('[data-cfgfile]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await joinFromFile(c, f, view);
    });
    // #settings?offline=1 (fin de l'assistant) : la carte Données hors ligne à portée
    if (q.get('offline')) {
      dropConfigHash();
      setTimeout(() => card('offline')?.scrollIntoView({
        block: 'start'
      }), 0);
    }
    // #settings?import=1    // #settings?import=1 (carte d'accueil) : le bouton d'import à portée
    if (q.get('import')) {
      dropConfigHash(); // une fois : le dessin suivant (après le choix du fichier) reste en tête
      const b = view.querySelector('[data-act="cfgImport"]');
      setTimeout(() => {
        b?.scrollIntoView({
          block: 'center'
        });
        b?.focus();
      }, 0);
    }
    // indication « fenêtre Oui / Non sur ce poste » sous le bouton, selon l'adresse saisie
    // (le lanceur répond à POST /__setup/adopt { url, dry: true } sans rien faire : needsConfirm ; sans réponse, comparaison
    // locale ; adresse vide ou invalide : rien d'annoncé)
    let hintTimer = 0;
    const hint = () => {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(async () => {
        const h = view.querySelector('[data-confirm-hint]'),
          f = view.querySelector('[data-f="remote"], [data-f="gitUrl"]');
        if (!h || !f) return;
        const url = f.value.trim();
        if (url && !(url in dryCache)) {
          const r = await setup('adopt', {
            url,
            dry: true
          });
          dryCache[url] = typeof r?.needsConfirm === 'boolean' ? r.needsConfirm : r && !r.ok ? 'invalid' : null;
        }
        h.hidden = !url || dryCache[url] === 'invalid' || !needsConfirm(url, f.dataset.f === 'remote' ? 'remote' : 'adopt');
      }, 250);
    };
    view.querySelector('[data-f="remote"], [data-f="gitUrl"]')?.addEventListener('input', hint);
    hint();
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
    view.querySelector('[data-file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await importDevice(c, f, e.target.dataset.mode);
      again();
    });
  }

  /** Carte Administration (niveau Complet) : un lien et une phrase par entrée de SogAdminLinks ; bancs actifs seulement
   *  sur un poste avec lanceur (sinon nommés, sans lien), pages V2 montrées seulement avec un lanceur. */
  function adminCard(t, L) {
    const links = window.SogAdminLinks || [];
    if (!links.length) return '';
    const row = x => {
      const label = esc(t(x.title)),
        out = x.href && !x.href.startsWith('#');
      const link = x.act ? `<a href="#settings" data-act="${esc(x.act)}">${label}</a>` : x.where === 'bench' && !L ? `<b>${label}</b>` :
        `<a href="${esc(out ? new URL(x.href, ROOT).href : x.href)}"${out ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      return `<li data-admin="${esc(x.id)}">${link}<br><span class="f-muted">${esc(t(x.text))}${x.where === 'bench' ? ` — ${esc(t(T.launcherOnly))}` : ''}</span></li>`;
    };
    return `<div class="f-card" data-card="admin"><h2>${esc(t(T.admin))}</h2><p class="f-muted">${esc(t(T.adminHint))}</p>
      <ul class="f-admin">${links.filter(x => x.where !== 'v2' || L).map(row).join('')}</ul></div>`;
  }

  /** Copie vers le presse-papiers, aussi hors contexte sûr (appareil appairé en http) : frame/lib/clipboard.js (module,
   *  chargé à la demande) — 'clipboard', 'exec' ou 'shown' (texte montré sélectionné dans box, ou après near). */
  async function copy(text, o = {}) {
    try {
      return await (await import(new URL('frame/lib/clipboard.js', ROOT).href)).copyText(text, o);
    } catch {
      return 'shown';
    }
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
  const AIRLINE = 'airline/settings.json';
  let airlineA = null;
  /** Document de la compagnie (airline/settings.json du dépôt des données) : lecture, et écriture par l'import. */
  const airlineDoc = FD => airlineA ||= FD.adapter({
    id: 'frame-settings-airline',
    reads: ['airline/'],
    writes: [AIRLINE]
  });
  /** Message d'une configuration refusée (validate). */
  const cfgError = (r, t) => r.error === 'schema' ? t(T.cfgBadSchema, {
    s: r.schema
  }) : r.error === 'field' ? t(T.cfgBadField, {
    f: r.field
  }) : t(T.cfgBadFile);
  /** Retire config= / import= de l'adresse (la configuration n'est plus proposée au dessin suivant). */
  const dropConfigHash = () => {
    if (/[?&](config|import|offline)=/.test(location.hash)) history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  };
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  /** Adresse de l'appli pour le lien : celle-ci si elle est publiée (https, pas locale), sinon la dernière donnée ici. */
  function appUrl() {
    if (location.protocol === 'https:' && !LOCAL.test(location.hostname)) return `${location.origin}${location.pathname}`;
    try {
      return localStorage.getItem('sogFrame:appUrl') || '';
    } catch {
      return '';
    }
  }
  /** Mode d'emploi reçu → HTML en texte seul : une ligne par paragraphe, adresses https en liens. */
  const howtoHtml = text => String(text).split(/\n+/).filter(Boolean).map(l => `<p>${esc(l).replace(/https:\/\/(?:[^\s<&]|&#38;)+[^\s<&.,;:)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`).join('');
  /** « Créer le fichier et le lien » : sog-config-<TRI>.json téléchargé, lien #settings?config=… affiché à copier. */
  async function makeConfig(c, view, src) {
    const t = c.t,
      box = view.querySelector('[data-cfgx]'),
      msg = (text, kind = 'err') => {
        const m = box.querySelector('[data-xmsg]');
        m.textContent = text;
        m.dataset.kind = kind;
      };
    const tri = box.querySelector('[data-f="cfgPilot"]').value.trim().toUpperCase(),
      app = box.querySelector('[data-f="cfgApp"]').value.trim();
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) return msg(t(T.badTrigram));
    let base = null;
    try {
      base = app ? new URL(app) : null;
    } catch {
      base = null;
    }
    if (base && !/^https?:$/.test(base.protocol)) base = null;
    if (src && SogConfig.kind(src) === 'github' && !src.ownerType) src = {
      ...src,
      ownerType: await SogConfig.ownerType(src) || undefined
    };
    const airline = await airlineDoc(c.FD).get(AIRLINE, {
      wait: true
    }).catch(() => null);
    const cfg = SogConfig.build({
      airline,
      data: src,
      trigram: tri,
      by: c.identity().trigram || ''
    });
    const name = `sog-config-${tri}.json`,
      a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 1)], {
          type: 'application/json'
        })),
        download: name
      });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    const out = box.querySelector('[data-cfgout]');
    if (base) {
      base.hash = '';
      try {
        if (base.href !== `${location.origin}${location.pathname}`) localStorage.setItem('sogFrame:appUrl', base.href);
      } catch {
        /* stockage indisponible */
      }
      const short = {
          ...cfg
        },
        qr = out.querySelector('[data-cfgqr]');
      delete short.howto; // refait du modèle à l'import (SogConfig.validate)
      const link = `${base.href}#settings?config=${await SogConfig.pack(short)}`;
      out.querySelector('[data-cfglink]').value = link;
      out.hidden = false;
      if (qr && window.SogQR) {
        try {
          qr.querySelector('div').innerHTML = SogQR.svg(link, {
            ecl: 'M',
            scale: 3
          });
          qr.hidden = false;
        } catch {
          qr.hidden = true; // lien trop long pour un code QR : le lien et le fichier restent
        }
      }
    } else out.hidden = true;
    msg([t(T.cfgMade, {
        f: name
      }), base && LOCAL.test(base.hostname) ? t(T.cfgLocal) : ''].filter(Boolean).join(' '), base && LOCAL.test(base.hostname) ?
      'warn' : 'ok');
  }

  /** Adresse de dépôt comparable (sans .git ni barre finale, hôte en minuscules). */
  const sameRepo = (a, b) => {
    const n = u => String(u || '').trim().replace(/\/+$/, '').replace(/\.git$/, '').replace(/^(\w+:\/\/[^/]+)/, h => h.toLowerCase());
    return !!a && !!b && n(a) === n(b);
  };
  /** L'opération ouvrira-t-elle la fenêtre Oui / Non du lanceur ? Réponse du lanceur pour cette adresse (POST adopt dry,
   *  needsConfirm : autre dépôt que celui de la configuration), sinon comparaison locale ; enregistrement d'un dépôt
   *  distant : jamais pour l'adresse actuelle. */
  let remoteNow = null; // dernier GET /__setup/sync-remote (render)
  const dryCache = {}; // adresse → needsConfirm du lanceur (POST adopt dry), 'invalid', ou null sans réponse
  function needsConfirm(url, kind) {
    const r = remoteNow || {},
      dry = dryCache[String(url || '').trim()];
    // dépôt distant : l'adresse actuelle ne demande jamais la fenêtre ; sinon, comme une reprise (autre que la configuration)
    if (kind === 'remote' && sameRepo(url, r.url)) return false;
    if (typeof dry === 'boolean') return dry;
    return !sameRepo(url, r.default);
  }
  /** Refus du lanceur parce qu'une fenêtre est déjà ouverte (champ confirm, sinon le texte du message) ? */
  const confirmOpen = r => !!r && !r.ok && (r.confirm === 'open' || /déjà ouverte|already open/i.test(r.message || ''));
  /** Lignes lisibles du diagnostic du cadre (libellés traduits, valeurs brutes) ; absent : « — ». */
  function paintDiag(dl, d, t) {
    if (!dl) return;
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
  /** Porte de la carte Accès quand data/ n'est pas un dépôt git (lanceur) : absent → récupérer les données (clone) ;
   *  plain → reprendre data/ dans un dépôt (adopt) ; identifiant et secret facultatifs, jamais gardés par la page. */
  function gitDoor(state, t, fld, remote) {
    return `<p class="f-warn">${esc(t(state === 'absent' ? T.stateAbsent : T.statePlain))}</p><p class="f-muted">${esc(t(T.gitWhy))}</p>
      ${fld('gitUrl', T.remoteUrl, remote?.default || '')}${fld('gitUser', T.gitUser, '')}${fld('gitSecret', T.gitSecret, '', { type: 'password' })}
      <label class="f-check"><input type="checkbox" data-f="gitRemember">${esc(t(T.gitRemember))}</label><p class="f-muted">${esc(t(T.gitCredHint))}</p><p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="${state === 'absent' ? 'gitClone' : 'gitAdopt'}">${esc(t(state === 'absent' ? T.clone : T.adopt))}</button></div>${state === 'absent' ? '' : `<p class="f-muted" data-confirm-hint hidden>${esc(t(T.confirmHint))}</p>`}
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
