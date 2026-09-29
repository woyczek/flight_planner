(() => {
  'use strict';
  // Paramètres › Maintenance (apps/settings/maintenance.html) : mises à jour de la suite (canal, mode, contrôle), versions des
  // données et dates de synchronisation, références et dépendances, mise à jour pas à pas des données SIA (AIRAC) avec
  // recalculs simples, sauvegarde totale (navigateur + fichiers connus des dossiers autorisés) et journal des
  // sauvegardes / rechargements.
  // S'appuie sur SuiteUpdate (suite_update.js), Airac (airac.js), ZipStore (zip_store.js), FileAccess, LocalStore.
  // Page autonome (#maintenance) ou rubrique « Maintenance » de Paramètres (#dataAdmin, construit par data_admin.js) :
  // dans Paramètres, chaque bloc a son entrée dans le menu latéral et s'affiche à la place de l'éditeur de base.
  const main = document.getElementById('maintenance') || document.getElementById('dataAdmin');
  if (!main) return;
  const embedded = main.id === 'dataAdmin';
  const LANGS = ['fr', 'en', 'de', 'es'];
  const li = () => Math.max(0, LANGS.indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  /** Texte d'une ligne [fr, en, de, es] (repli : anglais puis français), variables {x} remplacées. */
  const t = (row, vars = {}) => {
    const s = Array.isArray(row) ? (row[li()] || row[1] || row[0]) : String(row ?? '');
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const locale = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][li()];
  const fmtDate = (v, time = true) => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return esc(v);
    return time ? d.toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString(locale());
  };
  const fmtSize = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : n >= 1024 ? `${Math.round(n / 1024)} Ko` : `${n || 0} o`;
  const ago = v => {
    if (!v) return '';
    const d = (Date.now() - new Date(v).getTime()) / 864e5;
    return d < 1 ? t(['aujourd’hui', 'today', 'heute', 'hoy']) : t(['il y a {n} j', '{n} d ago', 'vor {n} T', 'hace {n} d'], { n: Math.floor(d) });
  };
  const pill = (level, text) => `<span class="mt-pill mt-${level}">${level === 'ok' ? '✓' : level === 'warn' ? '⚠' : level === 'err' ? '✗' : 'ℹ'} ${esc(text)}</span>`;
  const readJson = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
  const root = () => window.RepositoryNav?.root || new URL('../', location.href).href;
  /** Attend un composant chargé à la demande par repository_nav.js (FileAccess, LocalStore, SuiteUpdate). */
  const waitFor = (name, ms = 6000) => new Promise(resolve => {
    const t0 = Date.now();
    (function poll() { if (window[name]) return resolve(window[name]); if (Date.now() - t0 > ms) return resolve(null); setTimeout(poll, 60); })();
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
    try { return (await st.handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? st.handle : null; } catch { return null; }
  }
  /** Fichier (File) d'un chemin relatif sous un dossier ; null si absent. */
  async function fileAt(dir, path) {
    try {
      const bits = path.split('/').filter(Boolean);
      let h = dir;
      for (let i = 0; i < bits.length - 1; i++) h = await h.getDirectoryHandle(bits[i]);
      return await (await h.getFileHandle(bits[bits.length - 1])).getFile();
    } catch { return null; }
  }
  /** Écrit un fichier (chemin relatif, dossiers créés au besoin). */
  async function writeAt(dir, path, data) {
    const bits = path.split('/').filter(Boolean);
    let h = dir;
    for (let i = 0; i < bits.length - 1; i++) h = await h.getDirectoryHandle(bits[i], { create: true });
    const w = await (await h.getFileHandle(bits[bits.length - 1], { create: true })).createWritable();
    await w.write(data);
    await w.close();
  }
  /** Fichiers d'un dossier : [{ path, file }] ; recursive (profondeur ≤ 4), filtre sur le chemin relatif. */
  async function listFiles(dir, { recursive = false, filter = () => true, depth = 0, base = '' } = {}) {
    const out = [];
    if (!dir) return out;
    for await (const [name, h] of dir.entries()) {
      const path = base + name;
      if (h.kind === 'directory') {
        if (recursive && depth < 4 && !/^(\.git|node_modules|_archives|_avant_restauration|sauvegardes|local|__pycache__)$/i.test(name)) out.push(...await listFiles(h, { recursive, filter, depth: depth + 1, base: path + '/' }));
      } else if (filter(path, name)) {
        try { out.push({ path, file: await h.getFile() }); } catch { /* verrouillé */ }
      }
    }
    return out;
  }
  /** Bouton de choix d'un dossier de la suite (libellé « Dossier … : nom ✓ », infobulle) ; after : rappel. */
  function folderButton(key, after, { withLabel = true } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'secondary mt-folder';
    b.dataset.icon = 'folder';
    b.onclick = async () => {
      try { await window.FileAccess.pickFolder(key); after?.(); } catch (e) { if (e?.name !== 'AbortError' && e?.message !== 'Dossier refusé') alert(e.message); }
    };
    waitFor('FileAccess').then(FA => FA?.decorate(b, key, { withLabel }));
    return b;
  }

  // ---- blocs
  const BLOCKS = [
    { id: 'updates', icon: 'refresh', title: ['Mises à jour de la suite', 'Suite updates', 'Aktualisierungen der Suite', 'Actualizaciones de la suite'], sub: ['Canal (stable / early bird), contrôle manuel, automatique ou désactivé, état du dépôt git', 'Channel (stable / early bird), manual, automatic or disabled check, git repository state', 'Kanal (stabil / Early Bird), manuelle, automatische oder deaktivierte Prüfung, Git-Status', 'Canal (estable / early bird), comprobación manual, automática o desactivada, estado git'] },
    { id: 'sources', icon: 'folder', title: ['Sources et dossiers', 'Sources and folders', 'Quellen und Ordner', 'Fuentes y carpetas'], sub: ['Dossiers locaux (dépôt, registres, missions, SIA, X-Plane…) et adresses des sources externes (DEFA, SIA, dépôts) : un seul endroit pour les régler', 'Local folders (repository, ledgers, missions, SIA, X-Plane…) and external source addresses (DEFA, SIA, repositories): one place to set them', 'Lokale Ordner und Adressen externer Quellen (DEFA, SIA, Repositorys) an einem Ort', 'Carpetas locales y direcciones de fuentes externas (DEFA, SIA, repositorios) en un solo lugar'] },
    { id: 'versions', icon: 'layers', title: ['Versions et synchronisations', 'Versions and synchronisation', 'Versionen und Synchronisation', 'Versiones y sincronización'], sub: ['Version de chaque élément (code, git, AIRAC, bases, plans de vol…) et date de sa dernière mise à jour', 'Version of each asset (code, git, AIRAC, databases, flight plans…) and date of its last update', 'Version jedes Elements (Code, Git, AIRAC, Datenbanken, Flugpläne…) und Datum der letzten Aktualisierung', 'Versión de cada elemento (código, git, AIRAC, bases, planes de vuelo…) y fecha de su última actualización'] },
    { id: 'deps', icon: 'link', title: ['Références et dépendances', 'References and dependencies', 'Referenzen und Abhängigkeiten', 'Referencias y dependencias'], sub: ['Chaque référence : tracée, processus de mise à jour, données qui en dépendent, cohérence vérifiée', 'Each reference: traced, update process, dependent data, consistency checked', 'Jede Referenz: nachverfolgt, Aktualisierungsprozess, abhängige Daten, geprüfte Konsistenz', 'Cada referencia: trazada, proceso de actualización, datos dependientes, coherencia comprobada'] },
    { id: 'sia', icon: 'map', title: ['Mise à jour des données SIA (AIRAC) — pas à pas', 'SIA data update (AIRAC) — step by step', 'Aktualisierung der SIA-Daten (AIRAC) — Schritt für Schritt', 'Actualización de los datos SIA (AIRAC) — paso a paso'], sub: ['Nouveau cycle : téléchargement, dossier, anciens cycles, relecture par le studio, différences, recalculs (MORA, espaces, appareils, flotte, performances)', 'New cycle: download, folder, old cycles, studio re-read, differences, recalculations (MORA, airspace, aircraft, fleet, performance)', 'Neuer Zyklus: Download, Ordner, alte Zyklen, Neueinlesen, Unterschiede, Neuberechnungen', 'Nuevo ciclo: descarga, carpeta, ciclos antiguos, relectura, diferencias, recálculos'] },
    { id: 'caches', icon: 'trash', title: ['Caches', 'Caches', 'Caches', 'Cachés'], sub: ['Données reconstructibles gardées par le navigateur (aérodromes, base mondiale via jsDelivr, base SIA, contrôle des mises à jour, fichiers de l’application) : état et purge', 'Rebuildable data kept by the browser (aerodromes, world base via jsDelivr, SIA base, update check, application files): state and purge', 'Wiederherstellbare Browserdaten (Flugplätze, Weltbasis über jsDelivr, SIA-Basis, Update-Prüfung, Anwendungsdateien): Stand und Leeren', 'Datos reconstruibles guardados por el navegador (aeródromos, base mundial vía jsDelivr, base SIA, control de actualizaciones, archivos de la aplicación): estado y purga'] },
    { id: 'storage', icon: 'database', title: ['Espace disque', 'Disk space', 'Speicherplatz', 'Espacio en disco'], sub: ['Place occupée par les missions (par mission, par type, total) et par le navigateur ; purge des cartes surnuméraires et des cartes générées (régénérables)', 'Space used by missions (per mission, per type, total) and by the browser; purge of surplus and generated (regenerable) maps', 'Von Missionen (je Mission, je Typ, gesamt) und vom Browser belegter Platz; Löschen überzähliger und erzeugter Karten', 'Espacio usado por las misiones (por misión, por tipo, total) y por el navegador; purga de mapas sobrantes y generados'] },
    { id: 'backup', icon: 'save', title: ['Sauvegarde totale', 'Full backup', 'Vollständige Sicherung', 'Copia de seguridad total'], sub: ['Bases du navigateur et toute la configuration locale, fichiers connus des dossiers (registres, missions, profils, CSV d’atterrissage…), en une archive ZIP tracée', 'Browser databases and all local configuration, known files of the folders (ledgers, missions, profiles, landing CSV…), in one traced ZIP archive', 'Browser-Datenbanken und lokale Konfiguration, bekannte Dateien der Ordner, in einem ZIP-Archiv', 'Bases del navegador y toda la configuración local, archivos conocidos de las carpetas, en un ZIP trazado'] },
    { id: 'journal', icon: 'clock', title: ['Journal des sauvegardes et rechargements', 'Backup and reload journal', 'Protokoll der Sicherungen und Wiederherstellungen', 'Registro de copias y recargas'], sub: ['Chaque sauvegarde, restauration ou rechargement : date, origine, ce qui a changé', 'Every backup, restore or reload: date, origin, what changed', 'Jede Sicherung oder Wiederherstellung: Datum, Herkunft, Änderungen', 'Cada copia o recarga: fecha, origen, qué cambió'] }
  ];
  const hosts = {};
  for (const b of BLOCKS) {
    const s = document.createElement('section');
    s.id = b.id;
    s.dataset.blockId = b.id;
    s.dataset.icon = b.icon;
    s.dataset.noI18n = '';
    s.className = 'mt-block';
    s.innerHTML = `<h2></h2><p class="repo-block-subtitle mt-sub"></p><div class="mt-body"></div>`;
    if (embedded) s.hidden = true;
    main.append(s);
    hosts[b.id] = s.querySelector('.mt-body');
  }
  function titles() {
    for (const b of BLOCKS) {
      const s = document.getElementById(b.id);
      s.querySelector('h2').textContent = t(b.title);
      s.querySelector('.mt-sub').textContent = t(b.sub);
    }
    navLabels();
  }
  // ---- rubrique « Maintenance » du menu latéral de Paramètres : une entrée par bloc
  const NAV = { updates: ['Mises à jour', 'Updates', 'Updates', 'Actualizaciones'], sources: ['Sources et dossiers', 'Sources and folders', 'Quellen und Ordner', 'Fuentes y carpetas'], versions: ['Versions et synchros', 'Versions and sync', 'Versionen', 'Versiones'], deps: ['Références et dépendances', 'References and dependencies', 'Referenzen', 'Referencias'], sia: ['Mise à jour SIA (AIRAC)', 'SIA update (AIRAC)', 'SIA-Update (AIRAC)', 'Actualización SIA (AIRAC)'], caches: ['Caches', 'Caches', 'Caches', 'Cachés'], storage: ['Espace disque', 'Disk space', 'Speicherplatz', 'Espacio en disco'], backup: ['Sauvegarde totale', 'Full backup', 'Vollsicherung', 'Copia total'], journal: ['Journal', 'Journal', 'Protokoll', 'Registro'] };
  let navHost = null;
  function navLabels() {
    if (!navHost) return;
    navHost.querySelector('h3').textContent = t(['Maintenance', 'Maintenance', 'Wartung', 'Mantenimiento']);
    navHost.querySelectorAll('[data-mt]').forEach(b => { b.textContent = t(NAV[b.dataset.mt]); });
  }
  /** Affiche le bloc id (Paramètres) : l'éditeur de base est masqué, l'entrée du menu est active. */
  function showBlock(id) {
    if (!embedded || !document.getElementById(id)) return;
    main.querySelector('.da-main')?.setAttribute('hidden', '');
    BLOCKS.forEach(b => { document.getElementById(b.id).hidden = b.id !== id; });
    main.querySelectorAll('.da-nav [data-set]').forEach(x => x.classList.remove('active'));
    main.querySelectorAll('.da-nav [data-mt]').forEach(x => x.classList.toggle('active', x.dataset.mt === id));
    history.replaceState(null, '', `?m=${id}`);
    window.scrollTo({ top: 0 });
    window.AppFramework?.refresh?.();
  }
  if (embedded) {
    const nav = main.querySelector('.da-nav');
    if (nav) {
      navHost = document.createElement('div');
      navHost.className = 'da-mt-nav';
      navHost.innerHTML = `<h3></h3>${BLOCKS.map(b => `<button type="button" data-mt="${b.id}"></button>`).join('')}`;
      nav.append(navHost);
      navHost.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => showBlock(b.dataset.mt));
    }
    // une base affichée (data_admin.js) : les blocs de maintenance se masquent
    window.addEventListener('data-admin-show', () => {
      BLOCKS.forEach(b => { const el = document.getElementById(b.id); if (el) el.hidden = true; });
      navHost?.querySelectorAll('[data-mt]').forEach(x => x.classList.remove('active'));
    });
    // liens internes (#sources…) vers un bloc
    document.addEventListener('click', e => { const a = e.target.closest?.('a[href^="#"]'); if (a && NAV[a.getAttribute('href').slice(1)]) { e.preventDefault(); showBlock(a.getAttribute('href').slice(1)); } });
  }

  // ===== 1. Mises à jour
  const PERIODS = [
    [0, ['à chaque ouverture (au plus toutes les heures)', 'at every page load (at most hourly)', 'bei jedem Öffnen (höchstens stündlich)', 'en cada apertura (como máximo cada hora)']],
    [1, ['tous les jours', 'daily', 'täglich', 'a diario']],
    [7, ['toutes les semaines', 'weekly', 'wöchentlich', 'semanal']],
    [28, ['à chaque cycle AIRAC (28 jours)', 'every AIRAC cycle (28 days)', 'bei jedem AIRAC-Zyklus (28 Tage)', 'cada ciclo AIRAC (28 días)']],
    [30, ['tous les mois', 'monthly', 'monatlich', 'mensual']]
  ];
  let gitState = null;
  async function renderUpdates() {
    const host = hosts.updates, SU = await waitFor('SuiteUpdate');
    if (!SU) { host.innerHTML = pill('err', 'suite_update.js non chargé'); return; }
    const s = SU.settings(), r = SU.last();
    const cmdChannel = `python tools/update_suite.py channel ${s.channel}`, cmdUpdate = 'python tools/update_suite.py update', cmdDoctor = 'python tools/update_suite.py doctor';
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
    host.querySelectorAll('input[name=mtChannel]').forEach(x => x.onchange = () => { SU.save({ channel: x.value }); renderUpdates(); });
    host.querySelectorAll('input[name=mtMode]').forEach(x => x.onchange = () => { SU.save({ mode: x.value }); renderUpdates(); });
    host.querySelector('#mtPeriod').onchange = e => SU.save({ periodDays: +e.target.value, mode: 'auto' }) && renderUpdates();
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
  function checkResult(r, s) {
    if (!r) return `<p class="mt-small">${esc(t(['Aucun contrôle effectué.', 'No check yet.', 'Noch keine Prüfung.', 'Ninguna comprobación.']))}</p>`;
    if (!r.ok) return `<p>${pill('err', t(['Contrôle impossible ({d})', 'Check failed ({d})'], { d: fmtDate(r.at) }))}</p><p class="mt-small">${esc(r.error)} — ${esc(t(['hors ligne, ou API bloquée par le navigateur (page ouverte en file://) : utiliser « python tools/update_suite.py ».', 'offline, or API blocked by the browser (page opened as file://): use “python tools/update_suite.py”.']))}</p>`;
    const rm = r.remote || {}, other = r.channel !== s.channel ? ` ${pill('warn', t(['contrôle fait sur l’ancien canal {c}', 'checked on the former channel {c}'], { c: r.channel }))}` : '';
    return `<p>${r.available ? pill('warn', t(['Mise à jour disponible sur {c}', 'Update available on {c}', 'Update verfügbar in {c}', 'Actualización disponible en {c}'], { c: r.channel })) : pill('ok', t(['À jour sur {c}', 'Up to date on {c}', 'Aktuell in {c}', 'Al día en {c}'], { c: r.channel }))}${other}</p>
      <table class="mt-table"><tbody>
        <tr><th>${esc(t(['Version locale', 'Local version', 'Lokale Version', 'Versión local']))}</th><td>${esc(r.local?.version || '—')} (${esc(r.local?.date || '')})${r.local?.head ? ` · <code>${esc(r.local.head.slice(0, 9))}</code>` : ''}</td></tr>
        <tr><th>${esc(t(['Dernière version du canal', 'Latest on channel', 'Neueste im Kanal', 'Última del canal']))}</th><td>${esc(rm.version || '—')} · <a href="${esc(rm.url)}" target="_blank" rel="noopener"><code>${esc(rm.short || '')}</code></a> ${esc(fmtDate(rm.date))}<br><span class="mt-small">${esc(rm.title || '')}</span></td></tr>
        <tr><th>${esc(t(['Contrôlé le', 'Checked on', 'Geprüft am', 'Comprobado el']))}</th><td>${esc(fmtDate(r.at))}</td></tr>
      </tbody></table>`;
  }
  async function readGitState(request = false) {
    const SU = await waitFor('SuiteUpdate'), dir = await folder('__repo', request);
    const box = document.getElementById('mtGit');
    if (!dir) { if (box) box.innerHTML = `<p class="mt-small">${esc(t(['Choisir le dossier du dépôt (« Documentation », qui contient repository_tree) pour lire la branche, le commit, le dernier fetch et le journal des mises à jour.', 'Choose the repository folder (“Documentation”, containing repository_tree) to read branch, commit, last fetch and update log.']))}</p>`; return null; }
    gitState = await SU.readGit(dir);
    if (box) box.innerHTML = gitHtml(gitState);
    renderVersions();
    renderDeps();
    return gitState;
  }
  function gitHtml(g) {
    if (!g) return `<p class="mt-small">${esc(t(['État git non lu.', 'Git state not read.', 'Git-Status nicht gelesen.', 'Estado git no leído.']))}</p>`;
    if (!g.ok) return pill('warn', t(['Pas de dossier .git : installation par archive ZIP (mise à jour : nouvelle archive, ou git clone).', 'No .git folder: ZIP install (update: new archive, or git clone).']));
    const s = window.SuiteUpdate.settings(), rows = [];
    const row = (k, v) => rows.push(`<tr><th>${esc(k)}</th><td>${v}</td></tr>`);
    row(t(['Branche', 'Branch', 'Zweig', 'Rama']), `${g.branch ? `<b>${esc(g.branch)}</b>` : pill('warn', 'HEAD détachée')} ${g.branch && g.branch !== s.channel ? pill('warn', t(['≠ canal choisi ({c})', '≠ chosen channel ({c})'], { c: s.channel })) : ''}`);
    row('HEAD', `<code>${esc((g.head || '').slice(0, 12))}</code> ${g.headDate ? esc(fmtDate(g.headDate)) : ''} ${g.lastAction ? `<span class="mt-small">— ${esc(g.lastAction.message)}</span>` : ''}`);
    row('origin', `${esc(g.originUrl || '—')} ${g.originOk ? pill('ok', 'framagit') : pill('err', t(['remote inattendu', 'unexpected remote']))}`);
    row(t(['Suivi', 'Tracking', 'Verfolgung', 'Seguimiento']), g.upstream ? `origin/${esc(g.upstream)} · ${g.behind === 0 ? pill('ok', t(['aligné sur origin (dernier fetch)', 'in line with origin (last fetch)'])) : pill('warn', t(['différent de origin/{b} (en avance ou en retard)', 'differs from origin/{b} (ahead or behind)'], { b: g.branch }))}` : pill('warn', t(['aucune branche suivie', 'no upstream'])));
    row('master / develop', ['master', 'develop'].map(b => `${b} <code>${esc((g.channelHeads?.[b] || '—').slice(0, 9))}</code> / origin <code>${esc((g.remoteHeads?.[b] || '—').slice(0, 9))}</code>`).join(' · ') + (g.channelHeads?.master && g.channelHeads.master === g.channelHeads.develop ? ` ${pill('info', t(['master = develop', 'master = develop']))}` : ''));
    row(t(['Dernier fetch', 'Last fetch', 'Letzter Fetch', 'Último fetch']), `${esc(fmtDate(g.lastFetch))} ${g.lastFetch ? `<span class="mt-small">(${esc(ago(g.lastFetch))})</span>` : ''}`);
    row(t(['Canal (git config)', 'Channel (git config)', 'Kanal (git config)', 'Canal (git config)']), esc(g.channelConfig || t(['non défini (master)', 'not set (master)'])));
    if (g.orphanPacks?.length || g.strayPackFiles?.length) row(t(['Objets git', 'Git objects', 'Git-Objekte', 'Objetos git']), pill('warn', t(['{n} pack(s) sans index, {m} fichier(s) parasite(s) dans .git/objects/pack — « python tools/update_suite.py doctor »', '{n} pack(s) without index, {m} stray file(s) in .git/objects/pack — “python tools/update_suite.py doctor”'], { n: g.orphanPacks.length, m: g.strayPackFiles.length })));
    const log = (g.updateLog || []).slice(0, 6).map(e => `<li>${esc(fmtDate(e.at))} — ${esc(e.action)}${e.channel ? ' ' + esc(e.channel) : ''}${e.fromVersion ? ` ${esc(e.fromVersion)} → ${esc(e.toVersion)}` : ''}${e.ok === false ? ' ' + pill('err', e.message || 'échec') : ''}</li>`).join('');
    return `<table class="mt-table"><tbody>${rows.join('')}</tbody></table>${log ? `<h3>${esc(t(['Journal de update_suite.py', 'update_suite.py log']))}</h3><ul class="mt-list">${log}</ul>` : ''}`;
  }
  function copyButtons(scope) {
    scope.querySelectorAll('pre[data-copy]').forEach(pre => {
      if (pre.previousElementSibling?.classList?.contains('mt-copy')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary mt-copy';
      b.textContent = t(['Copier', 'Copy', 'Kopieren', 'Copiar']);
      b.onclick = async () => { try { await navigator.clipboard.writeText(pre.textContent); b.textContent = '✓'; setTimeout(() => b.textContent = t(['Copier', 'Copy', 'Kopieren', 'Copiar']), 1500); } catch { /* refus */ } };
      pre.before(b);
    });
  }

  // ===== 1 bis. Sources et dossiers
  const FOLDER_ORDER = ['__data', '__repo', '__ledger', '__missions', '__sia', '__xplane', '__perf', '__store'];
  async function renderSources() {
    const host = hosts.sources, FA = await waitFor('FileAccess'), nav = window.RepositoryNav;
    if (!FA || !nav) { host.innerHTML = pill('err', 'file_access.js'); return; }
    const keys = [...FOLDER_ORDER.filter(k => FA.FOLDERS[k]), ...Object.keys(FA.FOLDERS).filter(k => !FOLDER_ORDER.includes(k))];
    const rows = [];
    for (const key of keys) {
      const st = await FA.status(key), info = FA.FOLDERS[key] || {};
      let marker = '';
      if (st.handle && st.permission === 'granted' && info.check) { try { await st.handle.getFileHandle(info.check); marker = pill('ok', info.check); } catch { marker = pill('warn', t(['« {f} » absent : dossier attendu ?', '“{f}” missing: expected folder?'], { f: info.check })); } }
      const state = !st.handle ? pill('warn', t(['non choisi', 'not chosen', 'nicht gewählt', 'no elegida'])) : st.permission === 'granted' ? pill('ok', t(['autorisé', 'authorised', 'erlaubt', 'autorizada'])) : pill('info', t(['à ré-autoriser', 'to re-authorise', 'erneut erlauben', 'a reautorizar']));
      rows.push(`<tr data-key="${esc(key)}"><td><b>${esc(t(info.label || [key]))}</b><br><span class="mt-small">${esc(t(info.expect || ['']))}</span></td><td class="mt-fcell"></td><td>${state} ${marker}</td></tr>`);
    }
    const src = window.REPOSITORY_TREE?.sources || {};
    let local = {}; try { local = JSON.parse(localStorage.getItem('suiteSources:v1') || '{}') || {}; } catch { /* illisible */ }
    const eff = window.Airac?.cycle?.();
    const openUrl = (k, u) => k === 'siaCycle' && eff ? eff.url : u;
    host.innerHTML = `
      <h3>${esc(t(['Dossiers locaux', 'Local folders', 'Lokale Ordner', 'Carpetas locales']))}</h3>
      <p class="mt-small">${esc(t(['Chaque dossier est choisi une fois (le navigateur mémorise l’autorisation, parfois à reconfirmer après un redémarrage). Les sélecteurs de fichiers des pages s’ouvrent directement dans le dossier correspondant.', 'Each folder is chosen once (the browser remembers the permission, sometimes to be confirmed again after a restart). File pickers open directly in the matching folder.']))}</p>
      <div class="mt-scroll"><table class="mt-table mt-wide mt-folders"><tbody>${rows.join('')}</tbody></table></div>
      <h3>${esc(t(['Sources externes', 'External sources', 'Externe Quellen', 'Fuentes externas']))}</h3>
      <p class="mt-small">${esc(t(['Adresses par défaut livrées avec l’application (repository_tree) ; une valeur saisie ici ne vaut que pour ce navigateur (sauvegardée avec les données locales).', 'Default addresses ship with the application (repository_tree); a value entered here applies to this browser only (saved with local data).']))}</p>
      <table class="mt-table mt-wide mt-sources"><tbody>${Object.entries(src).map(([k, v]) => `<tr data-src="${esc(k)}"><td><b>${esc(t(v.label || [k]))}</b></td><td><input type="url" class="mt-url" value="${esc(local[k] || '')}" placeholder="${esc(v.url)}" spellcheck="false"></td><td class="mt-nowrap">${local[k] ? pill('info', t(['modifiée', 'changed', 'geändert', 'cambiada'])) : ''} <button type="button" class="secondary" data-reset ${local[k] ? '' : 'hidden'}>↺</button> <a class="mt-link" href="${esc(openUrl(k, nav.source(k)))}" target="_blank" rel="noopener">${esc(t(['Ouvrir', 'Open', 'Öffnen', 'Abrir']))} ↗</a></td></tr>`).join('')}</tbody></table>`;
    host.querySelectorAll('tr[data-key]').forEach(tr => tr.querySelector('.mt-fcell').append(folderButton(tr.dataset.key, () => { renderSources(); renderVersions(); renderDeps(); renderBackup(); }, { withLabel: false })));
    host.querySelectorAll('tr[data-src]').forEach(tr => {
      const k = tr.dataset.src, input = tr.querySelector('input');
      input.onchange = () => {
        const v = input.value.trim();
        if (v && !/^https?:\/\/[^\s]+$/i.test(v)) { input.setCustomValidity(t(['adresse http(s) attendue', 'http(s) address expected'])); input.reportValidity(); return; }
        input.setCustomValidity('');
        nav.setSource(k, v);
        renderSources();
      };
      tr.querySelector('[data-reset]').onclick = () => { nav.setSource(k, ''); renderSources(); };
    });
    window.AppFramework?.refresh?.();
  }

  // ---- types d'aéronefs : base OACI fusionnée (aircraft_catalog.js) et alias (AIRCRAFT_DB.__aliases : H145 → EC45…)
  const typeSet = () => new Set(Object.keys(window.AIRCRAFT_DB || {}).filter(k => !k.startsWith('__')));
  const alias = code => { const k = String(code || '').toUpperCase().trim(); return window.AIRCRAFT_DB?.__aliases?.[k] || k; };
  const knownType = (types, code) => types.has(alias(code)) || types.has(String(code || '').toUpperCase().trim());
  const hasPerf = code => !!(window.AIRCRAFT_PERF || {})[alias(code)] || !!(window.AIRCRAFT_PERF || {})[code];

  // ===== 2. Versions et synchronisations
  /** Base IndexedDB (lecture seule, jamais créée) : { clé : valeur } d'un magasin. */
  async function idbAll(name, store) {
    try { if (indexedDB.databases && !(await indexedDB.databases()).some(d => d.name === name)) return null; } catch { /* API absente */ }
    return new Promise(resolve => {
      const r = indexedDB.open(name);
      r.onupgradeneeded = () => { r.transaction.abort(); resolve(null); };
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(store)) { db.close(); return resolve(null); }
        const out = {}, q = db.transaction(store).objectStore(store).openCursor();
        q.onsuccess = () => { const c = q.result; if (c) { out[String(c.key)] = c.value; c.continue(); } else { db.close(); resolve(out); } };
        q.onerror = () => { db.close(); resolve(out); };
      };
    });
  }
  /** Texte d'un fichier du dépôt : dossier autorisé, sinon lecture servie (http). */
  const textCache = new Map();
  async function repoText(path) {
    const hit = textCache.get(path);
    if (hit && Date.now() - hit.at < 15000) return hit.value;
    const value = await repoTextUncached(path);
    textCache.set(path, { at: Date.now(), value });
    return value;
  }
  async function repoTextUncached(path) {
    const dir = await folder('__repo');
    if (dir) { const f = await fileAt(dir, path); if (f) return { text: await f.text(), lastModified: f.lastModified, size: f.size }; }
    try { const r = await fetch(new URL(path.split('/').map(encodeURIComponent).join('/'), root()).href, { cache: 'no-store' }); if (r.ok) return { text: await r.text(), lastModified: Date.parse(r.headers.get('last-modified') || '') || 0 }; } catch { /* file:// */ }
    return null;
  }
  let siaFolderState = null, baseSummary = null;
  async function renderVersions() {
    const host = hosts.versions;
    const rows = [];
    const add = (group, name, version, sync, state, source) => rows.push({ group, name, version, sync, state, source });
    const G = { code: t(['Code', 'Code', 'Code', 'Código']), sia: 'SIA / AIRAC', db: t(['Bases de référence', 'Reference databases', 'Referenzdaten', 'Bases de referencia']), user: t(['Données utilisateur', 'User data', 'Benutzerdaten', 'Datos de usuario']) };
    // code
    const rel = window.REPOSITORY_TREE?.release || {};
    add(G.code, t(['Suite (repository_tree)', 'Suite (repository_tree)']), `<b>${esc(rel.version)}</b> <code>${esc(rel.id || '')}</code>`, esc(rel.date), '', `<a href="${esc(rel.changelog)}" target="_blank" rel="noopener">CHANGELOG</a>`);
    const vj = await repoText('VERSION.json');
    if (vj) { let v = ''; try { v = JSON.parse(vj.text).release; } catch { /* illisible */ } add(G.code, 'VERSION.json', esc(v || '?'), fmtDate(vj.lastModified, false), v === rel.version ? pill('ok', '=') : pill('warn', t(['périmé (≠ repository_tree), ignoré par git', 'stale (≠ repository_tree), git-ignored'])), ''); }
    const cacheV = /[?&]v=(\w+)/.exec([...document.scripts].map(s => s.src).find(s => /repository_nav\.js/.test(s)) || '')?.[1] || '';
    add(G.code, t(['Version de cache des scripts (?v=)', 'Script cache version (?v=)']), `<code>${esc(cacheV)}</code>`, cacheV ? esc(`${cacheV.slice(6, 8)}/${cacheV.slice(4, 6)}/${cacheV.slice(0, 4)}`) : '', '', 'tools/bump_versions.py');
    const g = gitState || window.SuiteUpdate?.gitInfo?.();
    add(G.code, 'git', g?.branch ? `${esc(g.branch)} <code>${esc((g.head || '').slice(0, 9))}</code>` : '—', g?.lastFetch ? `fetch ${fmtDate(g.lastFetch)}` : g?.readAt ? t(['lu le {d}', 'read {d}'], { d: fmtDate(g.readAt) }) : '', g?.behind === 0 ? pill('ok', 'origin') : g?.branch ? pill('warn', t(['≠ origin', '≠ origin'])) : pill('info', t(['non lu', 'not read'])), 'framagit asr/flight_planner');
    const chk = window.SuiteUpdate?.last?.();
    if (chk?.ok) add(G.code, t(['Canal distant {c}', 'Remote channel {c}'], { c: chk.channel }), `${esc(chk.remote?.version || '')} <code>${esc(chk.remote?.short || '')}</code>`, fmtDate(chk.remote?.date), chk.available ? pill('warn', t(['mise à jour disponible', 'update available'])) : pill('ok', t(['à jour', 'up to date'])), t(['contrôlé le {d}', 'checked {d}'], { d: fmtDate(chk.at) }));
    // SIA
    const A = window.Airac, eff = A.cycle(), nxt = A.next();
    add(G.sia, t(['AIRAC en vigueur', 'AIRAC in force', 'Gültiger AIRAC', 'AIRAC vigente']), `<b>${esc(eff.label)}</b> (${esc(eff.ident)})`, `${esc(fmtDate(eff.date, false))} → ${esc(fmtDate(eff.until, false))}`, '', `<a href="${esc(eff.url)}" target="_blank" rel="noopener">SIA</a>`);
    add(G.sia, t(['AIRAC suivant', 'Next AIRAC', 'Nächster AIRAC', 'AIRAC siguiente']), esc(nxt.label), esc(fmtDate(nxt.date, false)), '', `<a href="${esc(nxt.url)}" target="_blank" rel="noopener">SIA</a>`);
    const info = window.SiaBase.info();
    const baseState = !info ? pill('info', t(['base non construite', 'no base yet'])) : info.mixed ? pill('err', t(['cycles mélangés', 'mixed cycles'])) : info.airac >= eff.date ? pill('ok', info.airac > eff.date ? t(['cycle à venir chargé', 'upcoming cycle loaded']) : t(['à jour', 'up to date'])) : pill('warn', t(['en retard', 'out of date']));
    add(G.sia, t(['Base du studio cartographique', 'Map studio base', 'Basis des Kartenstudios', 'Base del estudio']), info ? `${esc(info.airac || '?')} · ${esc(info.counts?.airspaces ?? '?')} ${esc(t(['espaces', 'airspaces']))}` : '—', info?.cachedAt ? fmtDate(info.cachedAt) : '', baseState, 'IndexedDB sia-map-parser');
    if (siaFolderState) {
      const lat = siaFolderState.latest;
      add(G.sia, t(['Dossier SIA XML', 'SIA XML folder', 'SIA-XML-Ordner', 'Carpeta SIA XML']), lat ? esc(lat.date) : '—', lat ? fmtDate(Math.max(...lat.items.map(i => i.lastModified))) : '', !lat ? pill('warn', t(['aucun XML AIRAC', 'no AIRAC XML'])) : !lat.complete ? pill('warn', t(['incomplet', 'incomplete'])) : siaFolderState.old.length ? pill('warn', t(['{n} ancien(s) cycle(s) présent(s)', '{n} old cycle(s) present'], { n: siaFolderState.old.length })) : pill('ok', t(['complet', 'complete'])), '');
      const mora = siaFolderState.fixed.find(x => x.id === 'mora')?.file;
      if (mora) { const mc = window.SiaBase.moraCycle(await mora.file.text()); add(G.sia, 'mora.csv', mc ? t(['obstacles AIRAC {c}', 'obstacles AIRAC {c}'], { c: mc }) : t(['cycle des obstacles non tracé', 'obstacle cycle not traced']), fmtDate(mora.lastModified), mc && info?.airac && mc === info.airac ? pill('ok', '=') : pill('warn', t(['à recalculer / tracer (étape 6)', 'recalculate / trace (step 6)'])), ''); }
    }
    const tracks = await repoText('data/sia/miam-enr-5-7-tracks.xml');
    if (tracks) add(G.sia, t(['Axes AAR (MILAIP ENR 5.7)', 'AAR tracks (MILAIP ENR 5.7)']), esc(/<miam:sourceEdition>([^<]+)</.exec(tracks.text)?.[1] || '?'), fmtDate(tracks.lastModified, false), '', 'DIRCAM');
    // bases de référence
    const db = window.AIRCRAFT_DB?.__meta || {};
    add(G.db, t(['Types OACI (Doc 8643)', 'ICAO types (Doc 8643)']), `${typeSet().size} types`, esc(db.generated || db.completed_at || ''), db.partial ? pill('warn', t(['partielle', 'partial'])) : pill('ok', t(['complète', 'complete'])), 'update_aircraft_db.py');
    add(G.db, t(['Performances (EUROCONTROL APD)', 'Performance (EUROCONTROL APD)']), `${Object.keys(window.AIRCRAFT_PERF || {}).length} types`, '', '', 'update_aircraft_db.py --apd');
    add(G.db, t(['Flotte DEFA', 'DEFA fleet', 'DEFA-Flotte', 'Flota DEFA']), `${(window.DEFA_FLEET || []).length} ${esc(t(['appareils', 'aircraft']))}`, fmtDate(window.DEFA_FLEET_META?.updatedAt), '', 'update_fleet.py Flotte.html');
    add(G.db, t(['Référence DEFA (pilotes, appareils)', 'DEFA reference (pilots, aircraft)']), `${(window.DEFA_REFERENCE?.pilots || []).length} / ${(window.DEFA_REFERENCE?.aircraft || []).length}`, fmtDate(window.DEFA_REFERENCE?.META?.updatedAt), '', 'tools/defa_reference.py');
    add(G.db, t(['Indicatifs', 'Callsigns', 'Rufzeichen', 'Indicativos']), `${(window.MISSION_CALLSIGNS?.table || []).length}`, fmtDate(window.MISSION_CALLSIGNS?.META?.updatedAt), '', t(['Paramétrage', 'Settings']));
    // données utilisateur
    const perfIdb = await idbAll('FlightPerfCache', 'cache');
    const ofps = Object.entries(perfIdb || {}).filter(([k, v]) => /ofp|simbrief/i.test(k) || v?.fetchedAt);
    const lastOfp = ofps.map(([, v]) => v?.fetchedAt || v?.savedAt || '').sort().pop();
    add(G.user, t(['Plans de vol (OFP SimBrief)', 'Flight plans (SimBrief OFP)']), `${ofps.length}`, fmtDate(lastOfp), '', 'FlightPerfCache');
    const ps = readJson('flightPerfState', {});
    const profs = Object.values(ps?.profiles || {});
    add(G.user, t(['Profils d’appareils du planificateur', 'Planner aircraft profiles']), `${profs.length}`, '', '', 'flightPerfState');
    const ledger = readJson('missionCoreLedger:v2', null);
    const ledgerAt = /updatedAt: "([^"]+)"/.exec(ledger?.text || '')?.[1] || ledger?.savedAt || '';
    add(G.user, t(['Registre des CR (missions.yaml)', 'Report ledger (missions.yaml)']), `${((ledger?.text || '').match(/^ {2}- schemaVersion/gm) || []).length} CR`, fmtDate(ledgerAt), '', 'CR DEFA');
    const reg = readJson('missionRegistry:v1', null);
    add(G.user, t(['Registre des missions générées', 'Generated mission registry']), `${(reg?.missions || []).length}`, fmtDate(reg?.updatedAt), '', 'mission_registry.yaml');
    const land = await idbAll('LandingPerformanceDashboardCache', 'datasets');
    const lands = Object.values(land || {});
    add(G.user, t(['Journal d’atterrissages (CSV)', 'Landing log (CSV)']), lands.map(d => esc(d?.name || d?.fileName || '')).filter(Boolean).slice(0, 2).join(', ') || String(lands.length), fmtDate(lands.map(d => d?.savedAt || d?.loadedAt || d?.createdAt || '').sort().pop()), '', 'Landing Dashboard');
    const store = readJson('defaLocalStore:v1', {});
    add(G.user, t(['Données locales (defa_local_store.yaml)', 'Local data (defa_local_store.yaml)']), esc(store.folder || '—'), fmtDate(store.savedAt), store.savedAt ? pill(Date.now() - new Date(store.savedAt) > 7 * 864e5 ? 'warn' : 'ok', ago(store.savedAt)) : pill('warn', t(['jamais', 'never'])), '');
    const lastFull = (window.LocalStore?.journal?.() || []).find(e => e.kind === 'full-backup');
    add(G.user, t(['Sauvegarde totale', 'Full backup', 'Vollständige Sicherung', 'Copia total']), lastFull ? `${lastFull.files || 0} ${esc(t(['fichiers', 'files']))} · ${fmtSize(lastFull.bytes || 0)}` : '—', fmtDate(lastFull?.at), lastFull ? pill(Date.now() - new Date(lastFull.at) > 30 * 864e5 ? 'warn' : 'ok', ago(lastFull.at)) : pill('warn', t(['jamais', 'never'])), '');
    let group = '';
    host.innerHTML = `<p class="row"><button type="button" class="secondary" id="mtVerRefresh" data-icon="refresh">${esc(t(['Actualiser', 'Refresh', 'Aktualisieren', 'Actualizar']))}</button></p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Élément', 'Asset', 'Element', 'Elemento']))}</th><th>${esc(t(['Version', 'Version', 'Version', 'Versión']))}</th><th>${esc(t(['Date / synchro', 'Date / sync', 'Datum / Sync', 'Fecha / sinc.']))}</th><th>${esc(t(['État', 'State', 'Status', 'Estado']))}</th><th>${esc(t(['Source / outil', 'Source / tool', 'Quelle / Werkzeug', 'Fuente / herramienta']))}</th></tr></thead><tbody>
      ${rows.map(r => (r.group !== group ? `<tr class="mt-group"><td colspan="5">${esc(group = r.group)}</td></tr>` : '') + `<tr><td>${esc(r.name)}</td><td>${r.version || '—'}</td><td>${r.sync || ''}</td><td>${r.state || ''}</td><td class="mt-small">${r.source || ''}</td></tr>`).join('')}
      </tbody></table></div>`;
    host.querySelector('#mtVerRefresh').onclick = async () => { await readGitState(false); await scanSiaFolder(false); renderVersions(); };
    window.AppFramework?.refresh?.();
  }

  // ===== 3. Références et dépendances
  async function renderDeps() {
    const host = hosts.deps, A = window.Airac, info = window.SiaBase.info(), eff = A.cycle();
    const rows = [];
    const add = (ref, file, traced, process, dependents, state) => rows.push({ ref, file, traced, process, dependents, state });
    const lat = siaFolderState?.latest;
    // SIA XML
    let st = !siaFolderState ? pill('info', t(['dossier SIA non lu (étape 2)', 'SIA folder not read (step 2)'])) : !lat ? pill('err', t(['aucun cycle', 'no cycle'])) : !lat.complete ? pill('warn', t(['manque : {m}', 'missing: {m}'], { m: lat.missing.join(', ') })) : siaFolderState.old.length ? pill('warn', t(['anciens cycles à archiver', 'old cycles to archive'])) : pill('ok', lat.date);
    add('SIA AIXM 4.5 · XML-SIA', 'data/sia/*_<date>.xml', t(['cycle dans le nom ; hors git (.gitignore)', 'cycle in file name; outside git (.gitignore)']), t(['§ Mise à jour SIA pas à pas (ci-dessous)', '§ SIA step by step (below)']), t(['base du studio, mora.csv (obstacles), profil vertical, planificateur, terrains des missions', 'studio base, mora.csv (obstacles), vertical profile, planner, mission aerodromes']), st);
    st = !info ? pill('info', t(['non construite', 'not built'])) : info.mixed ? pill('err', t(['cycles mélangés dans la base : relire le dossier', 'mixed cycles: re-read the folder'])) : lat && info.airac !== lat.date ? pill('warn', t(['base {b} ≠ dossier {d} : relire', 'base {b} ≠ folder {d}: re-read'], { b: info.airac, d: lat.date })) : info.airac < eff.date ? pill('warn', t(['base {b} antérieure au cycle en vigueur {e}', 'base {b} older than current cycle {e}'], { b: info.airac, e: eff.date })) : pill('ok', info.airac);
    add(t(['Base analysée du studio', 'Studio analysed base']), 'IndexedDB sia-map-parser', t(['parserVersion 11 ; cycle mémorisé (airac)', 'parserVersion 11; stored cycle (airac)']), t(['Studio › « Relire le dossier »', 'Studio › “Re-read folder”']), t(['cartes, profil vertical, planificateur', 'maps, vertical profile, planner']), st);
    const moraFile = siaFolderState?.fixed.find(x => x.id === 'mora')?.file;
    const mc = moraFile ? window.SiaBase.moraCycle(await moraFile.file.text()) : '';
    st = !moraFile ? pill('info', t(['dossier SIA non lu', 'SIA folder not read'])) : !mc ? pill('warn', t(['cycle des obstacles non tracé : étape 6 (recalcul simple) le trace', 'obstacle cycle not traced: step 6 traces it'])) : info?.airac && mc !== info.airac ? pill('warn', t(['obstacles {m} ≠ base {b} : recalcul simple', 'obstacles {m} ≠ base {b}: simple recalculation'], { m: mc, b: info.airac })) : pill('ok', mc);
    add('Grille MORA', 'data/sia/mora.csv', t(['git ; colonne source (+ cycle des obstacles)', 'git; source column (+ obstacle cycle)']), t(['Studio › bloc 5 (complet, réseau) ; étape 6 (recalcul simple, obstacles)', 'Studio › block 5 (full, network); step 6 (simple, obstacles)']), t(['cartes, profil vertical', 'maps, vertical profile']), st);
    const trk = await repoText('data/sia/miam-enr-5-7-tracks.xml'), crd = await repoText('data/sia/miam-enr-5-7-coordinates.xml');
    const ed = x => /<miam:sourceEdition>([^<]+)</.exec(x?.text || '')?.[1] || '';
    const e1 = ed(trk), e2 = ed(crd), amdt = s => /AMDT\s*(\d+\/\d+)/i.exec(s)?.[1] || s;
    st = !trk ? pill('info', t(['non lisible (dossier du dépôt ou serveur)', 'not readable (repository folder or server)'])) : amdt(e1) === amdt(e2) ? pill('ok', e1) : pill('warn', t(['éditions différentes : {a} / {b}', 'different editions: {a} / {b}'], { a: e1, b: e2 }));
    add(t(['Axes AAR (ENR 5.7)', 'AAR tracks (ENR 5.7)']), 'miam-enr-5-7-tracks.xml ← coordinates.xml', t(['git ; édition (AMDT) dans l’en-tête', 'git; edition (AMDT) in header']), 'AarTracks.parseEnr57 → toXml (MANUEL § 9.1)', t(['studio, CR AAR', 'studio, AAR reports']), st);
    // types et performances
    const types = typeSet();
    const perfMissing = Object.keys(window.AIRCRAFT_PERF || {}).filter(k => !knownType(types, k));
    add(t(['Performances APD', 'APD performance']), 'AircraftDB/aircraft_perf.js ← aircraft_db.js', t(['git ; en-tête « GÉNÉRÉ »', 'git; “GENERATED” header']), 'update_aircraft_db.py --apd', t(['planificateur, profil vertical', 'planner, vertical profile']), perfMissing.length ? pill('warn', t(['{n} type(s) absents de la base OACI : {l}', '{n} type(s) not in ICAO base: {l}'], { n: perfMissing.length, l: perfMissing.slice(0, 6).join(', ') })) : pill('ok', t(['types connus', 'known types'])));
    const fleetTypes = [...new Set((window.DEFA_FLEET || []).map(r => r.type).filter(Boolean))];
    const fleetUnknown = fleetTypes.filter(x => !knownType(types, x));
    const fleetNoPerf = fleetTypes.filter(x => !hasPerf(x));
    add(t(['Flotte DEFA', 'DEFA fleet']), 'data/references/aircraft_fleet.js ← Flotte.html', t(['git ; META.updatedAt', 'git; META.updatedAt']), 'update_fleet.py Flotte.html ; Paramétrage', t(['CR, catalogue, registre', 'reports, catalogue, registry']), fleetUnknown.length ? pill('warn', t(['types inconnus : {l}', 'unknown types: {l}'], { l: fleetUnknown.join(', ') })) : pill('ok', t(['{n} types connus ; {p} sans performances APD', '{n} known types; {p} without APD performance'], { n: fleetTypes.length, p: fleetNoPerf.length })));
    const profUnknown = Object.values(readJson('flightPerfState', {})?.profiles || {}).map(p => p?.icao).filter(x => x && !knownType(types, x));
    add(t(['Profils du planificateur', 'Planner profiles']), 'flightPerfState (navigateur)', t(['données locales', 'local data']), t(['planificateur ; sauvegarde', 'planner; backup']), t(['devis carburant, profil vertical', 'fuel quote, vertical profile']), profUnknown.length ? pill('warn', t(['types hors base OACI : {l}', 'types outside ICAO base: {l}'], { l: [...new Set(profUnknown)].join(', ') })) : pill('ok', ''));
    // prompt des missions
    const md = await repoText('docs/PROMPT_GENERATEUR_MISSIONS.md');
    let promptState = pill('info', t(['non lisible', 'not readable']));
    if (md && typeof window.MISSION_PROMPT === 'string') {
      const block = /```text\n([\s\S]*?)\n```/.exec(md.text.replace(/\r\n/g, '\n'))?.[1];
      promptState = block == null ? pill('warn', '?') : block.trim() === window.MISSION_PROMPT.trim() ? pill('ok', t(['synchronisé', 'in sync'])) : pill('warn', t(['à régénérer : python tools/build_mission_prompt.py', 'rebuild: python tools/build_mission_prompt.py']));
    }
    add(t(['Prompt des missions', 'Mission prompt']), 'apps/sia/mission_prompt.js ← docs/PROMPT_GENERATEUR_MISSIONS.md', t(['git ; en-tête « GÉNÉRÉ »', 'git; “GENERATED” header']), 'build_mission_prompt.py (bump_versions.py)', t(['générateur, registre des missions', 'generator, mission registry']), promptState);
    const vj = await repoText('VERSION.json'), relv = window.REPOSITORY_TREE?.release?.version;
    let vv = ''; try { vv = vj ? JSON.parse(vj.text).release : ''; } catch { /* illisible */ }
    add('VERSION.json', 'VERSION.json ← repository_tree', t(['ignoré par git (*.json)', 'git-ignored (*.json)']), t(['aucun (à supprimer)', 'none (to delete)']), '—', !vj ? pill('ok', t(['absent', 'absent'])) : vv === relv ? pill('ok', vv) : pill('warn', t(['{a} ≠ {b}', '{a} ≠ {b}'], { a: vv, b: relv })));
    host.innerHTML = `<p class="row"><button type="button" class="secondary" id="mtDepRefresh" data-icon="refresh">${esc(t(['Vérifier', 'Check', 'Prüfen', 'Comprobar']))}</button></p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><thead><tr><th>${esc(t(['Référence', 'Reference', 'Referenz', 'Referencia']))}</th><th>${esc(t(['Fichier', 'File', 'Datei', 'Archivo']))}</th><th>${esc(t(['Traçage', 'Tracing', 'Nachverfolgung', 'Trazado']))}</th><th>${esc(t(['Mise à jour', 'Update', 'Aktualisierung', 'Actualización']))}</th><th>${esc(t(['Dépendants', 'Dependents', 'Abhängige', 'Dependientes']))}</th><th>${esc(t(['Contrôle', 'Check', 'Prüfung', 'Control']))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${esc(r.ref)}</b></td><td class="mt-small"><code>${esc(r.file)}</code></td><td class="mt-small">${esc(r.traced)}</td><td class="mt-small">${esc(r.process)}</td><td class="mt-small">${esc(r.dependents)}</td><td>${r.state}</td></tr>`).join('')}
      </tbody></table></div>`;
    host.querySelector('#mtDepRefresh').onclick = async () => { await scanSiaFolder(false); renderDeps(); };
    window.AppFramework?.refresh?.();
  }

  // ===== 4. Mise à jour SIA pas à pas
  const PREV = 'siaBaseInfo:prev';   // écrit par SiaBase.put (base précédente)
  const ACK = 'siaUpdateAck:v1';     // étapes 5 et 6 marquées « vu » pour une base (cachedAt)
  let extractMsg = '', archiveMsg = '', moraPlan = null, moraMsg = '', basePanelEl = null;
  async function scanSiaFolder(request = false) {
    const dir = await folder('__sia', request);
    if (!dir) return (siaFolderState = null);
    siaFolderState = window.Airac.inspectFolder(await window.Airac.filesOf(dir));
    return siaFolderState;
  }
  const stepHead = (n, level, title) => `<div class="mt-step-head"><span class="mt-step-num mt-${level}">${n}</span><h3>${esc(title)}</h3></div>`;
  async function renderSia() {
    const host = hosts.sia, A = window.Airac, eff = A.cycle(), nxt = A.next(), info = window.SiaBase.info(), prev = readJson(PREV, null);
    const f = siaFolderState, lat = f?.latest;
    const s1 = info?.airac >= eff.date ? 'ok' : 'warn';
    const s2 = !f ? 'todo' : lat?.complete ? 'ok' : 'warn';
    const s3 = !f ? 'todo' : f.old.length ? 'warn' : 'ok';
    const s4 = info && lat && info.airac === lat.date && !info.mixed ? 'ok' : 'todo';
    const cmp = baseSummary && prev ? diffSummaries(prev, baseSummary) : null;
    const help = t([
      `<p>Tous les 28 jours (le jeudi), un nouveau cycle AIRAC entre en vigueur. Le SIA publie ses données environ trois semaines avant : charger le cycle à venir est sans risque. Six étapes, dans l’ordre ; chaque pastille passe au vert quand l’étape est faite.</p><ol><li><b>Cycle AIRAC</b> — constater le cycle en vigueur et celui de la base.</li><li><b>Télécharger et extraire</b> — sur la page SIA du cycle, télécharger le ZIP <code>export_xml_bd_SIA_&lt;date&gt;-vNN.zip</code>, puis « ZIP d’export du SIA… » : les XML (<code>AIXM4.5_all_FR_OM_&lt;date&gt;.xml</code>, <code>XML_SIA_&lt;date&gt;.xml</code>, Lisez-moi) sont écrits dans <code>data/sia</code>. Rien d’autre à télécharger.</li><li><b>Archiver</b> les fichiers des cycles précédents (<code>_archives/</code>).</li><li><b>Reconstruire la base</b> — « Relire le dossier » : <code>data/sia</code> est relu ici même (quelques secondes) et la base analysée est mémorisée dans le navigateur ; c’est le même bloc que « Base de données SIA » du studio.</li><li><b>Contrôler les différences</b> avec la base précédente (automatique au retour).</li><li><b>Recalculer</b> la grille MORA (obstacles du nouveau cycle) et contrôler la cohérence ; committer <code>mora.csv</code> s’il a changé.</li></ol><p class="mt-small">Les XML AIRAC restent hors dépôt (≈ 80 Mo par cycle). Valeurs MORA calculées, non certifiées.</p>`,
      `<p>Every 28 days (Thursday) a new AIRAC cycle comes into force; the SIA publishes it about three weeks ahead. Six steps, in order; each badge turns green when done.</p><ol><li><b>AIRAC cycle</b> — check the cycle in force and the base cycle.</li><li><b>Download and extract</b> the SIA ZIP <code>export_xml_bd_SIA_&lt;date&gt;-vNN.zip</code> into <code>data/sia</code>.</li><li><b>Archive</b> previous cycles (<code>_archives/</code>).</li><li><b>Rebuild the base</b> — “Re-read the folder”: <code>data/sia</code> is re-read right here and the analysed base is stored; same block as the studio’s “SIA database”.</li><li><b>Check the differences</b> (automatic on return).</li><li><b>Recalculate</b> the MORA grid and check consistency; commit <code>mora.csv</code> if it changed.</li></ol>`
    ]);
    const todo = (txt, ack) => `<p class="mt-todo"><b>${esc(t(['À faire', 'To do', 'Zu tun', 'Por hacer']))}</b> : ${txt}${ack ? `<button type="button" class="secondary mt-ack" data-ack="${ack}" data-icon="check">${esc(t(['Vu, c’est fait', 'Done', 'Erledigt', 'Hecho']))}</button>` : ''}</p>`;
    const acks = readJson(ACK, {}), baseKey = String(baseSummary?.cachedAt || info?.cachedAt || ''), acked = n => !!baseKey && acks[n] === baseKey;
    if (moraPlan?.written && baseKey && acks[6] !== baseKey) { acks[6] = baseKey; writeJson(ACK, acks); }   // MORA à jour : étape 6 faite
    const folderCycle = lat?.date || '', baseCycle = info?.airac || '';
    host.innerHTML = `
      <details class="mt-help"><summary>${esc(t(['Mode d’emploi', 'How to', 'Anleitung', 'Modo de empleo']))}</summary>${help}</details>
      <div class="mt-steps">
        <div class="mt-step" id="mt-step-1">${stepHead(1, s1, t(['Cycle AIRAC', 'AIRAC cycle', 'AIRAC-Zyklus', 'Ciclo AIRAC']))}
          <p>${esc(t(['En vigueur', 'In force', 'Gültig', 'Vigente']))} : <b>${esc(eff.label)}</b> (${esc(fmtDate(eff.date, false))} → ${esc(fmtDate(eff.until, false))}) · ${esc(t(['suivant', 'next', 'nächster', 'siguiente']))} : <b>${esc(nxt.label)}</b> ${esc(t(['le', 'on', 'am', 'el']))} ${esc(fmtDate(nxt.date, false))}</p>
          <p>${esc(t(['Base du studio', 'Studio base', 'Studio-Basis', 'Base del estudio']))} : ${info ? `<b>${esc(info.airac || '?')}</b> (${esc(fmtDate(info.cachedAt))})` : '—'} ${s1 === 'ok' ? pill('ok', t(['à jour', 'up to date'])) : pill('warn', t(['à mettre à jour', 'to update']))}</p>
          <p class="row"><a class="mt-link" href="${esc(eff.url)}" target="_blank" rel="noopener">SIA — AIRAC ${esc(eff.label)}</a> <a class="mt-link" href="${esc(nxt.url)}" target="_blank" rel="noopener">SIA — AIRAC ${esc(nxt.label)}</a> <a class="mt-link" href="${esc(window.RepositoryNav?.source?.('siaData'))}" target="_blank" rel="noopener">${esc(t(['Bases de données SIA', 'SIA databases']))}</a></p>
        </div>
        <div class="mt-step" id="mt-step-2">${stepHead(2, s2, t(['Télécharger et extraire l’export du SIA', 'Download and extract the SIA export', 'SIA-Export herunterladen und entpacken', 'Descargar y extraer la exportación del SIA']))}
          ${s2 === 'ok' ? '' : todo(esc(t(['télécharger le ZIP sur la page SIA du cycle (étape 1), puis « ZIP d’export du SIA… » ci-dessous (ou « Extraire » s’il est déjà dans le dossier).', 'download the ZIP from the SIA cycle page (step 1), then “SIA export ZIP…” below.'])))}
          <p class="row" id="mtSiaFolder"></p>
          ${f ? folderTable(f) : `<p class="mt-small">${esc(t(['Choisir (une fois) le dossier des données (Sources et dossiers) — data/sia en est déduit —, puis « Analyser ».', 'Choose the data folder once (Sources and folders) — data/sia is derived from it —, then “Analyse”.']))}</p>`}
          <p class="row"><label class="secondary mt-file">${esc(t(['ZIP d’export du SIA…', 'SIA export ZIP…', 'SIA-Export-ZIP…', 'ZIP de exportación…']))}<input type="file" id="mtSiaZip" accept=".zip" hidden data-picker-folder="__sia"></label>${f?.zips?.length ? `<button type="button" class="secondary" id="mtSiaZipFolder" data-icon="box">${esc(t(['Extraire {z}', 'Extract {z}'], { z: f.zips[0].name }))}</button>` : ''} <span class="mt-small" id="mtExtract">${extractMsg}</span></p>
        </div>
        <div class="mt-step" id="mt-step-3">${stepHead(3, s3, t(['Anciens cycles', 'Old cycles', 'Alte Zyklen', 'Ciclos antiguos']))}
          ${!f ? `<p class="mt-small">${esc(t(['Analyser d’abord le dossier (étape 2).', 'Analyse the folder first (step 2).']))}</p>` : f.old.length ? `<p>${f.old.map(o => `<code>${esc(o.date)}</code> (${o.items.length} ${esc(t(['fichier(s)', 'file(s)']))}, ${fmtSize(o.items.reduce((n, i) => n + i.size, 0))})`).join(' · ')}</p><p class="row"><button type="button" class="secondary" id="mtArchive" data-icon="box">${esc(t(['Archiver dans _archives/', 'Archive into _archives/', 'In _archives/ archivieren', 'Archivar en _archives/']))}</button></p>` : `<p>${pill('ok', t(['un seul cycle dans le dossier', 'a single cycle in the folder']))}</p>`}
          <p class="mt-small">${archiveMsg}</p>
        </div>
        <div class="mt-step" id="mt-step-4">${stepHead(4, s4, t(['Reconstruire la base SIA', 'Rebuild the SIA base', 'SIA-Basis neu aufbauen', 'Reconstruir la base SIA']))}
          <p>${esc(t(['Base mémorisée', 'Stored base', 'Gespeicherte Basis', 'Base guardada']))} : <b>${esc(baseCycle || '—')}</b> · ${esc(t(['dossier data/sia', 'data/sia folder']))} : <b>${esc(folderCycle || '?')}</b> ${s4 === 'ok' ? pill('ok', t(['à jour', 'up to date'])) : baseCycle && folderCycle ? pill('warn', t(['à relire', 'to re-read'])) : ''}</p>
          ${s4 === 'ok' ? '' : todo(esc(t(['cliquer « Relire le dossier » ci-dessous (quelques secondes ; le navigateur peut demander d’autoriser le dossier). Quand « ✓ Base chargée et mémorisée » s’affiche, les étapes 5 et 6 se mettent à jour.', 'click “Re-read the folder” below (a few seconds). When “✓ Base loaded and stored” shows, steps 5 and 6 update.'])))}
          <div id="mtBasePanel"></div>
          <p class="mt-small">${esc(t(['Même bloc que « Base de données SIA » du studio cartographique :', 'Same block as “SIA database” in the map studio:']))} <a class="mt-link" href="${esc(new URL('apps/sia/map_parser.html#sia-base', root()).href)}" target="_blank" rel="noopener">${esc(t(['ouvrir le studio', 'open the studio']))}</a></p>
        </div>
        <div class="mt-step" id="mt-step-5">${stepHead(5, (cmp && acked(5)) || (baseSummary && !prev) ? 'ok' : cmp ? 'warn' : 'todo', t(['Contrôler les différences avec la base précédente', 'Check the differences with the previous base', 'Unterschiede zur vorherigen Basis prüfen', 'Controlar las diferencias con la base anterior']))}
          ${cmp ? diffHtml(cmp) + (acked(5) ? `<p>${pill('ok', t(['différences vues', 'differences reviewed']))}</p>` : todo(esc(t(['parcourir les espaces ajoutés / retirés (cartes des missions concernées), puis passer à l’étape 6.', 'review added / removed airspaces, then go to step 6.'])), 5)) : baseSummary && !prev ? `<p>${pill('info', t(['aucune base précédente gardée (première lecture ou cache purgé) : rien à comparer — passer à l’étape 6', 'no previous base kept (first read or purged cache): nothing to compare — go to step 6']))}</p>` : `<p class="mt-small">${esc(t(['S’affiche automatiquement après la relecture (étape 4).', 'Shown automatically after the re-read (step 4).']))}</p>`}
        </div>
        <div class="mt-step" id="mt-step-6">${stepHead(6, acked(6) || moraPlan?.written ? 'ok' : moraPlan ? 'warn' : 'todo', t(['Recalculer (MORA) et contrôler la cohérence', 'Recalculate (MORA) and check consistency', 'Neu berechnen (MORA) und prüfen', 'Recalcular (MORA) y controlar']))}
          ${moraPlan?.written || acked(6) ? '' : todo(esc(t(['« Recalcul simple » de la grille MORA ; si des cellules changent, « Écrire mora.csv » puis committer le dépôt de données. Puis « Contrôler » la cohérence.', '“Simple recalculation” of the MORA grid; if cells change, “Write mora.csv” and commit the data repository. Then “Check” consistency.'])), 6)}
          <div class="repo-card" data-icon="chart" data-subtitle="${esc(t(['Recalcul simple (obstacles du nouveau cycle, hors ligne) ou calcul complet (relief + sommets OSM, réseau) — même calcul que le studio', 'Simple recalculation (new obstacles, offline) or full calculation (terrain + OSM peaks, network) — same as the studio']))}"><h3>MORA</h3>
            <p class="row"><button type="button" class="secondary" id="mtMora" data-icon="refresh" title="${esc(t(['Obstacles du nouveau cycle, relief du mora.csv actuel — sans réseau, immédiat', 'New-cycle obstacles, terrain from the current mora.csv — offline, instant']))}">${esc(t(['Recalcul simple', 'Simple recalculation', 'Einfache Neuberechnung', 'Recálculo simple']))}</button><button type="button" class="secondary" id="mtMoraFull" data-icon="globe" title="${esc(t(['Relief (tuiles Terrarium) + sommets OSM + obstacles — réseau, environ une minute', 'Terrain (Terrarium tiles) + OSM peaks + obstacles — network, about a minute']))}">${esc(t(['Calcul complet', 'Full calculation', 'Vollständige Berechnung', 'Cálculo completo']))}</button>${moraPlan && !moraPlan.written ? `<button type="button" class="primary" id="mtMoraWrite" data-icon="save">${esc(t(['Écrire mora.csv (ancien archivé)', 'Write mora.csv (old one archived)']))}</button><button type="button" class="secondary" id="mtMoraDl" data-icon="download">${esc(t(['Télécharger', 'Download', 'Herunterladen', 'Descargar']))}</button>` : ''}</p>
            <div id="mtMoraMsg">${moraMsg}</div><div>${moraPlan ? moraHtml(moraPlan) : ''}</div></div>
          <div class="repo-card" data-icon="plane" data-subtitle="${esc(t(['Espaces, appareils, flotte DEFA, performances, terrains des missions', 'Airspace, aircraft, DEFA fleet, performance, mission aerodromes']))}"><h3>${esc(t(['Cohérence', 'Consistency', 'Konsistenz', 'Coherencia']))}</h3><div id="mtUsage"><p class="row"><button type="button" class="secondary" id="mtUsageRun" data-icon="search">${esc(t(['Contrôler', 'Check', 'Prüfen', 'Comprobar']))}</button></p></div></div>
        </div>
      </div>`;
    const fb = host.querySelector('#mtSiaFolder');
    fb.append(folderButton('__sia', async () => { await scanSiaFolder(true); renderSia(); renderVersions(); renderDeps(); }));
    const an = document.createElement('button');
    an.type = 'button'; an.className = 'secondary'; an.dataset.icon = 'search';
    an.textContent = t(['Analyser', 'Analyse', 'Analysieren', 'Analizar']);
    an.onclick = async () => { await scanSiaFolder(true); if (!siaFolderState) alert(t(['Dossier SIA XML non choisi ou non autorisé.', 'SIA XML folder not chosen or not authorised.'])); renderSia(); renderVersions(); renderDeps(); };
    fb.append(an);
    host.querySelector('#mtSiaZip').onchange = e => { const file = e.target.files[0]; e.target.value = ''; if (file) extractZip(file); };
    host.querySelector('#mtSiaZipFolder')?.addEventListener('click', () => extractZip(siaFolderState.zips[0].file));
    host.querySelector('#mtArchive')?.addEventListener('click', archiveOld);
    // Bloc commun (SiaBase.panel) créé une fois, replacé à chaque rendu : ses messages restent affichés.
    basePanelEl ??= (() => { const el = document.createElement('div'); window.SiaBase.panel(el, { onLoaded: () => baseChanged(true), onPurged: () => baseChanged(false) }); return el; })();
    host.querySelector('#mtBasePanel').replaceWith(basePanelEl);
    host.querySelectorAll('[data-ack]').forEach(b => { b.onclick = () => { const a = readJson(ACK, {}); a[b.dataset.ack] = baseKey; writeJson(ACK, a); renderSia(); }; });
    host.querySelector('#mtMora').onclick = planMora;
    host.querySelector('#mtMoraFull').onclick = planMoraFull;
    host.querySelector('#mtMoraWrite')?.addEventListener('click', writeMora);
    host.querySelector('#mtMoraDl')?.addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([moraPlan.csv], { type: 'text/csv;charset=utf-8' })); a.download = 'mora.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    host.querySelector('#mtUsageRun').onclick = usageCheck;
    window.AppFramework?.refresh?.();
    // Ancre « #mt-step-N » (lien de retour du studio…) : une fois, au premier rendu.
    if (!stepHashDone && /^#mt-step-\d$/.test(location.hash)) {
      stepHashDone = true;
      // le bloc peut être encore masqué (affichage du bloc demandé par ?m=) : attendre qu'il soit visible
      const target = location.hash.slice(1);
      let tries = 0;
      const go = () => { const el = document.getElementById(target); if (el?.offsetParent) { el.scrollIntoView({ block: 'start' }); el.classList.add('repo-block-flash'); setTimeout(() => el.classList.remove('repo-block-flash'), 1600); } else if (tries++ < 40) setTimeout(go, 100); };
      go();
    }
  }
  let stepHashDone = false;
  function folderTable(f) {
    const role = id => { const r = window.Airac.ROLES.find(x => x.id === id); return r ? t(r.label) : id; };
    const rows = [];
    for (const c of f.cycles) for (const i of c.items) rows.push(`<tr${c === f.latest ? '' : ' class="mt-old"'}><td><code>${esc(i.name)}</code></td><td>${esc(role(i.role))}</td><td>${esc(c.cycle?.label || c.date)}</td><td class="num">${fmtSize(i.size)}</td><td>${esc(fmtDate(i.lastModified))}</td></tr>`);
    for (const z of f.zips) rows.push(`<tr><td><code>${esc(z.name)}</code></td><td>${esc(role('zip'))}</td><td>${esc(z.cycle)}${z.version ? ' v' + z.version : ''}</td><td class="num">${fmtSize(z.size)}</td><td>${esc(fmtDate(z.lastModified))}</td></tr>`);
    for (const x of f.fixed) rows.push(`<tr><td><code>${esc(x.name)}</code></td><td>${esc(t(x.label))}</td><td>${x.file ? '' : pill(x.id === 'readme' ? 'info' : 'warn', t(['absent', 'absent']))}</td><td class="num">${x.file ? fmtSize(x.file.size) : ''}</td><td>${x.file ? esc(fmtDate(x.file.lastModified)) : ''}</td></tr>`);
    const lat = f.latest;
    return `<p>${lat ? (lat.complete ? pill('ok', t(['cycle {c} complet', 'cycle {c} complete'], { c: lat.date })) : pill('warn', t(['cycle {c} incomplet : manque {m}', 'cycle {c} incomplete: missing {m}'], { c: lat.date, m: lat.missing.join(', ') }))) : pill('warn', t(['aucun XML AIRAC', 'no AIRAC XML']))}</p><div class="mt-scroll"><table class="mt-table mt-wide"><tbody>${rows.join('')}</tbody></table></div>`;
  }
  async function extractZip(file) {
    const el = () => document.getElementById('mtExtract');
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['choisir d’abord le dossier SIA XML', 'choose the SIA XML folder first']));
      extractMsg = t(['Lecture du ZIP…', 'Reading ZIP…']); if (el()) el().textContent = extractMsg;
      const entries = await window.ZipStore.read(file), written = [];
      for (const e of entries) {
        const leaf = e.name.split('/').pop();
        const target = /^lisez[-_]moi\.txt$/i.test(leaf) ? 'Lisez_moi.txt' : leaf;
        if (!window.Airac.ROLES.some(r => r.id !== 'zip' && r.re.test(leaf)) && target !== 'Lisez_moi.txt') continue;
        if (el()) el().textContent = t(['Extraction de {f}…', 'Extracting {f}…'], { f: leaf });
        await writeAt(dir, target, await e.bytes());
        written.push(target);
      }
      extractMsg = written.length ? pill('ok', t(['{n} fichier(s) extrait(s) : {l}', '{n} file(s) extracted: {l}'], { n: written.length, l: written.join(', ') })) : pill('warn', t(['aucun XML du SIA dans ce ZIP', 'no SIA XML in this ZIP']));
      window.LocalStore?.logEvent?.({ kind: 'sia-extract', source: file.name, files: written.length, keys: { added: written, updated: [] } });
      await scanSiaFolder(false);
    } catch (e) { extractMsg = pill('err', e.message); }
    renderSia(); renderVersions(); renderDeps();
  }
  async function archiveOld() {
    const f = siaFolderState;
    if (!f?.old.length) return;
    const names = f.old.flatMap(o => o.items.map(i => i.name));
    if (!confirm(t(['Déplacer ces fichiers dans _archives/<cycle>/ ?\n\n{l}', 'Move these files into _archives/<cycle>/?\n\n{l}'], { l: names.join('\n') }))) return;
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier non autorisé', 'folder not authorised']));
      let n = 0;
      for (const o of f.old) {
        const sub = await (await dir.getDirectoryHandle('_archives', { create: true })).getDirectoryHandle(o.date, { create: true });
        for (const i of o.items) {
          archiveMsg = t(['Copie de {f}…', 'Copying {f}…'], { f: i.name }); const m = hosts.sia.querySelector('#mtArchive'); if (m) m.disabled = true;
          const w = await (await sub.getFileHandle(i.name, { create: true })).createWritable();
          await i.file.stream().pipeTo(w);
          await dir.removeEntry(i.name);
          n++;
        }
      }
      archiveMsg = pill('ok', t(['{n} fichier(s) archivé(s)', '{n} file(s) archived'], { n }));
      window.LocalStore?.logEvent?.({ kind: 'sia-archive', source: dir.name, files: n, keys: { added: [], updated: names } });
      await scanSiaFolder(false);
    } catch (e) { archiveMsg = pill('err', e.message); }
    renderSia(); renderVersions(); renderDeps();
  }
  function diffSummaries(a, b) {
    const types = [...new Set([...Object.keys(a.counts?.byType || {}), ...Object.keys(b.counts?.byType || {})])].sort();
    const setA = new Set(a.names || []), setB = new Set(b.names || []);
    const added = [...setB].filter(x => !setA.has(x)), removed = [...setA].filter(x => !setB.has(x));
    const counts = ['airspaces', 'aerodromes', 'navaids', 'obstacleCells', 'cities', 'mora'].map(k => ({ k, a: a.counts?.[k] ?? 0, b: b.counts?.[k] ?? 0 }));
    return { from: a.airac, to: b.airac, types: types.map(k => ({ k, a: a.counts?.byType?.[k] || 0, b: b.counts?.byType?.[k] || 0 })), counts, added, removed, changed: a.airac !== b.airac || added.length || removed.length };
  }
  function diffHtml(d) {
    const lbl = { airspaces: t(['espaces', 'airspaces']), aerodromes: t(['aérodromes', 'aerodromes']), navaids: t(['balises', 'navaids']), obstacleCells: t(['cellules avec obstacles', 'cells with obstacles']), cities: t(['villes', 'cities']), mora: 'MORA' };
    const cell = (a, b) => `${a} → ${b}${a !== b ? ` <b class="${b > a ? 'mt-plus' : 'mt-minus'}">(${b > a ? '+' : ''}${b - a})</b>` : ''}`;
    const list = (arr, cls) => arr.slice(0, 60).map(x => `<span class="${cls}">${esc(x.replace('|', ' '))}</span>`).join(', ') + (arr.length > 60 ? ` … (+${arr.length - 60})` : '');
    return `<p>${esc(t(['Cycle', 'Cycle']))} : <b>${esc(d.from || '?')}</b> → <b>${esc(d.to || '?')}</b></p>
      <table class="mt-table"><tbody>${d.counts.map(c => `<tr><th>${esc(lbl[c.k])}</th><td>${cell(c.a, c.b)}</td></tr>`).join('')}
      <tr><th>${esc(t(['par type', 'by type']))}</th><td>${d.types.filter(x => x.a || x.b).map(x => `${esc(x.k)} ${cell(x.a, x.b)}`).join(' · ')}</td></tr></tbody></table>
      ${d.added.length ? `<p><b>${esc(t(['Espaces nouveaux', 'New airspaces']))} (${d.added.length})</b> : ${list(d.added, 'mt-plus')}</p>` : ''}
      ${d.removed.length ? `<p><b>${esc(t(['Espaces retirés', 'Removed airspaces']))} (${d.removed.length})</b> : ${list(d.removed, 'mt-minus')}</p>` : ''}
      ${!d.added.length && !d.removed.length ? `<p>${pill('ok', t(['aucun espace ajouté ni retiré (noms)', 'no airspace added or removed (names)']))}</p>` : ''}`;
  }
  async function planMora() {
    moraMsg = ''; moraPlan = null;
    try {
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file;
      if (!mf) throw new Error(t(['mora.csv absent du dossier SIA XML (ou dossier non lu)', 'mora.csv missing from the SIA XML folder (or folder not read)']));
      const b = await window.SiaBase.get();
      if (!b?.obstacleMax) throw new Error(t(['base du studio absente : relire le dossier (étape 4)', 'no studio base: re-read the folder (step 4)']));
      const cyc = b.airac || '';
      const text = await mf.file.text();
      moraPlan = { ...window.SiaBase.moraFromObstacles(text, b.obstacleMax, cyc), cycle: cyc, previousCycle: window.SiaBase.moraCycle(text), written: false, mode: 'simple' };
      if (!moraPlan.changes.length && moraPlan.previousCycle === cyc) moraPlan.written = true;
    } catch (e) { moraMsg = pill('err', e.message); }
    renderSia();
  }
  // Calcul complet (même code que le studio : SiaBase.computeMoraGrid), comparé au mora.csv actuel.
  async function planMoraFull() {
    moraMsg = ''; moraPlan = null;
    const btn = hosts.sia.querySelector('#mtMoraFull'), say = x => { const m = hosts.sia.querySelector('#mtMoraMsg'); if (m) m.innerHTML = x; };
    if (btn) btn.disabled = true;
    try {
      const b = await window.SiaBase.get();
      if (!b?.obstacleMax) throw new Error(t(['base absente : relire le dossier (étape 4)', 'no base: re-read the folder (step 4)']));
      if (!siaFolderState) await scanSiaFolder(true);
      const mf = siaFolderState?.fixed.find(x => x.id === 'mora')?.file, text = mf ? await mf.file.text() : '';
      // théâtres couverts, plus les emprises des missions du registre situées ailleurs (relief et sommets seulement : pas d'obstacles hors AIXM)
      const extra = window.SiaBase.moraZonesOfMissions?.(readJson('missionRegistry:v1', null)?.missions || []) || [];
      const cells = await window.SiaBase.computeMoraGrid(b.obstacleMax, {}, (d, n, step) => say(`<span class="mt-small">${esc(step)} : ${d}/${n}…</span>`), extra);
      cells.extraZones = extra.map(z => `${z.name} (${z.s}…${z.n}° / ${z.w}…${z.e}°)`);
      const before = new Map((text ? window.SiaBase.parseMora(text) : []).map(c => [c.lat + '|' + c.lon, c]));
      const changes = cells.map(c => { const o = before.get(c.lat + '|' + c.lon); return { lat: c.lat, lon: c.lon, before: o ? window.SiaBase.moraFtOf(o) : 0, after: c.moraFt, obstacleBefore: '', obstacleAfter: c.obstacleFt }; }).filter(c => c.before !== c.after);
      moraPlan = { csv: window.SiaBase.moraCsv(cells, { airac: b.airac }), cells, changes, cycle: b.airac || '', previousCycle: window.SiaBase.moraCycle(text), written: false, mode: 'full', peaksOk: cells.peaksOk, extraZones: cells.extraZones };
    } catch (e) { moraMsg = pill('err', e.message); }
    renderSia();
  }
  function moraHtml(p) {
    const up = p.changes.filter(c => c.after > c.before), down = p.changes.filter(c => c.after < c.before), obst = p.changes.filter(c => c.after === c.before);
    return `<p>${p.changes.length ? pill('warn', t(['{n} cellule(s) modifiée(s) : {u} en hausse, {d} en baisse, {o} obstacle seul', '{n} cell(s) changed: {u} up, {d} down, {o} obstacle only'], { n: p.changes.length, u: up.length, d: down.length, o: obst.length })) : pill('ok', t(['aucune valeur MORA ne change', 'no MORA value changes']))} ${p.written ? pill('ok', t(['mora.csv tracé AIRAC {c}', 'mora.csv traced AIRAC {c}'], { c: p.cycle })) : ''}</p>
      ${p.changes.length ? `<div class="mt-scroll mt-short"><table class="mt-table"><thead><tr><th>lat</th><th>lon</th><th>MORA</th><th>${esc(t(['obstacle (ft)', 'obstacle (ft)']))}</th></tr></thead><tbody>${p.changes.map(c => `<tr><td>${c.lat}</td><td>${c.lon}</td><td>${c.before} → <b class="${c.after > c.before ? 'mt-minus' : c.after < c.before ? 'mt-plus' : ''}">${c.after}</b></td><td>${c.obstacleBefore} → ${c.obstacleAfter}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${p.extraZones?.length ? `<p class="mt-small">${esc(t(['Hors des théâtres couverts, pour les missions du registre : {z} — relief et sommets seulement (pas d’obstacles hors de l’AIXM française).', 'Outside the covered theatres, for the registry missions: {z} — terrain and peaks only (no obstacles outside the French AIXM).'], { z: p.extraZones.join(' ; ') }))}</p>` : ''}
      <p class="mt-small">${esc(p.mode === 'full' ? t(['Calcul complet : relief Terrarium + sommets OSM{o} + obstacles de l’AIRAC {c} ; + 1000 ft (2000 ft au-delà de 5000 ft), centaine supérieure.', 'Full calculation: Terrarium terrain + OSM peaks{o} + AIRAC {c} obstacles.'], { c: p.cycle, o: p.peaksOk === false ? t([' (indisponibles : relief majoré de 100 m)', ' (unavailable: terrain +100 m)']) : '' }) : t(['Recalcul simple : obstacles de l’AIRAC {c}, relief du mora.csv conservé ; + 1000 ft (2000 ft au-delà de 5000 ft), centaine supérieure.', 'Simple recalculation: AIRAC {c} obstacles, terrain kept.'], { c: p.cycle }))}</p>`;
  }
  async function writeMora() {
    try {
      const dir = await folder('__sia', true);
      if (!dir) throw new Error(t(['dossier non autorisé', 'folder not authorised']));
      const old = await fileAt(dir, 'mora.csv');
      if (old) await writeAt(dir, `_archives/mora_${moraPlan.previousCycle || new Date(old.lastModified).toISOString().slice(0, 10)}.csv`, await old.arrayBuffer());
      await writeAt(dir, 'mora.csv', moraPlan.csv);
      const patched = await window.SiaBase.patch({ moraCells: moraPlan.cells });
      moraPlan.written = true;
      moraMsg = pill('ok', t(['mora.csv écrit{b} — à committer', 'mora.csv written{b} — commit it'], { b: patched ? t([' et base du studio mise à jour', ' and studio base updated']) : '' }));
      window.LocalStore?.logEvent?.({ kind: 'mora', source: dir.name + '/mora.csv', airac: moraPlan.cycle, files: 1, keys: { added: [], updated: [`${moraPlan.changes.length} cellule(s)`] } });
      await scanSiaFolder(false);
      baseSummary = await window.SiaBase.summary();
    } catch (e) { moraMsg = pill('err', e.message); }
    renderSia(); renderVersions(); renderDeps();
  }
  async function usageCheck() {
    const box = document.getElementById('mtUsage');
    box.innerHTML = `<p class="mt-small">${esc(t(['Contrôle…', 'Checking…']))}</p>`;
    const b = await window.SiaBase.get();
    const out = [];
    const types = typeSet();
    const perf = window.AIRCRAFT_PERF || {};
    // terrains des missions du registre présents dans l'AIXM
    const ads = new Set((b?.aero?.aerodromes || []).map(a => a.code || a.icao || a.id).filter(Boolean));
    const reg = readJson('missionRegistry:v1', null)?.missions || [], regUrl = new URL('apps/sia/mission_registry.html', root()).href;
    const regEmpty = pill('info', t(['registre des missions vide dans ce navigateur : ouvrir le Registre des missions (il relit data/missions), puis « Contrôler à nouveau »', 'mission registry empty in this browser: open the Mission registry (it re-reads data/missions), then “Check again”'])) + ` <a class="mt-link" href="${esc(regUrl)}" target="_blank" rel="noopener">${esc(t(['Registre des missions', 'Mission registry']))}</a>`;
    const used = [...new Set(reg.flatMap(m => [m.origin, m.destination]).map(s => /\(([A-Z]{4})\)|\b(LF[A-Z]{2})\b/.exec(s || '')).filter(Boolean).map(m => m[1] || m[2]))];
    const missingAd = ads.size ? used.filter(c => !ads.has(c)) : [];
    out.push([t(['Terrains des missions du registre', 'Registry mission aerodromes']), !b ? pill('info', t(['base SIA absente : étape 4', 'no SIA base: step 4'])) : !reg.length ? regEmpty : !used.length ? pill('info', t(['{n} mission(s), aucun code OACI « (LFxx) » dans leurs terrains', '{n} mission(s), no “(LFxx)” ICAO code in their aerodromes'], { n: reg.length })) : missingAd.length ? pill('warn', t(['{n}/{m} absents de l’AIXM : {l}', '{n}/{m} not in AIXM: {l}'], { n: missingAd.length, m: used.length, l: missingAd.join(', ') })) : pill('ok', t(['{m} terrain(s) présents dans l’AIXM', '{m} aerodrome(s) found in AIXM'], { m: used.length }))]);
    // espaces
    const info = window.SiaBase.info();
    out.push([t(['Espaces (base du studio)', 'Airspace (studio base)']), info ? pill(info.mixed ? 'err' : 'ok', t(['{n} espaces, cycle {c}', '{n} airspaces, cycle {c}'], { n: info.counts?.airspaces ?? '?', c: info.airac })) : pill('info', '—')]);
    // appareils et flotte
    const fleet = window.DEFA_FLEET || [];
    const fleetTypes = [...new Set(fleet.map(r => r.type).filter(Boolean))];
    const unknown = fleetTypes.filter(x => !knownType(types, x));
    const noPerf = fleetTypes.filter(x => !hasPerf(x));
    out.push([t(['Flotte DEFA → types OACI', 'DEFA fleet → ICAO types']), unknown.length ? pill('warn', t(['inconnus : {l}', 'unknown: {l}'], { l: unknown.join(', ') })) : pill('ok', t(['{n} types, {a} appareils', '{n} types, {a} aircraft'], { n: fleetTypes.length, a: fleet.length }))]);
    // Performances : APD (Eurocontrol, surtout civils) ou profil du planificateur ; seul « aucune des deux » est à traiter.
    const profTypes = new Set(Object.values(readJson('flightPerfState', {})?.profiles || {}).map(p => String(p?.icao || '').toUpperCase()).filter(Boolean));
    const noneAtAll = noPerf.filter(x => !profTypes.has(String(x).toUpperCase()));
    out.push([t(['Flotte DEFA → performances', 'DEFA fleet → performance']), `${pill('info', t(['APD : {a}/{m} types (base Eurocontrol, surtout civile)', 'APD: {a}/{m} types (Eurocontrol, mostly civil)'], { a: fleetTypes.length - noPerf.length, m: fleetTypes.length }))} ${pill('info', t(['profils du planificateur : {p} type(s)', 'planner profiles: {p} type(s)'], { p: fleetTypes.filter(x => profTypes.has(String(x).toUpperCase())).length }))} ${noneAtAll.length ? pill('warn', t(['{n} type(s) sans aucune performance (ni APD ni profil) : {l} — à couvrir dans le planificateur si ces appareils volent', '{n} type(s) with no performance at all (no APD, no profile): {l}'], { n: noneAtAll.length, l: noneAtAll.join(', ') })) : pill('ok', t(['tous couverts', 'all covered']))}`]);
    const profs = Object.values(readJson('flightPerfState', {})?.profiles || {});
    const profUnknown = profs.filter(p => p?.icao && !knownType(types, p.icao));
    out.push([t(['Profils du planificateur', 'Planner profiles']), profUnknown.length ? pill('warn', t(['types hors base : {l}', 'types outside base: {l}'], { l: profUnknown.map(p => p.icao).join(', ') })) : pill('ok', t(['{n} profil(s)', '{n} profile(s)'], { n: profs.length }))]);
    const regTypes = [...new Set(reg.flatMap(m => m.aircraftTypes || []))];
    out.push([t(['Missions du registre → types', 'Registry missions → types']), !reg.length ? regEmpty : regTypes.length ? pill('info', t(['{n} type(s) : {l}', '{n} type(s): {l}'], { n: regTypes.length, l: regTypes.slice(0, 12).join(', ') + (regTypes.length > 12 ? '…' : '') })) : pill('info', t(['aucun type d’appareil renseigné dans les missions', 'no aircraft type in the missions']))]);
    box.innerHTML = `<table class="mt-table"><tbody>${out.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</tbody></table>
      <p class="mt-small">${esc(t(['Mise à jour des bases (indépendantes de l’AIRAC) :', 'Updating the databases (AIRAC-independent):']))} <code>python AircraftDB/update_fleet.py Flotte.html</code> · <code>python AircraftDB/update_aircraft_db.py --apd</code></p>
      <p class="row"><button type="button" class="secondary" id="mtUsageRun" data-icon="refresh">${esc(t(['Contrôler à nouveau', 'Check again']))}</button></p>`;
    box.querySelector('#mtUsageRun').onclick = usageCheck;
    window.AppFramework?.refresh?.();
  }

  // ===== 5. Sauvegarde totale
  const EXTRA = 'suiteBackupSources:v1';
  const SOURCES = () => [
    // v3 : tout le dépôt de données (data/) — registres, missions, références, SIA hors XML AIRAC, performances
    { id: 'data', key: '__data', label: ['Dépôt de données (data/ : registres, missions, références, SIA, performances)', 'Data repository (data/: ledgers, missions, references, SIA, performance)'], recursive: true, include: /\.(ya?ml|md|txt|csv|json|js|xml|fms|lnmperf)$/i, heavy: /\.(png|svg|zip|pdf)$|^(AIXM4\.5|XML_SIA_|sia-airspaces-).*\.xml$/i, skipHeavyXml: true },
    { id: 'landing', key: '__xplane', label: ['Journaux d’atterrissage (dossier X-Plane)', 'Landing logs (X-Plane folder)'], recursive: false, include: /\.(csv|log)$/i },
    { id: 'perf', key: '__perf', label: ['Profils de performance (s’il est hors de data/)', 'Performance profiles (if outside data/)'], recursive: false, include: /\.(lnmperf|json)$/i },
    ...(readJson(EXTRA, []) || []).map(x => ({ ...x, include: new RegExp(x.pattern || '.', 'i'), extra: true }))
  ];
  let backupMsg = '', restorePlan = null, sinceHtml = '';
  const opts = () => ({ heavy: !!document.getElementById('mtHeavy')?.checked, off: readJson('suiteBackupOff:v1', []) || [] });
  /** Fichiers d'une source (dossier autorisé) ; null si le dossier n'est pas choisi / autorisé. */
  async function sourceFiles(src, { heavy = false, request = false } = {}) {
    const dir = await folder(src.key, request);
    if (!dir) return null;
    if (src.paths) {
      const out = [];
      for (const p of src.paths) { const f = await fileAt(dir, p); if (f) out.push({ path: p, file: f }); }
      for (const d of src.dirs || []) {
        try { const h = await d.dir.split('/').reduce(async (a, b) => (await a).getDirectoryHandle(b), Promise.resolve(dir)); out.push(...await listFiles(h, { filter: (p, n) => d.include.test(n), base: d.dir + '/' })); } catch { /* absent */ }
      }
      return { dir, files: out };
    }
    const files = await listFiles(dir, { recursive: src.recursive, filter: (p, n) => (src.skipHeavyXml && src.heavy?.test(n)) ? heavy : (src.include.test(n) || (heavy && src.heavy?.test(n))) });
    return { dir, files };
  }
  async function renderBackup() {
    const host = hosts.backup, o = opts(), journal = window.LocalStore?.journal?.() || [];
    // dossiers ajoutés : déclarés à FileAccess (libellé et infobulle des boutons)
    for (const x of readJson(EXTRA, []) || []) if (window.FileAccess && !window.FileAccess.FOLDERS[x.key]) window.FileAccess.FOLDERS[x.key] = { label: x.label, expect: x.label };
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
        const del = document.createElement('button'); del.type = 'button'; del.className = 'secondary'; del.textContent = '×'; del.title = t(['Retirer', 'Remove']);
        del.onclick = () => { writeJson(EXTRA, (readJson(EXTRA, []) || []).filter(x => x.id !== src.id)); renderBackup(); };
        row.append(del);
      }
      box.append(row);
    }
    box.querySelectorAll('input[data-src]').forEach(x => x.onchange = () => { const off = new Set(opts().off); x.checked ? off.delete(x.dataset.src) : off.add(x.dataset.src); writeJson('suiteBackupOff:v1', [...off]); });
    host.querySelector('#mtAddSource').onclick = addSource;
    host.querySelector('#mtBackup').onclick = fullBackup;
    host.querySelector('#mtSince').onclick = changesSince;
    host.querySelector('#mtRestoreZip').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) planRestore(f); };
    host.querySelector('#mtRestoreGo')?.addEventListener('click', runRestore);
    window.AppFramework?.refresh?.();
  }
  async function addSource() {
    const label = prompt(t(['Nom de ce dossier (ex. « Journaux d’atterrissage du plugin »)', 'Name of this folder (e.g. “Plugin landing logs”)']));
    if (!label) return;
    const pattern = prompt(t(['Fichiers à inclure (expression régulière sur le nom) :', 'Files to include (regular expression on the name):']), '\\.(csv|ya?ml|json|md|txt|fms|lnmperf)$');
    if (pattern == null) return;
    try { new RegExp(pattern); } catch { alert(t(['Expression invalide', 'Invalid expression'])); return; }
    const id = 'x' + Date.now().toString(36), key = `__backup_${id}`;
    try {
      window.FileAccess.FOLDERS[key] = { label: [label, label, label, label], expect: [label, label, label, label] };
      await window.FileAccess.pickFolder(key);
      writeJson(EXTRA, [...(readJson(EXTRA, []) || []), { id, key, label: [label, label, label, label], pattern, recursive: true }]);
    } catch (e) { if (e?.name !== 'AbortError') alert(e.message); }
    renderBackup();
  }
  /** Inventaire courant de toutes les sources actives : [{ source, label, dir, files: [{ path, file }] }] ; missing : sources sans dossier. */
  async function inventory(request) {
    const o = opts(), out = [], missing = [];
    for (const src of SOURCES()) {
      if (o.off.includes(src.id)) continue;
      const r = await sourceFiles(src, { heavy: o.heavy, request });
      if (!r) { missing.push(t(src.label)); continue; }
      out.push({ source: src.id, label: t(src.label), folder: r.dir.name, files: r.files });
    }
    return { sources: out, missing };
  }
  async function fullBackup() {
    const msg = document.getElementById('mtBackupMsg');
    const say = h => { backupMsg = h; if (msg) msg.innerHTML = h; };
    try {
      say(t(['Inventaire des dossiers…', 'Listing folders…']));
      const LS = await waitFor('LocalStore');
      if (!LS?.toText) throw new Error('browser_store.js');
      const { sources, missing } = await inventory(true);
      const browser = await LS.toText();
      const files = [], zipFiles = [];
      zipFiles.push({ name: 'navigateur/defa_local_store.yaml', data: browser.text });
      let bytes = browser.text.length, n = 0, total = sources.reduce((a, s) => a + s.files.length, 0);
      for (const s of sources) for (const f of s.files) {
        n++;
        if (n % 10 === 0) say(t(['Lecture {n}/{m}…', 'Reading {n}/{m}…'], { n, m: total }));
        const data = new Uint8Array(await f.file.arrayBuffer());
        const sha = await window.ZipStore.sha256(data);
        files.push({ source: s.source, path: f.path, size: data.length, lastModified: new Date(f.file.lastModified).toISOString(), sha256: sha });
        zipFiles.push({ name: `${s.source}/${f.path}`, data, date: f.file.lastModified });
        bytes += data.length;
      }
      const SU = window.SuiteUpdate, g = SU?.gitInfo?.(), A = window.Airac;
      const createdAt = new Date().toISOString();
      const manifest = {
        schema: 'xplane-web-suite-backup', version: 1, createdAt,
        suite: window.REPOSITORY_TREE?.release || {}, git: g ? { branch: g.branch, head: g.head } : null,
        airac: { effective: A.cycle().date, base: window.SiaBase.info()?.airac || '' }, origin: location.origin,
        browser: { file: 'navigateur/defa_local_store.yaml', entries: browser.count, savedAt: browser.savedAt },
        sources: sources.map(s => ({ id: s.source, label: s.label, folder: s.folder, files: s.files.length })), missing, files
      };
      zipFiles.unshift({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
      zipFiles.push({ name: 'LISEZMOI.txt', data: `Sauvegarde totale — XPlane Web Suite ${manifest.suite.version || ''}\r\nCréée le ${createdAt} depuis ${location.origin}\r\n\r\nnavigateur/defa_local_store.yaml : données locales du navigateur (menu ☰ › Données locales › Restaurer, ou Paramètres › Maintenance › Recharger une sauvegarde totale).\r\n<source>/<chemin> : fichiers des dossiers autorisés (${sources.map(s => `${s.source} = ${s.folder}`).join(', ')}).\r\nmanifest.json : liste des fichiers, tailles, dates et empreintes SHA-256.\r\n` });
      say(t(['Compression…', 'Compressing…']));
      const blob = await window.ZipStore.build(zipFiles);
      const name = `suite_sauvegarde_${createdAt.slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1_')}.zip`;
      const store = await folder('__store', true);
      let where;
      if (store) { await writeAt(store, `sauvegardes/${name}`, blob); where = `${store.name}/sauvegardes/${name}`; }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); where = t(['téléchargée : {n}', 'downloaded: {n}'], { n: name }); }
      LS.logEvent({ kind: 'full-backup', source: where, files: files.length, bytes: blob.size, entries: browser.count, missing, manifest: files.map(f => ({ s: f.source, p: f.path, h: f.sha256.slice(0, 16), z: f.size })) });
      say(pill('ok', t(['Sauvegarde totale écrite ({w}) : {n} fichiers + navigateur ({e} entrées), {s}', 'Full backup written ({w}): {n} files + browser ({e} entries), {s}'], { w: where, n: files.length, e: browser.count, s: fmtSize(blob.size) })) + (missing.length ? `<br>${pill('warn', t(['dossiers non choisis / non autorisés : {l}', 'folders not chosen / not authorised: {l}'], { l: missing.join(', ') }))}` : ''));
      renderJournal(); renderVersions();
    } catch (e) { say(pill('err', e.message)); }
  }
  async function changesSince() {
    const box = document.getElementById('mtSinceBox');
    const last = (window.LocalStore?.journal?.() || []).find(e => e.kind === 'full-backup' && e.manifest);
    if (!last) { sinceHtml = pill('info', t(['aucune sauvegarde totale tracée', 'no traced full backup'])); if (box) box.innerHTML = sinceHtml; return; }
    if (box) box.innerHTML = t(['Comparaison…', 'Comparing…']);
    const { sources } = await inventory(true);
    const before = new Map(last.manifest.map(f => [`${f.s}/${f.p}`, f])), seen = new Set(), changed = [], added = [];
    for (const s of sources) for (const f of s.files) {
      const k = `${s.source}/${f.path}`, old = before.get(k);
      seen.add(k);
      if (!old) { added.push(k); continue; }
      if (old.z !== f.file.size || (await window.ZipStore.sha256(await f.file.arrayBuffer())).slice(0, 16) !== old.h) changed.push(k);
    }
    const removed = [...before.keys()].filter(k => !seen.has(k));
    const pending = Number(localStorage.getItem('defaLocalStore:pending') || 0);
    const list = (arr, cls) => arr.slice(0, 40).map(x => `<code class="${cls}">${esc(x)}</code>`).join(' ') + (arr.length > 40 ? ` … (+${arr.length - 40})` : '');
    sinceHtml = `<p>${esc(t(['Depuis le {d}', 'Since {d}'], { d: fmtDate(last.at) }))} : ${!changed.length && !added.length && !removed.length ? pill('ok', t(['fichiers identiques', 'files unchanged'])) : pill('warn', t(['{c} modifié(s), {a} nouveau(x), {r} disparu(s)', '{c} changed, {a} new, {r} gone'], { c: changed.length, a: added.length, r: removed.length }))} · ${esc(t(['navigateur : {n} modification(s) non sauvegardée(s)', 'browser: {n} unsaved change(s)'], { n: pending }))}</p>
      ${changed.length ? `<p>${list(changed, 'mt-chg')}</p>` : ''}${added.length ? `<p>${list(added, 'mt-plus')}</p>` : ''}${removed.length ? `<p>${list(removed, 'mt-minus')}</p>` : ''}`;
    if (box) box.innerHTML = sinceHtml;
  }
  async function planRestore(file) {
    const box = document.getElementById('mtRestore');
    try {
      if (box) box.innerHTML = t(['Lecture de l’archive…', 'Reading the archive…']);
      const entries = await window.ZipStore.read(file);
      const byName = new Map(entries.map(e => [e.name, e]));
      const mf = byName.get('manifest.json');
      if (!mf) throw new Error(t(['manifest.json absent : ce n’est pas une sauvegarde totale', 'manifest.json missing: not a full backup']));
      const manifest = JSON.parse(await mf.text());
      const srcs = new Map(SOURCES().map(s => [s.id, s]));
      const items = [];
      for (const f of manifest.files || []) {
        const src = srcs.get(f.source), dir = src ? await folder(src.key, true) : null;
        const cur = dir ? await fileAt(dir, f.path) : null;
        let state = 'nofolder';
        if (dir) {
          if (!cur) state = 'missing';
          else if (cur.size === f.size && (await window.ZipStore.sha256(await cur.arrayBuffer())) === f.sha256) state = 'same';
          else state = cur.lastModified > Date.parse(f.lastModified) ? 'newer' : 'older';
        }
        items.push({ ...f, state, folder: dir?.name || '', curModified: cur?.lastModified || 0, pick: state === 'missing' || state === 'older' });
      }
      restorePlan = { file: file.name, manifest, entries: byName, items, browser: !!byName.get('navigateur/defa_local_store.yaml') };
    } catch (e) { restorePlan = null; if (box) box.innerHTML = pill('err', e.message); return; }
    renderBackup();
  }
  function restoreHtml(p) {
    const lbl = { same: pill('ok', t(['identique', 'identical'])), missing: pill('warn', t(['absent du disque', 'missing on disk'])), older: pill('warn', t(['plus ancien sur le disque', 'older on disk'])), newer: pill('info', t(['plus récent sur le disque', 'newer on disk'])), nofolder: pill('err', t(['dossier non autorisé', 'folder not authorised'])) };
    const counts = p.items.reduce((a, i) => (a[i.state] = (a[i.state] || 0) + 1, a), {});
    return `<p><b>${esc(p.file)}</b> — ${esc(fmtDate(p.manifest.createdAt))} · ${esc(p.manifest.suite?.version || '')} · AIRAC ${esc(p.manifest.airac?.base || '?')} · ${Object.entries(counts).map(([k, v]) => `${v} ${lbl[k]}`).join(' ')}</p>
      <p><label class="mt-radio"><input type="checkbox" id="mtRestoreBrowser" ${p.browser ? 'checked' : 'disabled'}> ${esc(t(['Données du navigateur : fusion (la valeur la plus récente l’emporte), tracée dans le journal', 'Browser data: merge (newest value wins), traced in the journal']))} (${esc(p.manifest.browser?.entries ?? '?')} ${esc(t(['entrées', 'entries']))}, ${esc(fmtDate(p.manifest.browser?.savedAt))})</label></p>
      <div class="mt-scroll mt-short"><table class="mt-table mt-wide"><thead><tr><th></th><th>${esc(t(['Fichier', 'File']))}</th><th>${esc(t(['Sauvegarde', 'Backup']))}</th><th>${esc(t(['Disque', 'Disk']))}</th><th>${esc(t(['État', 'State']))}</th></tr></thead><tbody>
      ${p.items.map((i, k) => `<tr><td><input type="checkbox" data-restore="${k}" ${i.pick ? 'checked' : ''} ${i.state === 'nofolder' || i.state === 'same' ? 'disabled' : ''}></td><td><code>${esc(i.source)}/${esc(i.path)}</code></td><td>${esc(fmtDate(i.lastModified))}</td><td>${i.curModified ? esc(fmtDate(i.curModified)) : '—'}</td><td>${lbl[i.state]}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="row"><button type="button" class="primary" id="mtRestoreGo" data-icon="upload">${esc(t(['Restaurer la sélection', 'Restore selection', 'Auswahl wiederherstellen', 'Restaurar la selección']))}</button></p>`;
  }
  async function runRestore() {
    const p = restorePlan, box = document.getElementById('mtRestore');
    const picks = [...document.querySelectorAll('input[data-restore]')].filter(x => x.checked).map(x => p.items[+x.dataset.restore]);
    const withBrowser = document.getElementById('mtRestoreBrowser')?.checked;
    if (!picks.length && !withBrowser) return;
    if (!confirm(t(['Restaurer {n} fichier(s){b} ? Les fichiers remplacés sont d’abord copiés dans _avant_restauration/ de leur dossier.', 'Restore {n} file(s){b}? Replaced files are first copied into _avant_restauration/ in their folder.'], { n: picks.length, b: withBrowser ? t([' et les données du navigateur', ' and browser data']) : '' }))) return;
    const done = [], errors = [], stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const srcs = new Map(SOURCES().map(s => [s.id, s]));
    for (const i of picks) {
      try {
        const dir = await folder(srcs.get(i.source).key, true);
        const cur = await fileAt(dir, i.path);
        if (cur) await writeAt(dir, `_avant_restauration/${stamp}/${i.path}`, await cur.arrayBuffer());
        await writeAt(dir, i.path, await p.entries.get(`${i.source}/${i.path}`).bytes());
        done.push(`${i.source}/${i.path}`);
      } catch (e) { errors.push(`${i.path} : ${e.message}`); }
    }
    let counts = null;
    if (withBrowser) counts = await window.LocalStore.restoreText(await p.entries.get('navigateur/defa_local_store.yaml').text(), { source: `${p.file} (sauvegarde totale du ${p.manifest.createdAt})` });
    window.LocalStore.logEvent({ kind: 'full-restore', source: p.file, savedAt: p.manifest.createdAt, files: done.length, errors: errors.length, added: counts?.added || 0, updated: counts?.updated || 0, keys: { added: [], updated: done.slice(0, 80) } });
    restorePlan = null;
    if (box) box.innerHTML = '';
    backupMsg = pill(errors.length ? 'warn' : 'ok', t(['{n} fichier(s) restauré(s){b}', '{n} file(s) restored{b}'], { n: done.length, b: counts ? t([' ; navigateur : {a} ajoutées, {u} mises à jour', '; browser: {a} added, {u} updated'], { a: counts.added, u: counts.updated }) : '' })) + (errors.length ? `<br>${esc(errors.join(' · '))}` : '');
    renderBackup(); renderJournal(); renderVersions();
  }

  // ===== 6. Journal
  function renderJournal() {
    const host = hosts.journal, list = window.LocalStore?.journal?.() || [];
    const K = { restore: t(['Rechargement des données locales', 'Local data reload']), 'full-backup': t(['Sauvegarde totale', 'Full backup']), 'full-restore': t(['Restauration d’une sauvegarde totale', 'Full backup restore']), 'sia-extract': t(['Extraction export SIA', 'SIA export extraction']), 'sia-archive': t(['Archivage anciens cycles', 'Old cycles archived']), mora: t(['Recalcul MORA', 'MORA recalculation']) };
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
  const airportsUrl = () => window.RepositoryNav?.source?.('airports') || AIRPORTS_DEFAULT;
  /** Adresse de purge jsDelivr (purge.jsdelivr.net) d'un fichier servi par cdn.jsdelivr.net ; '' pour une autre source. */
  const jsdelivrPurgeUrl = url => /^https:\/\/cdn\.jsdelivr\.net\//.test(url) ? url.replace('https://cdn.jsdelivr.net/', 'https://purge.jsdelivr.net/') : '';
  const lsBytes = key => { try { const v = localStorage.getItem(key); return v == null ? 0 : (key.length + v.length) * 2; } catch { return 0; } };
  const lsCount = key => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0; } catch { return 0; } };
  const lsDrop = keys => keys.forEach(k => { try { localStorage.removeItem(k); } catch { /* stockage indisponible */ } });
  /** Recharge depuis le serveur (cache: 'reload') les scripts, styles et repository_tree de la page : le cache HTTP du navigateur est remplacé. */
  async function refreshAppFiles() {
    const urls = [...new Set([...document.scripts].map(x => x.src).concat([...document.querySelectorAll('link[rel="stylesheet"]')].map(x => x.href)).filter(u => u && new URL(u, location.href).origin === location.origin))];
    let ok = 0, missing = 0;   // absents (404) : fichiers de data/ facultatifs, remplacés par examples/
    await Promise.all(urls.map(u => fetch(u, { cache: 'reload' }).then(r => { if (r.ok) ok++; else if (r.status === 404) missing++; }).catch(() => {})));
    if ('caches' in window) { try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* file:// */ } }
    return { ok, total: urls.length - missing };
  }
  const CACHES = () => [
    { id: 'airports', icon: 'map', label: ['Aérodromes utilisés', 'Aerodromes used', 'Verwendete Flugplätze', 'Aeródromos usados'],
      where: 'localStorage missionAirports:v1',
      state: () => t(['{n} terrains, {s}', '{n} aerodromes, {s}'], { n: lsCount('missionAirports:v1'), s: fmtSize(lsBytes('missionAirports:v1')) }),
      after: ['Relus dans la base mondiale au prochain usage ; les terrains importés d’un OFP hors base sont à réimporter.', 'Read again from the world base when next used; aerodromes imported from an OFP outside the base must be re-imported.'],
      purge: async () => { lsDrop(['missionAirports:v1']); return t(['Aérodromes oubliés.', 'Aerodromes cleared.']); } },
    { id: 'world', icon: 'link', label: ['Base mondiale des aérodromes (jsDelivr)', 'World aerodrome base (jsDelivr)', 'Weltweite Flugplatzbasis (jsDelivr)', 'Base mundial de aeródromos (jsDelivr)'],
      where: airportsUrl(),
      state: () => jsdelivrPurgeUrl(airportsUrl()) ? t(['CDN : branche gardée ≈ 12 h ; navigateur : cache HTTP', 'CDN: branch kept ≈ 12 h; browser: HTTP cache']) : t(['source hors jsDelivr : cache HTTP du navigateur', 'non-jsDelivr source: browser HTTP cache']),
      after: ['Purge du CDN demandée à purge.jsdelivr.net, puis fichier rechargé depuis le serveur (cache HTTP remplacé).', 'CDN purge requested from purge.jsdelivr.net, then the file is reloaded from the server (HTTP cache replaced).'],
      purge: async () => {
        const url = airportsUrl(), purgeUrl = jsdelivrPurgeUrl(url);
        if (purgeUrl) await fetch(purgeUrl, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
        const r = await fetch(url, { cache: 'reload' }).catch(() => null);
        return r?.ok ? t(['Base mondiale rechargée{p}.', 'World base reloaded{p}.'], { p: purgeUrl ? t([' (purge CDN demandée)', ' (CDN purge requested)']) : '' }) : { warn: t(['Base mondiale injoignable (hors ligne ?).', 'World base unreachable (offline?).']) };
      } },
    { id: 'sia', icon: 'database', label: ['Base SIA analysée', 'Analysed SIA base', 'Analysierte SIA-Basis', 'Base SIA analizada'],
      where: 'IndexedDB sia-map-parser + localStorage siaBaseInfo:v1',
      state: () => baseSummary ? t(['AIRAC {c}, lue le {d}', 'AIRAC {c}, read {d}'], { c: baseSummary.airac || '?', d: fmtDate(baseSummary.cachedAt) }) : t(['vide', 'empty']),
      after: ['À relire depuis le dossier SIA (studio, ou étape 4 de la mise à jour SIA) ; la base précédente (comparaison) est gardée.', 'To be read again from the SIA folder (studio, or step 4 of the SIA update); the previous base (comparison) is kept.'],
      confirm: ['La base SIA devra être relue depuis le dossier SIA (quelques dizaines de secondes). Purger ?', 'The SIA base will have to be read again from the SIA folder (a few tens of seconds). Purge?'],
      purge: async () => { await window.SiaBase?.purge?.(); return t(['Base SIA purgée.', 'SIA base purged.']); } },
    { id: 'update', icon: 'refresh', label: ['Contrôle des mises à jour', 'Update check', 'Update-Prüfung', 'Control de actualizaciones'],
      where: 'localStorage suiteUpdateCheck:v1, suiteGitInfo:v1',
      state: () => { const c = window.SuiteUpdate?.last?.(); return c?.at ? t(['dernier contrôle {d}', 'last check {d}'], { d: fmtDate(c.at) }) : t(['aucun', 'none']); },
      after: ['Canal distant et état git relus au prochain contrôle (réglages du canal conservés).', 'Remote channel and git state read again at the next check (channel settings kept).'],
      purge: async () => { lsDrop(['suiteUpdateCheck:v1', 'suiteGitInfo:v1']); gitState = null; return t(['Contrôle oublié.', 'Check cleared.']); } },
    { id: 'files', icon: 'layers', label: ['Fichiers de l’application (cache HTTP)', 'Application files (HTTP cache)', 'Anwendungsdateien (HTTP-Cache)', 'Archivos de la aplicación (caché HTTP)'],
      where: t(['scripts et styles de la page (?v=…), repository_tree', 'page scripts and styles (?v=…), repository_tree']),
      state: () => t(['version de cache {v}', 'cache version {v}'], { v: /[?&]v=(\w+)/.exec([...document.scripts].map(x => x.src).find(x => /repository_nav\.js/.test(x)) || '')?.[1] || '—' }),
      after: ['Fichiers rechargés depuis le serveur, puis la page est rechargée ; les autres pages suivent la version de cache (?v=).', 'Files reloaded from the server, then the page reloads; other pages follow the cache version (?v=).'],
      reload: true,
      purge: async () => {
        if (location.protocol === 'file:') return t(['Pages ouvertes depuis le disque (file://) : fichiers lus directement, sans cache HTTP ; page rechargée.', 'Pages opened from disk (file://): files read directly, no HTTP cache; page reloaded.']);
        const r = await refreshAppFiles(), msg = t(['{ok} / {n} fichiers rechargés.', '{ok} / {n} files reloaded.'], { ok: r.ok, n: r.total });
        return r.ok < r.total ? { warn: msg } : msg;
      } }
  ];
  let cacheMsg = '';
  async function renderCaches() {
    const host = hosts.caches;
    let est = '';
    try { const e = await navigator.storage?.estimate?.(); if (e?.usage) est = t(['Stockage du site : {u} utilisés.', 'Site storage: {u} used.'], { u: fmtSize(e.usage) }); } catch { /* API absente */ }
    const list = CACHES();
    host.innerHTML = `
      <p class="mt-small">${esc(t(['Purger ne supprime aucune donnée utilisateur (registres, brouillons, profils, OFP, sauvegardes) : seulement ce qui se reconstruit seul ou se relit.', 'Purging never removes user data (registries, drafts, profiles, OFPs, backups): only what rebuilds itself or is read again.']))} ${esc(est)}</p>
      <div class="mt-scroll"><table class="mt-table mt-wide"><tbody>${list.map(c => `<tr data-cache="${esc(c.id)}"><td><b>${esc(t(c.label))}</b><br><code class="mt-small">${esc(c.where)}</code></td><td>${esc(c.state())}<br><span class="mt-small">${esc(t(c.after))}</span></td><td class="mt-nowrap"><button type="button" class="secondary" data-icon="trash">${esc(t(c.reload ? ['Recharger sans cache', 'Reload without cache', 'Ohne Cache neu laden', 'Recargar sin caché'] : ['Purger', 'Purge', 'Leeren', 'Purgar']))}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="row"><button type="button" class="primary" id="mtPurgeAll" data-icon="trash">${esc(t(['Tout purger et recharger', 'Purge all and reload', 'Alles leeren und neu laden', 'Purgar todo y recargar']))}</button></p>
      <div id="mtCacheMsg">${cacheMsg}</div>`;
    const done = async (msgs, reload) => {
      cacheMsg = pill(msgs.some(m => m?.warn) ? 'warn' : 'ok', msgs.map(m => m?.warn || m).join(' '));
      if (reload) { sessionStorage.setItem('mtCacheMsg', cacheMsg); location.reload(); return; }
      baseSummary = await window.SiaBase?.summary?.();
      renderCaches(); renderVersions(); renderSia();
    };
    host.querySelectorAll('tr[data-cache] button').forEach(btn => btn.onclick = async () => {
      const c = list.find(x => x.id === btn.closest('tr').dataset.cache);
      if (c.confirm && !window.confirm(t(c.confirm))) return;
      btn.disabled = true;
      await done([await c.purge()], c.reload);
    });
    host.querySelector('#mtPurgeAll').onclick = async e => {
      if (!window.confirm(t(['Purger tous les caches (dont la base SIA, à relire ensuite) et recharger la page ?', 'Purge all caches (including the SIA base, to be read again afterwards) and reload the page?']))) return;
      e.target.disabled = true;
      const msgs = [];
      for (const c of list) msgs.push(await c.purge());
      await done(msgs, true);
    };
    window.AppFramework?.refresh?.();
  }
  try { cacheMsg = sessionStorage.getItem('mtCacheMsg') || ''; sessionStorage.removeItem('mtCacheMsg'); } catch { /* stockage indisponible */ }

  // ===== Espace disque : place occupée par les missions (par mission, par type, total) et par le navigateur ; purge
  //       des cartes surnuméraires (absentes du YAML) et des cartes générées (régénérables depuis le YAML par le studio).
  let storageState = null;   // { rows, totals, browser } après calcul
  async function scanStorage(request) {
    const C = window.MissionRegistryCore;
    if (!C) throw new Error('shared/mission_registry.js');
    const dir = await C.missionsDir(request);
    if (!dir) throw new Error(t(['dossier des missions non autorisé : le choisir dans « Sources et dossiers »', 'missions folder not authorised: choose it in “Sources and folders”']));
    const rows = [];
    for await (const [fam, fh] of dir.entries()) {
      if (fh.kind !== 'directory' || /^[_.]/.test(fam)) continue;
      for await (const [id, mh] of fh.entries()) {
        if (mh.kind !== 'directory' || /^[_.]/.test(id)) continue;
        const u = await C.missionUsage({ h: mh, folder: `${fam}/${id}` });
        if (!u.files.some(f => /^mission.*\.ya?ml$/i.test(f.name) && !f.sub)) continue;   // pas un dossier de mission
        rows.push({ id, folder: `${fam}/${id}`, ...u.sizes, surplus: u.surplusSize, surplusList: u.surplus, mapList: u.files.filter(f => f.kind === 'maps'), pdfList: u.files.filter(f => f.kind === 'pdf') });
      }
    }
    rows.sort((a, b) => b.total - a.total);
    const totals = rows.reduce((s, r) => { for (const k of ['data', 'maps', 'surplus', 'pdf', 'versions', 'recu', 'total']) s[k] += r[k]; return s; }, { data: 0, maps: 0, surplus: 0, pdf: 0, versions: 0, recu: 0, total: 0 });
    let browser = null;
    try { browser = await navigator.storage?.estimate?.(); } catch { browser = null; }
    storageState = { rows, totals, browser, at: new Date().toISOString() };
  }
  function renderStorage() {
    const host = hosts.storage, C = window.MissionRegistryCore, B = C?.fmtBytes || (b => `${b} o`), st = storageState;
    const intro = `<p class="mt-small">${esc(t(['Dossier des missions (data/missions) : données (YAML, Markdown), cartes générées, PDF, versions précédentes, textes reçus. Les cartes se régénèrent depuis le YAML (studio) ; une carte surnuméraire n’est plus dans la liste des cartes de sa mission. Versions et textes reçus sont l’historique : ils ne sont pas purgés ici.', 'Missions folder (data/missions): data (YAML, Markdown), generated maps, PDFs, previous versions, received texts. Maps are regenerated from the YAML (studio); a surplus map is no longer in its mission’s map list. Versions and received texts are history: not purged here.']))}</p>`;
    const actions = `<p class="row"><button type="button" class="primary" id="mtStorageScan" data-icon="refresh">${esc(t(['Calculer la place utilisée', 'Compute used space', 'Belegten Platz berechnen', 'Calcular el espacio usado']))}</button>${st ? `<button type="button" class="secondary" id="mtPurgeSurplus" data-icon="trash"${st.totals.surplus ? '' : ' disabled'}>${esc(t(['Supprimer les cartes surnuméraires ({n}, {s})', 'Delete surplus maps ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.surplusList.length, 0), s: B(st.totals.surplus) }))}</button><button type="button" class="secondary" id="mtPurgeMaps" data-icon="trash"${st.totals.maps ? '' : ' disabled'}>${esc(t(['Purger toutes les cartes générées ({n}, {s})', 'Purge all generated maps ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.mapList.length, 0), s: B(st.totals.maps) }))}</button><button type="button" class="secondary" id="mtPurgePdf" data-icon="trash"${st.totals.pdf ? '' : ' disabled'}>${esc(t(['Purger les PDF ({n}, {s})', 'Purge PDFs ({n}, {s})', 'PDFs löschen ({n}, {s})', 'Purgar los PDF ({n}, {s})'], { n: st.rows.reduce((a, r) => a + r.pdfList.length, 0), s: B(st.totals.pdf) }))}</button>` : ''}<a class="mt-link" href="?m=caches">${esc(t(['Caches du navigateur →', 'Browser caches →']))}</a></p>`;
    if (!st) { host.innerHTML = intro + actions; bindStorage(); return; }
    const tot = st.totals;
    const br = st.browser ? `<p>${esc(t(['Navigateur (bases locales, caches, base SIA…) : {u} utilisés sur {q} disponibles.', 'Browser (local databases, caches, SIA base…): {u} used of {q} available.'], { u: B(st.browser.usage || 0), q: B(st.browser.quota || 0) }))}</p>` : '';
    host.innerHTML = `${intro}${actions}<p>${esc(t(['Dossier des missions : {t} ({n} missions) — données {d}, cartes {m} (dont surnuméraires {s}), PDF {p}, versions {v}, textes reçus {r}. Calculé le {at}.', 'Missions folder: {t} ({n} missions) — data {d}, maps {m} (surplus {s}), PDF {p}, versions {v}, received {r}. Computed {at}.'], { t: B(tot.total), n: st.rows.length, d: B(tot.data), m: B(tot.maps), s: B(tot.surplus), p: B(tot.pdf), v: B(tot.versions), r: B(tot.recu), at: fmtDate(st.at) }))}</p>${br}
      <div id="mtStorageTable" class="mt-scroll mt-short"></div>`;
    // tableau du framework (shared/mission_table.js) : tri par colonne, largeurs réglables, en-tête fixe
    const size = k => ({ key: k, type: 'number', format: v => v ? B(v) : '—' });
    if (window.SortedTable) window.SortedTable.render(host.querySelector('#mtStorageTable'), {
      rows: st.rows, defaultSortKey: 'total', defaultDir: -1, emptyText: t(['Aucun dossier de mission.', 'No mission folder.']),
      columns: [
        { key: 'id', label: t(['Mission', 'Mission']), html: (v, r) => `<b>${esc(v)}</b> <span class="mt-small">${esc(r.folder.split('/')[0])}</span>` },
        { ...size('data'), label: t(['Données', 'Data']) }, { ...size('maps'), label: t(['Cartes', 'Maps']) }, { ...size('surplus'), label: t(['dont surnuméraires', 'of which surplus']) },
        { ...size('pdf'), label: 'PDF' }, { ...size('versions'), label: t(['Versions', 'Versions']) }, { ...size('recu'), label: t(['Textes reçus', 'Received texts']) }, { ...size('total'), label: t(['Total', 'Total']) }
      ]
    });
    else host.querySelector('#mtStorageTable').textContent = 'shared/mission_table.js';
    bindStorage();
  }
  function bindStorage() {
    const host = hosts.storage, C = window.MissionRegistryCore, B = C?.fmtBytes;
    const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { window.AppFramework?.notify?.(e.message, 'err'); } finally { btn.disabled = false; } };
    host.querySelector('#mtStorageScan').onclick = e => busy(e.currentTarget, async () => { await scanStorage(true); renderStorage(); });
    const purge = (sel, pick, what) => { const b = host.querySelector(sel); if (b) b.onclick = e => busy(e.currentTarget, async () => {
      const list = storageState.rows.flatMap(pick), size = list.reduce((a, f) => a + f.size, 0);
      if (!list.length || !confirm(t(['Supprimer {n} fichier(s) ({s}) : {w} ? Ils se régénèrent depuis le YAML (cartes : studio ; PDF : générateur).', 'Delete {n} file(s) ({s}): {w}? They can be regenerated from the YAML (maps: studio; PDFs: generator).'], { n: list.length, s: B(size), w: what }))) return;
      const n = await C.removeFiles(list);
      window.AppFramework?.notify?.(t(['{n} fichier(s) supprimé(s), {s} libérés.', '{n} file(s) deleted, {s} freed.'], { n, s: B(size) }), 'ok');
      await scanStorage(false); renderStorage();
    }); };
    purge('#mtPurgeSurplus', r => r.surplusList, t(['cartes surnuméraires (absentes du YAML de leur mission)', 'surplus maps (not in their mission’s YAML)']));
    purge('#mtPurgeMaps', r => r.mapList, t(['toutes les cartes générées de toutes les missions', 'all generated maps of all missions']));
    purge('#mtPurgePdf', r => r.pdfList, t(['les PDF des missions (régénérés par le générateur)', 'mission PDFs (regenerated by the generator)']));
    window.AppFramework?.refresh?.();
  }
  // ---- rendu, langue, événements
  // Chaque lecture et chaque bloc isolés : une erreur (dossier illisible, base d'un autre format…) s'affiche dans son
  // bloc et en notification, sans laisser les autres blocs vides.
  const guard = async (what, fn, host) => {
    try { return await fn(); } catch (e) {
      const msg = `${what} : ${e?.message || e}`;
      console.error(msg, e);
      if (host) host.innerHTML = pill('err', msg);
      window.AppFramework?.notify?.(msg, 'err');
      return null;
    }
  };
  async function renderAll() {
    titles();
    await guard('Chargement des modules', () => Promise.all([waitFor('FileAccess'), waitFor('LocalStore'), waitFor('SuiteUpdate')]));
    await Promise.all([guard('État git', () => readGitState(false)), guard('Dossier SIA', () => scanSiaFolder(false))]);
    baseSummary = await guard('Base SIA du navigateur', () => window.SiaBase.summary());
    for (const [what, fn, host] of [['Mises à jour', renderUpdates, hosts.updates], ['Sources et dossiers', renderSources, hosts.sources], ['Mise à jour SIA', renderSia, hosts.sia], ['Sauvegarde', renderBackup, hosts.backup], ['Journal', renderJournal, hosts.journal], ['Caches', renderCaches, hosts.caches], ['Espace disque', renderStorage, hosts.storage]]) guard(what, fn, host);
    await guard('Versions et synchronisation', renderVersions, hosts.versions); await guard('Références et dépendances', renderDeps, hosts.deps);
    const want = new URLSearchParams(location.search).get('m') || location.hash.slice(1);
    if (embedded) { if (NAV[want]) showBlock(want); }
    else { const target = want && document.getElementById(want); if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 200); }
  }
  window.addEventListener('repository-language-change', renderAll);
  window.addEventListener('local-store-journal', renderJournal);
  window.addEventListener('file-access-change', () => renderSources());
  window.addEventListener('suite-sources-change', () => { renderSia(); renderVersions(); });
  window.addEventListener('local-store-restored', () => { renderVersions(); });
  // Base relue (ici par le bloc commun, ou dans le studio, autre onglet) : étapes 4 à 6 recalculées ; après une relecture, étape 5 à l'écran.
  async function baseChanged(scroll = false) {
    baseSummary = await window.SiaBase.summary();
    moraPlan = null; moraMsg = '';
    await scanSiaFolder(false);
    renderSia(); renderVersions(); renderDeps();
    if (scroll && baseSummary) document.getElementById('mt-step-5')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Filet : au retour sur l'onglet, relire le résumé s'il a changé (l'événement storage peut manquer, ex. file://).
  let lastInfo = localStorage.getItem('siaBaseInfo:v1');
  window.addEventListener('focus', () => { const cur = localStorage.getItem('siaBaseInfo:v1'); if (cur !== lastInfo) { lastInfo = cur; baseChanged(); } });
  window.addEventListener('storage', async e => {
    if (e.key === 'siaBaseInfo:v1') await baseChanged();
    if (e.key === 'suiteBackupLog:v1') renderJournal();
  });
  renderAll();
})();
