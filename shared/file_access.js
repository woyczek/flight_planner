(() => {
  'use strict';
  // Composant de framework « FileAccess » : dossiers autorisés et ouverture des fichiers.
  //   · dossiers mémorisés (IndexedDB missionCore › handles, clés folder:<clé>) : dépôt, registre
  //     CR, sauvegarde locale, performances (Flight Planner), SIA XML, missions générées — nom, état de l'autorisation,
  //     dossier attendu (infobulle) ;
  //   · tout <input type="file"> de la suite ouvre le sélecteur du système directement dans le
  //     dossier paramétré (data-picker-folder, ou dossier par défaut de la page), sinon dans le
  //     dernier dossier utilisé pour ce bouton ; les pages gardent leur code (événement change).
  //   · MODE GITHUB (appli sans lanceur : GitHubData.on(), shared/github_data.js) : les données viennent du dépôt GitHub,
  //     jamais d'un dossier. Point de décision unique ici : get() ne rend aucun dossier (status() : « non choisi »,
  //     sameAsServed() : null), set() ne mémorise rien, pickFolder() refuse avec une explication, decorate() masque le
  //     bouton de dossier. Les pages n'ont donc rien à tester : sans dossier, elles lisent et écrivent par GitHub.
  // Chargé par repository_nav.js sur toutes les pages. Sans API (Firefox…) : comportement natif.
  const L = (fr, en, de = en, es = en) => [fr, en, de, es];
  /** Mode GitHub : aucun dossier mémorisé n'est lu, mémorisé ni proposé. */
  const gh = () => !!window.GitHubData?.on?.();
  /** Rang (0–3) de la langue de la page dans [fr, en, de, es]. */
  /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
  const tr = row => window.RepositoryKit.t(row, {
    typo: false
  }); // shared/kit.js
  // label : nom du dossier ; expect : dossier à choisir (infobulle des boutons) ; use : à quoi il sert et ce qui se
  // passe sans lui (une phrase, Paramètres › Installation › Sources et dossiers)
  const FOLDERS = {
    __repo: {
      label: L('Dossier du dépôt', 'Repository folder', 'Repository-Ordner', 'Carpeta del repositorio'),
      expect: L('racine de l’application : le dossier qui contient lancer.cmd, lancer.sh, apps/, config/, shared/ (et data/)',
        'application root: the folder containing lancer.cmd, lancer.sh, apps/, config/, shared/ (and data/)',
        'Repository-Wurzel: Ordner „Documentation“ (mit repository_tree, shared/, apps/cr/…)',
        'raíz del repositorio: la carpeta «Documentation» (con repository_tree, shared/, apps/cr/…)'),
      check: 'config/repository_tree',
      use: L(
        'Sert à lire et écrire les fichiers de l’application (bases du dépôt, mises à jour) ; les autres dossiers s’en déduisent. Sans lui, rien ne s’enregistre dans le dépôt.',
        'Used to read and write the application files (repository databases, updates); the other folders are derived from it. Without it, nothing is saved to the repository.',
        'Dient zum Lesen und Schreiben der Anwendungsdateien (Repository-Datenbanken, Updates); die anderen Ordner werden daraus abgeleitet. Ohne ihn wird nichts im Repository gespeichert.',
        'Sirve para leer y escribir los archivos de la aplicación (bases del repositorio, actualizaciones); las demás carpetas se deducen de ella. Sin ella, nada se guarda en el repositorio.'
      )
    },
    __data: {
      label: L('Dossier des données', 'Data folder', 'Datenordner', 'Carpeta de datos'),
      expect: L(
        'dossier data/ de l’application : clone du dépôt de données (contient data_tree.js) ; registre, missions et SIA en sont déduits',
        'the application data/ folder: clone of the data repository (contains data_tree.js); ledger, missions and SIA are derived from it',
        'Ordner data/ der Anwendung: Klon des Daten-Repositorys (mit data_tree.js)',
        'carpeta data/ de la aplicación: clon del repositorio de datos (contiene data_tree.js)'),
      check: 'data_tree.js',
      use: L(
        'Données partagées de la compagnie (CR, missions, SIA) ; registre, missions et SIA s’en déduisent. Sans lui, CR et missions restent dans ce navigateur.',
        'Shared company data (reports, missions, SIA); ledger, missions and SIA are derived from it. Without it, reports and missions stay in this browser.',
        'Gemeinsame Daten der Gesellschaft (Berichte, Missionen, SIA); Register, Missionen und SIA werden daraus abgeleitet. Ohne ihn bleiben Berichte und Missionen in diesem Browser.',
        'Datos compartidos de la compañía (informes, misiones, SIA); registro, misiones y SIA se deducen de ella. Sin ella, informes y misiones se quedan en este navegador.'
      )
    },
    __ledger: {
      label: L('Dossier du registre', 'Ledger folder', 'Registerordner', 'Carpeta del registro'),
      expect: L('data/cr (registre unique missions.yaml, registres CSV historiques, CR) — déduit du dossier des données',
        'data/cr (single ledger missions.yaml, historical CSV ledgers, reports) — derived from the data folder',
        'data/cr (Register missions.yaml) — aus dem Datenordner abgeleitet',
        'data/cr (registro missions.yaml) — deducida de la carpeta de datos')
    },
    __store: {
      label: L('Dossier de sauvegarde locale', 'Local backup folder', 'Ordner der lokalen Sicherung', 'Carpeta de copia local'),
      expect: L('dossier de votre choix, idéalement synchronisé (defa_local_store.yaml y est écrit)',
        'folder of your choice, ideally synchronised (defa_local_store.yaml is written there)',
        'Ordner Ihrer Wahl, idealerweise synchronisiert (defa_local_store.yaml)',
        'carpeta a su elección, idealmente sincronizada (defa_local_store.yaml)'),
      use: L(
        'Sauvegarde des réglages et données de ce navigateur (defa_local_store.yaml), pour les retrouver sur un autre poste ; facultatif. Sans lui, la sauvegarde se télécharge à la main.',
        'Backup of this browser’s settings and data (defa_local_store.yaml), to find them on another computer; optional. Without it, the backup is downloaded by hand.',
        'Sicherung der Einstellungen und Daten dieses Browsers (defa_local_store.yaml), um sie auf einem anderen Rechner wiederzufinden; optional. Ohne ihn wird die Sicherung von Hand heruntergeladen.',
        'Copia de los ajustes y datos de este navegador (defa_local_store.yaml), para recuperarlos en otro equipo; opcional. Sin ella, la copia se descarga a mano.'
      )
    },
    __sia: {
      label: L('Dossier SIA XML', 'SIA XML folder', 'SIA-XML-Ordner', 'Carpeta SIA XML'),
      expect: L(
        'data/sia (XML AIRAC du cycle, mora.csv, axes ENR 5.7 ; fond et villes livrés avec l’application) — déduit du dossier des données',
        'data/sia (AIRAC XML, mora.csv, ENR 5.7 tracks; background and cities ship with the application) — derived from the data folder',
        'data/sia (AIRAC-XML, mora.csv, ENR 5.7) — aus dem Datenordner abgeleitet',
        'data/sia (XML AIRAC, mora.csv, ENR 5.7) — deducida de la carpeta de datos')
    },
    __missions: {
      label: L('Dossier des missions', 'Missions folder', 'Missionsordner', 'Carpeta de misiones'),
      expect: L(
        'data/missions (séries générées : missionNN.yaml, summaryNN.md ; mission_registry.yaml) — déduit du dossier des données',
        'data/missions (generated series; mission_registry.yaml) — derived from the data folder',
        'data/missions (erzeugte Serien) — aus dem Datenordner abgeleitet',
        'data/missions (series generadas) — deducida de la carpeta de datos')
    },
    __xplane: {
      label: L('Journaux d’atterrissage X-Plane', 'X-Plane landing logs', 'X-Plane-Landeprotokolle',
        'Registros de aterrizaje de X-Plane'),
      expect: L('dossier où le plugin d’atterrissage d’X-Plane écrit ses journaux CSV (Landing Performance Dashboard)',
        'folder where the X-Plane landing plugin writes its CSV logs (Landing Performance Dashboard)',
        'Ordner, in den das X-Plane-Landungs-Plugin seine CSV-Protokolle schreibt',
        'carpeta donde el plugin de aterrizaje de X-Plane escribe sus registros CSV'),
      use: L(
        'Le Landing Performance Dashboard y ouvre son sélecteur de fichiers ; facultatif. Sans lui, le sélecteur s’ouvre dans le dernier dossier utilisé.',
        'The Landing Performance Dashboard opens its file picker there; optional. Without it, the picker opens in the last folder used.',
        'Das Landing Performance Dashboard öffnet dort seine Dateiauswahl; optional. Ohne ihn öffnet sie sich im zuletzt verwendeten Ordner.',
        'El Landing Performance Dashboard abre allí su selector de archivos; opcional. Sin ella, el selector se abre en la última carpeta usada.'
      )
    },
    __xpnav: {
      label: L('Dossier d’installation d’X-Plane', 'X-Plane installation folder', 'X-Plane-Installationsordner',
        'Carpeta de instalación de X-Plane'),
      expect: L(
        'dossier d’installation d’X-Plane (Custom Data, Resources/default data : earth_nav.dat, earth_fix.dat, earth_awy.dat, earth_mora.dat), lu seulement si une zone active de Données aéronautiques a coché la source « X-Plane »',
        'X-Plane installation folder (Custom Data, Resources/default data: earth_nav.dat, earth_fix.dat, earth_awy.dat, earth_mora.dat), read only when an active zone of Aeronautical data has the “X-Plane” source ticked',
        'X-Plane-Installationsordner (Custom Data, Resources/default data: earth_*.dat), nur gelesen, wenn eine aktive Zone unter Luftfahrtdaten die Quelle „X-Plane“ angehakt hat',
        'carpeta de instalación de X-Plane (Custom Data, Resources/default data: earth_*.dat), leída solo si una zona activa de Datos aeronáuticos tiene marcada la fuente «X-Plane»'
      ),
      use: L(
        'Données de navigation d’X-Plane (earth_*.dat, Custom Data) pour les zones de Données aéronautiques qui cochent la source X-Plane ; facultatif. Sans lui, cette source est ignorée.',
        'X-Plane navigation data (earth_*.dat, Custom Data) for the Aeronautical data zones that tick the X-Plane source; optional. Without it, that source is ignored.',
        'X-Plane-Navigationsdaten (earth_*.dat, Custom Data) für die Zonen unter Luftfahrtdaten, die die Quelle X-Plane anhaken; optional. Ohne ihn wird diese Quelle ignoriert.',
        'Datos de navegación de X-Plane (earth_*.dat, Custom Data) para las zonas de Datos aeronáuticos que marcan la fuente X-Plane; opcional. Sin ella, esa fuente se ignora.'
      )
    },
    __odv: {
      label: L('Dossier du classeur ODV', 'ODV workbook folder', 'Ordner der ODV-Arbeitsmappe', 'Carpeta del libro ODV'),
      expect: L(
        'dossier synchronisé (OneDrive…) où l’escadrille dépose le classeur ODV (.xlsx) : le Planning ODV ouvre le plus récent ; sans OneDrive, le classeur choisi est gardé dans le navigateur',
        'synchronised folder (OneDrive…) where the squadron puts the ODV workbook (.xlsx): ODV planning opens the latest; without OneDrive, the chosen workbook is kept in the browser',
        'synchronisierter Ordner (OneDrive…) mit der ODV-Arbeitsmappe (.xlsx)',
        'carpeta sincronizada (OneDrive…) con el libro ODV (.xlsx)'),
      use: L(
        'Le Planning ODV y ouvre le classeur le plus récent ; facultatif. Sans lui, le classeur se choisit à la main et reste dans ce navigateur.',
        'ODV planning opens the latest workbook there; optional. Without it, the workbook is chosen by hand and stays in this browser.',
        'Die ODV-Planung öffnet dort die neueste Arbeitsmappe; optional. Ohne ihn wird die Arbeitsmappe von Hand gewählt und bleibt in diesem Browser.',
        'La planificación ODV abre allí el libro más reciente; opcional. Sin ella, el libro se elige a mano y se queda en este navegador.'
      )
    },
    __perf: {
      label: L('Dossier performances', 'Performance folder', 'Leistungsordner', 'Carpeta de rendimiento'),
      expect: L('dossier des profils de performance (.lnmperf, .json ; la base flight_performance_database.fpdb.json y est écrite)',
        'performance profiles folder (.lnmperf, .json; flight_performance_database.fpdb.json is written there)',
        'Ordner der Leistungsprofile (.lnmperf, .json)', 'carpeta de perfiles de rendimiento (.lnmperf, .json)'),
      use: L(
        'Profils de performance du Flight Planner, relus à l’ouverture ; facultatif. Sans lui, le planificateur demande le dossier au premier chargement des profils.',
        'Flight Planner performance profiles, re-read at opening; optional. Without it, the planner asks for the folder when profiles are first loaded.',
        'Leistungsprofile des Flight Planners, beim Öffnen neu gelesen; optional. Ohne ihn fragt der Planer beim ersten Laden der Profile nach dem Ordner.',
        'Perfiles de rendimiento del Flight Planner, releídos al abrir; opcional. Sin ella, el planificador pide la carpeta al cargar los perfiles por primera vez.'
      )
    }
  };
  const STATE = {
    none: L('non choisi', 'not chosen', 'nicht gewählt', 'no elegida'),
    granted: L('autorisé', 'authorised', 'erlaubt', 'autorizada'),
    prompt: L('à ré-autoriser au prochain accès', 'to be re-authorised at next access', 'beim nächsten Zugriff erneut erlauben',
      'a reautorizar en el próximo acceso'),
    expected: L('Attendu', 'Expected', 'Erwartet', 'Esperado'),
    current: L('Actuel', 'Current', 'Aktuell', 'Actual'),
    notExpected: L('ne contient pas « {f} » : est-ce bien le dossier attendu ?', 'does not contain “{f}”: is it the expected folder?',
      'enthält „{f}“ nicht: ist es der erwartete Ordner?', 'no contiene «{f}»: ¿es la carpeta esperada?'),
    opensIn: L('Ouvre directement', 'Opens directly in', 'Öffnet direkt', 'Abre directamente'),
    lastUsed: L('le dernier dossier utilisé pour ce bouton', 'the last folder used for this button', 'den zuletzt verwendeten Ordner',
      'la última carpeta usada')
  };

  // ---- dossiers mémorisés (même base que ledger.js, data_admin.js, browser_store.js)
  /** Base IndexedDB « missionCore » (magasin handles) : dossiers mémorisés, partagée avec ledger.js, data_admin.js et browser_store.js. */
  // connexion partagée par la page (RepositoryKit.idb) : plus une ouverture par lecture
  const idb = () => window.RepositoryKit.idb('missionCore', 1, db => db.objectStoreNames.contains('handles') || db.createObjectStore(
    'handles'));
  // dossiers mémorisés gardés 10 s en mémoire (une page en lit des dizaines par écran) ; oubliés quand un dossier est
  // rechoisi (ici ou par une autre page : file-access-change)
  const handleMemo = new Map();
  window.addEventListener('file-access-change', () => handleMemo.clear());
  /** Dossier mémorisé (handle) de la clé key (__repo, __ledger, __perf, __store…) ; null sinon. */
  async function get(key) {
    if (gh()) return null; // mode GitHub : les données viennent du dépôt, aucun dossier
    const hit = handleMemo.get(key);
    if (hit && Date.now() - hit.at < 10e3) return hit.value;
    const value = await (async () => {
      try {
        const db = await idb();
        return await new Promise(res => {
          const q = db.transaction('handles').objectStore('handles').get(`folder:${key}`);
          q.onsuccess = () => res(q.result || null);
          q.onerror = () => res(null);
        });
      } catch {
        return null;
      }
    })();
    handleMemo.set(key, {
      at: Date.now(),
      value
    });
    // dossier déduit de data/ encore absent : data/ a pu arriver après le choix du dossier de l'application (jeu
    // d'essai, dépôt ou archive installés ensuite) — déduit à la demande depuis ce dossier, déjà autorisé ; un essai
    // toutes les 10 s au plus, jamais en cascade (deriveFromRepo relit d'autres clés)
    if (!value && LAZY_KEYS.includes(key) && !lazyBusy && Date.now() - lazyAt > 10e3) {
      lazyAt = Date.now();
      lazyBusy = true;
      try {
        const repo = await get('__repo');
        if (repo && await repo.queryPermission?.({
            mode: 'readwrite'
          }) === 'granted' && (await deriveFromRepo(repo, {
            accepted: okMap().__repo === repo.name
          })).includes(key)) {
          handleMemo.delete(key);
          return await get(key);
        }
      } catch {
        /* dossier de l'application illisible : rien à déduire */
      } finally {
        lazyBusy = false;
      }
    }
    return value;
  }
  const LAZY_KEYS = ['__data', '__ledger', '__missions', '__sia'];
  let lazyAt = 0,
    lazyBusy = false;
  /** Mémorise le dossier handle sous la clé key ; accepted : dossier d'une autre copie de la suite choisi en
   *  connaissance de cause (confirmation de pickFolder) — sinon une confirmation précédente pour cette clé est oubliée. */
  async function set(key, handle, {
    accepted = false
  } = {}) {
    if (gh()) return; // mode GitHub : aucun dossier mémorisé
    const db = await idb();
    await new Promise(res => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, `folder:${key}`);
      tx.oncomplete = res;
      tx.onerror = res;
    });
    const m = okMap();
    if (accepted) m[key] = handle.name;
    else delete m[key];
    try {
      localStorage.setItem(OK, JSON.stringify(m));
    } catch {
      /* stockage indisponible : la confirmation sera redemandée */
    }
    window.dispatchEvent(new CustomEvent('file-access-change', {
      detail: {
        key
      }
    }));
  }
  // ---- même installation que la suite servie ? Le lanceur (tools/launch.py) écrit à chaque démarrage, à la racine et
  // dans data/, data/missions…, un repère .defa_instance : un jeton, puis le chemin réel du dossier. Lu par le serveur et
  // dans le dossier autorisé : deux jetons différents = le dossier choisi est celui d'une autre copie de la suite
  // (« DEFA - Copy »…). Sans lanceur : pas de contrôle.
  const ROOT_URL = new URL('../', document.currentScript?.src || location.href).href;
  const REL = {
    __repo: '',
    __data: 'data/',
    __ledger: 'data/cr/',
    __missions: 'data/missions/',
    __sia: 'data/sia/',
    __perf: 'data/planner/'
  };
  const INSTANCE = '.defa_instance';
  /** Repère lu : { token, path } (path : chemin réel, absent des repères d'un lanceur antérieur) ; null sans repère. */
  const parseMark = s => {
    const [token = '', path = ''] = String(s || '').split(/\r?\n/).map(x => x.trim());
    return token ? {
      token,
      path
    } : null;
  };
  const folderMark = handle => handle.getFileHandle(INSTANCE).then(h => h.getFile()).then(f => f.text()).then(parseMark, () => null);
  // Autre copie confirmée (clé → nom du dossier) : ce dossier est alors lu ET écrit directement, comme sans lanceur
  // (sameAsServed : null) — lecture et écriture au même endroit ; avertissement rappelé (otherState : 'accepted')
  const OK = 'fileAccessOtherOk:v1';

  function okMap() {
    try {
      return JSON.parse(localStorage.getItem(OK) || '{}') || {};
    } catch {
      return {};
    }
  }
  /** true : le dossier est celui de la suite servie ; false : autre copie ; null : contrôle impossible. */
  // résultat gardé 30 s par dossier (nom) : les lectures de fichiers d'une page ne relisent pas le repère à chaque fois ;
  // oublié quand un dossier est rechoisi
  const sameMemo = new Map();
  window.addEventListener('file-access-change', () => sameMemo.clear());
  async function compare(key, handle) {
    if (!(key in REL) || !handle || !/^https?:$/.test(location.protocol)) return null;
    // accès au dossier pas (encore) redonné après un redémarrage du navigateur : repère illisible — contrôle impossible
    // pour l'instant, et non « autre copie » (le même dossier était annoncé comme celui d'une autre copie) ; pas mémorisé
    try {
      if (await handle.queryPermission?.({
          mode: 'read'
        }) !== 'granted') return null;
    } catch {
      return null;
    }
    const memoKey = `${key}|${handle.name}`,
      hit = sameMemo.get(memoKey);
    if (hit && Date.now() - hit.at < 30e3) return hit.value;
    const value = await (async () => {
      // jeton servi relu à chaque contrôle (mémo de 30 s ci-dessus) : data/ partagé par plusieurs copies (lien) reçoit
      // un nouveau jeton à chaque lancement de l'une d'elles ; gardé toute la vie de la page, l'ancien faisait conclure
      // « autre copie » et les écritures restaient dans le navigateur
      const want = await fetch(new URL(REL[key] + INSTANCE, ROOT_URL), {
        cache: 'no-store'
      }).then(r => r.ok ? r.text() : null).then(parseMark, () => null);
      if (!want) return null;
      // pas de repère dans le dossier choisi alors que la suite servie en a un : autre dossier
      return (await folderMark(handle))?.token === want.token;
    })();
    sameMemo.set(memoKey, {
      at: Date.now(),
      value
    });
    return value;
  }
  /** 'same' (dossier de la suite servie), 'other' (autre copie), 'accepted' (autre copie confirmée), null (sans contrôle). */
  async function otherState(key, handle) {
    const v = await compare(key, handle);
    if (v === null) return null;
    if (v) return 'same';
    return okMap()[key] === handle.name ? 'accepted' : 'other';
  }
  /** true : dossier de la suite servie ; false : autre copie non confirmée ; null : dossier lu et écrit directement
   *  (contrôle impossible, ou autre copie confirmée). */
  async function sameAsServed(key, handle) {
    const s = await otherState(key, handle);
    return s === 'same' ? true : s === 'other' ? false : null;
  }
  /** Dossier de la suite servie (chemin donné par le lanceur), pour le message. */
  const servedRoot = () => fetch(new URL('__setup/status', ROOT_URL), {
    headers: {
      'X-SOG-Setup': '1'
    },
    cache: 'no-store'
  }).then(r => r.json()).then(j => j.root || '', () => '');
  const OTHER = {
    ask: L('Suite lancée depuis {root}, dossier déclaré {dir}. Cela peut conduire à des incohérences. Confirmer ?',
      'Suite launched from {root}, declared folder {dir}. This may lead to inconsistencies. Confirm?',
      'Suite gestartet aus {root}, angegebener Ordner {dir}. Das kann zu Inkonsistenzen führen. Bestätigen?',
      'Suite iniciada desde {root}, carpeta declarada {dir}. Esto puede provocar incoherencias. ¿Confirmar?'),
    accepted: L('Suite lancée depuis {root}, dossier déclaré {dir} (confirmé) : les données sont lues et écrites dans ce dossier.',
      'Suite launched from {root}, declared folder {dir} (confirmed): data is read from and written to this folder.',
      'Suite gestartet aus {root}, angegebener Ordner {dir} (bestätigt): Daten werden in diesem Ordner gelesen und geschrieben.',
      'Suite iniciada desde {root}, carpeta declarada {dir} (confirmada): los datos se leen y escriben en esta carpeta.'),
    other: L(
      'Suite lancée depuis {root}, dossier déclaré {dir} : rien n’y est écrit tant que ce choix n’est pas confirmé (rechoisir le dossier).',
      'Suite launched from {root}, declared folder {dir}: nothing is written there until this choice is confirmed (choose the folder again).',
      'Suite gestartet aus {root}, angegebener Ordner {dir}: dort wird nichts geschrieben, solange diese Wahl nicht bestätigt ist (Ordner neu wählen).',
      'Suite iniciada desde {root}, carpeta declarada {dir}: no se escribe nada allí mientras no se confirme esta elección (volver a elegir la carpeta).'
    )
  };
  /** Message « Suite lancée depuis …, dossier déclaré … » ; kind : ask (question), accepted, other. Chemin du dossier
   *  déclaré : celui de son repère (lanceur de cette version), sinon son nom seul. */
  async function otherText(key, handle, kind = 'other') {
    const dir = handle ? (await folderMark(handle))?.path || `…/${handle.name}/` : '?';
    return window.RepositoryKit.tf(OTHER[kind] || OTHER.other, {
      root: await servedRoot() || '?',
      dir
    });
  }
  const warned = new Set(); // une notification par dossier et par page

  /** État d'un dossier mémorisé : { handle, name, permission } (permission : granted / prompt / denied / none). */
  async function status(key) {
    const handle = await get(key);
    if (!handle) return {
      key,
      name: '',
      permission: 'none',
      handle: null
    };
    let permission = 'prompt';
    try {
      permission = await handle.queryPermission({
        mode: 'readwrite'
      });
    } catch {
      /* API partielle */
    }
    return {
      key,
      name: handle.name,
      permission,
      handle
    };
  }
  // ---- v3 : dossier des données (data/) et sous-dossiers déduits
  // cr, missions, sia : toujours ceux de data/ (réglés au choix de data/) ; planner, local : seulement si l'utilisateur
  // n'a pas choisi d'autre dossier pour les profils de performance ou la sauvegarde locale.
  const DERIVED = {
    __ledger: 'cr',
    __missions: 'missions',
    __sia: 'sia',
    __perf: 'planner',
    __store: 'local'
  };
  const ALWAYS = ['__ledger', '__missions', '__sia'];
  /** Mémorise les sous-dossiers de data/ (créés au besoin) ; retourne la liste des clés réglées. accepted : data/ d'une
   *  autre copie confirmé, confirmation étendue à ses sous-dossiers. */
  async function deriveFromData(dataHandle, {
    accepted = false
  } = {}) {
    const done = [];
    for (const [key, sub] of Object.entries(DERIVED)) {
      // performances, sauvegarde locale : un dossier choisi à part est gardé — sauf s'il est celui d'une autre copie de
      // la suite, non confirmé (hérité d'une ancienne installation : « …/planner/ » annoncé « autre copie » alors que
      // le dossier de l'application est le bon) ; il est alors remplacé par celui de data/
      if (!ALWAYS.includes(key)) {
        const cur = await get(key);
        if (cur && await otherState(key, cur).catch(() => null) !== 'other') continue;
      }
      try {
        await set(key, await dataHandle.getDirectoryHandle(sub, {
          create: true
        }), {
          accepted
        });
        done.push(key);
      } catch {
        /* lecture seule */
      }
    }
    return done;
  }
  // Passage à la v3 (une fois) : les dossiers mémorisés qui désignaient des dossiers de l'ancienne arborescence
  // (« CR », « Missions », « SIA XML ») sont oubliés ; ils sont redéduits du dossier des données.
  (async () => {
    try {
      if (localStorage.getItem('fileAccessLayout') === '3') return;
      const db = await idb(),
        tx = db.transaction('handles', 'readwrite');
      for (const key of ALWAYS) tx.objectStore('handles').delete(`folder:${key}`);
      await new Promise(r => {
        tx.oncomplete = tx.onerror = r;
      });
      handleMemo.clear();
      localStorage.setItem('fileAccessLayout', '3');
      const data = await get('__data');
      if (data) await deriveFromData(data);
    } catch {
      /* stockage indisponible */
    }
  })();

  /** Vrai si le dossier contient le fichier (chemin relatif, sous-dossiers compris : « config/repository_tree »). */
  async function has(handle, path) {
    try {
      const parts = String(path).split('/');
      let dir = handle;
      for (const d of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(d);
      await dir.getFileHandle(parts[parts.length - 1]);
      return true;
    } catch {
      return false;
    }
  }
  /** Dossier du dépôt choisi : tout ce qui s'en déduit est réglé d'un coup — data/ (s'il contient data_tree.js) et ses
   *  sous-dossiers (registre, missions, SIA, performances), sauvegarde locale (racine du dépôt, si elle n'est pas
   *  déjà choisie : defa_local_store.yaml y est ignoré par git). Retourne les clés réglées. */
  async function deriveFromRepo(repo, {
    accepted = false
  } = {}) {
    const done = [];
    try {
      const data = await repo.getDirectoryHandle('data');
      if (await has(data, 'data_tree.js')) {
        await set('__data', data, {
          accepted
        });
        done.push('__data', ...await deriveFromData(data, {
          accepted
        }));
      }
    } catch {
      /* pas de data/ : données par exemples ou par archive, à choisir à part */
    }
    if (!await get('__store')) {
      await set('__store', repo);
      done.push('__store');
    }
    return done;
  }
  const GH_NO_FOLDER = L('Mode GitHub : les données viennent du dépôt GitHub, aucun dossier n’est à choisir.',
    'GitHub mode: the data come from the GitHub repository, there is no folder to choose.',
    'GitHub-Modus: Die Daten kommen aus dem GitHub-Repository, es ist kein Ordner zu wählen.',
    'Modo GitHub: los datos vienen del repositorio de GitHub, no hay carpeta que elegir.');
  // Choix d'un dossier : le sélecteur s'ouvre sur le dossier actuel ; contrôle du contenu attendu.
  async function pickFolder(key, {
    mode = 'readwrite'
  } = {}) {
    if (gh()) throw new Error(tr(GH_NO_FOLDER));
    if (!window.showDirectoryPicker) throw new Error(window.RepositoryKit?.noFolderAccess?.() ||
      'File System Access API (Chrome / Edge)');
    const info = FOLDERS[key] || {},
      current = await get(key);
    const handle = await window.showDirectoryPicker({
      id: `defa${key.replace(/_/g, '')}`,
      mode,
      ...(current ? {
        startIn: current
      } : {})
    });
    if (info.check) {
      const ok = await has(handle, info.check);
      if (!ok && !await window.AppFramework.ask(`« ${handle.name} » ${tr(STATE.notExpected).replace('{f}', info.check)}\n${tr(STATE.expected)} : ${tr(info.expect)}`)) throw new Error('Dossier refusé');
    }
    // autre copie de la suite que celle qui est servie : « Suite lancée depuis …, dossier déclaré … Confirmer ? » ;
    // confirmé, le dossier (et ce qui s'en déduit) est lu et écrit directement
    const accepted = await compare(key, handle) === false;
    if (accepted && !await window.AppFramework.ask(await otherText(key, handle, 'ask'), {
        danger: true
      })) throw new Error('Dossier refusé');
    await set(key, handle, {
      accepted
    });
    if (key === '__data') await deriveFromData(handle, {
      accepted
    });
    if (key === '__repo') handle.derived = await deriveFromRepo(handle, {
      accepted
    });
    return handle;
  }
  // Libellé et infobulle d'un dossier : « Dossier du registre : CR ✓ ».
  async function describe(key) {
    const s = await status(key),
      info = FOLDERS[key] || {
        label: L(key, key),
        expect: L('', '')
      };
    // autre copie, confirmée ou non : ⚠ et message dans l'infobulle
    const state = s.permission === 'granted' ? await otherState(key, s.handle) : null,
      other = state === 'other' || state === 'accepted';
    const mark = other ? '⚠' : s.permission === 'granted' ? '✓' : s.permission === 'none' ? '' : '⚠';
    const short = s.name ? `${s.name} ${mark}`.trim() : tr(STATE.none);
    const title = `${tr(info.label)} — ${tr(STATE.expected)} : ${tr(info.expect)}\n${tr(STATE.current)} : ${s.name ? `${s.name} (${tr(STATE[s.permission] || STATE.prompt)})` : tr(STATE.none)}${other ? `\n⚠ ${await otherText(key, s.handle, state)}` : ''}`;
    return {
      ...s,
      other,
      state,
      label: tr(info.label),
      short,
      title
    };
  }
  // Bouton de choix de dossier : libellé « <dossier> : <nom> ✓ » et infobulle (dossier attendu).
  async function decorate(button, key, {
    withLabel = true
  } = {}) {
    if (!button) return;
    // mode GitHub : pas de dossier à choisir, le bouton n'a pas lieu d'être
    if (gh()) {
      if (!button.hidden) button.hidden = true;
      if (button.style.display !== 'none') button.style.display = 'none';
      return;
    }
    const refresh = async () => {
      const d = await describe(key);
      // libellé seul remplacé : l'icône éventuelle du bouton (data-icon, block_icons.js) est conservée
      const icons = [...button.querySelectorAll(':scope>.repo-icon')];
      button.textContent = withLabel ? `${d.label} : ${d.short}` : d.short;
      if (icons.length) button.prepend(...icons);
      button.title = d.title;
      button.dataset.folderState = d.other ? 'other' : d.permission;
      if (d.other && !warned.has(key)) {
        warned.add(key);
        window.AppFramework?.notify?.(await otherText(key, d.handle, d.state), 'warn');
      }
    };
    await refresh();
    if (!button.dataset.folderWatch) {
      button.dataset.folderWatch = '1';
      window.addEventListener('file-access-change', e => {
        if (!e.detail || e.detail.key === key) refresh();
      });
      window.addEventListener('repository-language-change', refresh);
    }
  }

  // ---- ouverture de fichiers : sélecteur du système dans le dossier paramétré
  // Dossier par défaut selon la page (application CR : registre ; Paramètres : dépôt).
  const defaultFolder = () => {
    const p = decodeURI(location.pathname);
    if (/\/apps\/settings\/(parametrage|profil|centre|installation|maintenance)\.html$/.test(p)) return '__data';
    if (/\/apps\/cr\//.test(p)) return '__ledger';
    if (/\/apps\/planner\//.test(p)) return '__perf';
    if (/\/apps\/landing\//.test(p)) return '__xplane';
    if (/mission_registry\.html$/.test(p)) return '__missions';
    if (/odv_planning\.html$/.test(p)) return '__odv';
    if (/\/apps\/sia\//.test(p)) return '__sia';
    return '';
  };
  const hash = s => {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
    return Math.abs(h).toString(36);
  };

  /** Types de fichiers du sélecteur natif déduits de l'attribut accept d'un champ (extensions). */
  function typesOf(accept) {
    const exts = String(accept || '').split(',').map(x => x.trim()).filter(x => /^\.[a-z0-9]+$/i.test(x));
    return exts.length ? [{
      description: exts.join(' '),
      accept: {
        'text/plain': exts
      }
    }] : undefined;
  }
  /** Ouvre le sélecteur natif sur le dossier associé au champ (data-picker-folder, sinon dossier par défaut de la page) et transmet les fichiers choisis au champ (événement change) ; repli : sélecteur du navigateur. */
  async function openFiles(input) {
    const key = input.dataset.pickerFolder ?? defaultFolder(),
      folder = key ? await get(key) : null;
    const options = {
      multiple: input.multiple,
      types: typesOf(input.accept),
      excludeAcceptAllOption: false
    };
    // Dossier paramétré prioritaire ; sinon, dernier dossier utilisé pour ce bouton (id).
    if (folder) options.startIn = folder;
    else options.id = `f${hash(location.pathname + (input.id || input.accept || ''))}`.slice(0, 32);
    const handles = await window.showOpenFilePicker(options);
    const files = await Promise.all(handles.map(h => h.getFile()));
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  }
  if (window.showOpenFilePicker) {
    document.addEventListener('click', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || input.dataset.nativePicker || input.webkitdirectory)
        return;
      event.preventDefault();
      openFiles(input).catch(error => {
        if (error?.name !== 'AbortError') {
          input.dataset.nativePicker = '1';
          input.click();
          delete input.dataset.nativePicker;
        }
      });
    }, true);
  }
  // Infobulle des boutons de fichier : où le sélecteur s'ouvrira.
  async function fileHint(key = defaultFolder()) {
    if (!key) return `${tr(STATE.opensIn)} ${tr(STATE.lastUsed)}`;
    const d = await describe(key);
    return `${tr(STATE.opensIn)} : ${d.label} — ${d.name || tr(STATE.none)}`;
  }

  // ---- panneaux de copier-coller (analyse de texte, journal, historique VATSIM…)
  //   · « × » en haut à droite et bouton « Fermer » ;
  //   · bouton de chargement désactivé tant que la zone est vide ; après un chargement réussi
  //     (panel.done()), il devient « Valider » (vert) et ferme le panneau ; il redevient
  //     « Charger » dès que la zone est de nouveau remplie.
  const PASTE = {
    close: L('Fermer', 'Close', 'Schließen', 'Cerrar'),
    load: L('Charger', 'Load', 'Laden', 'Cargar'),
    validate: L('Valider', 'Confirm', 'Bestätigen', 'Validar')
  };

  /** Panneau de copier-coller réutilisable (zone de texte + bouton de chargement + fermeture) : état « chargé » après lecture, zone vidée ; retourne { done, reset }. */
  function pastePanel({
    root,
    area,
    run,
    close,
    runLabel = null,
    closeButton = true
  }) {
    if (!root || !area || !run || root.dataset.pastePanel) return null;
    root.dataset.pastePanel = '1';
    if (!document.getElementById('fa-paste-style')) document.head.insertAdjacentHTML('beforeend',
      '<style id="fa-paste-style">.fa-x{position:absolute;top:6px;right:8px;width:28px;height:28px;border:0!important;border-radius:50%!important;background:transparent!important;color:inherit!important;font-size:20px!important;line-height:1;cursor:pointer;opacity:.7;padding:0!important;min-width:0!important}.fa-x:hover{opacity:1;background:#0000001a!important}.fa-valid{background:#16a34a!important;border-color:#16a34a!important;color:#fff!important}button.fa-run:disabled{opacity:.45;cursor:not-allowed}</style>'
    );
    // « × » positionné dans le panneau (sans toucher à un panneau déjà positionné : popup absolue).
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'fa-x';
    x.textContent = '×';
    root.prepend(x);
    let closer = null;
    if (closeButton) {
      closer = document.createElement('button');
      closer.type = 'button';
      closer.className = 'fa-close';
      run.after(closer);
    }
    run.classList.add('fa-run');
    let loaded = false;
    /** Libellé du bouton de chargement du panneau (fonction, [fr, en, de, es] ou texte). */
    const label = () => typeof runLabel === 'function' ? runLabel() : Array.isArray(runLabel) ? tr(runLabel) : runLabel || tr(PASTE.load);
    /** Met à jour les libellés et l'état visuel du panneau de copier-coller. */
    const paint = () => {
      x.title = tr(PASTE.close);
      x.setAttribute('aria-label', tr(PASTE.close));
      if (closer) closer.textContent = tr(PASTE.close);
      const empty = !area.value.trim();
      if (loaded && empty) {
        run.textContent = `✓ ${tr(PASTE.validate)}`;
        run.classList.add('fa-valid');
        run.disabled = false;
      } else {
        loaded = false;
        run.textContent = label();
        run.classList.remove('fa-valid');
        run.disabled = empty;
      }
    };
    /** Ferme le panneau de copier-coller et remet son état à « non chargé ». */
    const shut = () => {
      loaded = false;
      paint();
      close();
    };
    x.onclick = shut;
    if (closer) closer.onclick = shut;
    // « Valider » : ferme au lieu de relancer le chargement (avant le gestionnaire de la page).
    root.addEventListener('click', event => {
      if (loaded && event.target.closest('.fa-run') === run) {
        event.preventDefault();
        event.stopImmediatePropagation();
        shut();
      }
    }, true);
    ['input', 'change', 'paste'].forEach(type => area.addEventListener(type, () => setTimeout(paint)));
    window.addEventListener('repository-language-change', paint);
    paint();
    return {
      done() {
        loaded = true;
        if (area.value.trim()) area.value = '';
        paint();
      },
      reset() {
        loaded = false;
        paint();
      },
      paint
    };
  }
  window.FileAccess = {
    pastePanel,
    PASTE,
    FOLDERS,
    get,
    set,
    status,
    pickFolder,
    describe,
    decorate,
    fileHint,
    defaultFolder,
    deriveFromData,
    deriveFromRepo,
    has,
    sameAsServed,
    otherState,
    otherText
  };
})();
