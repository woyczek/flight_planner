(() => {
  'use strict';
  // Synchronisation git du pool de données (docs/technique/INDEX_DONNEES.md § 9, étape 8) : bouton « Synchroniser » de l'en-tête,
  // affiché quand la suite est servie par le lanceur et que data/ est un dépôt git. Un clic : boîte d'envoi du
  // navigateur écrite dans le dossier (si autorisé), puis le lanceur commite les fichiers du pool au nom du trigramme
  // connecté, récupère et fusionne la branche distante (fiche par fiche en cas de conflit, la plus récente l'emporte,
  // l'autre gardée dans _conflits/), puis envoie (tools/data_sync.py, routes /__setup/sync-status et /__setup/sync).
  // Les pages relisent ensuite leurs données (index du navigateur : seuls les fichiers changés).
  // Écart avec la sauvegarde distante (data_sync.status : divergence { level, reasons }) : bouton orange (à synchroniser :
  // modifications nombreuses ou anciennes, commits à recevoir, fichiers hors du pool), rouge (alerte : data/ sans dépôt
  // git ou sans dépôt distant, fusion en cours, seuils hauts) avec les raisons en infobulle ; une alerte (ou un niveau
  // qui monte) s'affiche aussi en notification flottante, une fois par session. Jeu d'essai : rien.
  // Mode GitHub (appli sans lanceur, shared/github_data.js) : rien ici — chaque écriture est déjà un commit dans le dépôt des
  // données (un commit par fichier), il n'y a ni dépôt git local ni lanceur à interroger.
  // Chargé par repository_nav.js sur toutes les pages. API : window.SuiteSync = { status(fetch), run(), reasons() }.
  if (window.SuiteSync || !/^https?:$/.test(location.protocol) || window.GitHubData?.on?.()) return;
  const K = window.RepositoryKit,
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0];
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  const A = () => window.MissionAssignments;
  const api = (path, opts = {}) => fetch(new URL(path, location.origin), {
    ...opts,
    cache: 'no-store',
    headers: {
      'X-SOG-Setup': '1',
      ...(opts.body ? {
        'Content-Type': 'application/json'
      } : {})
    }
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  let state = null,
    busy = false;
  // Fréquence de vérification (Paramètres › Maintenance › Versions et synchronisations, réglage de ce navigateur) et
  // dernier état connu : le bouton s'affiche tout de suite avec lui, sans requête ; une seule vérification (dépôt distant
  // compris) quand la période est écoulée — git status et fetch à chaque page coûtaient 1 à 3 s au lanceur.
  const CHECK = 'syncCheck:v1',
    LAST = 'syncState:v1';
  const PERIODS = {
    page: 0,
    '30m': 30 * 60e3,
    '3d': 8 * 3600e3,
    '1d': 24 * 3600e3
  };
  const period = () => PERIODS[K?.store?.get?.(CHECK, '30m')] ?? PERIODS['30m'];
  const saved = () => {
    try {
      return JSON.parse(localStorage.getItem(LAST) || 'null');
    } catch {
      return null;
    }
  };
  const due = () => Date.now() - (saved()?.at || 0) >= period();

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'repo-sync-button secondary';
  button.hidden = true;
  if (!document.getElementById('repoSyncStyle')) document.head.insertAdjacentHTML('beforeend',
    '<style id="repoSyncStyle">.repo-sync-button{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer}.repo-sync-button[hidden]{display:none}.repo-sync-button .repo-svg{flex:none;display:block}.repo-sync-button.repo-sync-warn{box-shadow:inset 0 -3px #e39b1b}.repo-sync-button.repo-sync-alert{box-shadow:inset 0 -3px #c0392b;color:#c0392b}.repo-sync-button.busy .repo-svg{animation:repoSyncTurn 1s linear infinite}@keyframes repoSyncTurn{to{transform:rotate(360deg)}}html:not([data-skeuo]) .repo-sync-button{height:32px;border:0!important;border-radius:7px!important;padding:4px 10px!important;background:#2563eb!important;color:#fff!important;font:600 12px/1 Inter,system-ui,Segoe UI,Arial,sans-serif}html:not([data-skeuo]) .repo-sync-button:hover{background:#1d4ed8!important}@media print{.repo-sync-button{display:none!important}}@media (prefers-reduced-motion:reduce){.repo-sync-button.busy .repo-svg{animation:none}}</style>'
  );
  const place = () => {
    const tools = document.querySelector('.repo-header-tools');
    if (tools && !button.isConnected) tools.prepend(button);
  };

  /** Bouton : « Synchroniser (n) », n = modifications de ce poste + commits à recevoir ; détail en infobulle. */
  // raisons de l'écart (data_sync.divergence), en clair
  const REASONS = {
    no_repo: [
      'data/ n’est pas un dépôt git : aucune sauvegarde distante (Paramètres › Installation, « Premier lancement » : dépôt de données).',
      'data/ is not a git repository: no remote backup (Settings › Installation, “First run”: data repository).',
      'data/ ist kein Git-Repository: keine entfernte Sicherung (Einstellungen › Installation, „Erster Start“: Daten-Repository).',
      'data/ no es un repositorio git: sin copia remota (Ajustes › Instalación, «Primer inicio»: repositorio de datos).'
    ],
    no_git: ['git est absent de ce poste : data/ n’est sauvegardé nulle part.',
      'git is missing on this computer: data/ is backed up nowhere.', 'git fehlt auf diesem Rechner: data/ wird nirgends gesichert.',
      'git no está en este equipo: data/ no se respalda en ningún sitio.'
    ],
    no_remote: ['data/ n’a pas de dépôt distant : les modifications restent sur ce poste.',
      'data/ has no remote repository: changes stay on this computer.',
      'data/ hat kein entferntes Repository: Änderungen bleiben auf diesem Rechner.',
      'data/ no tiene repositorio remoto: los cambios se quedan en este equipo.'
    ],
    merging: ['Une fusion est en cours dans data/ : à terminer ou annuler à la main.',
      'A merge is in progress in data/: finish or abort it by hand.',
      'In data/ läuft eine Zusammenführung: von Hand abschließen oder abbrechen.',
      'Hay una fusión en curso en data/: terminarla o anularla a mano.'
    ],
    changes: ['{n} fichier(s) modifié(s) sur ce poste, pas encore envoyé(s).', '{n} file(s) changed on this computer, not sent yet.',
      '{n} auf diesem Rechner geänderte Datei(en), noch nicht gesendet.',
      '{n} archivo(s) modificado(s) en este equipo, aún no enviado(s).'
    ],
    age_h: ['Modification non envoyée depuis {d} jour(s).', 'Change not sent for {d} day(s).',
      'Änderung seit {d} Tag(en) nicht gesendet.', 'Cambio sin enviar desde hace {d} día(s).'
    ],
    behind: ['{n} commit(s) du dépôt distant pas encore reçu(s).', '{n} remote commit(s) not received yet.',
      '{n} entfernte Commit(s) noch nicht empfangen.', '{n} commit(s) remoto(s) aún no recibido(s).'
    ],
    ahead: ['{n} commit(s) de ce poste pas encore envoyé(s) (envoi échoué ?).',
      '{n} commit(s) of this computer not sent yet (failed push?).',
      '{n} Commit(s) dieses Rechners noch nicht gesendet (Senden fehlgeschlagen?).',
      '{n} commit(s) de este equipo aún no enviado(s) (¿envío fallido?).'
    ],
    outside: ['{n} fichier(s) modifié(s) hors des données synchronisées (ex. {f}) : « Synchroniser » ne les envoie pas.',
      '{n} file(s) changed outside the synchronised data (e.g. {f}): “Synchronise” does not send them.',
      '{n} geänderte Datei(en) außerhalb der synchronisierten Daten (z. B. {f}): „Synchronisieren“ sendet sie nicht.',
      '{n} archivo(s) modificado(s) fuera de los datos sincronizados (p. ej. {f}): «Sincronizar» no los envía.'
    ]
  };
  /** Raisons de l'écart en texte (langue de la page). */
  const reasons = () => (state?.divergence?.reasons || []).filter(r => REASONS[r.code]).map(r => tf(REASONS[r.code], {
    n: r.n ?? '',
    d: Math.round((r.n || 0) / 24),
    f: (state.outside || []).slice(0, 2).join(', ')
  }));
  const RANK = {
    none: 0,
    ok: 0,
    warn: 1,
    alert: 2
  };
  /** Alerte (ou niveau qui monte) en notification flottante, une fois par session et par jeu de raisons. */
  function warnOnce() {
    const d = state?.divergence;
    if (!d || RANK[d.level] < 1) return;
    const key = `${d.level}:${d.reasons.map(r => r.code).join(',')}`;
    let seen = '';
    try {
      seen = sessionStorage.getItem('suiteSyncDivergence:v1') || '';
    } catch {
      /* stockage indisponible */
    }
    const [lv] = seen.split(':');
    if (seen === key || (seen && RANK[lv] >= RANK[d.level])) return;
    try {
      sessionStorage.setItem('suiteSyncDivergence:v1', key);
    } catch {
      /* stockage indisponible */
    }
    notify(`${d.level === 'alert' ? t(['Sauvegarde des données en alerte', 'Data backup alert', 'Datensicherung: Warnung', 'Alerta de copia de los datos']) : t(['Données à synchroniser', 'Data to synchronise', 'Daten zu synchronisieren', 'Datos por sincronizar'])} — ${reasons().join(' ')}`, d.level === 'alert' ? 'error' : 'warn');
  }

  // contenu du bouton dernièrement écrit (libellé, compteur, pastille) : réécrit seulement s'il change
  let drawn = '';
  /** Pose le contenu du bouton (HTML) et son infobulle, seulement s'ils changent. */
  const paint = (html, title) => {
    if (html !== drawn) {
      button.innerHTML = html;
      drawn = html;
    }
    if (button.title !== title) button.title = title;
  };

  /** Dessine le bouton d'après l'état connu : alerte sans dépôt, sinon « Synchroniser » ; le nombre d'éléments à
   *  synchroniser est dans son propre élément (.repo-sync-count), doublé d'une pastille (.repo-sync-dot) : aux niveaux
   *  d'utilisation 1 et 2, repository_nav.css montre la pastille au lieu du nombre, qui reste dans l'infobulle. */
  function draw() {
    place();
    const level = state?.divergence?.level || 'ok';
    // sans dépôt : bouton seulement pour l'alerte (data/ sans sauvegarde), qui explique au lieu de synchroniser
    button.hidden = !state?.repo && level !== 'alert';
    button.classList.toggle('repo-sync-warn', level === 'warn');
    button.classList.toggle('repo-sync-alert', level === 'alert');
    if (button.hidden) return;
    if (!state.repo) {
      paint(K.esc(`⚠ ${t(['Sauvegarde', 'Backup', 'Sicherung', 'Copia'])}`), reasons().join('\n'));
      button.disabled = false;
      return;
    }
    const pending = (state.changes || 0) + (A()?.pendingData?.() || []).length,
      n = pending + (state.behind || 0) + (state.ahead || 0);
    const icon = window.RepositoryIcons?.svg('refresh');
    const html = `${icon || '⟳ '}<span class="repo-sync-label">${K.esc(t(['Synchroniser', 'Synchronise', 'Synchronisieren', 'Sincronizar']))}</span>${n ? `<span class="repo-sync-count">(${n})</span><span class="repo-sync-dot" aria-hidden="true"></span>` : ''}`;
    button.classList.toggle('busy', busy);
    button.disabled = busy;
    const last = state.last?.at ? new Date(state.last.at).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }) : t(['jamais', 'never', 'nie', 'nunca']);
    // nombre total en tête de l'infobulle : seul endroit où il se lit aux niveaux 1 et 2 (pastille)
    paint(html, (n ? tf(['{n} élément(s) à synchroniser', '{n} item(s) to synchronise', '{n} Element(e) zu synchronisieren',
      '{n} elemento(s) por sincronizar'
    ], {
      n
    }) + '\n' : '') + tf([
      'Données partagées (dépôt git {b}) : {p} modification(s) de ce poste à envoyer, {r} commit(s) à recevoir — dernière synchronisation : {l}',
      'Shared data (git repository {b}): {p} change(s) from this computer to send, {r} commit(s) to receive — last synchronisation: {l}',
      'Gemeinsame Daten (Git-Repository {b}): {p} Änderung(en) dieses Rechners zu senden, {r} Commit(s) zu empfangen — letzte Synchronisierung: {l}',
      'Datos compartidos (repositorio git {b}): {p} cambio(s) de este equipo por enviar, {r} commit(s) por recibir — última sincronización: {l}'
    ], {
      b: state.branch || '?',
      p: pending + (state.ahead || 0),
      r: state.behind || 0,
      l: last
    }) + (RANK[level] ? `\n${reasons().join('\n')}` : ''));
  }
  /** État relu au lanceur (fetch : aussi le dépôt distant, pour les commits à recevoir ; sinon relevé local, refait par
   *  le lanceur) ; gardé avec sa date (dernier état connu). */
  async function status(fetchRemote = false) {
    const s = await api(`/__setup/sync-status?${fetchRemote ? 'fetch=1' : 'fresh=1'}`);
    if (s) {
      state = s;
      try {
        localStorage.setItem(LAST, JSON.stringify({
          at: Date.now(),
          state: s
        }));
      } catch {
        /* stockage plein ou refusé : l'état reste celui de la page */
      }
    }
    draw();
    warnOnce();
    return state;
  }
  /** Un passage de synchronisation ; compte rendu du lanceur. */
  async function run() {
    if (busy) return null;
    const author = window.SuiteUsers?.effective?.() || A()?.trigram?.() || '';
    if (!author) {
      notify(t(['Synchronisation : trigramme non réglé (Paramètres › Mon profil) — il signe les modifications envoyées.',
        'Synchronisation: trigram not set (Settings › My profile) — it signs the changes sent.',
        'Synchronisierung: Kürzel nicht eingestellt (Einstellungen › Mein Profil) — es zeichnet die gesendeten Änderungen.',
        'Sincronización: trigrama no definido (Ajustes › Mi perfil) — firma los cambios enviados.'
      ]), 'warn');
      return null;
    }
    busy = true;
    draw();
    try {
      // fichiers gardés dans ce navigateur (sans dossier autorisé au moment de l'écriture) : écrits d'abord
      if ((A()?.pendingData?.() || []).length) await A().flushData().catch(e => notify(tf([
        'Boîte d’envoi du navigateur non écrite : {e}', 'Browser outbox not written: {e}',
        'Postausgang des Browsers nicht geschrieben: {e}', 'Bandeja de salida del navegador no escrita: {e}'
      ], {
        e: e?.message || e
      }), 'warn'));
      const r = await api('/__setup/sync', {
        method: 'POST',
        body: JSON.stringify({
          author
        })
      });
      if (!r) notify(t(['Synchronisation impossible : lanceur injoignable.', 'Synchronisation impossible: launcher unreachable.',
        'Synchronisierung unmöglich: Starter nicht erreichbar.', 'Sincronización imposible: lanzador inaccesible.'
      ]), 'error');
      else if (!r.ok) notify(tf(['Synchronisation interrompue : {m}', 'Synchronisation stopped: {m}',
        'Synchronisierung abgebrochen: {m}', 'Sincronización interrumpida: {m}'
      ], {
        m: r.message || '?'
      }), 'error');
      else {
        notify(tf(['Synchronisé : {c} fichier(s) envoyé(s), {r} reçu(s).', 'Synchronised: {c} file(s) sent, {r} received.',
          'Synchronisiert: {c} Datei(en) gesendet, {r} empfangen.', 'Sincronizado: {c} archivo(s) enviado(s), {r} recibido(s).'
        ], {
          c: r.committed || 0,
          r: r.received || 0
        }), 'info');
        for (const c of r.conflicts || []) notify(c.copy ? tf([
          'Conflit sur {p} : la version la plus récente est gardée, l’autre est dans {c}.',
          'Conflict on {p}: the most recent version is kept, the other is in {c}.',
          'Konflikt bei {p}: Die neueste Version bleibt, die andere liegt in {c}.',
          'Conflicto en {p}: se conserva la versión más reciente, la otra está en {c}.'
        ], {
          p: c.path,
          c: c.copy
        }) : tf(['Fusion de {p} : {n} fiche(s) modifiée(s) des deux côtés, la plus récente gardée.',
          'Merge of {p}: {n} record(s) changed on both sides, the most recent kept.',
          'Zusammenführung von {p}: {n} Eintrag/Einträge auf beiden Seiten geändert, der neueste bleibt.',
          'Fusión de {p}: {n} registro(s) cambiado(s) en ambos lados, se conserva el más reciente.'
        ], {
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
  button.onclick = () => state?.repo ? run() : notify(reasons().join(' '), 'error');
  window.SuiteSync = {
    status,
    run,
    reasons,
    /** Fréquence de vérification : 'page', '30m', '3d', '1d' (lecture, ou réglage avec une valeur). */
    checkEvery(v) {
      if (v in PERIODS) K?.store?.set?.(CHECK, v);
      return K?.store?.get?.(CHECK, '30m') || '30m';
    },
    /** Date du dernier état connu (ms) ou 0. */
    lastCheck: () => saved()?.at || 0
  };
  // dernier état connu affiché tout de suite ; vérification (dépôt distant compris) seulement si la période réglée est
  // écoulée, au chargement puis chaque minute tant que la page est visible ; après une écriture : relevé local seul
  let timer = 0;
  window.addEventListener('defa-data-change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => status(), 2000);
  });
  window.addEventListener('repository-language-change', draw);
  const last = saved();
  if (last?.state) {
    state = last.state;
    draw();
    // en-tête pas encore construit au chargement de ce script : bouton posé une fois la page prête
    if (!button.isConnected) window.addEventListener('load', draw, {
      once: true
    });
  }
  if (due()) status(true);
  setInterval(() => !busy && document.visibilityState === 'visible' && Date.now() - (saved()?.at || 0) >= Math.max(period(),
    5 * 60e3) && status(true), 60e3);
})();
