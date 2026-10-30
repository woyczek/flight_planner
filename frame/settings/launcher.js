(() => {
  'use strict';
  // V3 — Réglages, cartes du lanceur (frame/settings/SPEC.md § 3.6, 3.9, 3.9c) : la carte Accès d'un poste servi par le
  // lanceur (dépôt distant de data/, ou la porte pour le prendre en git), les clés d'API de la compagnie (IVAO, EAD Basic) et l'assistant « Application IVAO » (connexion des pilotes), l'accès du
  // poste aux appareils du réseau local (code d'appairage, QR, appareils) ; la fenêtre Oui / Non du lanceur annoncée avant
  // le clic. Routes /__setup/* du lanceur ; jamais de secret gardé par la page.
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
    remoteNow: ['Actuel : {u} (branche {b})', 'Current: {u} (branch {b})', 'Aktuell: {u} (Zweig {b})', 'Actual: {u} (rama {b})'],
    remoteNowBare: ['Actuel : {u}', 'Current: {u}', 'Aktuell: {u}', 'Actual: {u}'],
    remoteNone: ['Aucun dépôt distant : rien ne part ailleurs que ce poste.',
      'No remote repository: nothing leaves this workstation.',
      'Kein entferntes Repository: nichts verlässt diesen Rechner.', 'Ningún repositorio remoto: nada sale de este puesto.'
    ],
    remoteUrl: ['Adresse du dépôt (git@hôte:compte/dépôt.git ou https://…)',
      'Repository address (git@host:account/repo.git or https://…)',
      'Repository-Adresse (git@host:konto/repo.git oder https://…)',
      'Dirección del repositorio (git@host:cuenta/repo.git o https://…)'
    ],
    remoteCheck: ['Vérifier', 'Check', 'Prüfen', 'Comprobar'],
    histWarn: [
      'L’historique du dépôt des données a été réécrit (aucun ancêtre commun) : rien n’est fusionné, les écritures de ce poste restent dans data/.',
      'The data repository’s history was rewritten (no common ancestor): nothing is merged, this computer’s writes stay in data/.',
      'Die Historie des Daten-Repositorys wurde neu geschrieben (kein gemeinsamer Vorfahr): nichts wird zusammengeführt, die Änderungen dieses Rechners bleiben in data/.',
      'El historial del repositorio de datos se reescribió (sin antepasado común): no se fusiona nada, las escrituras de este equipo se quedan en data/.'
    ],
    histResume: ['Reprendre le nouvel historique', 'Take up the new history', 'Neue Historie übernehmen',
      'Retomar el nuevo historial'
    ],
    histReading: ['Lecture du dépôt distant…', 'Reading the remote repository…', 'Entferntes Repository wird gelesen…',
      'Leyendo el repositorio remoto…'
    ],
    histAsk: [
      'Reprendre le nouvel historique ? {c} commit(s) de ce poste, {n} fichier(s) des données reportés sur le nouvel historique, {p} modification(s) en cours commitées d’abord{k}. L’ancien état reste gardé dans une référence locale ; rien n’est supprimé. Puis une synchronisation.',
      'Take up the new history? {c} commit(s) of this computer, {n} data file(s) carried onto the new history, {p} change(s) in progress committed first{k}. The old state stays kept in a local reference; nothing is deleted. Then a synchronisation.',
      'Neue Historie übernehmen? {c} Commit(s) dieses Rechners, {n} Datendatei(en) auf die neue Historie übertragen, {p} laufende Änderung(en) zuerst committet{k}. Der alte Stand bleibt in einer lokalen Referenz; nichts wird gelöscht. Danach eine Synchronisation.',
      '¿Retomar el nuevo historial? {c} commit(s) de este equipo, {n} archivo(s) de datos trasladados al nuevo historial, {p} cambio(s) en curso confirmados antes{k}. El estado anterior queda guardado en una referencia local; no se borra nada. Luego una sincronización.'
    ],
    histKept: [' ; {k} fichier(s) hors des données synchronisées recopiés dans data/ tels que sur ce poste, jamais envoyés',
      '; {k} file(s) outside the synchronised data copied back into data/ as they are on this computer, never sent',
      '; {k} Datei(en) außerhalb der synchronisierten Daten werden so, wie sie auf diesem Rechner sind, wieder in data/ kopiert, nie gesendet',
      '; {k} archivo(s) fuera de los datos sincronizados se copian de nuevo en data/ tal como están en este equipo, nunca enviados'
    ],
    histDone: ['Nouvel historique repris : {n} fichier(s) reportés, puis synchronisé.',
      'New history taken up: {n} file(s) carried over, then synchronised.',
      'Neue Historie übernommen: {n} Datei(en) übertragen, dann synchronisiert.',
      'Nuevo historial retomado: {n} archivo(s) trasladados, luego sincronizado.'
    ],
    histNoTri: ['Réglez d’abord votre trigramme (Mon profil) : il signe le commit de reprise.',
      'Set your trigram first (My profile): it signs the take-up commit.',
      'Legen Sie zuerst Ihr Kürzel fest (Mein Profil): Es zeichnet den Übernahme-Commit.',
      'Configure primero su trigrama (Mi perfil): firma el commit de recuperación.'
    ],
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
    gitSecret: ['Mot de passe ou jeton (facultatif, jamais gardé par la page)',
      'Password or token (optional, never kept by the page)',
      'Passwort oder Token (optional, nie von der Seite gespeichert)', 'Contraseña o token (opcional, nunca guardado por la página)'
    ],
    gitRemember: ['Se souvenir de ces identifiants dans Git, sur cet ordinateur',
      'Remember these credentials in Git, on this computer',
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
    noGitAnchor: ['un-dépôt-git-pour-data', 'a-git-repository-for-data', 'ein-git-repository-für-data',
      'un-repositorio-git-para-data'
    ],
    helpLink: ['Ouvrir l’aide', 'Open the help', 'Hilfe öffnen', 'Abrir la ayuda'],
    accessLauncher: ['Ce poste passe par son lanceur : pas de jeton à régler ici.',
      'This workstation goes through its launcher: no token to set here.',
      'Dieser Rechner nutzt seinen Starter: hier ist kein Token einzustellen.',
      'Este puesto pasa por su lanzador: no hay token que configurar aquí.'
    ],
    // clés d'API de la compagnie (volet de la carte Administration ; titre et phrase dans admin_links.js)
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
    lanForgottenOne: ['Appareil « {d} » oublié.', 'Device “{d}” forgotten.', 'Gerät „{d}“ vergessen.',
      'Dispositivo «{d}» olvidado.'
    ],
    lanStillClosed: ['Adresses restées fermées : {u} (indisponibles sur ce poste, la fenêtre du lanceur dit pourquoi).',
      'Addresses still closed: {u} (unavailable on this computer; the launcher’s window says why).',
      'Weiterhin geschlossene Adressen: {u} (auf diesem Rechner nicht verfügbar; das Fenster des Starters nennt den Grund).',
      'Direcciones aún cerradas: {u} (no disponibles en este equipo; la ventana del lanzador dice por qué).'
    ],
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
      'Un code sert une seule fois et dure 10 minutes. 5 essais par minute et par appareil ; après 30 codes faux en une heure, l’appairage se ferme jusqu’au prochain « Nouveau code ». Un code pour le trigramme d’un pilote, et tous les appareils (réseau local et relais) : Maintenance › Appareils.',
      'A code works only once and lasts 10 minutes. 5 tries a minute per device; after 30 wrong codes in an hour, pairing closes until the next “New code”. A code for a pilot’s trigram, and every device (local network and relay): Maintenance › Devices.',
      'Ein Code gilt nur einmal und 10 Minuten. 5 Versuche pro Minute und Gerät; nach 30 falschen Codes in einer Stunde schließt sich die Kopplung bis zum nächsten „Neuer Code“. Ein Code für das Kürzel eines Piloten und alle Geräte (lokales Netz und Relais): Wartung › Geräte.',
      'Un código sirve una sola vez y dura 10 minutos. 5 intentos por minuto y dispositivo; tras 30 códigos erróneos en una hora, la vinculación se cierra hasta el siguiente «Código nuevo». Un código para el trigrama de un piloto, y todos los dispositivos (red local y relé): Mantenimiento › Dispositivos.'
    ],
    lanCodeLeft: ['{c} — encore {m} min', '{c} — {m} min left', '{c} — noch {m} min', '{c} — quedan {m} min'],
    lanNoCode: ['aucun code en cours : « Nouveau code » pour appairer un appareil',
      'no code in progress: “New code” to pair a device',
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
    // un appareil appairé par le code de console (sans trigramme ; Maintenance › Appareils le nomme)
    lanConsole: ['code de console', 'console code', 'Konsolencode', 'código de consola'],
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
    eraseAsk: ['Effacer la clé IVAO du lanceur ?', 'Erase the IVAO key from the launcher?', 'Den IVAO-Schlüssel vom Starter löschen?',
      '¿Borrar la clave IVAO del lanzador?'
    ],
    keyOk: ['Clé valide : l’API IVAO répond.', 'Key valid: the IVAO API answers.', 'Schlüssel gültig: die IVAO-API antwortet.',
      'Clave válida: la API IVAO responde.'
    ],
    keyBad: ['Clé IVAO : {e}', 'IVAO key: {e}', 'IVAO-Schlüssel: {e}', 'Clave IVAO: {e}'],
    // identifiants EAD Basic (volet des clés) : donnés une fois au lanceur, jamais relus par la page
    eadTitle: ['EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)', 'EAD Basic (EUROCONTROL)'],
    eadNotice: ['EAD Basic (EUROCONTROL) : outil de démonstration, données non opérationnelles, usage simulation.',
      'EAD Basic (EUROCONTROL): a demonstration tool, non-operational data, for simulation use.',
      'EAD Basic (EUROCONTROL): Demonstrationswerkzeug, keine operativen Daten, nur für die Simulation.',
      'EAD Basic (EUROCONTROL): herramienta de demostración, datos no operativos, uso en simulación.'
    ],
    eadHint: [
      'Donnés une seule fois au lanceur de cet ordinateur (dossier secrets/), jamais réaffichés, jamais dans les données. Ils servent à « Lire un terrain depuis EAD » (un terrain par geste).',
      'Given once to this computer’s launcher (secrets/ folder), never shown again, never in the data. Used by “Read an aerodrome from EAD” (one aerodrome per gesture).',
      'Einmalig dem Starter dieses Rechners übergeben (Ordner secrets/), nie wieder angezeigt, nie in den Daten. Sie dienen zum „Flugplatz aus EAD lesen“ (ein Flugplatz pro Geste).',
      'Se entregan una sola vez al lanzador de este equipo (carpeta secrets/), no se vuelven a mostrar, nunca están en los datos. Sirven para «Leer un aeródromo desde EAD» (un aeródromo por gesto).'
    ],
    eadUser: ['Identifiant EAD Basic', 'EAD Basic user name', 'EAD-Basic-Benutzername', 'Usuario de EAD Basic'],
    eadPassword: ['Mot de passe EAD Basic', 'EAD Basic password', 'EAD-Basic-Passwort', 'Contraseña de EAD Basic'],
    eadSet: ['Identifiants enregistrés le {d}', 'Credentials saved on {d}', 'Zugangsdaten gespeichert am {d}',
      'Credenciales guardadas el {d}'
    ],
    eadMissing: ['Identifiants absents', 'Credentials missing', 'Zugangsdaten fehlen', 'Credenciales ausentes'],
    eadBoth: ['Renseignez l’identifiant et le mot de passe.', 'Fill in the user name and the password.',
      'Benutzername und Passwort eingeben.', 'Rellene el usuario y la contraseña.'
    ],
    eadEraseAsk: ['Effacer les identifiants EAD Basic du lanceur ?', 'Erase the EAD Basic credentials from the launcher?',
      'Die EAD-Basic-Zugangsdaten vom Starter löschen?', '¿Borrar las credenciales de EAD Basic del lanzador?'
    ],
    eadSaved: ['Identifiants EAD Basic enregistrés dans le lanceur.', 'EAD Basic credentials saved in the launcher.',
      'EAD-Basic-Zugangsdaten im Starter gespeichert.', 'Credenciales de EAD Basic guardadas en el lanzador.'
    ],
    eadErased: ['Identifiants EAD Basic effacés du lanceur.', 'EAD Basic credentials erased from the launcher.',
      'EAD-Basic-Zugangsdaten aus dem Starter gelöscht.', 'Credenciales de EAD Basic borradas del lanzador.'
    ],

    // assistant « Application IVAO (connexion des pilotes) » : écrit secrets/ivao_oauth.json par le lanceur, sans éditer de fichier
    ivaoAppTitle: ['Application IVAO (connexion des pilotes)', 'IVAO application (pilots’ sign-in)',
      'IVAO-Anwendung (Anmeldung der Piloten)', 'Aplicación IVAO (conexión de los pilotos)'
    ],
    ivaoAppIntro: [
      'Les pilotes se connectent à IVAO par le relais de la compagnie ou par ce poste ; pour cela, la compagnie déclare une application chez IVAO. Son secret reste dans le lanceur (dossier secrets/), jamais dans la page ni dans les données.',
      'Pilots sign in to IVAO through the airline’s relay or this workstation; for that, the airline registers an application with IVAO. Its secret stays in the launcher (secrets/ folder), never in the page or in the data.',
      'Die Piloten melden sich über das Relais der Fluggesellschaft oder über diesen Rechner bei IVAO an; dafür registriert die Fluggesellschaft eine Anwendung bei IVAO. Ihr Geheimnis bleibt im Starter (Ordner secrets/), nie in der Seite oder in den Daten.',
      'Los pilotos se conectan a IVAO por el relé de la compañía o por este equipo; para ello, la compañía registra una aplicación en IVAO. Su secreto se queda en el lanzador (carpeta secrets/), nunca en la página ni en los datos.'
    ],
    ivaoStep1: ['Ouvrez cette page d’IVAO (compte IVAO requis) :', 'Open this IVAO page (an IVAO account is required):',
      'Öffnen Sie diese IVAO-Seite (IVAO-Konto erforderlich):', 'Abra esta página de IVAO (se necesita una cuenta IVAO):'
    ],
    ivaoStep2: [
      'Remplissez le formulaire : Name = le nom de la compagnie ; App Type = Third Party ; Active = Enabled.',
      'Fill in the form: Name = the airline’s name; App Type = Third Party; Active = Enabled.',
      'Füllen Sie das Formular aus: Name = Name der Fluggesellschaft; App Type = Third Party; Active = Enabled.',
      'Rellene el formulario: Name = el nombre de la compañía; App Type = Third Party; Active = Enabled.'
    ],
    ivaoStep3: [
      'Cliquez « + Add Redirect URL » une fois par adresse de retour listée ci-dessous, en la collant telle quelle.',
      'Click “+ Add Redirect URL” once for each return address listed below, pasting it exactly as it is.',
      'Klicken Sie „+ Add Redirect URL“ einmal pro unten aufgeführter Rücksprungadresse und fügen Sie sie unverändert ein.',
      'Pulse «+ Add Redirect URL» una vez por cada dirección de retorno de la lista de abajo, pegándola tal cual.'
    ],
    ivaoStep4: [
      'Cliquez Submit, puis recopiez dans les champs ci-dessous le Client ID et le Client Secret qu’IVAO affiche.',
      'Click Submit, then copy the Client ID and the Client Secret that IVAO shows into the fields below.',
      'Klicken Sie Submit und übertragen Sie die von IVAO angezeigte Client ID und das Client Secret in die Felder unten.',
      'Pulse Submit y copie en los campos de abajo el Client ID y el Client Secret que muestra IVAO.'
    ],
    ivaoRedirTitle: ['Adresses de retour', 'Return addresses', 'Rücksprungadressen', 'Direcciones de retorno'],
    ivaoRedirHint: [
      'Déclarez chacune chez IVAO ; la seconde n’apparaît que si le relais de la compagnie est réglé.',
      'Declare each one with IVAO; the second one only appears when the airline’s relay is set.',
      'Deklarieren Sie jede bei IVAO; die zweite erscheint nur, wenn das Relais der Fluggesellschaft eingerichtet ist.',
      'Declárelas todas en IVAO; la segunda solo aparece si el relé de la compañía está configurado.'
    ],
    ivaoRedirOld: ['Mettez le lanceur à jour pour voir l’adresse de retour.', 'Update the launcher to see the return address.',
      'Aktualisieren Sie den Starter, um die Rücksprungadresse zu sehen.', 'Actualice el lanzador para ver la dirección de retorno.'
    ],
    ivaoCopy: ['Copier', 'Copy', 'Kopieren', 'Copiar'],
    ivaoCopied: ['Adresse copiée.', 'Address copied.', 'Adresse kopiert.', 'Dirección copiada.'],
    ivaoAppSet: ['Application enregistrée le {d}', 'Application saved on {d}', 'Anwendung gespeichert am {d}',
      'Aplicación guardada el {d}'
    ],
    ivaoAppMissing: ['Application absente', 'Application missing', 'Anwendung fehlt', 'Aplicación ausente'],
    ivaoClientId: ['Client ID', 'Client ID', 'Client ID', 'Client ID'],
    ivaoClientSecret: ['Client Secret', 'Client Secret', 'Client Secret', 'Client Secret'],
    ivaoAppBoth: ['Renseignez le Client ID et le Client Secret.', 'Fill in the Client ID and the Client Secret.',
      'Client ID und Client Secret eingeben.', 'Rellene el Client ID y el Client Secret.'
    ],
    ivaoAppAsk: ['Effacer l’application IVAO du lanceur ? Les pilotes ne pourront plus se connecter à IVAO.',
      'Erase the IVAO application from the launcher? Pilots will no longer be able to sign in to IVAO.',
      'Die IVAO-Anwendung vom Starter löschen? Die Piloten können sich dann nicht mehr bei IVAO anmelden.',
      '¿Borrar la aplicación IVAO del lanzador? Los pilotos ya no podrán conectarse a IVAO.'
    ],
    ivaoAppSaved: ['Application IVAO enregistrée dans le lanceur.', 'IVAO application saved in the launcher.',
      'IVAO-Anwendung im Starter gespeichert.', 'Aplicación IVAO guardada en el lanzador.'
    ],
    ivaoAppErased: ['Application IVAO effacée du lanceur.', 'IVAO application erased from the launcher.',
      'IVAO-Anwendung aus dem Starter gelöscht.', 'Aplicación IVAO borrada del lanzador.'
    ],
    ivaoAppTestOk: ['Découverte OpenID d’IVAO jointe : l’application est prête.',
      'IVAO OpenID discovery reached: the application is ready.',
      'OpenID-Discovery von IVAO erreicht: Die Anwendung ist bereit.',
      'Descubrimiento OpenID de IVAO alcanzado: la aplicación está lista.'
    ],
    ivaoAppTestMissing: ['Enregistrez d’abord l’application.', 'Save the application first.',
      'Speichern Sie zuerst die Anwendung.', 'Guarde primero la aplicación.'
    ],
    ivaoAppTestFail: [
      'Enregistrée ; IVAO n’a pas répondu : essayez par « Se connecter à IVAO ».',
      'Saved; IVAO did not answer: try “Sign in to IVAO”.',
      'Gespeichert; IVAO hat nicht geantwortet: Versuchen Sie „Bei IVAO anmelden“.',
      'Guardada; IVAO no respondió: pruebe con «Conectarse a IVAO».'
    ],
    ivaoAppKeyNote: [
      'La clé API de l’application (secrets/ivao.json, lecture du tracker par la compagnie) est un autre réglage ; une nouvelle application a sa propre clé API, vous pouvez la reporter dans « Clé IVAO » ci-dessus.',
      'The application’s API key (secrets/ivao.json, the airline’s tracker reading) is another setting; a new application has its own API key, which you can carry over to “IVAO key” above.',
      'Der API-Schlüssel der Anwendung (secrets/ivao.json, Tracker-Abfrage der Fluggesellschaft) ist eine andere Einstellung; eine neue Anwendung hat ihren eigenen API-Schlüssel, den Sie oben unter „IVAO-Schlüssel“ eintragen können.',
      'La clave API de la aplicación (secrets/ivao.json, lectura del tracker por la compañía) es otro ajuste; una aplicación nueva tiene su propia clave API, que puede trasladar a «Clave IVAO» más arriba.'
    ],
    ivaoAppLink: ['Créer l’application IVAO des pilotes : pas à pas', 'Create the pilots’ IVAO application: step by step',
      'IVAO-Anwendung der Piloten anlegen: Schritt für Schritt', 'Crear la aplicación IVAO de los pilotos: paso a paso'
    ],
  });

  /** L'opération ouvrira-t-elle la fenêtre Oui / Non du lanceur ? Réponse du lanceur pour cette adresse (POST adopt dry,
   *  needsConfirm : autre dépôt que celui de la configuration), sinon comparaison locale ; enregistrement d'un dépôt
   *  distant : jamais pour l'adresse actuelle. */
  let remoteNow = null; // dernier GET /__setup/sync-remote (render)
  const dryCache = {}; // adresse → needsConfirm du lanceur (POST adopt dry), 'invalid', ou null sans réponse
  /** Le lanceur demandera-t-il sa confirmation pour cette adresse (kind : remote ou adopt) ? */
  function needsConfirm(url, kind) {
    const r = remoteNow || {},
      dry = dryCache[String(url || '').trim()];
    // dépôt distant : l'adresse actuelle ne demande jamais la fenêtre ; sinon, comme une reprise (autre que la configuration)
    if (kind === 'remote' && sameRepo(url, r.url)) return false;
    if (typeof dry === 'boolean') return dry;
    return !sameRepo(url, r.default);
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
  /** Dépôt distant de data/ (GET /__setup/sync-remote), relu à chaque dessin ; les réponses « dry » mémorisées sont oubliées. */
  async function readRemote() {
    Object.keys(dryCache).forEach(k => delete dryCache[k]);
    return remoteNow = await setup('sync-remote');
  }
  /** Carte Accès d'un poste servi par le lanceur : la phrase « pas de jeton ici » et, tant que data/ n'est pas un dépôt
   *  git, la porte (clone / reprise) ; le dépôt distant est un volet de la carte Administration (remoteHtml). */
  function accessHtml(env) {
    const {
      t,
      remote,
      gitState,
      fld
    } = env;
    return `<div class="f-card" data-card="access"><h2>${esc(t(T.access))}</h2><p>${esc(t(T.accessLauncher))}</p>${gitState === 'repo' ? '' : gitDoor(gitState, t, fld, remote)}</div>`;
  }
  /** Volet « Dépôt distant de data/ » de la carte Administration (data/ en dépôt git seulement) ; '' sinon. */
  function remoteHtml(env) {
    const {
      t,
      remote,
      gitState,
      fld
    } = env;
    if (gitState !== 'repo' || !remote) return '';
    const hist = remote.rewritten ? `<div data-card="hist"><p class="f-msg" data-kind="warn" data-hist>${esc(t(T.histWarn))}</p><p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="histResume">${esc(t(T.histResume))}</button></div></div>` : '';
    return `${hist}<div data-card="remote"><p data-remote-now>${esc(remote.url ? (/^[\w./-]+$/.test(remote.branch || '') ? t(T.remoteNow, { u: remote.url, b: remote.branch }) : t(T.remoteNowBare, { u: remote.url })) : t(T.remoteNone))}</p>
        ${fld('remote', T.remoteUrl, remote.url || remote.default || '')}<p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="remoteSave">${esc(t(T.save))}</button><button type="button" data-act="remoteCheck">${esc(t(T.remoteCheck))}</button></div><p class="f-muted" data-confirm-hint hidden>${esc(t(T.confirmHint))}</p></div>`;
  }
  /** Volet « Clés d'API de la compagnie » de la carte Administration : la clé IVAO, puis les identifiants EAD Basic,
   *  gardés par le lanceur (secrets/) ; la page ne les relit jamais. */
  function keysHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<div data-card="keys"><p>${esc(t(T.pair, { k: t(T.ivaoKey) }))} <b data-key>…</b></p>${fld('ivaoKey', T.keyNew, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="keySave">${esc(t(T.save))}</button><button type="button" data-act="keyTest">${esc(t(T.test))}</button><button type="button" data-act="keyErase">${esc(t(T.erase))}</button></div>
      <div data-card="ead"><h3>${esc(t(T.eadTitle))}</h3><p class="f-msg" data-kind="warn">${esc(t(T.eadNotice))}</p><p class="f-muted">${esc(t(T.eadHint))}</p>
        <p><b data-ead>…</b></p>${fld('eadUser', T.eadUser, '')}${fld('eadPassword', T.eadPassword, '', { type: 'password' })}<p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="eadSave">${esc(t(T.save))}</button><button type="button" data-act="eadErase">${esc(t(T.erase))}</button></div></div>
      <p><a href="#settings?card=ivaoapp" data-ivaoapp-link>${esc(t(T.ivaoAppLink))}</a></p></div>`;
  }
  /** Carte « Application IVAO (connexion des pilotes) » (assistant pas à pas qui écrit secrets/ivao_oauth.json par le
   *  lanceur) : étapes chez IVAO, adresses de retour à y déclarer (remplies par paintKeys), état, Client ID et Client
   *  Secret donnés une fois, jamais relus. */
  function ivaoAppHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<div class="f-card" data-card="ivaoapp"><h2>${esc(t(T.ivaoAppTitle))}</h2><p class="f-muted">${esc(t(T.ivaoAppIntro))}</p>
      <ol data-ivao-steps><li>${esc(t(T.ivaoStep1))} <a href="https://developers.ivao.aero/create" target="_blank" rel="noopener noreferrer">developers.ivao.aero/create</a></li>
        <li>${esc(t(T.ivaoStep2))}</li><li>${esc(t(T.ivaoStep3))}</li><li>${esc(t(T.ivaoStep4))}</li></ol>
      <h3>${esc(t(T.ivaoRedirTitle))}</h3><ul data-ivao-redirects><li class="f-muted">…</li></ul><p class="f-muted">${esc(t(T.ivaoRedirHint))}</p>
      <p><b data-ivaoapp>…</b></p>${fld('ivaoClientId', T.ivaoClientId, '')}${fld('ivaoClientSecret', T.ivaoClientSecret, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="ivaoAppSave">${esc(t(T.save))}</button><button type="button" data-act="ivaoAppTest">${esc(t(T.test))}</button><button type="button" data-act="ivaoAppErase">${esc(t(T.erase))}</button></div>
      <p class="f-muted">${esc(t(T.ivaoAppKeyNote))}</p></div>`;
  }
  /** Adresses de retour et état de l'application IVAO (carte ivaoapp) d'après la lecture de GET /__setup/secrets : une ligne
   *  « adresse + Copier » par adresse de `ivaoRedirects` (un lanceur plus ancien n'en donne pas : une ligne le dit), et
   *  « enregistrée le … » quand le Client ID et le Client Secret sont réglés (date la plus récente), « absente » sinon. */
  function paintIvaoApp(env, s) {
    const {
      view,
      t
    } = env;
    const ul = view.querySelector('[data-ivao-redirects]');
    if (ul) {
      const list = Array.isArray(s?.ivaoRedirects) ? s.ivaoRedirects.filter(u => typeof u === 'string' && u) : null;
      ul.innerHTML = list ? list.map(u => `<li><code>${esc(u)}</code> <button type="button" data-act="ivaoCopy" data-text="${esc(u)}">${esc(t(T.ivaoCopy))}</button></li>`).join('') :
        `<li class="f-muted" data-ivao-old>${esc(t(T.ivaoRedirOld))}</li>`;
    }
    paintIvaoState(env, s?.app?.ivao_oauth);
  }
  /** Ligne d'état de l'application IVAO ([data-ivaoapp]) d'après { clientId, clientSecret } du lanceur (set, at). */
  function paintIvaoState(env, o) {
    const {
      view,
      c,
      t
    } = env;
    const b = view.querySelector('[data-ivaoapp]');
    if (!b) return;
    const both = !!o?.clientId?.set && !!o?.clientSecret?.set,
      at = [o?.clientId?.at, o?.clientSecret?.at].filter(Boolean).sort().pop() || '';
    b.textContent = both ? t(T.ivaoAppSet, {
      d: at ? c.time?.fmtDateZ(at) || at : '?'
    }) : t(T.ivaoAppMissing);
  }
  /** Ligne d'état des identifiants EAD Basic ([data-ead]) d'après { user, password } du lanceur (set, at) : « enregistrés le … »
   *  quand les deux sont réglés (date la plus récente), « absents » sinon. */
  function paintEad(env, ead) {
    const {
      view,
      c,
      t
    } = env;
    const b = view.querySelector('[data-ead]');
    if (!b) return;
    const both = !!ead?.user?.set && !!ead?.password?.set,
      at = [ead?.user?.at, ead?.password?.at].filter(Boolean).sort().pop() || '';
    b.textContent = both ? t(T.eadSet, {
      d: at ? c.time?.fmtDateZ(at) || at : '?'
    }) : t(T.eadMissing);
  }
  /** Clés du lanceur (niveau Complet) : l'état de la clé IVAO ([data-key]), celui des identifiants EAD Basic ([data-ead]) et
   *  la carte de l'application IVAO (adresses de retour, état), d'une seule lecture de GET /__setup/secrets. */
  async function paintKeys(env) {
    const {
      view,
      t
    } = env;
    const s = await setup('secrets'),
      k = s?.app?.ivao?.apiKey || null,
      b = view.querySelector('[data-key]');
    if (b) b.textContent = !k?.set ? t(T.keyMissing) : t(k.env ? T.keyEnv : T.keySet, {
      h: k.hint || '••••'
    });
    paintEad(env, s?.app?.ead);
    paintIvaoApp(env, s);
  }
  /** Adresses privées de ce poste encore fermées au réseau local (état du lanceur : available moins celles des urls). */
  function closedIps(s) {
    return (s?.available || []).filter(ip => !(s.urls || []).some(u => u.includes(`//${ip}:`)));
  }
  /** Carte « Accès du poste » (le poste qui sert la page seulement : c.lan() nul ailleurs) ; '' sans elle. */
  function lanHtml(env) {
    const {
      t,
      c
    } = env;
    const lanApi = c.lan?.() || null;
    env.lanApi = lanApi;
    return lanApi ? `<div class="f-card" data-card="lan"><h2>${esc(t(T.lan))}</h2><p class="f-muted">${esc(t(T.lanHint))}</p>
      <div data-lanstate><p class="f-muted">…</p></div><p class="f-msg" data-kind="warn">${esc(t(T.lanWarn))}</p><p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="lanToggle">${esc(t(T.lanOpen))}</button><button type="button" data-act="lanCode" hidden>${esc(t(T.lanNewCode))}</button><button type="button" data-act="lanForget" disabled>${esc(t(T.lanForget))}</button></div></div>` : '';
  }
  /** Parties vivantes : l'accès du poste (relu toutes les 5 s, dessiné s'il change), l'état de la clé IVAO, l'annonce de la
   *  fenêtre Oui / Non selon l'adresse saisie. */
  function live(env) {
    const {
      view,
      c,
      t,
      L,
      card
    } = env;
    const lanApi = env.lanApi;
    env.lanKey = '';
    // accès du réseau local : état, adresse et son code QR, code d'appairage, appareils ; redessiné seulement s'il change
    const paintLan = env.paintLan = s => {
      const k = card('lan');
      if (!k) return;
      // les minutes restantes du code, pas ses secondes : la carte n'est redessinée qu'au changement
      const min = s?.code ? Math.max(1, Math.ceil(s.expires / 60)) : 0,
        key = JSON.stringify(s && {
          ...s,
          expires: min
        });
      if (key === env.lanKey) return;
      env.lanKey = key;
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
        closed = closedIps(s),
        code = s.closed ? `<span class="f-msg" data-kind="err">${esc(t(T.lanClosed))}</span>` : s.code ? esc(t(T.lanCodeLeft, {
          c: s.code,
          m: min
        })).replace(esc(s.code), `<b class="f-num">${esc(s.code)}</b>`) : esc(t(T.lanNoCode)),
        devs = (s.paired || []).map(d => `<div class="f-row" data-lan-device="${esc(d.id)}"><span><b>${esc(d.trigram || t(T.lanConsole))}</b> ${esc(d.label)} — ${esc(d.at ? c.time?.fmtDateZ(d.at) || d.at : '?')}</span><button type="button" data-forget="${esc(d.id)}" data-label="${esc(d.label)}">${esc(t(T.lanForgetOne))}</button></div>`).join('');
      let qr = '';
      if (s.on && url && window.SogQR) try {
        qr = `<figure class="f-qr"><div>${SogQR.svg(url, { ecl: 'M', scale: 4 })}</div><figcaption class="f-muted">${esc(t(T.lanQr))}</figcaption></figure>`;
      } catch {
        qr = ''; // adresse trop longue pour un code QR : elle reste écrite
      }
      box.innerHTML = `<dl class="f-dl">${row(T.lanState, esc(t(s.on ? T.lanOn : T.lanOff)))}${s.on ? row(T.lanUrl, `<b>${esc(url)}</b>`) +
        (s.urls.length > 1 ? row(T.lanOther, esc(s.urls.slice(1).join(', '))) : '') + row(T.lanCode, code) : ''}${row(T.lanDevices, esc(String(s.devices ?? 0)))}</dl>${devs}${qr}${s.on ? `<p class="f-muted">${esc(t(T.lanCodeHint))}</p>` : ''}${s.on && closed.length ? `<p class="f-muted">${esc(t(T.lanOtherClosed, { u: closed.join(', ') }))}</p><div class="f-row"><button type="button" data-act="lanAll">${esc(t(T.lanOpenAll))}</button></div>` : ''}`;
    };
    if (lanApi && card('lan')) { // une autre carte seule (#settings?card=…) : pas de carte d'accès à relever
      const el = card('lan'),
        tick = async () => {
          if (!el.isConnected) return; // écran quitté ou redessiné : la relève s'arrête
          paintLan(await lanApi.state().catch(() => null));
          setTimeout(tick, 5e3); // un nouveau code (trop d'essais faux) ou un appareil appairé apparaissent seuls
        };
      tick();
    }
    if (L && (view.querySelector('[data-key]') || view.querySelector('[data-ead]') || view.querySelector('[data-ivaoapp]'))) paintKeys(
      env); // volet des clés : niveau Complet seulement

    // indication « fenêtre Oui / Non sur ce poste » sous le bouton, selon l'adresse saisie
    // (le lanceur répond à POST /__setup/adopt { url, dry: true } sans rien faire : needsConfirm ; sans réponse, comparaison
    // locale ; adresse vide ou invalide : rien d'annoncé)
    let hintTimer = 0;
    /** Annonce sous le champ, après une pause de frappe, ce que le lanceur fera de l'adresse saisie. */
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
  }
  /** Un appareil appairé oublié (bouton [data-forget] de la carte) ; vrai si le clic était le sien. */
  async function onClick(env, e) {
    const {
      c,
      t
    } = env;
    const fg = e.target.closest('[data-forget]');
    if (fg && c.lan?.()) {
      // un appareil appairé oublié : il devra saisir un nouveau code
      if (!await c.ask(t(T.lanForgetOneAsk, {
          d: fg.dataset.label
        }))) return;
      fg.disabled = true;
      const s = await c.lan().forget(fg.dataset.forget).catch(() => null);
      // sans réponse : l'état affiché reste (la relève suivante le redira), le refus est dit dans la carte
      if (!s) {
        fg.disabled = false;
        env.say('lan', t(T.lanFail));
        return true;
      }
      env.lanKey = '';
      env.paintLan(s);
      c.notify(t(T.lanForgottenOne, {
        d: fg.dataset.label
      }), 'ok');
      return true;
    }
    return false;
  }
  /** Actions des cartes du lanceur. */
  async function run(env, act, b, e) {
    const {
      view,
      c,
      t,
      card,
      val,
      say,
      again
    } = env;
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
        // « Les ouvrir aussi » : une adresse qui reste fermée (port pris…) est dite, le lanceur en donne la raison
        const still = act === 'lanAll' ? closedIps(s) : [];
        say('lan', !before.on && act === 'lanToggle' && !s.on ? t(T.lanNone) : still.length ? t(T.lanStillClosed, {
          u: still.join(', ')
        }) : '', 'warn');
        b.disabled = false; // avant le dessin : paintLan décide ensuite de « Oublier » (aucun appareil → grisé)
        env.lanKey = '';
        env.paintLan(s);
        if (act === 'lanForget') c.notify(t(T.lanForgotten), 'ok');
        else if (s.on && !before.on) c.notify(t(T.lanOpened), 'info');
      } catch {
        b.disabled = false;
        say('lan', t(T.lanFail));
      }
      return;
    }
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
    if (act === 'eadSave' || act === 'eadErase') {
      const box = card('ead'),
        user = val('eadUser', box),
        pass = val('eadPassword', box);
      if (act === 'eadSave' && (!user || !pass)) return say('ead', t(T.eadBoth));
      if (act === 'eadErase' && !await c.ask(t(T.eadEraseAsk))) return;
      // la page ne garde aucun secret : champs vidés avant l'appel
      box.querySelectorAll('[data-f]').forEach(x => x.value = '');
      say('ead', '');
      const r = await setup('secrets', {
        scope: 'app',
        service: 'ead',
        values: act === 'eadErase' ? {
          user: '',
          password: ''
        } : {
          user,
          password: pass
        }
      });
      if (!r?.ok) return say('ead', r?.message || t(T.launcherOld));
      c.notify(t(act === 'eadErase' ? T.eadErased : T.eadSaved), 'ok');
      return paintEad(env, r.app?.ead);
    }
    if (act === 'ivaoCopy') {
      // une adresse de retour copiée (ou montrée sélectionnée si la copie est impossible ici)
      const how = await copy(b.dataset.text || '', {
        near: b.closest('li')
      });
      return c.notify(t(how === 'shown' ? T.copyShown : T.ivaoCopied), how === 'shown' ? 'warn' : 'ok');
    }
    if (act === 'ivaoAppSave' || act === 'ivaoAppErase') {
      const box = card('ivaoapp'),
        cid = val('ivaoClientId', box),
        sec = val('ivaoClientSecret', box);
      if (act === 'ivaoAppSave' && (!cid || !sec)) return say('ivaoapp', t(T.ivaoAppBoth));
      if (act === 'ivaoAppErase' && !await c.ask(t(T.ivaoAppAsk))) return;
      // la page ne garde aucun secret : champs vidés avant l'appel
      box.querySelectorAll('[data-f]').forEach(x => x.value = '');
      say('ivaoapp', '');
      const r = await setup('secrets', {
        scope: 'app',
        service: 'ivao_oauth',
        values: act === 'ivaoAppErase' ? {
          clientId: '',
          clientSecret: ''
        } : {
          clientId: cid,
          clientSecret: sec
        }
      });
      if (!r?.ok) return say('ivaoapp', r?.message || t(T.launcherOld));
      c.notify(t(act === 'ivaoAppErase' ? T.ivaoAppErased : T.ivaoAppSaved), 'ok');
      return paintIvaoState(env, r.app?.ivao_oauth);
    }
    if (act === 'ivaoAppTest') {
      const r = await setup('secrets/test?service=ivao_oauth');
      return say('ivaoapp', r?.ok ? t(T.ivaoAppTestOk) : r?.key === 'missing' ? t(T.ivaoAppTestMissing) : t(T.ivaoAppTestFail), r?.ok ?
        'ok' : r?.key === 'missing' ? 'warn' : 'err');
    }
    if (act === 'histResume') {
      // historique réécrit : le plan d'abord (rien changé), une question, puis la reprise et une synchronisation
      const tri = c.identity().trigram || '';
      if (!tri) return say('hist', t(T.histNoTri), 'warn');
      say('hist', t(T.histReading), 'warn');
      const plan = await setup('sync-rewritten');
      if (!plan?.ok || !plan.rewritten) return say('hist', plan?.message || t(T.launcherOld), plan?.ok ? 'ok' : 'err');
      say('hist', '');
      const k = plan.kept?.length ? t(T.histKept, {
        k: plan.kept.length
      }) : '';
      if (!await c.ask(t(T.histAsk, {
          c: plan.commits,
          n: plan.files.length,
          p: plan.pending,
          k
        }))) return;
      say('hist', t(T.histReading), 'warn');
      const r = await setup('sync-rewritten', {
        author: tri
      });
      if (!r?.ok) return say('hist', r?.message || t(T.launcherOld), 'err');
      c.notify(t(T.histDone, {
        n: r.moved || 0
      }), r.sync?.ok ? 'ok' : 'warn');
      if (r.sync && !r.sync.ok) say('hist', r.sync.message || '', 'warn');
      return again();
    }
    if (act === 'remoteCheck' || act === 'remoteSave') {
      const url = val('remote', card('remote')),
        save = act === 'remoteSave';
      say('remote', t(!save ? T.remoteChecking : needsConfirm(url, 'remote') ? T.confirmWait : T.remoteSaving), 'warn');
      const r = await setup('sync-remote', {
        url,
        ...(save ? {
          save: true
        } : {})
      });
      const ck = r?.check || {},
        text = [r?.saved?.message, confirmOpen(r?.saved) ? t(T.confirmOpen) : '', ck.message].filter(Boolean).join(' — ') || '?';
      say('remote', text, r?.saved && !r.saved.ok ? 'err' : ck.ok ? 'ok' : 'warn');
      // enregistré : la ligne « Actuel » suit, le compte rendu de la vérification reste affiché
      if (save && r?.saved?.ok) {
        const now = card('remote').querySelector('[data-remote-now]');
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
    if (act === 'keyTest') {
      const r = await setup('secrets/test?service=ivao');
      return say('keys', r?.ok ? t(T.keyOk) : t(T.keyBad, {
        e: r?.error || '?'
      }), r?.ok ? 'ok' : 'err');
    }
  }

  (window.SogSettingsParts ||= {}).launcher = {
    acts: ['lanToggle', 'lanForget', 'lanCode', 'lanAll', 'keySave', 'keyErase', 'keyTest', 'eadSave', 'eadErase', 'ivaoCopy',
      'ivaoAppSave', 'ivaoAppTest', 'ivaoAppErase', 'remoteCheck',
      'remoteSave', 'gitClone',
      'gitAdopt', 'histResume'
    ],
    readRemote,
    accessHtml,
    remoteHtml,
    keysHtml,
    ivaoAppHtml,
    lanHtml,
    live,
    onClick,
    run
  };
})();
