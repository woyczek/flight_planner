(() => {
  'use strict';
  // Synchronisation git du pool de données (docs/INDEX_DONNEES.md § 9, étape 8) : bouton « Synchroniser » de l'en-tête,
  // affiché quand la suite est servie par le lanceur et que data/ est un dépôt git. Un clic : boîte d'envoi du
  // navigateur écrite dans le dossier (si autorisé), puis le lanceur commite les fichiers du pool au nom du trigramme
  // connecté, récupère et fusionne la branche distante (fiche par fiche en cas de conflit, la plus récente l'emporte,
  // l'autre gardée dans _conflits/), puis envoie (tools/data_sync.py, routes /__setup/sync-status et /__setup/sync).
  // Les pages relisent ensuite leurs données (index du navigateur : seuls les fichiers changés).
  // Chargé par repository_nav.js sur toutes les pages. API : window.SuiteSync = { status(fetch), run() }.
  if (window.SuiteSync || !/^https?:$/.test(location.protocol)) return;
  const K = window.RepositoryKit,
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0];
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  const A = () => window.MissionAssignments;
  const api = (path, opts = {}) => fetch(new URL(path, location.origin), {
    ...opts,
    cache: 'no-store',
    headers: {
      'X-DEFA-Setup': '1',
      ...(opts.body ? {
        'Content-Type': 'application/json'
      } : {})
    }
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  let state = null,
    busy = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'repo-sync-button secondary';
  button.hidden = true;
  if (!document.getElementById('repoSyncStyle')) document.head.insertAdjacentHTML('beforeend', '<style id="repoSyncStyle">.repo-sync-button{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer}.repo-sync-button[hidden]{display:none}.repo-sync-button .repo-svg{flex:none;display:block}.repo-sync-button.busy .repo-svg{animation:repoSyncTurn 1s linear infinite}@keyframes repoSyncTurn{to{transform:rotate(360deg)}}html:not([data-skeuo]) .repo-sync-button{height:32px;border:0!important;border-radius:7px!important;padding:4px 10px!important;background:#2563eb!important;color:#fff!important;font:600 12px/1 Inter,system-ui,Segoe UI,Arial,sans-serif}html:not([data-skeuo]) .repo-sync-button:hover{background:#1d4ed8!important}@media print{.repo-sync-button{display:none!important}}@media (prefers-reduced-motion:reduce){.repo-sync-button.busy .repo-svg{animation:none}}</style>');
  const place = () => {
    const tools = document.querySelector('.repo-header-tools');
    if (tools && !button.isConnected) tools.prepend(button);
  };

  /** Bouton : « Synchroniser (n) », n = modifications de ce poste + commits à recevoir ; détail en infobulle. */
  function draw() {
    place();
    button.hidden = !state?.repo;
    if (button.hidden) return;
    const pending = (state.changes || 0) + (A()?.pendingData?.() || []).length,
      n = pending + (state.behind || 0) + (state.ahead || 0);
    const label = `${t(['Synchroniser', 'Synchronise', 'Synchronisieren', 'Sincronizar'])}${n ? ` (${n})` : ''}`,
      icon = window.RepositoryIcons?.svg('refresh');
    button.textContent = icon ? label : '⟳ ' + label;
    if (icon) button.insertAdjacentHTML('afterbegin', icon);
    button.classList.toggle('busy', busy);
    button.disabled = busy;
    const last = state.last?.at ? new Date(state.last.at).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }) : t(['jamais', 'never', 'nie', 'nunca']);
    button.title = tf(['Données partagées (dépôt git {b}) : {p} modification(s) de ce poste à envoyer, {r} commit(s) à recevoir — dernière synchronisation : {l}', 'Shared data (git repository {b}): {p} change(s) from this computer to send, {r} commit(s) to receive — last synchronisation: {l}', 'Gemeinsame Daten (Git-Repository {b}): {p} Änderung(en) dieses Rechners zu senden, {r} Commit(s) zu empfangen — letzte Synchronisierung: {l}', 'Datos compartidos (repositorio git {b}): {p} cambio(s) de este equipo por enviar, {r} commit(s) por recibir — última sincronización: {l}'], {
      b: state.branch || '?',
      p: pending + (state.ahead || 0),
      r: state.behind || 0,
      l: last
    });
  }
  /** État relu au lanceur (fetch : aussi le dépôt distant, pour les commits à recevoir). */
  async function status(fetchRemote = false) {
    const s = await api(`/__setup/sync-status${fetchRemote ? '?fetch=1' : ''}`);
    if (s) state = s;
    draw();
    return state;
  }
  /** Un passage de synchronisation ; compte rendu du lanceur. */
  async function run() {
    if (busy) return null;
    const author = window.SuiteUsers?.effective?.() || A()?.trigram?.() || '';
    if (!author) {
      notify(t(['Synchronisation : trigramme non réglé (Paramètres › Mon profil) — il signe les modifications envoyées.', 'Synchronisation: trigram not set (Settings › My profile) — it signs the changes sent.', 'Synchronisierung: Kürzel nicht eingestellt (Einstellungen › Mein Profil) — es zeichnet die gesendeten Änderungen.', 'Sincronización: trigrama no definido (Ajustes › Mi perfil) — firma los cambios enviados.']), 'warn');
      return null;
    }
    busy = true;
    draw();
    try {
      // fichiers gardés dans ce navigateur (sans dossier autorisé au moment de l'écriture) : écrits d'abord
      if ((A()?.pendingData?.() || []).length) await A().flushData().catch(e => notify(tf(['Boîte d’envoi du navigateur non écrite : {e}', 'Browser outbox not written: {e}', 'Postausgang des Browsers nicht geschrieben: {e}', 'Bandeja de salida del navegador no escrita: {e}'], {
        e: e?.message || e
      }), 'warn'));
      const r = await api('/__setup/sync', {
        method: 'POST',
        body: JSON.stringify({
          author
        })
      });
      if (!r) notify(t(['Synchronisation impossible : lanceur injoignable.', 'Synchronisation impossible: launcher unreachable.', 'Synchronisierung unmöglich: Starter nicht erreichbar.', 'Sincronización imposible: lanzador inaccesible.']), 'error');
      else if (!r.ok) notify(tf(['Synchronisation interrompue : {m}', 'Synchronisation stopped: {m}', 'Synchronisierung abgebrochen: {m}', 'Sincronización interrumpida: {m}'], {
        m: r.message || '?'
      }), 'error');
      else {
        notify(tf(['Synchronisé : {c} fichier(s) envoyé(s), {r} reçu(s).', 'Synchronised: {c} file(s) sent, {r} received.', 'Synchronisiert: {c} Datei(en) gesendet, {r} empfangen.', 'Sincronizado: {c} archivo(s) enviado(s), {r} recibido(s).'], {
          c: r.committed || 0,
          r: r.received || 0
        }), 'info');
        for (const c of r.conflicts || []) notify(c.copy ? tf(['Conflit sur {p} : la version la plus récente est gardée, l’autre est dans {c}.', 'Conflict on {p}: the most recent version is kept, the other is in {c}.', 'Konflikt bei {p}: Die neueste Version bleibt, die andere liegt in {c}.', 'Conflicto en {p}: se conserva la versión más reciente, la otra está en {c}.'], {
          p: c.path,
          c: c.copy
        }) : tf(['Fusion de {p} : {n} fiche(s) modifiée(s) des deux côtés, la plus récente gardée.', 'Merge of {p}: {n} record(s) changed on both sides, the most recent kept.', 'Zusammenführung von {p}: {n} Eintrag/Einträge auf beiden Seiten geändert, der neueste bleibt.', 'Fusión de {p}: {n} registro(s) cambiado(s) en ambos lados, se conserva el más reciente.'], {
          p: c.path,
          n: (c.conflicts || []).length
        }), 'warn');
        if (r.received) A()?.dataStore?.changed?.(); // toutes les pages relisent leurs données (index : fichiers changés seuls)
      }
      return r;
    } finally {
      busy = false;
      await status();
    }
  }
  button.onclick = () => run();
  window.SuiteSync = {
    status,
    run
  };
  // état au chargement (sans réseau), commits à recevoir toutes les 5 minutes, après chaque écriture (sans réseau)
  let timer = 0;
  window.addEventListener('defa-data-change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => status(), 2000);
  });
  window.addEventListener('repository-language-change', draw);
  status().then(s => s?.repo && setTimeout(() => status(true), 4000));
  setInterval(() => !busy && state?.repo && document.visibilityState === 'visible' && status(true), 5 * 60e3);
})();
