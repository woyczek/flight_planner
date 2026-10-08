(() => {
  'use strict';
  // Paramètres › Maintenance (apps/settings/maintenance.html) : mises à jour de la suite (canal, mode, contrôle), versions des
  // données et dates de synchronisation, références et dépendances, mise à jour pas à pas des données SIA (AIRAC) avec
  // recalculs simples, sauvegarde totale (navigateur + fichiers connus des dossiers autorisés) et journal des
  // sauvegardes / rechargements.
  // S'appuie sur SuiteUpdate (suite_update.js), Airac (airac.js), ZipStore (zip_store.js), FileAccess, LocalStore.
  // Page autonome (#maintenance) ou rubrique « Maintenance » de Paramètres (#dataAdmin, construit par data_admin.js) :
  // dans Paramètres, chaque bloc a son entrée dans le menu latéral et s'affiche à la place de l'éditeur de base.
  // Un bloc peut être sur plusieurs pages de Paramètres (REPOSITORY_TREE.settings.sections : « installation,maintenance »
  // pour les données aéronautiques et les types d'aéronefs : mise en place sur Installation, mise à jour sur Maintenance).
  // Page autonome réduite à quelques blocs : <div id="maintenance" data-blocks="sia,types"> (premier lancement).
  const main = document.getElementById('maintenance') || document.getElementById('dataAdmin');
  if (!main) return;
  const embedded = main.id === 'dataAdmin';
  const LANGS = ['fr', 'en', 'de', 'es'];
  /** Indice de la langue courante dans LANGS (0 = français, repli si langue inconnue). */
  const li = () => Math.max(0, LANGS.indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  /** Texte d'une ligne [fr, en, de, es] (repli : anglais puis français), variables {x} remplacées. */
  const t = (row, vars = {}) => {
    const s = Array.isArray(row) ? (row[li()] || row[1] || row[0]) : String(row ?? '');
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  /** Locale Intl de la langue courante (fr-FR, en-GB, de-DE, es-ES). */
  const locale = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][li()];
  /** Date lisible dans la langue courante (avec l'heure si time) ; « — » si vide, la valeur échappée si illisible. */
  const fmtDate = (v, time = true) => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return esc(v);
    return time ? d.toLocaleString(locale(), {
      dateStyle: 'short',
      timeStyle: 'short'
    }) : d.toLocaleDateString(locale());
  };
  /** Taille en octets rendue en « o », « Ko » ou « Mo ». */
  const fmtSize = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : n >= 1024 ? `${Math.round(n / 1024)} Ko` : `${n || 0} o`;
  /** Ancienneté d'une date en jours (« aujourd'hui », « il y a n j ») ; chaîne vide si pas de date. */
  const ago = v => {
    if (!v) return '';
    const d = (Date.now() - new Date(v).getTime()) / 864e5;
    return d < 1 ? t(['aujourd’hui', 'today', 'heute', 'hoy']) : t(['il y a {n} j', '{n} d ago', 'vor {n} T', 'hace {n} d'], {
      n: Math.floor(d)
    });
  };
  /** Pastille d'état HTML (level : ok ✓, warn ⚠, err ✗, sinon ℹ) suivie du texte échappé. */
  const pill = (level, text) => `<span class="mt-pill mt-${level}">${level === 'ok' ? '✓' : level === 'warn' ? '⚠' : level === 'err' ? '✗' : 'ℹ'} ${esc(text)}</span>`;
  /** Registre des missions : index IndexedDB (shared/data_index.js), sinon ancienne copie du navigateur. */
  const regIndex = async () => {
    await window.MissionIndex?.ready;
    return window.MissionIndex ? {
      missions: window.MissionIndex.all(),
      updatedAt: window.MissionIndex.updatedAt()
    } : readJson('missionRegistry:v1', null);
  };
  /** Valeur JSON de la clé k du localStorage ; d si absente ou illisible. */
  const readJson = (k, d = null) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
    } catch {
      return d;
    }
  };
  /** Écrit v en JSON sous la clé k du localStorage (quota dépassé : ignoré en silence). */
  const writeJson = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* quota */
    }
  };
  /** URL racine de la suite (RepositoryNav.root, sinon dossier parent de la page). */
  const root = () => window.RepositoryNav?.root || new URL('../', location.href).href;
  /** Attend un composant chargé à la demande par repository_nav.js (FileAccess, LocalStore, SuiteUpdate). */
  const waitFor = (name, ms = 6000) => new Promise(resolve => {
    const t0 = Date.now();
    (function poll() {
      if (window[name]) return resolve(window[name]);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(poll, 60);
    })();
  });

  // ---- dossiers autorisés
  /** Dossier mémorisé (FileAccess) avec autorisation ; request : demande l'autorisation (geste de l'utilisateur requis). */
  async function folder(key, request = false) {
    const FA = await waitFor('FileAccess');
    if (!FA) return null;
    const st = await FA.status(key);
    if (!st.handle) return null;
    if (st.permission === 'granted') return st.handle;
    if (!request) return null;
    try {
      return (await st.handle.requestPermission({
        mode: 'readwrite'
      })) === 'granted' ? st.handle : null;
    } catch {
      return null;
    }
  }
  /** Fichier (File) d'un chemin relatif sous un dossier ; null si absent. */
  async function fileAt(dir, path) {
    try {
      const bits = path.split('/').filter(Boolean);
      let h = dir;
      for (let i = 0; i < bits.length - 1; i++) h = await h.getDirectoryHandle(bits[i]);
      return await (await h.getFileHandle(bits[bits.length - 1])).getFile();
    } catch {
      return null;
    }
  }
  /** Écrit un fichier (chemin relatif, dossiers créés au besoin). */
  async function writeAt(dir, path, data) {
    const bits = path.split('/').filter(Boolean);
    let h = dir;
    for (let i = 0; i < bits.length - 1; i++) h = await h.getDirectoryHandle(bits[i], {
      create: true
    });
    const w = await (await h.getFileHandle(bits[bits.length - 1], {
      create: true
    })).createWritable();
    await w.write(data);
    await w.close();
  }
  /** Fichiers d'un dossier : [{ path, file }] ; recursive (profondeur ≤ 4), filtre sur le chemin relatif. */
  async function listFiles(dir, {
    recursive = false,
    filter = () => true,
    depth = 0,
    base = ''
  } = {}) {
    const out = [];
    if (!dir) return out;
    for await (const [name, h] of dir.entries()) {
      const path = base + name;
      if (h.kind === 'directory') {
        if (recursive && depth < 4 && !/^(\.git|node_modules|_archives|_avant_restauration|sauvegardes|local|__pycache__)$/i.test(name))
          out.push(...await listFiles(h, {
            recursive,
            filter,
            depth: depth + 1,
            base: path + '/'
          }));
      } else if (filter(path, name)) {
        try {
          out.push({
            path,
            file: await h.getFile()
          });
        } catch {
          /* verrouillé */
        }
      }
    }
    return out;
  }
  /** Bouton de choix d'un dossier de la suite (libellé « Dossier … : nom ✓ », infobulle) ; after : rappel. */
  function folderButton(key, after, {
    withLabel = true
  } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secondary mt-folder';
    b.dataset.icon = 'folder';
    b.onclick = async () => {
      try {
        await window.FileAccess.pickFolder(key);
        after?.();
      } catch (e) {
        if (e?.name !== 'AbortError' && e?.message !== 'Dossier refusé')(window.AppFramework?.notify || alert)(e.message, 'warn');
      }
    };
    waitFor('FileAccess').then(FA => FA?.decorate(b, key, {
      withLabel
    }));
    return b;
  }

  // ---- blocs
  const BLOCKS = [{
    id: 'updates',
    icon: 'refresh',
    title: ['Mises à jour de la suite', 'Suite updates', 'Aktualisierungen der Suite', 'Actualizaciones de la suite'],
    sub: ['Canal (stable / early bird), contrôle manuel, automatique ou désactivé, état du dépôt git',
      'Channel (stable / early bird), manual, automatic or disabled check, git repository state',
      'Kanal (stabil / Early Bird), manuelle, automatische oder deaktivierte Prüfung, Git-Status',
      'Canal (estable / early bird), comprobación manual, automática o desactivada, estado git'
    ]
  }, {
    id: 'sources',
    icon: 'folder',
    title: ['Sources et dossiers', 'Sources and folders', 'Quellen und Ordner', 'Fuentes y carpetas'],
    sub: [
      'Dossiers locaux (dépôt, registres, missions, SIA, X-Plane…) et adresses des sources externes (compagnie, SIA, dépôts) : un seul endroit pour les régler',
      'Local folders (repository, ledgers, missions, SIA, X-Plane…) and external source addresses (airline, SIA, repositories): one place to set them',
      'Lokale Ordner und Adressen externer Quellen (Fluggesellschaft, SIA, Repositorys) an einem Ort',
      'Carpetas locales y direcciones de fuentes externas (aerolínea, SIA, repositorios) en un solo lugar'
    ]
  }, {
    id: 'versions',
    icon: 'layers',
    title: ['Versions et synchronisations', 'Versions and synchronisation', 'Versionen und Synchronisation',
      'Versiones y sincronización'
    ],
    sub: ['Version de chaque élément (code, git, AIRAC, bases, plans de vol…) et date de sa dernière mise à jour',
      'Version of each asset (code, git, AIRAC, databases, flight plans…) and date of its last update',
      'Version jedes Elements (Code, Git, AIRAC, Datenbanken, Flugpläne…) und Datum der letzten Aktualisierung',
      'Versión de cada elemento (código, git, AIRAC, bases, planes de vuelo…) y fecha de su última actualización'
    ]
  }, {
    id: 'deps',
    icon: 'link',
    title: ['Références et dépendances', 'References and dependencies', 'Referenzen und Abhängigkeiten',
      'Referencias y dependencias'
    ],
    sub: ['Chaque référence : tracée, processus de mise à jour, données qui en dépendent, cohérence vérifiée',
      'Each reference: traced, update process, dependent data, consistency checked',
      'Jede Referenz: nachverfolgt, Aktualisierungsprozess, abhängige Daten, geprüfte Konsistenz',
      'Cada referencia: trazada, proceso de actualización, datos dependientes, coherencia comprobada'
    ]
  }, {
    id: 'sia',
    icon: 'map',
    title: ['Données aéronautiques : zones du monde, sources et cycles AIRAC',
      'Aeronautical data: world zones, sources and AIRAC cycles', 'Luftfahrtdaten: Zonen der Welt, Quellen und AIRAC-Zyklen',
      'Datos aeronáuticos: zonas del mundo, fuentes y ciclos AIRAC'
    ],
    sub: [
      'Carte des zones (pays) : zones actives, sources de chacune (téléchargement, commande, PDF, dossier) et leur état ; reconstruction de la base aéronautique, âge des données, MORA, cohérence',
      'Zone map (countries): active zones, the sources of each (download, order, PDF, folder) and their state; aeronautical database rebuild, data age, MORA, consistency',
      'Zonenkarte (Länder): aktive Zonen, ihre Quellen (Download, Bestellung, PDF, Ordner) und deren Stand; Neuaufbau der Luftfahrtdatenbank, Alter der Daten, MORA, Konsistenz',
      'Mapa de zonas (países): zonas activas, fuentes de cada una (descarga, pedido, PDF, carpeta) y su estado; reconstrucción de la base aeronáutica, antigüedad de los datos, MORA, coherencia'
    ]
  }, {
    id: 'types',
    icon: 'plane',
    title: ['Types d’aéronefs (OACI et performances)', 'Aircraft types (ICAO and performance)',
      'Luftfahrzeugtypen (ICAO und Leistungen)', 'Tipos de aeronave (OACI y rendimientos)'
    ],
    sub: [
      'Base des types (OACI Doc 8643) et performances (EUROCONTROL) : non publiée avec la suite, téléchargée sur ce poste type par type — après l’installation, puis quand un nouvel appareil arrive',
      'Type database (ICAO Doc 8643) and performance (EUROCONTROL): not published with the suite, downloaded on this computer type by type — after installation, then when a new aircraft arrives',
      'Typendatenbank (ICAO Doc 8643) und Leistungen (EUROCONTROL): nicht mit der Suite veröffentlicht, auf diesem Rechner Typ für Typ geladen — nach der Installation, dann bei jedem neuen Luftfahrzeug',
      'Base de tipos (OACI Doc 8643) y rendimientos (EUROCONTROL): no publicada con la suite, descargada en este equipo tipo por tipo — tras la instalación y luego al llegar una aeronave nueva'
    ]
  }, {
    id: 'caches',
    group: 'store',
    icon: 'trash',
    title: ['Caches', 'Caches', 'Caches', 'Cachés'],
    sub: [
      'Données reconstructibles gardées par le navigateur (aérodromes, base mondiale via jsDelivr, base SIA, contrôle des mises à jour, fichiers de l’application) : état et purge',
      'Rebuildable data kept by the browser (aerodromes, world base via jsDelivr, SIA base, update check, application files): state and purge',
      'Wiederherstellbare Browserdaten (Flugplätze, Weltbasis über jsDelivr, SIA-Basis, Update-Prüfung, Anwendungsdateien): Stand und Leeren',
      'Datos reconstruibles guardados por el navegador (aeródromos, base mundial vía jsDelivr, base SIA, control de actualizaciones, archivos de la aplicación): estado y purga'
    ]
  }, {
    id: 'storage',
    group: 'store',
    icon: 'database',
    title: ['Espace disque', 'Disk space', 'Speicherplatz', 'Espacio en disco'],
    sub: [
      'Place occupée par les missions (par mission, par type, total) et par le navigateur ; purge des cartes surnuméraires et des cartes générées (régénérables)',
      'Space used by missions (per mission, per type, total) and by the browser; purge of surplus and generated (regenerable) maps',
      'Von Missionen (je Mission, je Typ, gesamt) und vom Browser belegter Platz; Löschen überzähliger und erzeugter Karten',
      'Espacio usado por las misiones (por misión, por tipo, total) y por el navegador; purga de mapas sobrantes y generados'
    ]
  }, {
    id: 'backup',
    group: 'store',
    icon: 'save',
    title: ['Sauvegarde totale', 'Full backup', 'Vollständige Sicherung', 'Copia de seguridad total'],
    sub: [
      'Bases du navigateur et toute la configuration locale, fichiers connus des dossiers (registres, missions, profils, CSV d’atterrissage…), en une archive ZIP tracée',
      'Browser databases and all local configuration, known files of the folders (ledgers, missions, profiles, landing CSV…), in one traced ZIP archive',
      'Browser-Datenbanken und lokale Konfiguration, bekannte Dateien der Ordner, in einem ZIP-Archiv',
      'Bases del navegador y toda la configuración local, archivos conocidos de las carpetas, en un ZIP trazado'
    ]
  }, {
    id: 'journal',
    group: 'store',
    icon: 'clock',
    title: ['Journal des sauvegardes et rechargements', 'Backup and reload journal',
      'Protokoll der Sicherungen und Wiederherstellungen', 'Registro de copias y recargas'
    ],
    sub: ['Chaque sauvegarde, restauration ou rechargement : date, origine, ce qui a changé',
      'Every backup, restore or reload: date, origin, what changed',
      'Jede Sicherung oder Wiederherstellung: Datum, Herkunft, Änderungen', 'Cada copia o recarga: fecha, origen, qué cambió'
    ]
  }];
  // Paramètres en quatre pages (main[data-settings]) : blocs de la page seulement dans le menu (REPOSITORY_TREE.settings
  // .sections : « Sources et dossiers » sur Installation, les autres sur Maintenance) ; un bloc d'une autre page s'ouvre
  // sur sa page. Sans data-settings (page autonome, ancienne page unique) : tous les blocs.
  const PAGE = embedded ? main.dataset.settings || '' : '',
    SECTIONS = window.REPOSITORY_TREE?.settings?.sections || {},
    ONLY = !embedded && main.dataset.blocks ? new Set(main.dataset.blocks.split(/[\s,]+/).filter(Boolean)) : null;
  /** Vrai si le bloc id appartient à la page de Paramètres courante (ou à la liste data-blocks de la page autonome). */
  const onPage = id => PAGE ? !SECTIONS[id] || String(SECTIONS[id]).split(',').includes(PAGE) : !ONLY || ONLY.has(id);
  const hosts = {};
  for (const b of BLOCKS) {
    const s = document.createElement('section');
    s.id = b.id;
    s.dataset.blockId = b.id;
    s.dataset.icon = b.icon;
    s.dataset.noI18n = '';
    s.className = 'mt-block';
    s.innerHTML = `<h2></h2><p class="repo-block-subtitle mt-sub"></p><div class="mt-body"></div>`;
    if (embedded || (ONLY && !ONLY.has(b.id)) || (b.id === 'storage' && !window.RepositoryNav?.cpco?.enabled?.())) s.hidden = true;
    main.append(s);
    hosts[b.id] = s.querySelector('.mt-body');
  }

  /** Remplit titre et sous-titre de chaque bloc dans la langue courante, puis les libellés du menu latéral. */
  function titles() {
    for (const b of BLOCKS) {
      const s = document.getElementById(b.id);
      s.querySelector('h2').textContent = t(b.title);
      s.querySelector('.mt-sub').textContent = t(b.sub);
    }
    navLabels();
  }
  // ---- rubrique « Maintenance » du menu latéral de Paramètres : une entrée par bloc
  const NAV = {
    updates: ['Mises à jour', 'Updates', 'Updates', 'Actualizaciones'],
    sources: ['Sources et dossiers', 'Sources and folders', 'Quellen und Ordner', 'Fuentes y carpetas'],
    versions: ['Versions et synchros', 'Versions and sync', 'Versionen', 'Versiones'],
    deps: ['Références et dépendances', 'References and dependencies', 'Referenzen', 'Referencias'],
    types: ['Types d’aéronefs', 'Aircraft types', 'Luftfahrzeugtypen', 'Tipos de aeronave'],
    sia: ['Données aéronautiques', 'Aeronautical data', 'Luftfahrtdaten', 'Datos aeronáuticos'],
    caches: ['Caches', 'Caches', 'Caches', 'Cachés'],
    storage: ['Espace disque', 'Disk space', 'Speicherplatz', 'Espacio en disco'],
    backup: ['Sauvegarde totale', 'Full backup', 'Vollsicherung', 'Copia total'],
    journal: ['Journal', 'Journal', 'Protokoll', 'Registro']
  };
  let navHost = null;

  /** Traduit la rubrique du menu latéral (titre « Maintenance » ou « Dossiers et sources » sur Installation, puis
   *  « Stockage et sauvegarde » pour les blocs du groupe store ; une entrée par bloc). */
  function navLabels() {
    if (!navHost) return;
    navHost.querySelectorAll('h3').forEach(h => {
      h.textContent = h.dataset.mtGroup === 'store' ? t(['Stockage et sauvegarde', 'Storage and backup', 'Speicher und Sicherung',
        'Almacenamiento y copia'
      ]) : PAGE === 'installation' ? t(['Dossiers et sources', 'Folders and sources', 'Ordner und Quellen',
        'Carpetas y fuentes'
      ]) : t(['Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento']);
    });
    navHost.querySelectorAll('[data-mt]').forEach(b => {
      b.textContent = t(NAV[b.dataset.mt]);
    });
  }
  /** Affiche le bloc id (Paramètres) : l'éditeur de base est masqué, l'entrée du menu est active. */
  // blocs du Centre (CPCO) : absents tant que le Centre n'est pas activé (Paramètres › Centre)
  const CPCO_BLOCKS = new Set(['storage']);
  /** Vrai si le bloc id est réservé au Centre et que le Centre n'est pas activé. */
  const cpcoLocked = id => CPCO_BLOCKS.has(id) && !window.RepositoryNav?.cpco?.enabled?.();

  /** Masque les entrées du menu latéral des blocs réservés au Centre tant qu'il n'est pas activé. */
  function cpcoNav() {
    navHost?.querySelectorAll('[data-mt]').forEach(b => {
      b.hidden = cpcoLocked(b.dataset.mt);
    });
  }
  window.addEventListener('cpco-access-change', () => {
    cpcoNav();
    if (!embedded) CPCO_BLOCKS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = cpcoLocked(id);
    });
  });

  /** Ouvre le bloc id : sur une autre page de Paramètres, y navigue ; sinon masque l'éditeur de base et les autres blocs,
   *  active l'entrée du menu et inscrit ?m=id dans l'adresse. */
  function showBlock(id) {
    if (embedded && NAV[id] && !onPage(id) && window.RepositoryNav?.settingsUrl) return location.assign(window.RepositoryNav.settingsUrl(
      id));
    if (!embedded || !document.getElementById(id) || cpcoLocked(id)) return;
    main.querySelector('.da-main')?.setAttribute('hidden', '');
    BLOCKS.forEach(b => {
      document.getElementById(b.id).hidden = b.id !== id;
    });
    main.querySelectorAll('.da-nav [data-set]').forEach(x => x.classList.remove('active'));
    main.querySelectorAll('.da-nav [data-mt]').forEach(x => x.classList.toggle('active', x.dataset.mt === id));
    history.replaceState(null, '', `?m=${id}`);
    window.scrollTo({
      top: 0
    });
    window.AppFramework?.refresh?.();
  }
  if (embedded) {
    const nav = main.querySelector('.da-nav');
    if (nav) {
      navHost = document.createElement('div');
      navHost.className = 'da-mt-nav';
      // v2 : au plus sept entrées par groupe — mises à jour et données d'un côté, stockage et sauvegarde (group: 'store') de l'autre
      navHost.innerHTML = ['', 'store'].map(g => {
        const list = BLOCKS.filter(b => onPage(b.id) && (b.group || '') === g);
        return list.length ? `<h3 data-mt-group="${g}"></h3>${list.map(b => `<button type="button" data-mt="${b.id}"></button>`).join('')}` : '';
      }).join('');
      if (PAGE === 'maintenance') nav.prepend(navHost); // page Maintenance : les blocs d'abord, les fichiers de référence ensuite
      else nav.append(navHost);
      navHost.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => showBlock(b.dataset.mt));
      cpcoNav();
    }
    // une base affichée (data_admin.js) : les blocs de maintenance se masquent
    window.addEventListener('data-admin-show', () => {
      BLOCKS.forEach(b => {
        const el = document.getElementById(b.id);
        if (el) el.hidden = true;
      });
      navHost?.querySelectorAll('[data-mt]').forEach(x => x.classList.remove('active'));
    });
    // liens internes (#sources…) vers un bloc
    document.addEventListener('click', e => {
      const a = e.target.closest?.('a[href^="#"]');
      if (a && NAV[a.getAttribute('href').slice(1)]) {
        e.preventDefault();
        showBlock(a.getAttribute('href').slice(1));
      }
    });
  }

  // ===== 1. Mises à jour
  const PERIODS = [
    [0, ['à chaque ouverture (au plus toutes les heures)', 'at every page load (at most hourly)',
      'bei jedem Öffnen (höchstens stündlich)', 'en cada apertura (como máximo cada hora)'
    ]],
    [1, ['tous les jours', 'daily', 'täglich', 'a diario']],
    [7, ['toutes les semaines', 'weekly', 'wöchentlich', 'semanal']],
    [28, ['à chaque cycle AIRAC (28 jours)', 'every AIRAC cycle (28 days)', 'bei jedem AIRAC-Zyklus (28 Tage)',
      'cada ciclo AIRAC (28 días)'
    ]],
    [30, ['tous les mois', 'monthly', 'monatlich', 'mensual']]
  ];
  let gitState = null;
  /** Dessine le bloc « Mises à jour » : canal master / develop, mode et période du contrôle (SuiteUpdate), dernier contrôle,
   *  commandes update_suite.py à copier et état du dépôt git local ; chaque réglage modifié redessine le bloc. */
  async function renderUpdates() {
    const host = hosts.updates,
      SU = await waitFor('SuiteUpdate');
    if (!SU) {
      host.innerHTML = pill('err', 'suite_update.js non chargé');
      return;
    }
    const s = SU.settings(),
      r = SU.last();
    const cmdChannel = `python tools/update_suite.py channel ${s.channel}`,
      cmdUpdate = 'python tools/update_suite.py update',
      cmdDoctor = 'python tools/update_suite.py doctor';
    host.innerHTML = `
      <div class="mt-grid2">
        <div class="repo-card" data-icon="settings" data-subtitle="${esc(t(['Où prendre les mises à jour', 'Where updates come from', 'Woher die Updates kommen', 'De dónde vienen']))}">
          <h3>${esc(t(['Canal', 'Channel', 'Kanal', 'Canal']))}</h3>
          <label class="mt-radio"><input type="radio" name="mtChannel" value="master" ${s.channel === 'master' ? 'checked' : ''}> <b>master</b> — ${esc(t(['stable : versions publiées', 'stable: released versions', 'stabil: veröffentlichte Versionen', 'estable: versiones publicadas']))}</label>
          <label class="mt-radio"><input type="radio" name="mtChannel" value="develop" ${s.channel === 'develop' ? 'checked' : ''}> <b>develop</b> — ${esc(t(['early bird : dernières évolutions, avant publication', 'early bird: latest changes, before release', 'Early Bird: neueste Änderungen vor Veröffentlichung', 'early bird: últimos cambios, antes de publicar']))}</label>
          <h3>${esc(t(['Mode', 'Mode', 'Modus', 'Modo']))}</h3>
          <label class="mt-radio"><input type="radio" name="mtMode" value="manual" ${s.mode === 'manual' ? 'checked' : ''}> ${esc(t(['Manuel : bouton « Vérifier maintenant »', 'Manual: “Check now” button', 'Manuell: Schaltfläche „Jetzt prüfen“', 'Manual: botón «Comprobar ahora»']))}</label>
          <label class="mt-radio"><input type="radio" name="mtMode" value="auto" ${s.mode === 'auto' ? 'checked' : ''}> ${esc(t(['Automatique, régulièrement :', 'Automatic, regularly:', 'Automatisch, regelmäßig:', 'Automático, regularmente:']))}
            <select id="mtPeriod">${PERIODS.map(([d, l]) => `<option value="${d}" ${+s.periodDays === d ? 'selected' : ''}>${esc(t(l))}</option>`).join('')}</select></label>
          <label class="mt-radio"><input type="radio" name="mtMode" value="off" ${s.mode === 'off' ? 'checked' : ''}> ${esc(t(['Désactivée : aucun contrôle, aucune pastille', 'Disabled: no check, no badge', 'Deaktiviert: keine Prüfung, kein Hinweis', 'Desactivada: sin comprobación ni aviso']))}</label>
          <p class="mt-small">${esc(t(['Le contrôle interroge framagit (API publique, sans compte) ; une nouveauté affiche une pastille « Mise à jour » dans l’en-tête de toutes les pages. L’application se fait par git (commandes ci-contre) : une page web ne peut pas réécrire le dépôt.', 'The check queries framagit (public API, no account); a new version shows an “Update” badge in every page header. Updates are applied with git (commands opposite): a web page cannot rewrite the repository.']))}</p>
        </div>
        <div class="repo-card" data-icon="download" data-subtitle="${esc(t(['Dernier contrôle et application', 'Last check and applying', 'Letzte Prüfung und Anwendung', 'Última comprobación y aplicación']))}">
          <h3>${esc(t(['Contrôle', 'Check', 'Prüfung', 'Comprobación']))}</h3>
          <p class="row"><button type="button" class="primary" id="mtCheck" data-icon="refresh">${esc(t(['Vérifier maintenant', 'Check now', 'Jetzt prüfen', 'Comprobar ahora']))}</button> <span id="mtCheckState" class="mt-small"></span></p>
          <div id="mtCheckResult">${checkResult(r, s)}</div>
          <h3>${esc(t(['Appliquer la mise à jour (terminal, à la racine du dépôt)', 'Apply the update (terminal, at the repository root)', 'Update anwenden (Terminal, im Repository)', 'Aplicar la actualización (terminal, en la raíz del repositorio)']))}</h3>
          ${gitState?.ok && gitState.channelConfig !== s.channel ? `<p>${pill('warn', t(['Canal mémorisé par git : « {g} » — à aligner :', 'Channel stored in git: “{g}” — align it:'], { g: gitState.channelConfig || 'master (défaut)' }))}</p>` : ''}
          <pre class="mt-cmd" data-copy>${esc(cmdChannel)}\n${esc(cmdUpdate)}</pre>
          <p class="mt-small">${esc(t(['« update » refuse si des fichiers suivis sont modifiés, n’avance qu’en fast-forward et trace chaque opération dans .git/suite-update.log. Diagnostic de l’installation :', '“update” refuses when tracked files are modified, only fast-forwards and logs each run to .git/suite-update.log. Installation check:']))} <code>${esc(cmdDoctor)}</code></p>
        </div>
      </div>
      <div class="repo-card" data-icon="database" data-subtitle="${esc(t(['Lu dans .git du dossier du dépôt autorisé', 'Read from .git of the authorised repository folder', 'Aus .git des erlaubten Repository-Ordners gelesen', 'Leído en .git de la carpeta autorizada']))}">
        <h3>${esc(t(['Dépôt git local', 'Local git repository', 'Lokales Git-Repository', 'Repositorio git local']))}</h3>
        <p class="row" id="mtGitButtons"></p>
        <div id="mtGit">${gitHtml(gitState)}</div>
      </div>`;
    host.querySelectorAll('input[name=mtChannel]').forEach(x => x.onchange = () => {
      SU.save({
        channel: x.value
      });
      renderUpdates();
    });
    host.querySelectorAll('input[name=mtMode]').forEach(x => x.onchange = () => {
      SU.save({
        mode: x.value
      });
      renderUpdates();
    });
    host.querySelector('#mtPeriod').onchange = e => SU.save({
      periodDays: +e.target.value,
      mode: 'auto'
    }) && renderUpdates();
    host.querySelector('#mtCheck').onclick = async () => {
      const st = host.querySelector('#mtCheckState');
      st.textContent = t(['Interrogation de framagit…', 'Querying framagit…', 'Abfrage von framagit…', 'Consultando framagit…']);
      const res = await SU.check();
      st.textContent = '';
      host.querySelector('#mtCheckResult').innerHTML = checkResult(res, SU.settings());
      renderVersions();
    };
    const gb = host.querySelector('#mtGitButtons');
    gb.append(folderButton('__repo', () => readGitState(true)));
    const read = document.createElement('button');
    read.type = 'button';
    read.className = 'secondary';
    read.dataset.icon = 'search';
    read.textContent = t(['Lire l’état git', 'Read git state', 'Git-Status lesen', 'Leer el estado git']);
    read.onclick = () => readGitState(true);
    gb.append(read);
    copyButtons(host);
    window.AppFramework?.refresh?.();
  }

  /** HTML du dernier contrôle r (SuiteUpdate.last / check) : à jour ou mise à jour disponible, versions locale et distante ;
   *  signale un contrôle fait sur un autre canal que celui des réglages s. */
  function checkResult(r, s) {
    if (!r) return `<p class="mt-small">${esc(t(['Aucun contrôle effectué.', 'No check yet.', 'Noch keine Prüfung.', 'Ninguna comprobación.']))}</p>`;
    if (!r.ok) return `<p>${pill('err', t(['Contrôle impossible ({d})', 'Check failed ({d})'], { d: fmtDate(r.at) }))}</p><p class="mt-small">${esc(r.error)} — ${esc(t(['hors ligne, ou API bloquée par le navigateur (page ouverte en file://) : utiliser « python tools/update_suite.py ».', 'offline, or API blocked by the browser (page opened as file://): use “python tools/update_suite.py”.']))}</p>`;
    const rm = r.remote || {},
      other = r.channel !== s.channel ? ` ${pill('warn', t(['contrôle fait sur l’ancien canal {c}', 'checked on the former channel {c}'], { c: r.channel }))}` : '';
    // état : mise à jour disponible, à jour, en avance (le local contient le canal), commits locaux non publiés
    const st = r.available ? pill('warn', t(['Mise à jour disponible sur {c}', 'Update available on {c}', 'Update verfügbar in {c}',
        'Actualización disponible en {c}'
      ], {
        c: r.channel
      })) :
      r.reason === 'local-newer' ? pill('ok', t(['En avance sur {c} : la version locale contient déjà le canal',
        'Ahead of {c}: the local version already contains the channel',
        'Voraus gegenüber {c}: die lokale Version enthält den Kanal bereits',
        'Por delante de {c}: la versión local ya contiene el canal'
      ], {
        c: r.channel
      })) :
      r.reason === 'local-unpublished' ? pill('info', t(['Commits locaux non publiés : version locale inconnue de {c}',
        'Unpublished local commits: local version unknown to {c}',
        'Unveröffentlichte lokale Commits: lokale Version in {c} unbekannt',
        'Commits locales no publicados: versión local desconocida en {c}'
      ], {
        c: r.channel
      })) :
      pill('ok', t(['À jour sur {c}', 'Up to date on {c}', 'Aktuell in {c}', 'Al día en {c}'], {
        c: r.channel
      }));
    return `<p>${st}${other}</p>
      <table class="mt-table"><tbody>
        <tr><th>${esc(t(['Version locale', 'Local version', 'Lokale Version', 'Versión local']))}</th><td>${esc(r.local?.version || '—')} (${esc(r.local?.date || '')})${r.local?.head ? ` · <code>${esc(r.local.head.slice(0, 9))}</code>` : ''}</td></tr>
        <tr><th>${esc(t(['Dernière version du canal', 'Latest on channel', 'Neueste im Kanal', 'Última del canal']))}</th><td>${esc(rm.version || '—')} · <a href="${esc(rm.url)}" target="_blank" rel="noopener"><code>${esc(rm.short || '')}</code></a> ${esc(fmtDate(rm.date))}<br><span class="mt-small">${esc(rm.title || '')}</span></td></tr>
        <tr><th>${esc(t(['Contrôlé le', 'Checked on', 'Geprüft am', 'Comprobado el']))}</th><td>${esc(fmtDate(r.at))}</td></tr>
      </tbody></table>`;
  }
  /** Lit l'état git du dossier du dépôt (SuiteUpdate.readGit) dans gitState, l'affiche et redessine versions et dépendances ;
   *  request : demande l'autorisation du dossier. Renvoie l'état, ou null sans dossier. */
  async function readGitState(request = false) {
    const SU = await waitFor('SuiteUpdate'),
      dir = await folder('__repo', request);
    const box = document.getElementById('mtGit');
    if (!dir) {
      if (box) box.innerHTML = `<p class="mt-small">${esc(t(['Choisir le dossier du dépôt (« Documentation », qui contient repository_tree) pour lire la branche, le commit, le dernier fetch et le journal des mises à jour.', 'Choose the repository folder (“Documentation”, containing repository_tree) to read branch, commit, last fetch and update log.']))}</p>`;
      return null;
    }
    gitState = await SU.readGit(dir);
    if (box) box.innerHTML = gitHtml(gitState);
    renderVersions();
    renderDeps();
    return gitState;
  }

  /** Tableau HTML de l'état git g : branche, HEAD, origin, suivi, têtes master / develop, dernier fetch, canal configuré,
   *  packs orphelins, puis les 6 dernières entrées du journal de update_suite.py. */
  function gitHtml(g) {
    if (!g) return `<p class="mt-small">${esc(t(['État git non lu.', 'Git state not read.', 'Git-Status nicht gelesen.', 'Estado git no leído.']))}</p>`;
    if (!g.ok) return pill('warn', t([
      'Pas de dossier .git : installation par archive ZIP (mise à jour : nouvelle archive, ou git clone).',
      'No .git folder: ZIP install (update: new archive, or git clone).'
    ]));
    const s = window.SuiteUpdate.settings(),
      rows = [];
    const row = (k, v) => rows.push(`<tr><th>${esc(k)}</th><td>${v}</td></tr>`);
    row(t(['Branche', 'Branch', 'Zweig', 'Rama']), `${g.branch ? `<b>${esc(g.branch)}</b>` : pill('warn', 'HEAD détachée')} ${g.branch && g.branch !== s.channel ? pill('warn', t(['≠ canal choisi ({c})', '≠ chosen channel ({c})'], { c: s.channel })) : ''}`);
    row('HEAD', `<code>${esc((g.head || '').slice(0, 12))}</code> ${g.headDate ? esc(fmtDate(g.headDate)) : ''} ${g.lastAction ? `<span class="mt-small">— ${esc(g.lastAction.message)}</span>` : ''}`);
    row('origin', `${esc(g.originUrl || '—')} ${g.originOk ? pill('ok', 'framagit') : pill('err', t(['remote inattendu', 'unexpected remote']))}`);
    row(t(['Suivi', 'Tracking', 'Verfolgung', 'Seguimiento']), g.upstream ? `origin/${esc(g.upstream)} · ${g.behind === 0 ? pill('ok', t(['aligné sur origin (dernier fetch)', 'in line with origin (last fetch)'])) : pill('warn', t(['différent de origin/{b} (en avance ou en retard)', 'differs from origin/{b} (ahead or behind)'], { b: g.branch }))}` : pill('warn', t(['aucune branche suivie',
      'no upstream'
    ])));
    row('master / develop', ['master', 'develop'].map(b => `${b} <code>${esc((g.channelHeads?.[b] || '—').slice(0, 9))}</code> / origin <code>${esc((g.remoteHeads?.[b] || '—').slice(0, 9))}</code>`).join(' · ') + (g.channelHeads?.master && g.channelHeads.master === g
      .channelHeads.develop ? ` ${pill('info', t(['master = develop', 'master = develop']))}` : ''));
    row(t(['Dernier fetch', 'Last fetch', 'Letzter Fetch', 'Último fetch']), `${esc(fmtDate(g.lastFetch))} ${g.lastFetch ? `<span class="mt-small">(${esc(ago(g.lastFetch))})</span>` : ''}`);
    row(t(['Canal (git config)', 'Channel (git config)', 'Kanal (git config)', 'Canal (git config)']), esc(g.channelConfig || t([
      'non défini (master)', 'not set (master)'
    ])));
    if (g.orphanPacks?.length || g.strayPackFiles?.length) row(t(['Objets git', 'Git objects', 'Git-Objekte', 'Objetos git']), pill(
      'warn', t([
        '{n} pack(s) sans index, {m} fichier(s) parasite(s) dans .git/objects/pack — « python tools/update_suite.py doctor »',
        '{n} pack(s) without index, {m} stray file(s) in .git/objects/pack — “python tools/update_suite.py doctor”'
      ], {
        n: g.orphanPacks.length,
        m: g.strayPackFiles.length
      })));
    const log = (g.updateLog || []).slice(0, 6).map(e => `<li>${esc(fmtDate(e.at))} — ${esc(e.action)}${e.channel ? ' ' + esc(e.channel) : ''}${e.fromVersion ? ` ${esc(e.fromVersion)} → ${esc(e.toVersion)}` : ''}${e.ok === false ? ' ' + pill('err', e.message || 'échec') : ''}</li>`).join('');
    return `<table class="mt-table"><tbody>${rows.join('')}</tbody></table>${log ? `<h3>${esc(t(['Journal de update_suite.py', 'update_suite.py log']))}</h3><ul class="mt-list">${log}</ul>` : ''}`;
  }

  /** Ajoute un bouton « Copier » (presse-papiers) devant chaque <pre data-copy> de scope qui n'en a pas encore. */
  function copyButtons(scope) {
    scope.querySelectorAll('pre[data-copy]').forEach(pre => {
      if (pre.previousElementSibling?.classList?.contains('mt-copy')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary mt-copy';
      b.textContent = t(['Copier', 'Copy', 'Kopieren', 'Copiar']);
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent);
          b.textContent = '✓';
          setTimeout(() => b.textContent = t(['Copier', 'Copy', 'Kopieren', 'Copiar']), 1500);
        } catch {
          /* refus */
        }
      };
      pre.before(b);
    });
  }

  // ===== 1 bis. Sources et dossiers
  // premier lancement (lanceur : ?m=sources&setup=1), lu une fois : la page réécrit ensuite son adresse (?m=…)
  const SETUP = new URLSearchParams(location.search).has('setup');
  const FOLDER_ORDER = ['__repo', '__data', '__ledger', '__missions', '__sia', '__odv', '__xplane', '__xpnav', '__perf',
    '__store'
  ]; // le dépôt d'abord : les autres s'en déduisent
  /** Dessine le bloc « Sources et dossiers » : dossiers FileAccess (état, autorisation, fichier témoin), adresses des sources
   *  externes surchargeables (suiteSources:v1), clés d'API du lanceur, compagnie virtuelle (suiteVA:v1) et premier lancement. */
  async function renderSources() {
    const host = hosts.sources,
      FA = await waitFor('FileAccess'),
      nav = window.RepositoryNav;
    if (!FA || !nav) {
      host.innerHTML = pill('err', 'file_access.js');
      return;
    }
    const keys = [...FOLDER_ORDER.filter(k => FA.FOLDERS[k]), ...Object.keys(FA.FOLDERS).filter(k => !FOLDER_ORDER.includes(k))];
    const rows = [];
    for (const key of keys) {
      const st = await FA.status(key),
        info = FA.FOLDERS[key] || {};
      let marker = '';
      if (st.handle && st.permission === 'granted' && info.check) {
        if (await FA.has(st.handle, info.check)) marker = pill('ok', info.check);
        else {
          marker = pill('warn', t(['« {f} » absent : dossier attendu ?', '“{f}” missing: expected folder?'], {
            f: info.check
          }));
        }
      }
      const state = !st.handle ? pill('warn', t(['non choisi', 'not chosen', 'nicht gewählt', 'no elegida'])) : st.permission ===
        'granted' ? pill('ok', t(['autorisé', 'authorised', 'erlaubt', 'autorizada'])) : pill('info', t(['à ré-autoriser',
          'to re-authorise', 'erneut erlauben', 'a reautorizar'
        ]));
      rows.push(`<tr data-key="${esc(key)}"><td><b>${esc(t(info.label || [key]))}</b><br><span class="mt-small">${esc(t(info.expect || ['']))}</span></td><td class="mt-fcell"></td><td>${state} ${marker}</td></tr>`);
    }
    const src = window.REPOSITORY_TREE?.sources || {};
    let local = {};
    try {
      local = JSON.parse(localStorage.getItem('suiteSources:v1') || '{}') || {};
    } catch {
      /* illisible */
    }
    // compagnie virtuelle : défauts (repository_tree.va) en indication, réglage local dans les champs
    const vaRows = () => {
      const d = window.REPOSITORY_TREE?.va || {};
      let o = {};
      try {
        o = JSON.parse(localStorage.getItem('suiteVA:v1') || '{}') || {};
      } catch {
        /* illisible */
      }
      const field = (key, label, def, val) => `<tr><td><b>${esc(t(label))}</b></td><td><input type="text" class="mt-url" data-va="${esc(key)}" value="${esc(val || '')}" placeholder="${esc(def || '')}" spellcheck="false"></td></tr>`;
      return [
        field('name', ['Nom', 'Name', 'Name', 'Nombre'], d.name, o.name),
        field('fullName', ['Nom long', 'Full name', 'Vollständiger Name', 'Nombre completo'], d.fullName, o.fullName),
        field('short', ['Sigle', 'Short name', 'Kürzel', 'Sigla'], d.short, o.short),
        field('centre', ['Centre (sigle)', 'Centre (short)', 'Zentrum (Kürzel)', 'Centro (sigla)'], d.centre, o.centre),
        field('centreName', ['Centre (nom complet)', 'Centre (full name)', 'Zentrum (voller Name)', 'Centro (nombre completo)'], d
          .centreName, o.centreName),
        field('pages.home', ['Page d’accueil', 'Home page', 'Startseite', 'Página de inicio'], d.pages?.home, o.pages?.home),
        field('pages.log', ['Log des vols', 'Flight log', 'Flugbuch', 'Registro de vuelos'], d.pages?.log, o.pages?.log),
        field('pages.fleet', ['Flotte', 'Fleet', 'Flotte', 'Flota'], d.pages?.fleet, o.pages?.fleet),
        field('pages.aircraft', ['Fiche d’un appareil', 'Aircraft page', 'Flugzeugseite', 'Ficha de un avión'], d.pages?.aircraft, o
          .pages?.aircraft)
      ].join('');
    };
    const eff = window.Airac?.cycle?.();
    const openUrl = (k, u) => k === 'siaCycle' && eff ? eff.url : u;
    // premier lancement (lanceur lancer.cmd / lancer.sh : ?m=sources&setup=1) : un seul choix, le dossier du dépôt
    const setup = SETUP;
    const repo = await FA.status('__repo');
    const setupBox = !setup ? '' : repo.handle ? `<div class="repo-notice mt-setup ok"><b>${esc(t(['Dossiers réglés.', 'Folders set.', 'Ordner eingestellt.', 'Carpetas configuradas.']))}</b> ${esc(t(['Le dossier de l’application est choisi : données, registre, missions, SIA, performances et sauvegarde locale en sont déduits. Il reste à dérouler les mises à jour.', 'The application folder is chosen: data, ledger, missions, SIA, performance and local backup are derived from it. What is left: run the updates.', 'Der Anwendungsordner ist gewählt: Daten, Register, Missionen, SIA, Leistung und lokale Sicherung werden daraus abgeleitet. Bleiben die Updates.', 'La carpeta de la aplicación está elegida: datos, registro, misiones, SIA, rendimiento y copia local se deducen de ella. Quedan las actualizaciones.']))} <a href="?m=updates">${esc(t(['Mises à jour →', 'Updates →', 'Updates →', 'Actualizaciones →']))}</a></div>` :
      `<div class="repo-notice mt-setup"><b>${esc(t(['Premier lancement : une seule étape.', 'First run: one single step.', 'Erster Start: ein einziger Schritt.', 'Primer inicio: un solo paso.']))}</b> ${esc(t(['Cliquez sur le bouton de la première ligne, « Dossier du dépôt », et choisissez le dossier de l’application (celui qui contient lancer.cmd et lancer.sh). Les autres dossiers en sont déduits.', 'Click the button on the first row, “Repository folder”, and choose the application folder (the one containing lancer.cmd and lancer.sh). The other folders are derived from it.', 'Klicken Sie in der ersten Zeile „Repository-Ordner“ und wählen Sie den Anwendungsordner (mit lancer.cmd und lancer.sh). Die anderen Ordner werden daraus abgeleitet.', 'Pulse el botón de la primera fila, «Carpeta del repositorio», y elija la carpeta de la aplicación (la que contiene lancer.cmd y lancer.sh). Las demás carpetas se deducen de ella.']))}</div>`;
    host.innerHTML = `${setupBox}
      <h3>${esc(t(['Dossiers locaux', 'Local folders', 'Lokale Ordner', 'Carpetas locales']))}</h3>
      <p class="mt-small">${esc(t(['Chaque dossier est choisi une fois (le navigateur mémorise l’autorisation, parfois à reconfirmer après un redémarrage). Les sélecteurs de fichiers des pages s’ouvrent directement dans le dossier correspondant.', 'Each folder is chosen once (the browser remembers the permission, sometimes to be confirmed again after a restart). File pickers open directly in the matching folder.']))}</p>
      <div class="mt-scroll"><table class="mt-table mt-wide mt-folders"><tbody>${rows.join('')}</tbody></table></div>
      <h3>${esc(t(['Sources externes', 'External sources', 'Externe Quellen', 'Fuentes externas']))}</h3>
      <p class="mt-small">${esc(t(['Adresses par défaut livrées avec l’application (repository_tree) ; une valeur saisie ici ne vaut que pour ce navigateur (sauvegardée avec les données locales). Les adresses du SIA, de la DIRCAM, de NATS, de l’AIP militaire britannique et de NAV CANADA servent aux liens des sources de Paramètres › Maintenance › Données aéronautiques ; les dossiers SIA et X-Plane ci-dessus sont les mêmes que là-bas.', 'Default addresses ship with the application (repository_tree); a value entered here applies to this browser only (saved with local data). The SIA, DIRCAM, NATS, UK military AIP and NAV CANADA addresses are the source links of Settings › Maintenance › Aeronautical data; the SIA and X-Plane folders above are the same as there.', 'Standardadressen werden mit der Anwendung geliefert (repository_tree); ein hier eingegebener Wert gilt nur für diesen Browser. Die Adressen von SIA, DIRCAM, NATS, britischem Militär-AIP und NAV CANADA sind die Quellen-Links unter Einstellungen › Wartung › Luftfahrtdaten; die SIA- und X-Plane-Ordner oben sind dieselben wie dort.', 'Direcciones por defecto entregadas con la aplicación (repository_tree); un valor introducido aquí solo vale para este navegador. Las direcciones del SIA, la DIRCAM, NATS, el AIP militar británico y NAV CANADA son los enlaces de las fuentes de Ajustes › Mantenimiento › Datos aeronáuticos; las carpetas SIA y X-Plane de arriba son las mismas que allí.']))} <a class="mt-link" href="${esc(window.RepositoryNav?.settingsUrl?.('sia') || '?m=sia')}">${esc(t(['Données aéronautiques →', 'Aeronautical data →', 'Luftfahrtdaten →', 'Datos aeronáuticos →']))}</a></p>
      <table class="mt-table mt-wide mt-sources"><tbody>${Object.entries(src).map(([k, v]) => `<tr data-src="${esc(k)}"><td><b>${esc(t(v.label || [k]))}</b></td><td><input type="url" class="mt-url" value="${esc(local[k] || '')}" placeholder="${esc(v.url)}" spellcheck="false"></td><td class="mt-nowrap">${local[k] ? pill('info', t(['modifiée', 'changed', 'geändert', 'cambiada'])) : ''} <button type="button" class="secondary" data-reset ${local[k] ? '' : 'hidden'}>↺</button> <a class="mt-link" href="${esc(openUrl(k, nav.source(k)))}" target="_blank" rel="noopener">${esc(t(['Ouvrir', 'Open', 'Öffnen', 'Abrir']))} ↗</a></td></tr>`).join('')}</tbody></table>
      <h3>${esc(t(['Clés d’API (services externes)', 'API keys (external services)', 'API-Schlüssel (externe Dienste)', 'Claves de API (servicios externos)']))}</h3>
      <p class="mt-small">${esc(t(['Clés de la suite, communes à tous ses utilisateurs : gardées par le lanceur dans secrets/ à la racine de l’application (exclu de git, hors des données et des sauvegardes), jamais renvoyées à la page. Les identifiants personnels (client OAuth IVAO) se règlent dans Mon profil › Identité et réseaux, au niveau d’utilisation Expert.', 'Suite keys, shared by all its users: kept by the launcher in secrets/ at the application root (excluded from git, outside the data and the backups), never sent back to the page. Personal credentials (IVAO OAuth client) are set in My profile › Identity and networks, at the Expert usage level.', 'Schlüssel der Suite, für alle ihre Benutzer: vom Starter in secrets/ im Anwendungsordner gehalten (von Git ausgeschlossen, außerhalb der Daten und Sicherungen), nie an die Seite zurückgegeben. Persönliche Zugangsdaten (IVAO-OAuth-Client) unter Mein Profil › Identität und Netzwerke, auf der Nutzungsstufe Experte.', 'Claves de la suite, comunes a todos sus usuarios: guardadas por el lanzador en secrets/ en la raíz de la aplicación (excluido de git, fuera de los datos y de las copias), nunca devueltas a la página. Las credenciales personales (cliente OAuth de IVAO) se ajustan en Mi perfil › Identidad y redes, en el nivel de uso Experto.']))}</p>
      <table class="mt-table mt-wide mt-keys"><tbody><tr data-secret="ivao.apiKey"><td><b>${esc(t(['IVAO — clé d’API', 'IVAO — API key', 'IVAO — API-Schlüssel', 'IVAO — clave de API']))}</b><br><span class="mt-small">${esc(t(['Activations des zones de France (horaires publiés, RTBA, NOTAM) et sessions ATC (trainings, examens) pour le Tableau et le Planning ODV. developers.ivao.aero', 'French area activations (published schedules, RTBA, NOTAM) and ATC sessions (trainings, exams) for the Board and the ODV planning. developers.ivao.aero', 'Aktivierungen französischer Gebiete (Zeiten, RTBA, NOTAM) und ATC-Sitzungen (Trainings, Prüfungen) für die Einsatztafel und die ODV-Planung. developers.ivao.aero', 'Activaciones de las zonas de Francia (horarios, RTBA, NOTAM) y sesiones ATC (entrenamientos, exámenes) para el Tablero y la planificación ODV. developers.ivao.aero']))}</span></td>
        <td><input type="password" class="mt-url" autocomplete="off" spellcheck="false" aria-label="${esc(t(['Clé d’API IVAO', 'IVAO API key', 'IVAO-API-Schlüssel', 'Clave de API de IVAO']))}"></td>
        <td class="mt-nowrap"><span data-state></span> <button type="button" class="secondary" data-save data-icon="save">${esc(t(['Enregistrer', 'Save', 'Speichern', 'Guardar']))}</button> <button type="button" class="secondary" data-clear hidden>${esc(t(['Effacer', 'Clear', 'Löschen', 'Borrar']))}</button></td></tr></tbody></table>
      <h3>${esc(t(['Compagnie virtuelle', 'Virtual airline', 'Virtuelle Fluggesellschaft', 'Aerolínea virtual']))}</h3>
      <p class="mt-small">${esc(t(['Nom, sigle et centre affichés dans la suite (SO Group Virtual, SOG, CPCO par défaut) et pages du site de la compagnie (adresse : « Site de la compagnie virtuelle » ci-dessus ; chemin sous ce site, ou adresse complète ; {id} : numéro de l’appareil). Vide : valeur par défaut. Vaut pour ce navigateur.', 'Name, short name and centre shown in the suite (SO Group Virtual, SOG, CPCO by default) and pages of the airline website (address: “Virtual airline website” above; path under that site, or full address; {id}: aircraft number). Empty: default value. Applies to this browser.', 'Name, Kürzel und Zentrum in der Suite (standardmäßig SO Group Virtual, DEFA, CPCO) und Seiten der Website (Adresse: oben; Pfad unter dieser Website oder vollständige Adresse; {id}: Flugzeugnummer). Leer: Standardwert. Gilt für diesen Browser.', 'Nombre, sigla y centro mostrados en la suite (SO Group Virtual, SOG, CPCO por defecto) y páginas del sitio de la aerolínea (dirección: arriba; ruta bajo ese sitio o dirección completa; {id}: número del avión). Vacío: valor por defecto. Vale para este navegador.']))}</p>
      <table class="mt-table mt-wide mt-va"><tbody>${vaRows()}</tbody></table>
      <p class="row"><button type="button" class="secondary" id="mtVaReset" data-icon="refresh">${esc(t(['Revenir à SO Group Virtual', 'Back to SO Group Virtual', 'Zurück zu SO Group Virtual', 'Volver a SO Group Virtual']))}</button></p>
      <h3>${esc(t(['Premier lancement', 'First run', 'Erster Start', 'Primer inicio']))}</h3>
      <p class="row"><button type="button" class="secondary" id="mtSetupOpen" data-icon="refresh">${esc(t(['Rouvrir le premier lancement', 'Reopen the first run', 'Ersten Start erneut öffnen', 'Reabrir el primer inicio']))}</button></p>`;
    // compagnie virtuelle : un champ modifié → réglage local (RepositoryNav.setVa), défauts de repository_tree sinon
    host.querySelectorAll('.mt-va [data-va]').forEach(input => input.onchange = () => {
      const o = JSON.parse(localStorage.getItem('suiteVA:v1') || '{}') || {},
        [k, sub] = input.dataset.va.split('.'),
        v = input.value.trim();
      if (sub) o.pages = {
        ...(o.pages || {}),
        [sub]: v
      };
      else o[k] = v;
      nav.setVa(o);
      renderSources();
    });
    host.querySelector('#mtVaReset').onclick = () => {
      nav.setVa({});
      renderSources();
    };
    secretsRows(host);
    // « Nettoyer et recommencer… » : sur la page du premier lancement seulement (v2, une seule occurrence)
    host.querySelector('#mtSetupOpen').onclick = () => location.assign('premier_lancement.html?force');
    if (setup && !repo.handle) host.querySelector('tr[data-key="__repo"]')?.classList.add('mt-setup-row');
    host.querySelectorAll('tr[data-key]').forEach(tr => tr.querySelector('.mt-fcell').append(folderButton(tr.dataset.key, () => {
      renderSources();
      renderVersions();
      renderDeps();
      renderBackup();
    }, {
      withLabel: false
    })));
    host.querySelectorAll('tr[data-src]').forEach(tr => {
      const k = tr.dataset.src,
        input = tr.querySelector('input');
      input.onchange = () => {
        const v = input.value.trim();
        if (v && !/^https?:\/\/[^\s]+$/i.test(v)) {
          input.setCustomValidity(t(['adresse http(s) attendue', 'http(s) address expected']));
          input.reportValidity();
          return;
        }
        input.setCustomValidity('');
        nav.setSource(k, v);
        renderSources();
      };
      tr.querySelector('[data-reset]').onclick = () => {
        nav.setSource(k, '');
        renderSources();
      };
    });
    window.AppFramework?.refresh?.();
  }

  // ---- clés d'API de la suite (lanceur : GET / POST /__setup/secrets ; secrets/<service>.json) : la page n'en reçoit
  // que l'état (enregistrée, 4 derniers caractères) ; saisie vide + « Enregistrer » ne change rien, « Effacer » la retire
  async function secretsRows(host) {
    /** Appel au lanceur : GET (état) sans body, POST sinon ; réponse JSON, ou null si refus ou lanceur absent. */
    const api = (body = null) => fetch('/__setup/secrets', {
      method: body ? 'POST' : 'GET',
      headers: {
        'X-SOG-Setup': '1',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    const rows = [...host.querySelectorAll('tr[data-secret]')];
    /** Met à jour chaque ligne selon l'état st du lanceur (null : lanceur absent, champs désactivés). */
    const draw = st => rows.forEach(tr => {
      const [service, key] = tr.dataset.secret.split('.'),
        v = st?.app?.[service]?.[key],
        input = tr.querySelector('input');
      tr.querySelector('[data-state]').innerHTML = !st ? pill('info', t(['lanceur absent', 'no launcher', 'kein Starter',
        'sin lanzador'
      ])) : v?.env ? pill('ok', t(['variable d’environnement', 'environment variable', 'Umgebungsvariable',
        'variable de entorno'
      ])) : v?.set ? pill('ok', t(['enregistrée {h}', 'saved {h}', 'gespeichert {h}', 'guardada {h}'], {
        h: v.hint
      })) : pill('warn', t(['absente', 'missing', 'fehlt', 'ausente']));
      input.disabled = !st;
      input.placeholder = v?.set ? t(['(inchangée)', '(unchanged)', '(unverändert)', '(sin cambios)']) : '';
      tr.querySelector('[data-save]').disabled = !st;
      tr.querySelector('[data-clear]').hidden = !v?.set || !!v?.env;
    });
    draw(await api());
    rows.forEach(tr => {
      const [service, key] = tr.dataset.secret.split('.'),
        input = tr.querySelector('input');
      /** Envoie la valeur de la clé au lanceur (vide : effacement), vide le champ, signale un échec et redessine. */
      const send = async value => {
        const r = await api({
          scope: 'app',
          service,
          values: {
            [key]: value
          }
        });
        input.value = '';
        if (!r?.ok) window.AppFramework?.notify?.(t(['Clé non enregistrée : {e}', 'Key not saved: {e}',
          'Schlüssel nicht gespeichert: {e}', 'Clave no guardada: {e}'
        ], {
          e: r?.message || t(['lanceur injoignable', 'launcher unreachable', 'Starter nicht erreichbar',
            'lanzador inaccesible'
          ])
        }), 'err');
        draw(r?.ok ? r : await api());
      };
      tr.querySelector('[data-save]').onclick = () => input.value.trim() && send(input.value.trim());
      tr.querySelector('[data-clear]').onclick = async () => {
        if (await window.AppFramework?.ask?.(t(['Effacer cette clé du lanceur ?', 'Remove this key from the launcher?',
            'Diesen Schlüssel vom Starter entfernen?', '¿Borrar esta clave del lanzador?'
          ]), {
            danger: true
          }) === false) return;
        send('');
      };
    });
  }

  // ---- types d'aéronefs : base OACI fusionnée (aircraft_catalog.js) et alias (AIRCRAFT_DB.__aliases : H145 → EC45…)
  /** Codes OACI de la base des types chargée (clés techniques « __… » exclues). */
  const typeSet = () => new Set(Object.keys(window.AIRCRAFT_DB || {}).filter(k => !k.startsWith('__')));
  /** Code de type en majuscules, remplacé par son code OACI s'il figure dans AIRCRAFT_DB.__aliases. */
  const alias = code => {
    const k = String(code || '').toUpperCase().trim();
    return window.AIRCRAFT_DB?.__aliases?.[k] || k;
  };
  /** Vrai si code (ou son alias) figure dans l'ensemble de types. */
  const knownType = (types, code) => types.has(alias(code)) || types.has(String(code || '').toUpperCase().trim());
  /** Vrai si des performances EUROCONTROL sont chargées pour code (ou son alias). */
  const hasPerf = code => !!(window.AIRCRAFT_PERF || {})[alias(code)] || !!(window.AIRCRAFT_PERF || {})[code];

  // ===== 2. Versions et synchronisations
  /** Base IndexedDB (lecture seule, jamais créée) : { clé : valeur } d'un magasin. */
  async function idbAll(name, store) {
    try {
      if (indexedDB.databases && !(await indexedDB.databases()).some(d => d.name === name)) return null;
    } catch {
      /* API absente */
    }
    return new Promise(resolve => {
      const r = indexedDB.open(name);
      r.onupgradeneeded = () => {
        r.transaction.abort();
        resolve(null);
      };
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(store)) {
          db.close();
          return resolve(null);
        }
        const out = {},
          q = db.transaction(store).objectStore(store).openCursor();
        q.onsuccess = () => {
          const c = q.result;
          if (c) {
            out[String(c.key)] = c.value;
            c.continue();
          } else {
            db.close();
            resolve(out);
          }
        };
        q.onerror = () => {
          db.close();
          resolve(out);
        };
      };
    });
  }
  /** Texte d'un fichier du dépôt : dossier autorisé, sinon lecture servie (http). */
  const textCache = new Map();
  /** repoTextUncached avec un cache mémoire de 15 s par chemin. */
  async function repoText(path) {
    const hit = textCache.get(path);
    if (hit && Date.now() - hit.at < 15000) return hit.value;
    const value = await repoTextUncached(path);
    textCache.set(path, {
      at: Date.now(),
      value
    });
    return value;
  }
  /** Lit path dans le dossier du dépôt autorisé, sinon par fetch (sans cache) : { text, lastModified, size? } ou null. */
  async function repoTextUncached(path) {
    const dir = await folder('__repo');
    if (dir) {
      const f = await fileAt(dir, path);
      if (f) return {
        text: await f.text(),
        lastModified: f.lastModified,
        size: f.size
      };
    }
    // dépôt de données absent (installation publique, data/data_tree.js introuvable) : pas de requête vers data/,
    // qui ne ferait qu'ajouter des 404 à la console
    if (/^data\//.test(path) && window.DataFiles && !window.DataFiles.available()) return null;
    try {
      const r = await fetch(new URL(path.split('/').map(encodeURIComponent).join('/'), root()).href, {
        cache: 'no-store'
      });
      if (r.ok) return {
        text: await r.text(),
        lastModified: Date.parse(r.headers.get('last-modified') || '') || 0
      };
    } catch {
      /* file:// */
    }
    return null;
  }
  let siaFolderState = null,
    baseSummary = null;
  /** Dessine le tableau « Versions et synchronisations » par groupe (code, SIA / AIRAC, bases de référence, données
   *  utilisateur) : version, date de synchro, état et outil de chaque élément, lus dans le navigateur et le dépôt. */
  async function renderVersions() {
    const host = hosts.versions;
    const rows = [];
    const add = (group, name, version, sync, state, source) => rows.push({
      group,
      name,
      version,
      sync,
      state,
      source
    });
    const G = {
      code: t(['Code', 'Code', 'Code', 'Código']),
      sia: 'SIA / AIRAC',
      db: t(['Bases de référence', 'Reference databases', 'Referenzdaten', 'Bases de referencia']),
      user: t(['Données utilisateur', 'User data', 'Benutzerdaten', 'Datos de usuario'])
    };
    // code
    const rel = window.REPOSITORY_TREE?.release || {};
    add(G.code, t(['Suite (repository_tree)', 'Suite (repository_tree)']), `<b>${esc(rel.version)}</b> <code>${esc(rel.id || '')}</code>`, esc(rel.date), '', `<a href="${esc(rel.changelog)}" target="_blank" rel="noopener">CHANGELOG</a>`);
    const cacheV = /[?&]v=(\w+)/.exec([...document.scripts].map(s => s.src).find(s => /repository_nav\.js/.test(s)) || '')?.[1] || '';
    add(G.code, t(['Version de cache de repository_nav.js (?v=)', 'repository_nav.js cache version (?v=)']), `<code>${esc(cacheV)}</code>`, t([
      'empreinte du contenu du fichier', 'fingerprint of the file content'
    ]), '', 'tools/bump_versions.py');
    const g = gitState || window.SuiteUpdate?.gitInfo?.();
    add(G.code, 'git', g?.branch ? `${esc(g.branch)} <code>${esc((g.head || '').slice(0, 9))}</code>` : '—', g?.lastFetch ? `fetch ${fmtDate(g.lastFetch)}` : g?.readAt ? t(['lu le {d}', 'read {d}'], {
      d: fmtDate(g.readAt)
    }) : '', g?.behind === 0 ? pill('ok', 'origin') : g?.branch ? pill('warn', t(['≠ origin', '≠ origin'])) : pill('info', t([
      'non lu', 'not read'
    ])), 'framagit asr/flight_planner');
    const chk = window.SuiteUpdate?.last?.();
    if (chk?.ok) add(G.code, t(['Canal distant {c}', 'Remote channel {c}'], {
        c: chk.channel
      }), `${esc(chk.remote?.version || '')} <code>${esc(chk.remote?.short || '')}</code>`, fmtDate(chk.remote?.date), chk.available ? pill('warn', t(['mise à jour disponible', 'update available'])) :
      pill('ok', t(['à jour', 'up to date'])), t(['contrôlé le {d}', 'checked {d}'], {
        d: fmtDate(chk.at)
      }));
    // SIA
    const A = window.Airac,
      eff = A.cycle(),
      nxt = A.next();
    add(G.sia, t(['AIRAC en vigueur', 'AIRAC in force', 'Gültiger AIRAC', 'AIRAC vigente']), `<b>${esc(eff.label)}</b> (${esc(eff.ident)})`, `${esc(fmtDate(eff.date, false))} → ${esc(fmtDate(eff.until, false))}`, '', `<a href="${esc(eff.url)}" target="_blank" rel="noopener">SIA</a>`);
    add(G.sia, t(['AIRAC suivant', 'Next AIRAC', 'Nächster AIRAC', 'AIRAC siguiente']), esc(nxt.label), esc(fmtDate(nxt.date, false)),
      '', `<a href="${esc(nxt.url)}" target="_blank" rel="noopener">SIA</a>`);
    const info = window.SiaBase.info();
    const baseState = !info ? pill('info', t(['base non construite', 'no base yet'])) : info.mixed ? pill('err', t(['cycles mélangés',
      'mixed cycles'
    ])) : info.airac >= eff.date ? pill('ok', info.airac > eff.date ? t(['cycle à venir chargé', 'upcoming cycle loaded']) : t([
      'à jour', 'up to date'
    ])) : pill('warn', t(['en retard', 'out of date']));
    add(G.sia, t(['Base du studio cartographique', 'Map studio base', 'Basis des Kartenstudios', 'Base del estudio']), info ?
      `${esc(info.airac || '?')} · ${esc(info.counts?.airspaces ?? '?')} ${esc(t(['espaces', 'airspaces']))}` : '—', info?.cachedAt ? fmtDate(info.cachedAt) : '', baseState, 'IndexedDB sia-map-parser');
    if (siaFolderState) {
      const lat = siaFolderState.latest;
      add(G.sia, t(['Dossier SIA XML', 'SIA XML folder', 'SIA-XML-Ordner', 'Carpeta SIA XML']), lat ? esc(lat.date) : '—', lat ?
        fmtDate(Math.max(...lat.items.map(i => i.lastModified))) : '', !lat ? pill('warn', t(['aucun XML AIRAC', 'no AIRAC XML'])) : !
        lat.complete ? pill('warn', t(['incomplet', 'incomplete'])) : siaFolderState.old.length ? pill('warn', t([
          '{n} ancien(s) cycle(s) présent(s)', '{n} old cycle(s) present'
        ], {
          n: siaFolderState.old.length
        })) : pill('ok', t(['complet', 'complete'])), '');
      const mora = siaFolderState.fixed.find(x => x.id === 'mora')?.file;
      if (mora) {
        const mc = window.SiaBase.moraCycle(await mora.file.text());
        add(G.sia, 'mora.csv', mc ? t(['obstacles AIRAC {c}', 'obstacles AIRAC {c}'], {
            c: mc
          }) : t(['cycle des obstacles non tracé', 'obstacle cycle not traced']), fmtDate(mora.lastModified), mc && info?.airac &&
          mc === info.airac ? pill('ok', '=') : pill('warn', t(['à recalculer / tracer (MORA)', 'recalculate / trace (MORA)',
            'neu berechnen (MORA)', 'recalcular (MORA)'
          ])), '');
      }
    }
    const tracks = await repoText('data/sia/miam-enr-5-7-tracks.xml');
    if (tracks) add(G.sia, t(['Axes AAR (MILAIP ENR 5.7)', 'AAR tracks (MILAIP ENR 5.7)']), esc(/<miam:sourceEdition>([^<]+)</.exec(
      tracks.text)?.[1] || '?'), fmtDate(tracks.lastModified, false), '', 'DIRCAM');
    // bases de référence
    const db = window.AIRCRAFT_DB?.__meta || {};
    add(G.db, t(['Types OACI (Doc 8643)', 'ICAO types (Doc 8643)']), `${typeSet().size} types`, esc(db.generated || db.completed_at || ''), db.partial ?
      pill('warn', t(['partielle', 'partial'])) : pill('ok', t(['complète', 'complete'])), 'update_aircraft_db.py');
    add(G.db, t(['Performances (EUROCONTROL APD)', 'Performance (EUROCONTROL APD)']), `${Object.keys(window.AIRCRAFT_PERF || {}).length} types`, '', '',
      'update_aircraft_db.py --apd CODES');
    add(G.db, t(['Flotte', 'Fleet', 'Flotte', 'Flota']), `${(window.DEFA_FLEET || []).length} ${esc(t(['appareils', 'aircraft']))}`, fmtDate(window.DEFA_FLEET_META?.updatedAt), '',
      'update_fleet.py Flotte.html');
    add(G.db, t(['Référence (pilotes, appareils)', 'Reference (pilots, aircraft)']), `${(window.DEFA_REFERENCE?.pilots || []).length} / ${(window.DEFA_REFERENCE?.aircraft || []).length}`, fmtDate(window.DEFA_REFERENCE?.META
      ?.updatedAt), '', 'tools/defa_reference.py');
    add(G.db, t(['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos']), `${(window.MISSION_CALLSIGNS?.table || []).length}`, fmtDate(window.MISSION_CALLSIGNS?.META
      ?.updatedAt), '', t(['Paramétrage', 'Settings']));
    // données utilisateur
    const perfIdb = await idbAll('FlightPerfCache', 'cache');
    const ofps = Object.entries(perfIdb || {}).filter(([k, v]) => /ofp|simbrief/i.test(k) || v?.fetchedAt);
    const lastOfp = ofps.map(([, v]) => v?.fetchedAt || v?.savedAt || '').sort().pop();
    add(G.user, t(['Plans de vol (OFP SimBrief)', 'Flight plans (SimBrief OFP)']), `${ofps.length}`, fmtDate(lastOfp), '', 'FlightPerfCache');
    const ps = readJson('flightPerfState', {});
    const profs = Object.values(ps?.profiles || {});
    add(G.user, t(['Profils d’appareils du planificateur', 'Planner aircraft profiles']), `${profs.length}`, '', '', 'flightPerfState');
    // registre des CR : copie indexée (shared/data_index.js), sinon ancienne copie texte du navigateur
    const crMeta = await window.ReportIndex?.meta?.();
    const ledger = crMeta ? null : readJson('missionCoreLedger:v2', null);
    const ledgerAt = crMeta?.updatedAt || /updatedAt: "([^"]+)"/.exec(ledger?.text || '')?.[1] || ledger?.savedAt || '';
    const crCount = crMeta ? await window.ReportIndex.count() : ((ledger?.text || '').match(/^ {2}- schemaVersion/gm) || []).length;
    add(G.user, t(['Registre des CR (missions.yaml)', 'Report ledger (missions.yaml)']), `${crCount} CR`, fmtDate(ledgerAt), '', 'CR');
    const reg = await regIndex();
    add(G.user, t(['Registre des missions générées', 'Generated mission registry']), `${(reg?.missions || []).length}`, fmtDate(reg?.updatedAt), '',
      'mission_registry.yaml');
    const land = await idbAll('LandingPerformanceDashboardCache', 'datasets');
    const lands = Object.values(land || {});
    add(G.user, t(['Journal d’atterrissages (CSV)', 'Landing log (CSV)']), lands.map(d => esc(d?.name || d?.fileName || '')).filter(
      Boolean).slice(0, 2).join(', ') || String(lands.length), fmtDate(lands.map(d => d?.savedAt || d?.loadedAt || d?.createdAt ||
      '').sort().pop()), '', 'Landing Dashboard');
    const store = readJson('defaLocalStore:v1', {});
    add(G.user, t(['Données locales (defa_local_store.yaml)', 'Local data (defa_local_store.yaml)']), esc(store.folder || '—'), fmtDate(
        store.savedAt), store.savedAt ? pill(Date.now() - new Date(store.savedAt) > 7 * 864e5 ? 'warn' : 'ok', ago(store.savedAt)) :
      pill('warn', t(['jamais', 'never'])), '');
    const lastFull = (window.LocalStore?.journal?.() || []).find(e => e.kind === 'full-backup');
    add(G.user, t(['Sauvegarde totale', 'Full backup', 'Vollständige Sicherung', 'Copia total']), lastFull ? `${lastFull.files || 0} ${esc(t(['fichiers', 'files']))} · ${fmtSize(lastFull.bytes || 0)}` : '—', fmtDate(
      lastFull?.at), lastFull ? pill(Date.now() - new Date(lastFull.at) > 30 * 864e5 ? 'warn' : 'ok', ago(lastFull.at)) : pill(
      'warn', t(['jamais', 'never'])), '');
    let group = '';
    // fréquence de vérification de la synchronisation des données (réglage de ce navigateur, shared/sync.js)
    const SS = window.SuiteSync,
      every = SS?.checkEvery?.() || '30m',
      lastAt = SS?.lastCheck?.() || 0;
    const syncRow = SS ? `<p class="row"><label for="mtSyncEvery">${esc(t(['Vérifier l’état de la synchronisation des données', 'Check the data synchronisation status', 'Status der Datensynchronisierung prüfen', 'Comprobar el estado de la sincronización de datos']))}</label>
      <select id="mtSyncEvery">${[['page', ['à chaque page', 'on every page', 'auf jeder Seite', 'en cada página']], ['30m', ['toutes les 30 minutes', 'every 30 minutes', 'alle 30 Minuten', 'cada 30 minutos']], ['3d', ['3 fois par jour', '3 times a day', '3-mal am Tag', '3 veces al día']], ['1d', ['une fois par jour', 'once a day', 'einmal am Tag', 'una vez al día']]].map(([v, l]) => `<option value="${v}"${v === every ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select>
      <button type="button" class="secondary" id="mtSyncNow" data-icon="refresh">${esc(t(['Vérifier maintenant', 'Check now', 'Jetzt prüfen', 'Comprobar ahora']))}</button>
      <span class="mt-small">${esc(lastAt ? t(['dernière vérification : {d}', 'last check: {d}', 'letzte Prüfung: {d}', 'última comprobación: {d}'], { d: fmtDate(lastAt) }) : t(['jamais vérifié', 'never checked', 'nie geprüft', 'nunca comprobado']))}</span></p>` : '';
    host.innerHTML = `${syncRow}<p class="row"><button type="button" class="secondary" id="mtVerRefresh" data-icon="refresh">${esc(t(['Actualiser', 'Refresh', 'Aktualisieren', 'Actualizar']))}</button></p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Élément', 'Asset', 'Element', 'Elemento']))}</th><th>${esc(t(['Version', 'Version', 'Version', 'Versión']))}</th><th>${esc(t(['Date / synchro', 'Date / sync', 'Datum / Sync', 'Fecha / sinc.']))}</th><th>${esc(t(['État', 'State', 'Status', 'Estado']))}</th><th>${esc(t(['Source / outil', 'Source / tool', 'Quelle / Werkzeug', 'Fuente / herramienta']))}</th></tr></thead><tbody>
      ${rows.map(r => (r.group !== group ? `<tr class="mt-group"><td colspan="5">${esc(group = r.group)}</td></tr>` : '') + `<tr><td>${esc(r.name)}</td><td>${r.version || '—'}</td><td>${r.sync || ''}</td><td>${r.state || ''}</td><td class="mt-small">${r.source || ''}</td></tr>`).join('')}
      </tbody></table></div>`;
    host.querySelector('#mtVerRefresh').onclick = async () => {
      await readGitState(false);
      await scanSiaFolder(false);
      renderVersions();
    };
    const every$ = host.querySelector('#mtSyncEvery');
    if (every$) every$.onchange = () => SS.checkEvery(every$.value);
    const now$ = host.querySelector('#mtSyncNow');
    if (now$) now$.onclick = async () => {
      now$.disabled = true;
      await SS.status(true);
      renderVersions();
    };
    window.AppFramework?.refresh?.();
  }

  // ===== 3. Références et dépendances
  /** Dessine le tableau « Références et dépendances » : pour chaque référence (SIA XML, base du studio, MORA, axes AAR,
   *  performances, flotte, profils, prompt des missions), traçage, processus, dépendants et contrôle de cohérence. */
  async function renderDeps() {
    const host = hosts.deps,
      A = window.Airac,
      info = window.SiaBase.info(),
      eff = A.cycle();
    const rows = [];
    const add = (ref, file, traced, process, dependents, state) => rows.push({
      ref,
      file,
      traced,
      process,
      dependents,
      state
    });
    const lat = siaFolderState?.latest;
    // SIA XML
    let st = !siaFolderState ? pill('info', t(['dossier SIA non lu', 'SIA folder not read', 'SIA-Ordner nicht gelesen',
      'carpeta SIA no leída'
    ])) : !lat ? pill('err', t(['aucun cycle', 'no cycle'])) : !lat.complete ? pill('warn', t(['manque : {m}', 'missing: {m}'], {
      m: lat.missing.join(', ')
    })) : siaFolderState.old.length ? pill('warn', t(['anciens cycles à archiver', 'old cycles to archive'])) : pill('ok', lat.date);
    add('SIA AIXM 4.5 · XML-SIA', 'data/sia/*_<date>.xml', t(['cycle dans le nom ; hors git (.gitignore)',
      'cycle in file name; outside git (.gitignore)'
    ]), t(['§ Données aéronautiques, zone France, source SIA', '§ Aeronautical data, France zone, SIA source',
      '§ Luftfahrtdaten, Zone Frankreich, Quelle SIA', '§ Datos aeronáuticos, zona Francia, fuente SIA'
    ]), t(['base du studio, mora.csv (obstacles), profil vertical, planificateur, terrains des missions',
      'studio base, mora.csv (obstacles), vertical profile, planner, mission aerodromes'
    ]), st);
    st = !info ? pill('info', t(['non construite', 'not built'])) : info.mixed ? pill('err', t([
      'cycles mélangés dans la base : relire le dossier', 'mixed cycles: re-read the folder'
    ])) : lat && info.airac !== lat.date ? pill('warn', t(['base {b} ≠ dossier {d} : relire', 'base {b} ≠ folder {d}: re-read'], {
      b: info.airac,
      d: lat.date
    })) : info.airac < eff.date ? pill('warn', t(['base {b} antérieure au cycle en vigueur {e}',
      'base {b} older than current cycle {e}'
    ], {
      b: info.airac,
      e: eff.date
    })) : pill('ok', info.airac);
    add(t(['Base analysée du studio', 'Studio analysed base']), 'IndexedDB sia-map-parser', t([
      'parserVersion 11 ; cycle mémorisé (airac)', 'parserVersion 11; stored cycle (airac)'
    ]), t(['Studio › « Relire le dossier »', 'Studio › “Re-read folder”']), t(['cartes, profil vertical, planificateur',
      'maps, vertical profile, planner'
    ]), st);
    const moraFile = siaFolderState?.fixed.find(x => x.id === 'mora')?.file;
    const mc = moraFile ? window.SiaBase.moraCycle(await moraFile.file.text()) : '';
    st = !moraFile ? pill('info', t(['dossier SIA non lu', 'SIA folder not read'])) : !mc ? pill('warn', t([
      'cycle des obstacles non tracé : MORA, « Recalcul simple » le trace',
      'obstacle cycle not traced: MORA, “Simple recalculation” traces it'
    ])) : info?.airac && mc !== info.airac ? pill('warn', t(['obstacles {m} ≠ base {b} : recalcul simple',
      'obstacles {m} ≠ base {b}: simple recalculation'
    ], {
      m: mc,
      b: info.airac
    })) : pill('ok', mc);
    add('Grille MORA', 'data/sia/mora.csv', t(['git ; colonne source (+ cycle des obstacles)',
      'git; source column (+ obstacle cycle)'
    ]), t([
      'Studio › bloc 5 (complet, réseau) ; Données aéronautiques › MORA (recalcul simple, obstacles)',
      'Studio › block 5 (full, network); Aeronautical data › MORA (simple, obstacles)'
    ]), t(['cartes, profil vertical', 'maps, vertical profile']), st);
    const trk = await repoText('data/sia/miam-enr-5-7-tracks.xml'),
      crd = await repoText('data/sia/miam-enr-5-7-coordinates.xml');
    const ed = x => /<miam:sourceEdition>([^<]+)</.exec(x?.text || '')?.[1] || '';
    const e1 = ed(trk),
      e2 = ed(crd),
      amdt = s => /AMDT\s*(\d+\/\d+)/i.exec(s)?.[1] || s;
    st = !trk ? pill('info', t(['non lisible (dossier du dépôt ou serveur)', 'not readable (repository folder or server)'])) : amdt(
      e1) === amdt(e2) ? pill('ok', e1) : pill('warn', t(['éditions différentes : {a} / {b}', 'different editions: {a} / {b}'], {
      a: e1,
      b: e2
    }));
    add(t(['Axes AAR (ENR 5.7)', 'AAR tracks (ENR 5.7)']), 'miam-enr-5-7-tracks.xml ← coordinates.xml', t([
      'git ; édition (AMDT) dans l’en-tête', 'git; edition (AMDT) in header'
    ]), 'AarTracks.parseEnr57 → toXml (MANUEL § 9.1)', t(['studio, CR AAR', 'studio, AAR reports']), st);
    // types et performances
    const types = typeSet();
    const perfMissing = Object.keys(window.AIRCRAFT_PERF || {}).filter(k => !knownType(types, k));
    add(t(['Performances APD', 'APD performance']), 'AircraftDB/aircraft_perf.js ← aircraft_db.js', t([
        'non publié (ignoré par git), complété sur ce poste', 'not published (ignored by git), completed on this computer'
      ]), 'update_aircraft_db.py --apd CODES', t(['planificateur, profil vertical', 'planner, vertical profile']), perfMissing
      .length ? pill('warn', t(['{n} type(s) absents de la base OACI : {l}', '{n} type(s) not in ICAO base: {l}'], {
        n: perfMissing.length,
        l: perfMissing.slice(0, 6).join(', ')
      })) : pill('ok', t(['types connus', 'known types'])));
    const fleetTypes = [...new Set((window.DEFA_FLEET || []).map(r => r.type).filter(Boolean))];
    const fleetUnknown = fleetTypes.filter(x => !knownType(types, x));
    const fleetNoPerf = fleetTypes.filter(x => !hasPerf(x));
    add(t(['Flotte', 'Fleet']), 'data/references/aircraft_fleet.js ← Flotte.html', t(['git ; META.updatedAt', 'git; META.updatedAt']),
      'update_fleet.py Flotte.html ; Paramétrage', t(['CR, catalogue, registre', 'reports, catalogue, registry']), fleetUnknown
      .length ? pill('warn', t(['types inconnus : {l}', 'unknown types: {l}'], {
        l: fleetUnknown.join(', ')
      })) : pill('ok', t(['{n} types connus ; {p} sans performances APD', '{n} known types; {p} without APD performance'], {
        n: fleetTypes.length,
        p: fleetNoPerf.length
      })));
    const profUnknown = Object.values(readJson('flightPerfState', {})?.profiles || {}).map(p => p?.icao).filter(x => x && !knownType(
      types, x));
    add(t(['Profils du planificateur', 'Planner profiles']), 'flightPerfState (navigateur)', t(['données locales', 'local data']), t([
      'planificateur ; sauvegarde', 'planner; backup'
    ]), t(['devis carburant, profil vertical', 'fuel quote, vertical profile']), profUnknown.length ? pill('warn', t([
      'types hors base OACI : {l}', 'types outside ICAO base: {l}'
    ], {
      l: [...new Set(profUnknown)].join(', ')
    })) : pill('ok', ''));
    // prompt des missions
    const md = await repoText('docs/technique/PROMPT_GENERATEUR_MISSIONS.md');
    let promptState = pill('info', t(['non lisible', 'not readable']));
    if (md && typeof window.MISSION_PROMPT === 'string') {
      const block = /```text\n([\s\S]*?)\n```/.exec(md.text.replace(/\r\n/g, '\n'))?.[1];
      promptState = block == null ? pill('warn', '?') : block.trim() === window.MISSION_PROMPT.trim() ? pill('ok', t(['synchronisé',
        'in sync'
      ])) : pill('warn', t(['à régénérer : python tools/build_mission_prompt.py', 'rebuild: python tools/build_mission_prompt.py']));
    }
    add(t(['Prompt des missions', 'Mission prompt']), 'apps/cpco/mission_prompt.js ← docs/technique/PROMPT_GENERATEUR_MISSIONS.md', t([
        'git ; en-tête « GÉNÉRÉ »', 'git; “GENERATED” header'
      ]), 'build_mission_prompt.py (bump_versions.py)', t(['générateur, registre des missions', 'generator, mission registry']),
      promptState);
    host.innerHTML = `<p class="mt-small"><a href="#types">${esc(t(['Types d’aéronefs et performances : bloc « Types d’aéronefs »', 'Aircraft types and performance: “Aircraft types” block', 'Luftfahrzeugtypen und Leistungen: Block „Luftfahrzeugtypen“', 'Tipos de aeronave y rendimientos: bloque «Tipos de aeronave»']))}</a></p><p class="row"><button type="button" class="secondary" id="mtDepRefresh" data-icon="refresh">${esc(t(['Vérifier', 'Check', 'Prüfen', 'Comprobar']))}</button></p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Référence', 'Reference', 'Referenz', 'Referencia']))}</th><th>${esc(t(['Fichier', 'File', 'Datei', 'Archivo']))}</th><th>${esc(t(['Traçage', 'Tracing', 'Nachverfolgung', 'Trazado']))}</th><th>${esc(t(['Mise à jour', 'Update', 'Aktualisierung', 'Actualización']))}</th><th>${esc(t(['Dépendants', 'Dependents', 'Abhängige', 'Dependientes']))}</th><th>${esc(t(['Contrôle', 'Check', 'Prüfung', 'Control']))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${esc(r.ref)}</b></td><td class="mt-small"><code>${esc(r.file)}</code></td><td class="mt-small">${esc(r.traced)}</td><td class="mt-small">${esc(r.process)}</td><td class="mt-small">${esc(r.dependents)}</td><td>${r.state}</td></tr>`).join('')}
      </tbody></table></div>`;
    host.querySelector('#mtDepRefresh').onclick = async () => {
      await scanSiaFolder(false);
      renderDeps();
    };
    window.AppFramework?.refresh?.();
  }
  /** Bloc « Types d'aéronefs » (Installation, Maintenance, premier lancement) : types complétés type par type (flotte,
   *  missions du registre et de l'ODV, inconnus), même carte et même lanceur partout. */
  async function renderTypes() {
    const host = hosts.types;
    host.innerHTML = '<div class="mt-types"></div>';
    const reg = (await regIndex().catch(() => null))?.missions || [];
    aircraftDbState(host.querySelector('.mt-types'), {
      fleet: [...new Set((window.DEFA_FLEET || []).map(r => r.type).filter(Boolean))],
      missions: [...new Set(reg.flatMap(m => m.aircraftTypes || []))]
    });
  }

  // ===== 4. Mise à jour SIA pas à pas
  let extractMsg = '',
    archiveMsg = '',
    moraPlan = null,
    moraMsg = '',
    basePanelEl = null;
  let basePanelApi = null; // bloc commun de la base (SiaBase.panel) : reread() = « Tout recalculer »
  /** Inspecte le dossier SIA (Airac.inspectFolder) dans siaFolderState : dernier cycle, fichiers manquants, anciens cycles,
   *  fichiers fixes ; null si dossier absent, non autorisé ou illisible. request : demande l'autorisation. */
  async function scanSiaFolder(request = false) {
    const dir = await folder('__sia', request);
    if (!dir) return (siaFolderState = null);
    try {
      siaFolderState = window.Airac.inspectFolder(await window.Airac.filesOf(dir));
    } catch (e) {
      // dossier mémorisé déplacé, supprimé ou à la demande (Synology) : traité comme absent, sans casser le bloc
      console.warn('Dossier SIA illisible :', e);
      siaFolderState = null;
    }
    return siaFolderState;
  }
  // ---- base des types d'aéronefs (OACI Doc 8643, performances EUROCONTROL) : non publiée, complétée sur ce poste type
  // par type par le lanceur (AircraftDB/update_aircraft_db.py ; GET / POST /__setup/aircraft-db { codes }) : un nouvel
  // appareil (code saisi), les types de la flotte, ceux des missions (ODV, registre), ou les types encore inconnus de la
  // base ; jamais toute la base EUROCONTROL. État relu toutes les 5 s pendant une passe.
  let acTimer = 0,
    acWarned = false,
    acLists = {};
  /** Dessine dans el la carte « Types d'aéronefs et performances » d'après l'état du lanceur (/__setup/aircraft-db) ; lists
   *  { fleet, missions } : codes à proposer (gardés pour les redessins). Les boutons lancent une passe sur les codes choisis. */
  async function aircraftDbState(el, lists) {
    if (!el?.isConnected) return;
    if (lists) acLists = lists;
    clearTimeout(acTimer);
    /** Appel au lanceur : GET (état de la passe) sans body, POST { codes } pour en lancer une ; JSON, ou null sans lanceur. */
    const api = (body = null) => fetch('/__setup/aircraft-db', {
      method: body ? 'POST' : 'GET',
      headers: {
        'X-SOG-Setup': '1',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    const s = await api();
    const types = typeSet(),
      unknown = [...new Set([...(acLists.fleet || []), ...(acLists.missions || [])])].filter(x => !knownType(types, x));
    const files = s ? (s.db ? t(['base présente ({n} types)', 'database present ({n} types)', 'Basis vorhanden ({n} Typen)',
      'base presente ({n} tipos)'
    ], {
      n: types.size
    }) : t(['base absente', 'database missing', 'Basis fehlt', 'base ausente'])) : '';
    const state = !s ? t(['lanceur absent : python update_aircraft_db.py --only CODES puis --apd CODES (dans AircraftDB/)',
        'no launcher: python update_aircraft_db.py --only CODES then --apd CODES (in AircraftDB/)'
      ]) :
      s.state === 'running' ? t(['passe en cours : {s}', 'pass running: {s}', 'Durchlauf läuft: {s}', 'pasada en curso: {s}'], {
        s: s.step
      }) : s.state === 'done' ? t(['dernière passe terminée ({c})', 'last pass done ({c})', 'letzter Durchlauf beendet ({c})',
        'última pasada terminada ({c})'
      ], {
        c: (s.codes || []).join(' ')
      }) : s.state === 'error' ? t(['échec de la dernière passe', 'last pass failed', 'letzter Durchlauf fehlgeschlagen',
        'falló la última pasada'
      ]) : '';
    const busy = !s || s.state === 'running',
      empty = !types.size,
      all = [...new Set([...(acLists.fleet || []), ...(acLists.missions || [])])],
      // passe terminée depuis le chargement de la page : la base relue au prochain chargement
      fresh = s?.state === 'done' && s.ended && s.ended * 1000 > performance.timeOrigin;
    if (empty && s && !acWarned) {
      acWarned = true;
      window.AppFramework?.notify?.(t([
        'Base des types d’aéronefs vide : Paramètres › Maintenance › Références et dépendances, « Compléter la base ».',
        'Aircraft type database empty: Settings › Maintenance › References and dependencies, “Complete the database”.',
        'Luftfahrzeugtyp-Datenbank leer: Einstellungen › Wartung › Referenzen und Abhängigkeiten, „Datenbank ergänzen“.',
        'Base de tipos de aeronave vacía: Ajustes › Mantenimiento › Referencias y dependencias, «Completar la base».'
      ]), 'warn');
    }
    /** Bouton de passe sur une liste de codes (désactivé si vide ou passe en cours), codes en infobulle (20 au plus). */
    const btn = (id, label, list, title) => `<button type="button" class="secondary" data-ac="${id}" data-icon="refresh"${busy || !list.length ? ' disabled' : ''} title="${esc(title + (list.length ? ' : ' + list.slice(0, 20).join(' ') + (list.length > 20 ? '…' : '') : ''))}">${esc(label)} (${list.length})</button>`;
    el.innerHTML = `<div class="repo-card" data-icon="plane" data-subtitle="${esc(t(['Données de l’OACI (Doc 8643) et d’EUROCONTROL : non publiées avec la suite, complétées sur ce poste, type par type (réseau, quelques secondes par type)', 'ICAO (Doc 8643) and EUROCONTROL data: not published with the suite, completed on this computer type by type (network, a few seconds per type)', 'Daten von ICAO (Doc 8643) und EUROCONTROL: nicht mit der Suite veröffentlicht, auf diesem Rechner Typ für Typ ergänzt', 'Datos de la OACI (Doc 8643) y EUROCONTROL: no publicados con la suite, completados en este equipo tipo por tipo']))}"><h3>${esc(t(['Types d’aéronefs et performances', 'Aircraft types and performance', 'Luftfahrzeugtypen und Leistungen', 'Tipos de aeronave y rendimientos']))}</h3>
      ${!empty && unknown.length ? `<p class="row"><button type="button" class="primary" data-ac="unknown" data-icon="download"${busy ? ' disabled' : ''}>${esc(t(['Compléter les types manquants de la flotte et des missions ({n})', 'Complete the missing fleet and mission types ({n})', 'Fehlende Typen der Flotte und der Missionen ergänzen ({n})', 'Completar los tipos que faltan de la flota y las misiones ({n})'], {
        n: unknown.length
      }))}</button></p>` : ''}
      ${empty ? `<div class="repo-notice"><b>${esc(t(['Base vide.', 'Empty database.', 'Leere Datenbank.', 'Base vacía.']))}</b> ${esc(t(['Sans elle, pas de types d’aéronefs (flotte, missions, CR, performances du planificateur). Un clic la complète avec les types de la flotte et des missions ; ensuite, un type à la fois quand un nouvel appareil arrive.', 'Without it, no aircraft types (fleet, missions, reports, planner performance). One click completes it with the fleet and mission types; then one type at a time when a new aircraft arrives.', 'Ohne sie keine Luftfahrzeugtypen (Flotte, Missionen, Berichte, Leistungen des Planers). Ein Klick ergänzt sie mit den Typen der Flotte und der Missionen; danach ein Typ nach dem anderen, wenn ein neues Luftfahrzeug kommt.', 'Sin ella, no hay tipos de aeronave (flota, misiones, informes, rendimientos del planificador). Un clic la completa con los tipos de la flota y de las misiones; después, un tipo cada vez que llega una aeronave nueva.']))}</div>
      <p class="row"><button type="button" class="primary" data-ac="all" data-icon="download"${busy || !all.length ? ' disabled' : ''}>${esc(t(['Compléter la base ({n} types)', 'Complete the database ({n} types)', 'Datenbank ergänzen ({n} Typen)', 'Completar la base ({n} tipos)'], {
        n: all.length
      }))}</button></p>` : ''}
      <p class="mt-small">${esc(files)}${state ? ` · ${esc(state)}` : ''}</p>
      ${fresh ? `<p class="row">${pill('ok', t(['base mise à jour', 'database updated', 'Datenbank aktualisiert', 'base actualizada']))} <button type="button" class="secondary" data-ac-reload data-icon="refresh">${esc(t(['Recharger la page pour la lire', 'Reload the page to read it', 'Seite neu laden, um sie zu lesen', 'Recargar la página para leerla']))}</button></p>` : ''}
      <label class="mt-small">${esc(t(['Codes OACI à télécharger (types et performances) : un par ligne, ou séparés par des virgules', 'ICAO codes to download (types and performance): one per line, or comma-separated', 'Herunterzuladende ICAO-Codes (Typen und Leistungen): einer pro Zeile oder durch Kommas getrennt', 'Códigos OACI que descargar (tipos y rendimientos): uno por línea o separados por comas']))}<br><textarea class="mt-ac-code" rows="4" cols="24" spellcheck="false" placeholder="H160&#10;EC35, A320" aria-label="${esc(t(['Codes OACI', 'ICAO codes', 'ICAO-Codes', 'Códigos OACI']))}"></textarea></label>
      <p class="row"><button type="button" class="secondary" data-ac="one" data-icon="download"${busy ? ' disabled' : ''}>${esc(t(['Télécharger types et performances', 'Download types and performance', 'Typen und Leistungen herunterladen', 'Descargar tipos y rendimientos']))}</button></p>
      <p class="row">${btn('unknown', t(['Types inconnus', 'Unknown types', 'Unbekannte Typen', 'Tipos desconocidos']), unknown, t(['types de la flotte et des missions absents de la base', 'fleet and mission types missing from the database']))} ${btn('fleet', t(['Flotte', 'Fleet', 'Flotte', 'Flota']), acLists.fleet || [], t(['tous les types de la flotte', 'all fleet types']))} ${btn('missions', t(['Missions (ODV, registre)', 'Missions (ODV, registry)', 'Missionen (ODV, Register)', 'Misiones (ODV, registro)']), acLists.missions || [], t(['types demandés par les missions', 'types required by the missions']))}</p>
      <p class="mt-small">${esc(t(['Fichiers écrits sur ce poste : AircraftDB/aircraft_db.js (types) et aircraft_perf.js (performances). Rien à en faire : toutes les pages les lisent à leur prochain chargement. Ils ne sont pas versionnés (données OACI et EUROCONTROL, non redistribuées) : à compléter sur chaque poste, ou à recopier d’un poste à l’autre.', 'Files written on this computer: AircraftDB/aircraft_db.js (types) and aircraft_perf.js (performance). Nothing to do with them: every page reads them at its next load. They are not versioned (ICAO and EUROCONTROL data, not redistributed): complete them on each computer, or copy them from one computer to another.', 'Auf diesem Rechner geschriebene Dateien: AircraftDB/aircraft_db.js (Typen) und aircraft_perf.js (Leistungen). Nichts damit zu tun: Alle Seiten lesen sie beim nächsten Laden. Sie werden nicht versioniert (Daten von ICAO und EUROCONTROL, nicht weitergegeben): auf jedem Rechner ergänzen oder von Rechner zu Rechner kopieren.', 'Archivos escritos en este equipo: AircraftDB/aircraft_db.js (tipos) y aircraft_perf.js (rendimientos). Nada que hacer con ellos: todas las páginas los leen en su próxima carga. No se versionan (datos de la OACI y EUROCONTROL, no redistribuidos): completarlos en cada equipo o copiarlos de uno a otro.']))}</p>
      ${s?.log?.length ? `<details class="mt-small"><summary>${esc(t(['Journal', 'Log', 'Protokoll', 'Registro']))}</summary><pre>${esc(s.log.slice(-12).join('\n'))}</pre></details>` : ''}</div>`;
    const lists2 = {
      all,
      unknown,
      fleet: acLists.fleet || [],
      missions: acLists.missions || []
    };
    el.querySelectorAll('[data-ac]').forEach(b => b.onclick = async () => {
      const codes = b.dataset.ac === 'one' ? [...new Set(el.querySelector('.mt-ac-code').value.toUpperCase().split(/[\s,;]+/)
        .filter(c => /^[A-Z0-9]{2,4}$/.test(c)))] : lists2[b.dataset.ac];
      if (!codes.length) return;
      await api({
        codes
      });
      aircraftDbState(el);
    });
    el.querySelector('[data-ac-reload]')?.addEventListener('click', () => location.reload());
    if (empty) el.querySelector('.repo-card')?.classList.add('mt-ac-empty');
    if (s?.state === 'running') acTimer = setTimeout(() => aircraftDbState(el), 5000);
  }

  // ===== 4. Données aéronautiques : carte des zones du monde (shared/aero_zones.js), sources de chaque zone,
  // reconstruction de la base aéronautique (zones actives, sources cochées), cycles AIRAC et âge des données, MORA.
  // États d'une zone sur la carte : vierge, survolée (sources dans le panneau), active incomplète, active complète,
  // inactive avec des données (grisée). Un clic ajoute la zone à la sélection ou l'en retire ; « Activer » applique la
  // sélection et enchaîne tout ce qui se fait seul (aeroAutoZones). Le panneau montre la zone survolée.
  let aeroMapEl = null,
    aeroSel = null, // sélection en cours (Set d'identifiants de zones) ; null : celle des zones actives
    aeroMap = null,
    aeroPinned = 'fr',
    aeroLocked = false, // zone épinglée d'un clic : le panneau reste sur elle malgré le survol
    aeroHoverTimer = 0,
    aeroXpLabel = '', // libellé du bouton du dossier X-Plane, repris au redessin du panneau (pas de bouton vide un instant)
    aeroHover = null,
    aeroInv = null;
  const AERO_STATE = {
    blank: ['inactive, sans données', 'inactive, no data', 'inaktiv, ohne Daten', 'inactiva, sin datos'],
    data: ['inactive, avec des données', 'inactive, with data', 'inaktiv, mit Daten', 'inactiva, con datos'],
    partial: ['active, données incomplètes', 'active, incomplete data', 'aktiv, Daten unvollständig', 'activa, datos incompletos'],
    complete: ['active, toutes les données', 'active, all data', 'aktiv, alle Daten', 'activa, todos los datos']
  };
  const AERO_COLOR = {
    blank: '#8a94a0',
    data: '#8a94a0',
    partial: '#e39b1b',
    complete: '#2e9d4f'
  };
  /** Nom traduit d'une zone (identifiant à défaut). */
  const zName = z => t(z.name || [z.id]);
  /** Inventaire : fichiers du dossier SIA (racine, sous-dossiers, zones/), cases de mora.csv, dossier X-Plane. */
  async function aeroInventory() {
    const inv = {
      files: [],
      moraCells: [],
      folder: false,
      xplane: null
    };
    const st = await window.FileAccess?.status?.('__sia');
    if (st?.handle && st.permission === 'granted') try {
      const root = await window.SiaBase.filesOf(st.handle);
      inv.folder = true;
      inv.files.push(...root.map(f => ({
        rel: f.name,
        at: f.lastModified,
        size: f.size
      })));
      const extra = await window.SiaBase.extraFiles(st.handle, {});
      for (const [k, l] of Object.entries(extra))
        if (k !== 'xplane') inv.files.push(...l.map(f => ({
          rel: f.__rel || `${k}/${f.name}`,
          at: f.lastModified,
          size: f.size
        })));
      const mora = root.find(f => /^mora\.csv$/i.test(f.name));
      if (mora) inv.moraCells = window.SiaBase.parseMora(await mora.text());
    } catch (e) {
      // dossier mémorisé déplacé ou supprimé : comme non autorisé (à rechoisir)
      console.warn('Dossier SIA illisible :', e);
      inv.folder = false;
    }
    const xs = await window.FileAccess?.status?.('__xpnav');
    if (xs?.handle) {
      inv.xplane = {
        name: xs.handle.name,
        granted: xs.permission === 'granted',
        cycle: ''
      };
      if (inv.xplane.granted) try {
        const cd = await xs.handle.getDirectoryHandle('Custom Data'),
          txt = await (await (await cd.getFileHandle('cycle_info.txt')).getFile()).text();
        inv.xplane.cycle = /AIRAC cycle\s*:\s*(\d{4})/i.exec(txt)?.[1] || '';
      } catch {
        /* données par défaut seulement */
      }
    }
    return inv;
  }
  // Cases de mora.csv par zone : index par degré entier, compte par zone gardé tant que l'inventaire ne change pas.
  // (Avant : chaque survol testait toutes les cases du fichier contre le contour du pays — plusieurs centaines de ms
  // pour un grand pays, carte figée après un glisser.)
  let moraIdx = null,
    moraIdxOf = null;
  const moraCounts = new Map();

  /** Nombre de cases de mora.csv de l'inventaire inv dans la zone id (index par degré reconstruit si les cases changent). */
  function moraCount(Z, id, inv) {
    const cells = inv?.moraCells || [];
    if (!cells.length) return 0;
    if (moraIdxOf !== cells) {
      moraIdxOf = cells;
      moraCounts.clear();
      moraIdx = new Map();
      for (const c of cells) {
        const k = `${Math.floor(c.lat)}|${Math.floor(c.lon)}`;
        if (!moraIdx.has(k)) moraIdx.set(k, []);
        moraIdx.get(k).push(c);
      }
    }
    if (moraCounts.has(id)) return moraCounts.get(id);
    let n = 0;
    // cases d'un degré de la zone, petites îles comprises (zoneCellKeys : AeroZones.cellsOf ne voyait que la métropole)
    for (const k of zoneCellKeys(Z, id)) n += (moraIdx.get(k) || []).length;
    moraCounts.set(id, n);
    return n;
  }
  /** État d'une source dans une zone : { has (true / false / null : non lue par la suite), n, at, airac, text }. */
  function aeroSourceStatus(Z, id, src) {
    const S = Z.SOURCES[src],
      inv = aeroInv || {
        files: [],
        moraCells: []
      };
    if (!S?.readable) return {
      has: null,
      text: t(['consultation (non lu par la suite)', 'reference only (not read by the suite)',
        'nur Ansicht (nicht von der Suite gelesen)', 'solo consulta (no leído por la suite)'
      ])
    };
    if (src === 'xplane') {
      const x = inv.xplane;
      return {
        has: !!x?.granted,
        airac: x?.cycle ? `${x.cycle.slice(2)}/${x.cycle.slice(0, 2)}` : '',
        text: !x ? t(['dossier d’X-Plane non choisi', 'X-Plane folder not chosen', 'X-Plane-Ordner nicht gewählt',
          'carpeta de X-Plane no elegida'
        ]) : x.granted ? `${x.name}${x.cycle ? ` — AIRAC ${x.cycle}` : ''}` : t(['dossier à ré-autoriser', 'folder to re-authorise', 'Ordner erneut erlauben',
          'carpeta por reautorizar'
        ])
      };
    }
    if (src === 'mora') {
      const n = moraCount(Z, id, inv);
      return {
        has: n > 0,
        n,
        text: n ? t(['{n} case(s) dans mora.csv', '{n} cell(s) in mora.csv'], {
          n
        }) : t(['pas encore calculée', 'not computed yet', 'noch nicht berechnet', 'aún no calculada'])
      };
    }
    const files = inv.files.filter(f => {
      const fs = Z.fileSource(f.rel);
      return fs && fs.zone === id && fs.source === src;
    });
    const at = Math.max(0, ...files.map(f => f.at)),
      airac = src === 'sia' ? files.map(f => /(\d{4}-\d{2}-\d{2})\.xml$/.exec(f.rel)?.[1]).filter(Boolean).sort().pop() || '' : '';
    return {
      has: files.length > 0,
      n: files.length,
      at,
      airac,
      text: files.length ? `${files.length} ${t(['fichier(s)', 'file(s)', 'Datei(en)', 'archivo(s)'])}${airac ? ` — AIRAC ${airac}` : at ? ` — ${fmtDate(at, false)}` : ''}` : inv.folder ? t(['aucun fichier', 'no file', 'keine Datei', 'ningún archivo']) : t([
        'dossier SIA non autorisé', 'SIA folder not authorised', 'SIA-Ordner nicht erlaubt', 'carpeta SIA no autorizada'
      ])
    };
  }
  /** État d'une zone : blank, data, partial, complete. */
  function aeroZoneState(Z, z) {
    const st = Object.fromEntries(z.sources.map(s => [s, aeroSourceStatus(Z, z.id, s)]));
    if (!Z.isOn(z.id)) return z.sources.some(s => s !== 'xplane' && st[s].has) ? 'data' : 'blank';
    const need = z.sources.filter(s => Z.srcOn(z.id, s) && st[s].has !== null);
    return need.length && need.every(s => st[s].has) ? 'complete' : 'partial';
  }
  /** Âge d'une source : ok (cycle en vigueur, ou moins de 28 jours), warn (plus ancien), none. */
  function aeroAge(S, st) {
    const eff = window.Airac?.cycle?.();
    if (!st.has) return 'none';
    if (S.age === 'airac') return st.airac && eff && st.airac >= eff.date ? 'ok' : 'warn';
    if (S.age === 'xplane') return !st.airac || !eff ? 'ok' : st.airac === eff.label ? 'ok' : 'warn';
    return st.at && Date.now() - st.at < 28 * 864e5 ? 'ok' : st.at ? 'warn' : 'ok';
  }
  /** Panneau d'une zone : état, activation, sources (case, statut, licence, action : téléchargement, lien et mode
   *  d'emploi, dossier, calcul). */
  function aeroPanel(Z, id) {
    const z = Z.byId(id),
      state = aeroZoneState(Z, z),
      on = Z.isOn(id),
      f = siaFolderState;
    /** HTML de l'action propre à la source src selon son genre : import du PDF MILAIP (dircam), ZIP du SIA, téléchargement,
     *  dossier local, calcul de la MORA (par blocs pour une grande zone), sinon lien, mode d'emploi et bouton de dépôt. */
    const action = src => {
      const S = Z.SOURCES[src];
      const url = Z.linkOf(src),
        link = url ? `<a class="mt-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(t(['Ouvrir le site', 'Open the website', 'Website öffnen', 'Abrir el sitio']))} ↗</a>` : '';
      if (src === 'dircam') return `<p class="mt-small">${esc(t(S.howto || ['', '']))}</p><p class="row">${link} <label class="secondary mt-file" data-icon="upload" title="${esc(t(['PDF de la MILAIP (section ENR 5.7) téléchargé sur le site de la DIRCAM : axes et points lus, anomalies à valider, puis écriture de miam-enr-5-7-tracks.xml dans le dossier SIA', 'MILAIP PDF (section ENR 5.7) downloaded from the DIRCAM website: tracks and points read, anomalies to check, then miam-enr-5-7-tracks.xml written to the SIA folder']))}">${esc(t(['Importer le PDF MILAIP…', 'Import the MILAIP PDF…', 'MILAIP-PDF importieren…', 'Importar el PDF MILAIP…']))}<input type="file" id="mtEnr57" accept=".pdf,application/pdf" hidden></label></p><div id="mtEnr57Msg">${enr57Html()}</div>`;
      if (src === 'sia') {
        const eff = window.Airac.cycle();
        return `<p class="mt-small">${esc(t(S.howto))}</p><p class="row"><a class="mt-link" href="${esc(eff.url)}" target="_blank" rel="noopener">SIA — AIRAC ${esc(eff.label)} ↗</a>
          <button type="button" class="secondary" id="mtSiaFetch" data-icon="download" title="${esc(t(['Prend le dernier export_xml_bd_SIA_….zip du dossier Téléchargements (serveur du lanceur)', 'Takes the latest export_xml_bd_SIA_….zip from the Downloads folder (launcher server)']))}">${esc(t(['Récupérer le ZIP téléchargé', 'Fetch the downloaded ZIP', 'Heruntergeladenes ZIP holen', 'Recuperar el ZIP descargado']))}</button><label class="secondary mt-file">${esc(t(['ZIP d’export du SIA…', 'SIA export ZIP…', 'SIA-Export-ZIP…', 'ZIP de exportación…']))}<input type="file" id="mtSiaZip" accept=".zip" hidden data-picker-folder="__sia"></label>${f?.zips?.length ? `<button type="button" class="secondary" id="mtSiaZipFolder" data-icon="box">${esc(t(['Extraire {z}', 'Extract {z}'], { z: f.zips[0].name }))}</button>` : ''}${f?.old?.length ? `<button type="button" class="secondary" id="mtArchive" data-icon="box" title="${esc(f.old.map(o => o.date).join(', '))}">${esc(t(['Archiver les anciens cycles', 'Archive the old cycles', 'Alte Zyklen archivieren', 'Archivar los ciclos antiguos']))}</button>` : ''}</p>
          <p class="mt-small" id="mtExtract">${extractMsg}${archiveMsg ? ' ' + archiveMsg : ''}</p>${f ? `<details class="mt-small"><summary>${esc(t(['Contenu du dossier SIA', 'SIA folder content', 'Inhalt des SIA-Ordners', 'Contenido de la carpeta SIA']))}</summary>${folderTable(f)}</details>` : ''}`;
      }
      if (S.kind === 'download') return `<p class="row"><button type="button" class="secondary" data-aero-fetch="${esc(S.provider)}" data-src="${esc(src)}" data-args="${esc((S.args || [id]).join(' '))}" data-icon="download"${aeroFetching.has(`${id}|${src}`) ? ' disabled' : ''}>${esc(t(['Télécharger', 'Download', 'Herunterladen', 'Descargar']))}</button> <span class="mt-small" data-fetch-msg>${aeroFetchMsg[`${id}|${src}`] || ''}</span></p>`;
      if (S.kind === 'local') return `<p class="mt-small">${esc(t(S.howto))}</p><p class="row" data-aero-xp></p>`;
      // grande zone (plus de 1500 cases) : MORA d'X-Plane par défaut ; calcul complet par blocs sur confirmation
      if (S.kind === 'computed' && moraTooLarge(Z, id)) {
        const roll = moraRollState(id);
        return `<p class="mt-small">${esc(t(['Zone très étendue ({n} cases d’un degré) : MORA d’X-Plane par défaut ; le calcul complet se fait par blocs de 10°, reprenable, sur le relief ouvert d’AWS (sans requête OpenStreetMap).', 'Very large zone ({n} one-degree cells): X-Plane MORA by default; the full calculation runs in 10° blocks, resumable, on AWS open terrain (no OpenStreetMap query).', 'Sehr große Zone ({n} Ein-Grad-Felder): standardmäßig MORA von X-Plane; die vollständige Berechnung läuft in 10°-Blöcken, fortsetzbar, auf dem offenen AWS-Relief (ohne OpenStreetMap-Abfrage).', 'Zona muy extensa ({n} casillas de un grado): MORA de X-Plane por defecto; el cálculo completo se hace por bloques de 10°, reanudable, sobre el relieve abierto de AWS (sin consulta a OpenStreetMap).'], { n: moraCellsOf(Z, id) }))}${roll.done.length ? ` ${pill('info', t(['{d}/{n} bloc(s) calculé(s)', '{d}/{n} block(s) computed', '{d}/{n} Block/Blöcke berechnet', '{d}/{n} bloque(s) calculado(s)'], { d: roll.done.length, n: roll.total || '?' }))}` : ''}</p>
          <p class="row"><button type="button" class="primary" data-mora-xp-zone="${esc(id)}"${moraBusy ? ' disabled' : ''} data-icon="download">${esc(t(['MORA d’X-Plane', 'X-Plane MORA', 'MORA von X-Plane', 'MORA de X-Plane']))}</button>
          <button type="button" class="secondary" data-mora-roll="${esc(id)}"${moraBusy ? ' disabled' : ''} data-icon="chart">${esc(roll.done.length && !roll.complete ? t(['Reprendre le calcul complet…', 'Resume the full calculation…', 'Vollständige Berechnung fortsetzen…', 'Reanudar el cálculo completo…']) : t(['Calcul complet…', 'Full calculation…', 'Vollständige Berechnung…', 'Cálculo completo…']))}</button></p>`;
      }
      if (S.kind === 'computed') return `<p class="row"><button type="button" class="secondary" data-mora-zone="${esc(id)}"${moraBusy ? ' disabled' : ''} data-icon="chart" title="${esc(t(['Relief Terrarium, sommets OpenStreetMap et obstacles de la base, sur l’emprise de la zone (réseau)', 'Terrarium terrain, OpenStreetMap peaks and base obstacles, over the zone extent (network)']))}">${esc(t(['Calculer la MORA de la zone', 'Compute the zone MORA', 'MORA der Zone berechnen', 'Calcular la MORA de la zona']))}</button></p><p class="mt-small">${esc(t(['Autre source de MORA : X-Plane (grille mondiale, si la source X-Plane est cochée) ; la grille calculée a la priorité.', 'Other MORA source: X-Plane (world grid, if the X-Plane source is ticked); the computed grid has priority.']))}</p>`;
      // source à fournir par l'utilisateur (NATS…) et lisible par la base : bouton de dépôt (sélecteur ouvert sur
      // Téléchargements, fichiers rangés dans data/sia/zones/<zone>/, base reconstruite) — plus de dépôt à la main
      const drop = (S.kind === 'manual' || S.kind === 'pdf') && S.readable ? ` <button type="button" class="secondary" data-aero-drop="${esc(src)}" data-icon="upload" title="${esc(t(S.downloads ? ['Derniers ZIP de la source dans Téléchargements ({g}) ouverts, XML complets'.replace('{g}', S.downloads) + ' rangés dans data/sia/zones/{z}/, puis base reconstruite ; sans eux, choix des fichiers', 'Latest ZIPs of the source in Downloads ({g}) opened, full XMLs'.replace('{g}', S.downloads) + ' stored in data/sia/zones/{z}/, then database rebuilt; without them, file choice', 'Neueste ZIPs der Quelle in „Downloads“ ({g}) geöffnet, vollständige XML'.replace('{g}', S.downloads) + ' in data/sia/zones/{z}/ abgelegt, dann Datenbank neu aufgebaut', 'Últimos ZIP de la fuente en Descargas ({g}) abiertos, XML completos'.replace('{g}', S.downloads) + ' guardados en data/sia/zones/{z}/ y base reconstruida'] : ['Choisir les fichiers téléchargés (le sélecteur s’ouvre sur Téléchargements) : rangés dans data/sia/zones/{z}/, puis base reconstruite', 'Choose the downloaded files (the picker opens on Downloads): stored in data/sia/zones/{z}/, then database rebuilt', 'Heruntergeladene Dateien wählen (Auswahl öffnet „Downloads“): abgelegt in data/sia/zones/{z}/, dann Datenbank neu aufgebaut', 'Elegir los archivos descargados (el selector se abre en Descargas): guardados en data/sia/zones/{z}/ y base reconstruida'], {
        z: id
      }))}">${esc(t(S.downloads ? ['Prendre les derniers ZIP de Téléchargements', 'Take the latest ZIPs from Downloads', 'Neueste ZIPs aus „Downloads“ übernehmen', 'Tomar los últimos ZIP de Descargas'] : ['Déposer les fichiers…', 'Drop the files…', 'Dateien ablegen…', 'Depositar los archivos…']))}</button>` : '';
      return `<p class="mt-small">${esc(t(S.howto || ['', '']))}</p>${link || drop ? `<p class="row">${link}${drop}</p>` : ''}`;
    };
    const rows = z.sources.map(src => {
      const S = Z.SOURCES[src],
        st = aeroSourceStatus(Z, id, src),
        age = aeroAge(S, st);
      const mark = st.has === null ? pill('info', t(['lien', 'link', 'Link', 'enlace'])) : st.has ? pill(age === 'warn' ? 'warn' :
        'ok', age === 'warn' ? t(['à rafraîchir', 'to refresh', 'zu erneuern', 'por actualizar']) : t(['présent', 'present',
          'vorhanden', 'presente'
        ])) : pill('err', t(['manquant', 'missing', 'fehlt', 'falta']));
      return `<li class="mt-aero-src"><label><input type="checkbox" data-zone-src="${esc(src)}"${Z.srcOn(id, src) ? ' checked' : ''}> <b>${esc(t(S.label))}</b></label> ${mark}
        <div class="mt-small">${esc(t(S.gives))} · ${esc(st.text)} · ${esc(S.licence || '')}</div>${action(src)}</li>`;
    }).join('');
    return `<h3>${esc(zName(z))} <span class="mt-small">(${esc(id.toUpperCase())})</span>${aeroLocked && id === aeroPinned ? ` <button type="button" class="secondary" data-zone-unpin title="${esc(t(['Le panneau suit de nouveau le survol de la carte (aussi : nouveau clic sur la zone, Échap)', 'The panel follows the map hover again (also: click the zone again, Esc)', 'Das Feld folgt wieder dem Überfahren der Karte (auch: erneuter Klick auf die Zone, Esc)', 'El panel vuelve a seguir el paso del ratón (también: nuevo clic en la zona, Esc)']))}">📌 ${esc(t(['Libérer', 'Release', 'Lösen', 'Soltar']))}</button>` : ''}</h3>
      <p><span class="mt-aero-dot" style="background:${AERO_COLOR[state]}${state === 'blank' ? ';opacity:.25' : ''}"></span> ${esc(t(AERO_STATE[state]))}
        ${on ? `<button type="button" class="primary" data-zone-auto="${esc(id)}" data-icon="refresh" title="${esc(t(['Téléchargements, derniers ZIP de Téléchargements, reconstruction de la base, MORA de la zone : enchaînés', 'Downloads, latest ZIPs from Downloads, database rebuild, zone MORA: chained', 'Downloads, neueste ZIPs aus „Downloads“, Neuaufbau der Datenbank, MORA der Zone: verkettet', 'Descargas, últimos ZIP de Descargas, reconstrucción de la base, MORA de la zona: encadenados']))}">${esc(t(['Tout récupérer et recalculer', 'Fetch and recompute everything', 'Alles abrufen und neu berechnen', 'Obtener y recalcular todo']))}</button> ` : ''}<button type="button" class="${on ? 'secondary' : 'primary'}" data-zone-toggle="${esc(id)}">${esc(on ? t(['Désactiver la zone', 'Deactivate the zone', 'Zone deaktivieren', 'Desactivar la zona']) : t(['Activer la zone', 'Activate the zone', 'Zone aktivieren', 'Activar la zona']))}</button></p>
      <ul class="mt-aero-srcs">${rows}</ul>`;
  }
  /** Zones en GeoJSON (une entité par zone, état en propriété). */
  const aeroGeo = Z => ({
    type: 'FeatureCollection',
    features: Z.zones().map(z => ({
      type: 'Feature',
      properties: {
        zone: z.id,
        state: aeroZoneState(Z, z)
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: Z.ringsOf(z.id).map(r => [r])
      }
    }))
  });
  /** Carte du monde (MapLibre, fond OpenStreetMap) : créée une fois, reposée à chaque rendu du bloc. */
  async function aeroMapInit(Z) {
    if (aeroMapEl) return aeroMapEl;
    aeroMapEl = document.createElement('div');
    aeroMapEl.className = 'mt-aero-map';
    if (!window.maplibregl) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = new URL('shared/carto/maplibre-gl.css', root()).href;
      document.head.append(css);
      await new Promise(res => {
        const sc = document.createElement('script');
        sc.src = new URL('shared/carto/maplibre-gl.js', root()).href;
        sc.onload = res;
        sc.onerror = res;
        document.head.append(sc);
      });
    }
    if (!window.maplibregl) {
      aeroMapEl.textContent = t(['Carte indisponible (MapLibre) : la liste des zones reste dans le panneau.',
        'Map unavailable (MapLibre).'
      ]);
      return aeroMapEl;
    }
    aeroMap = new window.maplibregl.Map({
      container: aeroMapEl,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 7,
            attribution: '© OpenStreetMap contributors · Natural Earth'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          paint: {
            'raster-saturation': -0.75,
            'raster-opacity': 0.7
          }
        }]
      },
      center: [-20, 40],
      zoom: 1.2,
      maxZoom: 7,
      renderWorldCopies: false,
      // molette : la page défile ; zoom de la carte avec Ctrl (ou deux doigts), comme une carte intégrée à une page
      cooperativeGestures: true,
      attributionControl: {
        compact: true
      }
    });
    // carte créée bloc masqué (Paramètres : bloc affiché au choix dans le menu) : taille suivie à chaque changement du
    // cadre (affichage du bloc, largeur de la fenêtre), sinon elle reste à sa taille par défaut, vide
    if (window.ResizeObserver) new ResizeObserver(() => aeroMapEl.offsetWidth && aeroMap.resize()).observe(aeroMapEl);
    // zones posées dès le style chargé (« load » attend toutes les tuiles du fond : lent si le serveur OSM l'est) ;
    // « style.load » peut précéder l'abonnement : les deux événements, une seule fois
    const setup = () => {
      if (aeroMap.getSource('zones')) return;
      aeroMap.addSource('zones', {
        type: 'geojson',
        data: aeroGeo(Z),
        promoteId: 'zone'
      });
      const color = ['match', ['get', 'state'], 'partial', AERO_COLOR.partial, 'complete', AERO_COLOR.complete, AERO_COLOR.data];
      aeroMap.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones',
        paint: {
          'fill-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#1e6fd9', ['boolean', ['feature-state', 'hover'],
            false
          ], '#1e6fd9', color],
          'fill-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], .55, ['boolean', ['feature-state', 'hover'],
              false
            ],
            .2, ['match', ['get', 'state'], 'blank', .02, 'data', .35, 'partial', .5, 'complete', .55, .02]
          ]
        }
      });
      aeroMap.addLayer({
        id: 'zones-line',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#0b2f6b', ['boolean', ['feature-state', 'pinned'],
            false
          ], '#0b2f6b', ['boolean', ['feature-state', 'hover'], false], '#1e6fd9', ['match', ['get', 'state'], 'blank',
            '#9aa3ad',
            color
          ]],
          'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.6, ['boolean', ['feature-state', 'pinned'],
              false
            ],
            3.2, ['boolean', ['feature-state', 'hover'], false], 2.4, ['match', ['get', 'state'], 'blank', .5, 1.2]
          ]
        }
      });
      let hovered = null;
      const panel = () => document.getElementById('mtAeroPanel');
      aeroMap.on('mousemove', 'zones-fill', e => {
        const id = e.features?.[0]?.properties?.zone;
        if (!id || id === hovered) return;
        if (hovered) aeroMap.setFeatureState({
          source: 'zones',
          id: hovered
        }, {
          hover: false
        });
        hovered = aeroHover = id;
        aeroMap.setFeatureState({
          source: 'zones',
          id
        }, {
          hover: true
        });
        aeroMap.getCanvas().style.cursor = 'pointer';
        // panneau mis à jour après un court arrêt sur la zone : en traversant la carte, pas de redessin à chaque pays
        clearTimeout(aeroHoverTimer);
        if (panel() && !aeroLocked) aeroHoverTimer = setTimeout(() => aeroHover === id && !aeroLocked && aeroPanelShow(Z, id, {
          force: false
        }), 220);
      });
      aeroMap.on('mouseleave', 'zones-fill', () => {
        if (hovered) aeroMap.setFeatureState({
          source: 'zones',
          id: hovered
        }, {
          hover: false
        });
        // la zone affichée au panneau y reste (on va vers lui pour la régler) : pas de redessin en quittant la carte
        clearTimeout(aeroHoverTimer);
        const shown = document.getElementById('mtAeroPanel')?.dataset.zone;
        if (shown && !aeroLocked) aeroPinned = shown;
        hovered = aeroHover = null;
        aeroMap.getCanvas().style.cursor = '';
      });
      // clic : la zone entre dans la sélection ou en sort (« Activer » sous la carte l'applique)
      aeroMap.on('click', 'zones-fill', e => {
        const id = e.features?.[0]?.properties?.zone;
        if (!id) return;
        const sel = aeroSelection(Z);
        sel.has(id) ? sel.delete(id) : sel.add(id);
        aeroSelShow(Z);
      });
      aeroSelPaint(Z);
      if (aeroLocked) aeroMap.setFeatureState({
        source: 'zones',
        id: aeroPinned
      }, {
        pinned: true
      });
    };
    aeroMap.on('style.load', setup);
    aeroMap.on('load', setup);
    if (aeroMap.style?._loaded) setup();
    return aeroMapEl;
  }
  /** Sélection en cours (créée depuis les zones actives au premier clic). */
  const aeroSelection = Z => aeroSel ??= new Set(Z.zones().filter(z => Z.isOn(z.id)).map(z => z.id));
  /** Zones sélectionnées peintes sur la carte (état « sel »). */
  function aeroSelPaint(Z) {
    if (!aeroMap?.getSource?.('zones')) return;
    const sel = aeroSelection(Z);
    for (const z of Z.zones()) aeroMap.setFeatureState({
      source: 'zones',
      id: z.id
    }, {
      sel: sel.has(z.id)
    });
  }
  /** Barre de la sélection sous la carte : pays choisis, « Activer » (appliquer et tout récupérer), « Annuler ». */
  function aeroSelShow(Z) {
    aeroSelPaint(Z);
    const el = document.getElementById('mtAeroSel');
    if (!el) return;
    const sel = aeroSelection(Z),
      active = new Set(Z.zones().filter(z => Z.isOn(z.id)).map(z => z.id)),
      add = [...sel].filter(id => !active.has(id)),
      del = [...active].filter(id => !sel.has(id)),
      names = ids => ids.map(id => zName(Z.byId(id))).sort((a, b) => a.localeCompare(b)).join(', '),
      todo = [...sel].filter(id => aeroZoneState(Z, Z.byId(id)) !== 'complete');
    const what = [add.length && t(['à activer : {z}', 'to activate: {z}', 'zu aktivieren: {z}', 'por activar: {z}'], {
      z: names(add)
    }), del.length && t(['à désactiver : {z}', 'to deactivate: {z}', 'zu deaktivieren: {z}', 'por desactivar: {z}'], {
      z: names(del)
    })].filter(Boolean).join(' · ');
    const tip = t([
      'Active les pays choisis (désactive les autres), télécharge toutes leurs sources, reconstruit la base, calcule la MORA si la base est bonne ; ce qui reste à faire à la main est listé dessous',
      'Activates the chosen countries (deactivates the others), downloads all their sources, rebuilds the database, computes the MORA if the database is good; what is left to do by hand is listed below',
      'Aktiviert die gewählten Länder (deaktiviert die anderen), lädt alle Quellen, baut die Datenbank neu auf, berechnet die MORA, wenn die Datenbank in Ordnung ist; was von Hand bleibt, steht darunter',
      'Activa los países elegidos (desactiva los demás), descarga todas sus fuentes, reconstruye la base y calcula la MORA si la base es correcta; lo que queda a mano figura debajo'
    ]);
    el.innerHTML = `<p class="mt-small"><b>${esc(t(['Pays choisis', 'Chosen countries', 'Gewählte Länder', 'Países elegidos']))} (${sel.size})</b> : ${esc(sel.size ? names([...sel]) : t(['aucun — cliquer sur un pays de la carte', 'none — click a country on the map', 'keines — ein Land auf der Karte anklicken', 'ninguno — hacer clic en un país del mapa']))}${what ? ` — ${esc(what)}` : ''}</p>
      <p class="row"><button type="button" class="primary" data-sel-apply data-icon="download"${aeroAutoBusy || !(add.length || del.length || todo.length) ? ' disabled' : ''} title="${esc(tip)}">${esc(t(['Activer', 'Activate', 'Aktivieren', 'Activar']))}</button>${add.length || del.length ? ` <button type="button" class="secondary" data-sel-cancel>${esc(t(['Annuler', 'Cancel', 'Abbrechen', 'Cancelar']))}</button>` : ''}</p>`;
    el.onclick = e => {
      if (e.target.closest('[data-sel-cancel]')) {
        aeroSel = null;
        aeroSelShow(Z);
      } else if (e.target.closest('[data-sel-apply]')) aeroSelApply(Z);
    };
  }
  /** « Activer » : zones actives = sélection, puis mise en place enchaînée des zones choisies incomplètes. */
  async function aeroSelApply(Z) {
    const sel = aeroSelection(Z);
    for (const z of Z.zones())
      if (Z.isOn(z.id) !== sel.has(z.id)) Z.setZone(z.id, sel.has(z.id));
    aeroSel = null;
    aeroRefresh(Z);
    await aeroAutoZones(Z, [...sel].filter(id => aeroZoneState(Z, Z.byId(id)) !== 'complete'));
  }
  /** Ligne du tableau des sources : zone épinglée au panneau, source mise en vue et son action principale lancée
   *  (téléchargement, ZIP du SIA, import du PDF MILAIP, choix du dossier X-Plane, MORA de la zone) ; dans le geste de
   *  l'utilisateur, pour les sélecteurs de fichiers et de dossiers. */
  function aeroRowAction(Z, id, src) {
    aeroPin(Z, id);
    const panel = document.getElementById('mtAeroPanel'),
      li = panel?.querySelector(`[data-zone-src="${src}"]`)?.closest('li');
    if (!li) return;
    li.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    });
    li.classList.add('repo-block-flash');
    setTimeout(() => li.classList.remove('repo-block-flash'), 1600);
    const ctl = src === 'sia' ? li.querySelector('#mtSiaFetch') : src === 'dircam' ? li.querySelector('#mtEnr57') : src === 'mora' ? li
      .querySelector('[data-mora-zone], [data-mora-xp-zone]') : src === 'xplane' ? li.querySelector('button.mt-folder') : li
      .querySelector('[data-aero-fetch]') || li.querySelector('[data-aero-drop]');
    if (ctl && !ctl.disabled) ctl.click();
  }
  /** Zone du panneau : l'épinglée, sinon la survolée, sinon la dernière choisie. */
  const aeroShown = () => aeroLocked ? aeroPinned : aeroHover || aeroPinned;
  /** Épingle une zone (clic sur la carte) ou la relâche (null, clic sur la zone épinglée, Échap, « Libérer »). */
  function aeroPin(Z, id) {
    if (aeroMap?.getSource?.('zones') && aeroPinned) aeroMap.setFeatureState({
      source: 'zones',
      id: aeroPinned
    }, {
      pinned: false
    });
    aeroLocked = !!id;
    if (id) aeroPinned = id;
    if (aeroLocked && aeroMap?.getSource?.('zones')) aeroMap.setFeatureState({
      source: 'zones',
      id
    }, {
      pinned: true
    });
    aeroPanelShow(Z, aeroShown());
  }
  /** Panneau d'une zone (survolée ou choisie), avec ses actions. */
  function aeroPanelShow(Z, id, {
    force = true
  } = {}) {
    const el = document.getElementById('mtAeroPanel');
    if (!el) return;
    // survol : la même zone n'est pas redessinée (boutons, cases, position de la page gardés)
    if (!force && el.dataset.zone === id) return;
    el.innerHTML = aeroPanel(Z, id);
    el.dataset.zone = id;
    const xp = el.querySelector('[data-aero-xp]');
    if (xp) {
      const b = folderButton('__xpnav', async () => {
        aeroInv = await aeroInventory();
        aeroRefresh(Z);
      }, {
        withLabel: false
      });
      if (aeroXpLabel) b.textContent = aeroXpLabel;
      xp.append(b);
      setTimeout(() => b.isConnected && b.textContent.trim() && (aeroXpLabel = b.textContent), 400);
    }
    // icônes des boutons posées par block_icons.js (observateur des ajouts) : pas de rafraîchissement de la page à chaque
    // survol (il redécorait tous les blocs)
  }
  /** États de la carte, panneau et tableau des cycles redessinés (après un réglage ou un téléchargement). */
  function aeroRefresh(Z) {
    aeroMap?.getSource?.('zones')?.setData(aeroGeo(Z));
    aeroPanelShow(Z, aeroShown());
    aeroAges(Z);
    aeroTodo(Z);
    aeroSelShow(Z);
  }
  /** Cycles AIRAC et âge des données des zones actives. */
  /** Fichiers d'une source d'une zone (inventaire du dossier SIA) : [{ rel, at, size }] ; mora.csv pour la MORA. */
  const aeroFilesOf = (Z, id, src) => (aeroInv?.files || []).filter(f => {
    const fs = Z.fileSource(f.rel);
    return fs && fs.source === src && (fs.zone === id || fs.zone === '*');
  });
  /** Lignes du tableau des sources cochées des zones actives : { zone, zoneName, src, label, files, filesTitle, cyc, days,
   *  size, state 'err' | 'warn' | 'ok' }. */
  function aeroAgesRows(Z) {
    const days = at => at ? Math.max(0, Math.floor((Date.now() - at) / 864e5)) : null;
    return Z.zones().filter(z => Z.isOn(z.id)).flatMap(z => z.sources.filter(s => Z.srcOn(z.id, s) && Z.SOURCES[s].readable).map(s => {
      const S = Z.SOURCES[s],
        st = aeroSourceStatus(Z, z.id, s),
        age = aeroAge(S, st),
        files = s === 'xplane' ? [] : aeroFilesOf(Z, z.id, s),
        at = Math.max(0, ...files.map(f => f.at || 0));
      return {
        zone: z.id,
        zoneName: zName(z),
        src: s,
        label: t(S.label).split(/ — | \(/)[0],
        files: s === 'xplane' ? null : files.length,
        filesTitle: s === 'xplane' ? st.text : files.map(f => f.rel).join('\n'),
        cyc: st.airac || (at ? fmtDate(at, false) : ''),
        days: s === 'xplane' ? null : days(at),
        size: files.reduce((n, f) => n + (f.size || 0), 0),
        state: age === 'none' ? 'err' : age === 'warn' ? 'warn' : 'ok'
      };
    }));
  }
  const AERO_PB_KEY = 'mtAeroProblems:v1';
  /** Vrai si la case « Afficher les problèmes » est mémorisée cochée (mtAeroProblems:v1) ; faux si le stockage est inaccessible. */
  const aeroProblemsOnly = () => {
    try {
      return localStorage.getItem(AERO_PB_KEY) === '1';
    } catch {
      return false;
    }
  };
  /** Cycles AIRAC, puis le tableau de toutes les sources cochées des zones actives (tableau du framework, triable :
   *  SortedTable) : en tête le nombre de contrôles sans souci ; problèmes (manquants) d'abord, avertissements (anciens)
   *  ensuite ; mode « Afficher les problèmes » ; une ligne cliquable relance le traitement de sa source (aeroRowAction). */
  function aeroAges(Z) {
    const el = document.getElementById('mtAeroAges');
    if (!el) return;
    const eff = window.Airac.cycle(),
      nxt = window.Airac.next(),
      info = window.SiaBase.info();
    const all = aeroAgesRows(Z),
      n = {
        ok: all.filter(r => r.state === 'ok').length,
        warn: all.filter(r => r.state === 'warn').length,
        err: all.filter(r => r.state === 'err').length
      },
      only = aeroProblemsOnly(),
      rows = only ? all.filter(r => r.state !== 'ok') : all;
    const LEVEL = {
      err: 0,
      warn: 1,
      ok: 2
    };
    const STATE = {
      err: ['manquant', 'missing', 'fehlt', 'falta'],
      warn: ['ancien', 'old', 'alt', 'antiguo'],
      ok: ['à jour', 'up to date', 'aktuell', 'al día']
    };
    el.innerHTML = `<p>${esc(t(['Cycle AIRAC en vigueur', 'AIRAC cycle in force', 'Gültiger AIRAC-Zyklus', 'Ciclo AIRAC vigente']))} : <b>${esc(eff.label)}</b> (${esc(fmtDate(eff.date, false))} → ${esc(fmtDate(eff.until, false))}) · ${esc(t(['suivant', 'next', 'nächster', 'siguiente']))} : <b>${esc(nxt.label)}</b> (${esc(fmtDate(nxt.date, false))}) · ${esc(t(['base aéronautique', 'aeronautical database', 'Luftfahrtdatenbank', 'base aeronáutica']))} : ${info ? `${esc(info.airac || '—')} (${esc(fmtDate(info.cachedAt))})` : '—'}</p>
      ${all.length ? `<p class="row mt-small"><b>${esc(t(['{n} contrôle(s) sans souci', '{n} check(s) without issue', '{n} Prüfung(en) ohne Befund', '{n} control(es) sin problemas'], { n: n.ok }))}</b> · ${n.err ? pill('err', t(['{n} problème(s)', '{n} problem(s)', '{n} Problem(e)', '{n} problema(s)'], { n: n.err })) : ''} ${n.warn ? pill('warn', t(['{n} avertissement(s)', '{n} warning(s)', '{n} Warnung(en)', '{n} aviso(s)'], { n: n.warn })) : ''}
        <label><input type="checkbox" data-aero-problems${only ? ' checked' : ''}> ${esc(t(['Afficher les problèmes', 'Show the problems', 'Probleme anzeigen', 'Mostrar los problemas']))}</label></p>
        <div id="mtAeroTable"></div>` : `<p class="mt-small">${esc(t(['Aucune zone active : cliquer les zones voulues sur la carte.', 'No active zone: click the wanted zones on the map.', 'Keine aktive Zone: gewünschte Zonen auf der Karte anklicken.', 'Ninguna zona activa: haga clic en las zonas deseadas en el mapa.']))}</p>`}
      <p class="mt-small">${esc(t(['Données téléchargées : à rafraîchir au-delà de 28 jours (un cycle AIRAC) ; SIA : cycle du nom des fichiers ; X-Plane : cycle de « Custom Data ». Un clic sur une ligne met sa source à jour.', 'Downloaded data: to refresh after 28 days (one AIRAC cycle); SIA: cycle in the file names; X-Plane: “Custom Data” cycle. A click on a row updates its source.']))}</p>`;
    el.querySelector('[data-aero-problems]')?.addEventListener('change', e => {
      try {
        localStorage.setItem(AERO_PB_KEY, e.target.checked ? '1' : '');
      } catch {}
      aeroAges(Z);
    });
    const host = el.querySelector('#mtAeroTable');
    if (!host || !window.SortedTable) return;
    window.SortedTable.render(host, {
      rows,
      storageKey: 'mtAeroTable',
      defaultSortKey: 'state',
      defaultDir: 1,
      emptyText: t(['Aucun problème : toutes les sources des zones actives sont présentes et à jour.',
        'No problem: all sources of the active zones are present and up to date.',
        'Kein Problem: Alle Quellen der aktiven Zonen sind vorhanden und aktuell.',
        'Ningún problema: todas las fuentes de las zonas activas están presentes y al día.'
      ]),
      onRowClick: r => aeroRowAction(Z, r.zone, r.src),
      columns: [{
        key: 'state',
        label: t(['État', 'State', 'Status', 'Estado']),
        sortValue: r => LEVEL[r.state],
        html: (v, r) => pill(r.state, t(STATE[r.state]))
      }, {
        key: 'zoneName',
        label: t(['Zone', 'Zone', 'Zone', 'Zona'])
      }, {
        key: 'label',
        label: t(['Source', 'Source', 'Quelle', 'Fuente'])
      }, {
        key: 'files',
        label: t(['Fichiers', 'Files', 'Dateien', 'Archivos']),
        type: 'number',
        html: (v, r) => v == null ? esc(r.filesTitle || '—') : v ? `<span title="${esc(r.filesTitle)}">${v}</span>` : '—'
      }, {
        key: 'cyc',
        label: t(['Cycle ou date', 'Cycle or date', 'Zyklus oder Datum', 'Ciclo o fecha']),
        format: v => v || '—'
      }, {
        key: 'days',
        label: t(['Âge', 'Age', 'Alter', 'Antigüedad']),
        type: 'number',
        sortValue: r => r.days ?? -1,
        format: v => v == null ? '—' : t(['{n} j', '{n} d', '{n} T', '{n} d'], {
          n: v
        })
      }, {
        key: 'size',
        label: t(['Taille', 'Size', 'Größe', 'Tamaño']),
        type: 'number',
        format: v => v ? fmtSize(v) : '—'
      }]
    });
  }
  /** Actions manuelles restantes, sous la carte, pour toutes les zones actives : une ligne par source cochée absente ou
   *  ancienne, avec son lien (site de la source) et son bouton (même traitement que le panneau : aeroRowAction). */
  function aeroTodo(Z) {
    const el = document.getElementById('mtAeroTodo');
    if (!el) return;
    const eff = window.Airac.cycle();
    // téléchargements et MORA : faits par « Activer » (aeroAutoZones), comptés sur une seule ligne, pas listés un à un
    let auto = 0;
    const lines = Z.zones().filter(z => Z.isOn(z.id)).flatMap(z => z.sources.filter(s => Z.srcOn(z.id, s) && Z.SOURCES[s].readable).map(
      s => {
        const S = Z.SOURCES[s],
          st = aeroSourceStatus(Z, z.id, s),
          age = aeroAge(S, st);
        if (age === 'ok') return '';
        if (S.kind === 'download' || S.kind === 'computed') {
          auto++;
          return '';
        }
        const url = s === 'sia' ? eff.url : Z.linkOf(s);
        const what = s === 'sia' ? [t(['commander le cycle {c} sur le site du SIA', 'order cycle {c} on the SIA website',
            'Zyklus {c} auf der SIA-Website bestellen', 'pedir el ciclo {c} en el sitio del SIA'
          ], {
            c: eff.label
          }), t(['Prendre le dernier ZIP', 'Take the latest ZIP', 'Neueste ZIP übernehmen', 'Tomar el último ZIP'])] :
          S.downloads ? [t(['télécharger les jeux', 'download the datasets', 'Datensätze herunterladen', 'descargar los conjuntos']),
            t(['Prendre les derniers ZIP', 'Take the latest ZIPs', 'Neueste ZIPs übernehmen', 'Tomar los últimos ZIP'])
          ] :
          s === 'dircam' ? [t(['télécharger le PDF de la MILAIP (ENR 5.7)', 'download the MILAIP PDF (ENR 5.7)',
            'MILAIP-PDF herunterladen (ENR 5.7)', 'descargar el PDF de la MILAIP (ENR 5.7)'
          ]), t(['Importer le PDF…', 'Import the PDF…', 'PDF importieren…', 'Importar el PDF…'])] :
          S.kind === 'download' ? ['', t(['Télécharger', 'Download', 'Herunterladen', 'Descargar'])] :
          S.kind === 'computed' ? ['', moraTooLarge(Z, z.id) ? t(['MORA d’X-Plane', 'X-Plane MORA', 'MORA von X-Plane',
            'MORA de X-Plane'
          ]) : t(['Calculer la MORA', 'Compute the MORA', 'MORA berechnen', 'Calcular la MORA'])] :
          S.kind === 'local' ? ['', t(['Choisir le dossier…', 'Choose the folder…', 'Ordner wählen…', 'Elegir la carpeta…'])] : [t([
            'télécharger les fichiers', 'download the files', 'Dateien herunterladen', 'descargar los archivos'
          ]), t(['Déposer les fichiers…', 'Drop the files…', 'Dateien ablegen…', 'Depositar los archivos…'])];
        return `<li>${pill(age === 'none' ? 'err' : 'warn', age === 'none' ? t(['manquant', 'missing', 'fehlt', 'falta']) : t(['ancien', 'old', 'alt', 'antiguo']))} <b>${esc(zName(z))} — ${esc(t(S.label).split(/ — | \(/)[0])}</b> : ${url && what[0] ? `<a class="mt-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(what[0])} ↗</a> / ` : ''}<button type="button" class="secondary mt-btn-sm" data-todo-zone="${esc(z.id)}" data-todo-src="${esc(s)}">${esc(what[1])}</button></li>`;
      })).filter(Boolean);
    el.dataset.subtitle = t([
      'Ce que la suite ne peut pas faire seule : commandes, téléchargements à la main, dossiers à choisir — une ligne par source des zones actives',
      'What the suite cannot do on its own: orders, manual downloads, folders to choose — one line per source of the active zones',
      'Was die Suite nicht allein kann: Bestellungen, manuelle Downloads, zu wählende Ordner — eine Zeile pro Quelle der aktiven Zonen',
      'Lo que la suite no puede hacer sola: pedidos, descargas manuales, carpetas que elegir — una línea por fuente de las zonas activas'
    ]);
    if (auto) lines.unshift(`<li>${pill('info', t(['automatique', 'automatic', 'automatisch', 'automático']))} ${esc(t(['{n} source(s) téléchargée(s) ou calculée(s) par « Activer » sous la carte (téléchargements, MORA)', '{n} source(s) downloaded or computed by “Activate” under the map (downloads, MORA)', '{n} Quelle(n), die „Aktivieren“ unter der Karte lädt oder berechnet (Downloads, MORA)', '{n} fuente(s) descargada(s) o calculada(s) por «Activar» bajo el mapa (descargas, MORA)'], { n: auto }))}</li>`);
    el.innerHTML = `<h3>${esc(t(['Actions à faire', 'Actions to do', 'Zu erledigen', 'Acciones pendientes']))}</h3>${lines.length ? `<ul class="mt-aero-todo">${lines.join('')}</ul>` : `<p class="mt-small">${pill('ok', t(['rien à faire : toutes les sources des zones actives sont présentes et à jour', 'nothing to do: all sources of the active zones are present and up to date', 'nichts zu tun: alle Quellen der aktiven Zonen sind vorhanden und aktuell', 'nada que hacer: todas las fuentes de las zonas activas están presentes y al día']))}</p>`}`;
    el.onclick = e => {
      const b = e.target.closest('[data-todo-src]');
      if (b) aeroRowAction(Z, b.dataset.todoZone, b.dataset.todoSrc);
    };
    window.AppFramework?.refresh?.(el);
  }
  // ---- mise en place automatique d'une zone (première activation, ou « Tout récupérer et recalculer ») : téléchargements
  // de ses sources, derniers ZIP de Téléchargements (SIA, NATS…), reconstruction de la base, MORA de la zone — enchaînés,
  // double jauge (AppFramework.task : étape, puis détail) ; ce qui reste à la main paraît sous la carte (aeroTodo).
  const AERO_AUTO_KEY = 'aeroZoneAuto:v1';
  /** Zones déjà mises en place automatiquement (Set lu dans aeroZoneAuto:v1 ; vide si illisible). */
  const aeroAutoDone = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(AERO_AUTO_KEY) || '[]'));
    } catch {
      return new Set();
    }
  };
  let aeroAutoBusy = false;
  /** Mise en place automatique d'une seule zone (aeroAutoZones). */
  const aeroAutoZone = (Z, id) => aeroAutoZones(Z, [id]);
  /** Mise en place de zones actives : téléchargements de leurs sources, derniers ZIP de Téléchargements, une seule
   *  reconstruction de la base, puis MORA de chaque zone qui en manque — seulement si la base a été reconstruite (relief
   *  sans obstacles sinon) ; résumé en notification, reliquat sous la carte (aeroTodo). */
  async function aeroAutoZones(Z, ids) {
    ids = ids.filter(id => Z.byId(id) && Z.isOn(id));
    if (aeroAutoBusy || !ids.length) return;
    aeroAutoBusy = true;
    aeroSelShow(Z);
    const steps = [],
      moras = [];
    let rebuilt = false,
      fetched = false,
      sia = false;
    const xpMora = ((await window.SiaBase.get())?.moraCells || []).some(c => c.src === 'xplane');
    for (const id of ids) {
      const z = Z.byId(id),
        many = ids.length > 1 ? `${zName(z)} — ` : '';
      for (const s of z.sources) {
        const S = Z.SOURCES[s];
        if (!Z.srcOn(id, s) || !S?.readable) continue;
        const fresh = aeroAge(S, aeroSourceStatus(Z, id, s)) === 'ok';
        if (S.kind === 'download') steps.push([many + t(S.label), async () => {
          await aeroFetch(S.provider, S.args || [id], null, id, s);
          fetched = true;
        }]);
        // le ZIP du SIA vaut pour toute la France : une seule fois
        else if (s === 'sia' && !fresh && !sia) {
          sia = true;
          steps.push(['SIA', async () => {
            if (await siaFetchZip({
                quiet: true
              })) rebuilt = true;
          }]);
        } else if (S.downloads && !fresh) steps.push([many + t(S.label), async () => {
          if (await aeroDrop(id, s, {
              auto: true
            })) rebuilt = true;
        }]);
      }
      // MORA : calculée pour une zone ordinaire ; grande zone : celle d'X-Plane, si la base en a
      if (z.sources.includes('mora') && Z.srcOn(id, 'mora') && !aeroSourceStatus(Z, id, 'mora').has && (!moraTooLarge(Z, id) || xpMora))
        moras.push(id);
    }
    const total = steps.length + 1 + moras.length;
    const job = window.AppFramework?.task?.(ids.length > 1 ? t(['Mise en place de {n} zones', 'Setting up {n} zones',
      'Einrichtung von {n} Zonen', 'Puesta en marcha de {n} zonas'
    ], {
      n: ids.length
    }) : t(['Mise en place de la zone {z}', 'Setting up zone {z}', 'Einrichtung der Zone {z}', 'Puesta en marcha de la zona {z}'], {
      z: zName(Z.byId(ids[0]))
    }), {
      // « Arrêter » : la tâche en cours va à son terme, les suivantes ne sont pas lancées (sortie propre des boucles)
      cancel: () => {}
    });
    const before = window.SiaBase.info()?.cachedAt || '';
    const zones = names => names.map(id => zName(Z.byId(id))).join(', ');
    try {
      for (const [i, [label, fn]] of steps.entries()) {
        if (job?.cancelled) break;
        job?.set?.(i, total, label);
        try {
          await fn();
        } catch (e) {
          // une source en échec n'arrête pas les autres : elle reste dans « Actions à faire »
          window.AppFramework?.notify?.(`${label} : ${e.message}`, 'warn');
        }
      }
      job?.set?.(steps.length, total, t(['Base aéronautique', 'Aeronautical database', 'Luftfahrtdatenbank', 'Base aeronáutica']));
      if (!job?.cancelled && (!rebuilt || fetched)) await basePanelApi?.reread(true);
      // base vraiment relue ? (dossier SIA non choisi, lecture annulée : le bloc de la base le dit)
      const built = (window.SiaBase.info()?.cachedAt || '') !== before;
      const moraDone = [];
      if (built)
        for (const [i, id] of moras.entries()) {
          if (job?.cancelled) break;
          job?.set?.(steps.length + 1 + i, total, `MORA — ${zName(Z.byId(id))}`);
          await moraExclusive(moraTooLarge(Z, id) ? planMoraXplane : planMoraZone, id);
          moraDone.push(id);
        }
      // arrêt demandé : zones non marquées « faites » (la mise en place pourra être relancée), état des sources
      // rafraîchi ; job.end() dans finally notifie « Annulé. » à la place du bilan
      if (job?.cancelled) {
        aeroInv = await aeroInventory();
        aeroRefresh(Z);
        return;
      }
      const done = aeroAutoDone();
      ids.forEach(id => done.add(id));
      try {
        localStorage.setItem(AERO_AUTO_KEY, JSON.stringify([...done]));
      } catch {}
      aeroInv = await aeroInventory();
      aeroRefresh(Z);
      const left = document.querySelectorAll('#mtAeroTodo .mt-aero-todo>li [data-todo-src]').length;
      const parts = [built ? t(['base reconstruite', 'database rebuilt', 'Datenbank neu aufgebaut', 'base reconstruida']) : t([
          'base non reconstruite (voir « Base aéronautique ») : MORA non calculée',
          'database not rebuilt (see “Aeronautical database”): MORA not computed',
          'Datenbank nicht neu aufgebaut (siehe „Luftfahrtdatenbank“): MORA nicht berechnet',
          'base no reconstruida (ver «Base aeronáutica»): MORA no calculada'
        ]), moraDone.length && t(['MORA : {z}', 'MORA: {z}', 'MORA: {z}', 'MORA: {z}'], {
          z: zones(moraDone)
        }),
        left ? t(['{n} action(s) à faire à la main, listées sous la carte', '{n} action(s) to do by hand, listed under the map',
          '{n} Aufgabe(n) von Hand, unter der Karte aufgeführt', '{n} acción(es) que hacer a mano, listadas bajo el mapa'
        ], {
          n: left
        }) : t(['rien d’autre à faire', 'nothing else to do', 'nichts weiter zu tun', 'nada más que hacer'])
      ].filter(Boolean);
      window.AppFramework?.notify?.(`${zones(ids)} : ${parts.join(' ; ')}.`, built ? 'ok' : 'warn');
      if (left) document.getElementById('mtAeroTodo')?.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    } catch (e) {
      window.AppFramework?.notify?.(e.message, 'err');
    } finally {
      job?.end?.();
      aeroAutoBusy = false;
      aeroSelShow(Z);
    }
  }
  // un seul calcul de MORA à la fois (zone, simple, complet) : boutons désactivés pendant le calcul, un clic de plus
  // ne relance rien (deux calculs mêlaient leurs progressions, comme un calcul qui tourne en boucle)
  let moraBusy = false;
  /** Désactive (ou réactive) tous les boutons de calcul de MORA selon moraBusy. */
  const moraButtons = () => document.querySelectorAll(
    '#mtMora, #mtMoraFull, #mtMoraXp, [data-mora-zone], [data-mora-xp-zone], [data-mora-roll]').forEach(x => {
    x.disabled = moraBusy;
  });
  /** Cases d'un degré d'une zone (« lat|lon » du coin sud-ouest) : celles dont le centre est dans un contour, plus
   *  celles que traverse un contour (îles plus petites qu'une case : La Réunion, Mayotte, les Antilles…, que le test du
   *  coin d'une case manquait — la MORA d'une zone se limitait alors à la métropole). */
  function zoneCellKeys(Z, id) {
    const out = new Set(Z.cellsOf(id));
    for (const r of Z.ringsOf(id))
      for (const [lon, lat] of r) out.add(`${Math.floor(lat)}|${Math.floor(lon)}`);
    return out;
  }
  /** Lance le calcul de MORA fn(...args) s'il n'y en a pas déjà un, boutons désactivés ; écrit mora.csv si un plan reste
   *  à écrire, puis reprend le message de la carte MORA en notification. */
  async function moraExclusive(fn, ...args) {
    if (moraBusy) return window.AppFramework?.notify?.(t(['Calcul de la MORA déjà en cours : attendez qu’il se termine.',
      'MORA calculation already running: wait for it to finish.',
      'MORA-Berechnung läuft bereits: bitte warten, bis sie fertig ist.',
      'Cálculo de la MORA ya en curso: espere a que termine.'
    ]), 'warn');
    moraBusy = true;
    moraButtons();
    try {
      await fn(...args);
      // calcul réussi : mora.csv écrit aussitôt (l'ancien part dans _archives/) — la zone passait à 14/14 sans rien
      // écrire, la source restait « absente » tant qu'on ne trouvait pas « Écrire mora.csv » plus bas
      if (moraPlan && !moraPlan.written) await writeMora();
    } finally {
      moraBusy = false;
      moraButtons();
      // résultat ou erreur aussi en notification : le message de la carte MORA est loin de la zone cliquée
      if (moraMsg) {
        const d = document.createElement('div');
        d.innerHTML = moraMsg;
        window.AppFramework?.notify?.(d.textContent.replace(/^[✓⚠✗ℹ]\s*/, ''), /mt-err/.test(moraMsg) ? 'err' : /mt-warn/.test(
          moraMsg) ? 'warn' : 'ok');
      }
    }
  }
  /** Nombre de cases d'un degré d'une zone (emprises) ; au-delà de 1500, calcul d'un seul tenant refusé (grande zone). */
  const moraCellsOf = (Z, id) => Z.zoneBoxes(id).reduce((n, b) => n + (b.n - b.s) * (b.e - b.w), 0);
  /** Vrai pour une grande zone (plus de 1500 cases d'un degré). */
  const moraTooLarge = (Z, id) => moraCellsOf(Z, id) > 1500;
  // ---- MORA d'une grande zone par blocs (option B, sur confirmation) : blocs de 10° × 10° au plus, chacun écrit
  // aussitôt dans mora.csv (reprise possible, d'une séance à l'autre : blocs faits notés dans ce navigateur) ; relief des
  // tuiles Terrarium d'AWS (données ouvertes, faites pour l'accès en masse), une tuile fine par case, relief majoré de
  // 100 m, sans requête OpenStreetMap ; « Arrêter » entre deux blocs.
  const ROLL_KEY = id => `moraRolling:v1:${id}`;
  /** Avancement du calcul par blocs de la zone id mémorisé dans ce navigateur : { done: [clés des blocs faits], total?, … }. */
  const moraRollState = id => {
    try {
      return JSON.parse(localStorage.getItem(ROLL_KEY(id)) || 'null') || {
        done: []
      };
    } catch {
      return {
        done: []
      };
    }
  };

  /** Découpe les emprises de la zone id en blocs de 10° × 10° au plus : [{ s, n, w, e }] (degrés entiers). */
  function moraChunks(Z, id) {
    const out = [];
    for (const b of Z.zoneBoxes(id))
      for (let s = b.s; s < b.n; s += 10)
        for (let w = b.w; w < b.e; w += 10) out.push({
          s,
          n: Math.min(b.n, s + 10),
          w,
          e: Math.min(b.e, w + 10)
        });
    return out;
  }
  let moraStop = false;
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-mora-stop]')) {
      moraStop = true;
      e.target.closest('[data-mora-stop]').disabled = true;
    }
  });
  /** Calcul complet de la MORA d'une grande zone par blocs, après confirmation : chaque bloc restant est calculé (relief AWS,
   *  sans sommets OSM), fusionné aussitôt dans mora.csv (ancien archivé une fois) et noté fait ; « Arrêter » entre deux blocs. */
  async function moraRolling(id) {
    const Z = await window.SiaBase.zones(),
      z = Z.byId(id),
      chunks = moraChunks(Z, id),
      zk = zoneCellKeys(Z, id),
      st = moraRollState(id);
    if (st.total !== chunks.length) st.done = [];
    const left = chunks.map((c, i) => i).filter(i => !st.done.includes(i));
    if (!left.length) return window.AppFramework?.notify?.(t(['MORA de {z} : tous les blocs sont déjà calculés (dans mora.csv).',
      'MORA of {z}: all blocks are already computed (in mora.csv).',
      'MORA von {z}: alle Blöcke sind bereits berechnet (in mora.csv).',
      'MORA de {z}: todos los bloques ya están calculados (en mora.csv).'
    ], {
      z: zName(z)
    }), 'ok');
    const cells = left.reduce((n, i) => n + (chunks[i].n - chunks[i].s) * (chunks[i].e - chunks[i].w), 0),
      mb = Math.round(cells * 0.25); // ≈ 2 tuiles z9 et 1 tuile fine par case
    if (!await window.AppFramework.ask(t([
        'Calcul complet de la MORA de {z} : {b} bloc(s) de 10°, {c} cases d’un degré, environ {m} Mo de relief téléchargé (tuiles ouvertes d’AWS, sans requête OpenStreetMap) et plusieurs minutes par bloc.\n\nChaque bloc est écrit aussitôt dans mora.csv : « Arrêter » entre deux blocs, reprise plus tard là où le calcul s’est arrêté. Lancer ?',
        'Full MORA calculation of {z}: {b} 10° block(s), {c} one-degree cells, about {m} MB of terrain downloaded (AWS open tiles, no OpenStreetMap query) and several minutes per block.\n\nEach block is written to mora.csv at once: “Stop” between two blocks, resume later where it stopped. Start?',
        'Vollständige MORA-Berechnung von {z}: {b} 10°-Block/Blöcke, {c} Ein-Grad-Felder, etwa {m} MB Relief heruntergeladen (offene AWS-Kacheln, ohne OpenStreetMap-Abfrage) und mehrere Minuten pro Block.\n\nJeder Block wird sofort in mora.csv geschrieben: „Anhalten“ zwischen zwei Blöcken, später dort fortsetzen. Starten?',
        'Cálculo completo de la MORA de {z}: {b} bloque(s) de 10°, {c} casillas de un grado, unos {m} MB de relieve descargados (teselas abiertas de AWS, sin consulta a OpenStreetMap) y varios minutos por bloque.\n\nCada bloque se escribe enseguida en mora.csv: «Detener» entre dos bloques, reanudar más tarde donde se detuvo. ¿Iniciar?'
      ], {
        z: zName(z),
        b: left.length,
        c: cells,
        m: mb
      }), {
        ok: t(['Lancer le calcul', 'Start the calculation', 'Berechnung starten', 'Iniciar el cálculo'])
      })) return;
    /** Affiche x (HTML) dans le message de la carte MORA (#mtMoraMsg). */
    const say = x => {
      const m = hosts.sia.querySelector('#mtMoraMsg');
      if (m) m.innerHTML = x;
    };
    const dir = await folder('__sia', true);
    if (!dir) return window.AppFramework?.notify?.(t(['Dossier SIA non autorisé : Installation › Sources et dossiers.',
      'SIA folder not authorised: Installation › Sources and folders.',
      'SIA-Ordner nicht freigegeben: Installation › Quellen und Ordner.',
      'Carpeta SIA no autorizada: Instalación › Fuentes y carpetas.'
    ]), 'err');
    moraStop = false;
    moraMsg = '';
    moraPlan = null;
    const job = window.AppFramework?.task?.(t(['MORA de {z} par blocs', 'MORA of {z} in blocks', 'MORA von {z} in Blöcken',
      'MORA de {z} por bloques'
    ], {
      z: zName(z)
    }));
    const b = await window.SiaBase.get(),
      key = c => `${Math.floor(c.lat)}|${Math.floor(c.lon)}`,
      SRC =
      'Calculée par blocs : relief Terrarium (AWS Terrain Tiles) majoré de 100 m + obstacles AIXM SIA, sans sommets OSM — non certifiée';
    let archived = false,
      merged = null;
    try {
      for (const [k, i] of left.entries()) {
        if (moraStop) break;
        const c = chunks[i],
          label = `${id.toUpperCase()} — ${t(['bloc', 'block', 'Block', 'bloque'])} ${st.done.length + 1}/${chunks.length} (${c.s}…${c.n}° / ${c.w}…${c.e}°)`;
        job?.set?.(k, left.length, label);
        say(`<span class="mt-small">${esc(label)}…</span> <button type="button" class="secondary" data-mora-stop>${esc(t(['Arrêter (reprise plus tard)', 'Stop (resume later)', 'Anhalten (später fortsetzen)', 'Detener (reanudar más tarde)']))}</button>`);
        const part = await window.SiaBase.computeMoraGrid(b?.obstacleMax || {}, {
          ...c,
          name: `${id}-${i + 1}`,
          peaks: false,
          fineMax: 1
        }, (d, n, step) => job?.sub?.(d, n, `${label} — ${step || ''} ${d}/${n}`));
        const mine = part.filter(x => zk.has(key(x))).map(x => ({
          ...x,
          source: SRC,
          keepSource: true
        }));
        // fusion immédiate dans mora.csv : la reprise repart du fichier
        const old = await fileAt(dir, 'mora.csv'),
          text = old ? await old.text() : '';
        if (old && !archived) {
          await writeAt(dir, `_archives/mora_${new Date(old.lastModified).toISOString().slice(0, 10)}.csv`, await old.arrayBuffer());
          archived = true;
        }
        const keys = new Set(mine.map(key));
        merged = (text ? window.SiaBase.parseMora(text) : []).filter(x => !keys.has(key(x))).map(x => ({
          ...x,
          keepSource: true
        })).concat(mine);
        await writeAt(dir, 'mora.csv', window.SiaBase.moraCsv(merged, {
          airac: b?.airac || ''
        }));
        st.done.push(i);
        st.total = chunks.length;
        st.complete = st.done.length === chunks.length;
        try {
          localStorage.setItem(ROLL_KEY(id), JSON.stringify(st));
        } catch {}
      }
      if (merged) {
        const inCsv = new Set(merged.map(key)),
          xp = (b?.moraCells || []).filter(x => x.src === 'xplane' && !inCsv.has(key(x)));
        await window.SiaBase.patch?.({
          moraCells: merged.concat(xp)
        });
      }
      moraMsg = pill(st.complete ? 'ok' : 'info', st.complete ? t(['MORA de {z} : {n} bloc(s) calculé(s), mora.csv écrit — à committer',
        'MORA of {z}: {n} block(s) computed, mora.csv written — commit it',
        'MORA von {z}: {n} Block/Blöcke berechnet, mora.csv geschrieben — committen',
        'MORA de {z}: {n} bloque(s) calculado(s), mora.csv escrito — confirmarlo'
      ], {
        z: zName(z),
        n: st.done.length
      }) : t(['MORA de {z} : {d}/{n} bloc(s) calculé(s) et écrits ; « Reprendre le calcul complet… » pour la suite',
        'MORA of {z}: {d}/{n} block(s) computed and written; “Resume the full calculation…” for the rest',
        'MORA von {z}: {d}/{n} Block/Blöcke berechnet und geschrieben; „Vollständige Berechnung fortsetzen…“ für den Rest',
        'MORA de {z}: {d}/{n} bloque(s) calculado(s) y escritos; «Reanudar el cálculo completo…» para el resto'
      ], {
        z: zName(z),
        d: st.done.length,
        n: chunks.length
      }));
    } catch (e) {
      moraMsg = pill('err', e.message);
      job?.fail?.(e);
    } finally {
      job?.end?.();
    }
    await scanSiaFolder(false);
    aeroInv = await aeroInventory();
    renderSia();
  }
  /** MORA calculée sur l'emprise d'une zone, fusionnée avec mora.csv (cases de la zone remplacées), à écrire ensuite. */
  async function planMoraZone(id) {
    const Z = await window.SiaBase.zones(),
      boxes = Z.zoneBoxes(id),
      cellsN = boxes.reduce((n, b) => n + (b.n - b.s) * (b.e - b.w), 0);
    /** Affiche x (HTML) dans le message de la carte MORA (#mtMoraMsg). */
    const say = x => {
      const m = hosts.sia.querySelector('#mtMoraMsg');
      if (m) m.innerHTML = x;
    };
    if (cellsN > 1500) return window.AppFramework.notify(t([
      'Zone trop étendue pour un calcul d’un seul tenant ({n} cases d’un degré) : « MORA d’X-Plane », ou « Calcul complet… » par blocs.',
      'Zone too large for the calculation ({n} one-degree cells): use the X-Plane MORA for this zone.'
    ], {
      n: cellsN
    }), 'warn');
    moraMsg = '';
    moraPlan = null;
    const job = window.AppFramework?.task?.(t(['MORA de la zone {z}', 'MORA of zone {z}'], {
      z: id.toUpperCase()
    }));
    try {
      const b = await window.SiaBase.get();
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file,
        text = mf ? await mf.file.text() : '';
      // un calcul par cadre (contours regroupés : métropole, chaque outre-mer…)
      const cells = [];
      cells.peaksOk = true;
      for (const [i, box] of boxes.entries()) {
        const part = await window.SiaBase.computeMoraGrid(b?.obstacleMax || {}, {
          ...box,
          name: `${id}-${i + 1}`
        }, (d, n, step) => {
          const frame = t(['cadre {i}/{n} ({s}…{N}° / {w}…{e}°)', 'frame {i}/{n} ({s}…{N}° / {w}…{e}°)',
            'Rahmen {i}/{n} ({s}…{N}° / {w}…{e}°)', 'marco {i}/{n} ({s}…{N}° / {w}…{e}°)'
          ], {
            i: i + 1,
            n: boxes.length,
            s: box.s,
            N: box.n,
            w: box.w,
            e: box.e
          });
          say(`<span class="mt-small">${esc(id.toUpperCase())} — ${esc(frame)} — ${esc(step || '')} : ${d}/${n}…</span>`);
          job?.set(i, boxes.length, `${id.toUpperCase()} — ${frame}`);
          job?.sub?.(d, n, `${id.toUpperCase()} — ${frame} — ${step || ''} ${d}/${n}`);
        });
        cells.push(...part);
        if (part.peaksOk === false) cells.peaksOk = false;
      }
      const zk = zoneCellKeys(Z, id),
        mine = cells.filter(c => zk.has(`${Math.floor(c.lat)}|${Math.floor(c.lon)}`)),
        keys = new Set(mine.map(c => c.lat + '|' + c.lon));
      const before = text ? window.SiaBase.parseMora(text) : [],
        old = new Map(before.map(c => [c.lat + '|' + c.lon, c]));
      const merged = before.filter(c => !keys.has(c.lat + '|' + c.lon)).map(c => ({
        ...c,
        keepSource: true
      })).concat(mine);
      moraPlan = {
        csv: window.SiaBase.moraCsv(merged, {
          airac: b?.airac || ''
        }),
        cells: merged,
        changes: mine.map(c => ({
          lat: c.lat,
          lon: c.lon,
          before: old.has(c.lat + '|' + c.lon) ? window.SiaBase.moraFtOf(old.get(c.lat + '|' + c.lon)) : 0,
          after: c.moraFt,
          obstacleBefore: '',
          obstacleAfter: c.obstacleFt
        })).filter(c => c.before !== c.after),
        cycle: b?.airac || '',
        previousCycle: window.SiaBase.moraCycle(text),
        written: false,
        mode: 'full',
        peaksOk: cells.peaksOk,
        zoneBoxes: boxes.map(x => `${id.toUpperCase()} (${x.s}…${x.n}° / ${x.w}…${x.e}°)`)
      };
    } catch (e) {
      moraMsg = pill('err', e.message);
      job?.fail(e);
    } finally {
      job?.end();
    }
    renderSia();
  }
  // compte rendu du dernier téléchargement de chaque source (zone|source), gardé au panneau quand il est redessiné
  const aeroFetchMsg = {},
    aeroFetching = new Set();
  // ---- axes de ravitaillement : PDF de la MILAIP (DIRCAM, section ENR 5.7) → miam-enr-5-7-tracks.xml du dossier SIA
  // pdf.js chargé à la demande (jsDelivr, réseau au premier import) ; texte des pages lu par AarTracks.parseEnr57,
  // anomalies (miam:issues) montrées avant l'écriture ; l'ancien fichier part dans _archives/, la base est mise à jour.
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
  let enr57 = null; // { busy, error, file, tracks, issues, edition, xml, written }
  /** HTML de l'état de l'import ENR 5.7 (enr57) : en cours, erreur, ou axes lus, anomalies, édition et bouton d'écriture. */
  function enr57Html() {
    const r = enr57;
    if (!r) return '';
    if (r.busy) return `<p class="mt-small">${esc(r.busy)}</p>`;
    if (r.error) return `<p>${pill('err', r.error)}</p>`;
    const issues = r.issues.length ? `<details class="mt-small"><summary>${esc(t(['{n} anomalie(s) à vérifier', '{n} anomaly(ies) to check', '{n} Auffälligkeit(en) zu prüfen', '{n} anomalía(s) que verificar'], { n: r.issues.length }))}</summary><ul>${r.issues.map(i => `<li>p. ${esc(i.page)} · ${esc(i.kind)} — ${esc(i.text)}</li>`).join('')}</ul></details>` : `<p class="mt-small">${pill('ok', t(['aucune anomalie relevée', 'no anomaly found', 'keine Auffälligkeit', 'ninguna anomalía']))}</p>`;
    return `<p class="mt-small">${pill(r.tracks.length ? 'ok' : 'warn', t(['{n} axe(s) lu(s) dans {f}', '{n} track(s) read from {f}', '{n} Strecke(n) aus {f} gelesen', '{n} eje(s) leído(s) en {f}'], { n: r.tracks.length, f: r.file }))}</p>${issues}
      ${r.written ? `<p>${pill('ok', t(['miam-enr-5-7-tracks.xml écrit (ancien archivé) et base mise à jour', 'miam-enr-5-7-tracks.xml written (old one archived) and database updated', 'miam-enr-5-7-tracks.xml geschrieben (alte archiviert), Datenbank aktualisiert', 'miam-enr-5-7-tracks.xml escrito (anterior archivado) y base actualizada']))}</p>` : r.tracks.length ? `<p class="row"><label class="mt-small">${esc(t(['Édition', 'Edition', 'Ausgabe', 'Edición']))} <input type="text" id="mtEnr57Edition" size="26" value="${esc(r.edition)}" spellcheck="false"></label> <button type="button" class="primary" id="mtEnr57Write" data-icon="save">${esc(t(['Écrire miam-enr-5-7-tracks.xml', 'Write miam-enr-5-7-tracks.xml', 'miam-enr-5-7-tracks.xml schreiben', 'Escribir miam-enr-5-7-tracks.xml']))}</button></p>` : ''}`;
  }

  /** Redessine l'état de l'import ENR 5.7 dans #mtEnr57Msg (s'il est affiché). */
  function enr57Show() {
    const el = document.getElementById('mtEnr57Msg');
    if (el) el.innerHTML = enr57Html();
  }
  /** Lit le PDF de la MILAIP (pdf.js et aar_tracks.js chargés à la demande), analyse les pages ENR 5.7 (AarTracks.parseEnr57)
   *  et garde dans enr57 axes, anomalies et édition (AMDT, date) ; erreur claire si le PDF n'est pas la MILAIP ENR 5.7. */
  async function importEnr57(file) {
    enr57 = {
      busy: t(['Lecture du PDF…', 'Reading the PDF…', 'PDF wird gelesen…', 'Leyendo el PDF…'])
    };
    enr57Show();
    const job = window.AppFramework?.task?.(t(['Import de la MILAIP ENR 5.7', 'MILAIP ENR 5.7 import', 'Import MILAIP ENR 5.7',
      'Importación MILAIP ENR 5.7'
    ]));
    try {
      if (!window.AarTracks) await new Promise(res => {
        const sc = document.createElement('script');
        sc.src = new URL('shared/aar_tracks.js', root()).href;
        sc.onload = sc.onerror = res;
        document.head.append(sc);
      });
      if (!window.AarTracks) throw new Error('shared/aar_tracks.js');
      let pdfjs;
      try {
        pdfjs = await import(`${PDFJS}pdf.min.mjs`);
      } catch {
        throw new Error(t(['pdf.js injoignable (réseau nécessaire au premier import)',
          'pdf.js unreachable (network needed for the first import)',
          'pdf.js nicht erreichbar (Netz für den ersten Import nötig)',
          'pdf.js inaccesible (red necesaria en la primera importación)'
        ]));
      }
      pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer())
      }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const c = await (await doc.getPage(i)).getTextContent();
        pages.push(c.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
        job?.set?.(i, doc.numPages);
      }
      // MILAIP complète déposée : seules les pages de la section ENR 5.7 (sinon toutes)
      const own = pages.filter(p => /ENR\s*5\.7/.test(p));
      const r = window.AarTracks.parseEnr57(own.length ? own : pages);
      const all = pages.join(' '),
        amdt = /AMDT\s*(\d{1,2}\/\d{2})/i.exec(all)?.[1],
        date = /(\d{2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{2})/.exec(all)?.[1];
      // aucun axe : autre document (AIP civile ENR 5.7 du SIA : survols interdits à basse hauteur, même numéro de section)
      if (!r.tracks.length) throw new Error(/survols? interdits?|overflight/i.test(all) && !/ravitaillement|refuel/i.test(all) ? t([
        'ce PDF est l’ENR 5.7 de l’AIP civile du SIA (survols interdits à basse hauteur), pas la MILAIP ENR 5.7 de la DIRCAM (zones de ravitaillement en vol)',
        'this PDF is the SIA civil AIP ENR 5.7 (low-level overflight restrictions), not the DIRCAM MILAIP ENR 5.7 (air refuelling areas)',
        'dieses PDF ist ENR 5.7 des zivilen AIP des SIA (Überflugverbote in geringer Höhe), nicht ENR 5.7 der MILAIP der DIRCAM (Luftbetankungszonen)',
        'este PDF es la ENR 5.7 del AIP civil del SIA (sobrevuelos prohibidos a baja altura), no la MILAIP ENR 5.7 de la DIRCAM (zonas de reabastecimiento en vuelo)'
      ]) : t(['aucun axe de ravitaillement trouvé : ce PDF ne semble pas être la MILAIP ENR 5.7 de la DIRCAM',
        'no refuelling track found: this PDF does not seem to be the DIRCAM MILAIP ENR 5.7',
        'keine Betankungsstrecke gefunden: dieses PDF scheint nicht ENR 5.7 der MILAIP der DIRCAM zu sein',
        'ningún eje de reabastecimiento: este PDF no parece ser la MILAIP ENR 5.7 de la DIRCAM'
      ]));
      enr57 = {
        file: file.name,
        tracks: r.tracks,
        issues: r.issues,
        parsed: r,
        edition: amdt ? `AMDT ${amdt}${date ? ` — ${date}` : ''}` : '' // même forme que l'édition en service (AMDT 10/24 — 05 SEP 24)
      };
    } catch (e) {
      enr57 = {
        error: e.message
      };
      job?.fail?.(e);
    } finally {
      job?.end?.();
    }
    enr57Show();
  }
  /** Écrit miam-enr-5-7-tracks.xml (édition saisie) dans le dossier SIA, l'ancien archivé dans _archives/, met à jour la
   *  base (SiaBase.patch) et la carte des zones ; échec en notification. */
  async function writeEnr57() {
    const r = enr57;
    if (!r?.parsed) return;
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier SIA non autorisé', 'SIA folder not authorised', 'SIA-Ordner nicht erlaubt',
        'carpeta SIA no autorizada'
      ]));
      r.edition = document.getElementById('mtEnr57Edition')?.value.trim() || r.edition;
      const xml = window.AarTracks.toXml(r.parsed, {
        edition: r.edition
      });
      const name = 'miam-enr-5-7-tracks.xml',
        old = await fileAt(dir, name);
      if (old) await writeAt(dir, `_archives/miam-enr-5-7-tracks_${new Date(old.lastModified).toISOString().slice(0, 10)}.xml`, await old.arrayBuffer());
      await writeAt(dir, name, xml);
      await window.SiaBase.patch?.({
        aarXml: xml
      });
      r.written = true;
      aeroInv = await aeroInventory();
      aeroRefresh(await window.SiaBase.zones());
    } catch (e) {
      window.AppFramework?.notify?.(t(['Axes non écrits : {e}', 'Tracks not written: {e}', 'Strecken nicht geschrieben: {e}',
        'Ejes no escritos: {e}'
      ], {
        e: e.message
      }), 'err');
    }
    enr57Show();
  }
  /** Téléchargement d'une source par le lanceur (tools/aero_fetch.py) ; état et résultat sous le bouton. */
  /** Fichiers d'une source fournis par l'utilisateur (NATS…) : les derniers ZIP de la source pris dans Téléchargements par
   *  le lanceur (motif SOURCES[src].downloads), sinon choisis (sélecteur ouvert sur Téléchargements) ; ZIP ouverts, XML
   *  complets gardés (différentiels, filtres d'export, métadonnées écartés), rangés dans data/sia/zones/<zone>/ du dossier
   *  SIA autorisé, puis base reconstruite par le bloc commun (« Tout recalculer »). */
  async function aeroDrop(zone, src, {
    auto = false
  } = {}) {
    const say = (m, k) => window.AppFramework?.notify?.(m, k),
      S = window.AeroZones?.SOURCES?.[src] || {};
    let files = [];
    if (S.downloads) try {
      const H = {
          headers: {
            'X-SOG-Setup': '1'
          },
          cache: 'no-store'
        },
        q = `/__setup/downloads?glob=${encodeURIComponent(S.downloads)}`,
        r = await (await fetch(`${q}&info`, H)).json();
      for (const f of r.files || []) files.push(new File([await (await fetch(`${q}&name=${encodeURIComponent(f.name)}`, H)).blob()], f.name, {
        lastModified: f.mtime * 1000
      }));
    } catch {
      files = []; // lanceur absent ou ancien : sélecteur
    }
    if (!files.length && auto) return false; // mise en place automatique : rien dans Téléchargements, action listée sous la carte
    if (!files.length) try {
      if (window.showOpenFilePicker) files = await Promise.all((await window.showOpenFilePicker({
        multiple: true,
        startIn: 'downloads'
      })).map(h => h.getFile()));
      else files = await new Promise(res => {
        const i = Object.assign(document.createElement('input'), {
          type: 'file',
          multiple: true
        });
        i.onchange = () => res([...i.files]);
        i.click();
      });
    } catch {
      return; // sélection annulée
    }
    if (!files.length) return;
    const keep = n => /\.xml$/i.test(n) && !/(DIFF|DELTA|export-filter|METADATA)/i.test(n),
      out = [],
      ignored = [];
    try {
      for (const f of files) {
        if (/\.zip$/i.test(f.name))
          for (const e of await window.ZipStore.read(f)) {
            const leaf = e.name.split('/').pop();
            if (keep(leaf)) out.push({
              name: leaf,
              data: await e.bytes()
            });
            else if (leaf) ignored.push(leaf);
          }
        else if (keep(f.name)) out.push({
          name: f.name,
          data: await f.arrayBuffer()
        });
        else ignored.push(f.name);
      }
      if (!out.length) throw new Error(t(['aucun XML complet dans {l}', 'no full XML in {l}', 'kein vollständiges XML in {l}',
        'ningún XML completo en {l}'
      ], {
        l: files.map(f => f.name).join(', ')
      }));
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier SIA non autorisé : Installation › Sources et dossiers',
        'SIA folder not authorised: Installation › Sources and folders',
        'SIA-Ordner nicht freigegeben: Installation › Quellen und Ordner',
        'carpeta SIA no autorizada: Instalación › Fuentes y carpetas'
      ]));
      for (const o of out) await writeAt(dir, `zones/${zone}/${o.name}`, o.data);
      say(t(['{n} fichier(s) {s} rangé(s) dans data/sia/zones/{z}/ : {l}{i} — reconstruction de la base…',
        '{n} {s} file(s) stored in data/sia/zones/{z}/: {l}{i} — rebuilding the database…',
        '{n} {s}-Datei(en) in data/sia/zones/{z}/ abgelegt: {l}{i} — Datenbank wird neu aufgebaut…',
        '{n} archivo(s) {s} guardado(s) en data/sia/zones/{z}/: {l}{i} — reconstruyendo la base…'
      ], {
        n: out.length,
        s: t(S.label || [src, src]),
        z: zone,
        l: out.map(o => o.name).join(', '),
        i: ignored.length ? t([' (écartés : {l})', ' (left out: {l})', ' (ausgelassen: {l})', ' (descartados: {l})'], {
          l: ignored.join(', ')
        }) : ''
      }), 'ok');
      await scanSiaFolder(false);
      renderSia();
      await new Promise(r => setTimeout(r, 50));
      await basePanelApi?.reread(true); // même traitement que « Tout recalculer »
      return true;
    } catch (e) {
      say(e.message, 'err');
      return false;
    }
  }
  /** Fait télécharger la source par le lanceur (POST /__setup/aero-fetch { provider, args }) ; btn désactivé pendant ce temps,
   *  compte rendu gardé par « zone|source » (aeroFetchMsg) et affiché au panneau, puis inventaire et carte rafraîchis. */
  async function aeroFetch(provider, args, btn, zone = '', src = '') {
    const say = (m, k = 'warn') => window.AppFramework.notify(m, k),
      key = `${zone}|${src}`;
    /** Mémorise le message de la source et le pose sous ses boutons si sa zone est au panneau (boutons grisés en cours). */
    const show = html => {
      aeroFetchMsg[key] = html;
      const p = document.getElementById('mtAeroPanel');
      if (p?.dataset.zone === zone) p.querySelectorAll(`[data-src="${src}"]`).forEach(b => {
        b.disabled = aeroFetching.has(key);
        const m = b.parentElement.querySelector('[data-fetch-msg]');
        if (m) m.innerHTML = html;
      });
    };
    aeroFetching.add(key);
    if (btn) btn.disabled = true;
    show(esc(t(['téléchargement en cours…', 'downloading…', 'wird heruntergeladen…', 'descargando…'])));
    let res = null;
    const job = window.AppFramework?.task?.(t(['Téléchargement des données', 'Downloading the data', 'Daten werden heruntergeladen',
      'Descargando los datos'
    ]));
    try {
      const r = await fetch('/__setup/aero-fetch', {
        method: 'POST',
        headers: {
          'X-SOG-Setup': '1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          args
        })
      });
      if (!r.ok) throw new Error(r.status);
      res = await r.json();
      if (res.files.length) say(t(['Téléchargé : {f}.', 'Downloaded: {f}.', 'Heruntergeladen: {f}.', 'Descargado: {f}.'], {
        f: res.files.map(f => f.name + (f.features != null ? ` (${f.features})` : '')).join(', ')
      }), res.errors.length ? 'warn' : 'ok');
      if (res.errors.length) say(res.errors.join(' · '), 'err');
      if (!res.files.length && !res.errors.length) say(t(['Rien à télécharger pour cette zone.', 'Nothing to download for this zone.',
        'Für diese Zone nichts herunterzuladen.', 'Nada que descargar para esta zona.'
      ]));
    } catch {
      say(t(['Le serveur du lanceur ne répond pas : ouvrez la suite avec lancer.cmd / lancer.sh.',
        'The launcher server does not answer: open the suite with lancer.cmd / lancer.sh.'
      ]));
    } finally {
      job?.end?.();
      aeroFetching.delete(key);
    }
    aeroInv = await aeroInventory();
    const Z = await window.SiaBase.zones();
    if (!res) show(pill('err', t(['lanceur injoignable', 'launcher unreachable', 'Starter nicht erreichbar', 'lanzador inaccesible'])));
    else {
      const seen = !zone || aeroSourceStatus(Z, zone, src).has;
      show([res.files.length ? pill('ok', t(['{n} fichier(s) téléchargé(s)', '{n} file(s) downloaded', '{n} Datei(en) heruntergeladen',
          '{n} archivo(s) descargado(s)'
        ], {
          n: res.files.length
        })) : '', res.errors.length ? pill('err', res.errors.join(' · ')) : '', !res.files.length && !res.errors.length ? pill(
          'info', t(['rien à télécharger', 'nothing to download', 'nichts herunterzuladen', 'nada que descargar'])) : '', res.files
        .length && !seen ? pill('warn', t([
          'écrits dans data/sia du lanceur, mais le dossier SIA de ce navigateur n’est pas autorisé ou en est un autre : « Dossier SIA » ci-dessous',
          'written to the launcher’s data/sia, but this browser’s SIA folder is not authorised or is another one: “SIA folder” below',
          'in data/sia des Starters geschrieben, aber der SIA-Ordner dieses Browsers ist nicht erlaubt oder ein anderer: „SIA-Ordner“ unten',
          'escritos en data/sia del lanzador, pero la carpeta SIA de este navegador no está autorizada o es otra: «Carpeta SIA» abajo'
        ])) : ''
      ].join(' '));
    }
    aeroRefresh(Z);
  }

  /** Dessine le bloc « Données aéronautiques » : carte des zones et panneau, actions à faire, tableau des sources et bloc
   *  commun de la base (SiaBase.panel), carte MORA et contrôle de cohérence ; branche leurs actions (délégation au panneau). */
  async function renderSia() {
    const host = hosts.sia,
      Z = await window.SiaBase.zones();
    if (!Z) {
      host.innerHTML = `<p class="err">${esc(t(['Zones de données absentes (shared/aero_zones.js).', 'Data zones missing (shared/aero_zones.js).']))}</p>`;
      return;
    }
    aeroInv = await aeroInventory();
    if (!siaFolderState) await scanSiaFolder(false);
    const legend = Object.entries(AERO_STATE).map(([k, row]) => `<span><i class="mt-aero-dot" style="background:${AERO_COLOR[k]}${k === 'blank' ? ';opacity:.25' : ''}"></i>${esc(t(row))}</span>`).join('') + `<span><i class="mt-aero-dot" style="background:#1e6fd9"></i>${esc(t(['survol : sources de la zone dans le panneau', 'hover: zone sources in the panel', 'Überfahren: Quellen der Zone im Feld', 'al pasar: fuentes de la zona en el panel']))}</span><span><i class="mt-aero-dot" style="background:#1e6fd9;outline:2px solid #0b2f6b"></i>${esc(t(['choisi (« Activer » pour appliquer)', 'chosen (“Activate” to apply)', 'gewählt („Aktivieren“ zum Übernehmen)', 'elegido («Activar» para aplicar)']))}</span>`;
    host.innerHTML = `
      <p class="mt-small">${esc(t(['Cliquer sur les pays voulus (un clic les ajoute, un autre les retire), puis « Activer » : la suite télécharge leurs sources, reconstruit la base et calcule la MORA ; ce qu’elle ne peut pas faire seule est listé sous la carte. Survoler un pays montre ses sources à droite.', 'Click the wanted countries (one click adds, another removes), then “Activate”: the suite downloads their sources, rebuilds the database and computes the MORA; what it cannot do on its own is listed under the map. Hovering a country shows its sources on the right.', 'Die gewünschten Länder anklicken (ein Klick fügt hinzu, ein weiterer entfernt), dann „Aktivieren“: die Suite lädt ihre Quellen, baut die Datenbank neu auf und berechnet die MORA; was sie nicht allein kann, steht unter der Karte. Beim Überfahren eines Landes erscheinen seine Quellen rechts.', 'Hacer clic en los países deseados (un clic los añade, otro los quita) y luego «Activar»: la suite descarga sus fuentes, reconstruye la base y calcula la MORA; lo que no puede hacer sola figura bajo el mapa. Al pasar el ratón por un país se muestran sus fuentes a la derecha.']))}</p>
      <div class="mt-aero">
        <div class="mt-aero-left"><div id="mtAeroMapSlot"></div><div class="mt-aero-legend mt-small">${legend}</div><div class="mt-aero-sel" id="mtAeroSel"></div>
</div>
        <aside class="mt-aero-panel" id="mtAeroPanel" data-no-i18n></aside>
      </div>
      <div class="repo-card" id="mtAeroTodo" data-icon="check"></div>
      <div class="repo-card" id="mt-aero-base" data-icon="refresh" data-subtitle="${esc(t(['Toutes les sources cochées des zones actives : cycle, âge, taille ; un clic sur une ligne met sa source à jour. « Tout recalculer » reconstruit la base (studio, cartes de vol, profil vertical, espaces à activer) ; « Purger le cache » la vide.', 'All ticked sources of the active zones: cycle, age, size; a click on a row updates its source. “Recompute all” rebuilds the database (studio, flight maps, vertical profile, airspace to activate); “Purge the cache” empties it.', 'Alle angehakten Quellen der aktiven Zonen: Zyklus, Alter, Größe; ein Klick auf eine Zeile aktualisiert ihre Quelle. „Alles neu berechnen“ baut die Datenbank neu auf; „Cache leeren“ leert sie.', 'Todas las fuentes marcadas de las zonas activas: ciclo, antigüedad, tamaño; un clic en una fila actualiza su fuente. «Recalcular todo» reconstruye la base; «Vaciar la caché» la vacía.']))}"><h3>${esc(t(['Base aéronautique : sources, cycles et reconstruction', 'Aeronautical database: sources, cycles and rebuild', 'Luftfahrtdatenbank: Quellen, Zyklen und Neuaufbau', 'Base aeronáutica: fuentes, ciclos y reconstrucción']))}</h3><div id="mtAeroAges"></div><div id="mtBasePanel"></div></div>
      <div class="repo-card" id="mt-aero-mora" data-icon="chart" data-subtitle="${esc(t(['Sources de MORA : grille calculée (relief, sommets, obstacles ; ici pour la France et les missions, ou zone par zone dans le panneau), X-Plane (grille mondiale) ; la grille calculée a la priorité.', 'MORA sources: computed grid (terrain, peaks, obstacles; here for France and the missions, or zone by zone in the panel), X-Plane (world grid); the computed grid has priority.']))}"><h3>MORA</h3>
        <p class="row"><button type="button" class="secondary" id="mtMora"${moraBusy ? ' disabled' : ''} data-icon="refresh" title="${esc(t(['Obstacles du nouveau cycle, relief du mora.csv actuel — sans réseau, immédiat', 'New-cycle obstacles, terrain from the current mora.csv — offline, immediate']))}">${esc(t(['Recalcul simple', 'Simple recalculation', 'Einfache Neuberechnung', 'Recálculo simple']))}</button><button type="button" class="secondary" id="mtMoraXp"${moraBusy ? ' disabled' : ''} data-icon="download" title="${esc(t(['Cases de la MORA d’X-Plane (zones actives, source X-Plane) absentes de mora.csv', 'X-Plane MORA cells (active zones, X-Plane source) missing from mora.csv', 'X-Plane-MORA-Felder (aktive Zonen), die in mora.csv fehlen', 'Casillas MORA de X-Plane (zonas activas) ausentes de mora.csv']))}">${esc(t(['MORA d’X-Plane → mora.csv', 'X-Plane MORA → mora.csv', 'X-Plane-MORA → mora.csv', 'MORA de X-Plane → mora.csv']))}</button><button type="button" class="secondary" id="mtMoraFull"${moraBusy ? ' disabled' : ''} data-icon="chart">${esc(t(['Calcul complet', 'Full calculation', 'Vollständige Berechnung', 'Cálculo completo']))}</button>${moraPlan && !moraPlan.written ? `<button type="button" class="primary" id="mtMoraWrite" data-icon="save">${esc(t(['Écrire mora.csv (ancien archivé)', 'Write mora.csv (old one archived)', 'mora.csv schreiben (alte archiviert)', 'Escribir mora.csv (antiguo archivado)']))}</button><button type="button" class="secondary" id="mtMoraDl" data-icon="download">mora.csv</button>` : ''}</p>
        <div id="mtMoraMsg">${moraMsg}</div><div>${moraPlan ? moraHtml(moraPlan) : ''}</div></div>
      <div class="repo-card" data-icon="plane" data-subtitle="${esc(t(['Espaces, appareils, flotte, performances, terrains des missions', 'Airspace, aircraft, fleet, performance, mission aerodromes']))}"><h3>${esc(t(['Cohérence', 'Consistency', 'Konsistenz', 'Coherencia']))}</h3><div id="mtUsage"><p class="row"><button type="button" class="secondary" id="mtUsageRun" data-icon="search">${esc(t(['Contrôler', 'Check', 'Prüfen', 'Comprobar']))}</button></p></div></div>`;
    aeroAges(Z);
    aeroTodo(Z);
    aeroSelShow(Z);
    host.querySelector('#mtAeroMapSlot').replaceWith(await aeroMapInit(Z));
    setTimeout(() => aeroMap?.resize?.(), 50);
    aeroPanelShow(Z, aeroShown());
    // actions du panneau (redessiné au survol : délégation)
    const panel = host.querySelector('#mtAeroPanel');
    panel.onclick = async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-zone-unpin')) aeroPin(Z, null);
      else if (b.dataset.zoneToggle) {
        const id = b.dataset.zoneToggle,
          on = !Z.isOn(id);
        Z.setZone(id, on);
        aeroPin(Z, id); // la zone reste au panneau pour régler ses sources
        aeroRefresh(Z);
        // première activation : tout ce qui peut se faire seul est enchaîné
        if (on && !aeroAutoDone().has(id)) aeroAutoZone(Z, id);
      } else if (b.dataset.zoneAuto) {
        aeroAutoZone(Z, b.dataset.zoneAuto);
      } else if (b.dataset.aeroDrop) aeroDrop(panel.dataset.zone, b.dataset.aeroDrop);
      else if (b.dataset.aeroFetch) aeroFetch(b.dataset.aeroFetch, b.dataset.args.split(' ').filter(Boolean), b, panel.dataset.zone,
        b.dataset.src);
      else if (b.dataset.moraZone) moraExclusive(planMoraZone, b.dataset.moraZone);
      else if (b.dataset.moraXpZone) moraExclusive(planMoraXplane);
      else if (b.dataset.moraRoll) moraExclusive(moraRolling, b.dataset.moraRoll);
      else if (b.id === 'mtArchive') archiveOld();
      else if (b.id === 'mtSiaZipFolder') extractZip(siaFolderState.zips[0].file);
      else if (b.id === 'mtSiaFetch') siaFetchZip();
      else if (b.id === 'mtEnr57Write') writeEnr57();
    };
    panel.onchange = e => {
      const c = e.target;
      if (c.dataset.zoneSrc) {
        Z.setSource(panel.dataset.zone, c.dataset.zoneSrc, c.checked);
        aeroRefresh(Z);
      } else if (c.id === 'mtEnr57') {
        const file = c.files[0];
        c.value = '';
        if (file) importEnr57(file);
      } else if (c.id === 'mtSiaZip') {
        const file = c.files[0];
        c.value = '';
        if (file) extractZip(file);
      }
    };
    // le panneau suit le survol ; on y travaille : la zone survolée en dernier y reste
    panel.onmouseenter = () => {
      clearTimeout(aeroHoverTimer);
      if (!aeroLocked && panel.dataset.zone) aeroPinned = panel.dataset.zone;
    };
    // Échap : zone relâchée
    if (!host.dataset.escBound) {
      host.dataset.escBound = '1';
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && aeroLocked && hosts.sia.isConnected && !hosts.sia.closest('[hidden]')) aeroPin(Z, null);
      });
    }
    // Bloc commun (SiaBase.panel) créé une fois, replacé à chaque rendu : ses messages restent affichés.
    basePanelEl ??= (() => {
      const el = document.createElement('div');
      // gardé : la construction enchaînée après l'extraction du ZIP passe par lui (même traitement que « Tout recalculer »)
      basePanelApi = window.SiaBase.panel(el, {
        rereadLabel: ['Tout recalculer', 'Recompute all', 'Alles neu berechnen', 'Recalcular todo'],
        onLoaded: () => baseChanged(true),
        onPurged: () => baseChanged(false)
      });
      return el;
    })();
    host.querySelector('#mtBasePanel').replaceWith(basePanelEl);
    // ligne du tableau des sources : sa source mise à jour (délégation : le tableau est redessiné)
    const ages = host.querySelector('#mtAeroAges');
    ages.onclick = e => {
      const tr = e.target.closest('tr.mt-aero-row');
      if (tr) aeroRowAction(Z, tr.dataset.zone, tr.dataset.src);
    };
    ages.onkeydown = e => {
      const tr = e.target.closest('tr.mt-aero-row');
      if (tr && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        aeroRowAction(Z, tr.dataset.zone, tr.dataset.src);
      }
    };
    host.querySelector('#mtMora').onclick = () => moraExclusive(planMora);
    host.querySelector('#mtMoraFull').onclick = () => moraExclusive(planMoraFull);
    host.querySelector('#mtMoraXp').onclick = () => moraExclusive(planMoraXplane);
    host.querySelector('#mtMoraWrite')?.addEventListener('click', writeMora);
    host.querySelector('#mtMoraDl')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([moraPlan.csv], {
        type: 'text/csv;charset=utf-8'
      }));
      a.download = 'mora.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    host.querySelector('#mtUsageRun').onclick = usageCheck;
    window.AppFramework?.refresh?.();
    // Ancre (lien de retour du studio…) : une fois, au premier rendu ; anciennes ancres « #mt-step-N » : la base.
    if (!stepHashDone && /^#mt-[\w-]+$/.test(location.hash)) {
      stepHashDone = true;
      // le bloc peut être encore masqué (affichage du bloc demandé par ?m=) : attendre qu'il soit visible
      const target = /^#mt-step-/.test(location.hash) ? 'mt-aero-base' : location.hash.slice(1);
      let tries = 0;
      /** Fait défiler jusqu'à la cible et la fait clignoter dès qu'elle est visible (40 essais toutes les 100 ms). */
      const go = () => {
        const el = document.getElementById(target);
        if (el?.offsetParent) {
          el.scrollIntoView({
            block: 'start'
          });
          el.classList.add('repo-block-flash');
          setTimeout(() => el.classList.remove('repo-block-flash'), 1600);
        } else if (tries++ < 40) setTimeout(go, 100);
      };
      go();
    }
  }
  /** ZIP du SIA pris dans le dossier Téléchargements par le serveur du lanceur (tools/launch.py, /__setup/sia-zip). */
  async function siaFetchZip({
    quiet = false
  } = {}) {
    const say = (m, k = 'warn') => quiet ? null : (window.AppFramework?.notify || alert)(m, k);
    /** Requête au lanceur (q : « ?info » pour la description du ZIP trouvé, vide pour le fichier lui-même). */
    const api = q => fetch(`/__setup/sia-zip${q}`, {
      headers: {
        'X-SOG-Setup': '1'
      },
      cache: 'no-store'
    });
    let info;
    try {
      const r = await api('?info');
      if (!r.ok) throw new Error(r.status);
      info = await r.json();
    } catch {
      return say(t([
        'Le serveur du lanceur ne répond pas : ouvrez la suite avec lancer.cmd / lancer.sh, ou choisissez le ZIP avec « ZIP d’export du SIA… ».',
        'The launcher server does not answer: open the suite with lancer.cmd / lancer.sh, or pick the ZIP with “SIA export ZIP…”.'
      ]));
    }
    if (!info.found) return say(t([
      'Aucun export_xml_bd_SIA_….zip dans {d} : téléchargez-le d’abord sur le site du SIA (lien du panneau).',
      'No export_xml_bd_SIA_….zip in {d}: download it from the SIA site first (link in the panel).'
    ], {
      d: info.where.join(', ')
    }));
    const blob = await (await api('')).blob();
    return extractZip(new File([blob], info.name, {
      type: 'application/zip',
      lastModified: info.mtime * 1000
    }));
  }
  let stepHashDone = false;

  /** Tableau HTML du contenu du dossier SIA inspecté f : XML de chaque cycle (anciens grisés), ZIP, fichiers fixes, précédé
   *  de l'état du dernier cycle (complet ou fichiers manquants). */
  function folderTable(f) {
    /** Libellé traduit d'un rôle de fichier (Airac.ROLES), sinon l'identifiant. */
    const role = id => {
      const r = window.Airac.ROLES.find(x => x.id === id);
      return r ? t(r.label) : id;
    };
    const rows = [];
    for (const c of f.cycles)
      for (const i of c.items) rows.push(`<tr${c === f.latest ? '' : ' class="mt-old"'}><td><code>${esc(i.name)}</code></td><td>${esc(role(i.role))}</td><td>${esc(c.cycle?.label || c.date)}</td><td class="num">${fmtSize(i.size)}</td><td>${esc(fmtDate(i.lastModified))}</td></tr>`);
    for (const z of f.zips) rows.push(`<tr><td><code>${esc(z.name)}</code></td><td>${esc(role('zip'))}</td><td>${esc(z.cycle)}${z.version ? ' v' + z.version : ''}</td><td class="num">${fmtSize(z.size)}</td><td>${esc(fmtDate(z.lastModified))}</td></tr>`);
    for (const x of f.fixed) rows.push(`<tr><td><code>${esc(x.name)}</code></td><td>${esc(t(x.label))}</td><td>${x.file ? '' : pill(x.id === 'readme' ? 'info' : 'warn', t(['absent', 'absent']))}</td><td class="num">${x.file ? fmtSize(x.file.size) : ''}</td><td>${x.file ? esc(fmtDate(x.file.lastModified)) : ''}</td></tr>`);
    const lat = f.latest;
    return `<p>${lat ? (lat.complete ? pill('ok', t(['cycle {c} complet', 'cycle {c} complete'], { c: lat.date })) : pill('warn', t(['cycle {c} incomplet : manque {m}', 'cycle {c} incomplete: missing {m}'], { c: lat.date, m: lat.missing.join(', ') }))) : pill('warn', t(['aucun XML AIRAC', 'no AIRAC XML']))}</p><div class="mt-scroll"><table class="mt-table mt-wide"><tbody>${rows.join('')}</tbody></table></div>`;
  }
  /** Extrait d'un ZIP d'export du SIA, dans le dossier SIA autorisé, les XML reconnus (Airac.ROLES) et le Lisez_moi.txt,
   *  trace l'extraction au journal (LocalStore), puis relit le dossier et reconstruit la base. */
  async function extractZip(file) {
    const el = () => document.getElementById('mtExtract');
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['choisir d’abord le dossier SIA XML', 'choose the SIA XML folder first']));
      extractMsg = t(['Lecture du ZIP…', 'Reading ZIP…']);
      if (el()) el().textContent = extractMsg;
      const entries = await window.ZipStore.read(file),
        written = [];
      for (const e of entries) {
        const leaf = e.name.split('/').pop();
        const target = /^lisez[-_]moi\.txt$/i.test(leaf) ? 'Lisez_moi.txt' : leaf;
        if (!window.Airac.ROLES.some(r => r.id !== 'zip' && r.re.test(leaf)) && target !== 'Lisez_moi.txt') continue;
        if (el()) el().textContent = t(['Extraction de {f}…', 'Extracting {f}…'], {
          f: leaf
        });
        await writeAt(dir, target, await e.bytes());
        written.push(target);
      }
      extractMsg = written.length ? pill('ok', t(['{n} fichier(s) extrait(s) : {l}', '{n} file(s) extracted: {l}'], {
        n: written.length,
        l: written.join(', ')
      })) : pill('warn', t(['aucun XML du SIA dans ce ZIP', 'no SIA XML in this ZIP']));
      window.LocalStore?.logEvent?.({
        kind: 'sia-extract',
        source: file.name,
        files: written.length,
        keys: {
          added: written,
          updated: []
        }
      });
      await scanSiaFolder(false);
    } catch (e) {
      extractMsg = pill('err', e.message);
    }
    renderSia();
    renderVersions();
    renderDeps();
    // XML extraits : base reconstruite aussitôt, par le même traitement que « Tout recalculer » (l'extraction seule
    // laissait la base vide : rien dans le studio ni les cartes tant qu'on ne trouvait pas le bouton)
    if (/mt-ok/.test(extractMsg)) {
      await new Promise(r => setTimeout(r, 50)); // bloc redessiné
      await basePanelApi?.reread(true);
      return true;
    }
    return false;
  }
  /** Après confirmation, déplace les XML des anciens cycles du dossier SIA dans _archives/<cycle>/ (copie puis suppression),
   *  trace l'opération au journal et relit le dossier. */
  async function archiveOld() {
    const f = siaFolderState;
    if (!f?.old.length) return;
    const names = f.old.flatMap(o => o.items.map(i => i.name));
    if (!await window.AppFramework.ask(t(['Déplacer ces fichiers dans _archives/<cycle>/ ?\n\n{l}',
        'Move these files into _archives/<cycle>/?\n\n{l}'
      ], {
        l: names.join('\n')
      }))) return;
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier non autorisé', 'folder not authorised']));
      let n = 0;
      for (const o of f.old) {
        const sub = await (await dir.getDirectoryHandle('_archives', {
          create: true
        })).getDirectoryHandle(o.date, {
          create: true
        });
        for (const i of o.items) {
          archiveMsg = t(['Copie de {f}…', 'Copying {f}…'], {
            f: i.name
          });
          const m = hosts.sia.querySelector('#mtArchive');
          if (m) m.disabled = true;
          const w = await (await sub.getFileHandle(i.name, {
            create: true
          })).createWritable();
          await i.file.stream().pipeTo(w);
          await dir.removeEntry(i.name);
          n++;
        }
      }
      archiveMsg = pill('ok', t(['{n} fichier(s) archivé(s)', '{n} file(s) archived'], {
        n
      }));
      window.LocalStore?.logEvent?.({
        kind: 'sia-archive',
        source: dir.name,
        files: n,
        keys: {
          added: [],
          updated: names
        }
      });
      await scanSiaFolder(false);
    } catch (e) {
      archiveMsg = pill('err', e.message);
    }
    renderSia();
    renderVersions();
    renderDeps();
  }

  /** MORA d'X-Plane (earth_mora.dat, lue dans la base pour les zones actives qui ont coché X-Plane) → mora.csv : les
   *  cases absentes de la grille calculée sont ajoutées (le calcul garde la priorité), à écrire ensuite. */
  async function planMoraXplane() {
    moraMsg = '';
    moraPlan = null;
    try {
      const b = await window.SiaBase.get();
      if (!b) throw new Error(t(['base absente : « Reconstruire la base aéronautique »', 'no base: “Rebuild the aeronautical database”',
        'keine Basis: „Luftfahrtdatenbank neu aufbauen“', 'sin base: «Reconstruir la base aeronáutica»'
      ]));
      const xp = (b.moraCells || []).filter(c => c.src === 'xplane');
      if (!xp.length) throw new Error(t([
        'Aucune case MORA d’X-Plane dans la base : choisir le dossier du simulateur X-Plane (Installation › Sources et dossiers), cocher la source X-Plane d’une zone active, puis « Reconstruire la base aéronautique ».',
        'No X-Plane MORA cell in the database: choose the X-Plane simulator folder (Installation › Sources and folders), tick the X-Plane source of an active zone, then “Rebuild the aeronautical database”.',
        'Keine X-Plane-MORA-Felder in der Basis: X-Plane-Simulatorordner wählen (Installation › Quellen und Ordner), Quelle X-Plane einer aktiven Zone ankreuzen, dann „Luftfahrtdatenbank neu aufbauen“.',
        'Ninguna casilla MORA de X-Plane en la base: elegir la carpeta del simulador X-Plane (Instalación › Fuentes y carpetas), marcar la fuente X-Plane de una zona activa y «Reconstruir la base aeronáutica».'
      ]));
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file,
        text = mf ? await mf.file.text() : '';
      const key = c => `${Math.floor(c.lat)}|${Math.floor(c.lon)}`,
        before = text ? window.SiaBase.parseMora(text) : [],
        have = new Set(before.map(key));
      // cases d'X-Plane : centre de case (lat + 0,5) → coin sud-ouest, comme mora.csv
      const add = xp.filter(c => !have.has(key(c))).map(c => ({
        lat: Math.floor(c.lat),
        lon: Math.floor(c.lon),
        mora: c.mora,
        moraFt: c.moraFt,
        terrainFt: null,
        obstacleFt: null,
        source: 'X-Plane earth_mora.dat (grille ARINC 424 du simulateur) — non certifiée',
        keepSource: true
      }));
      const merged = before.map(c => ({
        ...c,
        keepSource: true
      })).concat(add);
      moraPlan = {
        csv: window.SiaBase.moraCsv(merged, {
          airac: b.airac || ''
        }),
        cells: merged,
        changes: add.map(c => ({
          lat: c.lat,
          lon: c.lon,
          before: 0,
          after: c.moraFt,
          obstacleBefore: '',
          obstacleAfter: ''
        })),
        cycle: b.airac || '',
        previousCycle: window.SiaBase.moraCycle(text),
        written: !add.length,
        mode: 'xplane'
      };
    } catch (e) {
      moraMsg = pill('err', e.message);
    }
    renderSia();
  }
  /** Recalcul simple : obstacles du cycle de la base appliqués au relief du mora.csv existant (SiaBase.moraFromObstacles) ;
   *  plan gardé dans moraPlan, déjà « écrit » si rien ne change et que le cycle est le même. */
  async function planMora() {
    moraMsg = '';
    moraPlan = null;
    try {
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file;
      // le recalcul simple met à jour les obstacles d'une grille existante : sans grille, il n'y a rien à recalculer
      if (!mf) throw new Error(t([
        'Pas de grille MORA (data/sia/mora.csv absent, ou dossier SIA non autorisé) : le recalcul simple part de la grille existante. Calculez-la d’abord : « Calculer la MORA de la zone » (zone sur la carte ci-dessus) ou « Calcul complet ».',
        'No MORA grid (data/sia/mora.csv missing, or SIA folder not authorised): the simple recalculation starts from the existing grid. Compute it first: “Compute the zone MORA” (zone on the map above) or “Full calculation”.',
        'Kein MORA-Raster (data/sia/mora.csv fehlt oder SIA-Ordner nicht freigegeben): die einfache Neuberechnung geht vom vorhandenen Raster aus. Zuerst berechnen: „MORA der Zone berechnen“ (Zone auf der Karte oben) oder „Vollständige Berechnung“.',
        'Sin cuadrícula MORA (falta data/sia/mora.csv, o carpeta SIA no autorizada): el recálculo simple parte de la cuadrícula existente. Calcúlela primero: «Calcular la MORA de la zona» (zona en el mapa de arriba) o «Cálculo completo».'
      ]));
      const b = await window.SiaBase.get();
      if (!b?.obstacleMax) throw new Error(t(['base absente : « Reconstruire la base aéronautique »',
        'no base: “Rebuild the aeronautical database”', 'keine Basis: „Luftfahrtdatenbank neu aufbauen“',
        'sin base: «Reconstruir la base aeronáutica»'
      ]));
      const cyc = b.airac || '';
      const text = await mf.file.text();
      moraPlan = {
        ...window.SiaBase.moraFromObstacles(text, b.obstacleMax, cyc),
        cycle: cyc,
        previousCycle: window.SiaBase.moraCycle(text),
        written: false,
        mode: 'simple'
      };
      if (!moraPlan.changes.length && moraPlan.previousCycle === cyc) moraPlan.written = true;
    } catch (e) {
      moraMsg = pill('err', e.message);
    }
    renderSia();
  }
  // Calcul complet (même code que le studio : SiaBase.computeMoraGrid), comparé au mora.csv actuel.
  async function planMoraFull() {
    moraMsg = '';
    moraPlan = null;
    const btn = hosts.sia.querySelector('#mtMoraFull'),
      say = x => {
        const m = hosts.sia.querySelector('#mtMoraMsg');
        if (m) m.innerHTML = x;
      };
    if (btn) btn.disabled = true;
    const job = window.AppFramework?.task?.(t(['Calcul complet de la grille MORA', 'Full MORA grid calculation']));
    try {
      const b = await window.SiaBase.get();
      if (!b?.obstacleMax) throw new Error(t(['base absente : « Reconstruire la base aéronautique »',
        'no base: “Rebuild the aeronautical database”', 'keine Basis: „Luftfahrtdatenbank neu aufbauen“',
        'sin base: «Reconstruir la base aeronáutica»'
      ]));
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file,
        text = mf ? await mf.file.text() : '';
      // théâtres couverts, plus les emprises des missions du registre situées ailleurs (relief et sommets seulement : pas d'obstacles hors AIXM)
      const extra = window.SiaBase.moraZonesOfMissions?.((await regIndex())?.missions || []) || [];
      const cells = await window.SiaBase.computeMoraGrid(b.obstacleMax, {}, (d, n, step, zi = 0, zn = 0) => {
        say(`<span class="mt-small">${zn ? `${zi + 1}/${zn} — ` : ''}${esc(step)} : ${d}/${n}…</span>`);
        if (zn) job?.set(zi, zn, step);
        job?.sub?.(d, n, `${zn ? `${zi + 1}/${zn} — ` : ''}${step} ${d}/${n}`);
      }, extra);
      cells.extraZones = extra.map(z => `${z.name} (${z.s}…${z.n}° / ${z.w}…${z.e}°)`);
      const before = new Map((text ? window.SiaBase.parseMora(text) : []).map(c => [c.lat + '|' + c.lon, c]));
      const changes = cells.map(c => {
        const o = before.get(c.lat + '|' + c.lon);
        return {
          lat: c.lat,
          lon: c.lon,
          before: o ? window.SiaBase.moraFtOf(o) : 0,
          after: c.moraFt,
          obstacleBefore: '',
          obstacleAfter: c.obstacleFt
        };
      }).filter(c => c.before !== c.after);
      moraPlan = {
        csv: window.SiaBase.moraCsv(cells, {
          airac: b.airac
        }),
        cells,
        changes,
        cycle: b.airac || '',
        previousCycle: window.SiaBase.moraCycle(text),
        written: false,
        mode: 'full',
        peaksOk: cells.peaksOk,
        extraZones: cells.extraZones
      };
    } catch (e) {
      moraMsg = pill('err', e.message);
      job?.fail(e);
    } finally {
      job?.end();
    }
    renderSia();
  }

  /** HTML d'un plan MORA p : nombre de cases en hausse, en baisse ou à obstacle seul, tableau des changements, zones
   *  calculées ou hors théâtres, puis la méthode employée (X-Plane, complet ou simple). */
  // tableau des changements de hauteur : replié par défaut ; ouvert ou fermé, il le reste quand le bloc se redessine
  let moraChangesOpen = false;
  document.addEventListener('toggle', e => {
    if (e.target.classList?.contains('mt-mora-changes')) moraChangesOpen = e.target.open;
  }, true);

  function moraHtml(p) {
    const up = p.changes.filter(c => c.after > c.before),
      down = p.changes.filter(c => c.after < c.before),
      obst = p.changes.filter(c => c.after === c.before);
    return `<p>${p.changes.length ? pill('warn', t(['{n} cellule(s) modifiée(s) : {u} en hausse, {d} en baisse, {o} obstacle seul', '{n} cell(s) changed: {u} up, {d} down, {o} obstacle only'], { n: p.changes.length, u: up.length, d: down.length, o: obst.length })) : pill('ok', t(['aucune valeur MORA ne change', 'no MORA value changes']))} ${p.written ? pill('ok', t(['mora.csv tracé AIRAC {c}', 'mora.csv traced AIRAC {c}'], { c: p.cycle })) : ''}</p>
      ${p.changes.length ? `<details class="mt-mora-changes"${moraChangesOpen ? ' open' : ''}><summary class="mt-small">${esc(t(['Voir le tableau des changements de hauteur ({n} case(s))', 'Show the table of height changes ({n} cell(s))', 'Tabelle der Höhenänderungen anzeigen ({n} Feld(er))', 'Ver la tabla de cambios de altura ({n} casilla(s))'], { n: p.changes.length }))}</summary><div class="mt-scroll mt-short"><table class="mt-table"><thead><tr><th>lat</th><th>lon</th><th>MORA</th><th>${esc(t(['obstacle (ft)', 'obstacle (ft)']))}</th></tr></thead><tbody>${p.changes.map(c => `<tr><td>${c.lat}</td><td>${c.lon}</td><td>${c.before} → <b class="${c.after > c.before ? 'mt-minus' : c.after < c.before ? 'mt-plus' : ''}">${c.after}</b></td><td>${c.obstacleBefore} → ${c.obstacleAfter}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
      ${p.zoneBoxes?.length ? `<p class="mt-small">${esc(t(['Zone calculée : {z} ; les autres cases de mora.csv sont gardées. Obstacles : ceux de la base aéronautique (zones actives).', 'Computed zone: {z}; the other mora.csv cells are kept. Obstacles: those of the aeronautical database (active zones).', 'Berechnete Zone: {z}; die übrigen Zellen von mora.csv bleiben. Hindernisse: die der Luftfahrtdatenbank (aktive Zonen).', 'Zona calculada: {z}; las demás celdas de mora.csv se conservan. Obstáculos: los de la base aeronáutica (zonas activas).'], { z: p.zoneBoxes.join(' ; ') }))}</p>` : ''}
      ${p.extraZones?.length ? `<p class="mt-small">${esc(t(['Hors des théâtres couverts, pour les missions du registre : {z} — relief et sommets seulement (pas d’obstacles hors de l’AIXM française).', 'Outside the covered theatres, for the registry missions: {z} — terrain and peaks only (no obstacles outside the French AIXM).'], { z: p.extraZones.join(' ; ') }))}</p>` : ''}
      <p class="mt-small">${esc(p.mode === 'xplane' ? t(['MORA d’X-Plane (earth_mora.dat) : cases absentes de la grille calculée ajoutées ; les cases calculées sont gardées.', 'X-Plane MORA (earth_mora.dat): cells missing from the computed grid added; computed cells kept.', 'X-Plane-MORA (earth_mora.dat): fehlende Felder des berechneten Rasters ergänzt; berechnete Felder bleiben.', 'MORA de X-Plane (earth_mora.dat): casillas ausentes de la cuadrícula calculada añadidas; las calculadas se conservan.']) : p.mode === 'full' ? t(['Calcul complet : relief Terrarium + sommets OSM{o} + obstacles de l’AIRAC {c} ; + 1000 ft (2000 ft au-delà de 5000 ft), centaine supérieure.', 'Full calculation: Terrarium terrain + OSM peaks{o} + AIRAC {c} obstacles.'], { c: p.cycle, o: p.peaksOk === false ? t([' (indisponibles : relief majoré de 100 m)', ' (unavailable: terrain +100 m)']) : '' }) : t(['Recalcul simple : obstacles de l’AIRAC {c}, relief du mora.csv conservé ; + 1000 ft (2000 ft au-delà de 5000 ft), centaine supérieure.', 'Simple recalculation: AIRAC {c} obstacles, terrain kept.'], { c: p.cycle }))}</p>`;
  }
  /** Écrit le mora.csv du plan en cours (l'ancien archivé dans _archives/), met à jour les cases de la base en gardant celles
   *  d'X-Plane hors fichier, trace au journal et redessine les blocs. */
  async function writeMora() {
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier non autorisé', 'folder not authorised']));
      const old = await fileAt(dir, 'mora.csv');
      if (old) await writeAt(dir, `_archives/mora_${moraPlan.previousCycle || new Date(old.lastModified).toISOString().slice(0, 10)}.csv`, await old.arrayBuffer());
      await writeAt(dir, 'mora.csv', moraPlan.csv);
      const key = c => `${Math.floor(c.lat)}|${Math.floor(c.lon)}`,
        inCsv = new Set(moraPlan.cells.map(key)),
        xp = ((await window.SiaBase.get())?.moraCells || []).filter(c => c.src === 'xplane' && !inCsv.has(key(c)));
      const patched = await window.SiaBase.patch({
        moraCells: moraPlan.cells.concat(xp) // cases d'X-Plane hors mora.csv gardées
      });
      moraPlan.written = true;
      moraMsg = pill('ok', t(['mora.csv écrit{b} — à committer', 'mora.csv written{b} — commit it'], {
        b: patched ? t([' et base du studio mise à jour', ' and studio base updated']) : ''
      }));
      window.LocalStore?.logEvent?.({
        kind: 'mora',
        source: dir.name + '/mora.csv',
        airac: moraPlan.cycle,
        files: 1,
        keys: {
          added: [],
          updated: [`${moraPlan.changes.length} cellule(s)`]
        }
      });
      await scanSiaFolder(false);
      baseSummary = await window.SiaBase.summary();
    } catch (e) {
      moraMsg = pill('err', e.message);
    }
    renderSia();
    renderVersions();
    renderDeps();
  }
  /** Contrôles des données étendues : [libellé, pastilles] — zones actives et base reconstruite pour elles, espaces par
   *  source, puis pour chaque zone active : espaces (centre dans la zone) par source, terrains, cases de la grille MORA. */
  async function extendedChecks(b) {
    const rows = [];
    let Z = null;
    try {
      Z = await window.SiaBase.zones?.();
    } catch {
      Z = null; // module des zones indisponible : contrôles SIA seuls
    }
    if (!Z) return rows;
    const SRC = {
      sia: 'SIA',
      dircam: 'DIRCAM',
      aixm5: 'AIXM 5.1',
      geojson: 'GeoJSON',
      openaip: 'openAIP',
      openair: 'OpenAir',
      xplane: 'X-Plane'
    };
    /** Décompte d'une liste d'objets par source (« SIA 12 · openAIP 3 »), du plus fréquent au moins fréquent ; « 0 » si vide. */
    const bySrc = list => {
      const n = {};
      for (const a of list) n[a.src || 'sia'] = (n[a.src || 'sia'] || 0) + 1;
      return Object.entries(n).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${SRC[k] || k} ${v}`).join(' · ') || '0';
    };
    const zoneName = id => t(Z.byId(id)?.name || [id.toUpperCase()]);
    const on = Z.zones().map(z => z.id).filter(id => Z.isOn(id)),
      built = b.sources?.zones || []; // zones de la dernière reconstruction (sia_base.js : base.sources.zones)
    const same = on.length === built.length && on.every(id => built.includes(id));
    rows.push([t(['Zones actives', 'Active zones', 'Aktive Zonen', 'Zonas activas']), !on.length ? pill('warn', t([
      'aucune zone active : la base ne contient que le SIA', 'no active zone: the database holds the SIA only',
      'keine aktive Zone: die Basis enthält nur das SIA', 'ninguna zona activa: la base solo contiene el SIA'
    ])) : same ? pill('ok', on.map(zoneName).join(', ')) : pill('warn', t([
      'base reconstruite pour : {b} ; zones actives : {z} — « Reconstruire la base aéronautique »',
      'database rebuilt for: {b}; active zones: {z} — “Rebuild the aeronautical database”',
      'Basis aufgebaut für: {b}; aktive Zonen: {z} — „Luftfahrtdatenbank neu aufbauen“',
      'base reconstruida para: {b}; zonas activas: {z} — «Reconstruir la base aeronáutica»'
    ], {
      b: built.map(zoneName).join(', ') || '—',
      z: on.map(zoneName).join(', ')
    }))]);
    rows.push([t(['Espaces par source', 'Airspace by source', 'Lufträume nach Quelle', 'Espacios por fuente']), pill('info', bySrc(b
      .airspaces || []))]);
    /** Centre [lat, lon] de l'emprise du premier contour d'un espace ; null sans contour. */
    const centre = a => {
      let s = 90,
        n = -90,
        w = 180,
        e = -180;
      for (const [la, lo] of a.rings?.[0] || []) {
        s = Math.min(s, la), n = Math.max(n, la), w = Math.min(w, lo), e = Math.max(e, lo);
      }
      return s <= n ? [(s + n) / 2, (w + e) / 2] : null;
    };
    const mora = new Set((b.moraCells || []).map(c => `${Math.floor(c.lat)}|${Math.floor(c.lon)}`));
    for (const id of on) {
      const inZ = Z.inZones([id], .2),
        sp = (b.airspaces || []).filter(a => {
          const c = centre(a);
          return c && inZ(c[0], c[1]);
        }),
        ads = (b.aero?.aerodromes || []).filter(a => Number.isFinite(a.lat) && inZ(a.lat, a.lon)).length,
        cells = zoneCellKeys(Z, id),
        covered = [...cells].filter(k => mora.has(k)).length;
      const moraPill = !cells.size ? '' : covered === cells.size ? pill('ok', t(['MORA {c}/{n} cases', 'MORA {c}/{n} cells',
        'MORA {c}/{n} Felder', 'MORA {c}/{n} casillas'
      ], {
        c: covered,
        n: cells.size
      })) : pill('warn', t(['MORA {c}/{n} cases — « Calculer la MORA de la zone »', 'MORA {c}/{n} cells — “Compute the zone MORA”',
        'MORA {c}/{n} Felder — „MORA der Zone berechnen“', 'MORA {c}/{n} casillas — «Calcular la MORA de la zona»'
      ], {
        c: covered,
        n: cells.size
      }));
      rows.push([`${t(['Zone', 'Zone', 'Zone', 'Zona'])} ${zoneName(id)}`, `${pill(sp.length ? 'info' : 'warn', t(['espaces : {l}', 'airspace: {l}', 'Lufträume: {l}', 'espacios: {l}'], { l: sp.length ? bySrc(sp) : '0' }))} ${pill(ads ? 'info' : 'warn', t(['{n} terrain(s)', '{n} aerodrome(s)', '{n} Flugplatz/-plätze', '{n} aeródromo(s)'], { n: ads }))} ${moraPill}`]);
    }
    return rows;
  }
  /** Contrôle de cohérence (carte « Cohérence ») : terrains des missions du registre dans la base, espaces, données des zones
   *  actives, types et performances de la flotte, profils du planificateur, types des missions ; tableau dans #mtUsage. */
  async function usageCheck() {
    const box = document.getElementById('mtUsage');
    box.innerHTML = `<p class="mt-small">${esc(t(['Contrôle…', 'Checking…']))}</p>`;
    const b = await window.SiaBase.get();
    const out = [];
    const types = typeSet();
    const perf = window.AIRCRAFT_PERF || {};
    // terrains des missions du registre présents dans l'AIXM
    const ads = new Set((b?.aero?.aerodromes || []).map(a => a.code || a.icao || a.id).filter(Boolean));
    const reg = (await regIndex())?.missions || [],
      regUrl = new URL('apps/cpco/mission_registry.html', root()).href;
    const regEmpty = pill('info', t([
      'registre des missions vide dans ce navigateur : ouvrir le Registre des missions (il relit data/missions), puis « Contrôler à nouveau »',
      'mission registry empty in this browser: open the Mission registry (it re-reads data/missions), then “Check again”'
    ])) + ` <a class="mt-link" href="${esc(regUrl)}" target="_blank" rel="noopener">${esc(t(['Registre des missions', 'Mission registry']))}</a>`;
    const used = [...new Set(reg.flatMap(m => [m.origin, m.destination]).map(s => /\(([A-Z]{4})\)|\b(LF[A-Z]{2})\b/.exec(s || ''))
      .filter(Boolean).map(m => m[1] || m[2]))];
    const missingAd = ads.size ? used.filter(c => !ads.has(c)) : [];
    out.push([t(['Terrains des missions du registre', 'Registry mission aerodromes', 'Flugplätze der Registermissionen',
      'Aeródromos de las misiones del registro'
    ]), !b ? pill('info', t(['base absente : « Reconstruire la base aéronautique »',
      'no base: “Rebuild the aeronautical database”', 'keine Basis: „Luftfahrtdatenbank neu aufbauen“',
      'sin base: «Reconstruir la base aeronáutica»'
    ])) : !reg.length ? regEmpty : !used.length ? pill('info', t([
      '{n} mission(s), aucun code OACI « (LFxx) » dans leurs terrains',
      '{n} mission(s), no “(LFxx)” ICAO code in their aerodromes',
      '{n} Mission(en), kein ICAO-Code „(LFxx)“ in ihren Flugplätzen',
      '{n} misión(es), ningún código OACI «(LFxx)» en sus aeródromos'
    ], {
      n: reg.length
    })) : missingAd.length ? pill('warn', t(['{n}/{m} absents de la base aéronautique (SIA et sources des zones actives) : {l}',
      '{n}/{m} not in the aeronautical database (SIA and sources of the active zones): {l}',
      '{n}/{m} fehlen in der Luftfahrtdatenbank (SIA und Quellen der aktiven Zonen): {l}',
      '{n}/{m} ausentes de la base aeronáutica (SIA y fuentes de las zonas activas): {l}'
    ], {
      n: missingAd.length,
      m: used.length,
      l: missingAd.join(', ')
    })) : pill('ok', t(['{m} terrain(s) présents dans la base aéronautique',
      '{m} aerodrome(s) found in the aeronautical database', '{m} Flugplatz/-plätze in der Luftfahrtdatenbank',
      '{m} aeródromo(s) presentes en la base aeronáutica'
    ], {
      m: used.length
    }))]);
    // espaces
    const info = window.SiaBase.info();
    out.push([t(['Espaces (base du studio)', 'Airspace (studio base)', 'Lufträume (Studio-Basis)', 'Espacios (base del estudio)']),
      info ? pill(info.mixed ? 'err' : 'ok', t(['{n} espaces, cycle {c}', '{n} airspaces, cycle {c}', '{n} Lufträume, Zyklus {c}',
        '{n} espacios, ciclo {c}'
      ], {
        n: info.counts?.airspaces ?? '?',
        c: info.airac
      })) : pill('info', '—')
    ]);
    // données étendues (zones actives, Paramètres › Maintenance › Données aéronautiques) : base reconstruite pour les
    // zones actives, espaces par source, puis par zone : espaces, terrains, couverture de la grille MORA
    if (b) out.push(...await extendedChecks(b));
    // appareils et flotte
    const fleet = window.DEFA_FLEET || [];
    const fleetTypes = [...new Set(fleet.map(r => r.type).filter(Boolean))];
    const unknown = fleetTypes.filter(x => !knownType(types, x));
    const noPerf = fleetTypes.filter(x => !hasPerf(x));
    out.push([t(['Flotte → types OACI', 'Fleet → ICAO types']), unknown.length ? pill('warn', t(['inconnus : {l}', 'unknown: {l}'], {
      l: unknown.join(', ')
    })) : pill('ok', t(['{n} types, {a} appareils', '{n} types, {a} aircraft'], {
      n: fleetTypes.length,
      a: fleet.length
    }))]);
    // Performances : APD (Eurocontrol, surtout civils) ou profil du planificateur ; seul « aucune des deux » est à traiter.
    const profTypes = new Set(Object.values(readJson('flightPerfState', {})?.profiles || {}).map(p => String(p?.icao || '')
      .toUpperCase()).filter(Boolean));
    const noneAtAll = noPerf.filter(x => !profTypes.has(String(x).toUpperCase()));
    out.push([t(['Flotte → performances', 'Fleet → performance']), `${pill('info', t(['APD : {a}/{m} types (base Eurocontrol, surtout civile)', 'APD: {a}/{m} types (Eurocontrol, mostly civil)'], { a: fleetTypes.length - noPerf.length, m: fleetTypes.length }))} ${pill('info', t(['profils du planificateur : {p} type(s)', 'planner profiles: {p} type(s)'], { p: fleetTypes.filter(x => profTypes.has(String(x).toUpperCase())).length }))} ${noneAtAll.length ? pill('warn', t(['{n} type(s) sans aucune performance (ni APD ni profil) : {l} — à couvrir dans le planificateur si ces appareils volent', '{n} type(s) with no performance at all (no APD, no profile): {l}'], { n: noneAtAll.length, l: noneAtAll.join(', ') })) : pill('ok', t(['tous couverts', 'all covered']))}`]);
    const profs = Object.values(readJson('flightPerfState', {})?.profiles || {});
    const profUnknown = profs.filter(p => p?.icao && !knownType(types, p.icao));
    out.push([t(['Profils du planificateur', 'Planner profiles']), profUnknown.length ? pill('warn', t(['types hors base : {l}',
      'types outside base: {l}'
    ], {
      l: profUnknown.map(p => p.icao).join(', ')
    })) : pill('ok', t(['{n} profil(s)', '{n} profile(s)'], {
      n: profs.length
    }))]);
    const regTypes = [...new Set(reg.flatMap(m => m.aircraftTypes || []))];
    out.push([t(['Missions du registre → types', 'Registry missions → types']), !reg.length ? regEmpty : regTypes.length ? pill('info',
      t(['{n} type(s) : {l}', '{n} type(s): {l}'], {
        n: regTypes.length,
        l: regTypes.slice(0, 12).join(', ') + (regTypes.length > 12 ? '…' : '')
      })) : pill('info', t(['aucun type d’appareil renseigné dans les missions', 'no aircraft type in the missions']))]);
    box.innerHTML = `<table class="mt-table"><tbody>${out.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</tbody></table>
      <p class="mt-small">${esc(t(['Mise à jour des bases (indépendantes de l’AIRAC) :', 'Updating the databases (AIRAC-independent):']))} ${esc(t(['flotte et référence automatiques depuis le site (Références et dépendances) ; types et performances type par type (même rubrique).', 'fleet and reference automatic from the website (References and dependencies); types and performance type by type (same section).']))}</p>
      <p class="row"><button type="button" class="secondary" id="mtUsageRun" data-icon="refresh">${esc(t(['Contrôler à nouveau', 'Check again']))}</button></p>`;
    box.querySelector('#mtUsageRun').onclick = usageCheck;
    window.AppFramework?.refresh?.();
  }

  // ===== 5. Sauvegarde totale
  const EXTRA = 'suiteBackupSources:v1';
  /** Sources de fichiers de la sauvegarde totale : dépôt de données, journaux d'atterrissage, profils de performance, puis
   *  les dossiers ajoutés par l'utilisateur (suiteBackupSources:v1, motif converti en expression régulière). */
  const SOURCES = () => [
    // v3 : tout le dépôt de données (data/) — registres, missions, références, SIA hors XML AIRAC, performances
    {
      id: 'data',
      key: '__data',
      label: ['Dépôt de données (data/ : registres, missions, références, SIA, performances)',
        'Data repository (data/: ledgers, missions, references, SIA, performance)'
      ],
      recursive: true,
      include: /\.(ya?ml|md|txt|csv|json|js|xml|fms|lnmperf)$/i,
      heavy: /\.(png|svg|zip|pdf)$|^(AIXM4\.5|XML_SIA_|sia-airspaces-).*\.xml$/i,
      skipHeavyXml: true
    }, {
      id: 'landing',
      key: '__xplane',
      label: ['Journaux d’atterrissage (dossier X-Plane)', 'Landing logs (X-Plane folder)'],
      recursive: false,
      include: /\.(csv|log)$/i
    }, {
      id: 'perf',
      key: '__perf',
      label: ['Profils de performance (s’il est hors de data/)', 'Performance profiles (if outside data/)'],
      recursive: false,
      include: /\.(lnmperf|json)$/i
    },
    ...(readJson(EXTRA, []) || []).map(x => ({
      ...x,
      include: new RegExp(x.pattern || '.', 'i'),
      extra: true
    }))
  ];
  let backupMsg = '',
    restorePlan = null,
    sinceHtml = '';
  /** Options de la sauvegarde : heavy (case « fichiers lourds » cochée), off (identifiants des sources décochées). */
  const opts = () => ({
    heavy: !!document.getElementById('mtHeavy')?.checked,
    off: readJson('suiteBackupOff:v1', []) || []
  });
  /** Fichiers d'une source (dossier autorisé) ; null si le dossier n'est pas choisi / autorisé. */
  async function sourceFiles(src, {
    heavy = false,
    request = false
  } = {}) {
    const dir = await folder(src.key, request);
    if (!dir) return null;
    if (src.paths) {
      const out = [];
      for (const p of src.paths) {
        const f = await fileAt(dir, p);
        if (f) out.push({
          path: p,
          file: f
        });
      }
      for (const d of src.dirs || []) {
        try {
          const h = await d.dir.split('/').reduce(async (a, b) => (await a).getDirectoryHandle(b), Promise.resolve(dir));
          out.push(...await listFiles(h, {
            filter: (p, n) => d.include.test(n),
            base: d.dir + '/'
          }));
        } catch {
          /* absent */
        }
      }
      return {
        dir,
        files: out
      };
    }
    const files = await listFiles(dir, {
      recursive: src.recursive,
      filter: (p, n) => (src.skipHeavyXml && src.heavy?.test(n)) ? heavy : (src.include.test(n) || (heavy && src.heavy?.test(n)))
    });
    return {
      dir,
      files
    };
  }
  /** Dessine le bloc « Sauvegarde totale » (sources et dossiers, options, lancement, restauration) et, à côté, le journal des
   *  sauvegardes et rechargements. */
  async function renderBackup() {
    const host = hosts.backup,
      o = opts(),
      journal = window.LocalStore?.journal?.() || [];
    // dossiers ajoutés : déclarés à FileAccess (libellé et infobulle des boutons)
    for (const x of readJson(EXTRA, []) || [])
      if (window.FileAccess && !window.FileAccess.FOLDERS[x.key]) window.FileAccess.FOLDERS[x.key] = {
        label: x.label,
        expect: x.label
      };
    const lastFull = journal.find(e => e.kind === 'full-backup');
    host.innerHTML = `
      <div class="mt-grid2">
        <div class="repo-card" data-icon="folder" data-subtitle="${esc(t(['Ce qui entre dans l’archive', 'What goes into the archive']))}">
          <h3>${esc(t(['Contenu', 'Content', 'Inhalt', 'Contenido']))}</h3>
          <p><label class="mt-radio"><input type="checkbox" checked disabled> <b>${esc(t(['Navigateur', 'Browser', 'Browser', 'Navegador']))}</b> — ${esc(t(['toutes les données locales et les bases IndexedDB sauvegardées (defa_local_store.yaml)', 'all local data and saved IndexedDB databases (defa_local_store.yaml)']))}</label></p>
          <div id="mtSources"></div>
          <p><label class="mt-radio"><input type="checkbox" id="mtHeavy" ${o.heavy ? 'checked' : ''}> ${esc(t(['inclure les fichiers lourds (cartes PNG / ZIP / PDF des missions, XML AIRAC ≈ 80 Mo)', 'include heavy files (mission PNG / ZIP / PDF maps, AIRAC XML ≈ 80 MB)']))}</label></p>
          <p class="row"><button type="button" class="secondary" id="mtAddSource" data-icon="plus">${esc(t(['Ajouter un dossier…', 'Add a folder…', 'Ordner hinzufügen…', 'Añadir carpeta…']))}</button></p>
          <p class="mt-small">${esc(t(['Hors sauvegarde, volontairement : clef du webservice, suivi réseau en cours, base SIA analysée (reconstruite depuis les XML), autorisations de dossiers (redemandées).', 'Deliberately excluded: webservice key, live network tracking, analysed SIA base (rebuilt from XML), folder permissions (asked again).']))}</p>
        </div>
        <div class="repo-card" data-icon="save" data-subtitle="${esc(t(['Archive ZIP avec manifeste (empreintes SHA-256)', 'ZIP archive with manifest (SHA-256 hashes)']))}">
          <h3>${esc(t(['Sauvegarder', 'Back up', 'Sichern', 'Guardar']))}</h3>
          <p>${lastFull ? t(['Dernière sauvegarde totale : {d} — {n} fichiers, {s}', 'Last full backup: {d} — {n} files, {s}'], { d: esc(fmtDate(lastFull.at)), n: lastFull.files, s: fmtSize(lastFull.bytes) }) : pill('warn', t(['aucune sauvegarde totale', 'no full backup yet']))}</p>
          <p class="row"><button type="button" class="primary" id="mtBackup" data-icon="save">${esc(t(['Créer la sauvegarde totale', 'Create full backup', 'Vollständige Sicherung erstellen', 'Crear copia total']))}</button> <button type="button" class="secondary" id="mtSince" data-icon="search">${esc(t(['Changements depuis', 'Changes since', 'Änderungen seitdem', 'Cambios desde']))}</button></p>
          <p class="mt-small">${esc(t(['Écrite dans le dossier de sauvegarde locale (sous-dossier sauvegardes/) s’il est autorisé, sinon téléchargée.', 'Written to the local backup folder (sauvegardes/ sub-folder) when authorised, otherwise downloaded.']))}</p>
          <div id="mtBackupMsg">${backupMsg}</div><div id="mtSinceBox">${sinceHtml}</div>
          <h3>${esc(t(['Recharger une sauvegarde totale', 'Reload a full backup', 'Vollständige Sicherung laden', 'Recargar una copia total']))}</h3>
          <p class="row"><label class="secondary mt-file">${esc(t(['Choisir l’archive…', 'Choose the archive…', 'Archiv wählen…', 'Elegir el archivo…']))}<input type="file" id="mtRestoreZip" accept=".zip" hidden data-picker-folder="__store"></label></p>
          <div id="mtRestore">${restorePlan ? restoreHtml(restorePlan) : ''}</div>
        </div>
      </div>`;
    const box = host.querySelector('#mtSources');
    for (const src of SOURCES()) {
      const row = document.createElement('p');
      row.className = 'row mt-source';
      row.innerHTML = `<label class="mt-radio"><input type="checkbox" data-src="${esc(src.id)}" ${o.off.includes(src.id) ? '' : 'checked'}> ${esc(t(src.label))}</label>`;
      row.append(folderButton(src.key, renderBackup));
      if (src.extra) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'secondary';
        del.textContent = '×';
        del.title = t(['Retirer', 'Remove']);
        del.onclick = () => {
          writeJson(EXTRA, (readJson(EXTRA, []) || []).filter(x => x.id !== src.id));
          renderBackup();
        };
        row.append(del);
      }
      box.append(row);
    }
    box.querySelectorAll('input[data-src]').forEach(x => x.onchange = () => {
      const off = new Set(opts().off);
      x.checked ? off.delete(x.dataset.src) : off.add(x.dataset.src);
      writeJson('suiteBackupOff:v1', [...off]);
    });
    host.querySelector('#mtAddSource').onclick = addSource;
    host.querySelector('#mtBackup').onclick = fullBackup;
    host.querySelector('#mtSince').onclick = changesSince;
    host.querySelector('#mtRestoreZip').onchange = e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) planRestore(f);
    };
    host.querySelector('#mtRestoreGo')?.addEventListener('click', runRestore);
    window.AppFramework?.refresh?.();
  }
  /** Ajoute un dossier à la sauvegarde : nom et motif des fichiers demandés (motif vérifié), dossier choisi par FileAccess,
   *  source mémorisée dans suiteBackupSources:v1 ; le bloc est redessiné. */
  async function addSource() {
    const label = prompt(t(['Nom de ce dossier (ex. « Journaux d’atterrissage du plugin »)',
      'Name of this folder (e.g. “Plugin landing logs”)'
    ]));
    if (!label) return;
    const pattern = prompt(t(['Fichiers à inclure (expression régulière sur le nom) :',
      'Files to include (regular expression on the name):'
    ]), '\\.(csv|ya?ml|json|md|txt|fms|lnmperf)$');
    if (pattern == null) return;
    try {
      new RegExp(pattern);
    } catch {
      window.AppFramework.notify(t(['Expression invalide', 'Invalid expression']), 'warn');
      return;
    }
    const id = 'x' + Date.now().toString(36),
      key = `__backup_${id}`;
    try {
      window.FileAccess.FOLDERS[key] = {
        label: [label, label, label, label],
        expect: [label, label, label, label]
      };
      await window.FileAccess.pickFolder(key);
      writeJson(EXTRA, [...(readJson(EXTRA, []) || []), {
        id,
        key,
        label: [label, label, label, label],
        pattern,
        recursive: true
      }]);
    } catch (e) {
      if (e?.name !== 'AbortError')(window.AppFramework?.notify || alert)(e.message, 'warn');
    }
    renderBackup();
  }
  /** Inventaire courant de toutes les sources actives : [{ source, label, dir, files: [{ path, file }] }] ; missing : sources sans dossier. */
  async function inventory(request) {
    const o = opts(),
      out = [],
      missing = [];
    for (const src of SOURCES()) {
      if (o.off.includes(src.id)) continue;
      const r = await sourceFiles(src, {
        heavy: o.heavy,
        request
      });
      if (!r) {
        missing.push(t(src.label));
        continue;
      }
      out.push({
        source: src.id,
        label: t(src.label),
        folder: r.dir.name,
        files: r.files
      });
    }
    return {
      sources: out,
      missing
    };
  }
  /** Crée la sauvegarde totale : données du navigateur (LocalStore.toText), fichiers des sources actives, manifest.json
   *  (tailles, dates, SHA-256) et LISEZMOI.txt en un ZIP, écrit dans sauvegardes/ du dossier de sauvegarde ou téléchargé. */
  async function fullBackup() {
    const msg = document.getElementById('mtBackupMsg');
    /** Mémorise le message d'avancement (backupMsg) et l'affiche. */
    const say = h => {
      backupMsg = h;
      if (msg) msg.innerHTML = h;
    };
    try {
      say(t(['Inventaire des dossiers…', 'Listing folders…']));
      const LS = await waitFor('LocalStore');
      if (!LS?.toText) throw new Error('browser_store.js');
      const {
        sources,
        missing
      } = await inventory(true);
      const browser = await LS.toText();
      const files = [],
        zipFiles = [];
      zipFiles.push({
        name: 'navigateur/defa_local_store.yaml',
        data: browser.text
      });
      let bytes = browser.text.length,
        n = 0,
        total = sources.reduce((a, s) => a + s.files.length, 0);
      for (const s of sources)
        for (const f of s.files) {
          n++;
          if (n % 10 === 0) say(t(['Lecture {n}/{m}…', 'Reading {n}/{m}…'], {
            n,
            m: total
          }));
          const data = new Uint8Array(await f.file.arrayBuffer());
          const sha = await window.ZipStore.sha256(data);
          files.push({
            source: s.source,
            path: f.path,
            size: data.length,
            lastModified: new Date(f.file.lastModified).toISOString(),
            sha256: sha
          });
          zipFiles.push({
            name: `${s.source}/${f.path}`,
            data,
            date: f.file.lastModified
          });
          bytes += data.length;
        }
      const SU = window.SuiteUpdate,
        g = SU?.gitInfo?.(),
        A = window.Airac;
      const createdAt = new Date().toISOString();
      const manifest = {
        schema: 'xplane-web-suite-backup',
        version: 1,
        createdAt,
        suite: window.REPOSITORY_TREE?.release || {},
        git: g ? {
          branch: g.branch,
          head: g.head
        } : null,
        airac: {
          effective: A.cycle().date,
          base: window.SiaBase.info()?.airac || ''
        },
        origin: location.origin,
        browser: {
          file: 'navigateur/defa_local_store.yaml',
          entries: browser.count,
          savedAt: browser.savedAt
        },
        sources: sources.map(s => ({
          id: s.source,
          label: s.label,
          folder: s.folder,
          files: s.files.length
        })),
        missing,
        files
      };
      zipFiles.unshift({
        name: 'manifest.json',
        data: JSON.stringify(manifest, null, 2)
      });
      zipFiles.push({
        name: 'LISEZMOI.txt',
        data: `Sauvegarde totale — XPlane Web Suite ${manifest.suite.version || ''}\r\nCréée le ${createdAt} depuis ${location.origin}\r\n\r\nnavigateur/defa_local_store.yaml : données locales du navigateur (menu ☰ › Données locales › Restaurer, ou Paramètres › Maintenance › Recharger une sauvegarde totale).\r\n<source>/<chemin> : fichiers des dossiers autorisés (${sources.map(s => `${s.source} = ${s.folder}`).join(', ')}).\r\nmanifest.json : liste des fichiers, tailles, dates et empreintes SHA-256.\r\n`
      });
      say(t(['Compression…', 'Compressing…']));
      const blob = await window.ZipStore.build(zipFiles);
      const name = `suite_sauvegarde_${createdAt.slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1_')}.zip`;
      const store = await folder('__store', true);
      let where;
      if (store) {
        await writeAt(store, `sauvegardes/${name}`, blob);
        where = `${store.name}/sauvegardes/${name}`;
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        where = t(['téléchargée : {n}', 'downloaded: {n}'], {
          n: name
        });
      }
      LS.logEvent({
        kind: 'full-backup',
        source: where,
        files: files.length,
        bytes: blob.size,
        entries: browser.count,
        missing,
        manifest: files.map(f => ({
          s: f.source,
          p: f.path,
          h: f.sha256.slice(0, 16),
          z: f.size
        }))
      });
      say(pill('ok', t(['Sauvegarde totale écrite ({w}) : {n} fichiers + navigateur ({e} entrées), {s}',
        'Full backup written ({w}): {n} files + browser ({e} entries), {s}'
      ], {
        w: where,
        n: files.length,
        e: browser.count,
        s: fmtSize(blob.size)
      })) + (missing.length ? `<br>${pill('warn', t(['dossiers non choisis / non autorisés : {l}', 'folders not chosen / not authorised: {l}'], { l: missing.join(', ') }))}` : ''));
      renderJournal();
      renderVersions();
    } catch (e) {
      say(pill('err', e.message));
    }
  }
  /** Compare les fichiers actuels des sources au manifeste de la dernière sauvegarde totale tracée (taille, empreinte) :
   *  modifiés, nouveaux, disparus, plus le nombre de modifications du navigateur non sauvegardées. */
  async function changesSince() {
    const box = document.getElementById('mtSinceBox');
    const last = (window.LocalStore?.journal?.() || []).find(e => e.kind === 'full-backup' && e.manifest);
    if (!last) {
      sinceHtml = pill('info', t(['aucune sauvegarde totale tracée', 'no traced full backup']));
      if (box) box.innerHTML = sinceHtml;
      return;
    }
    if (box) box.innerHTML = t(['Comparaison…', 'Comparing…']);
    const {
      sources
    } = await inventory(true);
    const before = new Map(last.manifest.map(f => [`${f.s}/${f.p}`, f])),
      seen = new Set(),
      changed = [],
      added = [];
    for (const s of sources)
      for (const f of s.files) {
        const k = `${s.source}/${f.path}`,
          old = before.get(k);
        seen.add(k);
        if (!old) {
          added.push(k);
          continue;
        }
        if (old.z !== f.file.size || (await window.ZipStore.sha256(await f.file.arrayBuffer())).slice(0, 16) !== old.h) changed.push(k);
      }
    const removed = [...before.keys()].filter(k => !seen.has(k));
    const pending = Number(localStorage.getItem('defaLocalStore:pending') || 0);
    const list = (arr, cls) => arr.slice(0, 40).map(x => `<code class="${cls}">${esc(x)}</code>`).join(' ') + (arr.length > 40 ? ` … (+${arr.length - 40})` : '');
    sinceHtml = `<p>${esc(t(['Depuis le {d}', 'Since {d}'], { d: fmtDate(last.at) }))} : ${!changed.length && !added.length && !removed.length ? pill('ok', t(['fichiers identiques', 'files unchanged'])) : pill('warn', t(['{c} modifié(s), {a} nouveau(x), {r} disparu(s)', '{c} changed, {a} new, {r} gone'], { c: changed.length, a: added.length, r: removed.length }))} · ${esc(t(['navigateur : {n} modification(s) non sauvegardée(s)', 'browser: {n} unsaved change(s)'], { n: pending }))}</p>
      ${changed.length ? `<p>${list(changed, 'mt-chg')}</p>` : ''}${added.length ? `<p>${list(added, 'mt-plus')}</p>` : ''}${removed.length ? `<p>${list(removed, 'mt-minus')}</p>` : ''}`;
    if (box) box.innerHTML = sinceHtml;
  }
  /** Lit une archive de sauvegarde totale et prépare restorePlan : état de chaque fichier du manifeste face au disque
   *  (identique, absent, plus ancien, plus récent, dossier non autorisé), absents et plus anciens présélectionnés. */
  async function planRestore(file) {
    const box = document.getElementById('mtRestore');
    try {
      if (box) box.innerHTML = t(['Lecture de l’archive…', 'Reading the archive…']);
      const entries = await window.ZipStore.read(file);
      const byName = new Map(entries.map(e => [e.name, e]));
      const mf = byName.get('manifest.json');
      if (!mf) throw new Error(t(['manifest.json absent : ce n’est pas une sauvegarde totale',
        'manifest.json missing: not a full backup'
      ]));
      const manifest = JSON.parse(await mf.text());
      const srcs = new Map(SOURCES().map(s => [s.id, s]));
      const items = [];
      for (const f of manifest.files || []) {
        const src = srcs.get(f.source),
          dir = src ? await folder(src.key, true) : null;
        const cur = dir ? await fileAt(dir, f.path) : null;
        let state = 'nofolder';
        if (dir) {
          if (!cur) state = 'missing';
          else if (cur.size === f.size && (await window.ZipStore.sha256(await cur.arrayBuffer())) === f.sha256) state = 'same';
          else state = cur.lastModified > Date.parse(f.lastModified) ? 'newer' : 'older';
        }
        items.push({
          ...f,
          state,
          folder: dir?.name || '',
          curModified: cur?.lastModified || 0,
          pick: state === 'missing' || state === 'older'
        });
      }
      restorePlan = {
        file: file.name,
        manifest,
        entries: byName,
        items,
        browser: !!byName.get('navigateur/defa_local_store.yaml')
      };
    } catch (e) {
      restorePlan = null;
      if (box) box.innerHTML = pill('err', e.message);
      return;
    }
    renderBackup();
  }

  /** HTML du plan de restauration p : résumé de l'archive, case des données du navigateur, tableau des fichiers à cocher. */
  function restoreHtml(p) {
    const lbl = {
      same: pill('ok', t(['identique', 'identical'])),
      missing: pill('warn', t(['absent du disque', 'missing on disk'])),
      older: pill('warn', t(['plus ancien sur le disque', 'older on disk'])),
      newer: pill('info', t(['plus récent sur le disque', 'newer on disk'])),
      nofolder: pill('err', t(['dossier non autorisé', 'folder not authorised']))
    };
    const counts = p.items.reduce((a, i) => (a[i.state] = (a[i.state] || 0) + 1, a), {});
    return `<p><b>${esc(p.file)}</b> — ${esc(fmtDate(p.manifest.createdAt))} · ${esc(p.manifest.suite?.version || '')} · AIRAC ${esc(p.manifest.airac?.base || '?')} · ${Object.entries(counts).map(([k, v]) => `${v} ${lbl[k]}`).join(' ')}</p>
      <p><label class="mt-radio"><input type="checkbox" id="mtRestoreBrowser" ${p.browser ? 'checked' : 'disabled'}> ${esc(t(['Données du navigateur : fusion (la valeur la plus récente l’emporte), tracée dans le journal', 'Browser data: merge (newest value wins), traced in the journal']))} (${esc(p.manifest.browser?.entries ?? '?')} ${esc(t(['entrées', 'entries']))}, ${esc(fmtDate(p.manifest.browser?.savedAt))})</label></p>
      <div class="mt-scroll mt-short"><table class="mt-table mt-wide"><thead><tr><th></th><th>${esc(t(['Fichier', 'File']))}</th><th>${esc(t(['Sauvegarde', 'Backup']))}</th><th>${esc(t(['Disque', 'Disk']))}</th><th>${esc(t(['État', 'State']))}</th></tr></thead><tbody>
      ${p.items.map((i, k) => `<tr><td><input type="checkbox" data-restore="${k}" ${i.pick ? 'checked' : ''} ${i.state === 'nofolder' || i.state === 'same' ? 'disabled' : ''}></td><td><code>${esc(i.source)}/${esc(i.path)}</code></td><td>${esc(fmtDate(i.lastModified))}</td><td>${i.curModified ? esc(fmtDate(i.curModified)) : '—'}</td><td>${lbl[i.state]}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="row"><button type="button" class="primary" id="mtRestoreGo" data-icon="upload">${esc(t(['Restaurer la sélection', 'Restore selection', 'Auswahl wiederherstellen', 'Restaurar la selección']))}</button></p>`;
  }
  /** Restaure, après confirmation, les fichiers cochés (les remplacés copiés d'abord dans _avant_restauration/<date>/) et,
   *  si demandé, fusionne les données du navigateur ; trace au journal et redessine les blocs. */
  async function runRestore() {
    const p = restorePlan,
      box = document.getElementById('mtRestore');
    const picks = [...document.querySelectorAll('input[data-restore]')].filter(x => x.checked).map(x => p.items[+x.dataset.restore]);
    const withBrowser = document.getElementById('mtRestoreBrowser')?.checked;
    if (!picks.length && !withBrowser) return;
    if (!await window.AppFramework.ask(t([
        'Restaurer {n} fichier(s){b} ? Les fichiers remplacés sont d’abord copiés dans _avant_restauration/ de leur dossier.',
        'Restore {n} file(s){b}? Replaced files are first copied into _avant_restauration/ in their folder.'
      ], {
        n: picks.length,
        b: withBrowser ? t([' et les données du navigateur', ' and browser data']) : ''
      }))) return;
    const done = [],
      errors = [],
      stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const srcs = new Map(SOURCES().map(s => [s.id, s]));
    for (const i of picks) {
      try {
        const dir = await folder(srcs.get(i.source).key, true);
        const cur = await fileAt(dir, i.path);
        if (cur) await writeAt(dir, `_avant_restauration/${stamp}/${i.path}`, await cur.arrayBuffer());
        await writeAt(dir, i.path, await p.entries.get(`${i.source}/${i.path}`).bytes());
        done.push(`${i.source}/${i.path}`);
      } catch (e) {
        errors.push(`${i.path} : ${e.message}`);
      }
    }
    let counts = null;
    if (withBrowser) counts = await window.LocalStore.restoreText(await p.entries.get('navigateur/defa_local_store.yaml').text(), {
      source: `${p.file} (sauvegarde totale du ${p.manifest.createdAt})`
    });
    window.LocalStore.logEvent({
      kind: 'full-restore',
      source: p.file,
      savedAt: p.manifest.createdAt,
      files: done.length,
      errors: errors.length,
      added: counts?.added || 0,
      updated: counts?.updated || 0,
      keys: {
        added: [],
        updated: done.slice(0, 80)
      }
    });
    restorePlan = null;
    if (box) box.innerHTML = '';
    backupMsg = pill(errors.length ? 'warn' : 'ok', t(['{n} fichier(s) restauré(s){b}', '{n} file(s) restored{b}'], {
      n: done.length,
      b: counts ? t([' ; navigateur : {a} ajoutées, {u} mises à jour', '; browser: {a} added, {u} updated'], {
        a: counts.added,
        u: counts.updated
      }) : ''
    })) + (errors.length ? `<br>${esc(errors.join(' · '))}` : '');
    renderBackup();
    renderJournal();
    renderVersions();
  }

  // ===== 6. Journal
  function renderJournal() {
    const host = hosts.journal,
      list = window.LocalStore?.journal?.() || [];
    const K = {
      restore: t(['Rechargement des données locales', 'Local data reload']),
      'full-backup': t(['Sauvegarde totale', 'Full backup']),
      'full-restore': t(['Restauration d’une sauvegarde totale', 'Full backup restore']),
      'sia-extract': t(['Extraction export SIA', 'SIA export extraction']),
      'sia-archive': t(['Archivage anciens cycles', 'Old cycles archived']),
      mora: t(['Recalcul MORA', 'MORA recalculation'])
    };
    host.innerHTML = !list.length ? `<p class="mt-small">${esc(t(['Journal vide : il se remplit à chaque sauvegarde totale, restauration ou rechargement (☰ › Données locales › Restaurer).', 'Empty journal: filled by every full backup, restore or reload (☰ › Local data › Restore).']))}</p>` :
      `<div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Date', 'Date']))}</th><th>${esc(t(['Opération', 'Operation']))}</th><th>${esc(t(['Origine', 'Origin']))}</th><th>${esc(t(['Résultat', 'Result']))}</th></tr></thead><tbody>
      ${list.map(e => {
        const keys = [...(e.keys?.added || []).map(k => `<code class="mt-plus">+ ${esc(k)}</code>`), ...(e.keys?.updated || []).map(k => `<code class="mt-chg">~ ${esc(k)}</code>`)];
        const res = e.kind === 'restore' ? t(['{a} ajoutées, {u} mises à jour, {k} conservées', '{a} added, {u} updated, {k} kept'], { a: e.added || 0, u: e.updated || 0, k: e.kept || 0 }) : e.kind === 'full-backup' ? `${e.files} ${t(['fichiers', 'files'])} · ${fmtSize(e.bytes)}` : e.files != null ? `${e.files} ${t(['fichier(s)', 'file(s)'])}${e.errors ? ` · ${e.errors} ${t(['erreur(s)', 'error(s)'])}` : ''}` : '';
        return `<tr><td>${esc(fmtDate(e.at))}</td><td>${esc(K[e.kind] || e.kind)}<br><span class="mt-small">${esc(e.page || '')}</span></td><td class="mt-small">${esc(e.source || '')}${e.savedAt ? `<br>${esc(t(['sauvegarde du {d}', 'backup of {d}'], { d: fmtDate(e.savedAt) }))}` : ''}</td><td>${esc(res)}${keys.length ? `<details><summary>${keys.length} ${esc(t(['élément(s)', 'item(s)']))}</summary>${keys.join(' ')}</details>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  // ===== 5 bis. Caches
  // Données reconstructibles, jamais des données utilisateur : aérodromes utilisés (missionAirports:v1, complétés
  // depuis la base mondiale servie par jsDelivr), base SIA analysée (IndexedDB sia-map-parser, SiaBase.purge),
  // résultat du contrôle des mises à jour (suiteUpdateCheck:v1, suiteGitInfo:v1), cache HTTP des fichiers de
  // l'application (scripts, styles, repository_tree). Restent hors purge : registres, brouillons, profils,
  // FlightPerfCache (OFP, calibrations) et Landing (dernier journal), sauvegardés avec les données locales.
  const AIRPORTS_DEFAULT = 'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json';
  /** Adresse de la base mondiale des aérodromes (source « airports » réglable, jsDelivr par défaut). */
  const airportsUrl = () => window.RepositoryNav?.source?.('airports') || AIRPORTS_DEFAULT;
  /** Adresse de purge jsDelivr (purge.jsdelivr.net) d'un fichier servi par cdn.jsdelivr.net ; '' pour une autre source. */
  const jsdelivrPurgeUrl = url => /^https:\/\/cdn\.jsdelivr\.net\//.test(url) ? url.replace('https://cdn.jsdelivr.net/',
    'https://purge.jsdelivr.net/') : '';
  /** Place approximative d'une clé du localStorage en octets (clé + valeur, 2 octets par caractère) ; 0 si absente. */
  const lsBytes = key => {
    try {
      const v = localStorage.getItem(key);
      return v == null ? 0 : (key.length + v.length) * 2;
    } catch {
      return 0;
    }
  };
  /** Nombre d'éléments de la valeur JSON d'une clé du localStorage (tableau ou objet) ; 0 si absente ou illisible. */
  const lsCount = key => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
    } catch {
      return 0;
    }
  };
  /** Retire les clés données du localStorage (erreurs de stockage ignorées). */
  const lsDrop = keys => keys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* stockage indisponible */
    }
  });
  /** Recharge depuis le serveur (cache: 'reload') les scripts, styles et repository_tree de la page : le cache HTTP du navigateur est remplacé. */
  async function refreshAppFiles() {
    const urls = [...new Set([...document.scripts].map(x => x.src).concat([...document.querySelectorAll('link[rel="stylesheet"]')].map(
      x => x.href)).filter(u => u && new URL(u, location.href).origin === location.origin))];
    let ok = 0,
      missing = 0; // absents (404) : fichiers de data/ facultatifs, remplacés par examples/
    await Promise.all(urls.map(u => fetch(u, {
      cache: 'reload'
    }).then(r => {
      if (r.ok) ok++;
      else if (r.status === 404) missing++;
    }).catch(() => {})));
    if ('caches' in window) {
      try {
        for (const k of await caches.keys()) await caches.delete(k);
      } catch {
        /* file:// */
      }
    }
    return {
      ok,
      total: urls.length - missing
    };
  }
  /** Caches purgeables : { id, icon, label, where, state() : état lisible, after : effet de la purge, confirm?, reload?,
   *  purge() : message, ou { warn } en cas de souci }. */
  const CACHES = () => [{
    id: 'dataIndex',
    icon: 'refresh',
    label: ['Index des données', 'Data index', 'Datenindex', 'Índice de datos'],
    where: 'IndexedDB defaIndex',
    /** Contenu de l'index (texte fixe). */
    state: () => t(['Registre des missions, CR, copies des fichiers du pool (disponibilités, fiches) ; les fichiers font foi.',
      'Mission registry, reports, copies of pool files (availability, user cards); the files prevail.'
    ]),
    after: [
      'Base effacée, reconstruite depuis les fichiers au prochain chargement des pages (après un changement extérieur des fichiers sans lanceur, par exemple).',
      'Base erased, rebuilt from the files when pages next load (after the files changed outside the suite without the launcher, for example).'
    ],
    /** Efface l'index IndexedDB des données (DataIndex.rebuild) : il se reconstruit depuis les fichiers. */
    purge: async () => {
      await window.DataIndex?.rebuild?.();
      return t(['Index des données effacé : il se reconstruit depuis les fichiers.',
        'Data index erased: it rebuilds from the files.'
      ]);
    }
  }, {
    id: 'airports',
    icon: 'map',
    label: ['Aérodromes utilisés', 'Aerodromes used', 'Verwendete Flugplätze', 'Aeródromos usados'],
    where: 'localStorage missionAirports:v1',
    /** Nombre de terrains gardés et place occupée. */
    state: () => t(['{n} terrains, {s}', '{n} aerodromes, {s}'], {
      n: lsCount('missionAirports:v1'),
      s: fmtSize(lsBytes('missionAirports:v1'))
    }),
    after: ['Relus dans la base mondiale au prochain usage ; les terrains importés d’un OFP hors base sont à réimporter.',
      'Read again from the world base when next used; aerodromes imported from an OFP outside the base must be re-imported.'
    ],
    /** Oublie les aérodromes gardés (missionAirports:v1). */
    purge: async () => {
      lsDrop(['missionAirports:v1']);
      return t(['Aérodromes oubliés.', 'Aerodromes cleared.']);
    }
  }, {
    id: 'world',
    icon: 'link',
    label: ['Base mondiale des aérodromes (jsDelivr)', 'World aerodrome base (jsDelivr)', 'Weltweite Flugplatzbasis (jsDelivr)',
      'Base mundial de aeródromos (jsDelivr)'
    ],
    where: airportsUrl(),
    /** Durée de garde selon que la source est servie par jsDelivr ou non. */
    state: () => jsdelivrPurgeUrl(airportsUrl()) ? t(['CDN : branche gardée ≈ 12 h ; navigateur : cache HTTP',
      'CDN: branch kept ≈ 12 h; browser: HTTP cache'
    ]) : t(['source hors jsDelivr : cache HTTP du navigateur', 'non-jsDelivr source: browser HTTP cache']),
    after: ['Purge du CDN demandée à purge.jsdelivr.net, puis fichier rechargé depuis le serveur (cache HTTP remplacé).',
      'CDN purge requested from purge.jsdelivr.net, then the file is reloaded from the server (HTTP cache replaced).'
    ],
    /** Demande la purge du CDN jsDelivr (sans attendre de réponse lisible), puis recharge le fichier sans cache HTTP. */
    purge: async () => {
      const url = airportsUrl(),
        purgeUrl = jsdelivrPurgeUrl(url);
      if (purgeUrl) await fetch(purgeUrl, {
        mode: 'no-cors',
        cache: 'no-store'
      }).catch(() => {});
      const r = await fetch(url, {
        cache: 'reload'
      }).catch(() => null);
      return r?.ok ? t(['Base mondiale rechargée{p}.', 'World base reloaded{p}.'], {
        p: purgeUrl ? t([' (purge CDN demandée)', ' (CDN purge requested)']) : ''
      }) : {
        warn: t(['Base mondiale injoignable (hors ligne ?).', 'World base unreachable (offline?).'])
      };
    }
  }, {
    id: 'sia',
    icon: 'database',
    label: ['Base SIA analysée', 'Analysed SIA base', 'Analysierte SIA-Basis', 'Base SIA analizada'],
    where: 'IndexedDB sia-map-parser + localStorage siaBaseInfo:v1',
    /** Cycle et date de lecture de la base SIA (baseSummary), ou « vide ». */
    state: () => baseSummary ? t(['AIRAC {c}, lue le {d}', 'AIRAC {c}, read {d}'], {
      c: baseSummary.airac || '?',
      d: fmtDate(baseSummary.cachedAt)
    }) : t(['vide', 'empty']),
    after: [
      'À relire depuis le dossier SIA (studio, ou « Reconstruire la base aéronautique » des données aéronautiques) ; la base précédente (comparaison) est gardée.',
      'To be read again from the SIA folder (studio, or “Rebuild the aeronautical database” in aeronautical data); the previous base (comparison) is kept.'
    ],
    confirm: ['La base SIA devra être relue depuis le dossier SIA (quelques dizaines de secondes). Purger ?',
      'The SIA base will have to be read again from the SIA folder (a few tens of seconds). Purge?'
    ],
    /** Vide la base SIA analysée (SiaBase.purge). */
    purge: async () => {
      await window.SiaBase?.purge?.();
      return t(['Base SIA purgée.', 'SIA base purged.']);
    }
  }, {
    id: 'update',
    icon: 'refresh',
    label: ['Contrôle des mises à jour', 'Update check', 'Update-Prüfung', 'Control de actualizaciones'],
    where: 'localStorage suiteUpdateCheck:v1, suiteGitInfo:v1',
    /** Date du dernier contrôle des mises à jour, ou « aucun ». */
    state: () => {
      const c = window.SuiteUpdate?.last?.();
      return c?.at ? t(['dernier contrôle {d}', 'last check {d}'], {
        d: fmtDate(c.at)
      }) : t(['aucun', 'none']);
    },
    after: ['Canal distant et état git relus au prochain contrôle (réglages du canal conservés).',
      'Remote channel and git state read again at the next check (channel settings kept).'
    ],
    /** Oublie le dernier contrôle et l'état git mémorisés (gitState compris). */
    purge: async () => {
      lsDrop(['suiteUpdateCheck:v1', 'suiteGitInfo:v1']);
      gitState = null;
      return t(['Contrôle oublié.', 'Check cleared.']);
    }
  }, {
    id: 'files',
    icon: 'layers',
    label: ['Fichiers de l’application (cache HTTP)', 'Application files (HTTP cache)', 'Anwendungsdateien (HTTP-Cache)',
      'Archivos de la aplicación (caché HTTP)'
    ],
    where: t(['scripts et styles de la page (?v=…), repository_tree', 'page scripts and styles (?v=…), repository_tree']),
    /** Version de cache (?v=) de repository_nav.js chargé par la page. */
    state: () => t(['version de cache {v}', 'cache version {v}'], {
      v: /[?&]v=(\w+)/.exec([...document.scripts].map(x => x.src).find(x => /repository_nav\.js/.test(x)) || '')?.[1] || '—'
    }),
    after: ['Fichiers rechargés depuis le serveur, puis la page est rechargée ; les autres pages suivent la version de cache (?v=).',
      'Files reloaded from the server, then the page reloads; other pages follow the cache version (?v=).'
    ],
    reload: true,
    /** Recharge sans cache les fichiers de la page (refreshAppFiles) ; avertissement si certains n'ont pas pu l'être. */
    purge: async () => {
      if (location.protocol === 'file:') return t([
        'Pages ouvertes depuis le disque (file://) : fichiers lus directement, sans cache HTTP ; page rechargée.',
        'Pages opened from disk (file://): files read directly, no HTTP cache; page reloaded.'
      ]);
      const r = await refreshAppFiles(),
        msg = t(['{ok} / {n} fichiers rechargés.', '{ok} / {n} files reloaded.'], {
          ok: r.ok,
          n: r.total
        });
      return r.ok < r.total ? {
        warn: msg
      } : msg;
    }
  }];
  let cacheMsg = '';
  /** Dessine le bloc « Caches » : une ligne par cache (état, effet de la purge, bouton) et « Tout purger et recharger » ;
   *  le compte rendu survit au rechargement de la page (sessionStorage mtCacheMsg). */
  async function renderCaches() {
    const host = hosts.caches;
    let est = '';
    try {
      const e = await navigator.storage?.estimate?.();
      if (e?.usage) est = t(['Stockage du site : {u} utilisés.', 'Site storage: {u} used.'], {
        u: fmtSize(e.usage)
      });
    } catch {
      /* API absente */
    }
    const list = CACHES();
    host.innerHTML = `
      <p class="mt-small">${esc(t(['Purger ne supprime aucune donnée utilisateur (registres, brouillons, profils, OFP, sauvegardes) : seulement ce qui se reconstruit seul ou se relit.', 'Purging never removes user data (registries, drafts, profiles, OFPs, backups): only what rebuilds itself or is read again.']))} ${esc(est)}</p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><tbody>${list.map(c => `<tr data-cache="${esc(c.id)}"><td><b>${esc(t(c.label))}</b><br><code class="mt-small">${esc(c.where)}</code></td><td>${esc(c.state())}<br><span class="mt-small">${esc(t(c.after))}</span></td><td class="mt-nowrap"><button type="button" class="secondary" data-icon="trash">${esc(t(c.reload ? ['Recharger sans cache', 'Reload without cache', 'Ohne Cache neu laden', 'Recargar sin caché'] : ['Purger', 'Purge', 'Leeren', 'Purgar']))}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="row"><button type="button" class="primary" id="mtPurgeAll" data-icon="trash">${esc(t(['Tout purger et recharger', 'Purge all and reload', 'Alles leeren und neu laden', 'Purgar todo y recargar']))}</button></p>
      <div id="mtCacheMsg">${cacheMsg}</div>`;
    /** Compte rendu des purges (pastille d'avertissement si l'une en renvoie un) ; reload : page rechargée, sinon blocs redessinés. */
    const done = async (msgs, reload) => {
      cacheMsg = pill(msgs.some(m => m?.warn) ? 'warn' : 'ok', msgs.map(m => m?.warn || m).join(' '));
      if (reload) {
        sessionStorage.setItem('mtCacheMsg', cacheMsg);
        location.reload();
        return;
      }
      baseSummary = await window.SiaBase?.summary?.();
      renderCaches();
      renderVersions();
      renderSia();
    };
    host.querySelectorAll('tr[data-cache] button').forEach(btn => btn.onclick = async () => {
      const c = list.find(x => x.id === btn.closest('tr').dataset.cache);
      if (c.confirm && !await window.AppFramework.ask(t(c.confirm))) return;
      btn.disabled = true;
      await done([await c.purge()], c.reload);
    });
    host.querySelector('#mtPurgeAll').onclick = async e => {
      if (!await window.AppFramework.ask(t(['Purger tous les caches (dont la base SIA, à relire ensuite) et recharger la page ?',
          'Purge all caches (including the SIA base, to be read again afterwards) and reload the page?'
        ]))) return;
      e.target.disabled = true;
      const msgs = [];
      for (const c of list) msgs.push(await c.purge());
      await done(msgs, true);
    };
    window.AppFramework?.refresh?.();
  }
  try {
    cacheMsg = sessionStorage.getItem('mtCacheMsg') || '';
    sessionStorage.removeItem('mtCacheMsg');
  } catch {
    /* stockage indisponible */
  }

  // ===== Espace disque : place occupée par les missions (par mission, par type, total) et par le navigateur ; purge
  //       des cartes surnuméraires (absentes du YAML) et des cartes générées (régénérables depuis le YAML par le studio).
  let storageState = null; // { rows, totals, browser } après calcul
  /** Mesure la place de chaque dossier de mission (famille/identifiant, avec un mission*.yaml) par MissionRegistryCore :
   *  tailles par type, cartes surnuméraires, totaux et estimation du navigateur, gardés dans storageState. */
  async function scanStorage(request) {
    const C = window.MissionRegistryCore;
    if (!C) throw new Error('shared/mission_registry.js');
    const dir = await C.missionsDir(request);
    if (!dir) throw new Error(t(['dossier des missions non autorisé : le choisir dans « Sources et dossiers »',
      'missions folder not authorised: choose it in “Sources and folders”'
    ]));
    const rows = [];
    for await (const [fam, fh] of dir.entries()) {
      if (fh.kind !== 'directory' || /^[_.]/.test(fam)) continue;
      for await (const [id, mh] of fh.entries()) {
        if (mh.kind !== 'directory' || /^[_.]/.test(id)) continue;
        const u = await C.missionUsage({
          h: mh,
          folder: `${fam}/${id}`
        });
        if (!u.files.some(f => /^mission.*\.ya?ml$/i.test(f.name) && !f.sub)) continue; // pas un dossier de mission
        rows.push({
          id,
          folder: `${fam}/${id}`,
          ...u.sizes,
          surplus: u.surplusSize,
          surplusList: u.surplus,
          mapList: u.files.filter(f => f.kind === 'maps'),
          pdfList: u.files.filter(f => f.kind === 'pdf')
        });
      }
    }
    rows.sort((a, b) => b.total - a.total);
    const totals = rows.reduce((s, r) => {
      for (const k of ['data', 'maps', 'surplus', 'pdf', 'versions', 'recu', 'total']) s[k] += r[k];
      return s;
    }, {
      data: 0,
      maps: 0,
      surplus: 0,
      pdf: 0,
      versions: 0,
      recu: 0,
      total: 0
    });
    let browser = null;
    try {
      browser = await navigator.storage?.estimate?.();
    } catch {
      browser = null;
    }
    storageState = {
      rows,
      totals,
      browser,
      at: new Date().toISOString()
    };
  }

  /** Place des données aéronautiques du dossier SIA, par zone (AeroZones.fileSource : SIA et DIRCAM → France,
   *  openaip/<pays>_…, aixm5/LE_… → Espagne, geojson/faa_… → États-Unis, zones/<zone>/…) ; mora.csv : toutes zones. */
  async function aeroSizes(el) {
    if (!el) return;
    const st = await window.FileAccess?.status?.('__sia');
    const Z = await window.SiaBase?.zones?.();
    const head = `<h3>${esc(t(['Données aéronautiques, par zone', 'Aeronautical data, by zone', 'Luftfahrtdaten, nach Zone', 'Datos aeronáuticos, por zona']))}</h3>`;
    if (!Z || !st?.handle || st.permission !== 'granted') {
      el.innerHTML = `${head}<p class="mt-small">${esc(t(['Dossier SIA non autorisé : Paramètres › Maintenance › Données aéronautiques.', 'SIA folder not authorised: Settings › Maintenance › Aeronautical data.', 'SIA-Ordner nicht erlaubt: Einstellungen › Wartung › Luftfahrtdaten.', 'Carpeta SIA no autorizada: Ajustes › Mantenimiento › Datos aeronáuticos.']))}</p>`;
      return;
    }
    const B = window.MissionRegistryCore?.fmtBytes || fmtSize;
    let files = [];
    try {
      const root = await window.SiaBase.filesOf(st.handle);
      files = root.map(f => ({
        rel: f.name,
        size: f.size
      }));
      const extra = await window.SiaBase.extraFiles(st.handle, {});
      for (const [k, l] of Object.entries(extra))
        if (k !== 'xplane') files.push(...l.map(f => ({
          rel: f.__rel || `${k}/${f.name}`,
          size: f.size
        })));
    } catch (e) {
      el.innerHTML = `${head}<p>${pill('err', e.message)}</p>`;
      return;
    }
    const by = new Map(); // zone → { total, n, src: Map source → octets }
    let other = 0;
    for (const f of files) {
      const fs = Z.fileSource(f.rel);
      if (!fs) {
        other += f.size;
        continue;
      }
      const z = by.get(fs.zone) || by.set(fs.zone, {
        total: 0,
        n: 0,
        src: new Map()
      }).get(fs.zone);
      z.total += f.size;
      z.n++;
      z.src.set(fs.source, (z.src.get(fs.source) || 0) + f.size);
    }
    const name = id => id === '*' ? t(['toutes zones', 'all zones', 'alle Zonen', 'todas las zonas']) : t(Z.byId(id)?.name || [id
      .toUpperCase()
    ]);
    const rows = [...by].sort((a, b) => b[1].total - a[1].total).map(([id, z]) => `<tr><td><b>${esc(name(id))}</b>${id !== '*' && !Z.isOn(id) ? ` <span class="mt-small">(${esc(t(['inactive', 'inactive', 'inaktiv', 'inactiva']))})</span>` : ''}</td><td class="mt-small">${[...z.src].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${esc(t(Z.SOURCES[s]?.label || [s]).split(/ — | \(/)[0])} ${esc(B(n))}`).join(' · ')}</td><td class="num">${z.n}</td><td class="num"><b>${esc(B(z.total))}</b></td></tr>`).join('');
    const total = [...by.values()].reduce((a, z) => a + z.total, 0) + other;
    el.innerHTML = `${head}<p class="mt-small">${esc(t(['Dossier SIA ({d}) : {t} au total ; X-Plane, dossier du simulateur, non compté. Une zone inactive garde ses fichiers : les supprimer à la main dans le dossier pour libérer la place.', 'SIA folder ({d}): {t} in total; X-Plane, the simulator folder, not counted. An inactive zone keeps its files: delete them by hand in the folder to free the space.', 'SIA-Ordner ({d}): insgesamt {t}; X-Plane (Simulatorordner) nicht gezählt. Eine inaktive Zone behält ihre Dateien: zum Freigeben von Hand im Ordner löschen.', 'Carpeta SIA ({d}): {t} en total; X-Plane, carpeta del simulador, no contado. Una zona inactiva conserva sus archivos: borrarlos a mano en la carpeta para liberar espacio.'], {
      d: st.handle.name,
      t: B(total)
    }))}</p>${rows ? `<div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Zone', 'Zone', 'Zone', 'Zona']))}</th><th>${esc(t(['Sources', 'Sources', 'Quellen', 'Fuentes']))}</th><th class="num">${esc(t(['Fichiers', 'Files', 'Dateien', 'Archivos']))}</th><th class="num">${esc(t(['Taille', 'Size', 'Größe', 'Tamaño']))}</th></tr></thead><tbody>${rows}${other ? `<tr><td>${esc(t(['autres fichiers', 'other files', 'andere Dateien', 'otros archivos']))}</td><td></td><td></td><td class="num">${esc(B(other))}</td></tr>` : ''}</tbody></table></div>` : `<p class="mt-small">${esc(t(['Aucune donnée dans le dossier.', 'No data in the folder.', 'Keine Daten im Ordner.', 'Ningún dato en la carpeta.']))}</p>`}`;
  }

  /** Dessine le bloc « Espace disque » : boutons de calcul et de purge, totaux du dossier des missions et du navigateur,
   *  tableau par mission (une fois calculé, storageState) et place des données aéronautiques par zone. */
  function renderStorage() {
    const host = hosts.storage,
      C = window.MissionRegistryCore,
      B = C?.fmtBytes || (b => `${b} o`),
      st = storageState;
    const intro = `<p class="mt-small">${esc(t(['Dossier des missions (data/missions) : données (YAML, Markdown), cartes générées, PDF, versions précédentes, textes reçus. Les cartes se régénèrent depuis le YAML (studio) ; une carte surnuméraire n’est plus dans la liste des cartes de sa mission. Versions et textes reçus sont l’historique : ils ne sont pas purgés ici.', 'Missions folder (data/missions): data (YAML, Markdown), generated maps, PDFs, previous versions, received texts. Maps are regenerated from the YAML (studio); a surplus map is no longer in its mission’s map list. Versions and received texts are history: not purged here.']))}</p>`;
    const actions = `<p class="row"><button type="button" class="primary" id="mtStorageScan" data-icon="refresh">${esc(t(['Calculer la place utilisée', 'Compute used space', 'Belegten Platz berechnen', 'Calcular el espacio usado']))}</button>${st ? `<button type="button" class="secondary" id="mtPurgeSurplus" data-icon="trash"${st.totals.surplus ? '' : ' disabled'}>${esc(t(['Supprimer les cartes surnuméraires ({n}, {s})', 'Delete surplus maps ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.surplusList.length, 0), s: B(st.totals.surplus) }))}</button><button type="button" class="secondary" id="mtPurgeMaps" data-icon="trash"${st.totals.maps ? '' : ' disabled'}>${esc(t(['Purger toutes les cartes générées ({n}, {s})', 'Purge all generated maps ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.mapList.length, 0), s: B(st.totals.maps) }))}</button><button type="button" class="secondary" id="mtPurgePdf" data-icon="trash"${st.totals.pdf ? '' : ' disabled'}>${esc(t(['Purger les PDF ({n}, {s})', 'Purge PDFs ({n}, {s})', 'PDFs löschen ({n}, {s})', 'Purgar los PDF ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.pdfList.length, 0), s: B(st.totals.pdf) }))}</button>` : ''}<a class="mt-link" href="?m=caches">${esc(t(['Caches du navigateur →', 'Browser caches →']))}</a></p>`;
    if (!st) {
      host.innerHTML = intro + actions + '<div id="mtAeroSizes"></div>';
      aeroSizes(host.querySelector('#mtAeroSizes'));
      bindStorage();
      return;
    }
    const tot = st.totals;
    const br = st.browser ? `<p>${esc(t(['Navigateur (bases locales, caches, base SIA…) : {u} utilisés sur {q} disponibles.', 'Browser (local databases, caches, SIA base…): {u} used of {q} available.'], { u: B(st.browser.usage || 0), q: B(st.browser.quota || 0) }))}</p>` : '';
    host.innerHTML = `${intro}${actions}<p>${esc(t(['Dossier des missions : {t} ({n} missions) — données {d}, cartes {m} (dont surnuméraires {s}), PDF {p}, versions {v}, textes reçus {r}. Calculé le {at}.', 'Missions folder: {t} ({n} missions) — data {d}, maps {m} (surplus {s}), PDF {p}, versions {v}, received {r}. Computed {at}.'], { t: B(tot.total), n: st.rows.length, d: B(tot.data), m: B(tot.maps), s: B(tot.surplus), p: B(tot.pdf), v: B(tot.versions), r: B(tot.recu), at: fmtDate(st.at) }))}</p>${br}
      <div id="mtStorageTable" class="mt-scroll mt-short"></div><div id="mtAeroSizes"></div>`;
    aeroSizes(host.querySelector('#mtAeroSizes'));
    // tableau du framework (shared/mission_table.js) : tri par colonne, largeurs réglables, en-tête fixe
    /** Colonne numérique de taille pour la clé k (octets lisibles, « — » si nul). */
    const size = k => ({
      key: k,
      type: 'number',
      format: v => v ? B(v) : '—'
    });
    if (window.SortedTable) window.SortedTable.render(host.querySelector('#mtStorageTable'), {
      rows: st.rows,
      defaultSortKey: 'total',
      defaultDir: -1,
      emptyText: t(['Aucun dossier de mission.', 'No mission folder.']),
      columns: [{
        key: 'id',
        label: t(['Mission', 'Mission']),
        html: (v, r) => `<b>${esc(v)}</b> <span class="mt-small">${esc(r.folder.split('/')[0])}</span>`
      }, {
        ...size('data'),
        label: t(['Données', 'Data'])
      }, {
        ...size('maps'),
        label: t(['Cartes', 'Maps'])
      }, {
        ...size('surplus'),
        label: t(['dont surnuméraires', 'of which surplus'])
      }, {
        ...size('pdf'),
        label: 'PDF'
      }, {
        ...size('versions'),
        label: t(['Versions', 'Versions'])
      }, {
        ...size('recu'),
        label: t(['Textes reçus', 'Received texts'])
      }, {
        ...size('total'),
        label: t(['Total', 'Total'])
      }]
    });
    else host.querySelector('#mtStorageTable').textContent = 'shared/mission_table.js';
    bindStorage();
  }

  /** Branche les boutons du bloc « Espace disque » : calcul de la place, purges (cartes surnuméraires, cartes générées, PDF). */
  function bindStorage() {
    const host = hosts.storage,
      C = window.MissionRegistryCore,
      B = C?.fmtBytes;
    /** Exécute fn bouton désactivé ; erreur en notification. */
    const busy = async (btn, fn) => {
      btn.disabled = true;
      try {
        await fn();
      } catch (e) {
        window.AppFramework?.notify?.(e.message, 'err');
      } finally {
        btn.disabled = false;
      }
    };
    host.querySelector('#mtStorageScan').onclick = e => busy(e.currentTarget, async () => {
      await scanStorage(true);
      renderStorage();
    });
    /** Branche le bouton sel : fichiers choisis par pick dans chaque mission supprimés après confirmation (what : libellé),
     *  puis place recalculée. */
    const purge = (sel, pick, what) => {
      const b = host.querySelector(sel);
      if (b) b.onclick = e => busy(e.currentTarget, async () => {
        const list = storageState.rows.flatMap(pick),
          size = list.reduce((a, f) => a + f.size, 0);
        if (!list.length || !await window.AppFramework.ask(t([
            'Supprimer {n} fichier(s) ({s}) : {w} ? Ils se régénèrent depuis le YAML (cartes : studio ; PDF : générateur).',
            'Delete {n} file(s) ({s}): {w}? They can be regenerated from the YAML (maps: studio; PDFs: generator).'
          ], {
            n: list.length,
            s: B(size),
            w: what
          }))) return;
        const n = await C.removeFiles(list);
        window.AppFramework?.notify?.(t(['{n} fichier(s) supprimé(s), {s} libérés.', '{n} file(s) deleted, {s} freed.'], {
          n,
          s: B(size)
        }), 'ok');
        await scanStorage(false);
        renderStorage();
      });
    };
    purge('#mtPurgeSurplus', r => r.surplusList, t(['cartes surnuméraires (absentes du YAML de leur mission)',
      'surplus maps (not in their mission’s YAML)'
    ]));
    purge('#mtPurgeMaps', r => r.mapList, t(['toutes les cartes générées de toutes les missions', 'all generated maps of all missions']));
    purge('#mtPurgePdf', r => r.pdfList, t(['les PDF des missions (régénérés par le générateur)',
      'mission PDFs (regenerated by the generator)'
    ]));
    window.AppFramework?.refresh?.();
  }
  // ---- rendu, langue, événements
  // Chaque lecture et chaque bloc isolés : une erreur (dossier illisible, base d'un autre format…) s'affiche dans son
  // bloc et en notification, sans laisser les autres blocs vides.
  const guard = async (what, fn, host) => {
    try {
      return await fn();
    } catch (e) {
      const msg = `${what} : ${e?.message || e}`;
      console.error(msg, e);
      if (host) host.innerHTML = pill('err', msg);
      window.AppFramework?.notify?.(msg, 'err');
      return null;
    }
  };
  /** Rendu complet : titres, attente des modules, état git, dossier SIA et base, puis chaque bloc de la page (erreurs isolées
   *  par guard) ; ouvre ensuite le bloc demandé (?m= ou ancre), « Mises à jour » par défaut sur la page Maintenance. */
  async function renderAll() {
    titles();
    await guard('Chargement des modules', () => Promise.all([waitFor('FileAccess'), waitFor('LocalStore'), waitFor('SuiteUpdate')]));
    await Promise.all([guard('État git', () => readGitState(false)), guard('Dossier SIA', () => scanSiaFolder(false))]);
    baseSummary = await guard('Base SIA du navigateur', () => window.SiaBase.summary());
    for (const [what, fn, host] of [
        ['Mises à jour', renderUpdates, hosts.updates],
        ['Sources et dossiers', renderSources, hosts.sources],
        ['Données aéronautiques', renderSia, hosts.sia],
        ['Types d’aéronefs', renderTypes, hosts.types],
        ['Sauvegarde', renderBackup, hosts.backup],
        ['Journal', renderJournal, hosts.journal],
        ['Caches', renderCaches, hosts.caches],
        ['Espace disque', renderStorage, hosts.storage]
      ]) {
      if (!onPage(Object.keys(hosts).find(k => hosts[k] === host))) continue; // bloc d'une autre page de Paramètres
      guard(what, fn, host);
    }
    if (onPage('versions')) await guard('Versions et synchronisation', renderVersions, hosts.versions);
    if (onPage('deps')) await guard('Références et dépendances', renderDeps, hosts.deps);
    const want = new URLSearchParams(location.search).get('m') || location.hash.slice(1);
    // ancre d'un élément d'un bloc (#mt-aero-base, anciennes ancres #mt-step-N du studio) : le bloc qui le contient est
    // affiché (l'ancre y fait défiler une fois visible), pas « Mises à jour »
    const anchor = /^mt-step-/.test(want) ? 'mt-aero-base' : want,
      inBlock = !NAV[want] && anchor && (BLOCKS.find(b => document.getElementById(b.id)?.querySelector(`#${CSS.escape(anchor)}`))?.id ||
        (/^mt-aero/.test(anchor) ? 'sia' : ''));
    if (embedded) {
      if (NAV[want]) showBlock(want);
      else if (inBlock) showBlock(inBlock);
      else if (PAGE === 'maintenance' && !new URLSearchParams(location.search).get('base')) showBlock('updates');
      // aucune rubrique de data_admin.js ouverte (Installation) : premier bloc de la page
      else if (main.querySelector('.da-main')?.hidden && !main.querySelector('.mt-block:not([hidden])')) {
        const first = BLOCKS.find(b => NAV[b.id] && onPage(b.id) && !cpcoLocked(b.id));
        if (first) showBlock(first.id);
      }
    } else {
      const target = want && document.getElementById(want);
      if (target) setTimeout(() => target.scrollIntoView({
        block: 'start'
      }), 200);
    }
  }
  window.addEventListener('repository-language-change', renderAll);
  window.addEventListener('local-store-journal', renderJournal);
  window.addEventListener('file-access-change', () => renderSources());
  window.addEventListener('suite-sources-change', () => {
    renderSia();
    renderVersions();
  });
  window.addEventListener('local-store-restored', () => {
    renderVersions();
  });
  // Base relue (ici par le bloc commun, ou dans le studio, autre onglet) : zones et MORA recalculées ; après une relecture, la base à l'écran.
  async function baseChanged(scroll = false) {
    baseSummary = await window.SiaBase.summary();
    moraPlan = null;
    moraMsg = '';
    await scanSiaFolder(false);
    renderSia();
    renderVersions();
    renderDeps();
    if (scroll && baseSummary) document.getElementById('mt-aero-base')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
  // Filet : au retour sur l'onglet, relire le résumé s'il a changé (l'événement storage peut manquer, ex. file://).
  // Seule une autre base compte (cycle, date de lecture, nombres) : pas l'heure du dernier contrôle (checkedAt), que
  // chaque page réécrit — deux onglets de Paramètres se relançaient sans fin (bloc redessiné en boucle, clics perdus).
  const baseKey = v => {
    try {
      const o = JSON.parse(v || 'null');
      return o ? JSON.stringify([o.airac, o.cachedAt, o.folderName, o.mixed, o.counts]) : '';
    } catch {
      return '';
    }
  };
  let lastInfo = baseKey(localStorage.getItem('siaBaseInfo:v1'));
  /** Vrai (et nouvelle empreinte retenue) si le résumé siaBaseInfo:v1 désigne une autre base que la dernière vue. */
  const infoChanged = () => {
    const cur = baseKey(localStorage.getItem('siaBaseInfo:v1'));
    if (cur === lastInfo) return false;
    lastInfo = cur;
    return true;
  };
  window.addEventListener('focus', () => {
    if (infoChanged()) baseChanged();
  });
  window.addEventListener('storage', async e => {
    if (e.key === 'siaBaseInfo:v1' && infoChanged()) await baseChanged();
    if (e.key === 'suiteBackupLog:v1') renderJournal();
  });
  renderAll();
})();
