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
  const FILE = 'defa_local_store.yaml', SCHEMA = 1;
  const SKIP = [/^networkWatch:/]; // suivi réseau en cours : propre à l'onglet
  const META = 'defaLocalStore:v1'; // { savedAt, hash } — non sauvegardé lui-même
  const here = document.currentScript?.src || new URL('shared/browser_store.js', location.href).href;

  const TEXT = {
    fr: { title: 'Données locales', save: 'Sauvegarder dans le dossier', restore: 'Restaurer / resynchroniser', folder: 'Dossier de sauvegarde…', download: 'Télécharger la sauvegarde', file: 'Restaurer depuis un fichier…',
      none: 'Aucun dossier choisi : sauvegarde par téléchargement.', saved: 'Sauvegardé', restored: 'Restauré : {added} ajoutées, {updated} mises à jour, {kept} conservées.', keys: 'entrées', never: 'jamais', last: 'Dernière sauvegarde', noFile: 'Aucune sauvegarde dans ce dossier.', error: 'Échec', denied: 'Accès au dossier non autorisé.' },
    en: { title: 'Local data', save: 'Save to folder', restore: 'Restore / resync', folder: 'Backup folder…', download: 'Download backup', file: 'Restore from a file…',
      none: 'No folder chosen: backup by download.', saved: 'Saved', restored: 'Restored: {added} added, {updated} updated, {kept} kept.', keys: 'entries', never: 'never', last: 'Last backup', noFile: 'No backup in this folder.', error: 'Failed', denied: 'Folder access not granted.' },
    de: { title: 'Lokale Daten', save: 'Im Ordner sichern', restore: 'Wiederherstellen / abgleichen', folder: 'Sicherungsordner…', download: 'Sicherung herunterladen', file: 'Aus Datei wiederherstellen…',
      none: 'Kein Ordner gewählt: Sicherung per Download.', saved: 'Gesichert', restored: 'Wiederhergestellt: {added} neu, {updated} aktualisiert, {kept} beibehalten.', keys: 'Einträge', never: 'nie', last: 'Letzte Sicherung', noFile: 'Keine Sicherung in diesem Ordner.', error: 'Fehlgeschlagen', denied: 'Ordnerzugriff nicht erlaubt.' },
    es: { title: 'Datos locales', save: 'Guardar en la carpeta', restore: 'Restaurar / resincronizar', folder: 'Carpeta de copia…', download: 'Descargar la copia', file: 'Restaurar desde un archivo…',
      none: 'Ninguna carpeta elegida: copia por descarga.', saved: 'Guardado', restored: 'Restaurado: {added} añadidas, {updated} actualizadas, {kept} conservadas.', keys: 'entradas', never: 'nunca', last: 'Última copia', noFile: 'Ninguna copia en esta carpeta.', error: 'Error', denied: 'Acceso a la carpeta no autorizado.' }
  };
  const t = (key, vars = {}) => String((TEXT[nav.getLanguage?.()] || TEXT.fr)[key] || TEXT.fr[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

  // ---- js-yaml (livré avec le site) chargé à la demande
  const yaml = () => window.jsyaml ? Promise.resolve(window.jsyaml) : new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = new URL('mission_core/vendor/js-yaml.min.js', here).href;
    script.onload = () => resolve(window.jsyaml); script.onerror = reject; document.head.append(script);
  });

  // ---- dossier autorisé (IndexedDB partagée avec les registres du Core)
  const idb = () => new Promise((resolve, reject) => { const r = indexedDB.open('missionCore', 1); r.onupgradeneeded = () => r.result.createObjectStore('handles'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const idbGet = async key => { try { const db = await idb(); return await new Promise(r => { const q = db.transaction('handles').objectStore('handles').get(key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch { return null; } };
  const idbSet = async (key, value) => { try { const db = await idb(); await new Promise(r => { const tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').put(value, key); tx.oncomplete = r; tx.onerror = r; }); } catch { /* indisponible */ } };
  async function folder(request = false) {
    const handle = await idbGet('folder:__store'); if (!handle) return null;
    let permission = await handle.queryPermission?.({ mode: 'readwrite' });
    if (permission !== 'granted' && request) permission = await handle.requestPermission?.({ mode: 'readwrite' });
    return permission === 'granted' ? handle : null;
  }
  async function chooseFolder() {
    if (!window.showDirectoryPicker) throw new Error('File System Access API');
    const handle = await window.showDirectoryPicker({ id: 'defa-local-store', mode: 'readwrite' });
    await idbSet('folder:__store', handle); return handle;
  }

  // ---- instantané / fusion
  const parse = text => { try { return JSON.parse(text); } catch { return text; } };
  function snapshot() {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key === META || SKIP.some(re => re.test(key))) continue;
      entries[key] = parse(localStorage.getItem(key));
    }
    return entries;
  }
  const stamp = v => String(v?.updatedAt || v?.savedAt || '');
  // Fusion d'une valeur sauvegardée avec la valeur locale : la plus récente l'emporte
  // (updatedAt), objets de collections (appareils, types, aérodromes, préférences)
  // fusionnés entrée par entrée ; sinon la valeur locale est conservée.
  function merge(key, local, saved) {
    if (local === undefined) return { value: saved, action: 'added' };
    if (JSON.stringify(local) === JSON.stringify(saved)) return { value: local, action: 'same' };
    if (stamp(saved) || stamp(local)) return stamp(saved) > stamp(local) ? { value: saved, action: 'updated' } : { value: local, action: 'kept' };
    if (local && saved && typeof local === 'object' && typeof saved === 'object' && !Array.isArray(local) && !Array.isArray(saved)) {
      const out = { ...local }; let changed = false;
      Object.entries(saved).forEach(([k, v]) => {
        const cur = out[k];
        if (cur === undefined || cur === '' || cur === null) { out[k] = v; changed = true; }
        else if (v && typeof v === 'object' && stamp(v) > stamp(cur)) { out[k] = v; changed = true; }
      });
      return { value: out, action: changed ? 'updated' : 'kept' };
    }
    return { value: local, action: 'kept' };
  }
  async function toText() {
    const Y = await yaml(), entries = snapshot(), savedAt = new Date().toISOString();
    const text = `# Données locales du navigateur — DEFA Virtual (${location.origin})\n# Restauration : menu ☰ › ${TEXT.fr.title} › ${TEXT.fr.restore}\n`
      + Y.dump({ schema: SCHEMA, savedAt, origin: location.origin, entries }, { lineWidth: -1, noRefs: true });
    return { text, count: Object.keys(entries).length, savedAt };
  }
  const hashOf = text => { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0; return String(h); };
  const meta = () => { try { return JSON.parse(localStorage.getItem(META) || '{}'); } catch { return {}; } };

  async function save({ request = false, quiet = false } = {}) {
    const dir = await folder(request);
    const { text, count, savedAt } = await toText();
    const body = text.replace(/^savedAt: .*$/m, ''), hash = hashOf(body);
    if (!dir) { if (!quiet) status(t('none')); return false; }
    if (quiet && meta().hash === hash) return true; // rien de nouveau
    const writable = await (await dir.getFileHandle(FILE, { create: true })).createWritable();
    await writable.write(text); await writable.close();
    try { localStorage.setItem(META, JSON.stringify({ savedAt, hash, folder: dir.name })); } catch { /* quota */ }
    if (!quiet) status(`${t('saved')} : ${dir.name}/${FILE} — ${count} ${t('keys')}`);
    return true;
  }
  async function download() {
    const { text } = await toText();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/yaml;charset=utf-8' }));
    link.download = FILE; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  async function restoreText(text) {
    const Y = await yaml(), data = Y.load(String(text).replace(/^﻿/, '')) || {};
    const counts = { added: 0, updated: 0, kept: 0 };
    Object.entries(data.entries || {}).forEach(([key, saved]) => {
      if (key === META || SKIP.some(re => re.test(key))) return;
      const raw = localStorage.getItem(key), local = raw == null ? undefined : parse(raw);
      const { value, action } = merge(key, local, saved);
      if (action === 'added' || action === 'updated') {
        try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); counts[action]++; } catch { /* quota */ }
      } else if (action === 'kept') counts.kept++;
    });
    status(t('restored', counts));
    // Les pages ouvertes relisent leurs données (registres, préférences…).
    window.dispatchEvent(new CustomEvent('local-store-restored', { detail: counts }));
    return counts;
  }
  async function restore() {
    const dir = await folder(true);
    if (!dir) { picker.click(); return; }
    try { const file = await (await dir.getFileHandle(FILE)).getFile(); await restoreText(await file.text()); }
    catch { status(t('noFile')); }
  }

  // ---- menu ☰ › Données locales
  const box = document.createElement('div');
  box.id = 'repoLocalStore';
  box.innerHTML = '<div class="repo-sep"></div><div class="repo-group" data-store-text="title"></div>'
    + ['save', 'restore', 'folder', 'download', 'file'].map(k => `<button type="button" class="repo-action" data-store="${k}" data-store-text="${k}"></button>`).join('')
    + '<div class="repo-store-status" style="padding:4px 8px;font-size:11px;opacity:.8"></div><input type="file" accept=".yaml,.yml,text/yaml" hidden>';
  const actions = nav.menu.querySelector('.repo-page-actions');
  nav.menu.insertBefore(box, actions || null);
  // Pages de réglage (repository_tree : slot:"settings", ex. Paramétrage — bases de données) :
  // en bas du menu, juste avant « Données locales ».
  const settingsPages = (window.REPOSITORY_TREE?.pages || []).filter(p => p.slot === 'settings');
  settingsPages.reverse().forEach(p => {
    const link = document.createElement('a');
    link.className = `repo-link${p.path === nav.page?.path ? ' active' : ''}`; link.href = new URL(p.path, nav.root).href; link.textContent = p.label;
    box.insertBefore(link, box.firstChild);
  });
  if (settingsPages.length) box.insertBefore(Object.assign(document.createElement('div'), { className: 'repo-sep' }), box.firstChild);
  const picker = box.querySelector('input[type=file]');
  const statusEl = box.querySelector('.repo-store-status');
  function status(text) { statusEl.textContent = text; }
  const idle = () => { const m = meta(); status(`${t('last')} : ${m.savedAt ? `${new Date(m.savedAt).toLocaleString()} (${m.folder || ''})` : t('never')}`); };
  const run = fn => async () => { try { await fn(); } catch (error) { status(`${t('error')} : ${error.message}`); } };
  box.querySelector('[data-store="save"]').onclick = run(async () => { if (!(await save({ request: true })) && !(await idbGet('folder:__store'))) { await chooseFolder(); await save({ request: true }); } });
  box.querySelector('[data-store="restore"]').onclick = run(restore);
  box.querySelector('[data-store="folder"]').onclick = run(async () => { await chooseFolder(); await save({ request: true }); });
  box.querySelector('[data-store="download"]').onclick = run(download);
  box.querySelector('[data-store="file"]').onclick = () => picker.click();
  picker.onchange = run(async () => { const file = picker.files[0]; if (file) await restoreText(await file.text()); picker.value = ''; });
  const translate = () => { box.querySelectorAll('[data-store-text]').forEach(el => { el.textContent = t(el.dataset.storeText); }); idle(); };
  window.addEventListener('repository-language-change', translate);
  translate();

  // Sauvegarde automatique (dossier déjà autorisé, sans demande) : départ de la page et
  // toutes les 5 minutes, seulement si les données ont changé.
  const auto = () => save({ quiet: true }).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') auto(); });
  setInterval(auto, 5 * 60 * 1000);

  window.LocalStore = { save, restore, restoreText, download, chooseFolder, snapshot, merge, FILE };
})();
