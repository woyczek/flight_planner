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
    cfgAirline: ['Compagnie', 'Airline', 'Fluggesellschaft', 'Aerolínea'],
    cfgRepo: ['Dépôt des données', 'Data repository', 'Datenrepository', 'Repositorio de datos'],
    cfgWhat: [
      '« Appliquer » règle l’identité, les usages (plusieurs appareils) et l’accès au dépôt, rien d’autre ; les identifiants réseau sont facultatifs.',
      '“Apply” sets the identity, the usages (several devices) and the repository access, nothing else; the network IDs are optional.',
      '„Anwenden“ richtet Identität, Nutzungen (mehrere Geräte) und den Repository-Zugang ein, sonst nichts; die Netzwerk-IDs sind optional.',
      '«Aplicar» configura la identidad, los usos (varios dispositivos) y el acceso al repositorio, nada más; los identificadores de red son opcionales.'
    ],
    cfgHowto: ['Créer le jeton : mode d’emploi', 'Creating the token: how to', 'Das Token erstellen: Anleitung',
      'Crear el token: instrucciones'
    ],
    cfgApply: ['Appliquer', 'Apply', 'Anwenden', 'Aplicar'],
    cfgCancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    cfgSame: ['Le dossier data/ de ce poste suit déjà ce dépôt : l’accès ne change pas.',
      'This workstation’s data/ folder already follows this repository: access does not change.',
      'Der Ordner data/ dieses Rechners folgt bereits diesem Repository: Der Zugang ändert sich nicht.',
      'La carpeta data/ de este puesto ya sigue este repositorio: el acceso no cambia.'
    ],
    cfgOther: ['Le dossier data/ de ce poste suit un autre dépôt ({u}) : l’accès n’est pas changé (voir la carte Accès).',
      'This workstation’s data/ folder follows another repository ({u}): access is not changed (see the Access card).',
      'Der Ordner data/ dieses Rechners folgt einem anderen Repository ({u}): Der Zugang wird nicht geändert (siehe Karte Zugang).',
      'La carpeta data/ de este puesto sigue otro repositorio ({u}): el acceso no se cambia (vea la tarjeta Acceso).'
    ],
    cfgClone: ['Le lanceur de ce poste va cloner ce dépôt dans data/ avec le jeton (il peut demander confirmation dans une fenêtre).',
      'This workstation’s launcher will clone this repository into data/ with the token (it may ask for confirmation in a window).',
      'Der Starter dieses Rechners klont dieses Repository mit dem Token nach data/ (er kann in einem Fenster um Bestätigung bitten).',
      'El lanzador de este puesto clonará este repositorio en data/ con el token (puede pedir confirmación en una ventana).'
    ],
    cfgNone: [
      'Ce dépôt est sur {h} : sans lanceur, l’appli ne joint qu’un dépôt GitHub. L’accès n’est pas réglé ici ; appliquez la configuration sur un poste avec le lanceur.',
      'This repository is on {h}: without a launcher, the app only reaches a GitHub repository. Access is not set here; apply the configuration on a workstation with the launcher.',
      'Dieses Repository liegt auf {h}: Ohne Starter erreicht die App nur ein GitHub-Repository. Der Zugang wird hier nicht eingerichtet; wenden Sie die Konfiguration auf einem Rechner mit Starter an.',
      'Este repositorio está en {h}: sin lanzador, la aplicación solo llega a un repositorio de GitHub. El acceso no se configura aquí; aplique la configuración en un puesto con el lanzador.'
    ],
    cfgNeedToken: ['Collez le jeton pour l’accès au dépôt (mode d’emploi ci-dessous).',
      'Paste the token for the repository access (how to, below).',
      'Fügen Sie das Token für den Repository-Zugang ein (Anleitung unten).',
      'Pegue el token para el acceso al repositorio (instrucciones abajo).'
    ],
    cfgTesting: ['Test de l’accès…', 'Testing the access…', 'Zugang wird getestet…', 'Probando el acceso…'],
    cfgTestFail: ['Accès refusé ({e}) : rien n’est changé. Vérifiez le jeton.',
      'Access refused ({e}): nothing is changed. Check the token.',
      'Zugang verweigert ({e}): Nichts wird geändert. Prüfen Sie das Token.',
      'Acceso denegado ({e}): no se cambia nada. Compruebe el token.'
    ],
    cfgNoTest: ['Sur un poste, le clonage par le lanceur sert de test : « Appliquer ».',
      'On a workstation, cloning through the launcher is the test: “Apply”.',
      'Auf einem Rechner ist das Klonen durch den Starter der Test: „Anwenden“.',
      'En un puesto, la clonación por el lanzador sirve de prueba: «Aplicar».'
    ],
    cfgReplace: ['Cet appareil a déjà un accès ({r}) : le remplacer par celui de la configuration ?',
      'This device already has an access ({r}): replace it with the configuration’s?',
      'Dieses Gerät hat bereits einen Zugang ({r}): durch den der Konfiguration ersetzen?',
      'Este dispositivo ya tiene un acceso ({r}): ¿reemplazarlo por el de la configuración?'
    ],
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
    cfgDone: ['Configuration appliquée', 'Configuration applied', 'Konfiguration angewendet', 'Configuración aplicada'],
    cfgSynced: ['Première synchronisation faite.', 'First synchronisation done.', 'Erste Synchronisation erledigt.',
      'Primera sincronización hecha.'
    ],
    cfgSyncErr: ['Première synchronisation pas encore faite ({e}) : elle reprendra seule.',
      'First synchronisation not done yet ({e}): it will resume by itself.',
      'Erste Synchronisation noch nicht erfolgt ({e}): Sie wird von selbst fortgesetzt.',
      'Primera sincronización aún no hecha ({e}): se reanudará sola.'
    ],
    cfgNoAccess: ['Identité réglée ; l’accès au dépôt reste à faire.', 'Identity set; the repository access is still to be done.',
      'Identität eingerichtet; der Repository-Zugang steht noch aus.', 'Identidad configurada; falta el acceso al repositorio.'
    ],
    cfgNext: ['Ensuite : gardez hors ligne la zone de vos vols, pour avoir la carte et les terrains même sans réseau.',
      'Next: keep the area of your flights offline, to have the map and the airfields even without network.',
      'Danach: Halten Sie das Gebiet Ihrer Flüge offline bereit, damit Karte und Flugplätze auch ohne Netz da sind.',
      'Después: guarde sin conexión la zona de sus vuelos, para tener el mapa y los aeródromos incluso sin red.'
    ],
    cfgGoOffline: ['Aller aux données hors ligne', 'Go to offline data', 'Zu den Offline-Daten', 'Ir a los datos sin conexión'],
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
    // configuration d'un pilote reçue : fichier choisi, ou lien #settings?config=… (relu à chaque dessin, jusqu'à
    // « Appliquer » ou « Annuler »)
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    let incoming = cfgPicked,
      inErr = '';
    if (!incoming && q.get('config') && window.SogConfig) {
      try {
        const r = SogConfig.validate(await SogConfig.unpack(q.get('config')));
        if (r.ok) incoming = r.cfg;
        else inErr = cfgError(r, t);
      } catch {
        inErr = t(T.cfgBadFile);
      }
    }
    // accès que la configuration réglerait sur cet appareil : same / other (data/ du lanceur déjà un dépôt), clone / adopt
    // (par le lanceur), github (transport de l'appareil), none (hôte sans transport sans lanceur), nodata
    const access = !incoming?.data ? 'nodata' : L ? (gitState === 'repo' ? (sameRepo(remote?.url, SogConfig.cloneUrl(incoming.data)) ?
        'same' : 'other') :
      gitState === 'absent' ? 'clone' : 'adopt') : SogConfig.kind(incoming.data) === 'github' ? 'github' : 'none';
    if (inErr) cards.push(`<div class="f-card" data-card="cfg"><h2>${esc(t(T.cfgTitle))}</h2><p class="f-msg" data-kind="err">${esc(inErr)}</p>
      <div class="f-row"><button type="button" data-act="cfgCancel">${esc(t(T.close))}</button></div></div>`);
    if (incoming) {
      const a = incoming.airline || {},
        d = incoming.data,
        how = d ? incoming.howto?.token?.[t(['fr', 'en', 'de', 'es'])] || incoming.howto?.token?.[
          ['fr', 'en', 'de', 'es'].find(l => incoming.howto?.token?.[l])
        ] || '' : '';
      const note = {
        same: t(T.cfgSame),
        other: t(T.cfgOther, {
          u: remote?.url || '?'
        }),
        clone: t(T.cfgClone),
        adopt: t(T.cfgClone),
        none: t(T.cfgNone, {
          h: d?.host || '?'
        })
      } [access];
      cards.push(`<div class="f-card" data-card="cfg" data-access="${access}"><h2>${esc(t(T.cfgTitle))}</h2>
        <dl class="f-dl">${a.name || a.site ? `<dt>${esc(t(T.cfgAirline))}</dt><dd>${esc([a.name, a.site].filter(Boolean).join(' — '))}</dd>` : ''}${d ? `<dt>${esc(t(T.cfgRepo))}</dt><dd>${esc(`${d.host}/${d.repo} (${d.branch})`)}</dd>` : ''}<dt>${esc(t(T.trigram))}</dt><dd>${esc(incoming.identity.trigram)}</dd></dl>
        <p class="f-muted">${esc(t(T.cfgWhat))}</p>
        ${fld('cfgIvao', T.ivao, id.ivao, { mode: 'numeric' })}${fld('cfgVatsim', T.vatsim, id.vatsim, { mode: 'numeric' })}${fld('cfgSimbrief', T.simbrief, id.simbrief)}
        ${note ? `<p class="${access === 'none' || access === 'other' ? 'f-warn' : 'f-muted'}">${esc(note)}</p>` : ''}
        ${['clone', 'adopt', 'github'].includes(access) ? fld('cfgToken', T.token, '', { type: 'password' }) : ''}
        ${how && access !== 'same' ? `<details class="f-cfghow"><summary>${esc(t(T.cfgHowto))}</summary><div class="f-doc">${howtoHtml(how)}</div></details>` : ''}
        <p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="cfgApply">${esc(t(T.cfgApply))}</button>${access === 'github' ? `<button type="button" data-act="cfgTest">${esc(t(T.test))}</button>` : ''}<button type="button" data-act="cfgCancel">${esc(t(T.cfgCancel))}</button></div></div>`);
    }
    if (cfgApplied) cards.push(`<div class="f-card" data-card="cfgdone"><h2>${esc(t(T.cfgDone))}</h2><p>${esc(cfgApplied)}</p><p class="f-muted">${esc(t(T.cfgNext))}</p>
      <div class="f-row"><button type="button" class="primary" data-act="cfgOffline">${esc(t(T.cfgGoOffline))}</button><button type="button" data-act="cfgDoneClose">${esc(t(T.close))}</button></div></div>`);
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
    const cfgIn = window.SogConfig ? `<p class="f-muted">${esc(t(T.cfgImportHint))}</p><div class="f-row"><button type="button" data-act="cfgImport">${esc(t(T.cfgImport))}</button><input type="file" accept="application/json,.json" data-cfgfile hidden></div>` : '';
    const cfgOut = window.SogConfig && (L || gh) ? `<details class="f-cfgx" data-cfgx><summary>${esc(t(T.cfgExport))}</summary><p class="f-muted">${esc(t(T.cfgExportHint))}</p>
      ${xsrc ? '' : `<p class="f-warn">${esc(t(T.cfgNoRepo))}</p>`}${fld('cfgPilot', T.cfgPilot, '', { cap: true, ph: 'ABC' })}${fld('cfgApp', T.cfgApp, appUrl(), { ph: 'https://…/v3/frame/' })}
      <div class="f-row"><button type="button" class="primary" data-act="cfgMake">${esc(t(T.cfgMake))}</button></div><p class="f-msg" data-xmsg></p>
      <div data-cfgout hidden><label class="f-field">${esc(t(T.cfgLink))}<textarea data-cfglink rows="3" readonly spellcheck="false"></textarea></label><div class="f-row"><button type="button" data-act="cfgCopy">${esc(t(T.cfgCopy))}</button></div></div></details>` : '';
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
        [T.last, s.lastSync ? new Date(s.lastSync).toLocaleString() : t(T.never)],
        [T.pending, String(s.pending || 0)],
        [T.network, t(s.online === false ? T.offline : T.online)],
        ...(s.lastError ? [
          [T.lastError, s.lastError]
        ] : [])
      ].map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('');
      // les écritures en attente, les plus récentes d'abord (20 au plus) : chemin, module, heure ; ✕ : suppression
      const box = view.querySelector('[data-queue]'),
        q = s.queue || [],
        day = new Date().toDateString(),
        when = at => {
          const d = new Date(at);
          return isNaN(d) ? '' : d.toDateString() === day ? d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : d.toLocaleString();
        },
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
        await navigator.clipboard?.writeText(diagJson).catch(() => null);
        c.notify(t(T.copied), 'ok');
      }
      // ---- configuration d'un pilote
      if (act === 'cfgImport') return view.querySelector('[data-cfgfile]')?.click();
      if (act === 'cfgCancel') {
        cfgPicked = null;
        dropConfigHash();
        return again();
      }
      if (act === 'cfgDoneClose' || act === 'cfgOffline') {
        cfgApplied = '';
        await again();
        if (act === 'cfgOffline') card('offline')?.scrollIntoView({
          block: 'start'
        });
        return;
      }
      if (act === 'cfgMake') return makeConfig(c, view, xsrc);
      if (act === 'cfgCopy') {
        await navigator.clipboard?.writeText(view.querySelector('[data-cfglink]')?.value || '').catch(() => null);
        return c.notify(t(T.cfgCopied), 'ok');
      }
      if ((act === 'cfgApply' || act === 'cfgTest') && incoming) {
        const k = card('cfg'),
          ivao = val('cfgIvao', k),
          vatsim = val('cfgVatsim', k),
          tokF = k.querySelector('[data-f="cfgToken"]'),
          token = tokF?.value.trim() || '',
          d = incoming.data;
        if (ivao && !/^\d+$/.test(ivao)) return say('cfg', t(T.badNumber, {
          f: t(T.ivao)
        }));
        if (vatsim && !/^\d+$/.test(vatsim)) return say('cfg', t(T.badNumber, {
          f: t(T.vatsim)
        }));
        if (['clone', 'adopt', 'github'].includes(access) && !token) return say('cfg', t(T.cfgNeedToken));
        if (act === 'cfgTest' && access !== 'github') return say('cfg', t(T.cfgNoTest), 'warn');
        // l'accès d'abord, testé : rien n'est écrit s'il est refusé
        let gcfg = null;
        if (access === 'github') {
          gcfg = {
            repo: d.repo,
            branch: d.branch,
            token,
            ...(d.api ? {
              api: d.api
            } : {})
          };
          say('cfg', t(T.cfgTesting), 'warn');
          try {
            await FD.github(gcfg).head();
          } catch (err) {
            return say('cfg', err?.offline ? t(T.testOffline) : t(T.cfgTestFail, {
              e: err?.message || String(err)
            }), err?.offline ? 'warn' : 'err');
          }
          if (act === 'cfgTest') return say('cfg', t(T.testOk, {
            b: d.branch
          }), 'ok');
          if (gh && gh.repo !== d.repo && !await c.ask(t(T.cfgReplace, {
              r: gh.repo
            }))) return say('cfg', '');
        }
        if (access === 'clone' || access === 'adopt') {
          if (tokF) tokF.value = ''; // le jeton ne reste pas dans la page
          k.querySelectorAll('button').forEach(x => x.disabled = true);
          say('cfg', t(T.gitWorking), 'warn');
          const r = await setup(access, {
            url: SogConfig.cloneUrl(d),
            user: SogConfig.kind(d) === 'github' ? 'x-access-token' : 'oauth2',
            secret: token,
            remember: true,
            author: incoming.identity.trigram
          });
          k.querySelectorAll('button').forEach(x => x.disabled = false);
          if (!r?.ok) return say('cfg', [r?.message || t(T.launcherOld), confirmOpen(r) ? t(T.confirmOpen) : ''].filter(Boolean)
            .join(' '));
          await c.redetect?.();
        }
        const linked = ['same', 'clone', 'adopt', 'github'].includes(access);
        await c.own.put('device/identity.json', {
          ...c.identity(),
          trigram: incoming.identity.trigram,
          ivao,
          vatsim,
          simbrief: val('cfgSimbrief', k),
          updated_at: now()
        });
        // usages seulement avec un accès : un échange coché sans dépôt ne mènerait nulle part
        if (linked && incoming.usages) {
          const u = {
            ...c.usages(),
            ...incoming.usages,
            updated_at: now()
          };
          u.single = !(u.devices || u.users || u.backend);
          await c.own.put('device/usages.json', u);
        }
        if (gcfg) FD.github.save(gcfg);
        await c.reload();
        // première synchronisation, puis la compagnie si le dépôt n'en a pas encore (celle du dépôt prime)
        let line = t(T.cfgNoAccess);
        if (linked) {
          const r = await c.syncNow(true).catch(e => ({
            error: e?.message || String(e)
          }));
          line = r?.error ? t(T.cfgSyncErr, {
            e: r.error
          }) : t(T.cfgSynced);
          if (!r?.error && incoming.airline?.name) {
            const A = airlineDoc(FD);
            if (!(await A.get(AIRLINE, {
                wait: true
              }).catch(() => null))) {
              await A.put(AIRLINE, {
                ...incoming.airline,
                schema: 1,
                updated_at: now(),
                by: incoming.identity.trigram
              });
              await c.syncNow(true).catch(() => null);
            }
          }
        }
        cfgPicked = null;
        cfgApplied = line;
        dropConfigHash();
        c.notify(t(T.cfgDone), 'ok');
        await again();
        return scrollTo(0, 0);
      }
    };
    view.querySelector('[data-cfgfile]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      let r = null;
      try {
        r = SogConfig.validate(await SogConfig.read(f));
      } catch {
        r = null;
      }
      if (!r?.ok) return c.notify(r ? cfgError(r, t) : t(T.cfgBadFile), 'err');
      cfgPicked = r.cfg;
      cfgApplied = '';
      await again();
      scrollTo(0, 0);
    });
    // #settings?import=1 (carte d'accueil) : le bouton d'import à portée
    if (q.get('import') && !incoming) {
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

  // ---- configuration d'un pilote (frame/settings/config.js)
  let cfgPicked = null, // configuration lue d'un fichier, en attente de « Appliquer »
    cfgApplied = ''; // compte rendu de la dernière configuration appliquée (carte « Configuration appliquée »)
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
    if (/[?&](config|import)=/.test(location.hash)) history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
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
  const howtoHtml = text => String(text).split(/\n+/).filter(Boolean).map(l => `<p>${esc(l).replace(/https:\/\/[^\s<&]+[^\s<&.,;:)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`).join('');
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
      out.querySelector('[data-cfglink]').value = `${base.href}#settings?config=${await SogConfig.pack(cfg)}`;
      out.hidden = false;
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
      rf = d.references || {},
      ae = d.aerodb || {};
    const rows = [
      ['transport', d.transport],
      ['online', d.online],
      ['lastSync', d.lastSync],
      ['pending', d.pending],
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
