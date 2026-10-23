(() => {
  'use strict';
  // V3 frame — squelette d'une application (frame/SPEC.md § 3, frame/INTEGRATION.md) : l'appli Pilote.
  //   · navigation : un verbe court par module (sept au plus), colonne à gauche sur écran, tiroir sur téléphone ;
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
      id: 'hello',
      label: ['Essayer', 'Try', 'Ausprobieren', 'Probar'],
      icon: 'target'
    }]
  };

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
    menu: ['Menu', 'Menu', 'Menü', 'Menú'],
    device: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'],
    help: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    back: ['Revenir à {m}', 'Back to {m}', 'Zurück zu {m}', 'Volver a {m}'],
    paneOpen: ['Afficher {m} à côté', 'Show {m} alongside', '{m} daneben anzeigen', 'Mostrar {m} al lado'],
    paneClose: ['Fermer le volet {m}', 'Close the {m} pane', 'Bereich {m} schließen', 'Cerrar el panel {m}'],
    loadErr: ['Module « {m} » impossible à charger : {e}', 'Module “{m}” could not be loaded: {e}',
      'Modul „{m}“ konnte nicht geladen werden: {e}', 'No se pudo cargar el módulo «{m}»: {e}'
    ]
  };
  /** Durée lisible depuis une date ISO (« 4 min », « 2 h », « 3 j »). */
  const ago = iso => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1e3);
    return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} j`;
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
  function modal(html, onReady) {
    return new Promise(res => {
      const m = document.createElement('div');
      m.className = 'f-modal';
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
    DIRECT = ['www.simbrief.com', 'api.ivao.aero', 'metar.vatsim.net', 'avwx.rest', 'api.open-meteo.com'];
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
  /** Relit la compagnie (attendue au plus ms millisecondes la première fois : un module monté ensuite l'a déjà). */
  async function loadAirline(ms = 2500) {
    const v = await Promise.race([airlineData.get(AIRLINE, {
      wait: true
    }).catch(() => null), new Promise(res => setTimeout(() => res(undefined), ms))]);
    if (v !== undefined) airline = airlineOf(v);
  }
  /** Relit l'identité et les usages de l'appareil, puis branche le transport qui leur correspond. */
  async function loadDevice() {
    identity = Object.freeze({
      ...((await own.get('device/identity.json')) || {})
    });
    usages = (await own.get('device/usages.json')) || {};
    level = levelFrom((await own.get('device/level.json'))?.level);
    applyDesign(await own.get('device/design.json'));
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
    const meta = document.querySelector('meta[name="theme-color"]'),
      bar = getComputedStyle(h).getPropertyValue('--sog-surface').trim();
    if (meta && bar && meta.content !== bar) meta.content = bar;
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
    const title = t(T.sync.title, {
      tr: s.transport,
      last: s.lastSync ? new Date(s.lastSync).toLocaleString() : t(T.sync.never),
      n: s.pending,
      e: s.lastError ? ` — ${s.lastError}` : ''
    });
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
      e: r.error
    }), 'err');
    else notify(t(T.sync.done, {
      p: r.pulled.length,
      s: r.pushed
    }), 'ok');
    return r;
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
  const moduleLevel = {};
  let levelsP = null; // relevé des niveaux en cours (readLevels)
  let menuKey = '',
    menuActive = '';
  /** Modules du menu au niveau de l'appareil (meta.level ≤ niveau) ; un module au niveau encore inconnu est montré. */
  const visibleModules = () => APP.modules.filter(m => (moduleLevel[m.id] ?? 1) <= level);
  /** Niveau déclaré par chaque module (meta.level), puis menu redessiné ; module illisible : niveau 1. */
  async function readLevels() {
    await Promise.all(APP.modules.map(async m => {
      try {
        moduleLevel[m.id] = levelFrom((await import(new URL(`modules/${m.id}/module.js`, ROOT).href)).meta?.level ?? 1);
      } catch {
        moduleLevel[m.id] = 1;
      }
    }));
    renderMenu();
  }
  /** Menu des verbes du niveau de l'appareil (redessiné seulement quand la liste change), entrée courante marquée. */
  function renderMenu(active = menuActive) {
    menuActive = active;
    const ul = $('fMenu'),
      list = visibleModules(),
      key = list.map(m => m.id).join(',');
    if (key !== menuKey || !ul.children.length) {
      menuKey = key;
      ul.innerHTML = list.map(m => `<li><a href="#${esc(m.id)}" data-id="${esc(m.id)}">${icon(m.icon)}${esc(t(m.label))}</a></li>`).join('');
    }
    for (const a of ul.querySelectorAll('a')) {
      const on = a.dataset.id === active;
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
    document.body.classList.remove('f-nav-open');
    $('fBurger').setAttribute('aria-expanded', 'false');
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
    renderMenu(id);
    paintPaneButton(null);
    if (id === 'help') return window.SogHelp?.screen(view, helpCtx(), h.query);
    if (id === 'roadmap') return window.SogRoadmap?.screen(view, helpCtx());
    if (ROUTES[id]) return ROUTES[id](view);
    const entry = APP.modules.find(m => m.id === id) || APP.modules[0];
    if (!entry) return renderSettings(view);
    try {
      const mod = await import(new URL(`modules/${entry.id}/module.js`, ROOT).href);
      const meta = mod.meta || {};
      if (meta.id && meta.id !== entry.id) throw new Error(`meta.id ${meta.id} ≠ ${entry.id}`);
      const el = document.createElement('section');
      el.className = 'f-module';
      el.dataset.module = entry.id;
      view.append(el);
      current = {
        id: entry.id,
        mod
      };
      // aide en page : panneau replié « Comment s'en servir » tiré du chapitre du module (frame/help), posé avant lui
      if (window.SogHelp && meta.help !== false) SogHelp.panel(entry.id, helpCtx()).then(p => p && el.isConnected && view.insertBefore(
          p, el))
        .catch(e => console.warn('help', e));
      // première ouverture : carte d'accueil des tutoriels, en tête, jusqu'à sa fermeture ou à l'ouverture d'un tutoriel
      window.SogHelp?.welcome?.(helpCtx()).then(w => w && el.isConnected && view.prepend(w)).catch(e => console.warn('help', e));
      lastScreen = {
        id: entry.id,
        hash: location.hash
      };
      await mod.mount(el, ctxFor(entry, meta, h.query));
      // vue double : volet demandé par l'adresse (#fuel?with=maps) ou gardé pour ce module (device/layout.json)
      paintPaneButton(entry);
      const want = paneWanted(entry, h.query);
      if (want && want !== entry.id && current?.id === entry.id) openPane(entry, want);
    } catch (e) {
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
  }
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
    try {
      const mod = await import(new URL(`modules/${p.id}/module.js`, ROOT).href);
      if (pane?.el !== el) return; // fermé entre-temps
      pane.mod = mod;
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
    document.body.classList.remove('f-nav-open');
    $('fBurger').setAttribute('aria-expanded', 'false');
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
    renderMenu(current?.id || '');
    paintBack();
    paintToggles();
    paintPaneButton(null);
    scrollTo(0, 0);
    if (id === 'help') return window.SogHelp?.screen(scr, helpCtx(), h.query);
    if (id === 'roadmap') return window.SogRoadmap?.screen(scr, helpCtx());
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
    if (o.sig !== mountSig()) return route(); // réglages changés : le module est remonté avec eux
    renderMenu(current?.id || '');
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
      query,
      help: window.SogHelp ? SogHelp.forModule(entry.id, $('fView')) : Object.freeze({
        open: () => false,
        link: () => '#help'
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
    view.innerHTML = `<h1>${esc(t(C.title))}</h1><p class="f-muted">${esc(t(C.intro))}</p><label class="f-check"><input type="checkbox" data-all ${all ? 'checked' : ''}>${esc(t(C.all))}</label>${list.length ? list.map(c => `<div class="f-card" data-id="${c.id}"><b>${esc(c.path)}</b> <span class="f-muted">${esc(new Date(c.at).toLocaleString())}</span><details><summary>${esc(t(c.side === 'local' ? C.lostLocal : C.lostRemote))}</summary><pre>${esc(c.lost)}</pre></details><details><summary>${esc(t(C.kept))}</summary><pre>${esc(c.kept)}</pre></details><div class="f-row">${c.restored ? '' : `<button type="button" class="primary" data-restore>${esc(t(C.restore))}</button>`}${c.seen ? '' : `<button type="button" data-seen>${esc(t(C.seen))}</button>`}</div></div>`).join('') : `<p class="f-card">${esc(t(C.none))}</p>`}`;
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
  function renderSettings(view) {
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
      // après un clone ou une reprise de data/ par le lanceur : relevé de nouveau, transport rebranché
      redetect: async () => {
        launcherHere = await FD.launcher.detect();
        await loadDevice();
      },
      helpPanel: () => window.SogHelp ? SogHelp.panel('settings', helpCtx()) : Promise.resolve(null),
      // carte Diagnostic : état de la couche de données et de la base aéronautique, à copier pour un rapport
      async diagnostic() {
        const d = await FD.diagnostic(),
          a = await aerodb?.status?.().catch(e => ({
            error: e?.message || String(e)
          }));
        return {
          ...d,
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
    headIcon('fBurger', 'menu');
    headIcon('fHelp', 'help');
    headIcon('fDevice', 'settings');
    document.title = `${t(APP.name)} — SOG`;
    $('fName').textContent = t(APP.name);
    $('fBurger').setAttribute('aria-label', t(T.menu));
    $('fDevice').setAttribute('aria-label', t(T.device));
    $('fDevice').title = t(T.device);
    $('fBurger').onclick = () => {
      const open = document.body.classList.toggle('f-nav-open');
      $('fBurger').setAttribute('aria-expanded', String(open));
    };
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
    $('fBack').onclick = () => {
      const o = origin;
      if (!o) return;
      viaMenu = true; // un retour n'appelle pas de retour vers l'écran quitté
      if (o.back && history.length > 1) history.back();
      else location.hash = o.hash;
    };
    $('fMenu').addEventListener('click', e => {
      if (e.target.closest('a')) viaMenu = true;
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
    $('fSync').onclick = async () => {
      if (over?.id === 'conflicts') return leaveOver();
      const s = await FD.status();
      if (s.conflicts) location.hash = '#conflicts';
      else syncNow();
    };
    launcherHere = await FD.launcher.detect();
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
    await loadAirline();
    airlineData.watch('airline/', () => loadAirline(1e4));
    setInterval(() => FD.status().then(paintSync), 30e3); // « il y a 4 min » vieillit
    window.addEventListener('hashchange', route);
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
          run: () => location.reload()
        }
      });
    });
    navigator.serviceWorker.register(new URL('frame/sw.js', ROOT), {
      scope: new URL('frame/', ROOT).pathname
    }).then(() => navigator.serviceWorker.ready).then(async reg => reg.active?.postMessage({
      type: 'precache',
      urls: await moduleFiles()
    })).catch(e => console.warn('service worker', e));
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
    }
  };
  boot();
})();
