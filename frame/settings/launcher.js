(() => {
  'use strict';
  // V3 — Réglages, cartes du lanceur (frame/settings/SPEC.md § 3.6, 3.9, 3.9c) : la carte Accès d'un poste servi par le
  // lanceur (dépôt distant de data/, ou la porte pour le prendre en git), les clés d'API de la compagnie (IVAO), l'accès du
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
      'Un code sert une seule fois et dure 10 minutes. 5 essais par minute et par appareil ; après 30 codes faux en une heure, l’appairage se ferme jusqu’au prochain « Nouveau code ».',
      'A code works only once and lasts 10 minutes. 5 tries a minute per device; after 30 wrong codes in an hour, pairing closes until the next “New code”.',
      'Ein Code gilt nur einmal und 10 Minuten. 5 Versuche pro Minute und Gerät; nach 30 falschen Codes in einer Stunde schließt sich die Kopplung bis zum nächsten „Neuer Code“.',
      'Un código sirve una sola vez y dura 10 minutos. 5 intentos por minuto y dispositivo; tras 30 códigos erróneos en una hora, la vinculación se cierra hasta el siguiente «Código nuevo».'
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
  /** État de la clé IVAO du lanceur : { set, hint, env } ; null sans réponse. */
  async function launcherKey() {
    return (await setup('secrets'))?.app?.ivao?.apiKey || null;
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
    return `<div data-card="remote"><p data-remote-now>${esc(remote.url ? (/^[\w./-]+$/.test(remote.branch || '') ? t(T.remoteNow, { u: remote.url, b: remote.branch }) : t(T.remoteNowBare, { u: remote.url })) : t(T.remoteNone))}</p>
        ${fld('remote', T.remoteUrl, remote.url || remote.default || '')}<p class="f-msg" data-msg></p>
        <div class="f-row"><button type="button" class="primary" data-act="remoteSave">${esc(t(T.save))}</button><button type="button" data-act="remoteCheck">${esc(t(T.remoteCheck))}</button></div><p class="f-muted" data-confirm-hint hidden>${esc(t(T.confirmHint))}</p></div>`;
  }
  /** Volet « Clés d'API de la compagnie » de la carte Administration : la clé IVAO, gardée par le lanceur. */
  function keysHtml(env) {
    const {
      t,
      fld
    } = env;
    return `<div data-card="keys"><p>${esc(t(T.pair, { k: t(T.ivaoKey) }))} <b data-key>…</b></p>${fld('ivaoKey', T.keyNew, '', { type: 'password' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="keySave">${esc(t(T.save))}</button><button type="button" data-act="keyTest">${esc(t(T.test))}</button><button type="button" data-act="keyErase">${esc(t(T.erase))}</button></div></div>`;
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
        devs = (s.paired || []).map(d => `<div class="f-row"><span>${esc(d.label)} — ${esc(d.at ? c.time?.fmtDateZ(d.at) || d.at : '?')}</span><button type="button" data-forget="${esc(d.id)}" data-label="${esc(d.label)}">${esc(t(T.lanForgetOne))}</button></div>`).join('');
      let qr = '';
      if (s.on && url && window.SogQR) try {
        qr = `<figure class="f-qr"><div>${SogQR.svg(url, { ecl: 'M', scale: 4 })}</div><figcaption class="f-muted">${esc(t(T.lanQr))}</figcaption></figure>`;
      } catch {
        qr = ''; // adresse trop longue pour un code QR : elle reste écrite
      }
      box.innerHTML = `<dl class="f-dl">${row(T.lanState, esc(t(s.on ? T.lanOn : T.lanOff)))}${s.on ? row(T.lanUrl, `<b>${esc(url)}</b>`) +
        (s.urls.length > 1 ? row(T.lanOther, esc(s.urls.slice(1).join(', '))) : '') + row(T.lanCode, code) : ''}${row(T.lanDevices, esc(String(s.devices ?? 0)))}</dl>${devs}${qr}${s.on ? `<p class="f-muted">${esc(t(T.lanCodeHint))}</p>` : ''}${s.on && closed.length ? `<p class="f-muted">${esc(t(T.lanOtherClosed, { u: closed.join(', ') }))}</p><div class="f-row"><button type="button" data-act="lanAll">${esc(t(T.lanOpenAll))}</button></div>` : ''}`;
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
    if (L && view.querySelector('[data-key]')) launcherKey().then(k => { // volet des clés : niveau Complet seulement
      const b = view.querySelector('[data-key]');
      if (b) b.textContent = !k?.set ? t(T.keyMissing) : t(k.env ? T.keyEnv : T.keySet, {
        h: k.hint || '••••'
      });
    });

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
    acts: ['lanToggle', 'lanForget', 'lanCode', 'lanAll', 'keySave', 'keyErase', 'keyTest', 'remoteCheck', 'remoteSave', 'gitClone',
      'gitAdopt'
    ],
    readRemote,
    accessHtml,
    remoteHtml,
    keysHtml,
    lanHtml,
    live,
    onClick,
    run
  };
})();
