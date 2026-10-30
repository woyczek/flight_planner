(() => {
  'use strict';
  // V3 frame — squelette d'une application (frame/SPEC.md § 3, frame/INTEGRATION.md) : l'appli Pilote.
  //   · navigation : un verbe court par module (sept au plus), colonne à gauche sur écran ; sur téléphone, une barre
  //     d'onglets en bas (APP.tabs : Préparer · Carte · CR · Vols · Météo, un onglet = un groupe de modules ; Réglages est le ⚙ de l'en-tête) ;
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
  // scripts du store posés avant le cadre (index.html) : un fichier perdu en route (réseau, copie du service worker
  // indisponible) laissait la page vide sur une erreur (« reading 'detect' », « reading 'persist' ») ; il est redemandé
  // une fois, puis le cadre repart de zéro (app.js remis dans la page) ; toujours perdu, la page dit pourquoi et propose
  // de recharger, au lieu de rester blanche
  const STORE = [
      ['store/frame_data.js', () => window.FrameData],
      ['store/transport_github.js', () => window.FrameData?.github],
      ['store/transport_gitlab.js', () => window.FrameData?.gitlab],
      ['store/transport_launcher.js', () => window.FrameData?.launcher]
    ],
    lost = STORE.filter(([, has]) => !has()).map(([p]) => p);
  if (lost.length) {
    const me = document.currentScript.src,
      add = (src, where) => new Promise(r => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = s.onerror = r;
        where.append(s);
      });
    if (!window.__sogStoreRetry) {
      window.__sogStoreRetry = lost;
      (async () => {
        for (const p of lost) await add(new URL(`${p}?retry=${Date.now()}`, me).href, document.head);
        add(me, document.body);
      })();
    } else {
      const l = (localStorage.getItem('sogFrame:lang') || navigator.language || 'fr').slice(0, 2),
        k = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(l)),
        txt = ['L’application n’a pas pu charger tous ses fichiers ({f}). Vérifiez le réseau, puis rechargez la page.',
          'The application could not load all its files ({f}). Check the network, then reload the page.',
          'Die Anwendung konnte nicht alle Dateien laden ({f}). Prüfen Sie das Netz und laden Sie die Seite neu.',
          'La aplicación no pudo cargar todos sus archivos ({f}). Compruebe la red y vuelva a cargar la página.'
        ][k].replace('{f}', lost.join(', ')),
        btn = ['Recharger', 'Reload', 'Neu laden', 'Recargar'][k],
        v = document.getElementById('fView') || document.body,
        box = document.createElement('div');
      box.className = 'f-card f-err';
      box.setAttribute('role', 'alert');
      box.append(Object.assign(document.createElement('p'), {
        textContent: txt
      }), Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'f-btn primary',
        textContent: btn,
        onclick: () => location.reload()
      }));
      v.replaceChildren(box);
    }
    return;
  }
  const FD = window.FrameData;
  // paysage sur un téléphone (V3_SPECIFICATION.md § 7.1 règle 7) : <html class="f-land"> quand la fenêtre est plus large que haute
  // et de moins de 1024 px (téléphone ou petite tablette tournée) ; la barre du bas devient un rail à gauche, la feuille d'un
  // module fixe une colonne à droite (frame.css, design/primitives.css). Posée au démarrage (la page de index.html l'a déjà
  // posée avant le premier affichage, même règle), puis sur resize et orientationchange, en une seule écriture quand la valeur
  // change ; « frame-orientation » (detail: { land }) le dit ensuite aux primitives du cadre (la feuille). Un clavier à l'écran
  // qui rendrait une fenêtre de téléphone portrait plus large que haute n'y change rien : l'orientation de l'écran, quand le
  // navigateur la donne, doit être celle d'un paysage. Jamais avec un pointeur précis qui survole (souris, pavé tactile) : une
  // fenêtre d'ordinateur plus large que haute garde le rail à libellés et son design (30 oct. : sans cela, en élargissant une
  // fenêtre, on passait téléphone → ordinateur → rail d'icônes sans Aqua → ordinateur).
  const fineQ = matchMedia('(pointer: fine) and (hover: hover)'),
    landNow = () => innerWidth > innerHeight && innerWidth < 1024 && !fineQ.matches && !/^portrait/.test(screen.orientation?.type || '');

  function paintLand() {
    const h = document.documentElement,
      on = landNow();
    if (h.classList.contains('f-land') === on) return;
    h.classList.toggle('f-land', on);
    window.dispatchEvent(new CustomEvent('frame-orientation', {
      detail: {
        land: on
      }
    }));
  }
  // ordinateur (frame/INTEGRATION.md § 9.1) : <html class="f-desk"> exactement quand la mise en page est celle de l'ordinateur,
  // le rail à libellés — plus de 760 px et pas le paysage de téléphone (f-land) ; un seul critère pour la mise en page et le
  // design d'ordinateur (Aqua) qui s'y accroche, jamais sur le rail d'icônes ni sur la barre du bas. Même règle dans
  // index.html avant le premier affichage ; recalculée sur resize, orientationchange et au changement du pointeur (une
  // tablette à laquelle on branche une souris), en une seule écriture quand la valeur change ; « frame-desk »
  // (detail: { desk }) le dit ensuite.
  const deskNow = () => innerWidth > 760 && !landNow();

  function paintDesk() {
    const h = document.documentElement,
      on = deskNow();
    if (h.classList.contains('f-desk') === on) return;
    h.classList.toggle('f-desk', on);
    window.dispatchEvent(new CustomEvent('frame-desk', {
      detail: {
        desk: on
      }
    }));
  }
  const paintForm = () => {
    paintLand();
    paintDesk();
  };
  paintForm();
  window.addEventListener('resize', paintForm);
  window.addEventListener('orientationchange', paintForm);
  fineQ.addEventListener('change', paintForm); // le pointeur décide aussi du paysage : les deux classes ensemble
  // heures de l'appli : UTC suffixée Z (frame/lib/time.js) ; module chargé en même temps que le reste du démarrage
  let TZ = null;
  const timeP = import(new URL('lib/time.js?v=0', document.currentScript.src).href).then(m => TZ = m).catch(e => console
    .warn('time', e));
  /** Heure de l'appli : fmtZ (« 16:30Z »), fmtZLocal (« 16:30Z (18:30) »), fmtDateZ (date UTC et heure Z). */
  const tz = (fn, iso) => TZ?.[fn]?.(iso, lang()) ?? '';
  const ROOT = new URL('../', document.currentScript.src).href;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  // ---------------------------------------------------------------- les applications
  // une application = un jeu de modules nommé du même cadre (son rail, sa barre d'onglets, ses écrans, son nom), choisie
  // par l'adresse de la page : /frame/?app=maintenance ; sans app ou inconnue : pilot (V3_SPECIFICATION § 2) ; rien n'est
  // gardé sur l'appareil (plus tard : le rôle du registre). L'application liste ses modules (ordre, sept au plus) : un
  // module ne sait pas où il est rangé. links : entrées du rail qui ne sont pas des modules (un écran du cadre « #… » ou
  // une page de la suite), au niveau level ; launcher : montrée seulement sur le poste qui a un lanceur. Une application
  // s'ouvre partout : ce qui demande le lanceur se masque là où il est (le module Données se lit sans lui). level : le
  // plancher du niveau d'usage de l'application (Maintenance : Complet, quel que soit le niveau choisi pour Pilote) ;
  // welcome : false, pas de carte d'accueil des tutoriels de Pilote.
  const APPS = {};
  // identité (frame/SPEC.md § 3.1) : icon (frame/lib/icons.js) et tint (un jeton du design, jamais une couleur écrite ici)
  // dans l'en-tête ; tintIcon : l'icône de l'onglet du navigateur prend la teinte (sinon celle du fichier)
  APPS.pilot = {
    id: 'pilot',
    name: ['Pilote', 'Pilot', 'Pilot', 'Piloto'],
    icon: 'plane',
    tint: 'var(--sog-accent)',
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
      // module dédié (vue fixe, gabarit de la Carte) : son onglet « Météo » de la barre du téléphone (APP.tabs, règle 14), dans
      // le rail sur écran ; réinclus plus tard dans Préparer et la Carte (modules/atmosphere/DECISIONS.md, 24 oct 2026)
      id: 'atmosphere',
      label: ['Météo', 'Weather', 'Wetter', 'Meteo'],
      icon: 'layers'
    }],
    // barre d'onglets du téléphone (760 px et moins), cinq au plus (V3_SPECIFICATION.md § 7.1 règle 14) : un onglet = un groupe
    // de modules (modules : l'onglet reste choisi tant que l'un d'eux est affiché ; le toucher ouvre le dernier montré du groupe
    // dans cette session, sinon le premier ; un id qui n'est pas inscrit plus haut est ignoré sans bruit) ou un écran du cadre
    // (screen). views : des vues d'un module du groupe, adressées par une requête (module, query : #fuel?view=sheets) ; elles
    // n'ont pas d'onglet, seulement une rangée du popover d'un second toucher (« Carburant · Fiches »). Un module absent de
    // tous les onglets (website, hello) reste joignable par son adresse et dans la colonne de gauche des grands écrans.
    // Réglages n'est plus dans la barre : le ⚙ de l'en-tête l'ouvre (il porte la pastille d'état).
    tabs: [{
      id: 'prepare',
      label: ['Préparer', 'Prepare', 'Vorbereiten', 'Preparar'],
      icon: 'fuel',
      modules: ['fuel'],
      views: [{
        id: 'sheets',
        module: 'fuel',
        query: 'view=sheets',
        label: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
        icon: 'file'
      }]
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
      id: 'weather',
      label: ['Météo', 'Weather', 'Wetter', 'Meteo'],
      icon: 'cloud',
      modules: ['atmosphere']
    }],
    // écrans de service : écrans du cadre ouverts par-dessus le module courant (comme les Réglages), dessinés par un service ;
    // le cadre ne connaît que cette déclaration (frame/INTEGRATION.md § 13) : scripts chargés à la première ouverture, niveau
    // d'usage requis, préfixes lus et écrits (comme meta.reads / meta.writes), transport GitHub de l'appareil si github
    // (jamais le jeton) ; le script s'enregistre lui-même : window.SogScreens[id] = { screen(view, ctx) }
    screens: [{
      id: 'sources', // les sources des données aéronautiques (aerodb) : des liens, rien n'est lu ni écrit
      scripts: ['aerodb/airac.js?v=0', 'aerodb/catalogue.js?v=0', 'aerodb/sources.js?v=0'],
      level: 3
    }],
    links: []
  };
  // Maintenance (V3_SPECIFICATION § 2) : les données de la compagnie (module Données), l'administration (les réglages ouverts
  // sur leur carte Administration), l'aide, et la page V2 de maintenance tant que D3–D5 ne la couvrent pas (avec un lanceur
  // seulement) ; niveau Complet ; sans lanceur, ou depuis un appareil appairé, en lecture seule
  APPS.maintenance = {
    id: 'maintenance',
    name: ['Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento'],
    icon: 'plane',
    tint: 'var(--sog-err)',
    tintIcon: true,
    level: 3,
    welcome: false,
    modules: [{
      id: 'data',
      label: ['Données', 'Data', 'Daten', 'Datos'],
      icon: 'database'
    }, {
      // la flotte, les fiches de performances, le registre des appareils (V3 § 10.34, lot A2)
      id: 'aircraft',
      label: ['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'],
      icon: 'plane'
    }],
    links: [{
      id: 'admin',
      href: '#settings?card=admin',
      label: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
      icon: 'settings',
      level: 3
    }, {
      id: 'help',
      href: '#help',
      label: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
      icon: 'help',
      level: 3
    }, {
      id: 'v2',
      href: '../apps/settings/maintenance.html',
      label: ['Page de maintenance (V2)', 'Maintenance page (V2)', 'Wartungsseite (V2)', 'Página de mantenimiento (V2)'],
      icon: 'wrench',
      level: 3,
      launcher: true
    }, {
      // jetons d'accès GitLab des pilotes (G2) : écran de service, avec le lanceur du poste (il garde le jeton de l'administrateur)
      id: 'tokens',
      href: '#pilot-tokens',
      label: ['Jetons des pilotes', 'Pilots’ tokens', 'Token der Piloten', 'Tokens de los pilotos'],
      icon: 'shield',
      level: 3,
      launcher: true
    }, {
      // appareils des pilotes, réseau local et relais de la compagnie (R-C2) : codes d'appairage, révocation
      id: 'devices',
      href: '#devices',
      label: ['Appareils', 'Devices', 'Geräte', 'Dispositivos'],
      icon: 'globe',
      level: 3,
      launcher: true
    }],
    tabs: [{
      id: 'data',
      label: ['Données', 'Data', 'Daten', 'Datos'],
      icon: 'database',
      modules: ['data']
    }, {
      id: 'admin',
      label: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
      icon: 'settings',
      screen: 'settings?card=admin'
    }, {
      id: 'help',
      label: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
      icon: 'help',
      screen: 'help'
    }],
    // écrans de service : « Jetons des pilotes » (frame/settings/pilot_tokens.js), avec deux routes du lanceur seulement
    screens: [{
      id: 'pilot-tokens',
      scripts: ['settings/pilot_tokens.js?v=0'],
      level: 3,
      launcher: {
        routes: ['gitlab/tokens', 'gitlab/tokens/revoke']
      }
    }, {
      id: 'devices',
      scripts: ['settings/devices.js?v=0'],
      level: 3,
      launcher: {
        routes: ['devices', 'devices/revoke', 'devices/name']
      }
    }]
  };
  const APP = (() => {
    const id = new URLSearchParams(location.search).get('app') || '';
    return Object.hasOwn(APPS, id) ? APPS[id] : APPS.pilot;
  })();
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
      rewritten: [
        'L’historique du dépôt des données a été réécrit : rien n’est fusionné, vos écritures restent sur le poste du lanceur. Sur ce poste : Réglages › Administration › Dépôt distant, « Reprendre le nouvel historique ».',
        'The data repository’s history was rewritten: nothing is merged, your writes stay on the launcher’s computer. On that computer: Settings › Administration › Remote repository, « Take up the new history ».',
        'Die Historie des Daten-Repositorys wurde neu geschrieben: nichts wird zusammengeführt, Ihre Änderungen bleiben auf dem Rechner des Starters. Dort: Einstellungen › Administration › Entferntes Repository, „Neue Historie übernehmen“.',
        'El historial del repositorio de datos se reescribió: no se fusiona nada, sus escrituras se quedan en el equipo del lanzador. En ese equipo: Ajustes › Administración › Repositorio remoto, «Retomar el nuevo historial».'
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
    // sélecteur d'application (nom de l'en-tête) : son nom, et le niveau qu'il faut pour une application au-dessus de celui de l'appareil
    appSwitch: ['Changer d’application', 'Switch application', 'Anwendung wechseln', 'Cambiar de aplicación'],
    appNeeds: ['Au niveau {l} (Réglages)', 'At the {l} level (Settings)', 'Auf der Stufe {l} (Einstellungen)',
      'En el nivel {l} (Ajustes)'
    ],
    levelNames: [
      ['Découverte', 'Discovery', 'Einstieg', 'Descubrimiento'],
      ['Courant', 'Everyday', 'Alltag', 'Habitual'],
      ['Complet', 'Full', 'Vollständig', 'Completo']
    ],
    cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
    close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
    ivaoOk: ['Compte IVAO relié à cet appareil.', 'IVAO account linked to this device.', 'IVAO-Konto mit diesem Gerät verbunden.',
      'Cuenta IVAO vinculada a este dispositivo.'
    ],
    ivaoFailState: [
      'Ce retour d’IVAO ne correspond à aucune connexion en cours (demande expirée, lanceur redémarré ou demande faite ailleurs) : reconnectez-vous.',
      'This return from IVAO matches no sign-in in progress (request expired, launcher restarted or request made elsewhere): sign in again.',
      'Diese Rückkehr von IVAO passt zu keiner laufenden Anmeldung (Anfrage abgelaufen, Starter neu gestartet oder anderswo gestellt): erneut anmelden.',
      'Este retorno de IVAO no corresponde a ningún inicio de sesión en curso (solicitud caducada, lanzador reiniciado o hecha en otro lugar): vuelva a iniciar sesión.'
    ],
    ivaoFailIvao: ['IVAO a refusé la connexion ({e}).', 'IVAO refused the sign-in ({e}).', 'IVAO hat die Anmeldung abgelehnt ({e}).',
      'IVAO rechazó el inicio de sesión ({e}).'
    ],
    ivaoFailConfig: ['Pas d’application IVAO réglée sur le lanceur.', 'No IVAO application set on the launcher.',
      'Keine IVAO-Anwendung auf dem Starter eingerichtet.', 'Ninguna aplicación IVAO configurada en el lanzador.'
    ],
    ivaoFail: ['Connexion à IVAO refusée ({e}).', 'IVAO sign-in refused ({e}).', 'IVAO-Anmeldung abgelehnt ({e}).',
      'Inicio de sesión en IVAO rechazado ({e}).'
    ],
    tabsNav: ['Navigation principale', 'Main navigation', 'Hauptnavigation', 'Navegación principal'],
    // bloc d'état en tête des Réglages et pastille du ⚙ de l'en-tête (frame/SPEC.md § 3.1)
    info: {
      news: ['à voir', 'something to see', 'Hinweise vorhanden', 'algo que ver'],
      title: ['État', 'Status', 'Status', 'Estado'],
      trailShared: [
        'Votre position est partagée avec le groupe et reste dans l’historique du dépôt ; la trace de votre vol reste sur cet appareil.',
        'Your position is shared with the group and stays in the repository’s history; the track of your flight stays on this device.',
        'Ihre Position wird mit der Gruppe geteilt und bleibt in der Historie des Repositorys; die Spur Ihres Flugs bleibt auf diesem Gerät.',
        'Su posición se comparte con el grupo y queda en el historial del repositorio; la traza de su vuelo se queda en este dispositivo.'
      ],
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
      // transport lanceur : le poste qui sert la page et l'état de l'échange (l'hôte n'est plus dans l'en-tête du téléphone)
      launcher: ['Lanceur : {h} · {s}', 'Launcher: {h} · {s}', 'Starter: {h} · {s}', 'Lanzador: {h} · {s}'],
      offline: ['Hors ligne : travail sur la copie de l’appareil', 'Offline: working on this device’s copy',
        'Offline: Arbeit auf der Kopie dieses Geräts', 'Sin conexión: se trabaja con la copia del dispositivo'
      ],
      // téléphone : le trigramme, l'erreur de synchronisation, la position réelle et l'aide, qui ne sont plus dans l'en-tête
      who: ['Trigramme non réglé : vos documents restent sur cet appareil', 'Trigram not set: your documents stay on this device',
        'Kürzel nicht eingestellt: Ihre Dokumente bleiben auf diesem Gerät',
        'Trigrama no definido: sus documentos se quedan en este dispositivo'
      ],
      whoSub: ['Touchez pour le régler dans les Réglages', 'Touch to set it in Settings',
        'Tippen, um es in den Einstellungen zu setzen',
        'Toque para definirlo en Ajustes'
      ],
      // état de la base aéronautique (ligne ajoutée tant qu'elle charge, qu'aucun accès n'est réglé ou que rien n'est publié)
      base: {
        loading: ['Base aéronautique en cours de chargement…', 'Aeronautical database loading…',
          'Luftfahrtdatenbank wird geladen…', 'Base aeronáutica cargándose…'
        ],
        noaccess: ['Accès aux données non réglé sur cet appareil', 'Data access not set on this device',
          'Datenzugriff auf diesem Gerät nicht eingerichtet', 'Acceso a los datos no configurado en este dispositivo'
        ],
        unpublished: ['Base aéronautique non publiée dans le dépôt des données',
          'Aeronautical database not published in the data repository',
          'Luftfahrtdatenbank nicht im Datenrepository veröffentlicht', 'Base aeronáutica no publicada en el repositorio de datos'
        ],
        sub: ['Touchez pour régler l’accès dans les Réglages', 'Touch to set the access in Settings',
          'Tippen, um den Zugriff in den Einstellungen einzurichten', 'Toque para configurar el acceso en Ajustes'
        ]
      },
      error: ['Données : erreur de synchronisation{e}', 'Data: synchronisation error{e}', 'Daten: Synchronisationsfehler{e}',
        'Datos: error de sincronización{e}'
      ],
      position: ['Position : {s}', 'Position: {s}', 'Position: {s}', 'Posición: {s}'],
      // couche météo (ctx.weather) : appels pondérés à Open-Meteo du jour UTC, sur cet appareil
      weather: ['Météo : {n} appels aujourd’hui', 'Weather: {n} calls today', 'Wetter: {n} Abrufe heute',
        'Meteorología: {n} llamadas hoy'
      ],
      // fin de cycle AIRAC de ce qui est publié (INTEGRATION § 15.3) : {s} la base ou les procédures, {c} cycle, {d} date,
      // {n} le cycle à construire ; « construire », jamais « publier » : rien n'est à envoyer tant que rien n'est construit
      cycleOld: ['{s} : cycle {c} dépassé, à reconstruire pour {n}', '{s}: cycle {c} out of date, to rebuild for {n}',
        '{s}: Zyklus {c} veraltet, für {n} neu zu erstellen', '{s}: ciclo {c} caducado, por reconstruir para {n}'
      ],
      cycleEnds: ['{s} : le cycle {c} se termine le {d}, rien de construit pour {n}',
        '{s}: cycle {c} ends on {d}, nothing built for {n}',
        '{s}: Zyklus {c} endet am {d}, nichts für {n} erstellt', '{s}: el ciclo {c} termina el {d}, nada construido para {n}'
      ],
      cycleBase: ['Base aéronautique', 'Aeronautical database', 'Luftfahrtdatenbank', 'Base aeronáutica'],
      cycleProc: ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'],
      weatherOne: ['Météo : 1 appel aujourd’hui', 'Weather: 1 call today', 'Wetter: 1 Abruf heute', 'Meteorología: 1 llamada hoy'],
      weatherSub: ['Prévisions Open-Meteo, limite {max} par jour', 'Open-Meteo forecasts, limit {max} a day',
        'Open-Meteo-Vorhersagen, Grenze {max} pro Tag', 'Previsiones Open-Meteo, límite {max} al día'
      ]
    },
    // plein écran d'un module fixe (bouton de la couche de superposition : il montre « quitter » une fois en plein écran)
    full: {
      enter: ['Plein écran', 'Full screen', 'Vollbild', 'Pantalla completa'],
      exit: ['Quitter le plein écran', 'Exit full screen', 'Vollbild beenden', 'Salir de pantalla completa']
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
    ],
    // un écran de service qui déclare une route que le lanceur de ce poste ne publie pas (GET /__setup/routes, R-C4)
    screenOld: ['Le lanceur de ce poste est plus ancien que cet écran : relancez-le à jour (lancer.cmd).',
      'This computer’s launcher is older than this screen: restart it up to date (lancer.cmd).',
      'Der Starter dieses Rechners ist älter als dieser Bildschirm: Starten Sie ihn aktuell neu (lancer.cmd).',
      'El lanzador de este equipo es más antiguo que esta pantalla: reinícielo actualizado (lancer.cmd).'
    ],
    screenLevel: ['Cet écran n’est pas proposé à ce niveau d’usage : voir Réglages.',
      'This screen is not offered at this usage level: see Settings.',
      'Dieser Bildschirm wird auf dieser Nutzungsstufe nicht angeboten: siehe Einstellungen.',
      'Esta pantalla no se ofrece en este nivel de uso: vea Ajustes.'
    ]
  };
  /** Durée lisible depuis une date ISO (« 4 min », « 2 h », « 3 j »). */
  const ago = iso => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1e3);
    return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} ${t(['j', 'd', 'T', 'd'])}`;
  };

  // ---------------------------------------------------------------- notifications et questions (jamais de dialogue natif)
  /** Les notes au-dessus de la barre collante d'une vue (.f-bar, résultat ou enregistrement) quand elle est collée en bas de
   *  la fenêtre : --f-bar-clear sur .f-notes (frame.css) = la distance du haut de la barre au bas de la fenêtre, plus 8 px.
   *  Suivi seulement tant qu'une note est affichée (taille de la barre, fenêtre, défilement) ; écrit seulement si cela change. */
  const notesClear = (() => {
    let bar = null,
      clear = '',
      raf = 0,
      on = false;
    const ro = new ResizeObserver(() => later()),
      later = () => raf ||= requestAnimationFrame(measure),
      OPT = {
        capture: true,
        passive: true
      };

    function measure() {
      raf = 0;
      const box = $('fNotes'),
        h = innerHeight;
      let best = null,
        top = h;
      // la barre visible la plus haute parmi celles collées dans la moitié basse de la fenêtre (une vue cachée n'a pas de boîte)
      for (const b of box.childElementCount ? document.querySelectorAll('.f-bar') : []) {
        const r = b.getClientRects().length ? b.getBoundingClientRect() : null;
        if (r && r.height && r.top > h / 2 && r.top < top && r.bottom <= h + 1) {
          best = b;
          top = r.top;
        }
      }
      if (best !== bar) {
        if (bar) ro.unobserve(bar);
        bar = best;
        if (bar) ro.observe(bar);
      }
      const v = bar ? `${Math.ceil(h - top + 8)}px` : '';
      if (v !== clear) {
        clear = v;
        if (v) box.style.setProperty('--f-bar-clear', v);
        else box.style.removeProperty('--f-bar-clear');
      }
      const want = box.childElementCount > 0;
      if (want !== on) {
        on = want;
        const listen = on ? 'addEventListener' : 'removeEventListener';
        window[listen]('resize', later, OPT);
        document[listen]('scroll', later, OPT);
        if (!on && bar) {
          ro.unobserve(bar);
          bar = null;
        }
      }
    }
    return later;
  })();
  /** Notification flottante : effacée seule (6 s, erreur 12 s) ou par sa croix. kind : info, ok, warn, err. o.action
   *  { label, run } : un bouton d'action, et la notification reste jusqu'au clic. */
  function notify(text, kind = 'info', o = {}) {
    const n = document.createElement('div');
    n.className = 'f-note';
    n.dataset.kind = kind;
    n.innerHTML = `<span>${esc(text)}</span>${o.action ? `<button type="button" data-act>${esc(o.action.label)}</button>` : ''}<button type="button" data-x aria-label="${esc(t(T.close))}">✕</button>`;
    const drop = () => {
      n.remove();
      notesClear();
    };
    n.querySelector('[data-x]').onclick = drop;
    if (o.action) n.querySelector('[data-act]').onclick = () => {
      drop();
      o.action.run();
    };
    $('fNotes').append(n);
    notesClear();
    if (!o.action) setTimeout(drop, kind === 'err' ? 12e3 : 6e3);
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
    DIRECT = ['www.simbrief.com', 'api.ivao.aero', 'metar.vatsim.net', 'avwx.rest', 'api.open-meteo.com', 'data.vatsim.net'],
    // tuiles d'altitude Terrarium (relief du profil et courbes de niveau de la Carte, modules/maps/SPEC.md § 2.1) : appelées
    // directement, ce chemin seulement de l'hôte (s3.amazonaws.com en sert bien d'autres), en https et en lecture (GET)
    DIRECT_PATHS = [
      ['s3.amazonaws.com', '/elevation-tiles-prod/']
    ];
  // clé personnelle avwx.rest (TAF sans lanceur) : sur l'appareil seulement, avec le jeton GitHub, dans device/keys.json
  // (rangement de l'identité : IndexedDB, politique cache, hors des sauvegardes, jamais synchronisée : voir « clés de
  // l'appareil » plus bas) ; lue en mémoire, jamais rendue à une page
  let avwx = '';
  const avwxKey = () => avwx;
  /** Clé météo de l'appareil, pour la carte des réglages : présence, enregistrement, effacement, essai (TAF d'un
   *  terrain) ; la clé elle-même n'est jamais relue. */
  const weatherKey = {
    has: () => !!avwxKey(),
    async save(key) {
      const k = String(key || '').trim();
      avwx = k;
      await keepKeys();
      return !!k;
    },
    async clear() {
      avwx = '';
      await keepKeys();
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
  // compte IVAO du pilote par le relais (R1b) : { access_token, refresh_token, expires_at, scope }, dans device/keys.json avec
  // le jeton GitHub et la clé météo (hors des sauvegardes, jamais synchronisé) ; reçu une fois par le retour de l'OpenID
  // d'IVAO (#ivao-return?…, adresse remplacée aussitôt), renouvelé par le relais (son secret)
  let ivaoTok = null;
  /** Retour de l'OpenID d'IVAO (le lanceur renvoie vers #ivao-return?… ) : jetons gardés, adresse remplacée — ni
   *  l'historique, ni la page, ni un journal ne les gardent ; une erreur est dite. */
  async function takeIvaoReturn() {
    if (!location.hash.startsWith('#ivao-return?')) return;
    const q = new URLSearchParams(location.hash.slice('#ivao-return?'.length));
    history.replaceState(null, '', `${location.pathname}${location.search}#settings?card=ivao`);
    const at = q.get('access_token') || '',
      err = (q.get('error') || 'refused').slice(0, 60);
    // la vraie raison : un retour sans demande en cours (expirée, lanceur redémarré, faite ailleurs), un refus d'IVAO avec son
    // code, une application absente ; jamais « state » seul
    if (!at) return notify(err === 'state' ? t(T.ivaoFailState) : err === 'config' ? t(T.ivaoFailConfig) : err.startsWith('ivao:') ? t(
      T.ivaoFailIvao, {
        e: err.slice(5)
      }) : t(T.ivaoFail, {
      e: err
    }), 'err');
    ivaoTok = {
      access_token: at,
      refresh_token: q.get('refresh_token') || '',
      expires_at: +q.get('expires_at') || 0,
      scope: (q.get('scope') || '').slice(0, 200)
    };
    await keepKeys();
    notify(t(T.ivaoOk), 'ok');
  }
  /** Compte IVAO pour les Réglages et les modules : état (jamais le jeton), connexion par le relais, déconnexion, jeton du
   *  moment (renouvelé par le relais à moins de 5 minutes de sa fin) ou null. */
  const ivao = {
    status: () => ivaoTok ? {
      connected: true,
      expires_at: ivaoTok.expires_at,
      scope: ivaoTok.scope
    } : {
      connected: false
    },
    async connect() {
      const r = await launcherRequest('ivao/oauth/start', {
        json: {}
      });
      if (r?.body?.ok && /^https:\/\//.test(r.body.url || '')) {
        location.assign(r.body.url);
        return {
          ok: true
        };
      }
      return {
        ok: false,
        status: r?.status || 0,
        message: r?.body?.message || '',
        // sans application IVAO réglée (409) : l'adresse de retour à déclarer chez IVAO, et si c'est celle du relais
        redirect: typeof r?.body?.redirect === 'string' ? r.body.redirect : '',
        relay: r?.body?.relay === true
      };
    },
    /** L'application IVAO est-elle réglée sur ce lanceur (le poste ou le relais) ? { app, relay } ; null sans lanceur. */
    async setup() {
      const r = await launcherRequest('ivao/oauth');
      return r?.body && typeof r.body.app === 'boolean' ? {
        app: r.body.app,
        relay: r.body.relay === true
      } : null;
    },
    /** Délier : le jeton révoqué chez IVAO par le lanceur (s'il le peut), puis effacé ici ; { revoked }. */
    async disconnect() {
      const tok = ivaoTok?.refresh_token || ivaoTok?.access_token || '';
      const r = tok ? await launcherRequest('ivao/oauth/revoke', {
        json: {
          token: tok
        }
      }) : null;
      ivaoTok = null;
      await keepKeys();
      return {
        revoked: r?.body?.revoked === true
      };
    }
    // token() (le jeton à jour, renouvelé par le relais) : retiré faute de lecteur (R-C3) ; il reviendra avec le lecteur du
    // tracker d'IVAO, et la route ivao/oauth/refresh du lanceur avec lui
  };
  let launcherHere = null; // { data, dataGit, host, lan, lnm } si la page est servie par un lanceur (relevé au démarrage)
  // client du lanceur (frame/lib/launcher.js, INTEGRATION § 15) : chargé au démarrage ; le cadre s'en sert pour lui-même
  // (Réglages, fiches .lnmperf d'aerodb : toutes ses routes), un module par ctx.launcher (ce que son meta.launcher déclare)
  let LC = null,
    lcFor = null,
    lcClient = null;
  /** Client du lanceur qui sert la page (refait si la détection change) ; null sans lanceur. */
  const launcherClient = () => {
    if (!LC || !launcherHere) return null;
    if (lcFor !== launcherHere) {
      lcFor = launcherHere;
      lcClient = LC.launcherClient({
        root: ROOT,
        info: launcherHere
      });
    }
    return lcClient;
  };
  // la table des routes du lanceur de ce poste (GET /__setup/routes, R-C4) : lue une fois par lanceur détecté ; null sans
  // réponse ou sans table (lanceur plus ancien)
  let routesOf = null,
    routesP = null;
  const launcherRoutes = () => {
    if (routesOf !== launcherHere) {
      routesOf = launcherHere;
      routesP = launcherRequest('routes').then(r => Array.isArray(r?.body?.routes) ? new Set(r.body.routes.map(x => String(x.path)
        .replace(/^\/__setup\//, ''))) : null);
    }
    return routesP;
  };
  /** Une route déclarée (« devices », un préfixe « regen/ », l'annulation d'un travail « …/cancel ») publiée par la table have. */
  const published = (r, have) => r.endsWith('/') ? [...have].some(x => x.startsWith(r)) : have.has(r) || (r.endsWith('/cancel') && have
    .has(r
      .slice(0, -7)));
  /** Appel du cadre à une route du lanceur : { status, body } ou null (ni lanceur ni réponse) ; jamais d'exception. */
  const launcherRequest = (route, opts) => launcherClient()?.request(route, opts) ?? Promise.resolve(null);
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
          // le relais rend la réponse du site telle quelle (pas du JSON du lanceur) : le seul appel direct du cadre au lanceur
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
        if (DIRECT.includes(u.hostname) || site || u.protocol === 'https:' && String(init.method || 'GET').toUpperCase() === 'GET' &&
          DIRECT_PATHS.some(([h, p]) => u.hostname === h && u.pathname.startsWith(p)))
          return await fetch(u,
            init);
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
  // clés de l'appareil : jeton GitHub (réglage du dépôt) et clé météo, rangés comme l'identité — document
  // device/keys.json de la base IndexedDB du cadre, politique cache : jamais synchronisés, jamais dans une sauvegarde
  // (frame/store/frame_data.js le laisse hors de dump()). Ils étaient dans localStorage (githubData:frame, githubData:avwx)
  // et Safari les y perdait au relancement alors que l'identité restait (frame/settings/DECISIONS.md, 25 oct 2026). En
  // mémoire pour les lectures synchrones (FD.github.config(), avwxKey()) ; une écriture est mémoire d'abord, puis
  // document. Une seule reprise de l'ancien localStorage, la première fois où le document n'existe pas.
  const KEYS = 'device/keys.json';
  let keysSaved = Promise.resolve(), // dernière écriture du document, que toute relecture attend
    keysEpoch = 0; // compte les écritures : une relecture partie avant l'une d'elles ne remplace pas la mémoire
  /** Garde le jeton et la clé météo actuels en mémoire dans device/keys.json ; promesse de l'écriture. */
  function keepKeys() {
    keysEpoch++;
    const doc = {
      schema: 1,
      github: FD.github.config(),
      avwx,
      ivao: ivaoTok,
      updated_at: new Date().toISOString()
    };
    return keysSaved = keysSaved.then(() => own.put(KEYS, doc)).catch(e => console.error(e));
  }
  FD.github.persist(() => void keepKeys());
  /** Relit device/keys.json en mémoire (rien n'est remplacé si une écriture est partie entre-temps). */
  async function loadKeys() {
    await keysSaved;
    const epoch = keysEpoch,
      doc = await own.get(KEYS);
    if (epoch !== keysEpoch) return;
    if (doc) {
      FD.github.hold(doc.github);
      avwx = typeof doc.avwx === 'string' ? doc.avwx : '';
      ivaoTok = doc.ivao?.access_token ? doc.ivao : null;
      return;
    }
    // aucun document : l'ancien rangement de localStorage, repris une fois puis effacé
    const old = FD.github.legacy();
    let key = '';
    try {
      key = localStorage.getItem('githubData:avwx') || '';
      localStorage.removeItem('githubData:avwx');
    } catch {
      /* stockage indisponible */
    }
    if (old) FD.github.hold(old);
    avwx = key;
    if (old || key) await keepKeys();
  }
  let identity = Object.freeze({}),
    identityLoaded = false, // l'identité a été lue une fois (sans cela, « pas de trigramme » serait une fausse alerte au démarrage)
    usages = {},
    level = 2, // niveau d'usage de l'appareil (1 à 3)
    deviceLevel = 2, // celui que l'appareil a choisi, sans le plancher de l'application affichée (sélecteur d'application)
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
    await loadKeys();
    identity = Object.freeze({
      ...((await own.get('device/identity.json')) || {})
    });
    paintWho();
    usages = (await own.get('device/usages.json')) || {};
    // niveau choisi sur l'appareil (pour Pilote), jamais sous le plancher de l'application (Maintenance : Complet)
    deviceLevel = levelFrom((await own.get('device/level.json'))?.level);
    level = Math.max(deviceLevel, APP.level || 1);
    applyDesign(await own.get('device/design.json'));
    liveGps = (await own.get('device/live.json'))?.gps === true;
    liveTrail = trailFrom(await own.get(TRAIL_DOC));
    trailWatch ||= own.watch(TRAIL_DOC, async () => {
      liveTrail = trailFrom(await own.get(TRAIL_DOC));
    });
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
    // l'accès aux données a changé (dépôt réglé ou coupé, lanceur trouvé) : la base publiée est relue à la prochaine question
    const key = dataAccess().key;
    if (key !== accessKey) {
      accessKey = key;
      aerodb?.refresh();
    }
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
    identityLoaded = true;
    paintStatus(); // le trigramme absent est une ligne du bloc d'état et la pastille orange du ⚙
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
    }, {
      // ordinateur seulement (desktop : html.f-desk) : métal brossé, verre, boutons gel (frame/design/aqua.css) ; ailleurs, le
      // choix reste mémorisé et le cadre pose standard
      id: 'aqua',
      label: ['Aqua', 'Aqua', 'Aqua', 'Aqua'],
      textured: true,
      desktop: true
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
  /** Design réellement posé : celui du choix, sauf un design d'ordinateur (desktop) hors html.f-desk → standard. */
  const appliedDesign = () => DESIGNS.find(d => d.id === design.design)?.desktop && !document.documentElement.classList.contains(
    'f-desk') ? 'standard' : design.design;
  /** Pose design et ton sur <html> (seulement s'ils changent), garde le miroir et la couleur de la barre du système. */
  function applyDesign(v) {
    design = designFrom(v);
    const h = document.documentElement,
      shown = appliedDesign();
    if (h.dataset.design !== shown) h.dataset.design = shown;
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
    paintFavicon();
  }
  // l'appareil devient ou cesse d'être un ordinateur (fenêtre, pointeur) : le design posé suit (Aqua ↔ standard)
  window.addEventListener('frame-desk', () => applyDesign(design));
  /** Couleur de la barre du système : celle de l'en-tête, qui suit le design, le ton et (metro) le module affiché. */
  function paintBar() {
    const meta = document.querySelector('meta[name="theme-color"]'),
      head = document.querySelector('.f-head'),
      bar = head ? getComputedStyle(head).backgroundColor : '';
    if (meta && bar && meta.content !== bar) meta.content = bar;
  }
  // icône de l'onglet du navigateur d'une application qui la veut à sa teinte (tintIcon) : l'avion de la suite
  // (assets/favicon-flight.svg) dont le tracé prend la couleur calculée du jeton (lue sur l'icône de l'en-tête, qui la porte) ;
  // le fichier est lu une fois ; hors ligne sans lui, l'icône du fichier reste
  let faviconText = null;
  async function paintFavicon() {
    const ico = $('fAppIco'),
      link = document.querySelector('link[rel="icon"]');
    if (!APP.tintIcon || !ico || !link) return;
    try {
      faviconText ??= await fetch(new URL('assets/favicon-flight.svg', ROOT)).then(r => r.ok ? r.text() : Promise.reject(r.status));
    } catch {
      faviconText = null;
      return;
    }
    const tint = getComputedStyle(ico).color,
      svg = faviconText.replace(/(<path\b[^>]*\bfill=")[^"]*"/, `$1${tint}"`),
      href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }
  /** Module (ou écran du cadre) affiché : son id sur <html> (data-landmark), d'où le design metro tire la couleur repère
   *  (--sog-module, frame/design/tokens.css) de l'en-tête ; les écrans du cadre ont celle des réglages. Posé seulement
   *  s'il change ; le volet, le module et le menu portent la leur (data-landmark posé à leur création). */
  function paintModule(id) {
    const h = document.documentElement,
      m = SCREENS.includes(id) ? 'settings' : id || '';
    if (m && h.dataset.landmark !== m) h.dataset.landmark = m;
    paintName(id);
    paintBar();
  }
  // titre du module dans l'en-tête du téléphone (V3_SPECIFICATION § 7.1, règle 16) : un module qui n'est pas une vue fixe y
  // met son titre (meta.title, quatre langues) à la place du nom de l'application, et sa page perd sa grande ligne de titre
  // (<html class="f-titled">, frame.css : le h1 reste pour les lecteurs d'écran) ; un module fixe, un écran du cadre et
  // tout écran large gardent le nom de l'application.
  const moduleTitle = {}, // meta.title de chaque module (rangée de quatre textes), relevé avec le niveau et au montage
    phoneQ = matchMedia('(max-width: 760px)');
  let nameFor = ''; // écran ou module dont l'en-tête porte le nom
  /** Nom de l'en-tête pour l'écran ou le module id ('' : aucun) ; écrit seulement s'il change. */
  function paintName(id = nameFor) {
    nameFor = id;
    const row = id && !SCREENS.includes(id) && moduleFixed[id] !== true ? moduleTitle[id] : null,
      on = !!row && phoneQ.matches,
      txt = t(on ? row : APP.name),
      h = document.documentElement;
    if ($('fName').textContent !== txt) $('fName').textContent = txt;
    if (h.classList.contains('f-titled') !== on) {
      h.classList.toggle('f-titled', on);
      // ctx.titled du module change : il dessine sa grande ligne de titre pour les lecteurs d'écran seulement (f-sr), ou en clair
      window.dispatchEvent(new CustomEvent('frame-titled', {
        detail: {
          module: id || '',
          titled: on
        }
      }));
    }
  }
  phoneQ.addEventListener('change', () => paintName());
  // filet : un navigateur qui n'émettrait pas « change » sur la requête quand la fenêtre change de taille ou tourne ;
  // paintName n'écrit et n'émet « frame-titled » que si la valeur change
  addEventListener('resize', () => paintName(), {
    passive: true
  });
  addEventListener('orientationchange', () => paintName());
  /** Vue fixe (meta.fixed d'un module) : <html class="f-fixed"> donne à la vue toute la hauteur entre l'en-tête et la barre du
   *  bas (ou le bas de la fenêtre), sans défilement de la page (frame.css) ; jamais sous un écran du cadre ouvert par-dessus
   *  (il défile comme une page). id : le module affiché ('' : aucun). Écrit seulement si cela change. */
  function paintFixed(id) {
    document.documentElement.classList.toggle('f-fixed', !!id && !over && moduleFixed[id] === true);
    applyFull();
  }
  // ---------------------------------------------------------------- plein écran d'un module fixe
  // <html class="f-full"> (avec f-fixed) cache l'en-tête et, sur téléphone, la barre du bas (en paysage : le rail) ; sur un écran,
  // l'en-tête et la colonne des verbes (frame.css). Demandé par le bouton que le cadre ajoute à la colonne de droite de la couche
  // de superposition (il montre « réduire » une fois en plein écran : pas de puce de sortie) ou par Échap ; gardé tant que la
  // page vit (même sous un écran du cadre ouvert par-dessus, où il est sans effet), remis à zéro au changement de module. Pas
  // l'API plein écran du navigateur (absente de Safari sur iPhone) : la page prend toute la fenêtre.
  let full = false;
  const overlays = new Set(); // couches de superposition montées (module principal, volet)
  /** Pose ou retire f-full selon la demande et la vue fixe affichée ; à chaque changement, les modules sont prévenus
   *  (événement « frame-fullscreen », puis « resize » sur window : la carte se redimensionne). */
  function applyFull() {
    const h = document.documentElement,
      on = full && h.classList.contains('f-fixed');
    if (h.classList.contains('f-full') !== on) {
      h.classList.toggle('f-full', on);
      closeTabPop();
      window.dispatchEvent(new CustomEvent('frame-fullscreen', {
        detail: {
          on
        }
      }));
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
    for (const o of overlays) o.paintFull(on);
  }
  const setFull = on => {
    full = !!on;
    applyFull();
  };
  // ---------------------------------------------------------------- couche de superposition des modules fixes (INTEGRATION § 9.3)
  /** Couche d'un module fixe : .f-overlay, frère de sa racine dans la vue, posée en pixels sur sa zone de carte (l'enfant de la
   *  racine qui prend la place : flex-grow > 0, sinon le premier visible ; over(el) pour dire laquelle). Deux colonnes, gauche
   *  et droite ; le bouton plein écran est la dernière case de la droite (withFull : pas dans un volet). Les colonnes restent
   *  dans la carte : jamais sur la feuille. Observateurs : taille (la carte change quand la feuille bouge) et enfants de la
   *  racine (la carte est ajoutée après le montage) ; la géométrie n'est écrite que si elle change. Retourne { api (ctx.overlay), host, paintFull, dispose }. */
  function makeOverlay(root, withFull) {
    const host = root.parentElement,
      box = document.createElement('div');
    box.className = 'f-overlay';
    box.hidden = true;
    box.innerHTML = '<div class="f-ov-col f-ov-left"></div><div class="f-ov-col f-ov-right"></div>';
    const [left, right] = box.children;
    let explicit = null,
      watched = null,
      dirty = true, // la zone couverte est à rechercher (enfants de la racine changés, over(), refresh())
      geom = '',
      raf = 0;
    const button = ({
      icon: name,
      label = '',
      onClick,
      pressed,
      side = 'right'
    } = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'f-ov-btn';
      b.innerHTML = icon(name);
      b.title = label;
      b.setAttribute('aria-label', label);
      if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed));
      if (onClick) b.addEventListener('click', onClick);
      // le bouton plein écran reste le dernier de la colonne de droite, dans l'ordre du clavier comme à l'écran
      if (side !== 'left' && fbtn) right.insertBefore(b, fbtn);
      else(side === 'left' ? left : right).append(b);
      return b;
    };
    let fbtn = null;
    let fullShown = null;
    if (withFull) {
      fbtn = button({
        icon: 'maximize',
        label: t(T.full.enter),
        onClick: () => setFull(!full),
        pressed: false
      });
      fbtn.classList.add('f-ov-full');
    }
    /** Zone couverte : celle que dit le module, sinon l'enfant de la racine qui grandit (la carte), sinon le premier visible. */
    const targetOf = () => {
      if (explicit?.isConnected) return explicit;
      const kids = [...root.children].filter(c => c.offsetHeight >= 40 && getComputedStyle(c).position !== 'absolute');
      return kids.find(c => getComputedStyle(c).flexGrow > 0) || kids[0] || null;
    };
    const place = () => {
      raf = 0;
      if (!box.isConnected) return;
      const tg = !dirty && watched?.isConnected && watched.offsetHeight >= 40 ? watched : targetOf();
      dirty = false;
      if (tg !== watched) {
        if (watched) ro.unobserve(watched);
        watched = tg;
        if (tg) ro.observe(tg);
      }
      if (box.hidden !== !tg) box.hidden = !tg;
      if (!tg) return;
      const h = host.getBoundingClientRect(),
        r = tg.getBoundingClientRect(),
        g = [r.top - h.top - host.clientTop, r.left - h.left - host.clientLeft, r.width, r.height].map(v => Math.round(v * 10) / 10)
        .join(' ');
      if (g === geom) return;
      geom = g;
      const [top, lft, w, ht] = g.split(' ');
      box.style.cssText = `top:${top}px;left:${lft}px;width:${w}px;height:${ht}px`;
    };
    const later = () => raf ||= requestAnimationFrame(place);
    const ro = new ResizeObserver(later),
      mo = new MutationObserver(() => {
        dirty = true;
        later();
      });
    ro.observe(root);
    mo.observe(root, {
      childList: true
    });
    host.append(box);
    later();
    const o = {
      host,
      /** Bouton plein écran : icône, nom et état d'après le plein écran en cours (écrit seulement si cela change). */
      paintFull(on) {
        if (!fbtn || fullShown === on) return;
        fullShown = on;
        fbtn.innerHTML = icon(on ? 'minimize' : 'maximize');
        const label = t(on ? T.full.exit : T.full.enter);
        fbtn.title = label;
        fbtn.setAttribute('aria-label', label);
        fbtn.setAttribute('aria-pressed', String(on));
      },
      dispose() {
        ro.disconnect();
        mo.disconnect();
        if (raf) cancelAnimationFrame(raf);
        box.remove();
        overlays.delete(o);
      },
      /** Ce que le module reçoit (ctx.overlay). */
      api: Object.freeze({
        left,
        right,
        button,
        over: el => {
          explicit = el || null;
          dirty = true;
          later();
        },
        refresh: () => {
          dirty = true;
          later();
        },
        get full() {
          return document.documentElement.classList.contains('f-full');
        }
      })
    };
    overlays.add(o);
    o.paintFull(document.documentElement.classList.contains('f-full'));
    return o;
  }
  /** Retire les couches de superposition posées dans host (tout si host est omis) : démontage d'un module ou du volet. */
  function dropOverlays(host) {
    for (const o of [...overlays])
      if (!host || o.host === host || host.contains(o.host)) o.dispose();
  }
  // ---------------------------------------------------------------- état de l'appli : bloc de tête des Réglages, pastille du ⚙
  // (V3_SPECIFICATION.md § 7.1 règle 14, qui remplace le bouton « i » et son pop-up de la règle 3). iVAC : une pastille quand quelque
  // chose s'applique, une ligne par chose, un chevron quand elle mène quelque part. Rien d'autre que : vol en cours (› Carte),
  // CR à écrire (enregistrement de cache publié par flightlog), état des données (dernière synchronisation, écritures en
  // attente, conflits, échange utilisé), trigramme absent, base aéronautique, lanceur, hors ligne, position réelle (téléphone).
  // Les lignes sont le bloc « État » qui ouvre l'écran des Réglages (statusBlock / bindStatus, remis à frame/settings par son
  // contexte) ; la pastille est sur le ⚙ de l'en-tête : verte pour une nouvelle (vol démarré, CR à écrire), orange pour une
  // chose qui demande de l'attention (la ligne des données et « hors ligne » sont un état, pas une nouvelle).
  const PENDING_REPORTS = 'cache/flightlog/pending.json',
    HANDOFF = 'pilot/handoff.json';
  // lecture du cache de flightlog (jamais synchronisé) et passage à report (pilot/handoff.json, même politique « cache »
  // que l'écriture de flightlog) ; le cadre n'écrit rien d'autre
  // ---------------------------------------------------------------- couche météo (ctx.weather, INTEGRATION § 14)
  // une seule réserve et un seul décompte des appels à Open-Meteo pour tous les modules (frame/lib/weather_store.js) :
  // cache/weather/, politique cache (jamais synchronisée, hors des sauvegardes) ; le store est chargé à la première lecture
  const WEATHER_LEDGER = 'cache/weather/ledger.json';
  const weatherData = FD.adapter({
    id: 'frame-weather',
    writes: [{
      prefix: 'cache/weather/',
      policy: 'cache'
    }]
  });
  let weatherP = null,
    weatherSpent = []; // décompte : [[instant ms, poids]] (24 h glissantes), relu quand il change
  const weatherStore = () => weatherP ||= import(new URL('frame/lib/weather_store.js?v=0', ROOT).href).then(m => m.weatherStore({
    data: weatherData,
    net,
    root: ROOT
  }), e => {
    weatherP = null;
    throw e;
  });
  const weatherCall = name => (...a) => weatherStore().then(w => w[name](...a));
  /** ctx.weather : vents et températures en altitude d'une route (aloft), grille de prévisions (grid), METAR et TAF,
   *  synoptique monde publié (world), modèle d'un lieu, appels du jour ; tout est asynchrone (INTEGRATION § 14). */
  const weather = Object.freeze({
    aloft: weatherCall('aloft'),
    grid: weatherCall('grid'),
    metar: weatherCall('metar'),
    taf: weatherCall('taf'),
    world: weatherCall('world'),
    run: weatherCall('run'),
    spentToday: weatherCall('spentToday'),
    modelFor: weatherCall('modelFor')
  });
  /** Appels pondérés du jour UTC (ligne « Météo » du bloc d'état), au moment du dessin. */
  const weatherToday = () => {
    const start = Date.parse(new Date().toISOString().slice(0, 10));
    return Math.round(weatherSpent.filter(([t]) => t >= start).reduce((s, [, w]) => s + w, 0));
  };
  async function readWeather() {
    const e = (await infoData.get(WEATHER_LEDGER).catch(() => null))?.entries,
      v = Array.isArray(e) ? e.filter(x => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1])) : [];
    if (JSON.stringify(v) === JSON.stringify(weatherSpent)) return;
    weatherSpent = v;
    paintStatus();
  }

  const infoData = FD.adapter({
    id: 'frame-info',
    reads: [{
      prefix: 'cache/', // status.json de chaque module (INTEGRATION § 10) ; pending.json de flightlog (schéma 2, en attendant)
      policy: 'cache'
    }],
    writes: [{
      prefix: HANDOFF,
      policy: 'cache'
    }]
  });
  let lastFlight = null, // vol courant (liveCheck)
    lastStatus = null, // état de la synchronisation (paintSync)
    pendingReports = []; // CR à écrire, d'après cache/flightlog/pending.json
  const statusViews = new Set(); // blocs d'état affichés (éléments) : redessinés quand l'état change, oubliés une fois retirés

  // lignes d'état publiées par les modules eux-mêmes (cache/<module>/status.json, INTEGRATION § 10.1) : texte prêt dans les
  // quatre langues, adresse, passage éventuel à un autre module ; le cadre les vérifie et les affiche, sans connaître le
  // format d'un module. Un module qui publie son status.json remplace ce que le cadre déduisait de son ancien
  // enregistrement (cache/flightlog/pending.json, schéma 2 : dette, retirée quand flightlog publie le sien)
  let moduleLines = [],
    statusFiles = new Set(); // modules qui publient un status.json
  /** Ligne d'état publiée par le module from, vérifiée : texte (rangée de 1 à 4 textes), adresse d'un module ou d'un écran du
   *  cadre, passage optionnel à un module (handoff.to) ; null si elle ne suit pas le contrat. */
  function statusLineOf(from, l) {
    const text = Array.isArray(l?.text) ? l.text.filter(x => typeof x === 'string' && x).slice(0, 4) : typeof l?.text === 'string' && l
      .text ? [l
        .text
      ] : [];
    if (!text.length) return null;
    const target = typeof l.go === 'string' && /^#[\w-]+(\?[\w=&%.+-]*)?$/.test(l.go) ? l.go.slice(1).split('?')[0] : '',
      go = target && (isModule(target) || SCREENS.includes(target)) ? l.go : '',
      handoff = l.handoff && typeof l.handoff === 'object' && !Array.isArray(l.handoff) && isModule(l.handoff.to) ? l.handoff : null;
    return {
      from,
      text,
      go,
      handoff,
      news: l.news === true,
      attn: l.attn === true
    };
  }
  /** Lignes d'état de tous les modules (50 au plus), lues seulement sur l'appareil (jamais de réseau) ; redessinées si elles
   *  changent. */
  async function readModuleLines() {
    const have = new Set((await infoData.cached('cache/').catch(() => [])).map(d => d.path)),
      out = [],
      files = new Set();
    for (const m of APP.modules) {
      const path = `cache/${m.id}/status.json`;
      if (!have.has(path)) continue;
      files.add(m.id);
      const rec = await infoData.get(path).catch(() => null);
      for (const l of Array.isArray(rec?.lines) ? rec.lines : []) {
        const line = out.length < 50 && statusLineOf(m.id, l);
        if (line) out.push(line);
      }
    }
    statusFiles = files;
    if (JSON.stringify(out) !== JSON.stringify(moduleLines)) {
      moduleLines = out;
      paintStatus();
    }
  }
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
      paintStatus();
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
    if (s.lastError && s.online && s.lastError !== 'offline') return t(T.info.error, {
      e: ` — ${errText(s.lastError)}`
    });
    return `${s.lastSync ? t(T.info.synced, { d: ago(s.lastSync) }) : t(T.info.never)} · ${s.pending ? t(T.info.pending, { n: s.pending }) : t(T.info.noPending)}`;
  }

  /** Lignes du bloc d'état : { k, text, sub, go (adresse, 'report:<i>', 'card:<carte des Réglages>', 'live'), news (compte pour
   *  la pastille verte), attn (demande de l'attention : pastille orange du ⚙ sur un téléphone) }. Le trigramme absent,
   *  l'erreur, les conflits, les écritures en attente et le hors ligne y sont des lignes : le bouton de synchronisation et la
   *  pastille du trigramme ne sont plus dans l'en-tête du téléphone. */
  function statusItems() {
    const items = [],
      maps = APP.modules.find(m => m.id === 'maps');
    if (lastFlight?.started && maps) items.push({
      k: 'flight',
      text: t(T.info.flight, {
        m: t(maps.label)
      }),
      go: '#maps',
      news: true,
      // usage « à plusieurs » : la position part au dépôt du groupe, la trace reste sur l'appareil ; le pilote le lit ici
      ...(usages.users ? {
        sub: t(T.info.trailShared)
      } : {})
    });
    moduleLines.forEach((l, i) => items.push({
      k: `line-${l.from}`,
      text: t(l.text),
      go: `line:${i}`,
      news: l.news,
      attn: l.attn
    }));
    // ancien enregistrement de flightlog (schéma 2), tant qu'il ne publie pas son status.json
    if (!statusFiles.has('flightlog')) pendingReports.forEach((f, i) => items.push({
      k: 'report',
      text: t(T.info.report, {
        date: infoDate(f.date),
        dep: f.dep,
        arr: f.arr
      }),
      go: `report:${i}`,
      news: true
    }));
    if (identityLoaded && !identity.trigram) items.push({
      k: 'who',
      text: t(T.info.who),
      sub: t(T.info.whoSub),
      go: 'card:identity',
      attn: true
    });
    items.push(...cycleItems()); // fin de cycle AIRAC de ce qui est publié (base, proc/)
    // la base aéronautique : trois états distincts, jamais « non publiée » pendant qu'elle charge ni sans accès
    if (baseState) items.push({
      k: 'base',
      text: t(T.info.base[baseState]),
      sub: baseState === 'noaccess' ? t(T.info.base.sub) : '',
      go: baseState === 'loading' ? '' : 'card:access'
    });
    const s = lastStatus;
    if (s) items.push({
      k: 'data',
      text: dataLine(s),
      sub: t(T.info.transport, {
        x: t(T.info.tr[s.transport] || T.info.tr.local)
      }),
      go: s.conflicts ? '#conflicts' : 'card:sync,usages',
      attn: ATTENTION.has(syncState(s)[0])
    });
    if (s?.transport === 'launcher') items.push({
      k: 'launcher',
      text: t(T.info.launcher, {
        h: launcherHere?.host || location.hostname,
        s: syncState(s)[1]
      }),
      go: 'card:access'
    });
    const calls = weatherToday();
    if (calls > 0) items.push({
      k: 'weather',
      text: calls === 1 ? t(T.info.weatherOne) : t(T.info.weather, {
        n: calls.toLocaleString(lang())
      }),
      sub: t(T.info.weatherSub, {
        max: (10000).toLocaleString(lang())
      })
    });
    if (!net.online()) items.push({
      k: 'offline',
      text: t(T.info.offline),
      attn: true
    });
    // réservée au téléphone (l'en-tête d'un écran garde sa pastille de position) : cachée au-dessus de 760 px
    if (live.active) items.push({
      k: 'live',
      text: t(T.info.position, {
        s: live.source ? LIVE_NAMES[live.source] || live.source.toUpperCase() : '—'
      }),
      sub: t(gpsWatch !== null ? T.live.gpsOff : T.live.gpsOn),
      go: 'live',
      phone: true
    });
    return items;
  }

  const statusRows = items => items.map(it => {
    const inner = `<i class="f-status-dot"${it.news || it.attn ? '' : ' hidden'}${it.attn && !it.news ? ' data-attn' : ''}></i><span class="f-status-txt"><span>${esc(it.text)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.go ? icon('chevron-right') : ''}`;
    return `<li data-k="${esc(it.k)}"${it.phone ? ' data-phone' : ''}>${it.go ? `<button type="button" class="f-status-row" data-go="${esc(it.go)}">${inner}</button>` : `<div class="f-status-row">${inner}</div>`}</li>`;
  }).join('');
  /** Signature courte d'un texte : un bloc d'état n'est réécrit que si elle change. */
  const sig = s => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
    return String(h);
  };
  /** Contenu du bloc d'état : titre et lignes. */
  const statusBody = items => `<h2>${esc(t(T.info.title))}</h2><ul class="f-status-list">${statusRows(items)}</ul>`;
  /** Bloc d'état de tête des Réglages (carte, `data-card="status"`), à la valeur du moment ; frame/settings le pose en
   *  première carte puis le confie à bindStatus. Sans ligne il est caché. */
  function statusBlock() {
    const items = statusItems(),
      body = statusBody(items);
    return `<div class="f-card f-status" data-card="status" data-sig="${sig(body)}"${items.length ? '' : ' hidden'}>${body}</div>`;
  }
  /** Rend vivant le bloc el (posé par statusBlock) : un toucher sur une ligne mène où elle dit ; il est redessiné par
   *  paintStatus quand l'état change, jusqu'à ce qu'il quitte la page. */
  function bindStatus(el) {
    if (!el || statusViews.has(el)) return;
    statusViews.add(el);
    el.addEventListener('click', e => {
      const row = e.target.closest('[data-go]');
      if (row && el.contains(row)) goStatus(row.dataset.go);
    });
    paintStatus();
  }
  /** Pastille et nom du ⚙ de l'en-tête, et les blocs d'état affichés (écrit seulement si cela change). Pastille verte : une
   *  nouvelle (data-badge, partout) ; orange : une chose demande de l'attention (data-attn, téléphone seulement : sur un
   *  écran le bouton de synchronisation et la pastille du trigramme sont dans l'en-tête). */
  function paintStatus() {
    const items = statusItems(),
      b = $('fDevice');
    if (b) {
      const news = items.some(it => it.news),
        attn = items.some(it => it.attn),
        label = news || attn ? `${t(T.device)} — ${t(T.info.news)}` : t(T.device);
      if (b.hasAttribute('data-badge') !== news) news ? b.setAttribute('data-badge', '') : b.removeAttribute('data-badge');
      if (b.hasAttribute('data-attn') !== attn) attn ? b.setAttribute('data-attn', '') : b.removeAttribute('data-attn');
      if (b.title !== label) b.title = label;
      if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
    }
    if (!statusViews.size) return;
    const body = statusBody(items),
      s = sig(body);
    for (const el of [...statusViews]) {
      if (!el.isConnected) {
        statusViews.delete(el);
        continue;
      }
      if (el.dataset.sig !== s) {
        el.innerHTML = body;
        el.dataset.sig = s;
      }
      if (el.hidden !== !items.length) el.hidden = !items.length;
    }
  }

  /** Aide de l'écran affiché (bouton « ? » de l'en-tête, sur un téléphone comme sur un écran) : le manuel au chapitre de
   *  l'écran (celui du module ; celui des Réglages quand ils sont ouverts par-dessus) ; un second appel, avec l'aide ouverte,
   *  la referme. */
  function openHelp() {
    if (over && ['help', 'roadmap'].includes(over.id)) return leaveOver();
    const shown = over ? over.id : parseHash().id,
      at = ['settings', 'device'].includes(shown) ? 'settings' : current?.id || '',
      a = at === current?.id && !over ? helpAnchorOf(at) : '';
    location.hash = `#help${at ? `?m=${encodeURIComponent(at)}${a ? `&a=${encodeURIComponent(a)}` : ''}` : ''}`;
  }
  // ancre d'aide de l'écran courant d'un module (ctx.helpAnchor) : un identifiant du chapitre, ou une fonction qui le rend au
  // moment du « ? » ; le « ? » ouvre alors le chapitre à ce paragraphe, surligné (frame/help/help.js)
  const helpAnchors = {};
  /** Ancre d'aide du module id ('' sans ancre, ou si la fonction du module échoue). */
  function helpAnchorOf(id) {
    try {
      const a = typeof helpAnchors[id] === 'function' ? helpAnchors[id]() : helpAnchors[id];
      return /^[\w-]+$/.test(a || '') ? a : '';
    } catch {
      return '';
    }
  }
  /** Suite d'un toucher sur une ligne du bloc d'état : une adresse (un choix de menu : pas de « ← »), une carte des Réglages
   *  (`card:sync,usages` : la première visible, amenée sous l'en-tête, son premier champ pris), la bascule de la position
   *  réelle, ou un CR à écrire : le vol est remis à report par pilot/handoff.json (le format de flightlog : { to, from,
   *  source, at, fresh, family, values }), puis #report?from=flightlog ; un enregistrement sans « handoff » (schéma 1)
   *  renvoie à Mes vols. */
  async function goStatus(go) {
    if (go === 'live') return void(gpsWatch !== null ? liveApi().disable() : liveApi().enable());
    if (go.startsWith('card:')) {
      const card = go.slice(5).split(',').map(k => $('fView').querySelector(`[data-card="${k}"]`)).find(c => c && !c.hidden);
      card?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
      card?.querySelector('input:not([type=hidden]):not([disabled]), button:not([disabled])')?.focus({
        preventScroll: true
      });
      return;
    }
    let to = go;
    // ligne publiée par un module : le passage éventuel (pilot/handoff.json, tel que le module l'a donné, avec sa source et
    // l'heure), puis son adresse
    if (go.startsWith('line:')) {
      const l = moduleLines[+go.slice(5)];
      if (!l) return;
      if (l.handoff) try {
        const from = APP.modules.find(m => m.id === l.from);
        await infoData.put(HANDOFF, {
          ...l.handoff,
          from: l.from,
          source: from ? t(from.label) : l.from,
          at: new Date().toISOString(),
          fresh: true
        }, {
          policy: 'cache'
        });
      } catch (e) {
        return notify(String(e.message || e), 'err');
      }
      to = l.go || (l.handoff ? `#${l.handoff.to}?from=${l.from}` : '');
      if (!to) return;
      if (location.hash === to) return l.handoff ? route() : undefined; // même adresse : le passage est repris au remontage
    }
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
    if (to.startsWith('?')) return void location.assign(new URL(to, location.href).href); // une autre application du cadre
    // même adresse : rien ne change, sauf pour un CR (report reprend le passage à son montage, donc il est monté de nouveau)
    if (location.hash === to) return go.startsWith('report:') ? route() : undefined;
    if (isModule(to.slice(1).split('?')[0]) && !to.includes('from=')) viaMenu = true;
    location.hash = to;
  }
  /** Source en lecture seule des bases de référence (SIA, appareils) quand rien n'est échangé : le lanceur qui sert la
   *  page, sinon le dépôt GitHub réglé ; null sans l'un ni l'autre (site public : ces bases n'y sont jamais publiées). */
  function referenceSource() {
    if (launcherHere?.data) return FD.launcher({
      exchange: false
    });
    return FD.github.config() ? FD.github() : null;
  }
  /** Accès aux données de cet appareil, tel que la couche le lit : `via` lanceur (page servie par un lanceur), github
   *  (dépôt et jeton réglés) ou none ; `set` : l'un des deux existe. Sans accès, ni la base aéronautique ni les types
   *  d'appareils ne sont lisibles ici (referenceSource() est null) : ce n'est pas « non publiée », c'est « non réglé ». */
  function dataAccess() {
    const via = launcherHere?.data ? 'launcher' : FD.github.config() ? 'github' : 'none';
    return Object.freeze({
      via,
      set: via !== 'none',
      key: `${via}:${FD.github.config()?.repo || ''}`
    });
  }
  // état de la base aéronautique pour la ligne du bloc d'état : '' tant qu'elle n'a pas été demandée ou qu'elle est prête
  let baseState = '',
    accessKey = '';
  /** Relève l'état d'aerodb (événement 'state' ou 'change', jamais un minuteur) ; la ligne du bloc d'état n'est redessinée que
   *  s'il change. */
  async function syncBase() {
    const s = await aerodb?.state().catch(() => null),
      next = s?.asked && ['loading', 'noaccess', 'unpublished'].includes(s.state) ? s.state : '';
    if (next === baseState) return;
    baseState = next;
    paintStatus();
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
    // dépôt de l'appareil (GitHub, ou une instance GitLab : son transport y signe les commits du trigramme)
    if (FD.github.config()) return FD.github({
      ...FD.github.config(),
      author: () => identity.trigram
    });
    return {
      ...FD.transports.local(),
      missing: true
    };
  }

  // ---------------------------------------------------------------- bouton de synchronisation
  let lastSyncState = '';
  /** État du bouton de synchronisation et son libellé : [état, libellé]. Un seul calcul pour le bouton de l'en-tête et pour
   *  la ligne des données du bloc d'état. */
  function syncState(s) {
    if (s.syncing) return ['syncing', t(T.sync.syncing)];
    if (s.conflicts) return ['conflicts', t(T.sync.conflicts, {
      n: s.conflicts
    })];
    // transport local (cet appareil seul) : rien n'est jamais « à envoyer » ; une écriture en attente y est vidée aussitôt dans
    // la copie (FD.sync local) et ne demande pas l'attention, même l'instant où elle attend (SPEC § 3)
    if (s.transport === 'local') return ['local', t(T.sync.local)];
    if (!s.online || s.lastError === 'offline') return ['offline', s.pending ? `${t(T.sync.offline)} · ${t(T.sync.pending, { n: s.pending })}` : t(T.sync.offline)];
    if (s.lastError) return ['error', t(T.sync.error)];
    if (s.pending) return ['pending', t(T.sync.pending, {
      n: s.pending
    })];
    return ['ok', s.lastSync ? t(T.sync.ago, {
      d: ago(s.lastSync)
    }) : t(T.sync.ok)];
  }
  // états qui demandent l'attention (pastille orange du ⚙ sur téléphone) ; syncing, ok et local n'en demandent pas
  const ATTENTION = new Set(['pending', 'offline', 'conflicts', 'error']);
  /** Écrit l'état du bouton (seulement s'il change). */
  function paintSync(s) {
    lastStatus = s;
    paintStatus(); // le bloc d'état et la pastille du ⚙ : même état
    const [state, label] = syncState(s);
    // infobulle : l'état, puis les écritures en attente (chemin, module, heure ; cinq au plus) et la dernière erreur
    const queue = (s.queue || []).slice(0, 5).map(q => `\n• ${q.deletion ? '✕ ' : ''}${q.path} — ${q.module || '?'}, ${tz('fmtZ', q.at)}`)
      .join('') + ((s.queue || []).length > 5 ? '\n…' : '');
    const title = t(T.sync.title, {
      tr: s.transport,
      last: s.lastSync ? tz('fmtDateZ', s.lastSync) : t(T.sync.never),
      n: s.pending,
      e: s.lastError ? ` — ${errText(s.lastError)}` : ''
    }) + queue;
    const key = JSON.stringify([state, label, title]);
    if (key === lastSyncState) return;
    lastSyncState = key;
    const b = $('fSync');
    b.dataset.state = state;
    b.title = title;
    b.setAttribute('aria-label', label);
    b.querySelector('.f-lbl').textContent = label;
  }
  let rewrittenSaid = false;
  /** Synchronise maintenant et dit le résultat (reçus, envoyés, conflits, hors ligne, erreur). */
  async function syncNow(quiet = false) {
    const r = await FD.sync();
    if (r.conflicts) notify(t(T.sync.conflictNote, {
      n: r.conflicts
    }), 'warn');
    // historique du dépôt réécrit (lanceur) : jamais fusionné ; dit même en passage de fond, une fois par lancement
    if (r.exchange?.code === 'rewritten' && !rewrittenSaid) {
      rewrittenSaid = true;
      notify(t(T.sync.rewritten), 'warn');
    }
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
      'settings/kit.js?v=0', 'settings/launcher.js?v=0', 'settings/access.js?v=0', 'settings/diagnostic.js?v=0',
      'settings/admin.js?v=0', 'settings/groups.js?v=0', 'settings/settings.js?v=0'
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
    const tok = navSeq,
      at = location.hash;
    try {
      await need(id);
    } catch (e) {
      return notify(t(T.loadErr, {
        m: id,
        e: e.message || e
      }), 'err');
    }
    if (tok !== navSeq || location.hash !== at || !box.isConnected) return;
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
      // carte d'accueil des tutoriels : celle de Pilote, pas d'une autre application (APP.welcome: false)
      if (APP.welcome !== false) SogHelp.welcome?.(helpCtx()).then(w => w && el.isConnected && view.prepend(w)).catch(e => console
        .warn('help', e));
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
  for (const s of APP.screens) ROUTES[s.id] = view => renderScreen(s, view); // écrans de service
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
        if (Array.isArray(meta.title)) moduleTitle[m.id] = meta.title;
      } catch {
        moduleLevel[m.id] = 1;
      }
    }));
    renderMenu();
    paintFixed(current?.id || ''); // le module déjà affiché peut se révéler fixe maintenant
    paintName(); // ... ou avoir un titre
  }
  /** Menu des verbes du niveau de l'appareil (redessiné seulement quand la liste change), entrée courante marquée ; la
   *  barre d'onglets suit (screen : l'écran du cadre affiché, ou rien). */
  function renderMenu(active = menuActive, screen = menuScreen) {
    menuActive = active;
    menuScreen = screen;
    renderTabs(tabFor(active, screen));
    const ul = $('fMenu'),
      list = visibleModules(),
      links = (APP.links || []).filter(l => (l.level ?? 1) <= level && (!l.launcher || (launcherHere && !launcherHere.lan))),
      key = lang() + list.map(m => m.id).join(',') + '|' + links.map(l => l.id).join(',');
    if (key !== menuKey || !ul.children.length) {
      menuKey = key;
      // liens de l'application (écran du cadre « #… » ou page de la suite, dans le même onglet) après ses modules
      ul.innerHTML = list.map(m => `<li><a href="#${esc(m.id)}" data-id="${esc(m.id)}" data-landmark="${esc(m.id)}">${icon(m.icon)}${esc(t(m.label))}</a></li>`).join('') +
        links.map(l => `<li><a href="${esc(l.href.startsWith('#') ? l.href : new URL(l.href, location.href).href)}" data-link="${esc(l.id)}" data-landmark="settings">${icon(l.icon)}${esc(t(l.label))}</a></li>`).join('');
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
  /** Onglet marqué : aucun quand les réglages sont affichés (leur bouton est le ⚙ de l'en-tête), sinon celui du module
   *  affiché ('' si aucun). */
  const tabFor = (moduleId, screenId) => ['settings', 'device'].includes(screenId) ? '' : tabOf(moduleId)?.id || '';
  /** Rangées du popover d'un onglet : ses modules visibles à ce niveau, chacun suivi de ses vues (tb.views), dans l'ordre :
   *  { module, view (id de la vue, absent pour le module), hash, label, icon }. */
  const tabRows = tb => tabVisible(tb).flatMap(id => {
    const m = APP.modules.find(x => x.id === id);
    return [{
      module: id,
      hash: `#${id}`,
      label: m.label,
      icon: m.icon
    }, ...(tb.views || []).filter(v => v.module === id).map(v => ({
      module: id,
      view: v.id,
      hash: `#${id}?${v.query}`,
      label: v.label,
      icon: v.icon
    }))];
  });
  /** Rangée affichée en ce moment : la vue dont la requête est celle de l'adresse, sinon le module (mesuré sur l'adresse :
   *  le module qui change de vue par un bouton à lui, sans l'inscrire dans l'adresse, n'est pas suivi). */
  function currentRow(tb, rows) {
    const q = parseHash().query,
      mine = rows.filter(r => r.module === current?.id),
      view = mine.find(r => r.view && [...new URLSearchParams(r.hash.split('?')[1])].every(([k, v]) => q[k] === v));
    return view || mine.find(r => !r.view) || null;
  }
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
      closeTabPop();
      // data-landmark : la couleur repère du premier module du groupe (design metro) ; l'icône pleine remplace le trait
      // sur l'onglet choisi (la feuille de style montre l'une ou l'autre : la forme change, pas seulement la couleur)
      nav.setAttribute('aria-label', t(T.tabsNav));
      // aria-label et title : le nom de la case quand le libellé est caché (le rail du paysage n'a que des icônes)
      nav.innerHTML = `<ul>${list.map(tb => `<li><a data-tab="${esc(tb.id)}" aria-label="${esc(t(tb.label))}" title="${esc(t(tb.label))}" data-landmark="${esc(tb.screen ? 'settings' : tabModules(tb)[0] || tb.modules[0])}"><span class="f-tab-ico">${icon(tb.icon)}${Icons?.svg(tb.icon, { filled: true }) || ''}</span><span class="f-tab-lbl">${esc(t(tb.label))}</span></a></li>`).join('')}</ul>`;
    }
    for (const a of nav.querySelectorAll('a')) {
      const tb = APP.tabs.find(x => x.id === a.dataset.tab),
        href = tabTarget(tb),
        on = a.dataset.tab === active;
      if (a.getAttribute('href') !== href) a.setAttribute('href', href);
      if ((a.getAttribute('aria-current') === 'page') !== on) on ? a.setAttribute('aria-current', 'page') : a.removeAttribute(
        'aria-current');
      // un groupe de deux rangées ou plus (modules, vues) : son onglet choisi, touché de nouveau, ouvre la liste (popover)
      const group = !!tb.modules && tabRows(tb).length > 1;
      if (a.hasAttribute('aria-haspopup') !== group) group ? a.setAttribute('aria-haspopup', 'true') : a.removeAttribute('aria-haspopup');
    }
  }
  // ---------------------------------------------------------------- second toucher sur l'onglet choisi : les modules du groupe
  // pas de rangée de sous-onglets : un deuxième toucher sur l'onglet déjà choisi ouvre, au-dessus de lui, un popover qui liste
  // les modules du groupe et leurs vues (verbe et icône, le courant marqué : « Carburant · Fiches ») ; un toucher en choisit un,
  // un toucher à côté, Échap, un défilement ou un changement d'adresse le ferment. Seulement pour un groupe de deux rangées ou
  // plus au niveau de l'appareil ; sur un onglet qui n'en a qu'une, le deuxième toucher ne fait rien.
  let tabPop = null; // { el, tab, off }
  /** Ferme le popover du groupe (focus rendu à l'onglet si focusBack). */
  function closeTabPop(focusBack = false) {
    if (!tabPop) return;
    const {
      el,
      tab,
      off
    } = tabPop;
    tabPop = null;
    off.abort();
    el.remove();
    tab.removeAttribute('aria-expanded');
    if (focusBack) tab.focus({
      preventScroll: true
    });
  }
  /** Ouvre (ou ferme, s'il l'est) le popover du groupe tb au-dessus de son onglet a. */
  function toggleTabPop(a, tb) {
    if (tabPop) return closeTabPop();
    const rows = tabRows(tb),
      now = currentRow(tb, rows);
    if (rows.length < 2) return;
    const el = document.createElement('div');
    el.className = 'f-tabpop';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t(tb.label));
    // data-id : le module ; data-view : la vue (absent pour le module lui-même)
    el.innerHTML = rows.map(r => `<button type="button" class="f-tabpop-row" data-id="${esc(r.module)}"${r.view ? ` data-view="${esc(r.view)}"` : ''}${r === now ? ' aria-current="page"' : ''}>${icon(r.icon)}<span>${esc(t(r.label))}</span></button>`).join('');
    el.style.visibility = 'hidden';
    document.body.append(el);
    // au-dessus de l'onglet, centré sur son icône, sans sortir de la fenêtre ; la pointe garde l'aplomb de l'onglet
    const r = (a.querySelector('.f-tab-ico') || a).getBoundingClientRect(),
      bar = $('fTabs').getBoundingClientRect(),
      w = el.offsetWidth,
      h = el.offsetHeight,
      cx = r.left + r.width / 2;
    if (document.documentElement.classList.contains('f-land')) {
      // paysage : la barre est un rail à gauche ; le popover s'ouvre à sa droite, sa première ligne face à l'icône (sans sortir de
      // la fenêtre), la pointe (--f-pop-caret : sa position verticale dans le popover) à gauche, face à l'icône
      const cy = r.top + r.height / 2,
        y = Math.min(Math.max(cy - 26, 8), document.documentElement.clientHeight - h - 8);
      el.style.left = `${Math.round(bar.right + 10)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.style.setProperty('--f-pop-caret', `${Math.round(cy - y)}px`);
    } else {
      const x = Math.min(Math.max(cx - w / 2, 8), document.documentElement.clientWidth - w - 8);
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(bar.top - h - 10)}px`;
      el.style.setProperty('--f-pop-caret', `${Math.round(cx - x)}px`);
    }
    el.style.visibility = '';
    const off = new AbortController(),
      opt = {
        signal: off.signal
      };
    tabPop = {
      el,
      tab: a,
      off
    };
    a.setAttribute('aria-expanded', 'true');
    // un toucher ailleurs (l'onglet lui-même bascule par son propre clic), un défilement, un changement d'adresse ou de taille
    document.addEventListener('pointerdown', e => {
      if (!el.contains(e.target) && !a.contains(e.target)) closeTabPop();
    }, {
      ...opt,
      capture: true
    });
    window.addEventListener('scroll', e => {
      if (!(e.target instanceof Node && el.contains(e.target))) closeTabPop();
    }, {
      ...opt,
      capture: true,
      passive: true
    });
    window.addEventListener('hashchange', () => closeTabPop(), opt);
    window.addEventListener('resize', () => closeTabPop(), opt);
    el.addEventListener('click', e => {
      const btn = e.target.closest('[data-id]'),
        row = btn && rows.find(r => r.module === btn.dataset.id && (r.view || '') === (btn.dataset.view || ''));
      if (!row) return;
      closeTabPop();
      if (row !== now) {
        viaMenu = true; // un choix de module ou de vue, pas un passage : pas de « ← »
        location.hash = row.hash;
      }
    }, opt);
    el.querySelector('[aria-current]')?.focus({
      preventScroll: true
    });
  }
  // sélecteur d'application (frame/SPEC.md § 3.1) : le nom de l'en-tête ouvre, sous lui, la liste des applications du cadre ;
  // le même popover que celui des onglets (tabPop : un toucher à côté, Échap, un défilement, une adresse ou une taille le ferment)
  /** Adresse d'une application : ?app=<id> (aucun pour Pilote, les autres clés gardées) et l'ancre de son premier module. */
  function appHref(app) {
    const q = new URLSearchParams(location.search);
    if (app.id === 'pilot') q.delete('app');
    else q.set('app', app.id);
    const s = q.toString();
    return `${location.pathname}${s ? `?${s}` : ''}#${app.modules[0]?.id || ''}`;
  }
  /** Ouvre (ou ferme, s'il l'est) la liste des applications sous le bouton du nom. */
  function toggleAppPop() {
    if (tabPop) return closeTabPop();
    const a = $('fApp'),
      apps = Object.values(APPS);
    const el = document.createElement('div');
    el.className = 'f-tabpop f-down';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', t(T.appSwitch));
    el.innerHTML = apps.map(p => {
      const cur = p === APP,
        off = !cur && (p.level || 1) > deviceLevel,
        need = off ? `<small>${esc(t(T.appNeeds, { l: t(T.levelNames[(p.level || 1) - 1]) }))}</small>` : '';
      return `<button type="button" class="f-tabpop-row" data-app="${esc(p.id)}"${cur ? ' aria-current="page"' : ''}${off ? ' disabled' : ''}><span class="f-app-ico" style="color:${esc(p.tint || 'currentColor')}">${icon(p.icon)}</span><span>${esc(t(p.name))}${need}</span></button>`;
    }).join('');
    el.style.visibility = 'hidden';
    document.body.append(el);
    // sous le bouton, à gauche de la fenêtre au plus près, la pointe (--f-pop-caret) face à l'icône
    const r = ($('fAppIco') || a).getBoundingClientRect(),
      w = el.offsetWidth,
      cx = r.left + r.width / 2,
      x = Math.min(Math.max(cx - 24, 8), document.documentElement.clientWidth - w - 8);
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(a.getBoundingClientRect().bottom + 10)}px`;
    el.style.setProperty('--f-pop-caret', `${Math.round(cx - x)}px`);
    el.style.visibility = '';
    const off = new AbortController(),
      opt = {
        signal: off.signal
      };
    tabPop = {
      el,
      tab: a,
      off
    };
    a.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', e => {
      if (!el.contains(e.target) && !a.contains(e.target)) closeTabPop();
    }, {
      ...opt,
      capture: true
    });
    window.addEventListener('scroll', e => {
      if (!(e.target instanceof Node && el.contains(e.target))) closeTabPop();
    }, {
      ...opt,
      capture: true,
      passive: true
    });
    window.addEventListener('hashchange', () => closeTabPop(), opt);
    window.addEventListener('resize', () => closeTabPop(), opt);
    el.addEventListener('click', e => {
      const p = APPS[e.target.closest('[data-app]:not([disabled])')?.dataset.app];
      if (!p) return;
      closeTabPop();
      if (p !== APP) location.replace(appHref(p));
    }, opt);
    el.querySelector('[aria-current]')?.focus({
      preventScroll: true
    });
  }
  // écrans déplacés : l'ancienne adresse mène à la nouvelle (#relay-devices → #devices, un seul écran d'appareils, R-C2)
  const MOVED = Object.freeze({
    'relay-devices': 'devices'
  });
  let current = null, // { id, mod }
    navSeq = 0; // jeton de navigation : le dernier changement d'adresse gagne
  /** Affiche l'écran de l'adresse (#module, #module?…, #conflicts, #settings) ; démonte le module précédent. Une seule
   *  navigation à la fois : chaque appel prend un jeton, et une reprise après un await dont le jeton n'est plus le dernier
   *  abandonne sans rien écrire (la vue est déjà vidée par la navigation suivante, qui a démonté le module en cours de montage). */
  async function route() {
    // retour de l'OpenID d'IVAO arrivé sans recharger la page (même document) : jetons rangés, adresse remplacée, puis le routage
    if (location.hash.startsWith('#ivao-return?')) return void takeIvaoReturn().then(route);
    // ancienne adresse d'un écran gardée en renvoi (l'adresse remplacée : le retour arrière ne la rejoue pas)
    const moved = MOVED[parseHash().id];
    if (moved) return void location.replace(`#${moved}`);
    const h = parseHash(),
      id = h.id || visibleModules()[0]?.id || 'settings';
    // écrans du cadre (aide, feuille de route, réglages, conflits) par-dessus le module courant, qui reste monté
    if (over && location.hash === over.returnHash) return closeOver();
    if (SCREENS.includes(id) && (current || over)) return openOver(id, h);
    if (over) closeOver(false);
    const tok = ++navSeq;
    paintModule(id);
    if (id !== current?.id) full = false; // le plein écran ne suit pas au module suivant
    if (isModule(id)) {
      const tb = tabOf(id);
      if (tb) lastInTab[tb.id] = id; // le toucher de l'onglet y reviendra
    }
    current?.life?.abort();
    if (current?.mod?.unmount) try {
      current.mod.unmount();
    } catch (e) {
      console.error(e);
    }
    current = null;
    for (const k in helpAnchors) delete helpAnchors[k]; // l'ancre du module démonté ne vaut plus
    closePane();
    // retour : ce module est-il ouvert par passage d'un autre ? (avant de noter l'écran courant)
    origin = originOf(id, h.query);
    paintBack();
    const view = $('fView');
    dropOverlays();
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
      if (tok !== navSeq) return; // une autre adresse est arrivée pendant le chargement : rien n'est écrit
      const meta = mod.meta || {};
      if (meta.id && meta.id !== entry.id) throw new Error(`meta.id ${meta.id} ≠ ${entry.id}`);
      const el = document.createElement('section');
      el.className = 'f-module';
      el.dataset.module = entry.id;
      el.dataset.landmark = entry.id;
      view.append(el);
      const life = new AbortController(); // démontage : suivis de travaux du lanceur arrêtés (ctx.launcher)
      current = {
        id: entry.id,
        mod,
        life
      };
      moduleFixed[entry.id] = meta.fixed === true;
      if (Array.isArray(meta.title)) moduleTitle[entry.id] = meta.title;
      paintFixed(entry.id);
      paintName(entry.id); // avant le montage : la page naît sans sa grande ligne de titre
      lastScreen = {
        id: entry.id,
        hash: location.hash
      };
      await mod.mount(el, ctxFor(entry, meta, h.query, el, false, life.signal));
      if (tok !== navSeq) return; // la navigation suivante a démonté ce module et vidé la vue
      moduleHelp(entry, meta, el, view);
      // vue double : volet demandé par l'adresse (#fuel?with=maps) ou gardé pour ce module (device/layout.json)
      paintPaneButton(entry);
      const want = paneWanted(entry, h.query);
      if (want && want !== entry.id && current?.id === entry.id) openPane(entry, want);
    } catch (e) {
      if (tok !== navSeq) return console.error(e); // erreur d'un montage abandonné : la vue n'est plus la sienne
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
    pane.life?.abort();
    try {
      pane.mod.unmount?.();
    } catch (e) {
      console.error(e);
    }
    dropOverlays(pane.el);
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
      el,
      life: new AbortController()
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
      }), sec, true, pane.life.signal));
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
  const SCREENS = ['help', 'roadmap', 'settings', 'device', 'conflicts', ...APP.screens.map(s => s.id)];
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

  // ---------------------------------------------------------------- publication sans lanceur (ctx.publish, INTEGRATION § 15.2)
  const publishReaders = {}; // adaptateur de chaque module qui publie : copies « reference » écartées après un commit
  /** Fichiers générés publiés dans le dépôt des données par l'accès GitHub de l'appareil, un commit par groupe
   *  [{ name, files: [{ path, text | blob }], removed: [path], message }] ; chemins sous meta.publish seulement, trigramme et
   *  accès requis ; jamais d'exception ; ensuite, les chemins publiés sont revalidés (FD.revalidate). */
  async function publishFor(id, meta, groups, {
    onProgress,
    signal,
    from = 0
  } = {}) {
    const allowed = [].concat(meta.publish || []).filter(x => typeof x === 'string' && x),
      list = [].concat(groups || []),
      paths = g => [...[].concat(g?.files || []).map(f => f?.path), ...[].concat(g?.removed || [])],
      ok = x => !!LC?.dataPathOf(x) && allowed.some(a => x === a || a.endsWith('/') && x.startsWith(a)),
      refused = (why, message, extra = {}) => ({
        ok: false,
        refused: why,
        message,
        groups: [],
        ...extra
      });
    if (!allowed.length) return refused('declaration', 'publish not declared (meta.publish)');
    const bad = list.flatMap(paths).find(x => !ok(x));
    if (bad !== undefined) return refused('path', 'path not declared', {
      path: String(bad)
    });
    if (!identity.trigram) return refused('trigram', 'no trigram on this device');
    const cfg = FD.github?.config?.();
    let tr = null;
    try {
      tr = cfg ? FD.github(cfg) : null;
    } catch {
      tr = null;
    }
    if (!tr?.publish) return refused('access', 'no GitHub access on this device');
    const r = await tr.publish(list.map(g => ({
      ...g,
      message: `${g.message || `Publication ${g.name || ''}`.trim()} (${identity.trigram})`
    })), {
      onProgress,
      signal,
      from
    });
    const ev = publishReaders[id] ||= FD.adapter({
      id: `frame-publish-${id}`,
      reads: allowed.map(prefix => ({
        prefix,
        policy: 'reference'
      }))
    });
    // les chemins publiés revalidés aussitôt (FD.revalidate) : l'appareil lit les nouvelles versions ; hors ligne, ses copies
    // sont écartées (relues à la prochaine lecture)
    const done = list.slice(from | 0, (from | 0) + (r.groups?.length || 0)).flatMap(paths);
    if (done.length && (await ev.revalidate(done)).offline)
      for (const x of done) await ev.evict(x).catch(() => 0);
    return r;
  }

  // ---------------------------------------------------------------- fin de cycle AIRAC (bloc d'état, INTEGRATION § 15.3)
  let publication = null; // aerodb.publication() : { base: { <zone>: { cycles } }, proc: { cycles } } ; null sans l'API
  /** Relit ce qui est publié (aerodb) ; redessine le bloc d'état si cela change. */
  async function readPublication() {
    if (typeof aerodb?.publication !== 'function') return;
    const p = await aerodb.publication().catch(() => null);
    if (JSON.stringify(p) === JSON.stringify(publication)) return;
    publication = p;
    paintStatus();
  }
  /** Nom AIRAC (« 2611 ») d'un cycle donné par sa date de début (« 2026-10-29 ») : rang du cycle dans son année. */
  function airacName(d) {
    const at = Date.parse(`${d}T00:00:00Z`),
      y = new Date(at).getUTCFullYear(),
      REF = Date.UTC(2024, 0, 25), // AIRAC 2401
      CYCLE = 28 * 864e5,
      first = REF + Math.ceil((Date.UTC(y, 0, 1) - REF) / CYCLE) * CYCLE;
    return `${String(y).slice(2)}${String(Math.round((at - first) / CYCLE) + 1).padStart(2, '0')}`;
  }
  /** Lignes de fin de cycle (SPEC du module Données § 6.3) : la base ou proc/ publiés pour un cycle plus ancien que celui en
   *  vigueur (à reconstruire), ou le cycle qui se termine dans 3 jours sans rien de publié pour le suivant ; calculées au
   *  moment du dessin. */
  function cycleItems() {
    if (!publication || !window.AeroDB?.airacCycles) return [];
    const cur = AeroDB.airacCycles(1)[0],
      next = new Date(Date.parse(`${cur}T00:00:00Z`) + 28 * 864e5).toISOString().slice(0, 10),
      soon = Date.parse(`${next}T00:00:00Z`) - Date.now() <= 3 * 864e5,
      // le module Données est dans l'application Maintenance : depuis une autre, la ligne y mène (même onglet)
      go = launcherHere && !launcherHere.lan && level >= 3 ? APP.modules.some(m => m.id === 'data') ? '#data' : '?app=maintenance#data' :
      '',
      // cycles publiés : un objet { 'AAAA-MM-JJ': {...} } (aerodb, frame/aerodb/SPEC.md « For the Données module ») ou une liste
      dates = x => Array.isArray(x) ? x : x && typeof x === 'object' ? Object.keys(x) : [],
      newest = list => list.filter(c => /^\d{4}-\d{2}-\d{2}$/.test(c)).sort().at(-1) || '',
      sets = [
        ['base', T.info.cycleBase, newest(Object.values(publication.base || {}).flatMap(z => dates(z?.cycles)))],
        ['proc', T.info.cycleProc, newest(dates(publication.proc?.cycles))]
      ];
    return sets.filter(([, , c]) => c && (c < cur || soon && c < next)).map(([k, s, c]) => ({
      k: `cycle-${k}`,
      text: c < cur ? t(T.info.cycleOld, {
        s: t(s),
        c: airacName(c),
        n: airacName(cur)
      }) : t(T.info.cycleEnds, {
        s: t(s),
        c: airacName(cur),
        d: infoDate(new Date(Date.parse(`${next}T00:00:00Z`) - 864e5).toISOString().slice(0, 10)),
        n: airacName(next)
      }),
      go,
      attn: true
    }));
  }

  // ---------------------------------------------------------------- clés d'adresse consommées (ctx.consume, INTEGRATION § 6.1)
  const FRAME_KEYS = new Set(['with', 'from', 'pane']); // clés du cadre (vue double, retour, volet) : jamais retirées par un module
  /** Valeurs des clés demandées (celles de query) ; elles sont retirées de l'adresse du module principal, si elle est la sienne,
   *  par un seul history.replaceState (pas de hashchange : le module n'est pas remonté) ; une requête consommée ne se rejoue
   *  donc ni au rechargement ni au retour. */
  function consumeQuery(id, query, keys, inPane) {
    const ks = keys.filter(k => typeof k === 'string' && k && !FRAME_KEYS.has(k)),
      got = {};
    for (const k of ks)
      if (Object.prototype.hasOwnProperty.call(query, k)) got[k] = query[k];
    if (inPane || !Object.keys(got).length) return got;
    const m = /^#([\w-]+)\?(.*)$/.exec(location.hash);
    if (!m || m[1] !== id) return got;
    const q = new URLSearchParams(m[2]);
    for (const k of ks) q.delete(k);
    const s = q.toString(),
      hash = `#${id}${s ? `?${s}` : ''}`;
    if (location.hash !== hash) {
      history.replaceState(history.state, '', hash);
      if (lastScreen?.id === id) lastScreen.hash = hash;
    }
    return got;
  }

  /** Contexte d'un module : son adaptateur de données (ses préfixes déclarés), aerodb, textes, notifications, questions,
   *  appels sortants, identité et compagnie en lecture seule, suite de l'adresse (query). */
  function ctxFor(entry, meta, query = Object.freeze({}), root = null, inPane = false, life = null) {
    let lcOf = null,
      lcMod = null;
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
      weather,
      // le lanceur du poste (INTEGRATION § 15.1) : ce que meta.launcher déclare ({ routes, read }) ; null sans lanceur, sur un
      // appareil appairé du réseau local (ses routes y sont refusées) ou sans déclaration
      get launcher() {
        const c = meta.launcher && !launcherHere?.lan ? launcherClient() : null;
        if (c && lcOf !== c) {
          lcOf = c;
          lcMod = c.forModule(meta.launcher, {
            life,
            author: () => identity.trigram || ''
          });
        }
        return c ? lcMod : null;
      },
      // publication de fichiers générés par l'accès GitHub de l'appareil (INTEGRATION § 15.2) : chemins de meta.publish
      publish: (groups, opts) => publishFor(entry.id, meta, groups, opts),
      get identity() {
        return identity;
      },
      get airline() {
        return airline;
      },
      get live() {
        return liveApi();
      },
      // niveau d'usage de l'appareil (1 Découverte, 2 Courant, 3 Complet), en lecture : un module y réserve ce qui engage la
      // compagnie
      get level() {
        return level;
      },
      query,
      // ctx.consume(clés) : les valeurs de ces clés de ctx.query, retirées de l'adresse en une seule écriture (replaceState, sans
      // remonter le module) ; with, from et pane restent au cadre ; dans un volet, l'adresse n'est pas la sienne : rien
      // n'est réécrit (INTEGRATION § 6.1)
      consume: (...keys) => consumeQuery(entry.id, query, keys.flat(), inPane),
      // l'onglet de la barre du bas qui groupe ce module (id de APP.tabs), null s'il n'en a pas
      tab: tabOf(entry.id)?.id || null,
      // module fixe seulement : la couche de superposition de sa carte (colonnes gauche et droite, boutons ronds ; le bouton
      // plein écran est ajouté par le cadre à la colonne de droite, sauf dans un volet) ; null sinon (INTEGRATION § 9.3)
      overlay: meta.fixed === true && root ? makeOverlay(root, !inPane).api : null,
      // vue double : { with } le module montré à côté (ou null) ; l'événement « frame-layout » (window) suit chaque changement
      // titre : vrai quand l'en-tête du téléphone porte le titre de ce module (meta.title) ; le module donne alors à sa grande
      // ligne de titre la classe f-sr (lecteurs d'écran seulement) ; « frame-titled » sur window suit chaque changement
      get titled() {
        return nameFor === entry.id && document.documentElement.classList.contains('f-titled');
      },
      get layout() {
        return Object.freeze({
          with: besideOf(entry.id)
        });
      },
      // ctx.help : open() ouvre le panneau d'aide déjà posé (l'aide est alors chargée), link() est une adresse
      help: Object.freeze({
        open: subject => window.SogHelp ? SogHelp.forModule(entry.id, $('fView')).open(subject) : false,
        link: (m = entry.id) => `#help?m=${encodeURIComponent(m)}`
      }),
      // ctx.helpAnchor(id | () => id | null) : l'ancre du chapitre du module pour l'écran ou le pas affiché ; le « ? » de
      // l'en-tête ouvre l'aide à ce paragraphe (sans ancre : au début du chapitre). Valable jusqu'au démontage.
      helpAnchor: a => void(helpAnchors[entry.id] = a || null)
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
    const tok = navSeq,
      at = location.hash;
    try {
      await need('settings');
    } catch (e) {
      return notify(t(T.loadErr, {
        m: 'settings',
        e: e.message || e
      }), 'err');
    }
    if (tok !== navSeq || location.hash !== at || !view.isConnected) return; // écran quitté pendant le chargement
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
      launcherRequest, // routes du lanceur (kit.js, setup) : par le client du cadre (INTEGRATION § 15)
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
      // bloc « État » de tête (lignes de l'ancien pop-up « i ») : html() donne la carte à la valeur du moment, bind(carte) la
      // rend vivante (voir statusBlock, bindStatus)
      status: Object.freeze({
        html: statusBlock,
        bind: bindStatus
      }),
      weatherKey,
      ivao,
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
        // un appareil (son id) ou tous ceux du réseau local : la révocation de la liste unique (R-C2), puis l'état
        forget: async id => {
          const r = await launcherRequest('devices/revoke', {
            json: id ? {
              id
            } : {
              channel: 'lan'
            }
          });
          if (!r || r.status >= 400) throw new Error(`devices/revoke ${r ? r.status : 'offline'}`);
          return lanCall();
        }
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
      // carte Design : hors ordinateur, pas de design d'ordinateur (desktop) ; applied = design posé (standard quand le choix
      // mémorisé est un design d'ordinateur et que l'appareil n'en est pas un)
      designs: () => DESIGNS.filter(d => !d.desktop || document.documentElement.classList.contains('f-desk')),
      design: () => ({
        ...design,
        applied: appliedDesign()
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

  // ---------------------------------------------------------------- écrans de service (APP.screens, INTEGRATION § 13)
  const screenData = {}; // adaptateur de données de chaque écran de service, fait à sa première ouverture
  /** Écran de service s (une entrée d'APP.screens) : ses scripts chargés à la première ouverture, le niveau d'usage vérifié,
   *  puis son dessin (window.SogScreens[id].screen) avec son contexte ; rien si l'adresse a changé entre-temps. Le cadre
   *  ne connaît que la déclaration : aucun nom de service ici. */
  async function renderScreen(s, view) {
    const tok = navSeq,
      at = location.hash;
    try {
      for (const p of s.scripts || []) await script(p);
    } catch (e) {
      return notify(t(T.loadErr, {
        m: s.id,
        e: e.message || e
      }), 'err');
    }
    if (tok !== navSeq || location.hash !== at || !view.isConnected) return; // écran quitté pendant le chargement
    if ((s.level || 1) > level) return void(view.innerHTML = `<p class="f-card f-muted" data-screen-level="${esc(s.id)}">${esc(t(T.screenLevel))}</p>`);
    // ses routes du lanceur : toutes publiées par celui de ce poste (sa table, lue une fois), sinon un lanceur plus ancien,
    // dit ici plutôt qu'une « route inconnue » à chaque geste ; un lanceur sans table (plus ancien encore) : rien de vérifié
    if (s.launcher?.routes?.length && launcherHere && !launcherHere.lan) {
      const have = await launcherRoutes();
      if (tok !== navSeq || location.hash !== at || !view.isConnected) return;
      if (have && s.launcher.routes.some(r => !published(r, have))) return void(view.innerHTML =
        `<p class="f-card f-msg" data-kind="warn" data-screen-old="${esc(s.id)}">${esc(t(T.screenOld))}</p>`);
    }
    const impl = window.SogScreens?.[s.id];
    if (typeof impl?.screen !== 'function') return notify(t(T.loadErr, {
      m: s.id,
      e: 'SogScreens'
    }), 'err');
    screenData[s.id] ||= FD.adapter({
      id: `screen-${s.id}`,
      reads: s.reads || [],
      writes: s.writes || []
    });
    return impl.screen(view, {
      t,
      lang,
      notify,
      ask,
      data: screenData[s.id],
      aerodb,
      level: () => level,
      launcher: () => launcherHere,
      // routes du lanceur déclarées par l'écran (launcher: { routes }), par le même client que les modules ; null sans lanceur
      // sur ce poste (ou depuis un appareil appairé)
      ...(s.launcher ? {
        routes: () => {
          const c = launcherHere && !launcherHere.lan ? launcherClient() : null;
          return c ? c.forModule(s.launcher, {
            author: () => identity.trigram || ''
          }) : null;
        }
      } : {}),
      // le transport GitHub de l'appareil (head, tree, commit), seulement si la déclaration le demande ; jamais le jeton
      ...(s.github ? {
        github: () => FD.github.config() ? FD.github() : null,
        githubInfo: () => {
          const c = FD.github.config();
          return c ? {
            repo: c.repo,
            branch: c.branch || 'main'
          } : null;
        }
      } : {})
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
  // 'frame'), au plus une fois par 10 s et seulement si la position a bougé (30 m, 50 ft) ; aucune synchronisation forcée
  // (la file locale et la synchronisation habituelle suffisent). La trace volée (frame/lib/trail.js : un point par NM ou
  // par minute, virages gardés, 500 points au plus) reste sur l'appareil : device/trail.json, jamais synchronisée ni dans
  // une sauvegarde (décision de l'utilisateur du 30 oct.), lue par les modules avec ctx.live.trail().
  const TRAIL_DOC = 'device/trail.json';
  let trailWatch = null,
    liveTrail = {
      from: '',
      trail: []
    };
  /** Trace de l'appareil relue (document device/trail.json) : { from: started.at, trail } ; vide si illisible. */
  const trailFrom = doc => doc && typeof doc.from === 'string' && Array.isArray(doc.trail) ? {
    from: doc.from,
    trail: doc.trail
  } : {
    from: '',
    trail: []
  };
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
    paintStatus(); // la pastille du ⚙ et le bloc d'état suivent le vol courant
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
      const r = await launcherRequest('sim/position'),
        p = r?.status === 200 ? r.body : null;
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
    // fusion commune du vol courant (frame/lib/current_flight.js) : relu juste avant, seul progress.actual remplacé (la
    // position seule : une trace d'avant le 30 oct. y est retirée) ; la trace de l'appareil continue seulement pour ce
    // départ (from = started.at, à l'identique : deux écritures d'une même heure, en Z et en +02:00, ne se comparent pas
    // comme des chaînes), et reprend une fois celle qu'un enregistrement d'avant portait pour ce même départ
    const [CF, TR] = await Promise.all([import(new URL('frame/lib/current_flight.js', ROOT).href), import(new URL('frame/lib/trail.js',
        ROOT).href)]),
      prev = cur.progress?.actual,
      base = liveTrail.from === cur.started.at ? liveTrail.trail : prev?.trailFrom === cur.started.at && Array.isArray(prev.trail) ?
      prev.trail : [];
    liveTrail = {
      from: cur.started.at,
      trail: TR.next(base, a, cur.started.at)
    };
    await own.put(TRAIL_DOC, {
      ...liveTrail,
      updated_at: a.at
    });
    await liveData.put(flightPath, CF.merge(cur, {
      progress: {
        actual: {
          ...a
        }
      }
    }, {
      progressKeys: ['actual'],
      by: 'frame'
    }), {
      quiet: true // toutes les 10 s : pas un commit à chaque fois, le passage de fond l'emporte
    });
  }
  /** ctx.live : état, source, dernière position, trace volée de l'appareil, et le GPS de l'appareil (activé par un geste,
   *  gardé sur l'appareil). */
  function liveApi() {
    return {
      status: !live.active ? 'off' : live.source ? 'tracking' : 'waiting',
      source: live.source,
      last: live.last,
      // trace du vol en cours, sur cet appareil seulement : { from: started.at, trail: [[lat, lon, altFt, s], …] } ou null
      trail: () => liveTrail.from ? {
        from: liveTrail.from,
        trail: liveTrail.trail.slice()
      } : null,
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
    const r = await launcherRequest('lan', body ? {
      json: body
    } : {});
    if (!r || r.status >= 400) throw new Error(`lan ${r ? r.status : 'offline'}`);
    return r.body;
  }
  /** Pastille de l'en-tête pendant un vol : la source (X-Plane, Little Navmap, GPS, IVAO, VATSIM, — en attente) ;
   *  bascule du GPS de l'appareil. */
  function paintLive() {
    paintStatus(); // la position réelle est une ligne du bloc d'état (téléphone)
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
    headIcon('fHelp', 'help');
    headIcon('fDevice', 'settings');
    document.title = `${t(APP.name)} — SOG`;
    $('fName').textContent = t(APP.name);
    // identité de l'application (icône dans sa teinte, posée à la source) et sélecteur d'application
    $('fAppIco').style.color = APP.tint || '';
    $('fAppIco').innerHTML = icon(APP.icon);
    $('fApp').title = t(T.appSwitch);
    $('fApp').onclick = toggleAppPop;
    paintFavicon();
    paintStatus();
    $('fHelp').setAttribute('aria-label', t(T.help));
    $('fHelp').title = t(T.help);
    $('fHelp').onclick = openHelp;
    $('fDevice').onclick = () => {
      if (over && ['settings', 'device'].includes(over.id)) return leaveOver();
      location.hash = '#settings';
    };
    // Échap (INTEGRATION § 9.4), dans l'ordre : ce que le module a ouvert (il prend la touche : preventDefault), le popover du
    // groupe, l'écran du cadre ouvert par-dessus, le plein écran ; une fenêtre de question ouverte la garde pour elle. Écouté
    // sur window, donc après les écouteurs du module (sur son élément ou sur document) : une touche déjà prise est ignorée
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.f-modal')) return;
      if (tabPop) closeTabPop(true);
      else if (over) leaveOver();
      else if (full) setFull(false);
      else return;
      e.preventDefault();
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
    // (second toucher sur l'onglet choisi : le popover du groupe, ou rien ; il remplace la navigation, qui perdrait la suite
    // de l'adresse)
    $('fTabs').addEventListener('click', e => {
      const a = e.target.closest('a'),
        tb = a && APP.tabs.find(x => x.id === a.dataset.tab);
      if (!tb || a.getAttribute('aria-current') !== 'page' || over) return;
      e.preventDefault();
      if (tb.modules) toggleTabPop(a, tb);
    });
    for (const nav of [$('fMenu'), $('fTabs')]) nav.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && !e.defaultPrevented && a.getAttribute('href') !== location.hash) viaMenu = true;
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
    LC = await import(new URL('frame/lib/launcher.js?v=0', ROOT).href).catch(e => (console.warn('launcher', e), null));
    launcherHere = await FD.launcher.detect();
    await timeP; // les heures du cadre (synchronisation, pastilles) en UTC dès leur premier dessin
    await loadDevice();
    await takeIvaoReturn(); // retour de l'OpenID d'IVAO : avant le premier routage (l'adresse est remplacée)
    // (accès réglé ou coupé dans un autre onglet : device/keys.json change et own.watch('device/'), plus bas, rebranche ici)
    // demande au navigateur de ne pas effacer le stockage du site (Safari le fait pour un site peu visité), au premier geste de
    // l'utilisateur et non au chargement : une demande de stockage pendant le démarrage décale les cartes (essai D7)
    document.addEventListener('pointerdown', () => navigator.storage?.persist?.().catch(() => {}), {
      once: true,
      passive: true
    });
    // aerodb : un service, une instance, lecteur = la couche de données (frame/aerodb/INTEGRATION.md § 3)
    try {
      // préfixes d'aerodb (base SIA, types, registre des aéronefs : fiches, flotte, référence) donnés par aerodb lui-même
      aerodb = window.AeroDB ? AeroDB.create({
        reader: FD.adapter(AeroDB.declaration()),
        access: () => dataAccess().set,
        // le lanceur du poste (fiches .lnmperf) : par le client du cadre, jamais par un fetch d'aerodb
        launcher: {
          request: launcherRequest,
          info: () => launcherHere,
          // travail long du lanceur (fetchProcedures : regen/job) : par le client du cadre, routes de la déclaration d'aerodb
          // (AeroDB.declaration().launcher) ; null sans lanceur ou sur un appareil appairé (INTEGRATION § 15.1)
          job: (route, body, opts) => (launcherHere?.lan ? null : launcherClient()?.forModule(AeroDB.declaration().launcher || {
            routes: []
          }, {
            author: () => identity.trigram || ''
          }).job(route, body, opts)) ?? Promise.resolve(null)
        }
      }) : null;
      aerodb?.on('state', syncBase);
      aerodb?.on('change', syncBase);
      aerodb?.on('change', readPublication);
      readPublication();
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
    infoData.watch('cache/', paths => {
      if (paths.some(p => /^cache\/[\w-]+\/status\.json$/.test(p))) readModuleLines();
      if (paths.includes(PENDING_REPORTS)) readPending();
      if (paths.includes(WEATHER_LEDGER)) readWeather();
    });
    readWeather();
    readModuleLines();
    readPending();
    window.addEventListener('online', async () => {
      FD.status().then(paintSync);
      // le réseau revient : une base lue sans réponse (hors ligne, au lancement) ou vide est relue à la prochaine question
      aerodb?.state().then(b => ['offline', 'unpublished'].includes(b.state) && aerodb.refresh()).catch(() => {});
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
    // orientation verrouillée en portrait en appli installée (V3_SPECIFICATION.md § 7.1, 24 oct 2026) : effective seulement
    // avec le manifeste « orientation » ou la coque Capacitor ; Safari ne l'honore pas, d'où la disposition en paysage (f-land, au
    // début de ce fichier) ; en page de navigateur l'appel échoue et c'est attendu
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
