(() => {
  'use strict';
  // Données locales du navigateur ⇄ fichier de sauvegarde (defa_local_store.yaml).
  //
  // Tout ce que les pages gardent dans la mémoire du navigateur (localStorage : registres
  // des missions, brouillons, appareils connus, types ajoutés, aérodromes, préférences,
  // profil pilote, caches des anciens registres, fichiers FMS, état du planificateur…)
  // est copié dans un fichier YAML d'un dossier local choisi une fois (idéalement le
  // dossier synchronisé du dépôt) : sauvegarde, et resynchronisation d'un autre navigateur
  // ou d'un autre poste. Écriture automatique à chaque départ de page quand le dossier est
  // autorisé ; restauration par fusion (la donnée la plus récente l'emporte).
  // Chargé par repository_nav.js sur toutes les pages (menu ☰ › Données locales).
  const nav = window.RepositoryNav;
  if (!nav?.menu || document.getElementById('repoLocalStore')) return;
  const FILE = 'defa_local_store.yaml',
    SCHEMA = 1;
  // Suivi réseau en cours (propre à l'onglet) ; clef du webservice d'envoi des CR (secret, jamais dans un fichier).
  // Base DEFA (journal des vols) : rechargeable depuis son fichier, gardée hors sauvegarde ; identifiants du site DEFA
  // (page de premier lancement) : secrets, jamais dans un fichier.
  const SKIP = [/^networkWatch:/, /^missionSendKey:/, /^defaFlightLog:/, /^defaCredentials:/];
  const META = 'defaLocalStore:v1'; // { savedAt, hash } — non sauvegardé lui-même
  const PENDING = 'defaLocalStore:pending'; // modifications depuis la dernière sauvegarde
  // Journal des sauvegardes et restaurations (trace de chaque rechargement : origine, date de la sauvegarde relue,
  // clés ajoutées / mises à jour) ; affiché par Paramètres › Maintenance. 60 entrées au plus.
  const JOURNAL = 'suiteBackupLog:v1',
    JOURNAL_MAX = 60;
  const REMIND = 10; // bouton « Sauvegarder » au plus toutes les 10 modifications
  const here = document.currentScript?.src || new URL('shared/browser_store.js', location.href).href;

  const TEXT = {
    fr: {
      title: 'Données locales',
      save: 'Sauvegarder dans le dossier',
      restore: 'Restaurer / resynchroniser',
      folder: 'Dossier de sauvegarde…',
      download: 'Télécharger la sauvegarde',
      file: 'Restaurer depuis un fichier…',
      none: 'Aucun dossier choisi : sauvegarde par téléchargement.',
      saved: 'Sauvegardé',
      restored: 'Restauré : {added} ajoutées, {updated} mises à jour, {kept} conservées.',
      keys: 'entrées',
      never: 'jamais',
      last: 'Dernière sauvegarde',
      noFile: 'Aucune sauvegarde dans ce dossier.',
      error: 'Échec',
      denied: 'Accès au dossier non autorisé.'
    },
    en: {
      title: 'Local data',
      save: 'Save to folder',
      restore: 'Restore / resync',
      folder: 'Backup folder…',
      download: 'Download backup',
      file: 'Restore from a file…',
      none: 'No folder chosen: backup by download.',
      saved: 'Saved',
      restored: 'Restored: {added} added, {updated} updated, {kept} kept.',
      keys: 'entries',
      never: 'never',
      last: 'Last backup',
      noFile: 'No backup in this folder.',
      error: 'Failed',
      denied: 'Folder access not granted.'
    },
    de: {
      title: 'Lokale Daten',
      save: 'Im Ordner sichern',
      restore: 'Wiederherstellen / abgleichen',
      folder: 'Sicherungsordner…',
      download: 'Sicherung herunterladen',
      file: 'Aus Datei wiederherstellen…',
      none: 'Kein Ordner gewählt: Sicherung per Download.',
      saved: 'Gesichert',
      restored: 'Wiederhergestellt: {added} neu, {updated} aktualisiert, {kept} beibehalten.',
      keys: 'Einträge',
      never: 'nie',
      last: 'Letzte Sicherung',
      noFile: 'Keine Sicherung in diesem Ordner.',
      error: 'Fehlgeschlagen',
      denied: 'Ordnerzugriff nicht erlaubt.'
    },
    es: {
      title: 'Datos locales',
      save: 'Guardar en la carpeta',
      restore: 'Restaurar / resincronizar',
      folder: 'Carpeta de copia…',
      download: 'Descargar la copia',
      file: 'Restaurar desde un archivo…',
      none: 'Ninguna carpeta elegida: copia por descarga.',
      saved: 'Guardado',
      restored: 'Restaurado: {added} añadidas, {updated} actualizadas, {kept} conservadas.',
      keys: 'entradas',
      never: 'nunca',
      last: 'Última copia',
      noFile: 'Ninguna copia en esta carpeta.',
      error: 'Error',
      denied: 'Acceso a la carpeta no autorizado.'
    }
  };
  /** Texte de l'interface (TEXT) dans la langue de la page, variables {x} remplacées. */
  const t = (key, vars = {}) => String((TEXT[nav.getLanguage?.()] || TEXT.fr)[key] || TEXT.fr[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

  // ---- js-yaml (livré avec le site) chargé à la demande
  /** Bibliothèque js-yaml, chargée à la demande (livrée avec le site). */
  const yaml = () => window.jsyaml ? Promise.resolve(window.jsyaml) : new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('mission_core/vendor/js-yaml.min.js', here).href;
    script.onload = () => resolve(window.jsyaml);
    script.onerror = reject;
    document.head.append(script);
  });

  // ---- dossier autorisé (IndexedDB partagée avec les registres du Core)
  /** Base IndexedDB « missionCore » (magasin handles) : dossiers autorisés, partagée avec les registres du Core et FileAccess. */
  const idb = () => new Promise((resolve, reject) => {
    const r = indexedDB.open('missionCore', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('handles');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  /** Valeur d'une clé du magasin handles ; null si absente ou si IndexedDB est indisponible. */
  const idbGet = async key => {
    try {
      const db = await idb();
      return await new Promise(r => {
        const q = db.transaction('handles').objectStore('handles').get(key);
        q.onsuccess = () => r(q.result || null);
        q.onerror = () => r(null);
      });
    } catch {
      return null;
    }
  };
  /** Écrit une valeur dans le magasin handles (erreurs ignorées : navigateur sans IndexedDB). */
  const idbSet = async (key, value) => {
    try {
      const db = await idb();
      await new Promise(r => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(value, key);
        tx.oncomplete = r;
        tx.onerror = r;
      });
    } catch {
      /* indisponible */
    }
  };
  /** Dossier de sauvegarde autorisé (handle) ; request : redemande l'autorisation au besoin (geste utilisateur requis). null si aucun dossier ou autorisation refusée. */
  async function folder(request = false) {
    const handle = await idbGet('folder:__store');
    if (!handle) return null;
    let permission = await handle.queryPermission?.({
      mode: 'readwrite'
    });
    if (permission !== 'granted' && request) permission = await handle.requestPermission?.({
      mode: 'readwrite'
    });
    return permission === 'granted' ? handle : null;
  }
  // Choix du dossier : sélecteur ouvert sur le dossier actuel (composant FileAccess).
  async function chooseFolder() {
    if (window.FileAccess) return window.FileAccess.pickFolder('__store');
    if (!window.showDirectoryPicker) throw new Error(window.RepositoryKit?.noFolderAccess?.() || 'File System Access API (Chrome / Edge)');
    const current = await idbGet('folder:__store');
    const handle = await window.showDirectoryPicker({
      id: 'defa-local-store',
      mode: 'readwrite',
      ...(current ? {
        startIn: current
      } : {})
    });
    await idbSet('folder:__store', handle);
    return handle;
  }

  // ---- bases IndexedDB de données utilisateur, sauvegardées avec le localStorage
  // Les autres bases IndexedDB sont reconstructibles et restent hors sauvegarde : « sia-map-parser » (base SIA,
  // relue depuis le dossier SIA officiel), « missionCore / handles » (autorisations de dossiers, non exportables).
  const IDB_SAVED = [{
      db: 'FlightPerfCache',
      store: 'cache'
    }, // planificateur : OFP SimBrief, calibrations, airframes
    {
      db: 'LandingPerformanceDashboardCache',
      store: 'datasets'
    }, // Landing Performance : dernier journal chargé
  ];
  const idbLabel = spec => `${spec.db}/${spec.store}`;
  /** Vrai si la base existe déjà (ne jamais la créer à vide : la page propriétaire ne recréerait pas son magasin). */
  const idbExists = async name => {
    try {
      return (await indexedDB.databases?.())?.some(d => d.name === name) ?? false;
    } catch {
      return false;
    }
  };
  /** Contenu { clé : valeur } d'un magasin IndexedDB sauvegardé ; null si la base ou le magasin n'existe pas. */
  async function idbDump(spec) {
    if (!await idbExists(spec.db)) return null;
    return new Promise(resolve => {
      const r = indexedDB.open(spec.db);
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(spec.store)) {
          db.close();
          return resolve(null);
        }
        const out = {},
          q = db.transaction(spec.store).objectStore(spec.store).openCursor();
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
          resolve(null);
        };
      };
    });
  }
  /** Écrit dans un magasin IndexedDB les valeurs sauvegardées absentes ou plus récentes (fetchedAt / savedAt / createdAt).
   *  Crée la base au besoin, avec le même schéma que la page propriétaire (version 1, un magasin). Sortie : { added, updated, kept }. */
  async function idbRestore(spec, saved) {
    const counts = {
      added: 0,
      updated: 0,
      kept: 0
    };
    const when = v => String(v?.fetchedAt || v?.savedAt || v?.createdAt || '');
    const local = await idbDump(spec) || {};
    const writes = Object.entries(saved || {}).filter(([k, v]) => {
      if (!(k in local)) {
        counts.added++;
        return true;
      }
      if (when(v) > when(local[k])) {
        counts.updated++;
        return true;
      }
      counts.kept++;
      return false;
    });
    if (!writes.length) return counts;
    await new Promise(resolve => {
      const r = indexedDB.open(spec.db, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(spec.store)) r.result.createObjectStore(spec.store);
      };
      r.onerror = () => resolve();
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction(spec.store, 'readwrite');
        writes.forEach(([k, v]) => tx.objectStore(spec.store).put(v, k));
        tx.oncomplete = tx.onerror = () => {
          db.close();
          resolve();
        };
      };
    });
    return counts;
  }
  /** Contenu de toutes les bases IndexedDB sauvegardées : { « base/magasin » : { clé : valeur } }. */
  async function indexedSnapshot() {
    const out = {};
    for (const spec of IDB_SAVED) {
      const d = await idbDump(spec);
      if (d && Object.keys(d).length) out[idbLabel(spec)] = d;
    }
    return out;
  }

  // ---- instantané / fusion
  /** JSON.parse tolérant : le texte brut s'il n'est pas du JSON. */
  const parse = text => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  /** Instantané du localStorage à sauvegarder : toutes les clés sauf méta-données et exclusions (SKIP : secret, suivi réseau, journal DEFA). */
  function snapshot() {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key === META || key === PENDING || SKIP.some(re => re.test(key))) continue;
      entries[key] = parse(localStorage.getItem(key));
    }
    return entries;
  }
  /** Horodatage d'une valeur (updatedAt / savedAt) pour départager deux versions. */
  const stamp = v => String(v?.updatedAt || v?.savedAt || '');
  // Fusion d'une valeur sauvegardée avec la valeur locale : la plus récente l'emporte
  // (updatedAt), objets de collections (appareils, types, aérodromes, préférences)
  // fusionnés entrée par entrée ; sinon la valeur locale est conservée.
  function merge(key, local, saved) {
    if (local === undefined) return {
      value: saved,
      action: 'added'
    };
    if (JSON.stringify(local) === JSON.stringify(saved)) return {
      value: local,
      action: 'same'
    };
    if (stamp(saved) || stamp(local)) return stamp(saved) > stamp(local) ? {
      value: saved,
      action: 'updated'
    } : {
      value: local,
      action: 'kept'
    };
    if (local && saved && typeof local === 'object' && typeof saved === 'object' && !Array.isArray(local) && !Array.isArray(saved)) {
      const out = {
        ...local
      };
      let changed = false;
      Object.entries(saved).forEach(([k, v]) => {
        const cur = out[k];
        if (cur === undefined || cur === '' || cur === null) {
          out[k] = v;
          changed = true;
        } else if (v && typeof v === 'object' && stamp(v) > stamp(cur)) {
          out[k] = v;
          changed = true;
        }
      });
      return {
        value: out,
        action: changed ? 'updated' : 'kept'
      };
    }
    return {
      value: local,
      action: 'kept'
    };
  }
  /** Texte YAML de la sauvegarde : entrées du localStorage, bases IndexedDB sauvegardées (section indexed), date, origine. Sortie : { text, count, savedAt }. */
  async function toText() {
    const Y = await yaml(),
      entries = snapshot(),
      indexed = await indexedSnapshot(),
      savedAt = new Date().toISOString();
    const text = `# Données locales du navigateur — DEFA Virtual (${location.origin})\n# Restauration : menu ☰ › ${TEXT.fr.title} › ${TEXT.fr.restore}\n` +
      Y.dump({
        schema: SCHEMA,
        savedAt,
        origin: location.origin,
        entries,
        indexed
      }, {
        lineWidth: -1,
        noRefs: true
      });
    return {
      text,
      count: Object.keys(entries).length + Object.values(indexed).reduce((n, d) => n + Object.keys(d).length, 0),
      savedAt
    };
  }
  /** Empreinte rapide d'un texte (détecte une sauvegarde inchangée). */
  const hashOf = text => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return String(h);
  };
  /** Méta-données de la dernière sauvegarde ({ savedAt, hash, folder }). */
  const meta = () => {
    try {
      return JSON.parse(localStorage.getItem(META) || '{}');
    } catch {
      return {};
    }
  };

  /** Écrit defa_local_store.yaml dans le dossier autorisé (request : demande l'autorisation ; quiet : sans message, rien si inchangé), remet le compteur de modifications à zéro. Retourne vrai si écrit ou inchangé, faux sans dossier. */
  async function save({
    request = false,
    quiet = false
  } = {}) {
    const dir = await folder(request);
    const {
      text,
      count,
      savedAt
    } = await toText();
    const body = text.replace(/^savedAt: .*$/m, ''),
      hash = hashOf(body);
    if (!dir) {
      if (!quiet) status(t('none'));
      return false;
    }
    if (quiet && meta().hash === hash) return true; // rien de nouveau
    const writable = await (await dir.getFileHandle(FILE, {
      create: true
    })).createWritable();
    await writable.write(text);
    await writable.close();
    try {
      localStorage.setItem(META, JSON.stringify({
        savedAt,
        hash,
        folder: dir.name
      }));
      localStorage.setItem(PENDING, '0');
    } catch {
      /* quota */
    }
    reminder();
    if (!quiet) status(`${t('saved')} : ${dir.name}/${FILE} — ${count} ${t('keys')}`);
    return true;
  }
  /** Télécharge la sauvegarde (sans dossier autorisé). */
  async function download() {
    const {
      text
    } = await toText();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], {
      type: 'text/yaml;charset=utf-8'
    }));
    link.download = FILE;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  /** Entrées du journal des sauvegardes et restaurations (plus récentes d'abord). */
  function journal() {
    try {
      const list = JSON.parse(localStorage.getItem(JOURNAL) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  /** Ajoute une entrée au journal : { kind: 'restore' | 'backup' | 'full-backup' | 'full-restore' | …, source, … } (date ajoutée). */
  function logEvent(entry) {
    const list = [{
      at: new Date().toISOString(),
      page: location.pathname.split('/').slice(-2).join('/'),
      ...entry
    }, ...journal()].slice(0, JOURNAL_MAX);
    try {
      localStorage.setItem(JOURNAL, JSON.stringify(list));
    } catch {
      /* quota : journal réduit */
      try {
        localStorage.setItem(JOURNAL, JSON.stringify(list.slice(0, 10)));
      } catch {
        /* quota */
      }
    }
    window.dispatchEvent(new CustomEvent('local-store-journal', {
      detail: list[0]
    }));
    return list[0];
  }
  /** Restaure une sauvegarde YAML par fusion (la valeur la plus récente l'emporte, collections fusionnées entrée par entrée) : localStorage puis bases IndexedDB ; émet « local-store-restored » et trace la restauration dans le journal (source : origine du texte). Retourne { added, updated, kept, keys }. */
  async function restoreText(text, {
    source = 'fichier'
  } = {}) {
    const Y = await yaml(),
      data = Y.load(String(text).replace(/^﻿/, '')) || {};
    const counts = {
      added: 0,
      updated: 0,
      kept: 0
    };
    const keys = {
      added: [],
      updated: []
    };
    Object.entries(data.entries || {}).forEach(([key, saved]) => {
      if (key === META || key === JOURNAL || SKIP.some(re => re.test(key))) return;
      const raw = localStorage.getItem(key),
        local = raw == null ? undefined : parse(raw);
      const {
        value,
        action
      } = merge(key, local, saved);
      if (action === 'added' || action === 'updated') {
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          counts[action]++;
          keys[action].push(key);
        } catch {
          /* quota */
        }
      } else if (action === 'kept') counts.kept++;
    });
    // bases IndexedDB sauvegardées (section « indexed », absente des sauvegardes anciennes)
    for (const spec of IDB_SAVED) {
      const saved = data.indexed?.[idbLabel(spec)];
      if (!saved) continue;
      const c = await idbRestore(spec, saved);
      counts.added += c.added;
      counts.updated += c.updated;
      counts.kept += c.kept;
      if (c.added || c.updated) keys.updated.push(`${idbLabel(spec)} (${c.added + c.updated})`);
    }
    // trace du rechargement : quelle sauvegarde (date, origine), d'où, ce qui a changé
    logEvent({
      kind: 'restore',
      source,
      savedAt: data.savedAt || '',
      origin: data.origin || '',
      ...counts,
      keys: {
        added: keys.added.slice(0, 80),
        updated: keys.updated.slice(0, 80)
      }
    });
    counts.keys = keys;
    status(t('restored', counts));
    // Les pages ouvertes relisent leurs données (registres, préférences…).
    window.dispatchEvent(new CustomEvent('local-store-restored', {
      detail: counts
    }));
    return counts;
  }
  /** Restaure depuis le fichier du dossier autorisé (sinon ouvre le choix d'un fichier). */
  async function restore() {
    const dir = await folder(true);
    if (!dir) {
      picker.click();
      return;
    }
    try {
      const file = await (await dir.getFileHandle(FILE)).getFile();
      await restoreText(await file.text(), {
        source: `${dir.name}/${FILE}`
      });
    } catch {
      status(t('noFile'));
    }
  }

  // ---- menu ☰ › Données locales
  const box = document.createElement('div');
  box.id = 'repoLocalStore';
  box.innerHTML = '<div class="repo-sep"></div><div class="repo-group" data-store-text="title"></div>' + ['save', 'restore', 'folder', 'download', 'file'].map(k => `<button type="button" class="repo-action" data-store="${k}" data-store-text="${k}"></button>`).join('') +
    '<div class="repo-store-status" style="padding:4px 8px;font-size:11px;opacity:.8"></div><input type="file" accept=".yaml,.yml,text/yaml" hidden>';
  const actions = nav.menu.querySelector('.repo-page-actions');
  nav.menu.insertBefore(box, actions || null);
  // Pages de réglage (repository_tree : slot:"settings", ex. Paramétrage — bases de données) :
  // en bas du menu, juste avant « Données locales ».
  const settingsPages = (window.REPOSITORY_TREE?.pages || []).filter(p => p.slot === 'settings');
  settingsPages.reverse().forEach(p => {
    const link = document.createElement('a');
    link.className = `repo-link${p.path === nav.page?.path ? ' active' : ''}`;
    link.href = new URL(p.path, nav.root).href;
    link.dataset.label = p.label;
    link.textContent = nav.trLabel ? nav.trLabel(p.label) : p.label;
    box.insertBefore(link, box.firstChild);
  });
  if (settingsPages.length) box.insertBefore(Object.assign(document.createElement('div'), {
    className: 'repo-sep'
  }), box.firstChild);
  const picker = box.querySelector('input[type=file]');
  const statusEl = box.querySelector('.repo-store-status');

  /** Message d'état du groupe « Données locales » du menu ☰. */
  function status(text) {
    statusEl.textContent = text;
  }
  /** Message au repos : date et dossier de la dernière sauvegarde. */
  const idle = () => {
    const m = meta();
    status(`${t('last')} : ${m.savedAt ? `${new Date(m.savedAt).toLocaleString()} (${m.folder || ''})` : t('never')}`);
  };
  /** Enveloppe d'une action du menu : exécute fn, affiche l'erreur éventuelle dans le message d'état. */
  const run = fn => async () => {
    try {
      await fn();
    } catch (error) {
      status(`${t('error')} : ${error.message}`);
    }
  };
  box.querySelector('[data-store="save"]').onclick = run(async () => {
    if (!(await save({
        request: true
      })) && !(await idbGet('folder:__store'))) {
      await chooseFolder();
      await save({
        request: true
      });
    }
  });
  box.querySelector('[data-store="restore"]').onclick = run(restore);
  box.querySelector('[data-store="folder"]').onclick = run(async () => {
    await chooseFolder();
    await save({
      request: true
    });
  });
  box.querySelector('[data-store="download"]').onclick = run(download);
  box.querySelector('[data-store="file"]').onclick = () => picker.click();
  picker.onchange = run(async () => {
    const file = picker.files[0];
    if (file) await restoreText(await file.text(), {
      source: file.name
    });
    picker.value = '';
  });
  /** Retraduit les libellés du groupe « Données locales » (data-store-text). */
  const translate = () => {
    box.querySelectorAll('[data-store-text]').forEach(el => {
      el.textContent = t(el.dataset.storeText);
    });
    idle();
    // Dossier de sauvegarde actuel (nom, autorisation, dossier attendu en infobulle).
    window.FileAccess?.decorate(box.querySelector('[data-store="folder"]'), '__store');
    reminder();
  };
  window.addEventListener('repository-language-change', translate);

  // Sauvegarde automatique (dossier déjà autorisé, sans demande) : départ de la page et
  // toutes les 5 minutes, seulement si les données ont changé.
  /** Sauvegarde automatique silencieuse (dossier autorisé, contenu changé). */
  const auto = () => save({
    quiet: true
  }).catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') auto();
  });
  setInterval(auto, 5 * 60 * 1000);

  // ---- rappel de sauvegarde : modifications comptées (au plus une par clé et par minute) ;
  // à partir de 10, bouton « Sauvegarder » en couleur de contraste dans l'en-tête, avec
  // l'horodatage de la dernière sauvegarde. Sauvegarde automatique si le dossier est autorisé.
  /** Vrai si une modification de cette clé compte pour le rappel de sauvegarde (hors méta-données, exclusions, disposition, période et préférences d'affichage). */
  // Préférences d'affichage (disposition, design, icônes, couleurs, langue, onglets, séparateurs, colonnes, cadrans,
  // formats de sortie, copie automatique de l'état du planificateur) : sauvegardées, mais sans compter comme des
  // modifications à sauvegarder.
  const DISPLAY = /^(?:repositoryFramework:|missionReportingPeriod:|missionGlobalReporting:|missionReportingSource:|repositoryDesign$|repositoryIcons$|repositoryColors$|repositorySidenav$|repositoryDecor$|repositoryLanguageMode$|landingLanguageModeV\d+$|LandingPerformanceDashboardPrefsV\d+$|landingAnalysisSize$|flightPerfColumns$|flightPerfFuelGauge$|flightPerfState\.backup$|siaProfileTab$|siaProfileSplit$|siaOutput$|missionCoreLastFamily:|suiteBackupLog:|suiteUpdateCheck:|suiteGitInfo:|siaBaseInfo:)/;
  const tracked = key => key && key !== META && key !== PENDING && !SKIP.some(re => re.test(key)) && !DISPLAY.test(key);
  const lastHit = new Map(),
    pending = () => Number(localStorage.getItem(PENDING) || 0);
  const nativeSet = Storage.prototype.setItem,
    nativeRemove = Storage.prototype.removeItem;
  /** Compte une modification (au plus une par clé et par minute) et met à jour le bouton de rappel. */
  const hit = key => {
    if (!tracked(key)) return;
    const now = Date.now();
    if (now - (lastHit.get(key) || 0) < 60000) return;
    lastHit.set(key, now);
    nativeSet.call(localStorage, PENDING, String(pending() + 1));
    reminder();
  };
  Storage.prototype.setItem = function(key, value) {
    const changed = this === localStorage && this.getItem(key) !== String(value);
    nativeSet.call(this, key, value);
    if (changed) hit(key);
  };
  Storage.prototype.removeItem = function(key) {
    const had = this === localStorage && this.getItem(key) !== null;
    nativeRemove.call(this, key);
    if (had) hit(key);
  };
  const BTN = {
    fr: ['Sauvegarder dans le dossier', '{n} modifications depuis la dernière sauvegarde ({last}) — écrire les données locales dans le dossier de sauvegarde', 'dernière :'],
    en: ['Save to folder', '{n} changes since the last backup ({last}) — write local data to the backup folder', 'last:'],
    de: ['Im Ordner sichern', '{n} Änderungen seit der letzten Sicherung ({last}) — lokale Daten in den Sicherungsordner schreiben', 'letzte:'],
    es: ['Guardar en la carpeta', '{n} cambios desde la última copia ({last}) — escribir los datos locales en la carpeta de copia', 'última:']
  };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'repo-backup-button danger'; // designs à matières : leur bouton « danger » (gel rouge, cuir…)
  button.hidden = true;
  const tools = document.querySelector('.repo-header-tools');
  if (tools) tools.prepend(button);
  if (!document.getElementById('repoBackupStyle')) document.head.insertAdjacentHTML('beforeend', '<style id="repoBackupStyle">.repo-backup-button{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer}.repo-backup-button:not([hidden]){display:inline-flex}.repo-backup-button[hidden]{display:none}.repo-backup-button .repo-svg{flex:none;display:block}html:not([data-skeuo]) .repo-backup-button{height:32px;border:0!important;border-radius:7px!important;padding:4px 10px!important;background:#dc2626!important;color:#fff!important;font:600 12px/1 Inter,system-ui,Segoe UI,Arial,sans-serif}html:not([data-skeuo]) .repo-backup-button:hover{background:#b91c1c!important}@media print{.repo-backup-button{display:none!important}}</style>');

  /** Bouton rouge « Sauvegarder (n) · dernière : … » de l'en-tête : affiché à partir de REMIND modifications non sauvegardées. */
  function reminder() {
    const n = pending(),
      m = meta(),
      row = BTN[nav.getLanguage?.()] || BTN.fr;
    const last = m.savedAt ? new Date(m.savedAt).toLocaleString() : t('never');
    button.hidden = n < REMIND;
    // voyant de la barre d'état des designs à matières (designs_skeuo.css) : vert si tout est sauvegardé, ambre sinon
    document.documentElement.dataset.dirty = n > 0 ? '1' : '0';
    const label = `${row[0]} (${n}) · ${row[2]} ${m.savedAt ? new Date(m.savedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : t('never')}`,
      icon = window.RepositoryIcons?.svg('save'); // taille : celle des icônes de bouton du jeu (pas de taille en ligne)
    button.textContent = icon ? label : '💾 ' + label;
    if (icon) button.insertAdjacentHTML('afterbegin', icon);
    button.title = row[1].replace('{n}', n).replace('{last}', last);
  }
  button.onclick = run(async () => {
    if (await save({
        request: true
      })) {
      reminder();
      return;
    }
    if (window.showDirectoryPicker && !(await idbGet('folder:__store'))) {
      await chooseFolder();
      if (await save({
          request: true
        })) {
        reminder();
        return;
      }
    }
    await download();
    nativeSet.call(localStorage, PENDING, '0');
    reminder();
  });
  translate(); // libellés, dossier actuel, rappel (après la déclaration du bouton)

  window.LocalStore = {
    save,
    restore,
    restoreText,
    toText,
    journal,
    logEvent,
    download,
    chooseFolder,
    snapshot,
    indexedSnapshot,
    merge,
    FILE,
    pending,
    IDB_SAVED
  };
})();
