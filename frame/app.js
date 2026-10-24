(() => {
  'use strict';
  // V3 frame — squelette d'une application (frame/SPEC.md § 3, frame/INTEGRATION.md) : l'appli Pilote.
  //   · navigation : un verbe court par module (sept au plus), colonne à gauche sur écran ; sur téléphone, une barre
  //     d'onglets en bas (APP.tabs : Préparer · Carte · CR · Vols · Réglages, un onglet = un groupe de modules) ;
  //     l'adresse (#module, #module?clé=valeur : la suite après « ? » est donnée au module en ctx.query) suffit à
  //     revenir sur un écran ; écrans du cadre : #conflicts, #settings (#device : ancien nom, même écran) ;
  //   · chargeur : modules/<id>/module.js chargé à la demande (import()), qui exporte meta, mount(el, ctx) et
  //     unmount() ; ctx = { data (adaptateur de la couche de données, préfixes déclarés dans meta), aerodb (service
  //     unique), t, lang, notify, ask, askText, net, identity et airline (lecture seule), query } ; un module ne charge aucune feuille de
  //     style globale : il se sert des jetons du cadre (frame/frame.css, --sog-…) ;
  //   · synchronisation : bouton avec son état (à jour, n en attente, en cours, hors ligne, conflits, erreur, cet
  //     appareil seul) ; clic : synchroniser, ou l'écran des conflits s'il y en a ;
  //   · transport : page servie par un lanceur → son data/ est le stockage de l'appareil (lanceur ; échange git
  //     seulement si « plusieurs appareils » ou « plusieurs utilisateurs » est coché dans device/usages.json, écrit par
  //     l'écran des réglages) ; sans lanceur : aucun usage d'échange coché → local seul, sinon GitHub s'il est réglé ;
  //   · identité (device/identity.json : trigramme, VID IVAO, CID VATSIM, identifiant SimBrief) passée aux modules en
  //     lecture seule, objet vide en son absence ;
  //   · niveau d'usage (device/level.json, choisi dans les réglages : 1 découverte, 2 courant par défaut, 3 complet) : le
  //     menu ne montre que les modules dont meta.level est inférieur ou égal ; un module caché reste joignable par son
  //     adresse ;
  //   · hors ligne : service worker du cadre (frame/sw.js : le cadre et les modules gardés, nouvelle version proposée au
  //     rechargement), appels sortants des modules relayés par le lanceur s'il y en a un (ctx.net).
  const FD = window.FrameData;
  // heures de l'appli : UTC suffixée Z (frame/lib/time.js) ; module chargé en même temps que le reste du démarrage
  let TZ = null;
  const timeP = import(new URL('lib/time.js?v=0', document.currentScript.src).href).then(m => TZ = m).catch(e => console
    .warn('time', e));
  /** Heure de l'appli : fmtZ (« 16:30Z »), fmtZLocal (« 16:30Z (18:30) »), fmtDateZ (date UTC et heure Z). */
  const tz = (fn, iso) => TZ?.[fn]?.(iso, lang()) ?? '';
  const ROOT = new URL('../', document.currentScript.src).href;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  // ---------------------------------------------------------------- l'application
  const APP = {
    id: 'pilot',
    name: ['Pilote', 'Pilot', 'Pilot', 'Piloto'],
    // un module = un verbe ; sept au plus
    modules: [{
      id: 'fuel',
      label: ['Carburant', 'Fuel', 'Kraftstoff', 'Combustible'],
      icon: 'fuel',
      pane: 'maps' // volet proposé à côté sur grand écran (vue double)
    }, {
      id: 'maps',
      label: ['Carte', 'Map', 'Karte', 'Mapa'],
      icon: 'map'
    }, {
      id: 'report',
      label: ['Compte rendu', 'Report', 'Bericht', 'Informe'],
      icon: 'edit',
      pane: 'maps'
    }, {
      id: 'flightlog',
      label: ['Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'],
      icon: 'list'
    }, {
      id: 'website',
      label: ['Site', 'Website', 'Website', 'Sitio'],
      icon: 'globe'
    }, {
      // module dédié (vue fixe, gabarit de la Carte) : sous-onglet de Préparer sur téléphone (APP.tabs), dans le rail sur
      // écran ; réinclus plus tard dans Préparer et la Carte (modules/atmosphere/DECISIONS.md, 24 oct 2026)
      id: 'atmosphere',
      label: ['Atmosphère', 'Atmosphere', 'Atmosphäre', 'Atmósfera'],
      icon: 'layers'
    }],
    // barre d'onglets du téléphone (760 px et moins), cinq au plus, Réglages compris : un onglet = un groupe de modules
    // (modules : l'onglet reste choisi tant que l'un d'eux est affiché ; le toucher ouvre le dernier montré du groupe dans
    // cette session, sinon le premier ; un id qui n'est pas inscrit plus haut est ignoré sans bruit) ou un écran du
    // cadre (screen). Un module absent de tous les onglets (website, hello) reste joignable par son adresse et dans la
    // colonne de gauche des grands écrans.
    tabs: [{
      id: 'prepare',
      label: ['Préparer', 'Prepare', 'Vorbereiten', 'Preparar'],
      icon: 'fuel',
      modules: ['fuel', 'atmosphere']
    }, {
      id: 'maps',
      label: ['Carte', 'Map', 'Karte', 'Mapa'],
      icon: 'map',
      modules: ['maps']
    }, {
      id: 'report',
      label: ['CR', 'Report', 'Bericht', 'Informe'],
      icon: 'edit',
      modules: ['report']
    }, {
      id: 'flightlog',
      label: ['Vols', 'Flights', 'Flüge', 'Vuelos'],
      icon: 'list',
      modules: ['flightlog']
    }, {
      id: 'settings',
      label: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
      icon: 'settings',
      screen: 'settings'
    }]
  };
  // module d'exemple pour les développeurs (modules/hello/, frame/INTEGRATION.md) : absent de l'appli ; il rejoint le
  // menu (et la mise en cache) seulement sur un poste de développement, localStorage « sogFrame:dev » = 1
  try {
    if (localStorage.getItem('sogFrame:dev') === '1') APP.modules.push({
      id: 'hello',
      label: ['Exemple', 'Example', 'Beispiel', 'Ejemplo'],
      icon: 'target'
    });
  } catch {
    /* stockage indisponible : pas de poste de développement */
  }

  // ---------------------------------------------------------------- langue et textes (fr d'abord)
  const LANGS = ['fr', 'en', 'de', 'es'];
  const lang = () => {
    let l = '';
    try {
      l = localStorage.getItem('sogFrame:lang') || localStorage.getItem('repositoryLanguageMode') || '';
    } catch {
      /* stockage indisponible */
    }
    return LANGS.includes(l) ? l : LANGS.find(x => (navigator.language || '').toLowerCase().startsWith(x)) || 'fr';
  };
  /** Texte d'une ligne [fr, en, de, es] dans la langue de l'appli, {nom} remplacés ; espace fine avant : ; ! ? en
   *  français. */
  const t = (row, v = {}) => {
    const l = lang(),
      s = String((Array.isArray(row) ? row[LANGS.indexOf(l)] || row[0] : row) ?? '').replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
    return l === 'fr' ? s.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ') : s;
  };
  const T = {
    sync: {
      ok: ['À jour', 'Up to date', 'Aktuell', 'Al día'],
      ago: ['à jour, il y a {d}', 'up to date, {d} ago', 'aktuell, vor {d}', 'al día, hace {d}'],
      pending: ['{n} en attente', '{n} pending', '{n} ausstehend', '{n} pendiente(s)'],
      syncing: ['Synchronisation…', 'Syncing…', 'Synchronisiere…', 'Sincronizando…'],
      offline: ['Hors ligne', 'Offline', 'Offline', 'Sin conexión'],
      conflicts: ['{n} conflit(s)', '{n} conflict(s)', '{n} Konflikt(e)', '{n} conflicto(s)'],
      error: ['Erreur de synchronisation', 'Sync error', 'Sync-Fehler', 'Error de sincronización'],
      // erreurs de la couche de données, dans la langue de l'appli (le détail d'un serveur reste tel qu'il l'a dit)
      errs: {
        offline: ['hors ligne', 'offline', 'offline', 'sin conexión'],
        moving: ['le dépôt change sans cesse : réessayez', 'the repository keeps changing: try again',
          'das Repository ändert sich ständig: erneut versuchen', 'el repositorio cambia sin parar: vuelva a intentarlo'
        ],
        none: ['aucun moyen d’échange réglé', 'no way of exchanging set', 'kein Austauschweg eingerichtet',
          'ninguna vía de intercambio configurada'
        ],
        other: ['refusé par le serveur : {e}', 'refused by the server: {e}', 'vom Server abgelehnt: {e}',
          'rechazado por el servidor: {e}'
        ]
      },
      local: ['Sur cet appareil', 'On this device', 'Auf diesem Gerät', 'En este dispositivo'],
      title: ['Synchronisation : {tr} — dernière réussie : {last} — {n} écriture(s) en attente{e}',
        'Synchronisation: {tr} — last success: {last} — {n} pending write(s){e}',
        'Synchronisation: {tr} — zuletzt erfolgreich: {last} — {n} ausstehende Schreibvorgänge{e}',
        'Sincronización: {tr} — última correcta: {last} — {n} escritura(s) pendiente(s){e}'
      ],
      never: ['jamais', 'never', 'nie', 'nunca'],
      done: ['Synchronisé : {p} reçu(s), {s} envoyé(s).', 'Synchronised: {p} received, {s} sent.',
        'Synchronisiert: {p} empfangen, {s} gesendet.', 'Sincronizado: {p} recibido(s), {s} enviado(s).'
      ],
      failed: ['Synchronisation impossible : {e}', 'Synchronisation failed: {e}', 'Synchronisation fehlgeschlagen: {e}',
        'Sincronización imposible: {e}'
      ],
      offlineNote: ['Hors ligne : vos écritures attendent et partiront à la prochaine synchronisation.',
        'Offline: your writes are waiting and will leave at the next synchronisation.',
        'Offline: Ihre Änderungen warten und gehen bei der nächsten Synchronisation hinaus.',
        'Sin conexión: sus escrituras esperan y saldrán en la próxima sincronización.'
      ],
      conflictNote: [
        '{n} fichier(s) modifié(s) ailleurs en même temps : la version la plus récente est gardée, l’autre reste consultable (conflits).',
        '{n} file(s) changed elsewhere at the same time: the newest version is kept, the other one stays available (conflicts).',
        '{n} Datei(en) gleichzeitig anderswo geändert: die neueste Version bleibt, die andere ist einsehbar (Konflikte).',
        '{n} archivo(s) modificado(s) en otro lugar a la vez: se conserva la versión más reciente, la otra sigue disponible (conflictos).'
      ]
    },
    ok: ['OK', 'OK', 'OK', 'Aceptar'],
    cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
    tabsNav: ['Navigation principale', 'Main navigation', 'Hauptnavigation', 'Navegación principal'],
    // bouton « i » de l'en-tête et son pop-up d'état (frame/SPEC.md § 3.1)
    info: {
      button: ['État de l’appli', 'App status', 'App-Status', 'Estado de la app'],
      news: ['à voir', 'something to see', 'Hinweise vorhanden', 'algo que ver'],
      title: ['État', 'Status', 'Status', 'Estado'],
      flight: ['Vol en cours › {m}', 'Flight in progress › {m}', 'Flug läuft › {m}', 'Vuelo en curso › {m}'],
      report: ['CR à écrire pour le vol du {date} {dep}→{arr}', 'Report to write for the flight of {date} {dep}→{arr}',
        'Bericht zu schreiben für den Flug vom {date} {dep}→{arr}', 'Informe por escribir del vuelo del {date} {dep}→{arr}'
      ],
      synced: ['Données : synchronisées il y a {d}', 'Data: synchronised {d} ago', 'Daten: vor {d} synchronisiert',
        'Datos: sincronizados hace {d}'
      ],
      never: ['Données : jamais synchronisées', 'Data: never synchronised', 'Daten: nie synchronisiert',
        'Datos: nunca sincronizados'
      ],
      syncing: ['Données : synchronisation en cours…', 'Data: synchronising…', 'Daten: Synchronisation läuft…',
        'Datos: sincronizando…'
      ],
      conflicts: ['Données : {n} conflit(s) à examiner', 'Data: {n} conflict(s) to review', 'Daten: {n} Konflikt(e) zu prüfen',
        'Datos: {n} conflicto(s) por revisar'
      ],
      localOnly: ['Données : sur cet appareil, rien à synchroniser', 'Data: on this device, nothing to synchronise',
        'Daten: auf diesem Gerät, nichts zu synchronisieren', 'Datos: en este dispositivo, nada que sincronizar'
      ],
      pending: ['{n} écriture(s) en attente', '{n} write(s) pending', '{n} Schreibvorgang/-vorgänge ausstehend',
        '{n} escritura(s) pendiente(s)'
      ],
      noPending: ['aucune écriture en attente', 'no writes pending', 'keine Schreibvorgänge ausstehend',
        'ninguna escritura pendiente'
      ],
      transport: ['Échange : {x}', 'Transport: {x}', 'Übertragung: {x}', 'Transporte: {x}'],
      tr: {
        local: ['cet appareil', 'this device', 'dieses Gerät', 'este dispositivo'],
        launcher: ['lanceur', 'launcher', 'Starter', 'lanzador'],
        github: ['GitHub', 'GitHub', 'GitHub', 'GitHub']
      },
      offline: ['Hors ligne : travail sur la copie de l’appareil', 'Offline: working on this device’s copy',
        'Offline: Arbeit auf der Kopie dieses Geräts', 'Sin conexión: se trabaja con la copia del dispositivo'
      ]
    },
    device: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
    help: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    back: ['Revenir à {m}', 'Back to {m}', 'Zurück zu {m}', 'Volver a {m}'],
    host: ['Lanceur de {h}', 'Launcher on {h}', 'Starter auf {h}', 'Lanzador de {h}'],
    who: ['Trigramme ?', 'Trigram?', 'Kürzel?', '¿Trigrama?'],
    whoTitle: ['Indiquez votre trigramme dans Réglages : jusque-là, vos documents restent sur cet appareil et rien n’est envoyé.',
      'Set your trigram in Settings: until then, your documents stay on this device and nothing is sent.',
      'Geben Sie Ihr Kürzel in den Einstellungen an: bis dahin bleiben Ihre Dokumente auf diesem Gerät und nichts wird gesendet.',
      'Indique su trigrama en Ajustes: hasta entonces, sus documentos se quedan en este dispositivo y no se envía nada.'
    ],
    anonAdopted: ['{n} document(s) écrit(s) sans trigramme repris sous {tri}.',
      '{n} document(s) written without a trigram taken over under {tri}.',
      '{n} ohne Kürzel geschriebene(s) Dokument(e) unter {tri} übernommen.',
      '{n} documento(s) escrito(s) sin trigrama retomado(s) bajo {tri}.'
    ],
    hostTitle: [
      'Appli servie par le lanceur du poste « {h} » sur le réseau local : ses données, son simulateur, son relais. Pas de hors ligne sur cet appareil (page en http).',
      'App served by the launcher of the computer “{h}” on the local network: its data, its simulator, its relay. No offline use on this device (page over http).',
      'App vom Starter des Rechners „{h}“ im lokalen Netz bereitgestellt: seine Daten, sein Simulator, sein Relais. Kein Offline-Betrieb auf diesem Gerät (Seite über http).',
      'Aplicación servida por el lanzador del equipo «{h}» en la red local: sus datos, su simulador, su relé. Sin uso sin conexión en este dispositivo (página en http).'
    ],
    live: {
      title: ['Position réelle du vol : {s}, {t}', 'Actual position of the flight: {s}, {t}',
        'Tatsächliche Position des Flugs: {s}, {t}',
        'Posición real del vuelo: {s}, {t}'
      ],
      waiting: ['Position réelle du vol : en attente (GPS de l’appareil ou session IVAO / VATSIM)',
        'Actual position of the flight: waiting (this device’s GPS or an IVAO / VATSIM session)',
        'Tatsächliche Position des Flugs: wartet (GPS des Geräts oder IVAO-/VATSIM-Sitzung)',
        'Posición real del vuelo: en espera (GPS del dispositivo o sesión IVAO / VATSIM)'
      ],
      waitingSim: ['Position réelle du vol : en attente (simulateur de ce poste, GPS de l’appareil ou session IVAO / VATSIM)',
        'Actual position of the flight: waiting (this computer’s simulator, the device’s GPS or an IVAO / VATSIM session)',
        'Tatsächliche Position des Flugs: wartet (Simulator dieses Rechners, GPS des Geräts oder IVAO-/VATSIM-Sitzung)',
        'Posición real del vuelo: en espera (simulador de este equipo, GPS del dispositivo o sesión IVAO / VATSIM)'
      ],
      gpsOn: ['Utiliser la position (GPS) de cet appareil pendant le vol', 'Use this device’s position (GPS) during the flight',
        'Die Position (GPS) dieses Geräts während des Flugs verwenden', 'Usar la posición (GPS) de este dispositivo durante el vuelo'
      ],
      gpsOff: ['Ne plus utiliser la position de cet appareil', 'Stop using this device’s position',
        'Position dieses Geräts nicht mehr verwenden',
        'Dejar de usar la posición de este dispositivo'
      ],
      insecure: [
        'Le GPS de cet appareil n’est pas disponible sur une page ouverte en http depuis le réseau local (le navigateur ne le donne qu’en https ou sur le poste lui-même).',
        'This device’s GPS is not available on a page opened over http from the local network (the browser gives it only over https or on the computer itself).',
        'Das GPS dieses Geräts ist auf einer über http aus dem lokalen Netz geöffneten Seite nicht verfügbar (der Browser gibt es nur über https oder auf dem Rechner selbst).',
        'El GPS de este dispositivo no está disponible en una página abierta en http desde la red local (el navegador solo lo da en https o en el propio equipo).'
      ],
      denied: ['Position refusée par le navigateur : à autoriser dans ses réglages.',
        'Position refused by the browser: allow it in its settings.',
        'Position vom Browser verweigert: in seinen Einstellungen erlauben.',
        'Posición rechazada por el navegador: autorícela en sus ajustes.'
      ]
    },
    paneOpen: ['Afficher {m} à côté', 'Show {m} alongside', '{m} daneben anzeigen', 'Mostrar {m} al lado'],
    paneClose: ['Fermer le volet {m}', 'Close the {m} pane', 'Bereich {m} schließen', 'Cerrar el panel {m}'],
    loadErr: ['Module « {m} » impossible à charger : {e}', 'Module “{m}” could not be loaded: {e}',
      'Modul „{m}“ konnte nicht geladen werden: {e}', 'No se pudo cargar el módulo «{m}»: {e}'
    ]
  };
  /** Durée lisible depuis une date ISO (« 4 min », « 2 h », « 3 j »). */
  const ago = iso => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1e3);
    return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} ${t(['j', 'd', 'T', 'd'])}`;
  };

  // ---------------------------------------------------------------- notifications et questions (jamais de dialogue natif)
  /** Notification flottante : effacée seule (6 s, erreur 12 s) ou par sa croix. kind : info, ok, warn, err. o.action
   *  { label, run } : un bouton d'action, et la notification reste jusqu'au clic. */
  function notify(text, kind = 'info', o = {}) {
    const n = document.createElement('div');
    n.className = 'f-note';
    n.dataset.kind = kind;
    n.innerHTML = `<span>${esc(text)}</span>${o.action ? `<button type="button" data-act>${esc(o.action.label)}</button>` : ''}<button type="button" data-x aria-label="${esc(t(T.close))}">✕</button>`;
    n.querySelector('[data-x]').onclick = () => n.remove();
    if (o.action) n.querySelector('[data-act]').onclick = () => {
      n.remove();
      o.action.run();
    };
    $('fNotes').append(n);
    if (!o.action) setTimeout(() => n.remove(), kind === 'err' ? 12e3 : 6e3);
  }
  /** Fenêtre de question du cadre : html du contenu, boutons ; promesse résolue par onDone(valeur) ; Échap : annuler. */
  function modal(html, onReady, cls = '') {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = cls ? `f-modal ${cls}` : 'f-modal';
      m.innerHTML = `<div role="dialog" aria-modal="true">${html}</div>`;
      const close = v => {
        m.remove();
        document.removeEventListener('keydown', key);
        res(v);
      };
      const key = e => {
        if (e.key === 'Escape') close(null);
      };
      document.addEventListener('keydown', key);
      document.body.append(m);
      onReady(m, close);
    });
  }
  /** Question oui / non : promesse de vrai (OK) ou faux. */
  const ask = (text, o = {}) => modal(`<p>${esc(text)}</p><div class="f-row"><button type="button" class="primary" data-ok>${esc(o.ok || t(T.ok))}</button><button type="button" data-no>${esc(o.cancel || t(T.cancel))}</button></div>`,
    (m, close) => {
      m.querySelector('[data-ok]').onclick = () => close(true);
      m.querySelector('[data-no]').onclick = () => close(false);
      m.querySelector('[data-ok]').focus();
    }).then(v => !!v);
  /** Saisie d'un texte : promesse du texte, null si annulé. */
  const askText = (text, o = {}) => modal(`<label class="f-field">${esc(text)}<input data-in value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}"></label><div class="f-row"><button type="button" class="primary" data-ok>${esc(o.ok || t(T.ok))}</button><button type="button" data-no>${esc(o.cancel || t(T.cancel))}</button></div>`,
    (m, close) => {
      const i = m.querySelector('[data-in]');
      m.querySelector('[data-ok]').onclick = () => close(i.value);
      m.querySelector('[data-no]').onclick = () => close(null);
      i.addEventListener('keydown', e => {
        if (e.key === 'Enter') close(i.value);
      });
      i.focus();
    });

  // ---------------------------------------------------------------- appels sortants des modules
  /** Réponse « hors ligne » immédiate (statut 503, en-tête x-sog-offline), jamais d'exception. */
  const offline = () => new Response(null, {
    status: 503,
    statusText: 'offline',
    headers: {
      'x-sog-offline': '1'
    }
  });
  // sites relayés par le lanceur (clés et CORS de son côté : tools/launch.py, POST /__setup/net) ; sans lanceur, appel
  // direct seulement vers ceux qui l'autorisent (CORS) ; tout autre site extérieur : 503 marqué x-sog-unreachable
  // météo : aviationweather.gov (METAR / TAF, pas de CORS) par le relais seulement ; sans lanceur, METAR par
  // metar.vatsim.net (sans clé), TAF par avwx.rest avec la clé de l'appareil, ajoutée ici (jamais vue par un module)
  // prévisions par niveau de pression (vents, températures : fuel) : api.open-meteo.com, sans clé, CORS ouvert
  const RELAY = ['www.simbrief.com', 'api.ivao.aero', 'api.vatsim.net', 'data.vatsim.net', 'my.vatsim.net', 'aviationweather.gov',
      'metar.vatsim.net', 'api.open-meteo.com'
    ],
    DIRECT = ['www.simbrief.com', 'api.ivao.aero', 'metar.vatsim.net', 'avwx.rest', 'api.open-meteo.com', 'data.vatsim.net'];
  // clé personnelle avwx.rest (TAF sans lanceur) : sur l'appareil seulement, à côté du jeton GitHub (githubData:…, hors
  // des sauvegardes : ni device/ ni la base IndexedDB que FrameData.dump() exporte) ; jamais rendue à une page
  const AVWX = 'githubData:avwx';
  const avwxKey = () => {
    try {
      return localStorage.getItem(AVWX) || '';
    } catch {
      return '';
    }
  };
  /** Clé météo de l'appareil, pour la carte des réglages : présence, enregistrement, effacement, essai (TAF d'un
   *  terrain) ; la clé elle-même n'est jamais relue. */
  const weatherKey = {
    has: () => !!avwxKey(),
    save(key) {
      const k = String(key || '').trim();
      try {
        k ? localStorage.setItem(AVWX, k) : localStorage.removeItem(AVWX);
      } catch {
        /* stockage indisponible */
      }
      return !!k;
    },
    clear() {
      try {
        localStorage.removeItem(AVWX);
      } catch {
        /* stockage indisponible */
      }
    },
    async test(icao = 'LFPG') {
      const r = await net.fetch(`https://avwx.rest/api/taf/${encodeURIComponent(String(icao).trim().toUpperCase())}`);
      const why = r.headers.get('x-sog-offline') ? 'offline' : r.headers.get('x-sog-unreachable') ? 'no key' : r.status === 401 ||
        r.status === 403 ? 'key refused' : r.ok ? 'ok' : `HTTP ${r.status}`;
      return {
        ok: r.ok,
        status: r.status,
        message: why
      };
    }
  };
  let launcherHere = null; // { data, dataGit } si la page est servie par un lanceur (relevé au démarrage)
  let airlineP = Promise.resolve(); // première lecture de la compagnie, en cours au démarrage
  /** Hôte du site de la compagnie (ctx.airline.site, en https) : relayé ou appelé en lecture seule (GET) ; '' sinon. */
  const siteHost = () => {
    try {
      const u = new URL(airline.site || '');
      return u.protocol === 'https:' ? u.hostname : '';
    } catch {
      return '';
    }
  };
  const unreachable = () => new Response(null, {
    status: 503,
    statusText: 'unreachable',
    headers: {
      'x-sog-unreachable': '1'
    }
  });
  const net = {
    online: () => navigator.onLine !== false,
    /** fetch par le cadre : hors ligne, réponse 503 tout de suite ; relais du lanceur pour les sites de RELAY et le site
     *  de la compagnie (GET seulement) ; appel direct pour la même origine, les sites de DIRECT et le site de la
     *  compagnie (GET) ; sinon 503 ; jamais d'exception. */
    async fetch(url, init = {}) {
      if (navigator.onLine === false) return offline();
      let u;
      try {
        u = new URL(url, location.href);
      } catch {
        return unreachable();
      }
      // un hôte qui n'est ni de la même origine ni d'une liste connue peut être le site de la compagnie : sa première
      // lecture est attendue (une seule fois, au démarrage) avant de décider
      if (!airlineKnown && u.origin !== location.origin && !RELAY.includes(u.hostname) && !DIRECT.includes(u.hostname)) await
      airlineP;
      const site = !!siteHost() && u.protocol === 'https:' && u.hostname === siteHost();
      if (site && String(init.method || 'GET').toUpperCase() !== 'GET') return unreachable(); // jamais d'envoi vers le site
      try {
        if (u.origin === location.origin) return await fetch(u, init);
        if (launcherHere && (RELAY.includes(u.hostname) || site)) {
          const r = await fetch(new URL('__setup/net', ROOT), {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'X-SOG-Setup': '1',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: u.href,
              method: init.method || 'GET',
              accept: new Headers(init.headers || {}).get('Accept') || '',
              contentType: new Headers(init.headers || {}).get('Content-Type') || '',
              body: typeof init.body === 'string' ? init.body : undefined
            })
          });
          return r.headers.get('x-sog-offline') ? offline() : r;
        }
        if (u.hostname === 'avwx.rest') {
          // TAF sans lanceur : la clé de l'appareil est ajoutée ici ; sans clé, 503 tout de suite
          const key = avwxKey();
          if (!key) return unreachable();
          const headers = new Headers(init.headers || {});
          headers.set('Authorization', `BEARER ${key}`);
          return await fetch(u, {
            ...init,
            headers
          });
        }
        if (DIRECT.includes(u.hostname) || site) return await fetch(u, init);
        return unreachable();
      } catch {
        return offline();
      }
    }
  };

  // ---------------------------------------------------------------- appareil : usages, identité, transport
  const own = FD.adapter({
    id: 'frame',
    reads: ['device/'],
    writes: [{
      prefix: 'device/',
      policy: 'cache'
    }]
  });
  let identity = Object.freeze({}),
    usages = {},
    level = 2, // niveau d'usage de l'appareil (1 à 3)
    airline = Object.freeze({});
  const LEVELS = [1, 2, 3],
    DEFAULT_LEVEL = 2;
  /** Niveau d'usage valide (1 à 3) ; défaut : courant. */
  const levelFrom = v => LEVELS.includes(+v) ? +v : DEFAULT_LEVEL;
  // compagnie : airline/settings.json du dépôt des données (document écrit par le module website, tiré d'avance comme
  // airline/fleet.json : recherche d'appareils hors ligne) ; aucune adresse dans le code : nom, site et pages viennent de
  // ce fichier, {} en son absence
  const AIRLINE = 'airline/settings.json';
  const airlineData = FD.adapter({
    id: 'frame-airline',
    reads: ['airline/'],
    writes: []
  });
  const str = v => typeof v === 'string' ? v.trim() : '';
  /** { name, site, pages: { recordFlight, log, fleet } } d'après le fichier (champs texte seulement), gelé. */
  function airlineOf(v) {
    if (!v || typeof v !== 'object') return Object.freeze({});
    const p = v.pages && typeof v.pages === 'object' ? v.pages : {};
    return Object.freeze({
      name: str(v.name),
      site: str(v.site),
      pages: Object.freeze({
        recordFlight: str(p.recordFlight),
        log: str(p.log),
        fleet: str(p.fleet)
      })
    });
  }
  let airlineKnown = false; // la compagnie a été lue une fois (le relais attend cette première lecture pour son site)
  /** Relit la compagnie ; ms : attente au plus (sans ms, jusqu'à la réponse) ; changée, les modules en sont prévenus
   *  (événement « frame-airline » sur window ; ctx.airline donne toujours la dernière). Le premier module n'attend
   *  jamais cette lecture : au premier passage d'un dépôt, elle coûte toute la chaîne de lecture de l'arbre. */
  async function loadAirline(ms = 0) {
    const read = airlineData.get(AIRLINE, {
        wait: true
      }).catch(() => null),
      v = await (ms ? Promise.race([read, new Promise(res => setTimeout(() => res(undefined), ms))]) : read);
    if (v === undefined) return;
    airlineKnown = true;
    const next = airlineOf(v);
    if (JSON.stringify(next) === JSON.stringify(airline)) return;
    airline = next;
    window.dispatchEvent(new CustomEvent('frame-airline', {
      detail: airline
    }));
  }
  /** Relit l'identité et les usages de l'appareil, puis branche le transport qui leur correspond. */
  async function loadDevice() {
    paintHost();
    identity = Object.freeze({
      ...((await own.get('device/identity.json')) || {})
    });
    paintWho();
    usages = (await own.get('device/usages.json')) || {};
    level = levelFrom((await own.get('device/level.json'))?.level);
    applyDesign(await own.get('device/design.json'));
    liveGps = (await own.get('device/live.json'))?.gps === true;
    liveWatch();
    layout = (await own.get('device/layout.json'))?.panes || {};
    renderMenu();
    configured = await chooseTransport();
    FD.configure({
      identity: {
        trigram: identity.trigram || ''
      },
      transport: configured,
      references: configured.kind === 'local' ? referenceSource() : null
    });
    adoptAnon();
  }
  // ---------------------------------------------------------------- sans trigramme (frame/SPEC.md § 3.5)
  // les modules écrivent alors sous pilot/ANON/, que la couche garde sur l'appareil ; la pastille « Trigramme ? » (et une
  // notification, une fois par appareil) invite à le poser ; dès qu'il l'est, ces documents passent sous pilot/<TRI>/
  const anonData = FD.adapter({
    id: 'frame-identity',
    reads: ['pilot/'],
    writes: [{
      prefix: 'pilot/',
      merge: 'record'
    }]
  });
  /** Pastille « Trigramme ? » (ouvre les Réglages) tant que l'identité n'en a pas ; notification la première fois. */
  function paintWho() {
    const b = $('fWho'),
      show = !identity.trigram;
    if (!b) return;
    if (b.hidden === show) b.hidden = !show;
    if (!show) return;
    const html = `${Icons?.svg('alert') || ''}<span>${esc(t(T.who))}</span>`,
      title = t(T.whoTitle);
    if (b.innerHTML !== html) b.innerHTML = html;
    if (b.title !== title) b.title = title;
    try {
      if (localStorage.getItem('sogFrame:trigramAsked')) return;
      localStorage.setItem('sogFrame:trigramAsked', '1');
    } catch {
      return; // stockage indisponible : la pastille suffit
    }
    notify(title, 'info');
  }
  let adopting = null;
  /** Documents de pilot/ANON/ (gardés sur l'appareil, ou venus d'un data/ d'avant la règle) repris sous pilot/<TRI>/
   *  quand le trigramme est posé : un document absent sous le trigramme y est copié ; présent des deux côtés, le plus
   *  récent (updated_at) l'emporte et l'autre est gardé dans les conflits ; puis le document de pilot/ANON/ est retiré. */
  function adoptAnon() {
    const tri = identity.trigram;
    if (!tri || tri === 'ANON' || adopting) return adopting;
    adopting = (async () => {
      const P = 'pilot/ANON/',
        paths = new Set([...((await anonData.list(P).catch(() => null)) || []), ...(await FD.cached(P).catch(() => [])).map(d => d
          .path)]);
      let n = 0;
      for (const p of paths) {
        const v = await anonData.get(p).catch(() => null);
        if (v != null) {
          const to = `pilot/${tri}/${p.slice(P.length)}`,
            cur = await anonData.get(to).catch(() => null),
            newer = String(v?.updated_at || '') > String(cur?.updated_at || ''),
            same = cur != null && JSON.stringify(v) === JSON.stringify(cur);
          if (!same && (cur == null || newer)) await anonData.put(to, v);
          if (cur != null && !same) await FD.noteConflict({
            path: to,
            kept: newer ? v : cur,
            lost: newer ? cur : v,
            side: 'anon'
          });
          n++;
        }
        await anonData.remove(p);
      }
      if (n) notify(t(T.anonAdopted, {
        n,
        tri
      }), 'ok');
    })().catch(e => console.warn('anon', e)).finally(() => adopting = null);
    return adopting;
  }
  // ---------------------------------------------------------------- design (frame/design/SPEC.md § 4)
  // jeux de jetons (frame/design/tokens.css) ; choix de l'appareil dans device/design.json (carte Design des réglages),
  // copié dans localStorage pour que la ligne de démarrage de frame/index.html pose les attributs avant le premier
  // affichage
  const DESIGNS = [{
      id: 'standard',
      label: ['Standard', 'Standard', 'Standard', 'Estándar'],
      textured: false
    }, {
      id: 'cabinet',
      label: ['Cabinet', 'Cabinet', 'Kabinett', 'Gabinete'],
      textured: true
    }, {
      id: 'field',
      label: ['Durci', 'Rugged', 'Robust', 'Robusto'],
      textured: true
    }, {
      // maquette à trancher (frame/design/SPEC.md § 3) : aplats, angles droits, une couleur repère par module
      id: 'metro',
      label: ['Metro', 'Metro', 'Metro', 'Metro'],
      textured: false
    }, {
      // maquette à trancher : style typographique international (grille, filets, rouge signal, angles nuls)
      id: 'swiss',
      label: ['Swiss', 'Swiss', 'Swiss', 'Swiss'],
      textured: false
    }, {
      // maquette à trancher : façon Réglages d'iOS (fond gris, cartes blanches groupées, bleu système)
      id: 'cupertino',
      label: ['Cupertino', 'Cupertino', 'Cupertino', 'Cupertino'],
      textured: false
    }, {
      // maquette à trancher : Material Design 3 (surfaces tonales, deux niveaux d'élévation, boutons en pastille, tiroir et rail)
      id: 'material',
      label: ['Material', 'Material', 'Material', 'Material'],
      textured: false
    }],
    TONES = ['auto', 'day', 'night'],
    DESIGN_MIRROR = 'sogFrame:design';
  let design = {
    design: 'standard',
    tone: 'auto'
  };
  /** Choix valide : design connu (standard sinon), ton auto / day / night (auto sinon). */
  const designFrom = v => ({
    design: DESIGNS.some(d => d.id === v?.design) ? v.design : 'standard',
    tone: TONES.includes(v?.tone) ? v.tone : 'auto'
  });
  /** Pose design et ton sur <html> (seulement s'ils changent), garde le miroir et la couleur de la barre du système. */
  function applyDesign(v) {
    design = designFrom(v);
    const h = document.documentElement;
    if (h.dataset.design !== design.design) h.dataset.design = design.design;
    if (design.tone === 'auto') {
      if (h.hasAttribute('data-tone')) h.removeAttribute('data-tone');
    } else if (h.dataset.tone !== design.tone) h.dataset.tone = design.tone;
    try {
      const text = JSON.stringify(design);
      if (localStorage.getItem(DESIGN_MIRROR) !== text) localStorage.setItem(DESIGN_MIRROR, text);
    } catch {
      /* stockage indisponible : la page démarre sur le design standard puis applique celui-ci */
    }
    paintBar();
  }
  /** Couleur de la barre du système : celle de l'en-tête, qui suit le design, le ton et (metro) le module affiché. */
  function paintBar() {
    const meta = document.querySelector('meta[name="theme-color"]'),
      head = document.querySelector('.f-head'),
      bar = head ? getComputedStyle(head).backgroundColor : '';
    if (meta && bar && meta.content !== bar) meta.content = bar;
  }
  /** Module (ou écran du cadre) affiché : son id sur <html> (data-landmark), d'où le design metro tire la couleur repère
   *  (--sog-module, frame/design/tokens.css) de l'en-tête ; les écrans du cadre ont celle des réglages. Posé seulement
   *  s'il change ; le volet, le module et le menu portent la leur (data-landmark posé à leur création). */
  function paintModule(id) {
    const h = document.documentElement,
      m = SCREENS.includes(id) ? 'settings' : id || '';
    if (m && h.dataset.landmark !== m) h.dataset.landmark = m;
    paintBar();
  }
  /** Vue fixe (meta.fixed d'un module) : <html class="f-fixed"> donne à la vue toute la hauteur entre l'en-tête et la barre du
   *  bas (ou le bas de la fenêtre), sans défilement de la page (frame.css) ; jamais sous un écran du cadre ouvert par-dessus
   *  (il défile comme une page). id : le module affiché ('' : aucun). Écrit seulement si cela change. */
  function paintFixed(id) {
    document.documentElement.classList.toggle('f-fixed', !!id && !over && moduleFixed[id] === true);
  }
  // ---------------------------------------------------------------- bouton « i » de l'en-tête (état de l'appli)
  // iVAC : une pastille verte sur le « i » quand quelque chose s'applique, un pop-up qui le dit, une ligne par chose, un
  // chevron quand elle mène quelque part. Rien d'autre que : vol en cours (› Carte), CR à écrire (enregistrement de cache
  // publié par flightlog), état des données (dernière synchronisation, écritures en attente, échange utilisé), hors ligne.
  // La pastille ne compte que les deux premières : la ligne des données et « hors ligne » sont un état, pas une nouvelle.
  const PENDING_REPORTS = 'cache/flightlog/pending.json',
    HANDOFF = 'pilot/handoff.json';
  // lecture du cache de flightlog (jamais synchronisé) et passage à report (pilot/handoff.json, même politique « cache »
  // que l'écriture de flightlog) ; le cadre n'écrit rien d'autre
  const infoData = FD.adapter({
    id: 'frame-info',
    reads: [{
      prefix: 'cache/flightlog/',
      policy: 'cache'
    }],
    writes: [{
      prefix: HANDOFF,
      policy: 'cache'
    }]
  });
  let lastFlight = null, // vol courant (liveCheck)
    lastStatus = null, // état de la synchronisation (paintSync)
    pendingReports = [], // CR à écrire, d'après cache/flightlog/pending.json
    infoBox = null; // pop-up ouvert : { list, close }
  /** CR à écrire : les vols de l'enregistrement de flightlog, ceux qui ont une date, un départ et une arrivée (50 au plus). */
  async function readPending() {
    let rec = null;
    try {
      // sans réseau ni lecture à vide : seulement si le fichier est sur l'appareil
      if ((await infoData.cached('cache/flightlog/')).some(d => d.path === PENDING_REPORTS)) rec = await infoData.get(PENDING_REPORTS);
    } catch {
      /* enregistrement illisible : aucune ligne */
    }
    const list = [];
    for (const f of Array.isArray(rec?.flights) ? rec.flights : []) {
      const date = str(f?.date),
        dep = str(f?.dep).toUpperCase().slice(0, 8),
        arr = str(f?.arr).toUpperCase().slice(0, 8);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dep || !arr) continue;
      list.push({
        date,
        dep,
        arr,
        // schéma 2 : handoff { family, values } (ce que flightlog remettrait à report) ; absent (schéma 1) : null
        handoff: f.handoff?.values && typeof f.handoff.values === 'object' && !Array.isArray(f.handoff.values) ? {
          family: str(f.handoff.family),
          values: f.handoff.values
        } : null
      });
      if (list.length >= 50) break;
    }
    if (JSON.stringify(list) !== JSON.stringify(pendingReports)) {
      pendingReports = list;
      paintInfo();
    }
  }
  /** Date « 2026-10-23 » dans l'écriture de la langue (fr 23/10/2026). */
  const infoDate = d => (tz('fmtDateZ', `${d}T00:00:00Z`) || d).split(' ')[0];
  /** Texte de la ligne des données : dernière synchronisation et écritures en attente, ou ce qui l'empêche. */
  function dataLine(s) {
    if (s.conflicts) return t(T.info.conflicts, {
      n: s.conflicts
    });
    if (s.syncing) return t(T.info.syncing);
    if (s.transport === 'local' || s.transport === 'none') return t(T.info.localOnly);
    return `${s.lastSync ? t(T.info.synced, { d: ago(s.lastSync) }) : t(T.info.never)} · ${s.pending ? t(T.info.pending, { n: s.pending }) : t(T.info.noPending)}`;
  }
  /** Lignes du pop-up : { k, text, sub, go (adresse ou 'report:<i>'), news (compte pour la pastille) }. */
  function infoItems() {
    const items = [],
      maps = APP.modules.find(m => m.id === 'maps');
    if (lastFlight?.started && maps) items.push({
      k: 'flight',
      text: t(T.info.flight, {
        m: t(maps.label)
      }),
      go: '#maps',
      news: true
    });
    pendingReports.forEach((f, i) => items.push({
      k: 'report',
      text: t(T.info.report, {
        date: infoDate(f.date),
        dep: f.dep,
        arr: f.arr
      }),
      go: `report:${i}`,
      news: true
    }));
    const s = lastStatus;
    if (s) items.push({
      k: 'data',
      text: dataLine(s),
      sub: t(T.info.transport, {
        x: t(T.info.tr[s.transport] || T.info.tr.local)
      }),
      go: s.conflicts ? '#conflicts' : '#settings'
    });
    if (!net.online()) items.push({
      k: 'offline',
      text: t(T.info.offline)
    });
    return items;
  }
  const infoHtml = items => items.map(it => {
    const inner = `<i class="f-info-dot"${it.news ? '' : ' hidden'}></i><span class="f-info-txt"><span>${esc(it.text)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.go ? icon('chevron-right') : ''}`;
    return `<li>${it.go ? `<button type="button" class="f-info-row" data-go="${esc(it.go)}">${inner}</button>` : `<div class="f-info-row">${inner}</div>`}</li>`;
  }).join('');
  /** Pastille et nom du bouton « i », et le pop-up s'il est ouvert (écrit seulement si cela change). */
  function paintInfo() {
    const b = $('fInfo');
    if (!b) return;
    const items = infoItems(),
      news = items.some(it => it.news),
      label = news ? `${t(T.info.button)} — ${t(T.info.news)}` : t(T.info.button);
    if (b.hasAttribute('data-badge') !== news) news ? b.setAttribute('data-badge', '') : b.removeAttribute('data-badge');
    if (b.title !== label) b.title = label;
    if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
    if (infoBox) {
      const html = infoHtml(items);
      if (infoBox.html !== html) {
        infoBox.html = html;
        infoBox.list.innerHTML = html;
      }
    }
  }
  /** Ouvre le pop-up d'état, sous le bouton ; Échap, ✕ et un toucher à côté le ferment. */
  async function openInfo() {
    if (infoBox) return;
    await modal(`<div class="f-info-head"><h2>${esc(t(T.info.title))}</h2><button type="button" data-x aria-label="${esc(t(T.close))}" title="${esc(t(T.close))}">${icon('x')}</button></div><ul class="f-info-list"></ul>`,
      (m, close) => {
        m.firstElementChild.setAttribute('aria-label', t(T.info.title));
        infoBox = {
          list: m.querySelector('.f-info-list'),
          close,
          html: ''
        };
        paintInfo();
        m.addEventListener('click', e => {
          const row = e.target.closest('[data-go]');
          if (e.target === m || e.target.closest('[data-x]')) close(null);
          else if (row) {
            close(null);
            goInfo(row.dataset.go);
          }
        });
        m.querySelector('[data-x]').focus();
      }, 'f-info-modal');
    infoBox = null;
    $('fInfo').focus({
      preventScroll: true
    });
  }
  /** Suite d'un toucher sur une ligne : une adresse (un choix de menu : pas de « ← »), ou un CR à écrire : le vol est remis à
   *  report par pilot/handoff.json (le format de flightlog : { to, from, source, at, fresh, family, values }), puis #report?from=
   *  flightlog ; un enregistrement sans « handoff » (schéma 1) renvoie à Mes vols. */
  async function goInfo(go) {
    let to = go;
    if (go.startsWith('report:')) {
      const f = pendingReports[+go.slice(7)],
        flightlog = APP.modules.find(m => m.id === 'flightlog');
      if (!f) return;
      if (f.handoff && isModule('report')) {
        try {
          await infoData.put(HANDOFF, {
            to: 'report',
            from: 'flightlog',
            source: flightlog ? t(flightlog.label) : 'flightlog',
            at: new Date().toISOString(),
            fresh: true,
            family: f.handoff.family,
            values: f.handoff.values
          }, {
            policy: 'cache'
          });
        } catch (e) {
          return notify(String(e.message || e), 'err');
        }
        to = '#report?from=flightlog';
      } else to = '#flightlog';
    }
    // même adresse : rien ne change, sauf pour un CR (report reprend le passage à son montage, donc il est monté de nouveau)
    if (location.hash === to) return go.startsWith('report:') ? route() : undefined;
    if (isModule(to.slice(1).split('?')[0]) && !to.includes('from=')) viaMenu = true;
    location.hash = to;
  }
  // ---------------------------------------------------------------- sous-onglets du groupe (onglet = plusieurs modules)
  // quand l'onglet du module affiché groupe au moins deux modules inscrits au niveau de l'appareil (Préparer : fuel et
  // atmosphere), le cadre dessine au-dessus du module une rangée de sous-onglets, un par module du groupe, de son verbe
  // (meta du cadre : APP.modules[].label), le courant marqué ; aucun module ne connaît ses voisins. Même aspect que les
  // onglets des primitives (.f-tabs), 44 px, téléphone et écran. Un seul module au niveau : rien.
  /** Dessine, met à jour ou retire la rangée de sous-onglets, juste avant le module (seulement si elle change). */
  function paintSubtabs() {
    const view = $('fView'),
      tb = current && !over ? tabOf(current.id) : null,
      ids = tb ? tabVisible(tb) : [],
      show = ids.length > 1 && ids.includes(current.id),
      box = view.querySelector(':scope > .f-subtabs');
    if (!show) return void box?.remove();
    const sig = `${ids.join(',')}|${current.id}|${lang()}`;
    if (box?.dataset.sig === sig) return;
    const el = box || document.createElement('div');
    el.className = 'f-tabs f-subtabs';
    el.dataset.sig = sig;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t(tb.label));
    el.innerHTML = ids.map(id => `<button type="button" data-id="${esc(id)}"${id === current.id ? ' aria-current="page"' : ''}>${esc(t(APP.modules.find(m => m.id === id).label))}</button>`).join('');
    if (!box) view.insertBefore(el, view.querySelector(':scope > .f-module'));
  }
  /** Tout ce que le cadre dessine au-dessus du module : les sous-onglets du groupe. */
  function paintTop() {
    paintSubtabs();
  }
  /** Source en lecture seule des bases de référence (SIA, appareils) quand rien n'est échangé : le lanceur qui sert la
   *  page, sinon le dépôt GitHub réglé ; null sans l'un ni l'autre (site public : ces bases n'y sont jamais publiées). */
  function referenceSource() {
    if (launcherHere?.data) return FD.launcher({
      exchange: false
    });
    return FD.github.config() ? FD.github() : null;
  }
  /** « Couper l'accès » : jeton et réglage du dépôt GitHub effacés de cet appareil (copies et écritures en attente
   *  gardées), transport rebranché aussitôt. */
  async function cutAccess() {
    FD.github.clear();
    await loadDevice();
  }
  /** Transport de l'appareil : page servie par un lanceur → son data/ est le stockage (transport lanceur, quels que
   *  soient les usages ; l'échange git seulement si « plusieurs appareils » ou « plusieurs utilisateurs » est coché) ;
   *  sinon, aucun échange coché → local ; GitHub s'il est réglé. */
  async function chooseTransport() {
    const exchange = usages.devices || usages.users;
    const L = launcherHere;
    if (L?.data) return FD.launcher({
      exchange: !!exchange && L.dataGit,
      author: () => identity.trigram || ''
    });
    if (!exchange && !usages.backend) return FD.transports.local();
    if (FD.github.config()) return FD.github();
    return {
      ...FD.transports.local(),
      missing: true
    };
  }

  // ---------------------------------------------------------------- bouton de synchronisation
  let lastSyncState = '';
  /** Écrit l'état du bouton (seulement s'il change). */
  function paintSync(s) {
    lastStatus = s;
    paintInfo(); // le pop-up du « i » : même état
    let state, label;
    if (s.syncing)[state, label] = ['syncing', t(T.sync.syncing)];
    else if (s.conflicts)[state, label] = ['conflicts', t(T.sync.conflicts, {
      n: s.conflicts
    })];
    else if (s.transport === 'local' && !s.pending)[state, label] = ['local', t(T.sync.local)];
    else if (!s.online || s.lastError === 'offline')[state, label] = ['offline', s.pending ? `${t(T.sync.offline)} · ${t(T.sync.pending, { n: s.pending })}` : t(T.sync.offline)];
    else if (s.lastError)[state, label] = ['error', t(T.sync.error)];
    else if (s.pending)[state, label] = ['pending', t(T.sync.pending, {
      n: s.pending
    })];
    else [state, label] = ['ok', s.lastSync ? t(T.sync.ago, {
      d: ago(s.lastSync)
    }) : t(T.sync.ok)];
    // infobulle : l'état, puis les écritures en attente (chemin, module, heure ; cinq au plus) et la dernière erreur
    const queue = (s.queue || []).slice(0, 5).map(q => `\n• ${q.deletion ? '✕ ' : ''}${q.path} — ${q.module || '?'}, ${tz('fmtZ', q.at)}`)
      .join('') + ((s.queue || []).length > 5 ? '\n…' : '');
    const title = t(T.sync.title, {
      tr: s.transport,
      last: s.lastSync ? tz('fmtDateZ', s.lastSync) : t(T.sync.never),
      n: s.pending,
      e: s.lastError ? ` — ${errText(s.lastError)}` : ''
    }) + queue;
    // état court pour un écran étroit (le libellé entier reste dans l'infobulle et le nom accessible du bouton)
    const short = {
      ok: '✓',
      pending: String(s.pending),
      syncing: '⟳',
      offline: '✕',
      error: '✕',
      conflicts: `! ${s.conflicts}`,
      local: ''
    } [state];
    const key = JSON.stringify([state, label, title, short]);
    if (key === lastSyncState) return;
    lastSyncState = key;
    const b = $('fSync');
    b.dataset.state = state;
    b.title = title;
    b.setAttribute('aria-label', label);
    b.querySelector('.f-lbl').textContent = label;
    b.querySelector('.f-lbl-short').textContent = short;
  }
  /** Synchronise maintenant et dit le résultat (reçus, envoyés, conflits, hors ligne, erreur). */
  async function syncNow(quiet = false) {
    const r = await FD.sync();
    if (r.conflicts) notify(t(T.sync.conflictNote, {
      n: r.conflicts
    }), 'warn');
    if (quiet) return r;
    if (r.error === 'offline') notify(t(T.sync.offlineNote), 'warn');
    else if (r.error) notify(t(T.sync.failed, {
      e: errText(r.error)
    }), 'err');
    else notify(t(T.sync.done, {
      p: r.pulled.length,
      s: r.pushed
    }), 'ok');
    return r;
  }

  /** Erreur de la couche de données dans la langue de l'appli ; celle d'un serveur, citée telle quelle. */
  const errText = e => {
    const k = {
      offline: 'offline',
      'no transport': 'none',
      'repository kept moving: try again': 'moving'
    } [e];
    return k ? t(T.sync.errs[k]) : t(T.sync.errs.other, {
      e
    });
  };
  // ---------------------------------------------------------------- écrans chargés à la demande
  // Réglages, aide et feuille de route : scripts classiques injectés à la première ouverture de leur écran (le service
  // worker les garde comme les autres fichiers du cadre) ; le démarrage, le menu et le premier module ne les attendent
  // jamais ; l'aide en page d'un module est chargée après son montage
  const LAZY = {
    help: ['lib/markdown.js?v=0', 'help/help.js?v=0'],
    roadmap: ['help/roadmap.js?v=0'],
    settings: ['settings/admin_links.js?v=0', 'settings/config.js?v=0', 'settings/join.js?v=0', 'lib/qr.js?v=0',
      'settings/settings.js?v=0'
    ]
  };
  const injected = new Map(); // chemin → promesse du script chargé
  /** Charge un script classique du cadre une fois (dans l'ordre : chacun après le précédent). */
  const script = p => injected.get(p) || injected.set(p, new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL(`frame/${p}`, ROOT).href;
    s.onload = res;
    s.onerror = () => {
      injected.delete(p); // hors ligne sans copie : nouvel essai à la prochaine ouverture
      s.remove();
      rej(new Error(p.split('?')[0]));
    };
    document.head.append(s);
  })).get(p);
  /** Scripts d'un écran (help, roadmap, settings), chargés une fois. */
  async function need(k) {
    for (const p of LAZY[k]) await script(p);
  }
  /** Écran d'aide ou de feuille de route : ses scripts d'abord ; rien si l'adresse a changé entre-temps. */
  async function showDoc(id, box, query) {
    const at = location.hash;
    try {
      await need(id);
    } catch (e) {
      return notify(t(T.loadErr, {
        m: id,
        e: e.message || e
      }), 'err');
    }
    if (location.hash !== at || !box.isConnected) return;
    return id === 'help' ? SogHelp.screen(box, helpCtx(), query) : SogRoadmap.screen(box, helpCtx());
  }
  /** Aide en page d'un module monté : panneau replié « Comment s'en servir » tiré de son chapitre (frame/help), posé
   *  avant lui, et carte d'accueil des tutoriels à la première ouverture ; chargée après le module, jamais avant. */
  function moduleHelp(entry, meta, el, view) {
    if (meta.fixed === true) return; // vue fixe sans défilement : ni panneau replié ni carte d'accueil (le ? ouvre le chapitre)
    need('help').then(() => {
      if (!el.isConnected) return;
      if (meta.help !== false) SogHelp.panel(entry.id, helpCtx()).then(p => p && el.isConnected && view.insertBefore(p, el))
        .catch(e => console.warn('help', e));
      SogHelp.welcome?.(helpCtx()).then(w => w && el.isConnected && view.prepend(w)).catch(e => console.warn('help', e));
    }).catch(e => console.warn('help', e));
  }
  /** Fichiers de l'aide dans la langue de l'appli (manuel, tutoriels), gardés dès l'installation. */
  async function helpFiles() {
    try {
      await need('help');
      return (SogHelp.files?.(lang()) || []).map(p => new URL(`frame/help/${p}`, ROOT).href);
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------- navigation
  const ROUTES = {
    conflicts: renderConflicts,
    settings: renderSettings,
    device: renderSettings
  };
  /** Adresse : { id (avant « ? »), query (la suite, en objet gelé : #report?from=flightlog → { from: 'flightlog' }) }. */
  function parseHash() {
    const h = location.hash.slice(1),
      i = h.indexOf('?');
    let id = i < 0 ? h : h.slice(0, i);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* adresse mal formée : prise telle quelle */
    }
    return {
      id,
      query: Object.freeze(Object.fromEntries(new URLSearchParams(i < 0 ? '' : h.slice(i + 1))))
    };
  }
  // niveau de chaque module (meta.level, 1 par défaut), relevé au démarrage en important les points d'entrée
  const moduleLevel = {},
    moduleFixed = {}; // meta.fixed de chaque module (vue pleine hauteur sans défilement de page), relevé avec le niveau
  let levelsP = null; // relevé des niveaux en cours (readLevels)
  let menuKey = '',
    menuActive = '',
    menuScreen = '';
  /** Modules du menu au niveau de l'appareil (meta.level ≤ niveau) ; un module au niveau encore inconnu est montré. */
  const visibleModules = () => APP.modules.filter(m => (moduleLevel[m.id] ?? 1) <= level);
  /** Niveau (meta.level) et vue fixe (meta.fixed) déclarés par chaque module, puis menu et barre redessinés ; module
   *  illisible : niveau 1. */
  async function readLevels() {
    await Promise.all(APP.modules.map(async m => {
      try {
        const meta = (await import(new URL(`modules/${m.id}/module.js`, ROOT).href)).meta || {};
        moduleLevel[m.id] = levelFrom(meta.level ?? 1);
        moduleFixed[m.id] = meta.fixed === true;
      } catch {
        moduleLevel[m.id] = 1;
      }
    }));
    renderMenu();
    paintFixed(current?.id || ''); // le module déjà affiché peut se révéler fixe maintenant
    paintTop(); // et son groupe d'onglets compter plusieurs modules au niveau de l'appareil
  }
  /** Menu des verbes du niveau de l'appareil (redessiné seulement quand la liste change), entrée courante marquée ; la
   *  barre d'onglets suit (screen : l'écran du cadre affiché, ou rien). */
  function renderMenu(active = menuActive, screen = menuScreen) {
    menuActive = active;
    menuScreen = screen;
    renderTabs(tabFor(active, screen));
    const ul = $('fMenu'),
      list = visibleModules(),
      key = list.map(m => m.id).join(',');
    if (key !== menuKey || !ul.children.length) {
      menuKey = key;
      ul.innerHTML = list.map(m => `<li><a href="#${esc(m.id)}" data-id="${esc(m.id)}" data-landmark="${esc(m.id)}">${icon(m.icon)}${esc(t(m.label))}</a></li>`).join('');
    }
    for (const a of ul.querySelectorAll('a')) {
      const on = a.dataset.id === active;
      if ((a.getAttribute('aria-current') === 'page') !== on) on ? a.setAttribute('aria-current', 'page') : a.removeAttribute(
        'aria-current');
    }
  }
  // ---------------------------------------------------------------- barre d'onglets du téléphone (APP.tabs)
  // un onglet = un groupe de modules ou un écran du cadre ; choisi tant qu'un module de son groupe est affiché ; le toucher
  // ouvre le dernier module du groupe montré dans cette session, sinon le premier. Dessinée toujours, masquée par la
  // feuille de style au-dessus de 760 px (la colonne des verbes la remplace sur un écran).
  const lastInTab = {}; // onglet → dernier module du groupe affiché
  let tabsKey = '';
  /** Onglet qui groupe le module id (même non inscrit : atmosphere avant son module), sinon null. */
  const tabOf = id => APP.tabs.find(tb => tb.modules?.includes(id)) || null;
  /** Modules inscrits d'un onglet (un id inconnu est ignoré sans bruit) et, parmi eux, ceux du niveau de l'appareil. */
  const tabModules = tb => (tb.modules || []).filter(id => APP.modules.some(m => m.id === id));
  const tabVisible = tb => tabModules(tb).filter(id => (moduleLevel[id] ?? 1) <= level);
  /** Onglet marqué : celui des réglages quand leur écran est affiché, sinon celui du module affiché ('' si aucun). */
  const tabFor = (moduleId, screenId) => ['settings', 'device'].includes(screenId) ? 'settings' : tabOf(moduleId)?.id || '';
  /** Adresse d'un onglet : son écran, ou le dernier module du groupe montré, sinon le premier à ce niveau. */
  function tabTarget(tb) {
    if (tb.screen) return `#${tb.screen}`;
    const vis = tabVisible(tb);
    return `#${vis.includes(lastInTab[tb.id]) ? lastInTab[tb.id] : vis[0] || ''}`;
  }
  /** Barre des onglets du niveau de l'appareil (redessinée seulement quand la liste ou la langue change), adresses et onglet
   *  choisi mis à jour seulement s'ils changent. */
  function renderTabs(active) {
    const nav = $('fTabs'),
      list = APP.tabs.filter(tb => tb.screen || tabVisible(tb).length),
      key = lang() + list.map(tb => tb.id).join(',');
    if (key !== tabsKey || !nav.children.length) {
      tabsKey = key;
      // data-landmark : la couleur repère du premier module du groupe (design metro) ; l'icône pleine remplace le trait
      // sur l'onglet choisi (la feuille de style montre l'une ou l'autre : la forme change, pas seulement la couleur)
      nav.setAttribute('aria-label', t(T.tabsNav));
      nav.innerHTML = `<ul>${list.map(tb => `<li><a data-tab="${esc(tb.id)}" data-landmark="${esc(tb.screen ? 'settings' : tabModules(tb)[0] || tb.modules[0])}"><span class="f-tab-ico">${icon(tb.icon)}${Icons?.svg(tb.icon, { filled: true }) || ''}</span><span class="f-tab-lbl">${esc(t(tb.label))}</span></a></li>`).join('')}</ul>`;
    }
    for (const a of nav.querySelectorAll('a')) {
      const tb = APP.tabs.find(x => x.id === a.dataset.tab),
        href = tabTarget(tb),
        on = a.dataset.tab === active;
      if (a.getAttribute('href') !== href) a.setAttribute('href', href);
      if ((a.getAttribute('aria-current') === 'page') !== on) on ? a.setAttribute('aria-current', 'page') : a.removeAttribute(
        'aria-current');
    }
  }
  let current = null; // { id, mod }
  /** Affiche l'écran de l'adresse (#module, #module?…, #conflicts, #settings) ; démonte le module précédent. */
  async function route() {
    const h = parseHash(),
      id = h.id || visibleModules()[0]?.id || 'settings';
    // écrans du cadre (aide, feuille de route, réglages, conflits) par-dessus le module courant, qui reste monté
    if (over && location.hash === over.returnHash) return closeOver();
    if (SCREENS.includes(id) && (current || over)) return openOver(id, h);
    if (over) closeOver(false);
    paintModule(id);
    if (isModule(id)) {
      const tb = tabOf(id);
      if (tb) lastInTab[tb.id] = id; // le toucher de l'onglet y reviendra
    }
    if (current?.mod?.unmount) try {
      current.mod.unmount();
    } catch (e) {
      console.error(e);
    }
    current = null;
    closePane();
    // retour : ce module est-il ouvert par passage d'un autre ? (avant de noter l'écran courant)
    origin = originOf(id, h.query);
    paintBack();
    const view = $('fView');
    view.replaceChildren();
    renderMenu(id, id);
    paintPaneButton(null);
    if (id === 'help' || id === 'roadmap' || ROUTES[id]) paintFixed(''); // un écran du cadre défile comme une page
    if (id === 'help' || id === 'roadmap') return showDoc(id, view, h.query);
    if (ROUTES[id]) return ROUTES[id](view);
    const entry = APP.modules.find(m => m.id === id) || APP.modules[0];
    if (!entry) return renderSettings(view);
    paintFixed(entry.id); // vue fixe connue d'avance : pas de saut de mise en page à l'arrivée du module
    try {
      const mod = await import(new URL(`modules/${entry.id}/module.js`, ROOT).href);
      const meta = mod.meta || {};
      if (meta.id && meta.id !== entry.id) throw new Error(`meta.id ${meta.id} ≠ ${entry.id}`);
      const el = document.createElement('section');
      el.className = 'f-module';
      el.dataset.module = entry.id;
      el.dataset.landmark = entry.id;
      view.append(el);
      current = {
        id: entry.id,
        mod
      };
      moduleFixed[entry.id] = meta.fixed === true;
      paintFixed(entry.id);
      paintTop();
      lastScreen = {
        id: entry.id,
        hash: location.hash
      };
      await mod.mount(el, ctxFor(entry, meta, h.query));
      moduleHelp(entry, meta, el, view);
      // vue double : volet demandé par l'adresse (#fuel?with=maps) ou gardé pour ce module (device/layout.json)
      paintPaneButton(entry);
      const want = paneWanted(entry, h.query);
      if (want && want !== entry.id && current?.id === entry.id) openPane(entry, want);
    } catch (e) {
      paintFixed('');
      view.innerHTML = `<p class="f-card">${esc(t(T.loadErr, { m: entry.id, e: e.message || e }))}</p>`;
      notify(t(T.loadErr, {
        m: entry.id,
        e: e.message || e
      }), 'err');
    }
  }
  // ---------------------------------------------------------------- vue double (grand écran, ≥ 980 px)
  // le module courant à gauche, un second à droite (volet) ; chacun est un mount() ordinaire avec son propre ctx, les deux
  // ne se parlent qu'à travers les enregistrements partagés (pilot/<tri>/current_flight.json, watch) ; sur téléphone,
  // rien ne change. Volet ouvert par module : device/layout.json ({ panes: { fuel: 'maps' } }), adresse #fuel?with=maps
  const wide = matchMedia('(min-width: 980px)'),
    // à partir de 1200 px, un module qui propose un volet l'ouvre de lui-même tant que l'utilisateur n'a rien choisi
    wideAuto = matchMedia('(min-width: 1200px)');
  /** Volet voulu pour un module : l'adresse (?with=), sinon le choix gardé (y compris « fermé »), sinon son volet
   *  proposé sur un écran d'au moins 1200 px. */
  const paneWanted = (entry, query = {}) => isModule(query.with) && query.with !== entry.id ? query.with : entry.id in layout ?
    layout[entry.id] : entry.pane && wideAuto.matches ? entry.pane : '';
  let pane = null, // { id, mod, el }
    layout = {};
  /** Démonte le volet (changement de module, fermeture, écran devenu étroit). */
  function closePane() {
    if (!pane) return;
    try {
      pane.mod.unmount?.();
    } catch (e) {
      console.error(e);
    }
    pane.el.remove();
    pane = null;
    $('fView').classList.remove('f-split');
    layoutChanged();
  }
  /** Vue double changée (volet ouvert ou fermé) : événement « frame-layout » { main, pane } (ctx.layout le suit). */
  const layoutChanged = () => window.dispatchEvent(new CustomEvent('frame-layout', {
    detail: {
      main: current?.id || null,
      pane: pane?.id || null
    }
  }));
  /** Module monté à côté de id dans la vue double (le volet pour le module courant, et l'inverse), sinon null. */
  const besideOf = id => !pane || !current ? null : id === current.id ? pane.id : id === pane.id ? current.id : null;
  /** Monte le module paneId à côté du module courant (seulement sur grand écran). */
  async function openPane(entry, paneId) {
    const p = APP.modules.find(m => m.id === paneId);
    if (!p || !wide.matches || pane?.id === paneId) return;
    closePane();
    const el = document.createElement('aside'),
      sec = document.createElement('section');
    el.className = 'f-pane';
    sec.className = 'f-module';
    sec.dataset.module = p.id;
    sec.dataset.landmark = p.id;
    // « × » : ferme le volet comme la bascule (choix gardé)
    const bar = document.createElement('div'),
      x = document.createElement('button');
    bar.className = 'f-pane-bar';
    x.type = 'button';
    x.className = 'f-pane-close';
    x.innerHTML = Icons?.svg('x') || '×';
    x.title = t(T.paneClose, {
      m: t(p.label)
    });
    x.setAttribute('aria-label', x.title);
    x.onclick = () => togglePane();
    bar.append(x);
    el.append(bar, sec);
    pane = {
      id: p.id,
      mod: null,
      el
    };
    $('fView').classList.add('f-split');
    $('fView').append(el);
    layoutChanged();
    try {
      const mod = await import(new URL(`modules/${p.id}/module.js`, ROOT).href);
      if (pane?.el !== el) return; // fermé entre-temps
      pane.mod = mod;
      if (mod.meta?.fixed === true) sec.dataset.fixed = ''; // module de vue fixe : le cadre lui donne la hauteur du volet (--f-pane-h)
      await mod.mount(sec, ctxFor(p, mod.meta || {}, Object.freeze({
        pane: '1'
      })));
    } catch (e) {
      notify(t(T.loadErr, {
        m: p.id,
        e: e.message || e
      }), 'err');
      closePane();
    }
    paintPaneButton(entry);
  }
  /** Bouton d'en-tête du volet : visible sur grand écran pour un module qui propose un volet (ou en a un d'ouvert). */
  function paintPaneButton(entry) {
    const b = $('fPane'),
      id = pane?.id || entry?.pane || '',
      p = APP.modules.find(m => m.id === id),
      // seulement pour un module : jamais sur un écran du cadre (réglages, aide, feuille de route, conflits)
      show = !!(entry && p && wide.matches && !over);
    if (b.hidden === show) b.hidden = !show;
    if (!show) return;
    const on = !!pane,
      html = `${Icons?.svg(p.icon) || ''}<span>${esc(t(p.label))}</span>`,
      title = t(on ? T.paneClose : T.paneOpen, {
        m: t(p.label)
      });
    if (b.innerHTML !== html) b.innerHTML = html;
    if (b.title !== title) b.title = title;
    if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
  }
  /** Ouvre ou ferme le volet du module courant ; l'état est gardé pour ce module, l'adresse suit (sans remonter). */
  async function togglePane() {
    const entry = APP.modules.find(m => m.id === current?.id);
    if (!entry || over) return;
    const id = pane ? '' : entry.pane || pane?.id || '';
    if (pane) closePane();
    else if (id) await openPane(entry, id);
    paintPaneButton(entry);
    layout = {
      ...layout,
      [entry.id]: pane?.id || ''
    };
    await own.put('device/layout.json', {
      panes: layout,
      updated_at: new Date().toISOString()
    });
    const hash = `#${entry.id}${pane ? `?with=${pane.id}` : ''}`;
    if (location.hash !== hash) history.replaceState(history.state, '', hash);
    if (lastScreen?.id === entry.id) lastScreen.hash = location.hash;
  }

  // ---------------------------------------------------------------- écrans du cadre par-dessus un module
  // aide, feuille de route, réglages, conflits : ouverts depuis un module, ils se montrent dans la zone du module sans
  // le démonter (il est seulement masqué) ; le bouton qui les a ouverts (enfoncé tant qu'ils le sont), Échap ou le retour
  // du navigateur les referment, et l'on retrouve le module tel quel : même adresse, même étape, même défilement
  const SCREENS = ['help', 'roadmap', 'settings', 'device', 'conflicts'];
  let over = null; // { id, returnHash, scroll, stack: [adresses des écrans du cadre ouverts], sig }
  // ce qu'un module lit à son montage (identité, usages, niveau, langue, transport) : changé pendant que l'écran du cadre
  // était ouvert (réglages), le module est remonté à la fermeture au lieu d'être rendu tel quel
  const mountSig = () => JSON.stringify([identity, usages.devices, usages.users, level, lang(), configured?.id || '']);
  /** Ouvre (ou change) l'écran du cadre id par-dessus le module courant. */
  async function openOver(id, h) {
    if (!over) over = {
      returnHash: lastScreen?.id === current?.id && lastScreen?.hash ? lastScreen.hash : `#${current?.id || ''}`,
      scroll: scrollY,
      stack: [],
      sig: mountSig()
    };
    // retour du navigateur d'un écran du cadre au précédent : la pile recule ; sinon elle avance
    const k = over.stack.indexOf(location.hash);
    k >= 0 ? over.stack.length = k + 1 : over.stack.push(location.hash);
    over.id = id;
    paintModule(id);
    const view = $('fView');
    let scr = view.querySelector(':scope > .f-screen');
    if (!scr) {
      scr = document.createElement('div');
      scr.className = 'f-screen';
      view.append(scr);
      view.classList.add('f-over');
    }
    scr.replaceChildren();
    scr.onclick = null;
    renderMenu(current?.id || '', id);
    paintFixed(''); // un écran du cadre défile comme une page, même sur un module fixe (masqué, toujours monté)
    paintTop();
    paintBack();
    paintToggles();
    paintPaneButton(null);
    scrollTo(0, 0);
    if (id === 'help' || id === 'roadmap') return showDoc(id, scr, h.query);
    return ROUTES[id]?.(scr);
  }
  /** Retire l'écran du cadre ; restore : le module réapparaît à son défilement d'avant. */
  function closeOver(restore = true) {
    const o = over;
    if (!o) return;
    over = null;
    const view = $('fView');
    view.querySelector(':scope > .f-screen')?.remove();
    view.classList.remove('f-over');
    paintBack();
    paintToggles();
    paintPaneButton(APP.modules.find(m => m.id === current?.id) || null);
    if (!restore) return;
    paintModule(current?.id);
    if (o.sig !== mountSig()) return route(); // réglages changés : le module est remonté avec eux
    renderMenu(current?.id || '', '');
    paintFixed(current?.id || '');
    paintTop();
    requestAnimationFrame(() => scrollTo(0, o.scroll));
  }
  /** Ferme l'écran du cadre (second clic sur son bouton, Échap) : retour du navigateur s'il n'y a eu qu'un écran,
   *  sinon l'adresse du module remise en place. */
  function leaveOver() {
    if (!over) return;
    if (over.stack.length === 1 && history.length > 1) history.back();
    else {
      history.replaceState(history.state, '', over.returnHash);
      closeOver();
    }
  }
  /** Boutons de l'en-tête enfoncés tant que leur écran est ouvert. */
  function paintToggles() {
    const set = (b, on) => b && b.getAttribute('aria-pressed') !== String(on) && b.setAttribute('aria-pressed', String(on));
    set($('fHelp'), !!over && ['help', 'roadmap'].includes(over.id));
    set($('fDevice'), !!over && ['settings', 'device'].includes(over.id));
  }

  // ---------------------------------------------------------------- retour au module d'origine
  // un module ouvert par passage d'un autre (#fuel?from=maps, ou une adresse posée par le module précédent : « Modifier
  // la route » de la Carte, « Écrire le CR » de Mes vols) montre « ← <module d'origine> » dans l'en-tête ; pas après un
  // choix dans le menu ; disparaît au changement de module. Retour : page précédente de la session si c'est elle,
  // sinon l'adresse du module d'origine
  let lastScreen = null, // { id, hash } : dernier écran affiché
    origin = null, // { id, hash, back }
    viaMenu = false; // navigation demandée par le menu des verbes
  const isModule = id => APP.modules.some(m => m.id === id);
  /** Module d'origine de l'écran id : ?from= s'il nomme un module, sinon l'écran précédent s'il était un module et que
   *  l'on n'arrive pas par le menu ; null sinon. */
  function originOf(id, query) {
    const prev = lastScreen,
      menu = viaMenu,
      // entrée d'historique déjà vue (retour ou avance du navigateur, ou notre retour) : pas de « ← » vers l'écran quitté
      revisit = !!history.state?.sogSeen;
    viaMenu = false;
    if (!revisit) history.replaceState({
      ...(history.state || {}),
      sogSeen: true
    }, '');
    if (!isModule(id) || revisit) return null;
    if (isModule(query.from) && query.from !== id) return {
      id: query.from,
      hash: prev?.id === query.from ? prev.hash : `#${query.from}`,
      back: prev?.id === query.from
    };
    if (!menu && prev && prev.id !== id && isModule(prev.id)) return {
      id: prev.id,
      hash: prev.hash,
      back: true
    };
    return null;
  }
  /** Bouton de retour de l'en-tête (écrit seulement s'il change). */
  function paintBack() {
    const b = $('fBack'),
      m = over ? null : APP.modules.find(x => x.id === origin?.id),
      show = !!m;
    if (b.hidden === show) b.hidden = !show;
    document.querySelector('.f-head').classList.toggle('f-has-back', show);
    if (!show) return;
    const html = `${Icons?.svg('chevron-left') || '←'}<span>${esc(t(m.label))}</span>`,
      title = t(T.back, {
        m: t(m.label)
      });
    if (b.innerHTML !== html) b.innerHTML = html;
    if (b.title !== title) b.title = title;
  }

  /** Contexte d'un module : son adaptateur de données (ses préfixes déclarés), aerodb, textes, notifications, questions,
   *  appels sortants, identité et compagnie en lecture seule, suite de l'adresse (query). */
  function ctxFor(entry, meta, query = Object.freeze({})) {
    return {
      app: APP.id,
      data: FD.adapter({
        id: entry.id,
        reads: meta.reads || [],
        writes: meta.writes || []
      }),
      aerodb,
      t,
      lang,
      notify,
      ask,
      askText,
      net,
      get identity() {
        return identity;
      },
      get airline() {
        return airline;
      },
      get live() {
        return liveApi();
      },
      query,
      // l'onglet de la barre du bas qui groupe ce module (id de APP.tabs), null s'il n'en a pas
      tab: tabOf(entry.id)?.id || null,
      // vue double : { with } le module montré à côté (ou null) ; l'événement « frame-layout » (window) suit chaque changement
      get layout() {
        return Object.freeze({
          with: besideOf(entry.id)
        });
      },
      // ctx.help : open() ouvre le panneau d'aide déjà posé (l'aide est alors chargée), link() est une adresse
      help: Object.freeze({
        open: subject => window.SogHelp ? SogHelp.forModule(entry.id, $('fView')).open(subject) : false,
        link: (m = entry.id) => `#help?m=${encodeURIComponent(m)}`
      })
    };
  }
  /** Contexte de l'aide (frame/help/help.js) : textes, langue, documents de l'appareil, racine de la suite. */
  const helpCtx = () => ({
    t,
    lang,
    own,
    root: ROOT
  });

  // ---------------------------------------------------------------- écran des conflits
  const C = {
    title: ['Conflits', 'Conflicts', 'Konflikte', 'Conflictos'],
    intro: [
      'Fichiers modifiés ici et ailleurs en même temps : la version la plus récente a été gardée ; l’autre est ici, vous pouvez la reprendre.',
      'Files changed here and elsewhere at the same time: the newest version was kept; the other one is here, you can take it back.',
      'Hier und anderswo gleichzeitig geänderte Dateien: die neueste Version wurde behalten; die andere ist hier, Sie können sie zurücknehmen.',
      'Archivos modificados aquí y en otro lugar a la vez: se conservó la versión más reciente; la otra está aquí, puede recuperarla.'
    ],
    none: ['Aucun conflit.', 'No conflict.', 'Kein Konflikt.', 'Ningún conflicto.'],
    all: ['Montrer aussi les conflits déjà vus', 'Also show conflicts already seen', 'Auch gesehene Konflikte zeigen',
      'Mostrar también los conflictos ya vistos'
    ],
    lostLocal: ['Version écartée : celle de cet appareil', 'Set aside: this device’s version', 'Verworfen: die Version dieses Geräts',
      'Descartada: la versión de este dispositivo'
    ],
    lostRemote: ['Version écartée : celle d’un autre appareil', 'Set aside: another device’s version',
      'Verworfen: die Version eines anderen Geräts', 'Descartada: la versión de otro dispositivo'
    ],
    kept: ['Version gardée', 'Kept version', 'Behaltene Version', 'Versión conservada'],
    refused: ['Écriture refusée : {p} — reprendre ou écarter', 'Write refused: {p} — take it back or set it aside',
      'Schreibvorgang abgelehnt: {p} — zurücknehmen oder verwerfen', 'Escritura rechazada: {p} — recuperarla o descartarla'
    ],
    refusedWhy: ['Refusée par {s} : {w}. Rien n’a été écrit ; voici ce qui devait l’être.',
      'Refused by {s}: {w}. Nothing was written; here is what was to be.',
      'Abgelehnt von {s}: {w}. Nichts wurde geschrieben; hier ist, was geschrieben werden sollte.',
      'Rechazada por {s}: {w}. No se escribió nada; esto es lo que debía escribirse.'
    ],
    refusedDel: ['(une suppression)', '(a deletion)', '(eine Löschung)', '(una eliminación)'],
    restore: ['Reprendre cette version', 'Take this version back', 'Diese Version zurücknehmen', 'Recuperar esta versión'],
    seen: ['Vu', 'Seen', 'Gesehen', 'Visto'],
    restored: ['Version reprise : elle partira à la prochaine synchronisation.',
      'Version taken back: it will leave at the next synchronisation.',
      'Version zurückgenommen: sie geht bei der nächsten Synchronisation hinaus.',
      'Versión recuperada: saldrá en la próxima sincronización.'
    ]
  };
  async function renderConflicts(view, all = false) {
    const list = (await FD.conflicts()).filter(c => all || !c.seen).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    view.innerHTML = `<h1>${esc(t(C.title))}</h1><p class="f-muted">${esc(t(C.intro))}</p><label class="f-check"><input type="checkbox" data-all ${all ? 'checked' : ''}>${esc(t(C.all))}</label>${list.length ? list.map(c => `<div class="f-card" data-id="${c.id}">${c.side === 'refused' ? `<b>${esc(t(C.refused, { p: c.path }))}</b> <span class="f-muted">${esc(tz('fmtDateZ', c.at))}</span><p class="f-muted">${esc(t(C.refusedWhy, { s: c.by || '?', w: c.why || '?' }))}</p><details><summary>${esc(c.path)}</summary><pre>${esc(c.lost || t(C.refusedDel))}</pre></details>` : `<b>${esc(c.path)}</b> <span class="f-muted">${esc(tz('fmtDateZ', c.at))}</span><details><summary>${esc(t(c.side === 'local' ? C.lostLocal : C.lostRemote))}</summary><pre>${esc(c.lost)}</pre></details><details><summary>${esc(t(C.kept))}</summary><pre>${esc(c.kept)}</pre></details>`}<div class="f-row">${c.restored ? '' : `<button type="button" class="primary" data-restore>${esc(t(C.restore))}</button>`}${c.seen ? '' : `<button type="button" data-seen>${esc(t(C.seen))}</button>`}</div></div>`).join('') : `<p class="f-card">${esc(t(C.none))}</p>`}`;
    view.querySelector('[data-all]').onchange = e => renderConflicts(view, e.target.checked);
    view.onclick = async e => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const id = +card.dataset.id;
      if (e.target.closest('[data-restore]')) {
        await FD.restore(id);
        notify(t(C.restored), 'ok');
      } else if (e.target.closest('[data-seen]')) await FD.conflictSeen(id);
      else return;
      renderConflicts(view, all);
    };
  }

  // ---------------------------------------------------------------- écran des réglages (frame/settings/settings.js)
  /** Réglages de l'appareil : écran du cadre (il règle transport et jeton), avec son contexte privilégié. */
  async function renderSettings(view) {
    const at = location.hash;
    try {
      await need('settings');
    } catch (e) {
      return notify(t(T.loadErr, {
        m: 'settings',
        e: e.message || e
      }), 'err');
    }
    if (location.hash !== at || !view.isConnected) return; // écran quitté pendant le chargement
    if (!window.SogSettings) return view.replaceChildren();
    return SogSettings.render(view, {
      t,
      notify,
      ask,
      FD,
      own,
      reload: loadDevice,
      identity: () => identity,
      usages: () => usages,
      launcher: () => launcherHere,
      transport: () => configured,
      aerodb: () => aerodb,
      syncNow,
      level: () => level,
      modules: async () => (await levelsP, APP.modules.map(m => ({
        id: m.id,
        label: m.label,
        level: moduleLevel[m.id] ?? 1
      }))),
      cutAccess,
      weatherKey,
      // heures de l'appli (frame/lib/time.js) : « 16:30Z », date UTC et heure Z
      time: Object.freeze({
        fmtZ: iso => tz('fmtZ', iso),
        fmtZLocal: iso => tz('fmtZLocal', iso),
        fmtDateZ: iso => tz('fmtDateZ', iso)
      }),
      // accès des appareils du réseau local : seulement sur le poste qui sert la page (pas depuis un appareil appairé)
      lan: () => launcherHere && !launcherHere.lan ? {
        state: () => lanCall(),
        open: () => lanCall({
          open: true
        }),
        // les autres adresses privées de ce poste (VPN, machines virtuelles…), seulement sur demande
        openAll: () => lanCall({
          open: true,
          all: true
        }),
        close: () => lanCall({
          open: false
        }),
        // un code sert une fois et dure 10 minutes ; il rouvre l'appairage fermé après trop d'essais
        newCode: () => lanCall({
          code: true
        }),
        // un appareil (son id) ou tous
        forget: id => lanCall({
          forget: id || true
        })
      } : null,
      // après un clone ou une reprise de data/ par le lanceur : relevé de nouveau, transport rebranché
      redetect: async () => {
        launcherHere = await FD.launcher.detect();
        await loadDevice();
      },
      helpPanel: () => need('help').then(() => SogHelp.panel('settings', helpCtx())).catch(() => null),
      // carte Diagnostic : état de la couche de données et de la base aéronautique, à copier pour un rapport
      async diagnostic() {
        const d = await FD.diagnostic(),
          a = await aerodb?.status?.().catch(e => ({
            error: e?.message || String(e)
          }));
        return {
          ...d,
          // la page : contexte sûr (https ou ce poste) ou non ; hors ligne (service worker) actif, absent ou impossible
          page: {
            secure: !!window.isSecureContext,
            offline: !navigator.serviceWorker ?
              'unavailable: page over http outside this computer (a service worker needs https or localhost)' : navigator
              .serviceWorker.controller ? 'active' : 'not yet active',
            launcher: launcherHere ? {
              host: launcherHere.host,
              lan: launcherHere.lan
            } : null
          },
          aerodb: a ? {
            source: a.source,
            zones: Object.keys(a.published || {}),
            loaded: Object.keys(a.loaded || {}),
            missing: a.missing,
            error: a.error
          } : null
        };
      },
      // carte Design : jeux proposés, choix actuel, enregistrement (device/design.json, appliqué aussitôt)
      designs: () => DESIGNS,
      design: () => ({
        ...design
      }),
      async saveDesign(v) {
        const d = designFrom(v);
        await own.put('device/design.json', {
          ...d,
          updated_at: new Date().toISOString()
        });
        applyDesign(d);
      }
    });
  }

  // ---------------------------------------------------------------- position réelle pendant un vol démarré
  // actif tant que pilot/<tri>/current_flight.json porte started (remis à null par l'annulation de fuel ou
  // l'enregistrement du compte rendu), démarré il y a moins de 24 h (un vol oublié ne garde pas le GPS allumé), quel que
  // soit le module ouvert ; sources, dans l'ordre :
  //   0. page servie par un lanceur : le simulateur de ce poste (GET /__setup/sim/position, toutes les 5 s : X-Plane 12
  //      puis Little Navmap, tools/sim_position.py), source 'xplane' ou 'lnm' ; le GPS et le réseau attendent tant
  //      qu'il a donné une position il y a moins de 15 s ;
  //   1. GPS de l'appareil (watchPosition) : permission demandée seulement par un geste (pastille de l'en-tête,
  //      ctx.live.enable()), jamais au démarrage ; ensuite repris de lui-même si le navigateur l'accorde déjà ;
  //   2. réseau, sans GPS récent : session en ligne du pilote, IVAO (whazzup public, VID de l'identité) puis VATSIM (flux
  //      de données, CID) par ctx.net — toutes les 15 s avec un lanceur (relais), toutes les 60 s en appel direct (0,7 à
  //      1,7 Mo par appel sur un téléphone) ;
  //   3. rien.
  // Écrit progress.actual = { at, lat, lon, altFt, gsKt, trackDeg, source } dans le vol courant (ce seul champ, by
  // 'frame'), au plus une fois par 10 s et seulement si la position a bougé (30 m, 50 ft) ; aucune synchronisation
  // forcée (la file locale et la synchronisation habituelle suffisent).
  const LIVE_WRITE = 10e3,
    LIVE_SIM = 5e3,
    LIVE_SIM_FRESH = 15e3,
    LIVE_NET_RELAY = 15e3,
    LIVE_NET_DIRECT = 60e3,
    LIVE_GPS_FRESH = 30e3,
    LIVE_MAX_AGE = 24 * 3600e3;
  const liveData = FD.adapter({
    id: 'frame-live',
    reads: ['pilot/'],
    writes: [{
      prefix: 'pilot/',
      merge: 'record'
    }]
  });
  let live = {
      active: false,
      source: '',
      last: null
    },
    liveGps = false, // choix de l'appareil : utiliser le GPS (device/live.json)
    gpsState = 'off', // off, asking, on, denied, unavailable
    gpsWatch = null,
    gpsPoll = null, // relève toutes les 10 s en plus des mesures que le navigateur envoie de lui-même
    gpsAt = 0,
    simAt = 0, // dernière position du simulateur de ce poste
    simTimer = null,
    netTimer = null,
    flightPath = '',
    unwatchFlight = null,
    lastWrite = null,
    liveLater = null; // écriture différée (position venue moins de 10 s après la précédente)
  const flightPathOf = () => `pilot/${identity.trigram || 'ANON'}/current_flight.json`;
  /** Vol démarré (started non nul), il y a moins de 24 h. */
  const flying = f => !!f?.started?.at && Date.now() - Date.parse(f.started.at) < LIVE_MAX_AGE;
  /** Suit le vol courant du trigramme (rebranché quand l'identité change). */
  function liveWatch() {
    const p = flightPathOf();
    if (p === flightPath) return liveCheck();
    unwatchFlight?.();
    flightPath = p;
    unwatchFlight = liveData.watch(p, () => liveCheck());
    liveCheck();
  }
  /** Démarre ou arrête le service selon le vol courant. */
  async function liveCheck() {
    const cur = await liveData.get(flightPath).catch(() => null),
      on = flying(cur);
    lastFlight = cur;
    paintInfo(); // le bouton « i » de l'en-tête suit le vol courant
    // une position plus ancienne que le départ (vol précédent, laissée par un appareil qui n'a pas pu l'effacer) : remise
    // à null, la carte ne la montre jamais au nouveau départ
    const stale = on && cur?.progress?.actual?.at && String(cur.progress.actual.at) < String(cur.started.at);
    if ((stale || !on) && cur?.progress?.actual) await clearActual(cur); // vol arrêté (ici ou ailleurs) : plus de position
    if (on && !live.active) {
      live = {
        active: true,
        source: '',
        last: null
      };
      lastWrite = null;
      await simTick(); // le simulateur d'abord : le GPS ne passe pas devant lui au démarrage
      if (live.active && liveGps && await gpsGranted()) gpsStart();
      netTick();
    } else if (!on && live.active) {
      live.active = false;
      gpsStop();
      clearTimeout(simTimer);
      clearTimeout(netTimer);
      clearTimeout(liveLater);
    }
    paintLive();
  }
  /** Position réelle remise à null dans le vol courant (service arrêté : compte rendu enregistré, départ annulé, vol de
   *  plus de 24 h ; ou position d'avant le départ) : seul progress.actual, par la fusion commune. */
  async function clearActual(cur) {
    clearTimeout(liveLater);
    lastWrite = null;
    live.last = null;
    const CF = await import(new URL('frame/lib/current_flight.js', ROOT).href);
    await liveData.put(flightPath, CF.merge(cur, {
      progress: {
        actual: null
      }
    }, {
      progressKeys: ['actual'],
      by: 'frame'
    })).catch(e => console.warn('live', e));
  }
  /** Permission de position déjà accordée (aucune demande affichée). */
  async function gpsGranted() {
    try {
      return (await navigator.permissions?.query({
        name: 'geolocation'
      }))?.state === 'granted';
    } catch {
      return false;
    }
  }

  function gpsStart() {
    if (!navigator.geolocation || gpsWatch !== null) return;
    if (!window.isSecureContext) { // page en http depuis le réseau local : le navigateur refuserait sans rien demander
      gpsState = 'unavailable';
      notify(t(T.live.insecure), 'warn');
      return paintLive();
    }
    gpsState = 'asking';
    const got = p => {
      gpsState = 'on';
      gpsAt = Date.now();
      if (simFresh()) return paintLive(); // le simulateur de ce poste passe devant
      const c = p.coords;
      onFix('gps', {
        lat: c.latitude,
        lon: c.longitude,
        altFt: c.altitude == null ? null : Math.round(c.altitude * 3.28084),
        gsKt: c.speed == null ? null : Math.round(c.speed * 1.943844),
        trackDeg: Number.isFinite(c.heading) ? Math.round(c.heading) : null
      });
    };
    // le navigateur n'envoie une mesure que s'il en a une nouvelle : une relève toutes les 10 s tient la cadence
    gpsPoll = setInterval(() => navigator.geolocation.getCurrentPosition(got, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5e3,
      timeout: 20e3
    }), LIVE_WRITE);
    gpsWatch = navigator.geolocation.watchPosition(got, e => {
      gpsState = e.code === 1 ? 'denied' : 'unavailable';
      if (e.code === 1) {
        gpsStop(gpsState);
        notify(t(T.live.denied), 'warn');
      }
      paintLive();
    }, {
      enableHighAccuracy: true,
      maximumAge: LIVE_WRITE,
      timeout: 30e3
    });
    paintLive();
  }

  function gpsStop(state = 'off') {
    if (gpsWatch !== null) navigator.geolocation.clearWatch(gpsWatch);
    clearInterval(gpsPoll);
    gpsPoll = null;
    gpsWatch = null;
    gpsState = state;
  }
  /** Le simulateur de ce poste a donné une position il y a moins de 15 s. */
  const simFresh = () => Date.now() - simAt < LIVE_SIM_FRESH;
  /** Simulateur de ce poste (page servie par un lanceur) : toutes les 5 s ; 204 : aucun simulateur, la main au reste. */
  async function simTick() {
    clearTimeout(simTimer);
    if (!live.active || !launcherHere) return;
    try {
      const r = await fetch(new URL('__setup/sim/position', ROOT), {
        cache: 'no-store',
        headers: {
          'X-SOG-Setup': '1'
        }
      });
      const p = r.status === 200 ? await r.json() : null;
      if (live.active && (p?.source === 'xplane' || p?.source === 'lnm')) {
        simAt = Date.now();
        onFix(p.source, {
          lat: p.lat,
          lon: p.lon,
          altFt: p.altFt ?? null,
          gsKt: p.gsKt ?? null,
          trackDeg: p.trackDeg ?? null
        });
      }
    } catch {
      /* lanceur fermé : nouvel essai au tour suivant */
    }
    if (live.active) simTimer = setTimeout(simTick, LIVE_SIM);
  }
  /** Session en ligne du pilote (sans simulateur ni GPS récents) : IVAO puis VATSIM ; relais toutes les 15 s, direct
   *  toutes les 60 s. */
  async function netTick() {
    clearTimeout(netTimer);
    if (!live.active) return;
    if (!simFresh() && Date.now() - gpsAt > LIVE_GPS_FRESH) try {
      const ivao = String(identity.ivao || '').trim(),
        vatsim = String(identity.vatsim || '').trim();
      let fix = null;
      if (ivao) {
        const r = await net.fetch('https://api.ivao.aero/v2/tracker/whazzup');
        const p = r.ok ? (await r.json())?.clients?.pilots?.find(x => String(x.userId) === ivao) : null,
          k = p?.lastTrack;
        if (k && Number.isFinite(k.latitude)) fix = ['ivao', {
          lat: k.latitude,
          lon: k.longitude,
          altFt: Math.round(k.altitude),
          gsKt: Math.round(k.groundSpeed),
          trackDeg: Math.round(k.heading)
        }];
      }
      if (!fix && vatsim) {
        const r = await net.fetch('https://data.vatsim.net/v3/vatsim-data.json');
        const p = r.ok ? (await r.json())?.pilots?.find(x => String(x.cid) === vatsim) : null;
        if (p) fix = ['vatsim', {
          lat: p.latitude,
          lon: p.longitude,
          altFt: Math.round(p.altitude),
          gsKt: Math.round(p.groundspeed),
          trackDeg: Math.round(p.heading)
        }];
      }
      if (fix && !simFresh() && Date.now() - gpsAt > LIVE_GPS_FRESH) onFix(...fix);
    } catch (e) {
      console.warn('live', e);
    }
    netTimer = setTimeout(netTick, launcherHere ? LIVE_NET_RELAY : LIVE_NET_DIRECT);
  }
  /** Distance en mètres entre deux points (haversine). */
  const metres = (a, b) => {
    const r = Math.PI / 180,
      s = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
    return 2 * 6371e3 * Math.asin(Math.sqrt(s));
  };
  /** Nouvelle position : gardée, montrée, écrite au plus une fois par 10 s si elle a bougé. */
  async function onFix(source, pos) {
    // position nulle (0°, 0° : pilote en cours de connexion) ou illisible : ignorée
    if (!live.active || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lon) || (Math.abs(pos.lat) < .01 && Math.abs(pos.lon) < .01))
      return;
    const a = {
      at: new Date().toISOString(),
      ...pos,
      source
    };
    live.source = source;
    live.last = a;
    paintLive();
    const moved = !lastWrite || metres(lastWrite, a) > 30 || Math.abs((a.altFt ?? 0) - (lastWrite.altFt ?? 0)) >= 50;
    if (!moved) return;
    // au plus une écriture par 10 s : une position venue trop tôt est écrite à la fin du délai (la plus récente)
    const wait = lastWrite ? LIVE_WRITE - (Date.now() - lastWrite.t) : 0;
    if (wait > 0) {
      clearTimeout(liveLater);
      liveLater = setTimeout(() => live.last === a && onFix(source, pos), wait);
      return;
    }
    lastWrite = {
      ...a,
      t: Date.now()
    };
    const cur = await liveData.get(flightPath).catch(() => null);
    if (!flying(cur)) return;
    // fusion commune du vol courant (frame/lib/current_flight.js) : relu juste avant, seul progress.actual remplacé
    const CF = await import(new URL('frame/lib/current_flight.js', ROOT).href);
    await liveData.put(flightPath, CF.merge(cur, {
      progress: {
        actual: a
      }
    }, {
      progressKeys: ['actual'],
      by: 'frame'
    }), {
      quiet: true // toutes les 10 s : pas un commit à chaque fois, le passage de fond l'emporte
    });
  }
  /** ctx.live : état, source, dernière position, et le GPS de l'appareil (activé par un geste, gardé sur l'appareil). */
  function liveApi() {
    return {
      status: !live.active ? 'off' : live.source ? 'tracking' : 'waiting',
      source: live.source,
      last: live.last,
      gps: gpsState,
      enable: async () => {
        liveGps = true;
        await own.put('device/live.json', {
          gps: true,
          updated_at: new Date().toISOString()
        });
        if (live.active) gpsStart();
        paintLive();
      },
      disable: async () => {
        liveGps = false;
        await own.put('device/live.json', {
          gps: false,
          updated_at: new Date().toISOString()
        });
        gpsStop();
        // la dernière position GPS reste lisible (last), mais la source n'est plus le GPS
        if (live.source === 'gps') live.source = '';
        gpsAt = 0;
        netTick();
        paintLive();
      }
    };
  }
  // nom de chaque source dans la pastille (noms propres, les mêmes dans les quatre langues)
  const LIVE_NAMES = {
    xplane: 'X-Plane',
    lnm: 'Little Navmap',
    gps: 'GPS',
    ivao: 'IVAO',
    vatsim: 'VATSIM'
  };
  /** Pastille « Lanceur de <poste> » : la page vient du lanceur d'un autre poste du réseau local (son data/, son
   *  simulateur, son relais) ; écrite seulement si elle change. */
  function paintHost() {
    const b = $('fHost'),
      show = !!launcherHere?.lan;
    if (!b) return;
    if (b.hidden === show) b.hidden = !show;
    if (!show) return;
    const h = launcherHere.host || location.hostname,
      html = `${Icons?.svg('link') || ''}<span>${esc(t(T.host, { h }))}</span>`,
      title = t(T.hostTitle, {
        h
      });
    if (b.innerHTML !== html) b.innerHTML = html;
    if (b.title !== title) b.title = title;
  }
  /** Accès des appareils du réseau local, réglé depuis ce poste (GET / POST /__setup/lan du lanceur) : { on, urls,
   *  code, devices, host }. */
  async function lanCall(body) {
    const r = await fetch(new URL('__setup/lan', ROOT), {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      headers: {
        'X-SOG-Setup': '1',
        ...(body ? {
          'Content-Type': 'application/json'
        } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) throw new Error(`lan ${r.status}`);
    return r.json();
  }
  /** Pastille de l'en-tête pendant un vol : la source (X-Plane, Little Navmap, GPS, IVAO, VATSIM, — en attente) ;
   *  bascule du GPS de l'appareil. */
  function paintLive() {
    const b = $('fLive');
    if (!b) return;
    const show = live.active;
    if (b.hidden === show) b.hidden = !show;
    if (!show) return;
    const src = live.source ? LIVE_NAMES[live.source] || live.source.toUpperCase() : '—',
      html = `${Icons?.svg('pin') || ''}<span>${esc(src)}</span>`,
      title = (live.last ? t(T.live.title, {
        s: src,
        t: tz('fmtZ', live.last.at)
      }) : t(launcherHere ? T.live.waitingSim : T.live.waiting)) + ' — ' + t(gpsWatch !== null ? T.live.gpsOff : T.live.gpsOn),
      on = gpsWatch !== null;
    if (b.innerHTML !== html) b.innerHTML = html;
    if (b.title !== title) b.title = title;
    if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
  }

  // ---------------------------------------------------------------- icônes (frame/lib/icons.js)
  let Icons = null;
  /** Icône au trait d'un nom (menu, en-tête) ; sans le jeu d'icônes : le nom tel quel, en caractère décoratif. */
  const icon = name => Icons?.svg(name) || `<span aria-hidden="true">${esc(name ? '•' : '')}</span>`;
  /** Icône d'un bouton de l'en-tête (posée au démarrage, seulement si elle change). */
  const headIcon = (id, name) => {
    const b = $(id),
      html = Icons?.svg(name);
    if (b && html && b.innerHTML !== html) b.innerHTML = html;
  };

  // ---------------------------------------------------------------- impression : sections repliées ouvertes le temps
  // d'imprimer (réaction à l'événement, refermées ensuite)
  let printOpened = [];
  window.addEventListener('beforeprint', () => {
    printOpened = [...document.querySelectorAll('#fView details:not([open])')];
    for (const d of printOpened) d.open = true;
  });
  window.addEventListener('afterprint', () => {
    for (const d of printOpened) d.open = false;
    printOpened = [];
  });

  // ---------------------------------------------------------------- démarrage
  let aerodb = null,
    configured = null; // transport branché (missing : usages d'échange sans moyen d'échange ici)
  async function boot() {
    try {
      Icons = await import(new URL('frame/lib/icons.js', ROOT).href);
    } catch (e) {
      console.warn('frame/lib/icons.js', e);
    }
    headIcon('fInfo', 'info');
    headIcon('fHelp', 'help');
    headIcon('fDevice', 'settings');
    document.title = `${t(APP.name)} — SOG`;
    $('fName').textContent = t(APP.name);
    $('fDevice').setAttribute('aria-label', t(T.device));
    $('fDevice').title = t(T.device);
    $('fInfo').onclick = () => openInfo();
    paintInfo();
    $('fHelp').setAttribute('aria-label', t(T.help));
    $('fHelp').title = t(T.help);
    $('fHelp').onclick = () => {
      if (over && ['help', 'roadmap'].includes(over.id)) return leaveOver();
      const at = current?.id || (['settings', 'device'].includes(parseHash().id) ? 'settings' : '');
      location.hash = `#help${at ? `?m=${encodeURIComponent(at)}` : ''}`;
    };
    $('fDevice').onclick = () => {
      if (over && ['settings', 'device'].includes(over.id)) return leaveOver();
      location.hash = '#settings';
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && over && !document.querySelector('.f-modal')) leaveOver();
    });
    $('fPane').onclick = () => togglePane();
    $('fLive').onclick = () => gpsWatch !== null ? liveApi().disable() : liveApi().enable();
    $('fBack').onclick = () => {
      const o = origin;
      if (!o) return;
      viaMenu = true; // un retour n'appelle pas de retour vers l'écran quitté
      if (o.back && history.length > 1) history.back();
      else location.hash = o.hash;
    };
    // un verbe de la colonne ou un onglet de la barre : un choix dans le menu, pas un passage entre modules
    // (pas de « ← » vers l'écran quitté) ; la même adresse que l'actuelle ne change rien, elle ne note donc rien
    for (const nav of [$('fMenu'), $('fTabs')]) nav.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && a.getAttribute('href') !== location.hash) viaMenu = true;
    });
    // sous-onglets du groupe : un choix de module comme dans le menu
    $('fView').addEventListener('click', e => {
      const b = e.target.closest('.f-subtabs button');
      if (!b || b.getAttribute('aria-current') === 'page') return;
      viaMenu = true;
      location.hash = `#${b.dataset.id}`;
    });
    // écran devenu étroit : volet démonté (son état reste gardé) ; redevenu large : rouvert s'il l'était
    const onWidth = () => {
      const entry = APP.modules.find(m => m.id === current?.id);
      if (!wide.matches) closePane();
      else if (entry && !pane) {
        const want = paneWanted(entry);
        if (want && want !== entry.id) openPane(entry, want);
      }
      paintPaneButton(entry || null);
    };
    wide.addEventListener('change', onWidth);
    wideAuto.addEventListener('change', onWidth);
    $('fWho').onclick = () => location.hash = '#settings';
    // un passage qui a lu l'arbre du dépôt peut y trouver un pilot/ANON/ d'avant la règle : repris aussi
    let anonSync = '';
    FD.onStatus(s => {
      if (!s.lastSync || s.lastSync === anonSync || !identity.trigram) return;
      anonSync = s.lastSync; // une fois par passage réussi, jamais à chaque écriture
      adoptAnon();
    });
    $('fSync').onclick = async () => {
      if (over?.id === 'conflicts') return leaveOver();
      const s = await FD.status();
      if (s.conflicts) location.hash = '#conflicts';
      else syncNow();
    };
    launcherHere = await FD.launcher.detect();
    await timeP; // les heures du cadre (synchronisation, pastilles) en UTC dès leur premier dessin
    await loadDevice();
    // accès réglé ou coupé dans un autre onglet : transport rebranché ici aussi
    window.addEventListener('storage', e => {
      if (e.key === 'githubData:frame') loadDevice();
    });
    // aerodb : un service, une instance, lecteur = la couche de données (frame/aerodb/INTEGRATION.md § 3)
    try {
      // préfixes d'aerodb (base SIA, types, registre des aéronefs : fiches, flotte, référence) donnés par aerodb lui-même
      aerodb = window.AeroDB ? AeroDB.create({
        reader: FD.adapter(AeroDB.declaration())
      }) : null;
    } catch (e) {
      console.error(e);
    }
    FD.onStatus(s => {
      paintSync(s);
      // un seul utilisateur : la file devient le cache aussitôt (rien à envoyer)
      if (s.transport === 'local' && s.pending && !s.syncing) FD.sync({
        reason: 'local'
      });
    });
    own.watch('device/', () => loadDevice());
    airlineP = loadAirline(); // en fond : le premier module ne l'attend pas
    airlineData.watch('airline/', () => loadAirline(1e4));
    setInterval(() => FD.status().then(paintSync), 30e3); // « il y a 4 min » vieillit
    window.addEventListener('hashchange', route);
    window.addEventListener('hashchange', () => infoBox?.close(
      null)); // retour du navigateur : le pop-up ne reste pas sur l'écran quitté
    infoData.watch('cache/flightlog/', () => readPending());
    readPending();
    window.addEventListener('online', async () => {
      FD.status().then(paintSync);
      // démarrée sans réseau : le lanceur est recherché de nouveau, le transport suit
      if (!launcherHere && (launcherHere = await FD.launcher.detect())) loadDevice();
    });
    window.addEventListener('offline', () => FD.status().then(paintSync));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') FD.status().then(paintSync); // téléphone rallumé : état du moment
    });
    offlineApp();
    levelsP = readLevels();
    FD.start();
    route();
  }
  // ---------------------------------------------------------------- appli installable et hors ligne
  const U = {
    update: ['Nouvelle version de l’appli prête.', 'A new version of the app is ready.', 'Eine neue Version der App ist bereit.',
      'Nueva versión de la aplicación lista.'
    ],
    reload: ['Recharger', 'Reload', 'Neu laden', 'Recargar']
  };
  /** Service worker du cadre (page servie en http(s), pas dans une coque native qui embarque déjà le code) : nouvelle
   *  version proposée au rechargement ; points d'entrée des modules de l'appli gardés dès la première visite. */
  function offlineApp() {
    if (!navigator.serviceWorker || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'sog-frame-update') notify(t(U.update), 'info', {
        action: {
          label: t(U.reload),
          run: reloadNewVersion
        }
      });
    });
    // orientation verrouillée en portrait tant que la disposition en paysage n'est pas décidée (V3_SPECIFICATION.md
    // § 7.1, 24 oct 2026) : effective en appli installée seulement (manifest « orientation », coque Capacitor) ; en page
    // de navigateur l'appel échoue et c'est attendu
    try {
      if (matchMedia('(display-mode: standalone)').matches) screen.orientation?.lock?.('portrait')?.catch?.(() => {});
    } catch {
      /* navigateur sans verrouillage */
    }
    navigator.serviceWorker.register(new URL('frame/sw.js', ROOT), {
      scope: new URL('frame/', ROOT).pathname
    }).then(() => navigator.serviceWorker.ready).then(async reg => reg.active?.postMessage({
      type: 'precache',
      urls: [...await moduleFiles(), ...await helpFiles()]
    })).catch(e => console.warn('service worker', e));
  }
  /** « Recharger » après une nouvelle version : un service worker en attente prend la main (controllerchange) ; sinon
   *  toutes les copies sont relues sans cache ; puis la page recharge (8 s au plus d'attente : recharge quand même). */
  async function reloadNewVersion() {
    const sw = navigator.serviceWorker,
      reg = await sw?.getRegistration(new URL('frame/', ROOT).pathname).catch(() => null),
      within = p => Promise.race([p, new Promise(r => setTimeout(r, 8e3))]);
    try {
      if (reg?.waiting) {
        const changed = new Promise(r => sw.addEventListener('controllerchange', r, {
          once: true
        }));
        reg.waiting.postMessage({
          type: 'skip-waiting'
        });
        await within(changed);
      } else if (sw?.controller) {
        const ch = new MessageChannel(),
          done = new Promise(r => ch.port1.onmessage = r);
        sw.controller.postMessage({
          type: 'refresh'
        }, [ch.port2]);
        await within(done);
      }
    } catch (e) {
      console.warn('reload', e);
    }
    location.reload();
  }
  /** Fichiers de tous les modules de l'application, à garder dès l'installation : le point d'entrée de chacun et les
   *  fichiers que son meta.files déclare (chemins relatifs à module.js) ; ceux de meta.lazy (lourds, gardés à leur
   *  premier usage) ne sont jamais préchargés ; module illisible : son point d'entrée seul. */
  async function moduleFiles() {
    const urls = [];
    for (const m of APP.modules) {
      const entry = new URL(`modules/${m.id}/module.js`, ROOT).href;
      urls.push(entry);
      try {
        const meta = (await import(entry)).meta || {},
          lazy = new Set((meta.lazy || []).map(f => new URL(f, entry).href));
        for (const f of meta.files || []) {
          const u = new URL(f, entry).href;
          if (!lazy.has(u)) urls.push(u);
        }
      } catch {
        /* module en échec : il le dira à son ouverture */
      }
    }
    return [...new Set(urls)];
  }

  window.SogFrame = {
    APP,
    t,
    notify,
    ask,
    askText,
    net,
    syncNow,
    airline: () => airline,
    cutAccess,
    get aerodb() {
      return aerodb;
    },
    get live() {
      return liveApi();
    }
  };
  boot();
})();
