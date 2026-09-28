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
  const lang = () => Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
  const tr = row => row[lang()] || row[0];
  const FOLDERS = {
    __repo: {
      label: L('Dossier du dépôt', 'Repository folder', 'Repository-Ordner', 'Carpeta del repositorio'),
      expect: L('racine du dépôt : le dossier « Documentation » (celui qui contient repository_tree, shared/, CR DEFA/…)', 'repository root: the “Documentation” folder (containing repository_tree, shared/, CR DEFA/…)', 'Repository-Wurzel: Ordner „Documentation“ (mit repository_tree, shared/, CR DEFA/…)', 'raíz del repositorio: la carpeta «Documentation» (con repository_tree, shared/, CR DEFA/…)'),
      check: 'repository_tree'
    },
    __ledger: {
      label: L('Dossier du registre', 'Ledger folder', 'Registerordner', 'Carpeta del registro'),
      expect: L('dossier « CR DEFA » du dépôt (Documentation/CR DEFA : contient mission_cr.html ; missions.yaml y est écrit)', '“CR DEFA” folder of the repository (Documentation/CR DEFA: contains mission_cr.html; missions.yaml is written there)', 'Ordner „CR DEFA“ des Repositorys (enthält mission_cr.html; missions.yaml wird dort geschrieben)', 'carpeta «CR DEFA» del repositorio (contiene mission_cr.html; allí se escribe missions.yaml)'),
      check: 'mission_cr.html'
    },
    __store: {
      label: L('Dossier de sauvegarde locale', 'Local backup folder', 'Ordner der lokalen Sicherung', 'Carpeta de copia local'),
      expect: L('dossier de votre choix, idéalement synchronisé (defa_local_store.yaml y est écrit)', 'folder of your choice, ideally synchronised (defa_local_store.yaml is written there)', 'Ordner Ihrer Wahl, idealerweise synchronisiert (defa_local_store.yaml)', 'carpeta a su elección, idealmente sincronizada (defa_local_store.yaml)')
    },
    __sia: {
      label: L('Dossier SIA XML', 'SIA XML folder', 'SIA-XML-Ordner', 'Carpeta SIA XML'),
      expect: L('dossier des données SIA (XML AIRAC, « Carte france vierge.png », villes_geonames.csv, mora.csv)', 'SIA data folder (AIRAC XML, “Carte france vierge.png”, villes_geonames.csv, mora.csv)', 'SIA-Datenordner (AIRAC-XML, „Carte france vierge.png“…)', 'carpeta de datos SIA (XML AIRAC, «Carte france vierge.png»…)'),
      check: 'Carte france vierge.png'
    },
    __missions: {
      label: L('Dossier des missions', 'Missions folder', 'Missionsordner', 'Carpeta de misiones'),
      expect: L('dossier « Missions » du dépôt (séries générées : missionNN.yaml, summaryNN.md ; mission_registry.yaml y est écrit)', '“Missions” folder of the repository (generated series: missionNN.yaml, summaryNN.md; mission_registry.yaml is written there)', 'Ordner „Missions“ des Repositorys (missionNN.yaml, summaryNN.md; mission_registry.yaml)', 'carpeta «Missions» del repositorio (missionNN.yaml, summaryNN.md; mission_registry.yaml)')
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
  const idb = () => new Promise((resolve, reject) => {
    const r = indexedDB.open('missionCore', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('handles');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  /** Dossier mémorisé (handle) de la clé key (__repo, __ledger, __perf, __store…) ; null sinon. */
  async function get(key) {
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
      /* API partielle */ }
    return {
      key,
      name: handle.name,
      permission,
      handle
    };
  }
  // Choix d'un dossier : le sélecteur s'ouvre sur le dossier actuel ; contrôle du contenu attendu.
  async function pickFolder(key, {
    mode = 'readwrite'
  } = {}) {
    if (!window.showDirectoryPicker) throw new Error('File System Access API (Chrome / Edge)');
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
      let ok = false;
      try {
        await handle.getFileHandle(info.check);
        ok = true;
      } catch {
        /* absent */ }
      if (!ok && !confirm(`« ${handle.name} » ${tr(STATE.notExpected).replace('{f}', info.check)}\n${tr(STATE.expected)} : ${tr(info.expect)}`)) throw new Error('Dossier refusé');
    }
    await set(key, handle);
    return handle;
  }
  // Libellé et infobulle d'un dossier : « Dossier du registre : CR DEFA ✓ ».
  async function describe(key) {
    const s = await status(key),
      info = FOLDERS[key] || {
        label: L(key, key),
        expect: L('', '')
      };
    const mark = s.permission === 'granted' ? '✓' : s.permission === 'none' ? '' : '⚠';
    const short = s.name ? `${s.name} ${mark}`.trim() : tr(STATE.none);
    const title = `${tr(info.label)} — ${tr(STATE.expected)} : ${tr(info.expect)}\n${tr(STATE.current)} : ${s.name ? `${s.name} (${tr(STATE[s.permission] || STATE.prompt)})` : tr(STATE.none)}`;
    return {
      ...s,
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
      button.dataset.folderState = d.permission;
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
  // Dossier par défaut selon la page (application CR DEFA : registre ; Paramétrage : dépôt).
  const defaultFolder = () => /\/CR%20DEFA\/|\/CR DEFA\//.test(location.pathname) ? (/parametrage\.html$/.test(location.pathname) ? '__repo' : '__ledger') : /flight_performance_planner/.test(location.pathname) ? '__perf' : /mission_registry\.html$/.test(location.pathname) ? '__missions' : /\/SIA%20XML\/|\/SIA XML\//.test(location.pathname) ? '__sia' : '';
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
    defaultFolder
  };
})();
