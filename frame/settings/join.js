(() => {
  'use strict';
  // V3 — assistant « Rejoindre la compagnie » (frame/settings/SPEC.md § 7) : un pilote règle son appareil depuis la
  // configuration reçue (frame/settings/config.js), un écran par pas, sans rien savoir de git.
  //   1 la configuration reçue · 2 le compte (GitHub ou l'hôte du dépôt) · 3 l'invitation de l'administrateur · 4 le jeton,
  //   pas à pas (GitHub : classique « repo » pour le dépôt d'un utilisateur, à grain fin pour celui d'une organisation) · 5 coller le jeton, tester · 6 les identifiants réseau · 7 terminé (première synchronisation, données hors
  //   ligne, préparer un vol) ;
  //   · état gardé sur l'appareil (device/join.json : configuration, pas, cases « c'est fait », nom d'utilisateur ; jamais
  //     le jeton) pour reprendre plus tard ; les pas 2 à 5 sautés quand l'accès ne se règle pas ici (data/ du lanceur déjà
  //     ce dépôt ou un autre, hôte sans transport sans lanceur) ;
  //   · ouvert par la carte d'accueil, le lien de configuration et Réglages (#settings?join=1).
  // API : window.SogJoin = { STATE, load(own), save(own, s), start(own, cfg), render(view, h) } — h : aides des réglages.
  const STATE = 'device/join.json';
  const L4 = (fr, en, de, es) => [fr, en, de, es];
  const T = {
    title: L4('Rejoindre la compagnie', 'Join the airline', 'Der Fluggesellschaft beitreten', 'Unirse a la aerolínea'),
    stepOf: L4('Pas {n} sur {m}', 'Step {n} of {m}', 'Schritt {n} von {m}', 'Paso {n} de {m}'),
    back: L4('← Retour', '← Back', '← Zurück', '← Atrás'),
    next: L4('Suivant →', 'Next →', 'Weiter →', 'Siguiente →'),
    later: L4('Reprendre plus tard', 'Resume later', 'Später fortsetzen', 'Seguir más tarde'),
    laterHint: L4('Vos cases cochées restent sur cet appareil : Réglages › « Rejoindre la compagnie » reprend ici.',
      'Your ticked boxes stay on this device: Settings › “Join the airline” resumes here.',
      'Ihre Häkchen bleiben auf diesem Gerät: Einstellungen › „Der Fluggesellschaft beitreten“ setzt hier fort.',
      'Sus casillas marcadas quedan en este dispositivo: Ajustes › «Unirse a la aerolínea» continúa aquí.'),
    quit: L4('Abandonner', 'Give up', 'Abbrechen', 'Abandonar'),
    quitAsk: L4('Abandonner l’assistant ? Rien de ce qui est déjà réglé n’est défait.',
      'Give up the assistant? Nothing already set is undone.',
      'Den Assistenten abbrechen? Bereits Eingerichtetes bleibt.', '¿Abandonar el asistente? No se deshace nada de lo ya configurado.'
    ),
    done: L4('C’est fait', 'Done', 'Erledigt', 'Hecho'),
    // 0 : pas de configuration encore
    noCfg: L4('Ouvrez le lien reçu de votre compagnie, ou choisissez le fichier sog-config reçu.',
      'Open the link received from your airline, or choose the sog-config file received.',
      'Öffnen Sie den von Ihrer Fluggesellschaft erhaltenen Link oder wählen Sie die erhaltene sog-config-Datei.',
      'Abra el enlace recibido de su aerolínea, o elija el archivo sog-config recibido.'),
    choose: L4('Choisir le fichier…', 'Choose the file…', 'Datei wählen…', 'Elegir el archivo…'),
    // 1
    s1: L4('La configuration reçue', 'The configuration received', 'Die erhaltene Konfiguration', 'La configuración recibida'),
    s1Hint: L4(
      'Votre compagnie vous a préparé cette configuration. L’assistant règle cet appareil avec, pas à pas ; rien d’autre n’est changé.',
      'Your airline prepared this configuration for you. The assistant sets this device up with it, step by step; nothing else is changed.',
      'Ihre Fluggesellschaft hat diese Konfiguration für Sie vorbereitet. Der Assistent richtet dieses Gerät damit Schritt für Schritt ein; sonst wird nichts geändert.',
      'Su aerolínea le preparó esta configuración. El asistente configura este dispositivo con ella, paso a paso; no se cambia nada más.'
    ),
    airline: L4('Compagnie', 'Airline', 'Fluggesellschaft', 'Aerolínea'),
    repo: L4('Dépôt des données', 'Data repository', 'Datenrepository', 'Repositorio de datos'),
    trigram: L4('Votre trigramme', 'Your trigram', 'Ihr Kürzel', 'Su trigrama'),
    same: L4('Le dossier data/ de ce poste suit déjà ce dépôt : pas de compte ni de jeton à régler ici.',
      'This workstation’s data/ folder already follows this repository: no account or token to set here.',
      'Der Ordner data/ dieses Rechners folgt bereits diesem Repository: Hier sind kein Konto und kein Token einzurichten.',
      'La carpeta data/ de este puesto ya sigue este repositorio: no hay cuenta ni token que configurar aquí.'),
    other: L4('Le dossier data/ de ce poste suit un autre dépôt ({u}) : l’accès n’est pas changé ici (carte Accès des réglages).',
      'This workstation’s data/ folder follows another repository ({u}): access is not changed here (Settings’ Access card).',
      'Der Ordner data/ dieses Rechners folgt einem anderen Repository ({u}): Der Zugang wird hier nicht geändert (Karte Zugang der Einstellungen).',
      'La carpeta data/ de este puesto sigue otro repositorio ({u}): el acceso no se cambia aquí (tarjeta Acceso de los ajustes).'),
    none: L4(
      'Ce dépôt est sur {h} : sans lanceur, l’appli ne le joint pas. Faites l’accès sur un poste avec le lanceur ; ici, l’assistant règle votre identité.',
      'This repository is on {h}: without a launcher, the app cannot reach it. Set the access on a workstation with the launcher; here, the assistant sets your identity.',
      'Dieses Repository liegt auf {h}: Ohne Starter erreicht die App es nicht. Richten Sie den Zugang auf einem Rechner mit Starter ein; hier richtet der Assistent Ihre Identität ein.',
      'Este repositorio está en {h}: sin lanzador, la aplicación no lo alcanza. Configure el acceso en un puesto con el lanzador; aquí, el asistente configura su identidad.'
    ),
    // 2
    s2: L4('Votre compte {h}', 'Your {h} account', 'Ihr {h}-Konto', 'Su cuenta de {h}'),
    s2Ask: L4('Avez-vous déjà un compte {h} ?', 'Do you already have a {h} account?', 'Haben Sie bereits ein {h}-Konto?',
      '¿Ya tiene una cuenta de {h}?'),
    yes: L4('Oui', 'Yes', 'Ja', 'Sí'),
    no: L4('Non, je le crée', 'No, I create one', 'Nein, ich erstelle eines', 'No, la creo'),
    create: L4([
      'Ouvrez {signup} et remplissez : votre adresse mail, un mot de passe, un nom d’utilisateur.',
      'Choisissez un nom d’utilisateur simple, sans espace (par exemple votre trigramme suivi de votre nom) : vous le donnerez à l’administrateur.',
      '{h} vous envoie un code par mail : tapez-le pour vérifier l’adresse, puis revenez ici.'
    ], [
      'Open {signup} and fill in: your email address, a password, a username.',
      'Choose a simple username, without spaces (for example your trigram followed by your name): you will give it to the administrator.',
      '{h} emails you a code: type it to verify the address, then come back here.'
    ], [
      'Öffnen Sie {signup} und füllen Sie aus: Ihre E-Mail-Adresse, ein Passwort, einen Benutzernamen.',
      'Wählen Sie einen einfachen Benutzernamen ohne Leerzeichen (zum Beispiel Ihr Kürzel und Ihr Name): Sie geben ihn dem Administrator.',
      '{h} schickt Ihnen einen Code per E-Mail: Geben Sie ihn ein, um die Adresse zu bestätigen, und kommen Sie dann hierher zurück.'
    ], [
      'Abra {signup} y rellene: su dirección de correo, una contraseña, un nombre de usuario.',
      'Elija un nombre de usuario sencillo, sin espacios (por ejemplo su trigrama seguido de su nombre): se lo dará al administrador.',
      '{h} le envía un código por correo: escríbalo para verificar la dirección y vuelva aquí.'
    ]),
    user: L4('Votre nom d’utilisateur {h}', 'Your {h} username', 'Ihr {h}-Benutzername', 'Su nombre de usuario de {h}'),
    needUser: L4('Indiquez votre nom d’utilisateur pour continuer.', 'Give your username to continue.',
      'Geben Sie Ihren Benutzernamen an, um fortzufahren.',
      'Indique su nombre de usuario para continuar.'),
    // 3
    s3: L4('L’invitation', 'The invitation', 'Die Einladung', 'La invitación'),
    s3Give: L4('Donnez votre nom d’utilisateur « {u} » à l’administrateur de la compagnie : il vous invite sur le dépôt {r}.',
      'Give your username “{u}” to the airline’s administrator: they invite you to the repository {r}.',
      'Geben Sie Ihren Benutzernamen „{u}“ dem Administrator der Fluggesellschaft: Er lädt Sie in das Repository {r} ein.',
      'Dé su nombre de usuario «{u}» al administrador de la aerolínea: le invita al repositorio {r}.'),
    copyUser: L4('Copier mon nom', 'Copy my name', 'Meinen Namen kopieren', 'Copiar mi nombre'),
    copied: L4('Copié.', 'Copied.', 'Kopiert.', 'Copiado.'),
    s3Accept: L4(
      'Vous recevez alors un mail de GitHub : ouvrez-le et ACCEPTEZ l’invitation, ou ouvrez directement {inv}. Tant qu’elle n’est pas acceptée, le jeton ne voit pas le dépôt.',
      'You then receive an email from GitHub: open it and ACCEPT the invitation, or open {inv} directly. Until it is accepted, the token cannot see the repository.',
      'Sie erhalten dann eine E-Mail von GitHub: Öffnen Sie sie und NEHMEN Sie die Einladung AN, oder öffnen Sie direkt {inv}. Solange sie nicht angenommen ist, sieht das Token das Repository nicht.',
      'Recibirá entonces un correo de GitHub: ábralo y ACEPTE la invitación, o abra directamente {inv}. Mientras no esté aceptada, el token no ve el repositorio.'
    ),
    s3Gitlab: L4('L’administrateur vous ajoute au projet {w} avec le rôle Developer ; {h} vous prévient par mail.',
      'The administrator adds you to the project {w} with the Developer role; {h} tells you by email.',
      'Der Administrator fügt Sie dem Projekt {w} mit der Rolle Developer hinzu; {h} benachrichtigt Sie per E-Mail.',
      'El administrador le añade al proyecto {w} con el rol Developer; {h} le avisa por correo.'),
    s3Done: L4('Invitation acceptée', 'Invitation accepted', 'Einladung angenommen', 'Invitación aceptada'),
    s3DoneGitlab: L4('Ajouté au projet', 'Added to the project', 'Zum Projekt hinzugefügt', 'Añadido al proyecto'),
    s3Note: L4('L’accès se vérifie au pas 5, une fois le jeton créé.', 'The access is checked at step 5, once the token is created.',
      'Der Zugang wird in Schritt 5 geprüft, sobald das Token erstellt ist.',
      'El acceso se comprueba en el paso 5, una vez creado el token.'),
    // 4
    s4: L4('Le jeton', 'The token', 'Das Token', 'El token'),
    s4Hint: L4('Le jeton est la clé de cet appareil pour le dépôt ; il se crée sur {h} :',
      'The token is this device’s key to the repository; it is created on {h}:',
      'Das Token ist der Schlüssel dieses Geräts zum Repository; es wird auf {h} erstellt:',
      'El token es la llave de este dispositivo para el repositorio; se crea en {h}:'),
    // dépôt d'un utilisateur : un invité ne peut pas viser ce dépôt avec un jeton à grain fin → jeton classique « repo »
    ghClassic: L4([
      'Ouvrez {new} : un jeton « classique », déjà prérempli (ou : votre avatar › « Settings » › « Developer settings » › « Personal access tokens » › « Tokens (classic) » › « Generate new token (classic) »).',
      '« Note » : SOG Pilote. « Expiration » : « Custom », dans un an.',
      '« Select scopes » : « repo » seulement (déjà cochée).',
      '« Generate token », puis copiez le jeton tout de suite : il ne se revoit plus.'
    ], [
      'Open {new}: a “classic” token, already prefilled (or: your avatar › “Settings” › “Developer settings” › “Personal access tokens” › “Tokens (classic)” › “Generate new token (classic)”).',
      '“Note”: SOG Pilot. “Expiration”: “Custom”, in one year.',
      '“Select scopes”: “repo” only (already ticked).',
      '“Generate token”, then copy the token at once: it is never shown again.'
    ], [
      'Öffnen Sie {new}: ein „klassisches“ Token, bereits vorausgefüllt (oder: Ihr Avatar › „Settings“ › „Developer settings“ › „Personal access tokens“ › „Tokens (classic)“ › „Generate new token (classic)“).',
      '„Note“: SOG Pilot. „Expiration“: „Custom“, in einem Jahr.',
      '„Select scopes“: nur „repo“ (bereits angekreuzt).',
      '„Generate token“, dann kopieren Sie das Token sofort: Es wird nie wieder angezeigt.'
    ], [
      'Abra {new}: un token «clásico», ya rellenado (o: su avatar › «Settings» › «Developer settings» › «Personal access tokens» › «Tokens (classic)» › «Generate new token (classic)»).',
      '«Note»: SOG Pilot. «Expiration»: «Custom», dentro de un año.',
      '«Select scopes»: solo «repo» (ya marcada).',
      '«Generate token», y copie el token enseguida: no vuelve a mostrarse.'
    ]),
    classicNote: L4(
      'Ce dépôt appartient à un utilisateur : GitHub n’y permet pas de jeton limité à ce seul dépôt. Le jeton classique ouvre tous les dépôts de votre compte ; si ce compte en a d’autres, créez plutôt un compte GitHub dédié au vol (pas 2).',
      'This repository belongs to a user: GitHub does not allow a token limited to it. The classic token opens all the repositories of your account; if that account has others, create a GitHub account dedicated to flying instead (step 2).',
      'Dieses Repository gehört einem Benutzer: GitHub erlaubt kein darauf beschränktes Token. Das klassische Token öffnet alle Repositorys Ihres Kontos; hat dieses Konto weitere, erstellen Sie besser ein eigenes GitHub-Konto nur für das Fliegen (Schritt 2).',
      'Este repositorio pertenece a un usuario: GitHub no permite un token limitado a él. El token clásico abre todos los repositorios de su cuenta; si esa cuenta tiene otros, cree mejor una cuenta de GitHub dedicada al vuelo (paso 2).'
    ),
    dedicated: L4(
      'Le jeton de ce dépôt ouvrira tous les dépôts du compte : si votre compte GitHub a déjà d’autres dépôts, créez-en un dédié au vol.',
      'This repository’s token will open all the repositories of the account: if your GitHub account already has other repositories, create one dedicated to flying.',
      'Das Token dieses Repositorys öffnet alle Repositorys des Kontos: Hat Ihr GitHub-Konto schon weitere Repositorys, erstellen Sie ein eigenes nur für das Fliegen.',
      'El token de este repositorio abrirá todos los repositorios de la cuenta: si su cuenta de GitHub ya tiene otros repositorios, cree una dedicada al vuelo.'
    ),
    ghSteps: L4([
      'Ouvrez {new} (ou : votre avatar › « Settings » › « Developer settings » › « Personal access tokens » › « Fine-grained tokens » › « Generate new token »).',
      '« Token name » : SOG Pilote. « Expiration » : « Custom », dans un an.',
      '« Resource owner » : {owner} (l’organisation). « Repository access » : « Only select repositories », puis {repo}.',
      '« Permissions » › « Repository permissions » › « Contents » : « Read and write ».',
      '« Generate token », puis copiez le jeton tout de suite : il ne se revoit plus.'
    ], [
      'Open {new} (or: your avatar › “Settings” › “Developer settings” › “Personal access tokens” › “Fine-grained tokens” › “Generate new token”).',
      '“Token name”: SOG Pilot. “Expiration”: “Custom”, in one year.',
      '“Resource owner”: {owner} (the organisation). “Repository access”: “Only select repositories”, then {repo}.',
      '“Permissions” › “Repository permissions” › “Contents”: “Read and write”.',
      '“Generate token”, then copy the token at once: it is never shown again.'
    ], [
      'Öffnen Sie {new} (oder: Ihr Avatar › „Settings“ › „Developer settings“ › „Personal access tokens“ › „Fine-grained tokens“ › „Generate new token“).',
      '„Token name“: SOG Pilot. „Expiration“: „Custom“, in einem Jahr.',
      '„Resource owner“: {owner} (die Organisation). „Repository access“: „Only select repositories“, dann {repo}.',
      '„Permissions“ › „Repository permissions“ › „Contents“: „Read and write“.',
      '„Generate token“, dann kopieren Sie das Token sofort: Es wird nie wieder angezeigt.'
    ], [
      'Abra {new} (o: su avatar › «Settings» › «Developer settings» › «Personal access tokens» › «Fine-grained tokens» › «Generate new token»).',
      '«Token name»: SOG Pilot. «Expiration»: «Custom», dentro de un año.',
      '«Resource owner»: {owner} (la organización). «Repository access»: «Only select repositories», luego {repo}.',
      '«Permissions» › «Repository permissions» › «Contents»: «Read and write».',
      '«Generate token», y copie el token enseguida: no vuelve a mostrarse.'
    ]),
    glSteps: L4([
      'Ouvrez {new} (votre avatar › « Edit profile » › « Access tokens »), puis « Add new token ».',
      '« Token name » : SOG Pilote. « Expiration date » : dans un an.',
      '« Select scopes » : write_repository (et read_repository).',
      '« Create personal access token », puis copiez le jeton tout de suite : il ne se revoit plus.'
    ], [
      'Open {new} (your avatar › “Edit profile” › “Access tokens”), then “Add new token”.',
      '“Token name”: SOG Pilot. “Expiration date”: in one year.',
      '“Select scopes”: write_repository (and read_repository).',
      '“Create personal access token”, then copy the token at once: it is never shown again.'
    ], [
      'Öffnen Sie {new} (Ihr Avatar › „Edit profile“ › „Access tokens“), dann „Add new token“.',
      '„Token name“: SOG Pilot. „Expiration date“: in einem Jahr.',
      '„Select scopes“: write_repository (und read_repository).',
      '„Create personal access token“, dann kopieren Sie das Token sofort: Es wird nie wieder angezeigt.'
    ], [
      'Abra {new} (su avatar › «Edit profile» › «Access tokens»), luego «Add new token».',
      '«Token name»: SOG Pilot. «Expiration date»: dentro de un año.',
      '«Select scopes»: write_repository (y read_repository).',
      '«Create personal access token», y copie el token enseguida: no vuelve a mostrarse.'
    ]),
    s4Done: L4('Jeton copié', 'Token copied', 'Token kopiert', 'Token copiado'),
    howto: L4('Le mode d’emploi de votre compagnie', 'Your airline’s how-to', 'Die Anleitung Ihrer Fluggesellschaft',
      'Las instrucciones de su aerolínea'),
    // 5
    s5: L4('Coller le jeton', 'Paste the token', 'Das Token einfügen', 'Pegar el token'),
    s5Hint: L4(
      'Collez le jeton copié, puis « Tester ». Il reste sur cet appareil seulement et n’est jamais réaffiché ; ne l’envoyez jamais dans un message.',
      'Paste the copied token, then “Test”. It stays on this device only and is never shown again; never send it in a message.',
      'Fügen Sie das kopierte Token ein, dann „Testen“. Es bleibt nur auf diesem Gerät und wird nie wieder angezeigt; senden Sie es nie in einer Nachricht.',
      'Pegue el token copiado y luego «Probar». Queda solo en este dispositivo y nunca vuelve a mostrarse; no lo envíe nunca en un mensaje.'
    ),
    token: L4('Jeton', 'Token', 'Token', 'Token'),
    test: L4('Tester', 'Test', 'Testen', 'Probar'),
    clone: L4('Cloner avec le jeton', 'Clone with the token', 'Mit dem Token klonen', 'Clonar con el token'),
    testing: L4('Test…', 'Testing…', 'Test…', 'Probando…'),
    ok: L4('Accès vérifié : le dépôt répond, branche {b}. Enregistré sur cet appareil.',
      'Access checked: the repository answers, branch {b}. Saved on this device.',
      'Zugang geprüft: Das Repository antwortet, Zweig {b}. Auf diesem Gerät gespeichert.',
      'Acceso comprobado: el repositorio responde, rama {b}. Guardado en este dispositivo.'),
    e404: L4(
      'Le dépôt ne répond pas à ce jeton : l’invitation n’est pas encore acceptée (pas 3), ou le jeton ne couvre pas ce dépôt (pas 4).',
      'The repository does not answer this token: the invitation is not accepted yet (step 3), or the token does not cover this repository (step 4).',
      'Das Repository antwortet diesem Token nicht: Die Einladung ist noch nicht angenommen (Schritt 3), oder das Token deckt dieses Repository nicht ab (Schritt 4).',
      'El repositorio no responde a este token: la invitación aún no está aceptada (paso 3), o el token no cubre este repositorio (paso 4).'
    ),
    e401: L4('Jeton refusé : mal copié, ou expiré. Recopiez-le, ou créez-en un autre (pas 4).',
      'Token refused: copied wrongly, or expired. Copy it again, or create another one (step 4).',
      'Token abgelehnt: falsch kopiert oder abgelaufen. Kopieren Sie es erneut oder erstellen Sie ein neues (Schritt 4).',
      'Token rechazado: mal copiado, o caducado. Cópielo de nuevo, o cree otro (paso 4).'),
    e403: L4(
      'Jeton sans droit sur le dépôt : classique, la case « repo » doit être cochée ; à grain fin, « Contents » doit être « Read and write » (pas 4).',
      'Token without rights on the repository: classic, the “repo” box must be ticked; fine-grained, “Contents” must be “Read and write” (step 4).',
      'Token ohne Rechte am Repository: klassisch muss „repo“ angekreuzt sein; feingranular muss „Contents“ „Read and write“ sein (Schritt 4).',
      'Token sin derechos sobre el repositorio: clásico, la casilla «repo» debe estar marcada; de grano fino, «Contents» debe ser «Read and write» (paso 4).'
    ),
    offline: L4('Hors ligne : reconnectez l’appareil, puis « Tester ».', 'Offline: reconnect the device, then “Test”.',
      'Offline: Verbinden Sie das Gerät wieder, dann „Testen“.',
      'Sin conexión: vuelva a conectar el dispositivo y luego «Probar».'),
    replace: L4('Cet appareil a déjà un accès ({r}) : le remplacer ?', 'This device already has an access ({r}): replace it?',
      'Dieses Gerät hat bereits einen Zugang ({r}): ersetzen?',
      'Este dispositivo ya tiene un acceso ({r}): ¿reemplazarlo?'),
    needTest: L4('Testez le jeton pour continuer.', 'Test the token to continue.', 'Testen Sie das Token, um fortzufahren.',
      'Pruebe el token para continuar.'),
    // 6
    s6: L4('Vos identifiants réseau', 'Your network IDs', 'Ihre Netzwerk-IDs', 'Sus identificadores de red'),
    s6Hint: L4('Facultatifs : ils servent à reprendre vos vols IVAO ou VATSIM et votre dernier plan SimBrief.',
      'Optional: they are used to take your IVAO or VATSIM flights and your last SimBrief plan.',
      'Optional: Sie dienen dazu, Ihre IVAO- oder VATSIM-Flüge und Ihren letzten SimBrief-Plan zu übernehmen.',
      'Opcionales: sirven para recuperar sus vuelos de IVAO o VATSIM y su último plan de SimBrief.'),
    // 7
    s7: L4('Terminé', 'Done', 'Fertig', 'Terminado'),
    finish: L4('Terminer et synchroniser', 'Finish and synchronise', 'Abschließen und synchronisieren', 'Terminar y sincronizar'),
    finishing: L4('Synchronisation…', 'Synchronising…', 'Synchronisation…', 'Sincronizando…'),
    synced: L4('Cet appareil est réglé et a fait sa première synchronisation.',
      'This device is set up and has run its first synchronisation.',
      'Dieses Gerät ist eingerichtet und hat seine erste Synchronisation ausgeführt.',
      'Este dispositivo está configurado y ha hecho su primera sincronización.'),
    syncErr: L4('Cet appareil est réglé ; la première synchronisation n’est pas encore faite ({e}) : elle reprendra seule.',
      'This device is set up; the first synchronisation is not done yet ({e}): it will resume by itself.',
      'Dieses Gerät ist eingerichtet; die erste Synchronisation ist noch nicht erfolgt ({e}): Sie wird von selbst fortgesetzt.',
      'Este dispositivo está configurado; la primera sincronización aún no está hecha ({e}): se reanudará sola.'),
    idOnly: L4('Votre identité est réglée ; l’accès au dépôt reste à faire sur un poste avec le lanceur.',
      'Your identity is set; the repository access is still to be done on a workstation with the launcher.',
      'Ihre Identität ist eingerichtet; der Repository-Zugang steht noch aus, auf einem Rechner mit Starter.',
      'Su identidad está configurada; falta el acceso al repositorio en un puesto con el lanzador.'),
    nextOffline: L4('Gardez hors ligne la zone de vos vols : la carte et les terrains seront là même sans réseau.',
      'Keep the area of your flights offline: the map and the airfields will be there even without network.',
      'Halten Sie das Gebiet Ihrer Flüge offline bereit: Karte und Flugplätze sind dann auch ohne Netz da.',
      'Guarde sin conexión la zona de sus vuelos: el mapa y los aeródromos estarán ahí incluso sin red.'),
    goOffline: L4('Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'),
    goFuel: L4('Préparer un vol', 'Prepare a flight', 'Einen Flug vorbereiten', 'Preparar un vuelo'),
    tutorial: L4('Le tutoriel « Préparer un vol »', 'The “Prepare a flight” tutorial', 'Das Tutorial „Einen Flug vorbereiten“',
      'El tutorial «Preparar un vuelo»')
  };

  /** État de l'assistant (device/join.json) ; {} sans assistant en cours. */
  const load = async own => (await own.get(STATE).catch(() => null)) || {};
  /** Enregistre l'état (jamais de jeton). */
  const save = (own, s) => own.put(STATE, {
    ...s,
    updated_at: new Date().toISOString()
  });
  /** Commence (ou recommence) avec une configuration vérifiée : pas 1, cases vides. */
  const start = (own, cfg) => save(own, {
    cfg,
    step: 1,
    done: {}
  });

  /** Pas utiles pour cet accès : tous, ou 1, 6, 7 quand l'accès ne se règle pas ici. */
  const stepsFor = access => ['github', 'clone', 'adopt'].includes(access) ? [1, 2, 3, 4, 5, 6, 7] : [1, 6, 7];

  /** Dessine l'assistant dans view. h : { t, esc, fld, own, FD, c, access, remote, L, setup, sameRepo, confirmOpen, airlineDoc,
   *  AIRLINE, howtoHtml, again, pick (choix de fichier), linkify }. */
  async function render(view, h) {
    const {
      t,
      esc
    } = h;
    const s = await load(h.own),
      cfg = s.cfg;
    const head = `<p class="f-back"><a href="#settings">${esc(t(['← Réglages', '← Settings', '← Einstellungen', '← Ajustes']))}</a></p><h1>${esc(t(T.title))}</h1>`;
    if (!cfg) {
      view.innerHTML = `${head}<div class="f-card" data-card="join"><p>${esc(t(T.noCfg))}</p><div class="f-row"><button type="button" class="primary" data-jact="pick">${esc(t(T.choose))}</button></div></div>`;
      view.querySelector('[data-jact="pick"]').onclick = () => h.pick();
      return;
    }
    const d = cfg.data,
      lk = d ? SogConfig.links(d) : null,
      kind = lk ? lk.kind : 'other',
      host = lk ? lk.host : '',
      classic = kind === 'github' && d?.ownerType !== 'Organization', // dépôt d'un utilisateur (ou propriétaire inconnu)
      steps = stepsFor(h.access),
      step = steps.includes(s.step) ? s.step : steps[0],
      idx = steps.indexOf(step),
      done = s.done || {};
    const web = lk ? lk.web : '',
      a = cfg.airline || {};
    const {
      link,
      fill
    } = window.SogSettingsKit;
    const list = (row, v) => `<ol class="f-join-steps">${(row[['fr', 'en', 'de', 'es'].indexOf(t(['fr', 'en', 'de', 'es']))] || row[0]).map(r => `<li>${fill(t([r]), v)}</li>`).join('')}</ol>`,
      check = (k, row) => `<label class="f-check"><input type="checkbox" data-jdone="${k}" ${done[k] ? 'checked' : ''}>${esc(t(row))}</label>`;
    const V = {
      h: esc(host),
      signup: link(lk ? lk.signup : ''),
      repo: esc(d?.repo || ''),
      owner: esc(d?.repo.split('/')[0] || ''),
      inv: link(lk ? lk.invitations : ''),
      w: link(web),
      new: link(lk ? lk.tokenNew : '')
    };
    let body = '';
    if (step === 1) {
      const note = {
        same: t(T.same),
        other: t(T.other, {
          u: h.remote?.url || '?'
        }),
        none: t(T.none, {
          h: d?.host || '?'
        })
      } [h.access];
      body = `<p>${esc(t(T.s1Hint))}</p><dl class="f-dl">${a.name || a.site ? `<dt>${esc(t(T.airline))}</dt><dd>${esc([a.name, a.site].filter(Boolean).join(' — '))}</dd>` : ''}${d ? `<dt>${esc(t(T.repo))}</dt><dd>${esc(`${d.host}/${d.repo}`)}</dd>` : ''}<dt>${esc(t(T.trigram))}</dt><dd>${esc(cfg.identity.trigram)}</dd></dl>${note ? `<p class="f-warn">${esc(note)}</p>` : ''}`;
    }
    if (step === 2) body = `<p><b>${fill(t(T.s2Ask), V)}</b></p>
      <div class="f-row"><label class="f-check"><input type="radio" name="jAcc" data-jacc="yes" ${s.account === 'yes' ? 'checked' : ''}>${esc(t(T.yes))}</label><label class="f-check"><input type="radio" name="jAcc" data-jacc="no" ${s.account === 'no' ? 'checked' : ''}>${esc(t(T.no))}</label></div>
      ${classic ? `<p class="f-warn">${esc(t(T.dedicated))}</p>` : ''}${s.account === 'no' ? list(T.create, V) : ''}${s.account ? h.fld('jUser', [t(T.user).replace('{h}', host)], s.user || '') : ''}`;
    if (step === 3) body = `<p>${fill(t(T.s3Give), { u: esc(s.user || '?'), r: esc(d.repo) })}</p><div class="f-row"><button type="button" data-jact="copyUser">${esc(t(T.copyUser))}</button></div>
      <p>${kind === 'github' ? fill(t(T.s3Accept), V) : fill(t(T.s3Gitlab), V)}</p>${check(3, kind === 'github' ? T.s3Done : T.s3DoneGitlab)}<p class="f-muted">${esc(t(T.s3Note))}</p>`;
    if (step === 4) {
      const how = cfg.howto?.token || {},
        text = how[t(['fr', 'en', 'de', 'es'])] || how.fr || '';
      body = `<p>${fill(t(T.s4Hint), V)}</p>${list(classic ? T.ghClassic : kind === 'github' ? T.ghSteps : T.glSteps, V)}${classic ? `<p class="f-warn">${esc(t(T.classicNote))}</p>` : ''}${check(4, T.s4Done)}
        ${text ? `<details class="f-cfghow"><summary>${esc(t(T.howto))}</summary><div class="f-doc">${h.howtoHtml(text)}</div></details>` : ''}`;
    }
    if (step === 5) body = `<p>${esc(t(T.s5Hint))}</p>${h.fld('jToken', T.token, '', { type: 'password' })}<p class="f-msg" data-msg>${done[5] ? esc(t(T.ok, { b: d.branch })) : ''}</p>
      <div class="f-row"><button type="button" class="primary" data-jact="test">${esc(t(h.access === 'github' ? T.test : T.clone))}</button></div>`;
    if (step === 6) {
      const id = h.c.identity();
      body = `<p class="f-muted">${esc(t(T.s6Hint))}</p>${h.fld('jIvao', ['VID IVAO', 'IVAO VID', 'IVAO-VID', 'VID IVAO'], id.ivao, { mode: 'numeric' })}${h.fld('jVatsim', ['CID VATSIM', 'VATSIM CID', 'VATSIM-CID', 'CID VATSIM'], id.vatsim, { mode: 'numeric' })}${h.fld('jSimbrief', ['Identifiant SimBrief (nom ou numéro)', 'SimBrief ID (name or number)', 'SimBrief-ID (Name oder Nummer)', 'ID de SimBrief (nombre o número)'], id.simbrief)}<p class="f-msg" data-msg></p>`;
    }
    if (step === 7) body = s.finished ? `<p><b>${esc(s.result || '')}</b></p><p>${esc(t(T.nextOffline))}</p>
      <div class="f-row"><a class="f-btn primary" href="#settings?offline=1">${esc(t(T.goOffline))}</a><a class="f-btn" href="#fuel">${esc(t(T.goFuel))}</a></div><p><a href="#help?t=prepare-flight">${esc(t(T.tutorial))}</a></p>` :
      `<p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-jact="finish">${esc(t(T.finish))}</button></div>`;
    const titles = {
      1: T.s1,
      2: T.s2,
      3: T.s3,
      4: T.s4,
      5: T.s5,
      6: T.s6,
      7: T.s7
    };
    const nav = step === 7 && s.finished ? '' : `<div class="f-row f-join-nav">${idx > 0 ? `<button type="button" data-jact="back">${esc(t(T.back))}</button>` : ''}${step < 7 ? `<button type="button" class="primary" data-jact="next">${esc(t(T.next))}</button>` : ''}</div>`;
    view.innerHTML = `${head}<div class="f-card" data-card="join" data-step="${step}"><p class="f-muted">${esc(t(T.stepOf, { n: idx + 1, m: steps.length }))}</p>
      <h2>${fill(t(titles[step]), V)}</h2>${body}${nav}</div>
      ${s.finished ? '' : `<p class="f-muted">${esc(t(T.laterHint))}</p><div class="f-row"><button type="button" data-jact="quit">${esc(t(T.quit))}</button></div>`}`;

    const card = view.querySelector('[data-card="join"]'),
      say = (text, kind = 'err') => {
        const m = card.querySelector('[data-msg]');
        if (m) {
          m.textContent = text;
          m.dataset.kind = kind;
        }
      },
      val = k => card.querySelector(`[data-f="${k}"]`)?.value.trim() ?? '',
      go = async n => {
        await save(h.own, {
          ...(await load(h.own)),
          step: n
        });
        await render(view, h);
        scrollTo(0, 0);
      };
    card.querySelectorAll('[data-jacc]').forEach(i => i.addEventListener('change', async () => {
      await save(h.own, {
        ...(await load(h.own)),
        account: i.dataset.jacc,
        user: val('jUser') || s.user || ''
      });
      render(view, h);
    }));
    card.querySelectorAll('[data-jdone]').forEach(i => i.addEventListener('change', async () => {
      const cur = await load(h.own);
      await save(h.own, {
        ...cur,
        done: {
          ...(cur.done || {}),
          [i.dataset.jdone]: i.checked
        }
      });
    }));
    view.onclick = async e => {
      const b = e.target.closest('[data-jact]');
      if (!b) return;
      const act = b.dataset.jact,
        cur = await load(h.own);
      if (act === 'quit') {
        if (!await h.c.ask(t(T.quitAsk))) return;
        await h.own.put(STATE, {
          quit: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        location.hash = '#settings';
        return;
      }
      if (act === 'back') return go(steps[idx - 1]);
      if (act === 'copyUser') {
        const how = await h.copy(cur.user || '', {
          near: b.closest('.f-row')
        });
        return h.c.notify(t(how === 'shown' ? h.copyShown : T.copied), how === 'shown' ? 'warn' : 'ok');
      }
      if (act === 'next') {
        if (step === 2) {
          const u = val('jUser').replace(/^@/, '');
          if (!u) return h.c.notify(t(T.needUser), 'warn');
          await save(h.own, {
            ...cur,
            user: u
          });
        }
        if (step === 5 && !cur.done?.[5]) return say(t(T.needTest), 'warn');
        if (step === 6) {
          const ivao = val('jIvao'),
            vatsim = val('jVatsim');
          if ((ivao && !/^\d+$/.test(ivao)) || (vatsim && !/^\d+$/.test(vatsim))) return say(t([
            'VID / CID : des chiffres seulement.',
            'VID / CID: digits only.', 'VID / CID: nur Ziffern.', 'VID / CID: solo cifras.'
          ]));
          await h.own.put('device/identity.json', {
            ...h.c.identity(),
            trigram: cfg.identity.trigram,
            ivao,
            vatsim,
            simbrief: val('jSimbrief'),
            updated_at: new Date().toISOString()
          });
          await h.c.reload();
        }
        return go(steps[idx + 1]);
      }
      if (act === 'test') {
        const f = card.querySelector('[data-f="jToken"]'),
          token = f?.value.trim() || '';
        if (!token) return say(t(T.needTest), 'warn');
        say(t(T.testing), 'warn');
        if (h.access === 'github') {
          const g = {
            repo: d.repo,
            branch: d.branch,
            token,
            ...(d.api ? {
              api: d.api
            } : {})
          };
          try {
            await h.FD.github(g).head();
          } catch (err) {
            return say(err?.offline ? t(T.offline) : err?.status === 404 ? t(T.e404) : err?.status === 401 ? t(T.e401) : err
              ?.status === 403 ? t(T.e403) : err?.message || String(err),
              err?.offline ? 'warn' : 'err');
          }
          const old = h.FD.github.config();
          if (old && old.repo !== d.repo && !await h.c.ask(t(T.replace, {
              r: old.repo
            }))) return say('');
          h.FD.github.save(g);
        } else {
          // poste : le lanceur clone (ou reprend) data/ avec le jeton ; il peut demander confirmation dans sa fenêtre
          b.disabled = true;
          const r = await h.setup(h.access, {
            url: SogConfig.cloneUrl(d),
            user: kind === 'github' ? 'x-access-token' : 'oauth2',
            secret: token,
            remember: true,
            author: cfg.identity.trigram
          });
          b.disabled = false;
          if (!r?.ok) return say([r?.message || '?', h.confirmOpen(r) ? t([
            'Cherchez la fenêtre de confirmation derrière les autres.',
            'Look for the confirmation window behind the others.',
            'Suchen Sie das Bestätigungsfenster hinter den anderen.',
            'Busque la ventana de confirmación detrás de las demás.'
          ]) : ''].filter(Boolean).join(' '));
          await h.c.redetect?.();
        }
        if (f) f.value = ''; // le jeton ne reste pas dans la page
        await save(h.own, {
          ...cur,
          done: {
            ...(cur.done || {}),
            5: true
          }
        });
        return say(t(T.ok, {
          b: d.branch
        }), 'ok');
      }
      if (act === 'finish') {
        b.disabled = true;
        say(t(T.finishing), 'warn');
        const linked = h.access === 'same' || (['github', 'clone', 'adopt'].includes(h.access) && cur.done?.[5]);
        await h.own.put('device/identity.json', {
          ...h.c.identity(),
          trigram: cfg.identity.trigram,
          updated_at: new Date().toISOString()
        });
        if (linked && cfg.usages) {
          const u = {
            ...h.c.usages(),
            ...cfg.usages,
            updated_at: new Date().toISOString()
          };
          u.single = !(u.devices || u.users || u.backend);
          await h.own.put('device/usages.json', u);
        }
        await h.c.reload();
        let result = t(T.idOnly);
        if (linked) {
          const r = await h.c.syncNow(true).catch(e => ({
            error: e?.message || String(e)
          }));
          result = r?.error ? t(T.syncErr, {
            e: r.error
          }) : t(T.synced);
          // la compagnie : écrite seulement si le dépôt n'en a pas encore (celle du dépôt prime)
          if (!r?.error && cfg.airline?.name) {
            const A = h.airlineDoc(h.FD);
            if (!(await A.get(h.AIRLINE, {
                wait: true
              }).catch(() => null))) {
              await A.put(h.AIRLINE, {
                ...cfg.airline,
                schema: 1,
                updated_at: new Date().toISOString(),
                by: cfg.identity.trigram
              });
              await h.c.syncNow(true).catch(() => null);
            }
          }
        }
        await save(h.own, {
          ...(await load(h.own)),
          finished: new Date().toISOString(),
          result
        });
        return render(view, h);
      }
    };
  }

  window.SogJoin = {
    STATE,
    load,
    save,
    start,
    stepsFor,
    render,
    T
  };
})();
