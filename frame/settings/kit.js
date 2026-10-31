(() => {
  'use strict';
  // V3 — Réglages : aides partagées par les fichiers de l'écran (frame/settings/SPEC.md ; ordre de chargement :
  // INTEGRATION.md § 1, kit.js le premier) — racine de la suite, échappement, horodatage, textes communs
  // (window.SogSettingsT, que chaque fichier complète), appels au lanceur, copie, document de la compagnie, comparaison
  // d'adresses de dépôt, mode d'emploi du jeton en HTML.
  const ROOT = new URL('../../', document.currentScript.src).href; // racine de la suite (routes /__setup du lanceur)
  /** Échappement HTML d'un texte (attributs compris). */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  /** Horodatage ISO de maintenant. */
  const now = () => new Date().toISOString();
  const T = window.SogSettingsT ||= {}; // textes [fr, en, de, es] de l'écran, complétés par chaque fichier

  // textes lus par plusieurs fichiers des Réglages, une ligne par sens (SPEC § 8) ; chaque fichier ajoute les siens
  Object.assign(T, {
    // le jeton GitLab dit ce qu'il est (§ 10.36) : « Rejoindre la compagnie » et la carte Accès
    tokenPersonal: ['Jeton personnel : il vaut pour tous vos projets ; préférez un jeton de projet demandé à l’administrateur.',
      'Personal token: it works for all your projects; prefer a project token asked from the administrator.',
      'Persönliches Token: Es gilt für alle Ihre Projekte; bevorzugen Sie ein Projekt-Token vom Administrator.',
      'Token personal: vale para todos sus proyectos; prefiera un token de proyecto pedido al administrador.'
    ],
    tokenContinue: ['Continuer quand même ?', 'Continue anyway?', 'Trotzdem fortfahren?', '¿Continuar de todos modos?'],
    tokenExpiry: ['Jeton sans expiration (ou à plus d’un an) : demandez-en un de 90 jours.',
      'Token without an expiry (or more than a year away): ask for one of 90 days.',
      'Token ohne Ablaufdatum (oder mit mehr als einem Jahr): Fordern Sie eines mit 90 Tagen an.',
      'Token sin caducidad (o a más de un año): pida uno de 90 días.'
    ],
    tokenScopes: ['Ce jeton a plus de droits que nécessaire ({s}) : demandez-en un limité à api.',
      'This token has more rights than needed ({s}): ask for one limited to api.',
      'Dieses Token hat mehr Rechte als nötig ({s}): Fordern Sie eines an, das auf api beschränkt ist.',
      'Este token tiene más derechos de los necesarios ({s}): pida uno limitado a api.'
    ],
    // de access.js
    access: ['Accès aux données', 'Data access', 'Datenzugang', 'Acceso a los datos'],
    // de settings.js
    save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
    saved: ['Enregistré.', 'Saved.', 'Gespeichert.', 'Guardado.'],
    pair: ['{k} :', '{k}:', '{k}:', '{k}:'],
    ivao: ['Compte IVAO', 'IVAO account', 'IVAO-Konto', 'Cuenta IVAO'],
    ivaoVid: ['VID IVAO', 'IVAO VID', 'IVAO-VID', 'VID IVAO'], // le champ du numéro de compte (identité, Rejoindre)
    vatsim: ['CID VATSIM', 'VATSIM CID', 'VATSIM-CID', 'CID VATSIM'],
    badTrigram: ['Trigramme : 2 à 5 lettres ou chiffres.', 'Trigram: 2 to 5 letters or digits.',
      'Kürzel: 2 bis 5 Buchstaben oder Ziffern.',
      'Trigrama: de 2 a 5 letras o cifras.'
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
    copyShown: ['Copie impossible ici : le texte est sélectionné, copiez-le vous-même.',
      'Cannot copy here: the text is selected, copy it yourself.',
      'Kopieren hier nicht möglich: Der Text ist markiert, kopieren Sie ihn selbst.',
      'No se puede copiar aquí: el texto está seleccionado, cópielo usted mismo.'
    ],
    providerUnknown: ['Fournisseur inconnu : github ou gitlab', 'Unknown provider: github or gitlab',
      'Unbekannter Anbieter: github oder gitlab', 'Proveedor desconocido: github o gitlab'
    ],
    cfgBadFile: ['Configuration illisible : rien n’est changé.', 'Unreadable configuration: nothing is changed.',
      'Unlesbare Konfiguration: Nichts wird geändert.',
      'Configuración ilegible: no se cambia nada.'
    ],
    test: ['Tester', 'Test', 'Testen', 'Probar'],
    testOffline: ['Hors ligne : impossible de tester maintenant.', 'Offline: cannot test now.', 'Offline: jetzt kein Test möglich.',
      'Sin conexión: imposible probar ahora.'
    ],
    zones: ['Bases aéronautiques', 'Aeronautical bases', 'Luftfahrtdaten', 'Bases aeronáuticas'],
    storage: ['Stockage du navigateur', 'Browser storage', 'Browser-Speicher', 'Almacenamiento del navegador'],
    erase: ['Effacer', 'Erase', 'Löschen', 'Borrar'],
    // de launcher.js
    lanConsole: ['code de console', 'console code', 'Konsolencode', 'código de consola'],
    lanDevices: ['Appareils appairés', 'Paired devices', 'Gekoppelte Geräte', 'Dispositivos vinculados'],
    providerTokens: ['Jetons des pilotes', 'Pilots’ tokens', 'Token der Piloten', 'Tokens de los pilotos'],
    // de diagnostic.js
    copy: ['Copier', 'Copy', 'Kopieren', 'Copiar'],
    // de admin.js
    cfgPilot: ['Trigramme du pilote', 'Pilot’s trigram', 'Kürzel des Piloten', 'Trigrama del piloto'],
    // de settings.js
    offlineData: ['Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'],
    // de pilot_tokens.js
    used: ['dernier usage {d}', 'last used {d}', 'zuletzt genutzt {d}', 'último uso {d}'],
    // de devices.js
    expires: ['expire le {d}', 'expires on {d}', 'läuft ab am {d}', 'caduca el {d}'],
    revoke: ['Révoquer', 'Revoke', 'Widerrufen', 'Revocar']
  });

  // appels au lanceur : par le client du cadre (frame/lib/launcher.js, frame/INTEGRATION.md § 15), donné au premier
  // dessin de l'écran (bind) ; plus aucun fetch des Réglages vers le lanceur
  let request = null;
  /** Le client du cadre (contexte des Réglages : launcherRequest). */
  const bind = fn => void(request = typeof fn === 'function' ? fn : request);
  /** Appel d'une route du lanceur (/__setup/<route>) ; GET sans corps, POST avec ; son JSON, ou null en cas d'échec. */
  async function setup(route, body) {
    const r = request ? await request(route, body ? {
      json: body
    } : {}) : null;
    return r ? r.body : null;
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

  /** Adresse de dépôt comparable (sans .git ni barre finale, hôte en minuscules). */
  const sameRepo = (a, b) => {
    /** Forme normalisée d'une adresse. */
    const n = u => String(u || '').trim().replace(/\/+$/, '').replace(/\.git$/, '').replace(/^(\w+:\/\/[^/]+)/, h => h.toLowerCase());
    return !!a && !!b && n(a) === n(b);
  };
  /** Refus du lanceur parce qu'une fenêtre est déjà ouverte (champ confirm, sinon le texte du message) ? */
  const confirmOpen = r => !!r && !r.ok && (r.confirm === 'open' || /déjà ouverte|already open/i.test(r.message || ''));
  const AIRLINE = 'airline/settings.json';
  let airlineA = null;
  /** Document de la compagnie (airline/settings.json du dépôt des données) : lecture, et écriture par l'import. */
  const airlineDoc = FD => airlineA ||= FD.adapter({
    id: 'frame-settings-airline',
    reads: ['airline/'],
    writes: [AIRLINE]
  });
  /** Mode d'emploi reçu → HTML en texte seul : une ligne par paragraphe, adresses https en liens. */
  const howtoHtml = text => String(text).split(/\n+/).filter(Boolean).map(l => `<p>${esc(l).replace(/https:\/\/(?:[^\s<&]|&#38;)+[^\s<&.,;:)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`).join('');

  /** Lien http(s) qui s'ouvre dans un nouvel onglet : l'adresse (ou son libellé) échappée, rel noopener. */
  const link = (u, label = u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  /** Texte échappé dont les {nom} sont remplacés par les valeurs de v (déjà en HTML) ; un nom inconnu reste tel quel. */
  const fill = (text, v) => esc(text).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

  /** Ce que le jeton dit de lui (`whoami()` du transport GitLab : { bot, scopes, expiresAt }) en phrases d'avertissement, dans la langue de `t` : sans expiration ou à plus d'un an, des droits au-delà de ceux que le transport emploie
   *  (api, read_api, read_repository, write_repository). Le jeton personnel n'y est pas : chaque écran le dit à sa façon (une question à « Rejoindre », un avertissement à la carte Accès). */
  function tokenWarnings(t, who) {
    const out = [],
      day = Date.parse(who?.expiresAt || '');
    if (!who?.expiresAt || !(day - Date.now() <= 365 * 864e5)) out.push(t(T.tokenExpiry));
    const extra = Array.isArray(who?.scopes) ? who.scopes.filter(s => !['api', 'read_api', 'read_repository', 'write_repository']
      .includes(s)) : [];
    if (extra.length) out.push(t(T.tokenScopes, {
      s: extra.join(', ')
    }));
    return out;
  }

  window.SogSettingsKit = {
    ROOT,
    esc,
    now,
    T,
    bind,
    setup,
    copy,
    sameRepo,
    confirmOpen,
    AIRLINE,
    airlineDoc,
    howtoHtml,
    link,
    fill,
    tokenWarnings
  };
})();
