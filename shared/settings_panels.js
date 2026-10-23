(() => {
  'use strict';
  // Rubriques des pages de Paramètres écrites hors de shared/data_admin.js (docs/technique/DISPOS_ET_REORGANISATION.md § 2) :
  //   · Mon profil — identité (trigramme, IVAO, VATSIM, SimBrief, identifiants du site de la compagnie, langue), connexion et mot de
  //     passe, préférences de thèmes (listes blanches / noires par domaine), appareils et simulateurs ;
  //   · Centre — utilisateurs et droits (shared/users.js), catégories de disponibilité (shared/dispos.js) ;
  //   · Installation — premier lancement (v2 : plus placé, l'onglet Premier lancement le remplace).
  // Chaque rubrique : { id, group, title, intro, render(body, api) } dans window.SettingsPanels.list, lue par
  // DataAdmin.mount (page : REPOSITORY_TREE.settings.sections) ; api : status(texte), actions([[libellé, fn, classe]]),
  // changed() (modifié, non enregistré), saved(), show(), open(id).
  // Textes : français dans le code, lignes [fr, en, de, es] inscrites auprès de la couche de traduction
  // (shared/content_i18n.js) ; phrases avec valeurs : RepositoryKit.tf, dans des zones [data-no-i18n].
  const K = window.RepositoryKit,
    esc = K.esc;
  const rows = [];
  let pending = false;
  /** Texte français d'un libellé, sa ligne [fr, en, de, es] inscrite pour la traduction à l'affichage (par lots : les
   *  lignes des modules chargés ensuite — utilisateurs, catégories — rejoignent la couche à leur tour). */
  const L = (fr, en, de, es) => {
    rows.push([fr, en, de, es]);
    if (!pending && window.RepositoryContentI18n) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        window.RepositoryContentI18n(rows.splice(0));
      });
    }
    return fr;
  };
  const tf = K.tf;
  const PROFILE = 'missionReportingConfig:v1',
    DEFA = 'defaCredentials:v1'; // secret : gardé dans ce navigateur seulement (exclu des sauvegardes : browser_store.js)
  /** Notification flottante de la suite (AppFramework.notify), sans effet si le cadre n'est pas chargé. */
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  /** Bandeau commun (RepositoryNav), lu à l'appel. */
  const nav = () => window.RepositoryNav;

  // sous-titres des en-têtes des quatre pages (« SO Group Virtual — … » : la couche de traduction traduit la partie après le tiret)
  L('trigramme, identifiants VATSIM, IVAO, SimBrief et du site de la compagnie, connexion et mot de passe, types de missions, langue, appareils et simulateurs',
    'trigram, VATSIM, IVAO, SimBrief and airline website credentials, sign-in and password, mission types, language, aircraft and simulators',
    'Kürzel, VATSIM-, IVAO-, SimBrief- und Website-Zugangsdaten der Fluggesellschaft, Anmeldung und Passwort, Missionsarten, Sprache, Luftfahrzeuge und Simulatoren',
    'trigrama, credenciales de VATSIM, IVAO, SimBrief y del sitio de la aerolínea, conexión y contraseña, tipos de misión, idioma, aeronaves y simuladores'
  );
  L('accès au Centre, utilisateurs et droits, catégories de disponibilité, réglages du routage, envoi des comptes rendus',
    'Centre access, users and rights, availability categories, routing settings, report sending',
    'Zugang zum Zentrum, Benutzer und Rechte, Verfügbarkeitskategorien, Routing-Einstellungen, Berichtsversand',
    'acceso al Centro, usuarios y derechos, categorías de disponibilidad, ajustes de rutas, envío de informes');
  L('premier lancement, dépôt de données, dossiers, compagnie virtuelle', 'first run, data repository, folders, virtual airline',
    'Erststart, Datenrepository, Ordner, virtuelle Fluggesellschaft',
    'primer arranque, repositorio de datos, carpetas, aerolínea virtual');
  L('mises à jour, versions, dépendances, base SIA, caches, stockage, sauvegarde, journal, fichiers de référence',
    'updates, versions, dependencies, SIA base, caches, storage, backup, journal, reference files',
    'Aktualisierungen, Versionen, Abhängigkeiten, SIA-Basis, Caches, Speicher, Sicherung, Protokoll, Referenzdateien',
    'actualizaciones, versiones, dependencias, base SIA, cachés, almacenamiento, copia, registro, archivos de referencia');
  L('Mon profil', 'My profile', 'Mein Profil', 'Mi perfil');
  L('Installation', 'Installation', 'Installation', 'Instalación');
  L('Paramètres — Centre', 'Settings — Centre', 'Einstellungen — Zentrum', 'Ajustes — Centro');
  L('Paramètres — Installation', 'Settings — Installation', 'Einstellungen — Installation', 'Ajustes — Instalación');
  L('Paramètres — Maintenance', 'Settings — Maintenance', 'Einstellungen — Wartung', 'Ajustes — Mantenimiento');

  /** Objet JSON gardé dans le stockage du navigateur sous la clé k ({} si absent ou illisible). */
  const read = k => K.store.json(k, {}) || {};
  /** Champ de formulaire : libellé, saisie (attributs). */
  const field = (label, attrs) => `<label>${esc(label)}</label><input ${attrs} autocomplete="off" spellcheck="false">`;

  // ---------------------------------------------------------------- Mon profil › Identité
  const GROUP_PROFILE = L('Mon profil', 'My profile', 'Mein Profil', 'Mi perfil');
  const identity = {
    id: 'identity',
    group: GROUP_PROFILE,
    title: L('Identité et réseaux', 'Identity and networks', 'Identität und Netzwerke', 'Identidad y redes'),
    intro: L(
      'Trigramme, identifiants des réseaux (VATSIM, IVAO), SimBrief et du site de la compagnie, langue de la suite. Repris par toutes les pages (☰ › Profil pilote, comptes rendus, reportings).',
      'Trigram, network IDs (VATSIM, IVAO), SimBrief and airline website credentials, suite language. Used by every page (☰ › Pilot profile, reports, reportings).',
      'Kürzel, Netzwerk-IDs (VATSIM, IVAO), SimBrief- und Website-Zugangsdaten der Fluggesellschaft, Sprache der Suite. Von allen Seiten verwendet (☰ › Pilotenprofil, Berichte).',
      'Trigrama, identificadores de redes (VATSIM, IVAO), SimBrief y del sitio de la aerolínea, idioma de la suite. Usado por todas las páginas (☰ › Perfil de piloto, informes).'
    ),
    /** Identité : profil pilote (missionReportingConfig:v1), identifiants du site gardés dans ce navigateur
     *  (defaCredentials:v1), client OAuth IVAO, langue ; « Enregistrer » prévient les pages (pilot-profile-change). */
    render(body, api) {
      const p = read(PROFILE),
        d = read(DEFA),
        U = window.SuiteUsers,
        triLocked = !!U?.trigramLocked?.();
      const LANG = [
        ['auto', L('Automatique (langue du navigateur)', 'Automatic (browser language)', 'Automatisch (Browsersprache)',
          'Automático (idioma del navegador)')],
        ['fr', 'Français'],
        ['en', 'English'],
        ['de', 'Deutsch'],
        ['es', 'Español']
      ];
      const mode = nav()?.getLanguageMode?.() || 'auto';
      // v2 : client OAuth IVAO (réglage technique) et langue (doublon du sélecteur de l'en-tête) au niveau 4 seulement
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('Pilote', 'Pilot', 'Pilot', 'Piloto'))}</h3><div class="sp-form">
          ${field(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'), `data-f="trigram" maxlength="4" style="text-transform:uppercase"${triLocked ? ' readonly' : ''}`)}
          ${field(L('ID VATSIM (CID)', 'VATSIM ID (CID)', 'VATSIM-ID (CID)', 'ID VATSIM (CID)'), 'data-f="vatsimId" inputmode="numeric"')}
          ${field(L('ID IVAO (VID)', 'IVAO ID (VID)', 'IVAO-ID (VID)', 'ID IVAO (VID)'), 'data-f="ivaoId" inputmode="numeric"')}
          ${field(L('SimBrief (utilisateur ou ID)', 'SimBrief (username or ID)', 'SimBrief (Benutzer oder ID)', 'SimBrief (usuario o ID)'), 'data-f="simbriefUser"')}
        </div>${triLocked ? `<p class="sp-hint">${esc(L('Mode production : le trigramme est celui de l’utilisateur connecté.', 'Production mode: the trigram is the signed-in user’s.', 'Produktionsmodus: Das Kürzel ist das des angemeldeten Benutzers.', 'Modo producción: el trigrama es el del usuario conectado.'))}</p>` : ''}</div>
        <div class="sp-card"><h3>${esc(L('Site de la compagnie', 'Airline website', 'Website der Fluggesellschaft', 'Sitio de la aerolínea'))}</h3><div class="sp-form">
          ${field(L('Identifiant', 'Login', 'Kennung', 'Identificador'), 'data-defa="login"')}
          <label>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</label><span class="repo-inop-field"><input type="password" data-defa="password" disabled autocomplete="off"><span class="repo-inop" title="${esc(K.t(['Hors service : le {SOG} n’a pas encore de webservice. Ce mot de passe n’est ni demandé ni gardé ; un accès futur passera probablement par une clé d’API.', 'Inoperative: the {SOG} has no web service yet. This password is neither asked for nor kept; future access will probably use an API key.', 'Außer Betrieb: Die {SOG} hat noch keinen Webdienst. Dieses Passwort wird weder abgefragt noch gespeichert; ein künftiger Zugang läuft wahrscheinlich über einen API-Schlüssel.', 'Fuera de servicio: el {SOG} aún no tiene servicio web. Esta contraseña no se pide ni se guarda; un acceso futuro usará probablemente una clave de API.']))}" data-no-i18n>INOP</span></span>
        </div><p class="sp-hint">${esc(L('Gardés dans ce navigateur seulement : jamais écrits dans un fichier ni dans une sauvegarde.', 'Kept in this browser only: never written to a file or a backup.', 'Nur in diesem Browser gespeichert: nie in eine Datei oder Sicherung geschrieben.', 'Guardadas solo en este navegador: nunca escritas en un archivo ni en una copia.'))}</p></div>
        <div class="sp-card" data-ivc-card><h3>${esc(L('IVAO — client OAuth (personnel)', 'IVAO — OAuth client (personal)', 'IVAO — OAuth-Client (persönlich)', 'IVAO — cliente OAuth (personal)'))}</h3><div class="sp-form">
          ${field(L('Identifiant du client (client ID)', 'Client ID', 'Client-ID', 'Identificador del cliente (client ID)'), 'data-ivc="clientId" autocomplete="off" spellcheck="false"')}
          <label>${esc(L('Secret du client', 'Client secret', 'Client-Geheimnis', 'Secreto del cliente'))}</label><input type="password" data-ivc="clientSecret" autocomplete="off" spellcheck="false">
          <label>${esc(L('Adresse de redirection à déclarer chez IVAO', 'Redirect URL to declare at IVAO', 'Bei IVAO anzugebende Weiterleitungsadresse', 'Dirección de redirección a declarar en IVAO'))}</label><input type="text" data-ivc-redirect readonly>
        </div><p class="sp-hint">${esc(L('Client créé sur developers.ivao.aero, à votre nom. Gardé par le lanceur de ce poste (secrets/users/<trigramme>.json, exclu de git, hors des données et des sauvegardes) ; le secret n’est jamais renvoyé à la page. La clé d’API de la suite se règle dans Paramètres › Installation › Clés et services externes.', 'Client created on developers.ivao.aero, in your name. Kept by this computer’s launcher (secrets/users/<trigram>.json, excluded from git, outside the data and the backups); the secret is never sent back to the page. The suite API key is set in Settings › Installation › Keys and external services.', 'Auf developers.ivao.aero auf Ihren Namen angelegter Client. Vom Starter dieses Rechners gehalten (secrets/users/<Kürzel>.json, von Git ausgeschlossen, außerhalb der Daten und Sicherungen); das Geheimnis wird nie an die Seite zurückgegeben. Der API-Schlüssel der Suite wird unter Einstellungen › Installation › Schlüssel und externe Dienste eingestellt.', 'Cliente creado en developers.ivao.aero, a su nombre. Guardado por el lanzador de este equipo (secrets/users/<trigrama>.json, excluido de git, fuera de los datos y de las copias); el secreto nunca se devuelve a la página. La clave de API de la suite se ajusta en Ajustes › Instalación › Claves y servicios externos.'))}</p>
        <p class="row"><button type="button" class="secondary" data-ivc-save>${esc(L('Enregistrer le client IVAO', 'Save the IVAO client', 'IVAO-Client speichern', 'Guardar el cliente IVAO'))}</button> <button type="button" class="secondary" data-ivc-clear hidden>${esc(L('Effacer', 'Clear', 'Löschen', 'Borrar'))}</button> <span class="sp-hint" data-ivc-state data-no-i18n></span></p></div>
        <div class="sp-card" data-min-level="4"><h3>${esc(L('Langue', 'Language', 'Sprache', 'Idioma'))}</h3><div class="sp-form"><label>${esc(L('Langue de la suite', 'Suite language', 'Sprache der Suite', 'Idioma de la suite'))}</label>
          <select data-lang>${LANG.map(([v, l]) => `<option value="${v}"${v === mode ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>`;
      body.querySelectorAll('[data-f]').forEach(i => {
        i.value = p[i.dataset.f] || '';
        if (i.dataset.f === 'trigram' && triLocked) i.value = U.effective?.() || i.value;
      });
      body.querySelector('[data-defa="login"]').value = d.login || '';
      body.querySelectorAll('input:not([data-ivc]):not([data-ivc-redirect])').forEach(i => i.oninput = api.changed);
      ivaoClient(body, (U?.effective?.() || p.trigram || '').toUpperCase());
      // langue : appliquée tout de suite (comme le sélecteur de l'en-tête)
      body.querySelector('[data-lang]').onchange = e => nav()?.setLanguage?.(e.target.value);
      api.status(p.trigram ? tf(['Trigramme : {t}', 'Trigram: {t}', 'Kürzel: {t}', 'Trigrama: {t}'], {
        t: p.trigram
      }) : K.t(['Trigramme non réglé', 'Trigram not set', 'Kürzel nicht gesetzt', 'Trigrama no definido']));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), () => {
          const cur = read(PROFILE),
            next = {
              ...cur
            };
          body.querySelectorAll('[data-f]').forEach(i => {
            if (i.dataset.f === 'trigram' && triLocked) return;
            next[i.dataset.f] = i.dataset.f === 'trigram' ? i.value.trim().toUpperCase() : i.value.trim();
          });
          if (next.trigram && !/^[A-Z0-9]{2,4}$/.test(next.trigram)) return api.status(K.t([
            'Trigramme : 2 à 4 lettres ou chiffres.', 'Trigram: 2 to 4 letters or digits.',
            'Kürzel: 2 bis 4 Buchstaben oder Ziffern.', 'Trigrama: de 2 a 4 letras o cifras.'
          ]));
          K.store.setJson(PROFILE, next);
          // identifiant seul : le mot de passe du site est hors service (INOP, pas de webservice du SOG)
          const login = body.querySelector('[data-defa="login"]').value.trim();
          if (login) K.store.setJson(DEFA, {
            login
          });
          else K.store.remove(DEFA);
          api.saved();
          // pages ouvertes et menu ☰ : profil pilote relu (événement storage des autres onglets ; ici, événement de la suite)
          window.dispatchEvent(new CustomEvent('pilot-profile-change', {
            detail: next
          }));
          if (next.trigram !== cur.trigram) window.MissionAssignments?.envelope?.();
          api.status(K.t(['Profil enregistré dans ce navigateur', 'Profile saved in this browser',
            'Profil in diesem Browser gespeichert', 'Perfil guardado en este navegador'
          ]));
        }, 'primary']
      ]);
    }
  };

  /** Carte « IVAO — client OAuth » : identifiants personnels gardés par le lanceur (GET / POST /__setup/secrets, portée
   *  user), jamais relus en clair (secret : état et 4 derniers caractères) ; adresse de redirection du lanceur. */
  async function ivaoClient(body, tri) {
    const card = body.querySelector('[data-ivc-card]');
    if (!card) return;
    /** Élément de la carte ; say : texte d'état du client IVAO. */
    const $ = s => card.querySelector(s),
      say = txt => $('[data-ivc-state]').textContent = txt;
    $('[data-ivc-redirect]').value = `${location.origin}/__setup/ivao-callback`;
    /** Appel du lanceur /__setup/secrets : GET (trigramme) sans b, POST de b sinon ; null en cas d'échec. */
    const api = (b = null) => fetch(`/__setup/secrets${b ? '' : `?tri=${encodeURIComponent(tri)}`}`, {
      method: b ? 'POST' : 'GET',
      headers: {
        'X-SOG-Setup': '1',
        'Content-Type': 'application/json'
      },
      body: b ? JSON.stringify(b) : undefined,
      cache: 'no-store'
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    /** Affiche l'état du client IVAO lu au lanceur (st null : lanceur absent ; secret jamais réaffiché). */
    const draw = st => {
      const v = st?.user?.ivao;
      card.querySelectorAll('input[data-ivc], button').forEach(e => e.disabled = !st || !tri);
      if (!st) return say(K.t(['Lanceur absent : ouvrez la suite avec lancer.cmd / lancer.sh.',
        'No launcher: open the suite with lancer.cmd / lancer.sh.', 'Kein Starter: Suite mit lancer.cmd / lancer.sh öffnen.',
        'Sin lanzador: abra la suite con lancer.cmd / lancer.sh.'
      ]));
      if (!tri) return say(K.t(['Trigramme non réglé : le régler ci-dessus.', 'Trigram not set: set it above.',
        'Kürzel nicht gesetzt: oben festlegen.', 'Trigrama no definido: definirlo arriba.'
      ]));
      $('[data-ivc="clientId"]').value = v?.clientId || '';
      $('[data-ivc="clientSecret"]').value = '';
      $('[data-ivc="clientSecret"]').placeholder = v?.clientSecret?.set ? K.t(['(inchangé)', '(unchanged)', '(unverändert)',
        '(sin cambios)'
      ]) : '';
      $('[data-ivc-clear]').hidden = !(v?.clientId || v?.clientSecret?.set);
      say(v?.clientSecret?.set ? tf(['Client de {t} enregistré, secret {h}.', 'Client of {t} saved, secret {h}.',
        'Client von {t} gespeichert, Geheimnis {h}.', 'Cliente de {t} guardado, secreto {h}.'
      ], {
        t: tri,
        h: v.clientSecret.hint
      }) : tf(['Aucun client IVAO pour {t}.', 'No IVAO client for {t}.', 'Kein IVAO-Client für {t}.',
        'Ningún cliente IVAO para {t}.'
      ], {
        t: tri
      }));
    };
    /** Enregistre (ou efface, valeurs vides) le client IVAO de l'utilisateur chez le lanceur, puis relit l'état. */
    const send = async values => {
      const r = await api({
        scope: 'user',
        tri,
        service: 'ivao',
        values
      });
      if (!r?.ok) window.AppFramework?.notify?.(tf(['Client IVAO non enregistré : {e}', 'IVAO client not saved: {e}',
        'IVAO-Client nicht gespeichert: {e}', 'Cliente IVAO no guardado: {e}'
      ], {
        e: r?.message || '?'
      }), 'error');
      draw(r?.ok ? r : await api());
    };
    $('[data-ivc-save]').onclick = () => {
      const values = {
          clientId: $('[data-ivc="clientId"]').value.trim()
        },
        secret = $('[data-ivc="clientSecret"]').value.trim();
      if (secret) values.clientSecret = secret; // vide : secret inchangé
      send(values);
    };
    $('[data-ivc-clear]').onclick = async () => {
      if (await window.AppFramework?.ask?.(K.t(['Effacer le client IVAO de ce poste ?',
          'Remove the IVAO client from this computer?', 'IVAO-Client von diesem Rechner entfernen?',
          '¿Borrar el cliente IVAO de este equipo?'
        ]), {
          danger: true
        }) === false) return;
      send({
        clientId: '',
        clientSecret: ''
      });
    };
    draw(tri ? await api() : {});
  }

  // ---------------------------------------------------------------- Mon profil › Niveau d'utilisation (v2)
  // Quatre cartes de niveau (case radio, numéro et nom, ce que le niveau montre, « Demande le Centre » pour 2 à 4), le
  // niveau actuel, puis les outils facultatifs (case, nom, courte description). Textes [fr, en, de, es] écrits dans la
  // langue de la page (K.t, K.tf) en zone [data-no-i18n] : la rubrique est refaite au changement de langue (data_admin.js).
  const LEVEL_TITLE = ['Niveau d’utilisation', 'Usage level', 'Nutzungsstufe', 'Nivel de uso'];
  /** Niveaux 1 à 4 : nom, ce que le niveau montre, et s'il demande l'accord du Centre. */
  const LEVELS = [{
    name: ['Équipage', 'Crew', 'Besatzung', 'Tripulación'],
    what: ['Recevoir mes missions, voir le planning des ordres, écrire mes comptes rendus.',
      'Receive my missions, see the order schedule, write my reports.',
      'Meine Missionen erhalten, die Befehlsplanung sehen, meine Berichte schreiben.',
      'Recibir mis misiones, ver la planificación de órdenes, escribir mis informes.'
    ]
  }, {
    name: ['Planification', 'Planning', 'Planung', 'Planificación'],
    what: ['En plus : planifier les ordres (Tableau, disponibilités, ODV).', 'Also: plan the orders (Board, availability, ODV).',
      'Zusätzlich: Befehle planen (Einsatztafel, Verfügbarkeit, ODV).',
      'Además: planificar las órdenes (Tablero, disponibilidad, ODV).'
    ],
    centre: true
  }, {
    name: ['Conception', 'Design', 'Gestaltung', 'Diseño'],
    what: ['En plus : générer, modifier et registrer les missions.', 'Also: generate, edit and register missions.',
      'Zusätzlich: Missionen erzeugen, ändern und registrieren.', 'Además: generar, modificar y registrar misiones.'
    ],
    centre: true
  }, {
    name: ['Expert', 'Expert', 'Experte', 'Experto'],
    what: ['Tout : studio cartographique, cartes avancées et profils, carburant, atterrissages, analyses.',
      'Everything: map studio, advanced maps and profiles, fuel, landings, analyses.',
      'Alles: Kartenstudio, erweiterte Karten und Profile, Kraftstoff, Landungen, Analysen.',
      'Todo: estudio cartográfico, mapas avanzados y perfiles, combustible, aterrizajes, análisis.'
    ],
    centre: true
  }];
  /** Outils facultatifs (RepositoryNav.levels.MODULES) : nom et courte description. */
  const MODULE_TEXTS = {
    maps: [
      ['Cartes de vol', 'Flight maps', 'Flugkarten', 'Mapas de vuelo'],
      ['route, cartes topographiques, approche', 'route, topographic maps, approach', 'Route, topografische Karten, Anflug',
        'ruta, mapas topográficos, aproximación'
      ]
    ],
    fuel: [
      ['Carburant', 'Fuel', 'Kraftstoff', 'Combustible'],
      ['performances et devis carburant', 'performance and fuel estimate', 'Flugleistungen und Kraftstoffberechnung',
        'prestaciones y cálculo de combustible'
      ]
    ],
    landings: [
      ['Atterrissages', 'Landings', 'Landungen', 'Aterrizajes'],
      ['tableau de bord des atterrissages', 'landings dashboard', 'Übersicht der Landungen', 'panel de aterrizajes']
    ],
    reporting: [
      ['Analyse des missions', 'Mission analysis', 'Missionsanalyse', 'Análisis de misiones'],
      ['reporting des comptes rendus', 'reporting on mission reports', 'Auswertung der Einsatzberichte',
        'análisis de los informes de misión'
      ]
    ]
  };
  const LEVEL_TEXT = {
    centre: ['Demande le Centre', 'Requires the Centre', 'Erfordert das Zentrum', 'Requiere el Centro'],
    now: ['Niveau actuel : {n} · {name}', 'Current level: {n} · {name}', 'Aktuelle Stufe: {n} · {name}', 'Nivel actual: {n} · {name}'],
    tools: ['Outils facultatifs', 'Optional tools', 'Optionale Werkzeuge', 'Herramientas opcionales'],
    allIn: ['Tous inclus au niveau Expert.', 'All included at Expert level.', 'Auf Stufe Experte alle enthalten.',
      'Todos incluidos en el nivel Experto.'
    ],
    inTools: ['Rangés sous « Outils » dans la barre latérale.', 'Grouped under “Tools” in the sidebar.',
      'In der Seitenleiste unter „Werkzeuge“ gruppiert.', 'Agrupados en «Herramientas» en la barra lateral.'
    ]
  };
  const levelPanel = {
    id: 'level',
    group: GROUP_PROFILE,
    title: L(...LEVEL_TITLE),
    intro: L(
      'Ce que la suite vous montre, selon votre usage. Le niveau range l’interface ; il ne donne aucun droit : le Centre garde son accès.',
      'What the suite shows you, according to your use. The level arranges the interface; it grants no rights: the Centre keeps its access.',
      'Was die Suite Ihnen zeigt, je nach Nutzung. Die Stufe ordnet die Oberfläche; sie gewährt keine Rechte: das Zentrum behält seinen Zugang.',
      'Lo que la suite le muestra, según su uso. El nivel ordena la interfaz; no da ningún derecho: el Centro conserva su acceso.'
    ),
    /** Niveau (1 à 4, RepositoryNav.levels) en cartes, niveau actuel, modules facultatifs ; un changement enregistre
     *  (événement « suite-level-change » émis par RepositoryNav) et recharge la page (barre latérale). */
    render(body, api) {
      const N = nav().levels;
      api.actions([]);
      if (!N) {
        body.innerHTML = `<p>${esc(L('Navigation non chargée.', 'Navigation not loaded.', 'Navigation nicht geladen.', 'Navegación no cargada.'))}</p>`;
        return;
      }
      const cur = N.get(),
        mods = N.modules(),
        all = cur >= 4,
        T = K.t;
      body.innerHTML = `<div class="sp-level-panel" data-no-i18n>
        <div class="sp-level-cards" role="radiogroup" aria-label="${esc(T(LEVEL_TITLE))}">
        ${LEVELS.map((level, i) => `<label class="sp-level-card"><input type="radio" name="lvl" value="${i + 1}"${cur === i + 1 ? ' checked' : ''}><span class="sp-level-text"><b>${i + 1} · ${esc(T(level.name))}</b><span class="sp-level-what">${esc(T(level.what))}</span>${level.centre ? `<small class="sp-level-need">${esc(T(LEVEL_TEXT.centre))}</small>` : ''}</span></label>`).join('')}
        </div>
        <p class="sp-level-now">${esc(tf(LEVEL_TEXT.now, { n: cur, name: T(LEVELS[cur - 1]?.name || ['—']) }))}</p>
        <fieldset class="sp-tools"${all ? ' disabled' : ''}><legend>${esc(T(LEVEL_TEXT.tools))}</legend>
        <p class="sp-hint">${esc(T(all ? LEVEL_TEXT.allIn : LEVEL_TEXT.inTools))}</p>
        ${N.MODULES.map(m => `<label class="sp-tool"><input type="checkbox" name="mod" value="${m}"${all || mods.includes(m) ? ' checked' : ''}><span><b>${esc(T(MODULE_TEXTS[m]?.[0] || [m]))}</b>${MODULE_TEXTS[m] ? ` <span class="sp-tool-what">— ${esc(T(MODULE_TEXTS[m][1]))}</span>` : ''}</span></label>`).join('')}
        </fieldset></div>`;
      /** Enregistré : annonce, puis rechargement (barre latérale et pages selon le niveau). */
      const reload = () => {
        api.status(L('Enregistré : la page se recharge…', 'Saved: the page reloads…', 'Gespeichert: die Seite wird neu geladen…',
          'Guardado: la página se recarga…'));
        setTimeout(() => location.reload(), 400);
      };
      body.querySelectorAll('input[name="lvl"]').forEach(r => r.onchange = () => {
        if (+r.value === cur) return; // déjà ce niveau : rien à écrire
        N.set(+r.value);
        reload();
      });
      body.querySelectorAll('input[name="mod"]').forEach(c => c.onchange = () => {
        N.setModules([...body.querySelectorAll('input[name="mod"]:checked')].map(x => x.value));
        reload();
      });
    }
  };

  // ---------------------------------------------------------------- Mon profil › Accès aux données (appli sans lanceur)
  // dépôt GitHub des données, branche et jeton personnel (shared/github_data.js, docs/technique/APPLI_AUTONOME.md) :
  // gardés dans ce navigateur (githubData:v1, exclu des sauvegardes) ; « Enregistrer » ouvre ensuite Aujourd'hui
  const dataAccess = {
    id: 'dataAccess',
    group: GROUP_PROFILE,
    title: L('Accès aux données', 'Data access', 'Datenzugang', 'Acceso a los datos'),
    intro: L(
      'Appli sans lanceur (téléphone, GitHub Pages) : les données de la compagnie sont lues et écrites dans un dépôt GitHub, avec votre jeton personnel. Sur un poste avec le lanceur : inutile.',
      'App without the launcher (phone, GitHub Pages): the airline data is read from and written to a GitHub repository, with your personal token. On a computer with the launcher: not needed.',
      'App ohne Starter (Telefon, GitHub Pages): Die Daten der Fluggesellschaft werden mit Ihrem persönlichen Token in einem GitHub-Repository gelesen und geschrieben. Auf einem Rechner mit Starter: unnötig.',
      'App sin lanzador (teléfono, GitHub Pages): los datos de la aerolínea se leen y escriben en un repositorio de GitHub, con su token personal. En un equipo con el lanzador: innecesario.'
    ),
    /** Réglage de l'accès GitHub : dépôt, branche, jeton (jamais réaffiché) ; Tester, Enregistrer, Couper l'accès. */
    async render(body, api) {
      const G = window.GitHubData;
      if (!G) {
        body.innerHTML = `<p>${esc(L('Module shared/github_data.js absent.', 'shared/github_data.js module missing.', 'Modul shared/github_data.js fehlt.', 'Falta el módulo shared/github_data.js.'))}</p>`;
        return;
      }
      const c = G.config() || {},
        def = String(window.REPOSITORY_TREE?.sources?.dataRepo?.url || '').match(/github\.com\/([^/]+\/[^/.]+)/)?.[1] || '';
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('Dépôt GitHub des données', 'GitHub data repository', 'GitHub-Daten-Repository', 'Repositorio de datos en GitHub'))}</h3><div class="sp-form">
          ${field(L('Dépôt (compte/dépôt)', 'Repository (account/repository)', 'Repository (Konto/Repository)', 'Repositorio (cuenta/repositorio)'), `data-gh="repo" placeholder="${esc(def || 'compte/flight_planner_data')}"`)}
          ${field(L('Branche', 'Branch', 'Zweig', 'Rama'), 'data-gh="branch" placeholder="main"')}
          <label>${esc(L('Jeton personnel', 'Personal token', 'Persönliches Token', 'Token personal'))}</label><input type="password" data-gh="token" autocomplete="off" spellcheck="false">
        </div><p class="sp-hint">${esc(L('Jeton à grain fin créé sur github.com › Settings › Developer settings › Fine-grained tokens : accès au seul dépôt des données, permission « Contents » en lecture et écriture, expiration de 90 jours au plus (à refaire ensuite). Gardé dans ce navigateur seulement : jamais écrit dans un fichier ni une sauvegarde, jamais réaffiché ; ne le collez dans aucun message.', 'Fine-grained token created on github.com › Settings › Developer settings › Fine-grained tokens: access to the data repository only, “Contents” permission read and write, expiration of 90 days at most (then make a new one). Kept in this browser only: never written to a file or a backup, never shown again; do not paste it in any message.', 'Feingranulares Token auf github.com › Settings › Developer settings › Fine-grained tokens: nur Zugriff auf das Daten-Repository, Berechtigung „Contents“ Lesen und Schreiben, Ablauf nach höchstens 90 Tagen (danach neu erstellen). Nur in diesem Browser gespeichert: nie in eine Datei oder Sicherung geschrieben, nie wieder angezeigt; in keine Nachricht einfügen.', 'Token de grano fino creado en github.com › Settings › Developer settings › Fine-grained tokens: acceso solo al repositorio de datos, permiso «Contents» en lectura y escritura, caducidad de 90 días como máximo (luego crear otro). Guardado solo en este navegador: nunca escrito en un archivo ni en una copia, nunca vuelto a mostrar; no lo pegue en ningún mensaje.'))}</p>
        <p class="sp-hint">${esc(L('« Couper l’accès » efface le jeton et les copies des données de ce navigateur. Téléphone perdu ou volé : supprimez aussi le jeton sur github.com (Settings › Developer settings › Fine-grained tokens), il ne vaut plus nulle part.', '“Cut access” erases the token and the data copies from this browser. Lost or stolen phone: also delete the token on github.com (Settings › Developer settings › Fine-grained tokens); it then works nowhere.', '„Zugang trennen“ löscht das Token und die Datenkopien aus diesem Browser. Telefon verloren oder gestohlen: das Token auch auf github.com löschen (Settings › Developer settings › Fine-grained tokens); dann gilt es nirgends mehr.', '«Cortar el acceso» borra el token y las copias de los datos de este navegador. Teléfono perdido o robado: borre también el token en github.com (Settings › Developer settings › Fine-grained tokens); ya no vale en ningún sitio.'))}</p>
        ${/\.github\.io$/i.test(location.hostname) ? `<p class="sp-hint">${esc(tf(['Site publié sur {h} : tout autre site GitHub Pages de ce compte partage la même origine et pourrait lire ce jeton. N’en publiez pas d’autre sur ce compte (ou passez à un domaine propre).', 'Site published on {h}: any other GitHub Pages site of this account shares the same origin and could read this token. Do not publish another one on this account (or move to a custom domain).', 'Website auf {h} veröffentlicht: Jede andere GitHub-Pages-Website dieses Kontos teilt denselben Ursprung und könnte dieses Token lesen. Keine weitere auf diesem Konto veröffentlichen (oder eine eigene Domain nutzen).', 'Sitio publicado en {h}: cualquier otro sitio de GitHub Pages de esta cuenta comparte el mismo origen y podría leer este token. No publique otro en esta cuenta (o pase a un dominio propio).'], { h: location.hostname }))}</p>` : ''}
        <p class="small" data-gh-state></p></div>`;
      const $ = s => body.querySelector(s),
        state = $('[data-gh-state]');
      $('[data-gh="repo"]').value = c.repo || def;
      $('[data-gh="branch"]').value = c.branch || 'main';
      $('[data-gh="token"]').placeholder = c.token ? L('(inchangé)', '(unchanged)', '(unverändert)', '(sin cambios)') : '';
      const say = text => {
        if (state.textContent !== text) state.textContent = text;
      };
      say(G.on() ? tf(['Actif : {r} (branche {b}).', 'Active: {r} (branch {b}).', 'Aktiv: {r} (Zweig {b}).',
        'Activo: {r} (rama {b}).'
      ], {
        r: c.repo,
        b: c.branch
      }) : L('Inactif : les données sont celles du lanceur (ou de ce navigateur).',
        'Inactive: the data is the launcher’s (or this browser’s).',
        'Inaktiv: Die Daten sind die des Starters (oder dieses Browsers).',
        'Inactivo: los datos son los del lanzador (o de este navegador).'));
      /** Réglage saisi (jeton vide : celui qui est gardé). */
      const typed = () => ({
        repo: $('[data-gh="repo"]').value.trim(),
        branch: $('[data-gh="branch"]').value.trim() || 'main',
        token: $('[data-gh="token"]').value.trim() || c.token || ''
      });
      api.actions([
        [L('Tester', 'Test', 'Testen', 'Probar'), async () => {
          const cfg = typed();
          if (!cfg.repo || !cfg.token) return say(L('Dépôt et jeton à saisir.', 'Repository and token to enter.',
            'Repository und Token eingeben.', 'Introducir repositorio y token.'));
          say(L('Vérification…', 'Checking…', 'Prüfung…', 'Comprobando…'));
          say((await G.test(cfg)).message);
        }],
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const cfg = typed();
          if (!cfg.repo || !cfg.token) return say(L('Dépôt et jeton à saisir.', 'Repository and token to enter.',
            'Repository und Token eingeben.', 'Introducir repositorio y token.'));
          say(L('Vérification…', 'Checking…', 'Prüfung…', 'Comprobando…'));
          const r = await G.test(cfg);
          if (!r.ok) return say(r.message);
          G.enable(cfg);
          api.saved();
          notify(r.message, r.write ? 'ok' : 'warn');
          // les données viennent désormais du dépôt : l'appli s'ouvre sur Mes missions (page d'entrée du pilote)
          setTimeout(() => location.assign(new URL('../pilot/mes_missions.html', location.href).href), 600);
        }, 'primary'],
        [L('Couper l’accès', 'Cut access', 'Zugang trennen', 'Cortar el acceso'), async () => {
          await G.disable();
          notify(L('Accès GitHub coupé : jeton effacé de ce navigateur.',
            'GitHub access cut: token erased from this browser.',
            'GitHub-Zugang getrennt: Token aus diesem Browser gelöscht.',
            'Acceso a GitHub cortado: token borrado de este navegador.'), 'ok');
          setTimeout(() => location.reload(), 600);
        }]
      ]);
    }
  };

  // ---- Mon profil › Ce poste (comptes signés, enrôlement S2 ; shared/sog_registry.js) : empreinte de la clé de ce poste,
  // état dans le registre, « Demander l'accès » (demande signée par la clé du poste, approuvée par un admin)
  const device = {
    id: 'device',
    group: GROUP_PROFILE,
    title: L('Ce poste', 'This device', 'Dieses Gerät', 'Este equipo'),
    intro: L(
      'Clé de ce poste (navigateur de cet ordinateur ou de ce téléphone) pour les comptes signés : en mode groupe, vos écritures seront signées par elle. Elle reste dans ce navigateur, non exportable ; un admin l’ajoute au registre après avoir comparé son empreinte.',
      'Key of this device (browser of this computer or phone) for signed accounts: in group mode, your writes will be signed with it. It stays in this browser, not exportable; an admin adds it to the registry after comparing its fingerprint.',
      'Schlüssel dieses Geräts (Browser dieses Computers oder Telefons) für signierte Konten: Im Gruppenmodus werden Ihre Schreibvorgänge damit signiert. Er bleibt in diesem Browser, nicht exportierbar; ein Admin trägt ihn nach Vergleich des Fingerabdrucks ins Register ein.',
      'Clave de este equipo (navegador de este ordenador o teléfono) para las cuentas firmadas: en modo grupo, sus escrituras se firmarán con ella. Se queda en este navegador, no exportable; un admin la añade al registro tras comparar su huella.'
    ),
    /** Empreinte, trigramme, état (autonome, à confirmer, enrôlé, demande en attente), « Demander l'accès ». */
    async render(body, api) {
      const R = await need('SogRegistry');
      if (!R) {
        body.textContent = K.t(['Module des comptes signés non chargé.', 'Signed accounts module not loaded.',
          'Modul der signierten Konten nicht geladen.', 'Módulo de cuentas firmadas no cargado.'
        ]);
        return;
      }
      const st = await R.refresh(),
        d = await R.deviceState();
      const stateText = !st.group ? K.t(['Centre en mode autonome : rien à demander.',
        'Centre in standalone mode: nothing to request.',
        'Zentrum im autonomen Modus: nichts zu beantragen.', 'Centro en modo autónomo: nada que solicitar.'
      ]) : !st.accepted ? K.t([
        'Registre pas encore accepté sur ce poste : confirmez-le d’abord (ci-dessus).',
        'Registry not accepted on this device yet: confirm it first (above).',
        'Register auf diesem Gerät noch nicht akzeptiert: zuerst bestätigen (oben).',
        'Registro aún no aceptado en este equipo: confírmelo primero (arriba).'
      ]) : d.enrolled ? K.tf(['Poste enrôlé pour {t} ✓', 'Device enrolled for {t} ✓', 'Gerät für {t} eingeschrieben ✓',
        'Equipo inscrito para {t} ✓'
      ], {
        t: d.tri
      }) : d.pending ? K.tf(['Demande envoyée le {d} : en attente d’un admin.', 'Request sent on {d}: waiting for an admin.',
        'Anfrage am {d} gesendet: wartet auf einen Admin.', 'Solicitud enviada el {d}: a la espera de un admin.'
      ], {
        d: String(d.pending.cree || '').slice(0, 16).replace('T', ' ')
      }) : K.t(['Non enrôlé (jamais, ou clé révoquée) : demandez l’accès.', 'Not enrolled (never, or key revoked): request access.',
        'Nicht eingeschrieben (nie, oder Schlüssel widerrufen): Zugang beantragen.',
        'No inscrito (nunca, o clave revocada): solicite acceso.'
      ]);
      const can = st.group && st.accepted && !d.enrolled;
      // fondation (ou refondation) du registre à confirmer : ici aussi, un pilote n'ayant pas l'onglet Centre
      const found = st.pending ? `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Registre du groupe à confirmer', 'Group registry to confirm', 'Gruppenregister zu bestätigen', 'Registro del grupo por confirmar']))}</h3>
          <p>${esc(K.tf(st.pending.kind === 'refonte' ? ['Le registre a été refondé par {tri} (empreinte {court}).', 'The registry has been re-founded by {tri} (fingerprint {court}).', 'Das Register wurde von {tri} neu gegründet (Fingerabdruck {court}).', 'El registro ha sido refundado por {tri} (huella {court}).'] : ['Registre fondé par {tri} (empreinte {court}).', 'Registry founded by {tri} (fingerprint {court}).', 'Register gegründet von {tri} (Fingerabdruck {court}).', 'Registro fundado por {tri} (huella {court}).'], { tri: st.pending.tri, court: st.pending.court }))}</p>
          <p class="sp-hint">${esc(K.t(['Comparez cette empreinte avec celle que l’admin vous a envoyée par un autre canal (Discord, SMS, courriel). Identique : « Confirmer ». Différente : « Refuser », et prévenez l’admin.', 'Compare this fingerprint with the one the admin sent you through another channel (Discord, SMS, email). Identical: “Confirm”. Different: “Reject”, and warn the admin.', 'Vergleichen Sie diesen Fingerabdruck mit dem, den der Admin über einen anderen Kanal geschickt hat (Discord, SMS, E-Mail). Gleich: „Bestätigen“. Anders: „Ablehnen“ und den Admin warnen.', 'Compare esta huella con la que el admin le envió por otro canal (Discord, SMS, correo). Idéntica: «Confirmar». Distinta: «Rechazar», y avise al admin.']))}</p>
          <p class="row"><button type="button" class="primary" data-dev-confirm>${esc(K.t(['Confirmer', 'Confirm', 'Bestätigen', 'Confirmar']))}</button> <button type="button" class="secondary" data-dev-reject>${esc(K.t(['Refuser', 'Reject', 'Ablehnen', 'Rechazar']))}</button></p></div>` : st.status === 'rejete' ? `<div class="sp-card" data-no-i18n><p>${esc(K.t(['Fondation du registre refusée sur ce poste : le registre n’est pas lu.', 'Registry foundation rejected on this device: the registry is not read.', 'Gründung des Registers auf diesem Gerät abgelehnt: Das Register wird nicht gelesen.', 'Fundación del registro rechazada en este equipo: el registro no se lee.']))}</p><p class="row"><button type="button" class="secondary" data-dev-review>${esc(K.t(['Revoir la demande', 'Review the request', 'Anfrage erneut prüfen', 'Revisar la solicitud']))}</button></p></div>` : '';
      body.innerHTML = `${found}<div class="sp-card" data-no-i18n><div class="sp-form">
          <label>${esc(K.t(['Empreinte de ce poste', 'Fingerprint of this device', 'Fingerabdruck dieses Geräts', 'Huella de este equipo']))}</label><b>${esc(d.id?.court || K.t(['pas encore de clé', 'no key yet', 'noch kein Schlüssel', 'aún sin clave']))}</b>
          <label>${esc(K.t(['Trigramme', 'Trigram', 'Kürzel', 'Trigrama']))}</label><span>${esc(d.tri || K.t(['non réglé (Identité et réseaux)', 'not set (Identity and networks)', 'nicht eingestellt (Identität und Netzwerke)', 'no definido (Identidad y redes)']))}</span>
          <label>${esc(K.t(['État', 'State', 'Status', 'Estado']))}</label><span>${esc(stateText)}</span></div>
        ${can ? `<p class="row"><button type="button" class="primary" data-dev-ask>${esc(d.pending ? K.t(['Renvoyer la demande', 'Send the request again', 'Anfrage erneut senden', 'Reenviar la solicitud']) : K.t(['Demander l’accès', 'Request access', 'Zugang beantragen', 'Solicitar acceso']))}</button></p>` : ''}
        <p class="sp-hint">${esc(K.t(['Envoyez l’empreinte de ce poste à un admin par un autre canal (Discord, SMS, courriel) : il la compare avec celle de votre demande avant d’approuver. Navigateur effacé ou autre appareil : nouvelle clé, nouvelle demande.', 'Send the fingerprint of this device to an admin through another channel (Discord, SMS, email): they compare it with the one of your request before approving. Browser cleared or another device: new key, new request.', 'Senden Sie den Fingerabdruck dieses Geräts über einen anderen Kanal an einen Admin (Discord, SMS, E-Mail): Er vergleicht ihn vor der Genehmigung mit dem Ihrer Anfrage. Browser gelöscht oder anderes Gerät: neuer Schlüssel, neue Anfrage.', 'Envíe la huella de este equipo a un admin por otro canal (Discord, SMS, correo): la compara con la de su solicitud antes de aprobar. Navegador borrado u otro dispositivo: nueva clave, nueva solicitud.']))}</p></div>`;
      /** Action sur le registre puis panneau redessiné ; erreur en notification. */
      const act = async fn => {
        try {
          await fn();
        } catch (e) {
          notify(e?.message || String(e), 'err');
        }
        device.render(body, api);
      };
      body.querySelector('[data-dev-confirm]')?.addEventListener('click', () => act(() => R.confirm()));
      body.querySelector('[data-dev-reject]')?.addEventListener('click', () => act(() => R.reject()));
      body.querySelector('[data-dev-review]')?.addEventListener('click', () => act(async () => {
        await window.SogKeys.del('registre', 'rejete');
        await R.refresh();
      }));
      body.querySelector('[data-dev-ask]')?.addEventListener('click', async () => {
        try {
          const r = await R.requestAccess();
          notify(K.tf(['Demande envoyée : empreinte {c}, à transmettre à un admin.',
            'Request sent: fingerprint {c}, to give to an admin.',
            'Anfrage gesendet: Fingerabdruck {c}, an einen Admin weitergeben.',
            'Solicitud enviada: huella {c}, para dar a un admin.'
          ], {
            c: r.court
          }), 'ok');
        } catch (e) {
          notify(e?.message || String(e), 'err');
        }
        device.render(body, api);
      });
      api.status?.(stateText);
    }
  };

  // ---------------------------------------------------------------- Mon profil › Appareils et simulateurs
  const equipment = {
    id: 'equipment',
    group: GROUP_PROFILE,
    title: L('Appareils et simulateurs', 'Aircraft and simulators', 'Luftfahrzeuge und Simulatoren', 'Aeronaves y simuladores'),
    intro: L(
      '« Mes appareils » (flotte comprise, possédés et maîtrisés) et simulateurs installés : le Centre s’en sert pour vous affecter un appareil et réunir des pilotes sur un simulateur commun. Recopiés dans vos semaines de disponibilités déclarées. Les performances de ces appareils sont dans le Carburant (bloc « Profils de performances », mêmes appareils).',
      '“My aircraft” (fleet included, owned and mastered) and installed simulators: the Centre uses them to assign you an aircraft and to gather pilots on a common simulator. Copied into your declared availability weeks. The performance of these aircraft is in Fuel (“Performance profiles” block, same aircraft).',
      '„Meine Luftfahrzeuge“ (Flotte inbegriffen, besessen und beherrscht) und installierte Simulatoren: Das Zentrum nutzt sie für die Zuweisung eines Luftfahrzeugs und um Piloten auf einem gemeinsamen Simulator zusammenzubringen. In Ihre angegebenen Verfügbarkeitswochen übernommen. Die Leistungen dieser Luftfahrzeuge stehen unter Kraftstoff (Block „Leistungsprofile“, dieselben Luftfahrzeuge).',
      '«Mis aeronaves» (flota incluida, poseídas y dominadas) y simuladores instalados: el Centro los usa para asignarle una aeronave y reunir a pilotos en un simulador común. Copiados en sus semanas de disponibilidad declaradas. El rendimiento de estas aeronaves está en Combustible (bloque «Perfiles de rendimiento», mismas aeronaves).'
    ),
    /** Appareils et simulateurs du pilote : éditeur commun (EquipmentEditor) monté pour son trigramme. */
    async render(body, api) {
      // éditeur (shared/equipment_editor.js) : avant, blocs « Mes appareils » et « Mes simulateurs » de Mes missions
      const [A, E] = [await need('MissionAssignments'), await need('EquipmentEditor')],
      tri = A?.trigram?.() || '';
      api.actions([]);
      if (!A || !E || !tri) {
        body.innerHTML = `<p>${esc(!tri && A ? L('Trigramme non réglé : le régler dans « Identité et réseaux ».', 'Trigram not set: set it in “Identity and networks”.', 'Kürzel nicht gesetzt: unter „Identität und Netzwerke“ festlegen.', 'Trigrama no definido: definirlo en «Identidad y redes».') : K.t(['Composant manquant (shared/equipment_editor.js, shared/assignments.js).', 'Missing component (shared/equipment_editor.js, shared/assignments.js).', 'Fehlende Komponente (shared/equipment_editor.js, shared/assignments.js).', 'Falta un componente (shared/equipment_editor.js, shared/assignments.js).']))}</p>`;
        return;
      }
      await E.mount(body, tri);
      api.status(tf(['Pilote {t}', 'Pilot {t}', 'Pilot {t}', 'Piloto {t}'], {
        t: tri
      }));
    }
  };

  // ---------------------------------------------------------------- Installation › Premier lancement
  // v2 : rubrique faite de liens, plus placée sur une page (REPOSITORY_TREE.settings.sections) : l'onglet Premier
  // lancement de Réglages et le bloc « Sources et dossiers » d'Installation la remplacent (rubrique gardée : page sans
  // data-settings, ou nouvelle place à lui donner dans la table)
  const setup = {
    id: 'setup',
    group: L('Installation', 'Installation', 'Installation', 'Instalación'),
    title: L('Premier lancement', 'First run', 'Erststart', 'Primer arranque'),
    intro: L(
      'Réglages faits une fois : données (dépôt framagit ou archive), profil, dossier de l’application, classeur ODV, puis données SIA. La compagnie virtuelle (SO Group Virtual par défaut) et les dossiers se règlent dans « Sources et dossiers », le canal de mise à jour dans Maintenance › Mises à jour.',
      'One-time settings: data (framagit repository or archive), profile, application folder, ODV workbook, then SIA data. The virtual airline (SO Group Virtual by default) and folders are set in “Sources and folders”, the update channel in Maintenance › Updates.',
      'Einmalige Einstellungen: Daten (framagit-Repository oder Archiv), Profil, Anwendungsordner, ODV-Arbeitsmappe, dann SIA-Daten. Virtuelle Fluggesellschaft (standardmäßig SO Group Virtual) und Ordner unter „Quellen und Ordner“, Update-Kanal unter Wartung › Updates.',
      'Ajustes hechos una vez: datos (repositorio framagit o archivo), perfil, carpeta de la aplicación, libro ODV y luego datos SIA. La aerolínea virtual (SO Group Virtual por defecto) y las carpetas se ajustan en «Fuentes y carpetas», el canal de actualización en Mantenimiento › Actualizaciones.'
    ),
    /** Premier lancement : date de fin (suiteSetup:v1), liens vers l'assistant, sources et canal de mise à jour. */
    render(body, api) {
      const done = K.store.json('suiteSetup:v1', null);
      body.innerHTML = `<p data-no-i18n>${esc(done?.at ? tf(['Premier lancement terminé le {d}.', 'First run completed on {d}.', 'Erststart abgeschlossen am {d}.', 'Primer arranque terminado el {d}.'], {
          d: new Date(done.at).toLocaleString()
        }) : K.t(['Premier lancement pas encore terminé dans ce navigateur.', 'First run not yet completed in this browser.', 'Erststart in diesem Browser noch nicht abgeschlossen.', 'Primer arranque aún no terminado en este navegador.']))}</p>
        <p class="row"><a class="primary" href="premier_lancement.html?force">${esc(L('Ouvrir le premier lancement', 'Open the first run', 'Erststart öffnen', 'Abrir el primer arranque'))}</a>
          <a class="secondary" href="#sources">${esc(L('Sources et dossiers, compagnie virtuelle', 'Sources and folders, virtual airline', 'Quellen und Ordner, virtuelle Fluggesellschaft', 'Fuentes y carpetas, aerolínea virtual'))}</a>
          <a class="secondary" href="${esc(nav().settingsUrl('updates'))}">${esc(L('Canal de mise à jour', 'Update channel', 'Update-Kanal', 'Canal de actualización'))}</a></p>
        <p class="sp-hint">${esc(L('Recommencer de zéro : « Nettoyer et recommencer… » en bas du premier lancement (efface les réglages de ce navigateur, pas les fichiers).', 'Start over: “Clean and start over…” at the bottom of the first run (clears this browser’s settings, not the files).', 'Neu beginnen: „Bereinigen und neu beginnen…“ unten im Erststart (löscht die Einstellungen dieses Browsers, nicht die Dateien).', 'Empezar de cero: «Limpiar y empezar de nuevo…» al final del primer arranque (borra los ajustes de este navegador, no los archivos).'))}</p>`;
      api.status('');
      api.actions([]);
    }
  };

  /** Attend un composant chargé à la demande par repository_nav.js (SuiteUsers, MissionAssignments). */
  const need = (name, ms = 6000) => new Promise(resolve => {
    const t0 = Date.now();
    (function poll() {
      if (window[name]) return resolve(window[name]);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(poll, 50);
    })();
  });
  /** Résultat d'une écriture du pool (writeData) : gardée dans ce navigateur seulement → alerte donnée par writeData,
   *  avec sa raison réelle (dossier non autorisé, autre copie de la suite…). */
  const wrote = r => r;
  const ROLE_LABEL = {
    admin_centre: L('Administrateur du Centre', 'Centre administrator', 'Administrator des Zentrums', 'Administrador del Centro'),
    utilisateur: L('Utilisateur', 'User', 'Benutzer', 'Usuario')
  };
  const ROLE_ROWS = {
    admin_centre: ['Administrateur du Centre', 'Centre administrator', 'Administrator des Zentrums', 'Administrador del Centro'],
    utilisateur: ['Utilisateur', 'User', 'Benutzer', 'Usuario']
  };
  const MODE_NOTE = {
    develop: L('Mode develop : la sécurité est testée, pas imposée (trigramme libre, connexion facultative).',
      'Develop mode: security is tested, not enforced (free trigram, optional sign-in).',
      'Develop-Modus: Sicherheit wird getestet, nicht erzwungen (freies Kürzel, Anmeldung optional).',
      'Modo develop: la seguridad se prueba, no se impone (trigrama libre, conexión opcional).'),
    production: L('Mode production : connexion exigée pour Mes missions et le Centre, trigramme fixé par la connexion.',
      'Production mode: sign-in required for My missions and the Centre, trigram set by the sign-in.',
      'Produktionsmodus: Anmeldung für Meine Missionen und das Zentrum erforderlich, Kürzel durch die Anmeldung festgelegt.',
      'Modo producción: conexión obligatoria para Mis misiones y el Centro, trigrama fijado por la conexión.')
  };
  L('Les contrôles se font dans le navigateur : ils ne protègent pas vraiment tant que la vérification ne passe pas par le serveur (webservice).',
    'Checks run in the browser: they do not really protect until verification goes through the server (web service).',
    'Die Prüfungen laufen im Browser: Sie schützen erst wirklich, wenn die Prüfung über den Server läuft (Webservice).',
    'Los controles se hacen en el navegador: no protegen de verdad hasta que la verificación pase por el servidor (webservice).');

  // ---------------------------------------------------------------- Mon profil › Connexion et mot de passe
  const account = {
    id: 'account',
    group: GROUP_PROFILE,
    title: L('Connexion et mot de passe', 'Sign-in and password', 'Anmeldung und Passwort', 'Conexión y contraseña'),
    intro: L(
      'Fiche utilisateur partagée (data/utilisateurs/<TRI>.json) : rôle, mot de passe (empreinte PBKDF2 salée, jamais en clair).',
      'Shared user file (data/utilisateurs/<TRI>.json): role, password (salted PBKDF2 hash, never in clear).',
      'Gemeinsame Benutzerdatei (data/utilisateurs/<TRI>.json): Rolle, Passwort (gesalzener PBKDF2-Hash, nie im Klartext).',
      'Ficha de usuario compartida (data/utilisateurs/<TRI>.json): rol, contraseña (huella PBKDF2 con sal, nunca en claro).'),
    /** Connexion (trigramme et mot de passe) ; une fois connecté : changement de mot de passe, déconnexion. */
    async render(body, api) {
      const U = await need('SuiteUsers');
      if (!U) {
        body.textContent = K.t(['Module des utilisateurs non chargé.', 'Users module not loaded.', 'Benutzermodul nicht geladen.',
          'Módulo de usuarios no cargado.'
        ]);
        return;
      }
      await U.loadConfig(true);
      const s = U.session(),
        me = s?.login ? await U.get(s.tri) : null;
      const who = s?.login ? tf(['Connecté : {t} ({r})', 'Signed in: {t} ({r})', 'Angemeldet: {t} ({r})', 'Conectado: {t} ({r})'], {
        t: s.tri,
        r: K.t(ROLE_ROWS[s.role] || [s.role])
      }) : K.t(['Non connecté.', 'Not signed in.', 'Nicht angemeldet.', 'No conectado.']);
      body.innerHTML = `<div class="sp-card"><p class="sp-hint">${esc(MODE_NOTE[U.mode()])}</p><p data-no-i18n><b>${esc(who)}</b>${me?.a_changer ? ` — ${esc(K.t(['mot de passe provisoire, à changer', 'temporary password, to be changed', 'vorläufiges Passwort, zu ändern', 'contraseña provisional, a cambiar']))}` : ''}</p></div>
        ${s?.login ? `<div class="sp-card"><h3>${esc(L('Changer de mot de passe', 'Change password', 'Passwort ändern', 'Cambiar la contraseña'))}</h3><form class="sp-form" data-pw>
            <label>${esc(L('Mot de passe actuel', 'Current password', 'Aktuelles Passwort', 'Contraseña actual'))}</label><input type="password" name="old" autocomplete="current-password">
            <label>${esc(L('Nouveau mot de passe (8 caractères au moins)', 'New password (at least 8 characters)', 'Neues Passwort (mindestens 8 Zeichen)', 'Nueva contraseña (8 caracteres como mínimo)'))}</label><input type="password" name="pw" autocomplete="new-password" minlength="8">
            <label>${esc(L('Confirmation', 'Confirmation', 'Bestätigung', 'Confirmación'))}</label><input type="password" name="pw2" autocomplete="new-password">
            <span></span><button type="submit" class="primary">${esc(L('Changer le mot de passe', 'Change the password', 'Passwort ändern', 'Cambiar la contraseña'))}</button></form></div>` :
          `<div class="sp-card"><h3>${esc(L('Se connecter', 'Sign in', 'Anmelden', 'Conectarse'))}</h3><form class="sp-form" data-login>
            <label>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</label><input name="tri" maxlength="5" autocomplete="username" spellcheck="false" style="text-transform:uppercase">
            <label>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</label><input type="password" name="pw" autocomplete="current-password">
            <span></span><button type="submit" class="primary">${esc(L('Se connecter', 'Sign in', 'Anmelden', 'Conectarse'))}</button></form>
            <p class="sp-hint">${esc(L('En mode develop, une fiche sans mot de passe se connecte sans mot de passe : en définir un ensuite.', 'In develop mode, a user file without a password signs in without one: set one afterwards.', 'Im develop-Modus meldet sich ein Benutzer ohne Passwort ohne Passwort an: danach eines festlegen.', 'En modo develop, una ficha sin contraseña se conecta sin ella: definir una después.'))}</p></div>`}`;
      const login = body.querySelector('[data-login]'),
        pw = body.querySelector('[data-pw]');
      if (login) {
        login.tri.value = A()?.trigram?.() || '';
        login.onsubmit = async e => {
          e.preventDefault();
          try {
            const r = await U.login(login.tri.value, login.pw.value);
            if (r.mustChange) notify(K.t(['Définir maintenant un mot de passe (ou changer le mot de passe provisoire).',
              'Set a password now (or change the temporary password).',
              'Jetzt ein Passwort festlegen (oder das vorläufige ändern).',
              'Definir ahora una contraseña (o cambiar la provisional).'
            ]), 'warn');
            api.show();
          } catch (err) {
            api.status(err.message);
          }
        };
      }
      if (pw) pw.onsubmit = async e => {
        e.preventDefault();
        if (pw.pw.value !== pw.pw2.value) return api.status(K.t(['Les deux saisies diffèrent.', 'The two entries differ.',
          'Die beiden Eingaben unterscheiden sich.', 'Las dos entradas difieren.'
        ]));
        try {
          const r = wrote(await U.changePassword(pw.old.value, pw.pw.value));
          pw.reset();
          // gardé dans ce navigateur (dossier des données non autorisé…) : dit tel quel, la raison suit (alerte de writeData)
          api.status(r?.where === 'local' ? tf(['Mot de passe changé dans ce navigateur seulement : {e}',
            'Password changed in this browser only: {e}', 'Passwort nur in diesem Browser geändert: {e}',
            'Contraseña cambiada solo en este navegador: {e}'
          ], {
            e: r.error?.message || ''
          }) : K.t(['Mot de passe changé.', 'Password changed.', 'Passwort geändert.', 'Contraseña cambiada.']));
        } catch (err) {
          api.status(err.message);
        }
      };
      api.status('');
      api.actions(s?.login ? [
        [L('Se déconnecter', 'Sign out', 'Abmelden', 'Desconectarse'), () => {
          U.logout();
          api.show();
        }]
      ] : []);
    }
  };
  /** Affectations des missions (MissionAssignments), lues à l'appel. */
  const A = () => window.MissionAssignments;

  // ---------------------------------------------------------------- Centre › Utilisateurs et droits
  const GROUP_CENTRE = L('Centre ({CENTRE})', 'Centre ({CENTRE})', 'Zentrum ({CENTRE})', 'Centro ({CENTRE})');
  const users = {
    id: 'users',
    group: GROUP_CENTRE,
    title: L('Utilisateurs et droits', 'Users and rights', 'Benutzer und Rechte', 'Usuarios y derechos'),
    intro: L(
      'Une fiche par utilisateur (data/utilisateurs/<TRI>.json, synchronisée) : rôle admin_centre ou utilisateur, actif, mot de passe. Mode develop / production pour toute la compagnie (data/config/suite.json). Un administrateur peut agir en tant qu’un autre utilisateur : un bandeau le rappelle sur toutes les pages et chaque écriture porte « ADM pour TOTO ».',
      'One file per user (data/utilisateurs/<TRI>.json, synchronised): role admin_centre or user, active, password. Develop / production mode for the whole airline (data/config/suite.json). An administrator can act as another user: a banner shows it on every page and every write is signed “ADM pour TOTO”.',
      'Eine Datei pro Benutzer (data/utilisateurs/<TRI>.json, synchronisiert): Rolle admin_centre oder Benutzer, aktiv, Passwort. Modus develop / production für die ganze Gesellschaft (data/config/suite.json). Ein Administrator kann als anderer Benutzer handeln: ein Banner zeigt es auf allen Seiten, jede Schreibung trägt „ADM pour TOTO“.',
      'Una ficha por usuario (data/utilisateurs/<TRI>.json, sincronizada): rol admin_centre o usuario, activo, contraseña. Modo develop / production para toda la compañía (data/config/suite.json). Un administrador puede actuar como otro usuario: una banda lo recuerda en todas las páginas y cada escritura lleva «ADM pour TOTO».'
    ),
    /** Utilisateurs et droits : mode de la compagnie, fiches (nom, rôle, actif), ajout, mot de passe provisoire ;
     *  dossier vide : fiches créées d'après la référence des pilotes. */
    async render(body, api) {
      const U = await need('SuiteUsers');
      if (!U) {
        body.textContent = K.t(['Module des utilisateurs non chargé.', 'Users module not loaded.', 'Benutzermodul nicht geladen.',
          'Módulo de usuarios no cargado.'
        ]);
        return;
      }
      // relecture des fiches (une par utilisateur) : texte d'attente dans le panneau et barre de progression du framework
      body.innerHTML = `<p class="sp-hint">${esc(L('Lecture des fiches utilisateurs…', 'Reading user files…', 'Benutzerdateien werden gelesen…', 'Leyendo las fichas de usuario…'))}</p>`;
      /** Relit toutes les fiches utilisateurs (barre de progression du cadre) ; fiches valides seulement. */
      const readAll = async () => {
        const tris = Object.keys(await U.index(true)).sort();
        const job = window.AppFramework?.task?.(L('Relecture des fiches utilisateurs', 'Reading user files',
          'Benutzerdateien lesen', 'Lectura de las fichas de usuario'), {
          total: tris.length
        });
        let done = 0;
        try {
          const users = await Promise.all(tris.map(async tri => {
            const u = await U.get(tri, {
              fresh: true
            });
            job?.set(++done, tris.length, tri);
            return u;
          }));
          job?.end();
          return users.filter(Boolean);
        } catch (err) {
          job?.fail(err);
          throw err;
        }
      };
      await U.loadConfig(true);
      let list = await readAll();
      // dossier vide : une fiche par pilote de la référence
      if (!list.length && (window.DEFA_REFERENCE?.file || window.DEFA_REFERENCE)?.pilots?.length) {
        const made = await U.seed();
        if (made.length) {
          notify(tf(['{n} fiches créées d’après la référence.', '{n} user files created from the reference.',
            '{n} Benutzerdateien aus der Referenz erstellt.', '{n} fichas creadas a partir de la referencia.'
          ], {
            n: made.length
          }), 'ok');
          if ((A()?.pendingData?.() || []).some(p => p.startsWith('utilisateurs/'))) wrote({
            where: 'local'
          });
        }
        list = await readAll();
      }
      const s = U.session(),
        pending = (A()?.pendingData?.() || []).filter(p => /^(utilisateurs|config)\//.test(p));
      /** État du mot de passe d'une fiche : provisoire, défini ou aucun. */
      const pwState = u => u.mot_de_passe ? (u.a_changer ? L('provisoire', 'temporary', 'vorläufig', 'provisional') : L('défini',
        'set', 'gesetzt', 'definida')) : L('aucun', 'none', 'keins', 'ninguna');
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('Mode de la compagnie', 'Airline mode', 'Modus der Gesellschaft', 'Modo de la compañía'))}</h3>
          <div class="sp-form"><label>${esc(L('Mode', 'Mode', 'Modus', 'Modo'))}</label><select data-mode><option value="develop">develop</option><option value="production">production</option></select></div>
          <p class="sp-hint">${esc(MODE_NOTE[U.mode()])}</p><p class="sp-hint">${esc('Les contrôles se font dans le navigateur : ils ne protègent pas vraiment tant que la vérification ne passe pas par le serveur (webservice).')}</p>
          <p class="sp-hint" data-no-i18n>${esc(s?.login ? tf(['Connecté : {t}', 'Signed in: {t}', 'Angemeldet: {t}', 'Conectado: {t}'], { t: s.tri }) : K.t(['Non connecté (Mon profil › Connexion et mot de passe).', 'Not signed in (My profile › Sign-in and password).', 'Nicht angemeldet (Mein Profil › Anmeldung und Passwort).', 'No conectado (Mi perfil › Conexión y contraseña).']))}</p></div>
        ${pending.length ? `<div class="sp-card" data-no-i18n><p>${esc(tf(['{n} fichier(s) gardé(s) dans ce navigateur, pas encore dans le dossier des données.', '{n} file(s) kept in this browser, not yet in the data folder.', '{n} Datei(en) in diesem Browser, noch nicht im Datenordner.', '{n} archivo(s) guardado(s) en este navegador, aún no en la carpeta de datos.'], { n: pending.length }))}</p><button type="button" class="secondary" data-flush>${esc(K.t(['Écrire dans le dossier des données', 'Write to the data folder', 'In den Datenordner schreiben', 'Escribir en la carpeta de datos']))}</button></div>` : ''}
        <div class="da-scroll"><table class="da-table"><thead><tr><th>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</th><th>${esc(L('Nom affiché', 'Display name', 'Anzeigename', 'Nombre mostrado'))}</th><th>${esc(L('Rôle', 'Role', 'Rolle', 'Rol'))}</th><th>${esc(L('Actif', 'Active', 'Aktiv', 'Activo'))}</th><th>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</th><th></th></tr></thead>
        <tbody>${list.map(u => `<tr data-u="${esc(u.trigramme)}"><td><b>${esc(u.trigramme)}</b></td><td><input data-k="nom" value="${esc(u.nom || '')}"></td>
          <td><select data-k="role">${U.ROLES.map(r => `<option value="${r}"${r === u.role ? ' selected' : ''}>${esc(ROLE_LABEL[r])}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-k="actif"${u.actif !== false ? ' checked' : ''}></td><td>${esc(pwState(u))}</td>
          <td class="row"><button type="button" class="secondary" data-reset>${esc(L('Réinitialiser…', 'Reset…', 'Zurücksetzen…', 'Restablecer…'))}</button><button type="button" class="secondary" data-imp>${esc(L('Usurper', 'Impersonate', 'Übernehmen', 'Suplantar'))}</button></td></tr>`).join('')}</tbody></table></div>
        <div class="sp-card"><h3>${esc(L('Ajouter un utilisateur', 'Add a user', 'Benutzer hinzufügen', 'Añadir un usuario'))}</h3><form class="sp-form" data-add>
          <label>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</label><input name="tri" maxlength="5" required style="text-transform:uppercase">
          <label>${esc(L('Nom affiché', 'Display name', 'Anzeigename', 'Nombre mostrado'))}</label><input name="nom">
          <label>${esc(L('Rôle', 'Role', 'Rolle', 'Rol'))}</label><select name="role">${U.ROLES.map(r => `<option value="${r}">${esc(ROLE_LABEL[r])}</option>`).join('')}</select>
          <span></span><button type="submit" class="primary">${esc(L('Ajouter', 'Add', 'Hinzufügen', 'Añadir'))}</button></form></div>
        <div class="sp-card" data-reset-box hidden><h3 data-no-i18n></h3><form class="sp-form" data-resetf>
          <label>${esc(L('Mot de passe provisoire (8 caractères au moins)', 'Temporary password (at least 8 characters)', 'Vorläufiges Passwort (mindestens 8 Zeichen)', 'Contraseña provisional (8 caracteres como mínimo)'))}</label><input type="password" name="pw" autocomplete="new-password" minlength="8">
          <span></span><button type="submit" class="primary">${esc(L('Réinitialiser le mot de passe', 'Reset the password', 'Passwort zurücksetzen', 'Restablecer la contraseña'))}</button></form></div>`;
      const modeSel = body.querySelector('[data-mode]');
      modeSel.value = U.mode();
      modeSel.onchange = async () => {
        try {
          wrote(await U.setMode(modeSel.value));
          api.show();
        } catch (err) {
          modeSel.value = U.mode();
          notify(err.message, 'warn');
        }
      };
      body.querySelector('[data-flush]')?.addEventListener('click', async () => {
        try {
          const done = await A().flushData();
          notify(tf(['{n} fichier(s) écrit(s) dans le dossier des données.', '{n} file(s) written to the data folder.',
            '{n} Datei(en) in den Datenordner geschrieben.', '{n} archivo(s) escrito(s) en la carpeta de datos.'
          ], {
            n: done.length
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      });
      // modification d'une ligne : fiche réécrite aussitôt
      body.querySelector('tbody').onchange = async e => {
        const tr = e.target.closest('tr[data-u]');
        if (!tr) return;
        try {
          const u = await U.get(tr.dataset.u, {
            fresh: true
          });
          const k = e.target.dataset.k;
          wrote(await U.save({
            ...u,
            [k]: k === 'actif' ? e.target.checked : e.target.value.trim()
          }));
          api.status(tf(['{t} enregistré.', '{t} saved.', '{t} gespeichert.', '{t} guardado.'], {
            t: tr.dataset.u
          }));
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      let resetFor = '';
      body.querySelector('tbody').onclick = async e => {
        const tr = e.target.closest('tr[data-u]');
        if (!tr) return;
        if (e.target.closest('[data-imp]')) {
          try {
            await U.impersonate(tr.dataset.u);
            notify(tf(['Vous agissez en tant que {t}.', 'You are acting as {t}.', 'Sie handeln als {t}.', 'Actúa como {t}.'], {
              t: tr.dataset.u
            }), 'ok');
          } catch (err) {
            notify(err.message, 'warn');
          }
        }
        if (e.target.closest('[data-reset]')) {
          resetFor = tr.dataset.u;
          const box = body.querySelector('[data-reset-box]');
          box.hidden = false;
          box.querySelector('h3').textContent = tf(['Réinitialiser le mot de passe de {t}', 'Reset the password of {t}',
            'Passwort von {t} zurücksetzen', 'Restablecer la contraseña de {t}'
          ], {
            t: resetFor
          });
          box.querySelector('input').focus();
        }
      };
      body.querySelector('[data-resetf]').onsubmit = async e => {
        e.preventDefault();
        try {
          wrote(await U.resetPassword(resetFor, e.target.pw.value));
          notify(tf(['Mot de passe provisoire de {t} enregistré : à changer à sa prochaine connexion.',
            'Temporary password of {t} saved: to be changed at the next sign-in.',
            'Vorläufiges Passwort von {t} gespeichert: bei der nächsten Anmeldung zu ändern.',
            'Contraseña provisional de {t} guardada: a cambiar en la próxima conexión.'
          ], {
            t: resetFor
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      body.querySelector('[data-add]').onsubmit = async e => {
        e.preventDefault();
        const f = e.target;
        try {
          const tri = f.tri.value.trim().toUpperCase();
          wrote(await U.create(tri, {
            nom: f.nom.value.trim(),
            role: f.role.value
          }));
          notify(tf(['{t} ajouté.', '{t} added.', '{t} hinzugefügt.', '{t} añadido.'], {
            t: tri
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      api.status(tf(['{n} utilisateur(s)', '{n} user(s)', '{n} Benutzer', '{n} usuario(s)'], {
        n: list.length
      }));
      api.actions([]);
    }
  };

  // ---------------------------------------------------------------- Mon profil › Préférences de thèmes
  const MODES = [
    ['tous', L('Tous les thèmes du domaine', 'Every theme of the domain', 'Alle Themen des Bereichs', 'Todos los temas del dominio')],
    ['blanche', L('Liste blanche : seulement ces thèmes', 'Allow list: only these themes', 'Positivliste: nur diese Themen',
      'Lista blanca: solo estos temas')],
    ['noire', L('Liste noire : tous sauf ces thèmes', 'Block list: all but these themes', 'Negativliste: alle außer diesen Themen',
      'Lista negra: todos menos estos temas')]
  ];
  const themesPanel = {
    id: 'themes',
    group: GROUP_PROFILE,
    title: L('Types de missions', 'Mission types', 'Missionsarten', 'Tipos de misión'),
    intro: L(
      'Thèmes de mission ouverts par les catégories personnalisées (« sécurité civile personnalisée », « défense personnalisée ») de vos disponibilités : pour chaque domaine, une liste blanche (seulement ces thèmes) ou une liste noire (tous sauf ces thèmes). Gardées dans votre fiche utilisateur, synchronisée.',
      'Mission themes opened by the custom categories (“custom civil security”, “custom defence”) of your availability: for each domain, an allow list (only these themes) or a block list (all but these themes). Kept in your user file, synchronised.',
      'Missionsthemen, die die Kategorien nach Wahl („Zivilschutz nach Wahl“, „Verteidigung nach Wahl“) Ihrer Verfügbarkeit öffnen: je Bereich eine Positivliste (nur diese Themen) oder eine Negativliste (alle außer diesen). In Ihrer synchronisierten Benutzerdatei gespeichert.',
      'Temas de misión abiertos por las categorías personalizadas («seguridad civil personalizada», «defensa personalizada») de su disponibilidad: por dominio, una lista blanca (solo estos temas) o una lista negra (todos menos estos). Guardadas en su ficha de usuario, sincronizada.'
    ),
    /** Préférences de thèmes du pilote par domaine (tous, liste blanche, liste noire) et thèmes réellement ouverts. */
    async render(body, api) {
      const [U, SD] = [await need('SuiteUsers'), await need('SuiteDispos')];
      const tri = A()?.trigram?.() || '';
      if (!U || !SD || !tri) {
        body.innerHTML = `<p>${esc(L('Trigramme non réglé : le régler dans « Identité et réseaux ».', 'Trigram not set: set it in “Identity and networks”.', 'Kürzel nicht gesetzt: unter „Identität und Netzwerke“ festlegen.', 'Trigrama no definido: definirlo en «Identidad y redes».'))}</p>`;
        api.actions([]);
        return;
      }
      const prefs = (await U.themePrefs(tri)) || {};
      body.innerHTML = SD.domains().map(d => {
        const p = prefs[d.id] || {
          mode: 'tous',
          liste: []
        };
        return `<div class="sp-card" data-dom="${esc(d.id)}" data-no-i18n><h3>${esc(SD.label(d.label))}</h3>
          <div class="sp-chips">${MODES.map(([m]) => `<label><input type="radio" name="m-${esc(d.id)}" value="${m}"${(p.mode || 'tous') === m ? ' checked' : ''}> ${esc(K.t(rowOf(m)))}</label>`).join('')}</div>
          <div class="sp-chips" data-list>${d.themes.map(th => `<label><input type="checkbox" value="${esc(th)}"${(p.liste || []).includes(th) ? ' checked' : ''}> <b>${esc(th)}</b> ${esc(SD.themeLabel(th))}</label>`).join('')}</div>
          <p class="sp-hint" data-open></p></div>`;
      }).join('');
      // thèmes réellement ouverts, recalculés à chaque coche
      const read = () => Object.fromEntries([...body.querySelectorAll('[data-dom]')].map(c => [c.dataset.dom, {
        mode: c.querySelector('input[type=radio]:checked')?.value || 'tous',
        liste: [...c.querySelectorAll('[data-list] input:checked')].map(x => x.value)
      }]));
      /** Affiche, par domaine, les thèmes qu'ouvre la catégorie personnalisée avec les choix en cours. */
      const preview = () => {
        const p = read();
        body.querySelectorAll('[data-dom]').forEach(c => {
          const cat = SD.categories({
            all: true
          }).find(x => x.ouverts === `prefs:${c.dataset.dom}`);
          const open = cat ? [...SD.openThemes(cat, p)] : [];
          c.querySelector('[data-list]').style.opacity = p[c.dataset.dom].mode === 'tous' ? '.7' : '';
          c.querySelector('[data-open]').textContent = cat ? tf(['« {c} » ouvre : {t}', '“{c}” opens: {t}', '„{c}“ öffnet: {t}',
            '«{c}» abre: {t}'
          ], {
            c: SD.label(cat.label),
            t: open.map(SD.themeLabel).join(', ') || '—'
          }) : '';
        });
      };
      body.onchange = () => {
        api.changed();
        preview();
      };
      preview();
      api.status(tf(['Pilote {t}', 'Pilot {t}', 'Pilot {t}', 'Piloto {t}'], {
        t: tri
      }));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const p = read();
          // « tous » : pas de liste (préférence effacée pour ce domaine)
          const themes = Object.fromEntries(Object.entries(p).filter(([, v]) => v.mode !== 'tous'));
          wrote(await U.setThemePrefs(tri, themes));
          api.saved();
          api.status(K.t(['Préférences enregistrées.', 'Preferences saved.', 'Präferenzen gespeichert.',
            'Preferencias guardadas.'
          ]));
        }, 'primary']
      ]);
    }
  };
  /** Ligne [fr, en, de, es] du libellé d'un mode de préférence (tous, blanche, noire). */
  const rowOf = m => ({
    tous: ['Tous les thèmes du domaine', 'Every theme of the domain', 'Alle Themen des Bereichs', 'Todos los temas del dominio'],
    blanche: ['Liste blanche : seulement ces thèmes', 'Allow list: only these themes', 'Positivliste: nur diese Themen',
      'Lista blanca: solo estos temas'
    ],
    noire: ['Liste noire : tous sauf ces thèmes', 'Block list: all but these themes', 'Negativliste: alle außer diesen Themen',
      'Lista negra: todos menos estos temas'
    ]
  })[m];

  // ---------------------------------------------------------------- Centre › Catégories de disponibilité
  const OUVERTS = [
    ['all', ['tous les thèmes', 'every theme', 'alle Themen', 'todos los temas']],
    ['none', ['aucun', 'none', 'keine', 'ninguno']]
  ];
  const TYPES = [
    ['dispo', ['disponible', 'available', 'verfügbar', 'disponible']],
    ['atc', ['contrôle', 'control', 'Lotsendienst', 'control']],
    ['occupe', ['occupé', 'busy', 'beschäftigt', 'ocupado']],
    ['indispo', ['indisponible', 'unavailable', 'nicht verfügbar', 'no disponible']]
  ];
  const categoriesPanel = {
    id: 'dispoCategories',
    group: GROUP_CENTRE,
    title: L('Catégories de disponibilité', 'Availability categories', 'Verfügbarkeitskategorien', 'Categorías de disponibilidad'),
    intro: L(
      'Ce que les pilotes déclarent (data/config/disponibilites.json, synchronisé) : groupes affichés dans l’ODV, catégories (libellés, couleur, thèmes ouverts, type, codes du classeur ODV), thèmes par domaine. Une catégorie qui a servi se retire (cachée des listes, gardée pour l’historique), elle ne s’efface pas.',
      'What pilots declare (data/config/disponibilites.json, synchronised): groups shown in the ODV, categories (labels, colour, open themes, type, ODV workbook codes), themes per domain. A category that has been used is retired (hidden from lists, kept for history), never deleted.',
      'Was die Piloten angeben (data/config/disponibilites.json, synchronisiert): in der ODV angezeigte Gruppen, Kategorien (Bezeichnungen, Farbe, offene Themen, Typ, Codes der ODV-Arbeitsmappe), Themen je Bereich. Eine benutzte Kategorie wird zurückgezogen (in Listen ausgeblendet, für den Verlauf behalten), nie gelöscht.',
      'Lo que declaran los pilotos (data/config/disponibilites.json, sincronizado): grupos mostrados en el ODV, categorías (etiquetas, color, temas abiertos, tipo, códigos del libro ODV), temas por dominio. Una categoría usada se retira (oculta en las listas, guardada para el historial), nunca se borra.'
    ),
    /** Catégories de disponibilité du Centre (data/config/disponibilites.json) : catégories, groupes ODV, thèmes par
     *  domaine ; identifiants existants figés (retrait au lieu de suppression), retour aux valeurs par défaut. */
    async render(body, api) {
      const SD = await need('SuiteDispos');
      if (!SD) {
        body.textContent = K.t(['Module des disponibilités non chargé.', 'Availability module not loaded.',
          'Verfügbarkeitsmodul nicht geladen.', 'Módulo de disponibilidad no cargado.'
        ]);
        return;
      }
      const cfg = structuredClone(await SD.load(true));
      const known = new Set((cfg.categories || []).map(c => c.id)); // catégories existantes : identifiant figé, pas de suppression
      /** Options « thèmes ouverts » d'une catégorie : tous, aucun, par domaine, selon les préférences, liste. */
      const ouvertsOpts = c => {
        const v = Array.isArray(c.ouverts) ? 'list' : c.ouverts || 'none';
        return [...OUVERTS, ...cfg.domaines.flatMap(d => [
          [`domain:${d.id}`, [`domaine ${SD.label(d.label)} : {t}`, `domain ${SD.label(d.label)}: {t}`, `Bereich ${SD.label(d.label)}: {t}`, `dominio ${SD.label(d.label)}: {t}`], d],
          [`prefs:${d.id}`, [`${SD.label(d.label)} selon les préférences, parmi {t}`, `${SD.label(d.label)} per preferences, among {t}`, `${SD.label(d.label)} nach Präferenzen, aus {t}`, `${SD.label(d.label)} según preferencias, entre {t}`], d]
        ]), ['list', ['liste de thèmes', 'theme list', 'Themenliste', 'lista de temas']]].map(([k, row, d]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(d ? tf(row, { t: d.themes.join(' ') }) : K.t(row))}</option>`).join('');
      };
      /** Saisie du libellé français (k0) d'une ligne [fr, en, de, es] ; les autres langues : à l'enregistrement. */
      const L4 = (row, k) => `<input data-k="${k}0" value="${esc((Array.isArray(row) ? row[0] : row) || '')}" style="width:16em">`; // français seul : les autres langues passent par l'audit i18n
      /** Ligne du tableau des catégories (identifiant saisi seulement pour une nouvelle catégorie, sinon figé). */
      const catRow = c => `<tr data-id="${esc(c.id)}"${c.retiree ? ' class="sp-retired"' : ''}><td>${known.has(c.id) ? `<code>${esc(c.id)}</code>` : `<input data-k="id" value="${esc(c.id)}" style="width:8em">`}</td>
        <td><select data-k="groupe">${cfg.groupes.map(g => `<option value="${esc(g.id)}"${g.id === c.groupe ? ' selected' : ''}>${esc(SD.label(g.label))}</option>`).join('')}</select></td>
        <td>${L4(c.label, 'l')}</td><td><input type="color" data-k="couleur" value="${esc(c.couleur || '#bfbfbf')}"></td>
        <td><select data-k="ouverts">${ouvertsOpts(c)}</select><input data-k="liste" value="${esc(Array.isArray(c.ouverts) ? c.ouverts.join(' ') : '')}" placeholder="EXERCICE CONTROLE" title="${esc(K.t(['Thèmes séparés par des espaces', 'Themes separated by spaces', 'Themen durch Leerzeichen getrennt', 'Temas separados por espacios']))}" style="width:9em"${Array.isArray(c.ouverts) ? '' : ' hidden'}></td>
        <td><select data-k="type">${TYPES.map(([k, row]) => `<option value="${k}"${k === c.type ? ' selected' : ''}>${esc(K.t(row))}</option>`).join('')}</select></td>
        <td><input data-k="odv" value="${esc((c.odv || []).join(' '))}" title="${esc(K.t(['Codes des cases du classeur ODV lus comme cette catégorie à l’import, séparés par des espaces ; le premier s’affiche dans la grille des disponibilités', 'ODV workbook cell codes read as this category on import, separated by spaces; the first one is shown in the availability grid', 'Zellcodes der ODV-Arbeitsmappe, die beim Import als diese Kategorie gelesen werden, durch Leerzeichen getrennt; der erste erscheint im Verfügbarkeitsraster', 'Códigos de celda del libro ODV leídos como esta categoría al importar, separados por espacios; el primero se muestra en la cuadrícula de disponibilidad']))}" style="width:6em"></td>
        <td>${known.has(c.id) ? `<input type="checkbox" data-k="retiree"${c.retiree ? ' checked' : ''}>` : `<button type="button" class="repo-plain da-del" data-drop title="${esc(K.t(['Supprimer cette nouvelle catégorie', 'Delete this new category', 'Diese neue Kategorie löschen', 'Eliminar esta nueva categoría']))}">✕</button>`}</td></tr>`;
      /** Dessine les tableaux des catégories, des groupes et des thèmes par domaine. */
      const draw = () => {
        body.innerHTML = `<div data-no-i18n><h3>${esc(K.t(['Catégories', 'Categories', 'Kategorien', 'Categorías']))}</h3><div class="da-scroll"><table class="da-table"><thead><tr><th>id</th><th>${esc(K.t(['Groupe', 'Group', 'Gruppe', 'Grupo']))}</th><th>${esc(K.t(['Libellé', 'Label', 'Bezeichnung', 'Etiqueta']))}</th><th>${esc(K.t(['Couleur', 'Colour', 'Farbe', 'Color']))}</th><th>${esc(K.t(['Thèmes ouverts', 'Open themes', 'Offene Themen', 'Temas abiertos']))}</th><th>Type</th><th>${esc(K.t(['Codes ODV', 'ODV codes', 'ODV-Codes', 'Códigos ODV']))}</th><th>${esc(K.t(['Retirée', 'Retired', 'Zurückgezogen', 'Retirada']))}</th></tr></thead>
          <tbody data-cats>${cfg.categories.map(catRow).join('')}</tbody></table></div>
          <p class="row"><button type="button" class="secondary" data-addcat>${esc(K.t(['Ajouter une catégorie', 'Add a category', 'Kategorie hinzufügen', 'Añadir una categoría']))}</button></p>
          <h3>${esc(K.t(['Groupes (ODV)', 'Groups (ODV)', 'Gruppen (ODV)', 'Grupos (ODV)']))}</h3><table class="da-table"><tbody data-groups>${cfg.groupes.map(g => `<tr data-id="${esc(g.id)}"><td><code>${esc(g.id)}</code></td><td>${L4(g.label, 'l')}</td><td><input type="color" data-k="couleur" value="${esc(g.couleur || '#bfbfbf')}"></td></tr>`).join('')}</tbody></table>
          <h3>${esc(K.t(['Thèmes par domaine', 'Themes per domain', 'Themen je Bereich', 'Temas por dominio']))}</h3><table class="da-table"><tbody data-domains>${cfg.domaines.map(d => `<tr data-id="${esc(d.id)}"><td><code>${esc(d.id)}</code></td><td>${L4(d.label, 'l')}</td><td><input data-k="themes" value="${esc(d.themes.join(' '))}" style="width:28em"></td></tr>`).join('')}</tbody></table>
          <p class="sp-hint">${esc(K.t(['Thème = famille de mission (COMBAT, SAR, HEMS…), séparés par des espaces ; un nouveau thème reçoit son libellé dans le fichier (themes). Libellés en français seulement : les traductions manquantes sont relevées par l’audit des traductions (tools/audit_i18n.html) ; un libellé modifié perd ses traductions jusqu’au prochain audit.', 'Theme = mission family (COMBAT, SAR, HEMS…), separated by spaces; a new theme gets its label in the file (themes). Labels in French only: missing translations are listed by the translation audit (tools/audit_i18n.html); a changed label loses its translations until the next audit.', 'Thema = Missionsfamilie (COMBAT, SAR, HEMS…), durch Leerzeichen getrennt; ein neues Thema erhält seine Bezeichnung in der Datei (themes). Bezeichnungen nur auf Französisch: fehlende Übersetzungen erfasst das Übersetzungsaudit (tools/audit_i18n.html); eine geänderte Bezeichnung verliert ihre Übersetzungen bis zum nächsten Audit.', 'Tema = familia de misión (COMBAT, SAR, HEMS…), separados por espacios; un tema nuevo recibe su etiqueta en el archivo (themes). Etiquetas solo en francés: las traducciones que faltan las recoge la auditoría de traducciones (tools/audit_i18n.html); una etiqueta modificada pierde sus traducciones hasta la próxima auditoría.']))}</p></div>`;
      };
      draw();
      /** Configuration d'après le formulaire. */
      const collect = () => {
        /** Champ data-k=k d'une ligne. */
        const val = (tr, k) => tr.querySelector(`[data-k="${k}"]`);
        // libellé français saisi ; en, de, es gardés s'il n'a pas changé, sinon vidés (l'audit des traductions les relève)
        const lab = (tr, prev) => {
          const old = Array.isArray(prev) ? prev : [prev || ''],
            fr = val(tr, 'l0').value.trim();
          return fr === old[0] ? [fr, ...[1, 2, 3].map(i => old[i] || '')] : [fr, '', '', ''];
        };
        const cats = [...body.querySelectorAll('[data-cats] tr')].map(tr => {
          const id = known.has(tr.dataset.id) ? tr.dataset.id : val(tr, 'id').value.trim().toLowerCase().replace(/[^a-z0-9_]+/g,
            '_');
          const o = val(tr, 'ouverts').value;
          const prev = cfg.categories.find(c => c.id === tr.dataset.id) || {};
          return {
            ...prev,
            id,
            groupe: val(tr, 'groupe').value,
            type: val(tr, 'type').value,
            label: lab(tr, prev.label),
            couleur: val(tr, 'couleur').value,
            ouverts: o === 'list' ? val(tr, 'liste').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean) : o,
            odv: val(tr, 'odv').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean),
            ...(known.has(tr.dataset.id) ? {
              retiree: val(tr, 'retiree').checked || undefined
            } : {})
          };
        });
        const groupes = [...body.querySelectorAll('[data-groups] tr')].map(tr => ({
          ...cfg.groupes.find(g => g.id === tr.dataset.id),
          label: lab(tr, cfg.groupes.find(g => g.id === tr.dataset.id)?.label),
          couleur: val(tr, 'couleur').value
        }));
        const domaines = [...body.querySelectorAll('[data-domains] tr')].map(tr => ({
          ...cfg.domaines.find(d => d.id === tr.dataset.id),
          label: lab(tr, cfg.domaines.find(d => d.id === tr.dataset.id)?.label),
          themes: val(tr, 'themes').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean)
        }));
        return {
          ...cfg,
          categories: cats,
          groupes,
          domaines
        };
      };
      body.oninput = body.onchange = e => {
        if (e.target.matches('[data-k="ouverts"]')) e.target.nextElementSibling.hidden = e.target.value !== 'list';
        api.changed();
      };
      body.onclick = e => {
        if (e.target.closest('[data-addcat]')) {
          Object.assign(cfg, collect());
          cfg.categories.push({
            id: `categorie_${cfg.categories.length + 1}`,
            groupe: 'dispo',
            type: 'dispo',
            label: ['', '', '', ''],
            couleur: '#7f9cc0',
            ouverts: 'none',
            odv: []
          });
          draw();
          api.changed();
        }
        const drop = e.target.closest('[data-drop]');
        if (drop) {
          drop.closest('tr').remove();
          api.changed();
        }
      };
      api.status(tf(['{n} catégorie(s), {r} retirée(s)', '{n} categor(y/ies), {r} retired', '{n} Kategorie(n), {r} zurückgezogen',
        '{n} categoría(s), {r} retirada(s)'
      ], {
        n: cfg.categories.length,
        r: cfg.categories.filter(c => c.retiree).length
      }));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const next = collect();
          const ids = next.categories.map(c => c.id);
          if (ids.some(x => !x) || new Set(ids).size !== ids.length) return api.status(K.t([
            'Identifiants vides ou en double.', 'Empty or duplicate ids.', 'Leere oder doppelte Kennungen.',
            'Identificadores vacíos o duplicados.'
          ]));
          if (next.categories.some(c => !c.label[0])) return api.status(K.t([
            'Chaque catégorie a besoin au moins d’un libellé français.',
            'Each category needs at least a French label.',
            'Jede Kategorie braucht mindestens eine französische Bezeichnung.',
            'Cada categoría necesita al menos una etiqueta en francés.'
          ]));
          wrote(await SD.save(next));
          api.saved();
          api.show();
          api.status(K.t(['Catégories enregistrées.', 'Categories saved.', 'Kategorien gespeichert.',
            'Categorías guardadas.'
          ]));
        }, 'primary'],
        [L('Valeurs par défaut', 'Default values', 'Standardwerte', 'Valores por defecto'), async () => {
          if (!await window.AppFramework.ask(K.t([
              'Revenir aux catégories par défaut ? (les catégories ajoutées sont gardées, retirées)',
              'Back to the default categories? (added categories are kept, retired)',
              'Zu den Standardkategorien zurück? (hinzugefügte bleiben, zurückgezogen)',
              '¿Volver a las categorías por defecto? (las añadidas se conservan, retiradas)'
            ]))) return;
          const def = structuredClone(SD.DEFAULT),
            extra = cfg.categories.filter(c => !def.categories.some(d => d.id === c.id)).map(c => ({
              ...c,
              retiree: true
            }));
          wrote(await SD.save({
            ...def,
            categories: [...def.categories, ...extra]
          }));
          api.show();
        }]
      ]);
    }
  };

  // ---- Mode groupe (comptes signés, lot L3 ; shared/sog_registry.js, docs/technique/COMPTES_SIGNES.md) : registre
  // signé des utilisateurs, passage en mode groupe, clé de secours, refondation ; rubrique ouverte même Centre verrouillé
  // (confirmation de la fondation par un pilote, clé de secours quand plus aucun admin n'a son poste)
  const groupe = {
    id: 'groupe',
    group: GROUP_CENTRE,
    title: L('Mode groupe (registre signé)', 'Group mode (signed registry)', 'Gruppenmodus (signiertes Register)',
      'Modo grupo (registro firmado)'),
    intro: L(
      'En mode groupe, rôles, comptes et mots de passe viennent du registre signé des utilisateurs (data/utilisateurs/_registre.json) : chaque navigateur refuse ce qui n’est pas signé par un admin. Clés de poste créées dans ce navigateur, non exportables ; une clé de secours, exportée une fois dans un fichier chiffré, à garder hors ligne.',
      'In group mode, roles, accounts and passwords come from the signed user registry (data/utilisateurs/_registre.json): every browser refuses what is not signed by an admin. Device keys created in this browser, not exportable; a recovery key, exported once to an encrypted file, to be kept offline.',
      'Im Gruppenmodus kommen Rollen, Konten und Passwörter aus dem signierten Benutzerregister (data/utilisateurs/_registre.json): Jeder Browser lehnt ab, was nicht von einem Admin signiert ist. Geräteschlüssel in diesem Browser erzeugt, nicht exportierbar; ein Notfallschlüssel, einmal in eine verschlüsselte Datei exportiert, offline aufzubewahren.',
      'En modo grupo, roles, cuentas y contraseñas vienen del registro firmado de usuarios (data/utilisateurs/_registre.json): cada navegador rechaza lo que no está firmado por un admin. Claves de equipo creadas en este navegador, no exportables; una clave de emergencia, exportada una vez en un archivo cifrado, para guardar fuera de línea.'
    ),
    /** État du registre sur ce poste, demande de confirmation, refus, et actions selon le mode et les droits. */
    async render(body, api) {
      const R = await need('SogRegistry'),
        Sk = await need('SogKeys');
      if (!R || !Sk) {
        body.textContent = K.t(['Module des comptes signés non chargé.', 'Signed accounts module not loaded.',
          'Modul der signierten Konten nicht geladen.', 'Módulo de cuentas firmadas no cargado.'
        ]);
        return;
      }
      const again = () => groupe.render(body, api);
      const st = await R.refresh(),
        c = st.accepted,
        id = await Sk.identity({
          create: false
        }),
        admin = await R.isAdminDevice(),
        centreOn = !!nav()?.cpco?.enabled?.(),
        me = window.SuiteUsers?.effective?.() || '';
      const modeText = !st.group ? K.t(['Autonome (registre non lu)', 'Standalone (registry not read)',
        'Autonom (Register nicht gelesen)',
        'Autónomo (registro no leído)'
      ]) : c?.etat === 'actif' ? K.t(['Groupe — actif', 'Group — active', 'Gruppe — aktiv', 'Grupo — activo']) : K.t([
        'Groupe — en constitution', 'Group — being set up', 'Gruppe — im Aufbau', 'Grupo — en constitución'
      ]);
      const admins = c ? Object.entries(c.utilisateurs || {}).filter(([, u]) => u.role === 'admin_centre' && u.actif !== false) : [];
      const keyLine = k => `${Sk.shortOf(k.kid)}${k.poste ? ` (${k.poste})` : ''}`;
      // enrôlement (S2) : demandes déposées, clés par utilisateur, activation à deux admins à clé
      const reqs = st.group && c ? await R.requests() : [],
        keyed = c ? R.keyedAdmins(c) : [],
        day = v => String(v || '').slice(0, 10);
      const pw2 = name => `<label>${esc(L('Mot de passe de la clé de secours', 'Recovery key password', 'Passwort des Notfallschlüssels', 'Contraseña de la clave de emergencia'))}</label><input type="password" autocomplete="new-password" data-${name}="1">
        <label>${esc(L('Le même, encore', 'Same again', 'Noch einmal', 'La misma, otra vez'))}</label><input type="password" autocomplete="new-password" data-${name}="2">`;
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('État', 'State', 'Status', 'Estado'))}</h3>
          <div class="sp-form" data-no-i18n>
            <label>${esc(K.t(['Mode', 'Mode', 'Modus', 'Modo']))}</label><span>${esc(modeText)}</span>
            <label>${esc(K.t(['Registre', 'Registry', 'Register', 'Registro']))}</label><span>${esc(c ? K.tf(['version {v}, du {d}, par {by}', 'version {v}, of {d}, by {by}', 'Version {v} vom {d}, von {by}', 'versión {v}, del {d}, por {by}'], { v: c.version, d: String(c.updated_at || '').slice(0, 16).replace('T', ' '), by: c.by || '?' }) : K.t(['aucun registre accepté sur ce poste', 'no registry accepted on this device', 'kein Register auf diesem Gerät akzeptiert', 'ningún registro aceptado en este equipo']))}</span>
            ${st.fondateur ? `<label>${esc(K.t(['Fondateur confirmé', 'Confirmed founder', 'Bestätigter Gründer', 'Fundador confirmado']))}</label><span>${esc(`${st.fondateur.tri || ''} ${st.fondateur.court || ''}`)}</span>` : ''}
            ${c ? `<label>${esc(K.t(['Admins', 'Admins', 'Admins', 'Admins']))}</label><span>${admins.map(([tri, u]) => esc(`${tri} — ${(u.cles || []).map(keyLine).join(', ') || K.t(['sans clé de poste', 'no device key', 'ohne Geräteschlüssel', 'sin clave de equipo'])}`)).join('<br>')}</span>
            <label>${esc(K.t(['Clé de secours', 'Recovery key', 'Notfallschlüssel', 'Clave de emergencia']))}</label><span>${esc((c.secours || []).map(k => Sk.shortOf(k.kid)).join(', ') || '—')}</span>` : ''}
            <label>${esc(K.t(['Ce poste', 'This device', 'Dieses Gerät', 'Este equipo']))}</label><span>${esc(id ? `${id.court}${admin ? ` — ${K.t(['admin du registre', 'registry admin', 'Admin des Registers', 'admin del registro'])}` : ''}` : K.t(['pas encore de clé (créée au passage en mode groupe, ou à l’enrôlement)', 'no key yet (created when switching to group mode, or at enrolment)', 'noch kein Schlüssel (beim Wechsel in den Gruppenmodus oder bei der Einschreibung erzeugt)', 'aún sin clave (se crea al pasar a modo grupo, o en la inscripción)']))}</span>
          </div>
          ${st.group && c?.etat !== 'actif' ? `<p class="sp-hint">${esc(L('Groupe en constitution : il faut deux admins avec une clé de poste, en plus de la clé de secours (postes enrôlés par les demandes ci-dessous). D’ici là, rien ne change : le Centre reste accessible par son mot de passe, aucune donnée n’est ignorée ; le registre est signé et vérifié.', 'Group being set up: it needs two admins with a device key, in addition to the recovery key (devices enrolled through the requests below). Until then nothing changes: the Centre stays accessible with its password, no data is ignored; the registry is signed and verified.', 'Gruppe im Aufbau: Es braucht zwei Admins mit Geräteschlüssel, zusätzlich zum Notfallschlüssel (Geräte über die Anfragen unten eingeschrieben). Bis dahin ändert sich nichts: Das Zentrum bleibt per Passwort zugänglich, keine Daten werden ignoriert; das Register ist signiert und geprüft.', 'Grupo en constitución: hacen falta dos admins con clave de equipo, además de la clave de emergencia (equipos inscritos con las solicitudes de abajo). Mientras tanto nada cambia: el Centro sigue accesible con su contraseña, no se ignora ningún dato; el registro está firmado y verificado.'))}</p>` : ''}</div>
        ${st.pending ? `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Fondation à confirmer', 'Foundation to confirm', 'Gründung zu bestätigen', 'Fundación por confirmar']))}</h3>
          <p>${esc(K.tf(st.pending.kind === 'refonte' ? ['Le registre a été refondé par {tri} (empreinte {court}).', 'The registry has been re-founded by {tri} (fingerprint {court}).', 'Das Register wurde von {tri} neu gegründet (Fingerabdruck {court}).', 'El registro ha sido refundado por {tri} (huella {court}).'] : ['Registre fondé par {tri} (empreinte {court}).', 'Registry founded by {tri} (fingerprint {court}).', 'Register gegründet von {tri} (Fingerabdruck {court}).', 'Registro fundado por {tri} (huella {court}).'], { tri: st.pending.tri, court: st.pending.court }))}</p>
          <p class="sp-hint">${esc(K.t(['Comparez cette empreinte avec celle que l’admin vous a envoyée par un autre canal (Discord, SMS, courriel). Identique : « Confirmer ». Différente : « Refuser », et prévenez l’admin.', 'Compare this fingerprint with the one the admin sent you through another channel (Discord, SMS, email). Identical: “Confirm”. Different: “Reject”, and warn the admin.', 'Vergleichen Sie diesen Fingerabdruck mit dem, den der Admin über einen anderen Kanal geschickt hat (Discord, SMS, E-Mail). Gleich: „Bestätigen“. Anders: „Ablehnen“ und den Admin warnen.', 'Compare esta huella con la que el admin le envió por otro canal (Discord, SMS, correo). Idéntica: «Confirmar». Distinta: «Rechazar», y avise al admin.']))}</p>
          <p class="row"><button type="button" class="primary" data-g-confirm>${esc(K.t(['Confirmer', 'Confirm', 'Bestätigen', 'Confirmar']))}</button> <button type="button" class="secondary" data-g-reject>${esc(K.t(['Refuser', 'Reject', 'Ablehnen', 'Rechazar']))}</button></p></div>` : ''}
        ${st.status === 'rejete' ? `<div class="sp-card" data-no-i18n><p>${esc(K.t(['Fondation du registre refusée sur ce poste : le registre n’est pas lu.', 'Registry foundation rejected on this device: the registry is not read.', 'Gründung des Registers auf diesem Gerät abgelehnt: Das Register wird nicht gelesen.', 'Fundación del registro rechazada en este equipo: el registro no se lee.']))}</p><p class="row"><button type="button" class="secondary" data-g-review>${esc(K.t(['Revoir la demande', 'Review the request', 'Anfrage erneut prüfen', 'Revisar la solicitud']))}</button></p></div>` : ''}
        ${st.refus.length ? `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Versions refusées', 'Refused versions', 'Abgelehnte Versionen', 'Versiones rechazadas']))}</h3><p>${st.refus.map(esc).join('<br>')}</p></div>` : ''}
        ${c?.etat === 'actif' ? `<div class="sp-card" data-no-i18n><p>${esc(K.tf(['Groupe actif depuis le {d} : Centre ouvert par la clé d’un admin ; données non signées acceptées (mention « non signé ») jusqu’au {f}, ignorées ensuite.', 'Group active since {d}: Centre opened with an admin key; unsigned data accepted (“unsigned” mention) until {f}, ignored afterwards.', 'Gruppe aktiv seit {d}: Zentrum per Admin-Schlüssel geöffnet; unsignierte Daten bis {f} akzeptiert („unsigniert“), danach ignoriert.', 'Grupo activo desde el {d}: Centro abierto con la clave de un admin; datos no firmados aceptados (mención «no firmado») hasta el {f}, ignorados después.'], { d: day(c.actif_depuis), f: c.actif_depuis ? new Date(Date.parse(c.actif_depuis) + 30 * 864e5).toISOString().slice(0, 10) : '?' }))}</p></div>` : ''}
        ${st.group && c && c.etat !== 'actif' && keyed.length >= 2 ? `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Le groupe peut passer actif', 'The group can become active', 'Die Gruppe kann aktiv werden', 'El grupo puede pasar a activo']))}</h3>
          <p class="sp-hint">${esc(K.tf(['Deux admins ont maintenant une clé de poste ({a}). Une fois le groupe actif : le Centre ne s’ouvre plus que par la clé d’un admin (le mot de passe ne sert plus), et les données non signées restent acceptées 30 jours, avec la mention « non signé », puis sont ignorées.', 'Two admins now have a device key ({a}). Once the group is active: the Centre only opens with an admin key (the password no longer counts), and unsigned data stay accepted for 30 days, with the “unsigned” mention, then are ignored.', 'Zwei Admins haben jetzt einen Geräteschlüssel ({a}). Sobald die Gruppe aktiv ist: Das Zentrum öffnet nur noch per Admin-Schlüssel (das Passwort zählt nicht mehr), und unsignierte Daten bleiben 30 Tage mit dem Vermerk „unsigniert“ akzeptiert, danach werden sie ignoriert.', 'Dos admins tienen ahora clave de equipo ({a}). Una vez activo el grupo: el Centro solo se abre con la clave de un admin (la contraseña ya no cuenta), y los datos no firmados se aceptan 30 días, con la mención «no firmado», y luego se ignoran.'], { a: keyed.join(', ') }))}</p>
          ${admin ? `<p class="row"><button type="button" class="primary" data-g-activate>${esc(K.t(['Activer le groupe', 'Activate the group', 'Gruppe aktivieren', 'Activar el grupo']))}</button></p>` : ''}</div>` : ''}
        ${st.group && c ? `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Demandes d’accès des postes', 'Device access requests', 'Zugangsanfragen der Geräte', 'Solicitudes de acceso de los equipos']))}</h3>
          ${reqs.length ? reqs.map((r, i) => `<p data-g-req="${i}"><b>${esc(r.req.trigramme)}</b> — ${esc(r.req.poste || '?')} — ${esc(String(r.req.cree || '').slice(0, 16).replace('T', ' '))} — ${r.ok ? `<b>${esc(r.court)}</b>${r.nouveau ? ` — ${esc(K.t(['nouvel utilisateur', 'new user', 'neuer Benutzer', 'usuario nuevo']))}` : ''}` : esc(K.tf(['demande invalide : {w}', 'invalid request: {w}', 'ungültige Anfrage: {w}', 'solicitud no válida: {w}'], { w: R.why(r.raison) }))}
            ${admin ? `<br>${r.ok ? `<button type="button" class="primary" data-g-approve="${i}">${esc(K.t(['Approuver', 'Approve', 'Genehmigen', 'Aprobar']))}</button> ` : ''}<button type="button" class="secondary" data-g-refuse="${i}">${esc(K.t(['Refuser', 'Reject', 'Ablehnen', 'Rechazar']))}</button>` : ''}</p>`).join('') : `<p class="sp-hint">${esc(K.t(['Aucune demande en attente. Un pilote la dépose depuis Mon profil › Ce poste.', 'No pending request. A pilot files it from My profile › This device.', 'Keine offene Anfrage. Ein Pilot stellt sie unter Mein Profil › Dieses Gerät.', 'Ninguna solicitud pendiente. Un piloto la presenta desde Mi perfil › Este equipo.']))}</p>`}
          <p class="sp-hint">${esc(K.t(['Avant d’approuver, comparez l’empreinte affichée avec celle que le pilote vous a donnée par un autre canal. Une demande peut venir de n’importe qui ayant accès au dépôt des données : c’est l’empreinte qui prouve le poste.', 'Before approving, compare the fingerprint shown with the one the pilot gave you through another channel. A request can come from anyone with access to the data repository: the fingerprint is what proves the device.', 'Vergleichen Sie vor dem Genehmigen den angezeigten Fingerabdruck mit dem, den der Pilot Ihnen über einen anderen Kanal gegeben hat. Eine Anfrage kann von jedem mit Zugang zum Daten-Repository kommen: Der Fingerabdruck beweist das Gerät.', 'Antes de aprobar, compare la huella mostrada con la que el piloto le dio por otro canal. Una solicitud puede venir de cualquiera con acceso al repositorio de datos: la huella es lo que prueba el equipo.']))}</p></div>
        <div class="sp-card" data-no-i18n><h3>${esc(K.t(['Clés des postes', 'Device keys', 'Geräteschlüssel', 'Claves de los equipos']))}</h3>
          ${Object.entries(c.utilisateurs || {}).filter(([, u]) => (u.cles || []).length).map(([tri, u]) => (u.cles || []).map(k => `<p class="row">${admin ? `<button type="button" class="secondary" data-g-revoke="${esc(tri)}|${esc(k.kid)}">${esc(K.t(['Révoquer', 'Revoke', 'Widerrufen', 'Revocar']))}</button>` : ''}<span><b>${esc(tri)}</b>${u.role === 'admin_centre' ? ` (${esc(K.t(['admin', 'admin', 'Admin', 'admin']))})` : ''} — ${esc(keyLine(k))} — ${esc(day(k.depuis))}</span></p>`).join('')).join('') || `<p class="sp-hint">${esc(K.t(['Aucune clé de poste.', 'No device key.', 'Kein Geräteschlüssel.', 'Ninguna clave de equipo.']))}</p>`}
          <p class="sp-hint">${esc(K.t(['Révoquer : la clé sort du registre, ses signatures suivantes sont refusées. Désactiver un utilisateur (Utilisateurs et droits) révoque toutes ses clés.', 'Revoke: the key leaves the registry, its later signatures are refused. Deactivating a user (Users and rights) revokes all their keys.', 'Widerrufen: Der Schlüssel verlässt das Register, seine späteren Signaturen werden abgelehnt. Einen Benutzer deaktivieren (Benutzer und Rechte) widerruft alle seine Schlüssel.', 'Revocar: la clave sale del registro, sus firmas posteriores se rechazan. Desactivar un usuario (Usuarios y derechos) revoca todas sus claves.']))}</p></div>` : ''}
        ${!st.group ? `<div class="sp-card"><h3>${esc(L('Passer en mode groupe', 'Switch to group mode', 'In den Gruppenmodus wechseln', 'Pasar a modo grupo'))}</h3>
          <p class="sp-hint">${esc(L('Vous devenez le premier admin, avec la clé de ce poste ; les fiches existantes sont reprises dans la version 1 du registre, signée. Une clé de secours est créée et téléchargée (sog-cle-secours-….json), chiffrée par le mot de passe ci-dessous : gardez le fichier hors ligne (clé USB) et le mot de passe à part. Exige le Centre activé et la politique de sécurité du lanceur (CSP).', 'You become the first admin, with this device’s key; the existing user files are taken into version 1 of the registry, signed. A recovery key is created and downloaded (sog-cle-secours-….json), encrypted with the password below: keep the file offline (USB stick) and the password separately. Requires the Centre enabled and the launcher security policy (CSP).', 'Sie werden der erste Admin, mit dem Schlüssel dieses Geräts; die vorhandenen Benutzerdateien gehen in Version 1 des Registers ein, signiert. Ein Notfallschlüssel wird erzeugt und heruntergeladen (sog-cle-secours-….json), mit dem Passwort unten verschlüsselt: Datei offline aufbewahren (USB-Stick), Passwort getrennt. Erfordert das aktivierte Zentrum und die Sicherheitsrichtlinie des Starters (CSP).', 'Usted pasa a ser el primer admin, con la clave de este equipo; las fichas existentes se incorporan a la versión 1 del registro, firmada. Se crea y descarga una clave de emergencia (sog-cle-secours-….json), cifrada con la contraseña de abajo: guarde el archivo fuera de línea (memoria USB) y la contraseña aparte. Exige el Centro activado y la política de seguridad del lanzador (CSP).'))}</p>
          <div class="sp-form">${pw2('g-new')}</div>
          <p class="row"><button type="button" class="primary" data-g-go ${centreOn ? '' : 'disabled'}>${esc(L('Passer en mode groupe', 'Switch to group mode', 'In den Gruppenmodus wechseln', 'Pasar a modo grupo'))}</button></p>
          ${centreOn ? '' : `<p class="sp-hint">${esc(L('Activer d’abord le Centre (rubrique « Accès au Centre et réglages »).', 'Enable the Centre first (“Centre access and settings” section).', 'Zuerst das Zentrum aktivieren (Rubrik „Zugang zum Zentrum und Einstellungen“).', 'Activar primero el Centro (apartado «Acceso al Centro y ajustes»).'))}</p>`}</div>` : ''}
        ${st.group && admin ? `<div class="sp-card"><h3>${esc(L('Nouvelle clé de secours', 'New recovery key', 'Neuer Notfallschlüssel', 'Nueva clave de emergencia'))}</h3>
          <p class="sp-hint">${esc(L('Remplace la clé de secours du registre (l’ancienne ne vaut plus) ; le nouveau fichier est téléchargé.', 'Replaces the registry recovery key (the old one no longer counts); the new file is downloaded.', 'Ersetzt den Notfallschlüssel des Registers (der alte gilt nicht mehr); die neue Datei wird heruntergeladen.', 'Sustituye la clave de emergencia del registro (la anterior deja de valer); se descarga el nuevo archivo.'))}</p>
          <div class="sp-form">${pw2('g-rec')}</div><p class="row"><button type="button" class="secondary" data-g-rec-go>${esc(L('Créer la nouvelle clé de secours', 'Create the new recovery key', 'Neuen Notfallschlüssel erzeugen', 'Crear la nueva clave de emergencia'))}</button>
          <button type="button" class="secondary" data-g-leave>${esc(L('Revenir au mode autonome', 'Back to standalone mode', 'Zurück zum autonomen Modus', 'Volver al modo autónomo'))}</button></p></div>` : ''}
        ${st.group ? `<div class="sp-card"><h3>${esc(L('Utiliser la clé de secours', 'Use the recovery key', 'Notfallschlüssel verwenden', 'Usar la clave de emergencia'))}</h3>
          <p class="sp-hint">${esc(L('Quand les admins ont perdu leur poste : le trigramme choisi devient admin, avec la clé de ce poste ; la nouvelle version est signée par la clé de secours (trace « secours » dans le registre).', 'When the admins have lost their devices: the chosen trigram becomes admin, with this device’s key; the new version is signed by the recovery key (“secours” trace in the registry).', 'Wenn die Admins ihre Geräte verloren haben: Das gewählte Kürzel wird Admin, mit dem Schlüssel dieses Geräts; die neue Version wird vom Notfallschlüssel signiert (Spur „secours“ im Register).', 'Cuando los admins han perdido su equipo: el trigrama elegido pasa a ser admin, con la clave de este equipo; la nueva versión la firma la clave de emergencia (rastro «secours» en el registro).'))}</p>
          <div class="sp-form"><label>${esc(L('Fichier de la clé de secours', 'Recovery key file', 'Datei des Notfallschlüssels', 'Archivo de la clave de emergencia'))}</label><input type="file" accept=".json,application/json" data-g-file>
          <label>${esc(L('Mot de passe de la clé de secours', 'Recovery key password', 'Passwort des Notfallschlüssels', 'Contraseña de la clave de emergencia'))}</label><input type="password" autocomplete="off" data-g-filepw>
          <label>${esc(L('Trigramme qui devient admin', 'Trigram that becomes admin', 'Kürzel, das Admin wird', 'Trigrama que pasa a ser admin'))}</label><input type="text" maxlength="5" data-g-tri value="${esc(me)}"></div>
          <p class="row"><button type="button" class="secondary" data-g-use>${esc(L('Signer avec la clé de secours', 'Sign with the recovery key', 'Mit dem Notfallschlüssel signieren', 'Firmar con la clave de emergencia'))}</button></p></div>
          <details class="sp-card"><summary>${esc(L('Refonder le groupe (dernier recours)', 'Re-found the group (last resort)', 'Gruppe neu gründen (letzter Ausweg)', 'Refundar el grupo (último recurso)'))}</summary>
          <p class="sp-hint">${esc(L('Si toutes les clés d’admin et la clé de secours sont perdues : nouveau registre en version 1 (nouveau groupe), signé par ce poste, avec une nouvelle clé de secours. Chaque autre poste devra confirmer votre empreinte, reçue par un autre canal ; sans confirmation, il garde l’ancien registre.', 'If all admin keys and the recovery key are lost: new registry in version 1 (new group), signed by this device, with a new recovery key. Every other device will have to confirm your fingerprint, received through another channel; without confirmation, it keeps the old registry.', 'Wenn alle Admin-Schlüssel und der Notfallschlüssel verloren sind: neues Register in Version 1 (neue Gruppe), von diesem Gerät signiert, mit neuem Notfallschlüssel. Jedes andere Gerät muss Ihren Fingerabdruck bestätigen, über einen anderen Kanal erhalten; ohne Bestätigung behält es das alte Register.', 'Si se han perdido todas las claves de admin y la clave de emergencia: nuevo registro en versión 1 (nuevo grupo), firmado por este equipo, con una nueva clave de emergencia. Cada otro equipo tendrá que confirmar su huella, recibida por otro canal; sin confirmación, conserva el registro anterior.'))}</p>
          <div class="sp-form">${pw2('g-ref')}</div><p class="row"><button type="button" class="secondary" data-g-refound>${esc(L('Refonder le groupe', 'Re-found the group', 'Gruppe neu gründen', 'Refundar el grupo'))}</button></p></details>` : ''}`;
      const $ = s => body.querySelector(s);
      /** Mot de passe saisi deux fois (champs data-<name>="1" et "2") : la valeur, ou une erreur affichée et null. */
      const twice = name => {
        const a = body.querySelector(`[data-${name}="1"]`).value,
          b = body.querySelector(`[data-${name}="2"]`).value;
        if (a.length < 8) return notify(R.why('mot-de-passe-court'), 'warn'), null;
        if (a !== b) return notify(K.t(['Les deux mots de passe diffèrent.', 'The two passwords differ.',
          'Die beiden Passwörter unterscheiden sich.', 'Las dos contraseñas no coinciden.'
        ]), 'warn'), null;
        return a;
      };
      /** Lance une action du registre ; erreur → notification ; puis panneau redessiné. */
      const run = async (fn, okText) => {
        try {
          await fn();
          if (okText) notify(K.t(okText), 'ok');
        } catch (e) {
          notify(e?.message || String(e), 'err');
        }
        again();
      };
      body.querySelectorAll('[data-g-approve]').forEach(b => b.addEventListener('click', async () => {
        const r = reqs[+b.dataset.gApprove];
        if (await window.AppFramework?.ask?.(K.tf([
            'Approuver le poste « {p} » de {t} ? L’empreinte {c} doit être exactement celle que le pilote vous a donnée.',
            'Approve the device “{p}” of {t}? The fingerprint {c} must be exactly the one the pilot gave you.',
            'Gerät „{p}“ von {t} genehmigen? Der Fingerabdruck {c} muss genau der sein, den der Pilot Ihnen gegeben hat.',
            '¿Aprobar el equipo «{p}» de {t}? La huella {c} debe ser exactamente la que le dio el piloto.'
          ], {
            p: r.req.poste || '?',
            t: r.req.trigramme,
            c: r.court
          })) === false) return;
        run(() => R.approve(r), ['Poste approuvé : clé ajoutée au registre.', 'Device approved: key added to the registry.',
          'Gerät genehmigt: Schlüssel ins Register eingetragen.', 'Equipo aprobado: clave añadida al registro.'
        ]);
      }));
      body.querySelectorAll('[data-g-refuse]').forEach(b => b.addEventListener('click', () => run(() => R.rejectRequest(reqs[+b
        .dataset.gRefuse]), ['Demande refusée et retirée.', 'Request rejected and removed.',
        'Anfrage abgelehnt und entfernt.', 'Solicitud rechazada y retirada.'
      ])));
      body.querySelectorAll('[data-g-revoke]').forEach(b => b.addEventListener('click', async () => {
        const [tri, kid] = b.dataset.gRevoke.split('|');
        if (await window.AppFramework?.ask?.(K.tf([
            'Révoquer la clé {c} de {t} ? Ses signatures suivantes seront refusées ; le poste devra refaire une demande.',
            'Revoke the key {c} of {t}? Its later signatures will be refused; the device will have to request again.',
            'Schlüssel {c} von {t} widerrufen? Seine späteren Signaturen werden abgelehnt; das Gerät muss neu beantragen.',
            '¿Revocar la clave {c} de {t}? Sus firmas posteriores se rechazarán; el equipo tendrá que solicitarlo de nuevo.'
          ], {
            c: Sk.shortOf(kid),
            t: tri
          }), {
            danger: true
          }) === false) return;
        run(() => R.revokeKey(tri, kid), ['Clé révoquée.', 'Key revoked.', 'Schlüssel widerrufen.', 'Clave revocada.']);
      }));
      $('[data-g-activate]')?.addEventListener('click', async () => {
        if (await window.AppFramework?.ask?.(K.t([
            'Activer le groupe ? Le Centre ne s’ouvrira plus que par la clé d’un admin, et les données non signées seront ignorées dans 30 jours.',
            'Activate the group? The Centre will only open with an admin key, and unsigned data will be ignored in 30 days.',
            'Gruppe aktivieren? Das Zentrum öffnet nur noch per Admin-Schlüssel, und unsignierte Daten werden in 30 Tagen ignoriert.',
            '¿Activar el grupo? El Centro solo se abrirá con la clave de un admin, y los datos no firmados se ignorarán dentro de 30 días.'
          ]), {
            danger: true
          }) === false) return;
        run(() => R.activate(), ['Groupe actif.', 'Group active.', 'Gruppe aktiv.', 'Grupo activo.']);
      });
      $('[data-g-confirm]')?.addEventListener('click', () => run(() => R.confirm(), ['Registre accepté sur ce poste.',
        'Registry accepted on this device.', 'Register auf diesem Gerät akzeptiert.', 'Registro aceptado en este equipo.'
      ]));
      $('[data-g-reject]')?.addEventListener('click', () => run(() => R.reject()));
      $('[data-g-review]')?.addEventListener('click', () => run(async () => {
        await Sk.del('registre', 'rejete');
        await R.refresh();
      }));
      $('[data-g-go]')?.addEventListener('click', () => {
        const pw = twice('g-new');
        if (pw) run(() => R.goGroup(pw), ['Mode groupe en place : version 1 du registre signée, clé de secours téléchargée.',
          'Group mode in place: registry version 1 signed, recovery key downloaded.',
          'Gruppenmodus eingerichtet: Version 1 des Registers signiert, Notfallschlüssel heruntergeladen.',
          'Modo grupo activo: versión 1 del registro firmada, clave de emergencia descargada.'
        ]);
      });
      $('[data-g-rec-go]')?.addEventListener('click', () => {
        const pw = twice('g-rec');
        if (pw) run(() => R.newRecovery(pw), ['Nouvelle clé de secours en place et téléchargée.',
          'New recovery key in place and downloaded.', 'Neuer Notfallschlüssel eingerichtet und heruntergeladen.',
          'Nueva clave de emergencia activa y descargada.'
        ]);
      });
      $('[data-g-leave]')?.addEventListener('click', async () => {
        if (await window.AppFramework?.ask?.(K.t([
            'Revenir au mode autonome ? Le registre reste dans les données mais n’est plus lu ; rôles et mots de passe redeviennent ceux des fiches.',
            'Back to standalone mode? The registry stays in the data but is no longer read; roles and passwords are those of the user files again.',
            'Zurück zum autonomen Modus? Das Register bleibt in den Daten, wird aber nicht mehr gelesen; Rollen und Passwörter sind wieder die der Benutzerdateien.',
            '¿Volver al modo autónomo? El registro queda en los datos pero ya no se lee; roles y contraseñas vuelven a ser los de las fichas.'
          ]), {
            danger: true
          }) === false) return;
        run(() => R.leaveGroup());
      });
      $('[data-g-use]')?.addEventListener('click', async () => {
        const f = $('[data-g-file]').files?.[0];
        if (!f) return notify(K.t(['Choisir le fichier de la clé de secours.', 'Choose the recovery key file.',
          'Datei des Notfallschlüssels wählen.', 'Elegir el archivo de la clave de emergencia.'
        ]), 'warn');
        const text = await f.text();
        run(() => R.useRecovery(text, $('[data-g-filepw]').value, $('[data-g-tri]').value), [
          'Nouvelle version signée par la clé de secours.', 'New version signed by the recovery key.',
          'Neue Version vom Notfallschlüssel signiert.', 'Nueva versión firmada por la clave de emergencia.'
        ]);
      });
      $('[data-g-refound]')?.addEventListener('click', async () => {
        const pw = twice('g-ref');
        if (!pw) return;
        if (await window.AppFramework?.ask?.(K.t([
            'Refonder le groupe ? Tous les autres postes devront confirmer votre empreinte ; l’ancien registre ne vaudra plus que pour ceux qui refusent.',
            'Re-found the group? Every other device will have to confirm your fingerprint; the old registry will only count for those who refuse.',
            'Die Gruppe neu gründen? Alle anderen Geräte müssen Ihren Fingerabdruck bestätigen; das alte Register gilt nur noch für die, die ablehnen.',
            '¿Refundar el grupo? Todos los demás equipos tendrán que confirmar su huella; el registro anterior solo valdrá para quienes lo rechacen.'
          ]), {
            danger: true
          }) === false) return;
        run(() => R.refound(pw), ['Groupe refondé : envoyez votre empreinte aux pilotes par un autre canal.',
          'Group re-founded: send your fingerprint to the pilots through another channel.',
          'Gruppe neu gegründet: Fingerabdruck über einen anderen Kanal an die Piloten senden.',
          'Grupo refundado: envíe su huella a los pilotos por otro canal.'
        ]);
      });
      api.status?.(modeText);
    }
  };

  window.SettingsPanels = {
    list: [levelPanel, identity, dataAccess, device, account, themesPanel, equipment, setup, users, groupe, categoriesPanel],
    /** Ajoute une rubrique (autre module : utilisateurs, catégories de disponibilité). */
    add(panel) {
      this.list.push(panel);
    },
    L,
    rows
  };
  /** Inscrit les libellés en attente auprès de la couche de traduction (shared/content_i18n.js). */
  const reg = () => rows.length && window.RepositoryContentI18n?.(rows.splice(0));
  window.RepositoryContentI18n ? reg() : addEventListener('DOMContentLoaded', reg, {
    once: true
  });
})();
