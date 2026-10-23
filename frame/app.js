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
  //   · transport choisi d'après les usages de l'appareil (document local device/usages.json, écrit par l'écran des
  //     réglages, frame/settings/settings.js) : aucun usage d'échange coché → local seul ; sinon le
  //     lanceur si la page en est servie, sinon GitHub s'il est réglé, sinon local ;
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
      icon: '⛽'
    }, {
      id: 'maps',
      label: ['Carte', 'Map', 'Karte', 'Mapa'],
      icon: '⌖'
    }, {
      id: 'report',
      label: ['Compte rendu', 'Report', 'Bericht', 'Informe'],
      icon: '✎'
    }, {
      id: 'flightlog',
      label: ['Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'],
      icon: '☰'
    }, {
      id: 'website',
      label: ['Site', 'Website', 'Website', 'Sitio'],
      icon: '⌂'
    }, {
      id: 'hello',
      label: ['Essayer', 'Try', 'Ausprobieren', 'Probar'],
      icon: '◎'
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
  const RELAY = ['www.simbrief.com', 'api.ivao.aero', 'api.vatsim.net', 'data.vatsim.net', 'my.vatsim.net', 'aviationweather.gov'],
    DIRECT = ['www.simbrief.com', 'api.ivao.aero', 'aviationweather.gov'];
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
  // compagnie : airline/settings.json du dépôt des données (fichier « reference », écrit par website / settings) ; aucune
  // adresse dans le code : nom, site et pages viennent de ce fichier, {} en son absence
  const AIRLINE = 'airline/settings.json';
  const airlineData = FD.adapter({
    id: 'frame-airline',
    reads: [{
      prefix: 'airline/',
      policy: 'reference'
    }],
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
      policy: 'reference',
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
  /** Transport des usages cochés : aucun échange → local ; lanceur si la page en est servie ; GitHub s'il est réglé. */
  async function chooseTransport() {
    const exchange = usages.devices || usages.users;
    if (!exchange && !usages.backend) return FD.transports.local();
    const L = launcherHere;
    if (L?.data) return FD.launcher({
      exchange: !!exchange && L.dataGit,
      author: () => identity.trigram || ''
    });
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
    const key = JSON.stringify([state, label, title]);
    if (key === lastSyncState) return;
    lastSyncState = key;
    const b = $('fSync');
    b.dataset.state = state;
    b.title = title;
    b.querySelector('.f-lbl').textContent = label;
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
      ul.innerHTML = list.map(m => `<li><a href="#${esc(m.id)}" data-id="${esc(m.id)}"><span aria-hidden="true">${esc(m.icon || '•')}</span>${esc(t(m.label))}</a></li>`).join('');
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
    document.body.classList.remove('f-nav-open');
    $('fBurger').setAttribute('aria-expanded', 'false');
    if (current?.mod?.unmount) try {
      current.mod.unmount();
    } catch (e) {
      console.error(e);
    }
    current = null;
    const view = $('fView');
    view.replaceChildren();
    renderMenu(id);
    if (id === 'help') return window.SogHelp?.screen(view, helpCtx(), h.query);
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
      await mod.mount(el, ctxFor(entry, meta, h.query));
    } catch (e) {
      view.innerHTML = `<p class="f-card">${esc(t(T.loadErr, { m: entry.id, e: e.message || e }))}</p>`;
      notify(t(T.loadErr, {
        m: entry.id,
        e: e.message || e
      }), 'err');
    }
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
      helpPanel: () => window.SogHelp ? SogHelp.panel('settings', helpCtx()) : Promise.resolve(null)
    });
  }

  // ---------------------------------------------------------------- démarrage
  let aerodb = null,
    configured = null; // transport branché (missing : usages d'échange sans moyen d'échange ici)
  async function boot() {
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
      const at = current?.id || (['settings', 'device'].includes(parseHash().id) ? 'settings' : '');
      location.hash = `#help${at ? `?m=${encodeURIComponent(at)}` : ''}`;
    };
    $('fDevice').onclick = () => {
      location.hash = '#settings';
    };
    $('fSync').onclick = async () => {
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
      aerodb = window.AeroDB ? AeroDB.create({
        reader: FD.adapter({
          id: 'aerodb',
          reads: [{
            prefix: 'sia/base/',
            policy: 'reference'
          }, {
            prefix: 'AircraftDB/',
            policy: 'reference'
          }],
          writes: []
        })
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
    cutAccess
  };
  boot();
})();
