(() => {
  'use strict';
  // Composant de framework « FileAccess » : dossiers autorisés et ouverture des fichiers.
  //   · dossiers mémorisés (IndexedDB missionCore › handles, clés folder:<clé>) : dépôt, registre
  //     CR DEFA, sauvegarde locale, performances (Flight Planner), SIA XML, missions générées — nom, état de l'autorisation,
  //     dossier attendu (infobulle) ;
  //   · tout <input type="file"> de la suite ouvre le sélecteur du système directement dans le
  //     dossier paramétré (data-picker-folder, ou dossier par défaut de la page), sinon dans le
  //     dernier dossier utilisé pour ce bouton ; les pages gardent leur code (événement change).
  // Chargé par repository_nav.js sur toutes les pages. Sans API (Firefox…) : comportement natif.
  const L = (fr, en, de = en, es = en) => [fr, en, de, es];
  /** Rang (0–3) de la langue de la page dans [fr, en, de, es]. */
  /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
  const tr = row => window.RepositoryKit.t(row, {
    typo: false
  }); // shared/kit.js
  const FOLDERS = {
    __repo: {
      label: L('Dossier du dépôt', 'Repository folder', 'Repository-Ordner', 'Carpeta del repositorio'),
      expect: L('racine de l’application : le dossier qui contient lancer.cmd, lancer.sh, apps/, config/, shared/ (et data/)', 'application root: the folder containing lancer.cmd, lancer.sh, apps/, config/, shared/ (and data/)', 'Repository-Wurzel: Ordner „Documentation“ (mit repository_tree, shared/, apps/cr/…)', 'raíz del repositorio: la carpeta «Documentation» (con repository_tree, shared/, apps/cr/…)'),
      check: 'config/repository_tree'
    },
    __data: {
      label: L('Dossier des données', 'Data folder', 'Datenordner', 'Carpeta de datos'),
      expect: L('dossier data/ de l’application : clone du dépôt de données (contient data_tree.js) ; registre, missions et SIA en sont déduits', 'the application data/ folder: clone of the data repository (contains data_tree.js); ledger, missions and SIA are derived from it', 'Ordner data/ der Anwendung: Klon des Daten-Repositorys (mit data_tree.js)', 'carpeta data/ de la aplicación: clon del repositorio de datos (contiene data_tree.js)'),
      check: 'data_tree.js'
    },
    __ledger: {
      label: L('Dossier du registre', 'Ledger folder', 'Registerordner', 'Carpeta del registro'),
      expect: L('data/cr (registre unique missions.yaml, registres CSV historiques, CR) — déduit du dossier des données', 'data/cr (single ledger missions.yaml, historical CSV ledgers, reports) — derived from the data folder', 'data/cr (Register missions.yaml) — aus dem Datenordner abgeleitet', 'data/cr (registro missions.yaml) — deducida de la carpeta de datos')
    },
    __store: {
      label: L('Dossier de sauvegarde locale', 'Local backup folder', 'Ordner der lokalen Sicherung', 'Carpeta de copia local'),
      expect: L('dossier de votre choix, idéalement synchronisé (defa_local_store.yaml y est écrit)', 'folder of your choice, ideally synchronised (defa_local_store.yaml is written there)', 'Ordner Ihrer Wahl, idealerweise synchronisiert (defa_local_store.yaml)', 'carpeta a su elección, idealmente sincronizada (defa_local_store.yaml)')
    },
    __sia: {
      label: L('Dossier SIA XML', 'SIA XML folder', 'SIA-XML-Ordner', 'Carpeta SIA XML'),
      expect: L('data/sia (XML AIRAC du cycle, mora.csv, axes ENR 5.7 ; fond et villes livrés avec l’application) — déduit du dossier des données', 'data/sia (AIRAC XML, mora.csv, ENR 5.7 tracks; background and cities ship with the application) — derived from the data folder', 'data/sia (AIRAC-XML, mora.csv, ENR 5.7) — aus dem Datenordner abgeleitet', 'data/sia (XML AIRAC, mora.csv, ENR 5.7) — deducida de la carpeta de datos')
    },
    __missions: {
      label: L('Dossier des missions', 'Missions folder', 'Missionsordner', 'Carpeta de misiones'),
      expect: L('data/missions (séries générées : missionNN.yaml, summaryNN.md ; mission_registry.yaml) — déduit du dossier des données', 'data/missions (generated series; mission_registry.yaml) — derived from the data folder', 'data/missions (erzeugte Serien) — aus dem Datenordner abgeleitet', 'data/missions (series generadas) — deducida de la carpeta de datos')
    },
    __xplane: {
      label: L('Dossier X-Plane (atterrissages)', 'X-Plane folder (landings)', 'X-Plane-Ordner (Landungen)', 'Carpeta X-Plane (aterrizajes)'),
      expect: L('dossier où le plugin d’atterrissage d’X-Plane écrit ses journaux CSV (Landing Performance Dashboard)', 'folder where the X-Plane landing plugin writes its CSV logs (Landing Performance Dashboard)', 'Ordner, in den das X-Plane-Landungs-Plugin seine CSV-Protokolle schreibt', 'carpeta donde el plugin de aterrizaje de X-Plane escribe sus registros CSV')
    },
    __xpnav: {
      label: L('Dossier du simulateur X-Plane (données de navigation)', 'X-Plane simulator folder (navigation data)', 'X-Plane-Simulatorordner (Navigationsdaten)', 'Carpeta del simulador X-Plane (datos de navegación)'),
      expect: L('dossier d’installation d’X-Plane (Custom Data, Resources/default data : earth_nav.dat, earth_fix.dat, earth_awy.dat, earth_mora.dat), lu seulement si la source « X-Plane » est active', 'X-Plane installation folder (Custom Data, Resources/default data: earth_nav.dat, earth_fix.dat, earth_awy.dat, earth_mora.dat), read only when the “X-Plane” source is enabled', 'X-Plane-Installationsordner (Custom Data, Resources/default data: earth_*.dat), nur gelesen, wenn die Quelle „X-Plane“ aktiv ist', 'carpeta de instalación de X-Plane (Custom Data, Resources/default data: earth_*.dat), leída solo si la fuente «X-Plane» está activa')
    },
    __odv: {
      label: L('Dossier du classeur ODV', 'ODV workbook folder', 'Ordner der ODV-Arbeitsmappe', 'Carpeta del libro ODV'),
      expect: L('dossier synchronisé (OneDrive…) où l’escadrille dépose le classeur ODV (.xlsx) : le Planning ODV ouvre le plus récent ; sans OneDrive, le classeur choisi est gardé dans le navigateur', 'synchronised folder (OneDrive…) where the squadron puts the ODV workbook (.xlsx): ODV planning opens the latest; without OneDrive, the chosen workbook is kept in the browser', 'synchronisierter Ordner (OneDrive…) mit der ODV-Arbeitsmappe (.xlsx)', 'carpeta sincronizada (OneDrive…) con el libro ODV (.xlsx)')
    },
    __perf: {
      label: L('Dossier performances', 'Performance folder', 'Leistungsordner', 'Carpeta de rendimiento'),
      expect: L('dossier des profils de performance (.lnmperf, .json ; la base flight_performance_database.fpdb.json y est écrite)', 'performance profiles folder (.lnmperf, .json; flight_performance_database.fpdb.json is written there)', 'Ordner der Leistungsprofile (.lnmperf, .json)', 'carpeta de perfiles de rendimiento (.lnmperf, .json)')
    }
  };
  const STATE = {
    none: L('non choisi', 'not chosen', 'nicht gewählt', 'no elegida'),
    granted: L('autorisé', 'authorised', 'erlaubt', 'autorizada'),
    prompt: L('à ré-autoriser au prochain accès', 'to be re-authorised at next access', 'beim nächsten Zugriff erneut erlauben', 'a reautorizar en el próximo acceso'),
    expected: L('Attendu', 'Expected', 'Erwartet', 'Esperado'),
    current: L('Actuel', 'Current', 'Aktuell', 'Actual'),
    notExpected: L('ne contient pas « {f} » : est-ce bien le dossier attendu ?', 'does not contain “{f}”: is it the expected folder?', 'enthält „{f}“ nicht: ist es der erwartete Ordner?', 'no contiene «{f}»: ¿es la carpeta esperada?'),
    opensIn: L('Ouvre directement', 'Opens directly in', 'Öffnet direkt', 'Abre directamente'),
    lastUsed: L('le dernier dossier utilisé pour ce bouton', 'the last folder used for this button', 'den zuletzt verwendeten Ordner', 'la última carpeta usada')
  };

  // ---- dossiers mémorisés (même base que ledger.js, data_admin.js, browser_store.js)
  /** Base IndexedDB « missionCore » (magasin handles) : dossiers mémorisés, partagée avec ledger.js, data_admin.js et browser_store.js. */
  // connexion partagée par la page (RepositoryKit.idb) : plus une ouverture par lecture
  const idb = () => window.RepositoryKit.idb('missionCore', 1, db => db.objectStoreNames.contains('handles') || db.createObjectStore('handles'));
  // dossiers mémorisés gardés 10 s en mémoire (une page en lit des dizaines par écran) ; oubliés quand un dossier est
  // rechoisi (ici ou par une autre page : file-access-change)
  const handleMemo = new Map();
  window.addEventListener('file-access-change', () => handleMemo.clear());
  /** Dossier mémorisé (handle) de la clé key (__repo, __ledger, __perf, __store…) ; null sinon. */
  async function get(key) {
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
    return value;
  }
  /** Mémorise le dossier handle sous la clé key. */
  async function set(key, handle) {
    const db = await idb();
    await new Promise(res => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, `folder:${key}`);
      tx.oncomplete = res;
      tx.onerror = res;
    });
    window.dispatchEvent(new CustomEvent('file-access-change', {
      detail: {
        key
      }
    }));
  }
  // ---- même installation que la suite servie ? Le lanceur (tools/launch.py) écrit à chaque démarrage un jeton dans
  // .defa_instance (racine, data/, data/missions…) : lu par le serveur et dans le dossier autorisé, deux jetons
  // différents = le dossier choisi est une autre copie de la suite (« DEFA - Copy »…). Sans lanceur : pas de contrôle.
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
  /** true : le dossier est celui de la suite servie ; false : autre copie ; null : contrôle impossible. */
  // résultat gardé 30 s par dossier (nom) : les lectures de fichiers d'une page ne relisent pas le repère à chaque fois ;
  // oublié quand un dossier est rechoisi
  const sameMemo = new Map();
  window.addEventListener('file-access-change', () => sameMemo.clear());
  async function sameAsServed(key, handle) {
    if (!(key in REL) || !handle || !/^https?:$/.test(location.protocol)) return null;
    const memoKey = `${key}|${handle.name}`,
      hit = sameMemo.get(memoKey);
    if (hit && Date.now() - hit.at < 30e3) return hit.value;
    const value = await (async () => {
      try {
        // jeton servi relu à chaque contrôle (mémo de 30 s ci-dessous) : data/ partagé par plusieurs copies (lien) reçoit
        // un nouveau jeton à chaque lancement de l'une d'elles ; gardé toute la vie de la page, l'ancien faisait conclure
        // « autre copie » et les écritures restaient dans le navigateur
        const want = await fetch(new URL(REL[key] + INSTANCE, ROOT_URL), {
          cache: 'no-store'
        }).then(r => r.ok ? r.text() : null).then(s => s?.trim() || null, () => null);
        if (!want) return null;
        const got = (await (await handle.getFileHandle(INSTANCE)).getFile().then(f => f.text())).trim();
        return got === want;
      } catch {
        return false; // pas de repère dans le dossier choisi alors que la suite servie en a un : autre dossier
      }
    })();
    sameMemo.set(memoKey, {
      at: Date.now(),
      value
    });
    return value;
  }
  /** Dossier de la suite servie (chemin donné par le lanceur), pour le message. */
  const servedRoot = () => fetch(new URL('__setup/status', ROOT_URL), {
    headers: {
      'X-DEFA-Setup': '1'
    },
    cache: 'no-store'
  }).then(r => r.json()).then(j => j.root || '', () => '');
  const OTHER = L('n’est pas le dossier de la suite lancée ({root}) : autre copie ?', 'is not the folder of the running suite ({root}): another copy?', 'ist nicht der Ordner der gestarteten Suite ({root}): eine andere Kopie?', 'no es la carpeta de la suite iniciada ({root}): ¿otra copia?');
  const otherText = async (key, name) => `${tr(FOLDERS[key]?.label || L(key, key))} « ${name} » ${tr(OTHER).replace('{root}', await servedRoot() || '?')}`;
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
  /** Mémorise les sous-dossiers de data/ (créés au besoin) ; retourne la liste des clés réglées. */
  async function deriveFromData(dataHandle) {
    const done = [];
    for (const [key, sub] of Object.entries(DERIVED)) {
      if (!ALWAYS.includes(key) && await get(key)) continue;
      try {
        await set(key, await dataHandle.getDirectoryHandle(sub, {
          create: true
        }));
        done.push(key);
      } catch {
        /* lecture seule */
      }
    }
    return done;
  }
  // Passage à la v3 (une fois) : les dossiers mémorisés qui désignaient des dossiers de l'ancienne arborescence
  // (« CR DEFA », « Missions », « SIA XML ») sont oubliés ; ils sont redéduits du dossier des données.
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
  async function deriveFromRepo(repo) {
    const done = [];
    try {
      const data = await repo.getDirectoryHandle('data');
      if (await has(data, 'data_tree.js')) {
        await set('__data', data);
        done.push('__data', ...await deriveFromData(data));
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
  // Choix d'un dossier : le sélecteur s'ouvre sur le dossier actuel ; contrôle du contenu attendu.
  async function pickFolder(key, {
    mode = 'readwrite'
  } = {}) {
    if (!window.showDirectoryPicker) throw new Error(window.RepositoryKit?.noFolderAccess?.() || 'File System Access API (Chrome / Edge)');
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
    // autre copie de la suite que celle qui est servie : confirmation
    if (await sameAsServed(key, handle) === false && !await window.AppFramework.ask(await otherText(key, handle.name), {
        danger: true
      })) throw new Error('Dossier refusé');
    await set(key, handle);
    if (key === '__data') await deriveFromData(handle);
    if (key === '__repo') handle.derived = await deriveFromRepo(handle);
    return handle;
  }
  // Libellé et infobulle d'un dossier : « Dossier du registre : CR DEFA ✓ ».
  async function describe(key) {
    const s = await status(key),
      info = FOLDERS[key] || {
        label: L(key, key),
        expect: L('', '')
      };
    const other = s.permission === 'granted' && await sameAsServed(key, s.handle) === false;
    const mark = other ? '⚠' : s.permission === 'granted' ? '✓' : s.permission === 'none' ? '' : '⚠';
    const short = s.name ? `${s.name} ${mark}`.trim() : tr(STATE.none);
    const title = `${tr(info.label)} — ${tr(STATE.expected)} : ${tr(info.expect)}\n${tr(STATE.current)} : ${s.name ? `${s.name} (${tr(STATE[s.permission] || STATE.prompt)})` : tr(STATE.none)}${other ? `\n⚠ ${await otherText(key, s.name)}` : ''}`;
    return {
      ...s,
      other,
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
        window.AppFramework?.notify?.(await otherText(key, d.name), 'warn');
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
  // Dossier par défaut selon la page (application CR DEFA : registre ; Paramètres : dépôt).
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
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || input.dataset.nativePicker || input.webkitdirectory) return;
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

  // ---- panneaux de copier-coller (analyse de texte, journal DEFA, historique VATSIM…)
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
    if (!document.getElementById('fa-paste-style')) document.head.insertAdjacentHTML('beforeend', '<style id="fa-paste-style">.fa-x{position:absolute;top:6px;right:8px;width:28px;height:28px;border:0!important;border-radius:50%!important;background:transparent!important;color:inherit!important;font-size:20px!important;line-height:1;cursor:pointer;opacity:.7;padding:0!important;min-width:0!important}.fa-x:hover{opacity:1;background:#0000001a!important}.fa-valid{background:#16a34a!important;border-color:#16a34a!important;color:#fff!important}button.fa-run:disabled{opacity:.45;cursor:not-allowed}</style>');
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
    sameAsServed
  };
})();
