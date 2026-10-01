(() => {
  'use strict';
  // Affectations des missions aux pilotes (docs/AFFECTATION_MISSIONS.md) : socle commun, chargé sur chaque page par
  // repository_nav.js.
  //   · identité : trigramme du profil pilote (☰ › Profil pilote, missionReportingConfig:v1.trigram) ;
  //   · index des affectations : data/missions/affectations.json (écrit par le Centre, lu par fetch — pas d'autorisation de
  //     dossier côté pilote) ; une ligne par participant ; détail lisible : affectations.yaml dans le dossier de la mission ;
  //   · lu / non lu : marque locale (assignmentsRead:v1) ; pli cacheté dans l'en-tête tant qu'une affectation à venir n'est
  //     pas lue ; clic → « Mes missions » ;
  //   · disponibilités du pilote : grille jours × heures (1 h), locale (pilotAvailability:v1), enregistrée dans
  //     data/disponibilites/<TRI>.json (dossier des données) pour le Centre, qui la lit par fetch.
  //
  // API (window.MissionAssignments) : trigram(), index({ fresh }), mine(liste?, { all }), isRead(a), markRead(a),
  //   key(a), envelope(), availability(TRI), saveAvailability(TRI, grille, { toFolder }), gridEditor(hôte, grille, onChange),
  //   writeAssignment(mission, participants, extra) (Centre : dossier de la mission + index), PAGE (adresse de la page).
  if (window.MissionAssignments) return;
  const K = window.RepositoryKit;
  const PROFILE = 'missionReportingConfig:v1',
    READ = 'assignmentsRead:v1',
    AVAIL = 'pilotAvailability:v1',
    PAGE = 'apps/pilot/mes_missions.html';
  const t = row => K?.t ? K.t(row) : row[0];
  const root = () => window.RepositoryNav?.root || new URL('../', document.currentScript?.src || location.href).href;
  const json = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
    } catch {
      return d;
    }
  };
  const setJson = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* stockage indisponible */ }
  };

  /** Trigramme de l'utilisateur (profil pilote), en capitales ; '' s'il n'est pas réglé. */
  const trigram = () => String(json(PROFILE, {})?.trigram || '').trim().toUpperCase();

  let cache = null;
  /** Index des affectations (data/missions/affectations.json) : { updatedAt, assignments: [...] } ; vide si absent. */
  async function index({
    fresh = false
  } = {}) {
    if (cache && !fresh) return cache;
    try {
      const r = await fetch(new URL('data/missions/affectations.json', root()).href, {
        cache: 'no-store'
      });
      cache = r.ok ? await r.json() : {
        assignments: []
      };
    } catch {
      cache = {
        assignments: []
      };
    }
    cache.assignments = Array.isArray(cache.assignments) ? cache.assignments : [];
    return cache;
  }
  /** Clé d'une affectation (mission, pilote, date de mise à jour : une affectation modifiée redevient « non lue »). */
  const key = a => `${a.mission}|${a.pilot}|${a.updated_at || ''}`;
  /** Heure de référence d'une affectation : décollage demandé, sinon début d'astreinte. */
  const when = a => Date.parse(a.takeoff || a.alert?.ready_at_utc || '') || 0;
  /** Affectations de l'utilisateur, à venir (ou toutes : { all }) ; triées par heure. */
  function mine(list, {
    all = false
  } = {}) {
    const me = trigram(),
      now = Date.now() - 6 * 36e5; // une mission du jour reste visible quelques heures après son décollage
    return (list || cache?.assignments || []).filter(a => me && String(a.pilot).toUpperCase() === me && a.status !== 'annulée' && (all || !when(a) || when(a) >= now)).sort((x, y) => when(x) - when(y));
  }
  const isRead = a => !!json(READ, {})[key(a)];
  function markRead(a) {
    const r = json(READ, {});
    r[key(a)] = new Date().toISOString();
    setJson(READ, r);
    envelope();
  }

  // ---- pli cacheté de l'en-tête
  const ENVELOPE_SVG = '<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="1" y="1" width="38" height="26" rx="2" class="pa-paper"/><path d="M1 3 20 16 39 3" class="pa-fold"/><circle cx="20" cy="16" r="6.2" class="pa-seal"/><path d="M17 16h6M20 13v6" class="pa-seal-mark"/></svg>';
  async function envelope() {
    const tools = document.querySelector('.repo-header-tools');
    if (!tools) return;
    let b = document.getElementById('repoAssignEnvelope');
    const me = trigram();
    const list = me ? mine((await index()).assignments).filter(a => !isRead(a)) : [];
    if (!list.length) {
      b?.remove();
      return;
    }
    if (!b) {
      b = document.createElement('a');
      b.id = 'repoAssignEnvelope';
      b.className = 'repo-assign-envelope';
      b.href = new URL(PAGE, root()).href;
      tools.prepend(b);
    }
    b.innerHTML = `${ENVELOPE_SVG}<b>${list.length}</b>`;
    b.title = t([`${list.length} mission(s) affectée(s) à ${me}, non lue(s) : ouvrir « Mes missions »`, `${list.length} mission(s) assigned to ${me}, unread: open “My missions”`, `${list.length} Mission(en) für ${me}, ungelesen: „Meine Missionen“ öffnen`, `${list.length} misión(es) asignada(s) a ${me}, sin leer: abrir «Mis misiones»`]);
    b.setAttribute('aria-label', b.title);
  }
  if (!document.getElementById('repoAssignCss')) {
    const s = document.createElement('style');
    s.id = 'repoAssignCss';
    s.textContent = `.repo-assign-envelope{position:relative;display:inline-flex;align-items:center;height:32px;padding:0 4px;color:inherit;text-decoration:none}
.repo-assign-envelope svg{width:34px;height:24px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.repo-assign-envelope .pa-paper{fill:#f4f6f8;stroke:#7a8794;stroke-width:1.2}.repo-assign-envelope .pa-fold{fill:none;stroke:#7a8794;stroke-width:1.2}
.repo-assign-envelope .pa-seal{fill:#c62828;stroke:#7f1414;stroke-width:1}.repo-assign-envelope .pa-seal-mark{stroke:#ffd7d0;stroke-width:1.3}
.repo-assign-envelope b{position:absolute;top:-2px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#c62828;color:#fff;font:700 10px/16px system-ui,sans-serif;text-align:center}
@keyframes repo-assign-pulse{50%{transform:scale(1.08)}}.repo-assign-envelope svg{animation:repo-assign-pulse 2.4s ease-in-out 3}
@media (prefers-reduced-motion:reduce){.repo-assign-envelope svg{animation:none}}
html[data-skeuo] .repo-assign-envelope .pa-paper{fill:#efe3c4;stroke:#6b5228}html[data-skeuo] .repo-assign-envelope .pa-fold{stroke:#6b5228}
html[data-skeuo] .repo-assign-envelope .pa-seal{fill:#a3161a;stroke:#5e0b0d}html[data-skeuo] .repo-assign-envelope b{border-radius:0}
html[data-design="field"] .repo-assign-envelope .pa-paper{fill:#c9c2a0;stroke:#3e4a2c}html[data-design="field"] .repo-assign-envelope .pa-fold{stroke:#3e4a2c}
@media print{.repo-assign-envelope{display:none}}
.pa-grid{overflow-x:auto;user-select:none;touch-action:none}.pa-grid table{border-collapse:collapse;font:11px/1 system-ui,sans-serif}
.pa-grid th{padding:3px 4px;font-weight:600;opacity:.8;text-align:center}.pa-grid tbody th{text-align:left;padding-right:8px}
.pa-grid td{width:22px;height:20px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);background:color-mix(in srgb,currentColor 6%,transparent);cursor:pointer}
.pa-grid td{font:700 9.5px/20px system-ui,sans-serif;text-align:center}.pa-grid td:nth-child(7n+1){border-left-width:2px}
.pa-palette{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px}.pa-palette .pa-code{display:inline-flex;align-items:baseline;gap:5px;padding:3px 7px;border:2px solid transparent;border-radius:4px;font:700 11px/1.3 system-ui,sans-serif;cursor:pointer}
.pa-palette .pa-code small{font-weight:500;font-size:10.5px;opacity:.9}.pa-palette .pa-code[aria-checked=true]{border-color:currentColor;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
html[data-skeuo] .pa-palette .pa-code{border-radius:0}`;
    document.head.append(s);
  }

  // ---- disponibilités du pilote : semaine type, 7 jours × 24 heures (heures UTC), lundi en premier ; chaque case porte
  // un code de la légende de l'ODV (« Code couleur » du classeur hebdomadaire : même table que OdvCore.LEGEND,
  // apps/cpco/odv_core.js) ou '' (non renseigné). Anciennes grilles (true / false) : true → O (dispo, tout rôle).
  // Couleurs : familles de l'ODV, accordées au design par RepositoryNav.chartColor (comme les graphiques).
  const LEGEND = {
    O: ['DISPO (Tout)', 'dispo', null, '00B050'],
    SC: ['DISPO sécu civile', 'dispo', 'SECU', '2F5597'],
    C: ['DISPO Chasse FAF', 'dispo', 'CHASSE', '0070C0'],
    T: ['DISPO Transport FAF', 'dispo', 'TRANSPORT', 'F4B183'],
    S: ['Exercice IVAO SO', 'dispo', 'EXERCICE', 'FF0000'],
    N: ['DISPO FNY', 'dispo', 'FNY', '8693A0'],
    AT: ['Contrôle IVAO civil', 'atc', 'ATC', '7030A0'],
    AM: ['Contrôle IVAO SO', 'atc', 'ATC', 'C4BD97'],
    G: ['Vol IVAO hors SO', 'occupe', null, 'FFD966'],
    DC: ['Mission DCS', 'occupe', null, '002060'],
    IR: ['MANIP IRL', 'indispo', null, 'FFFF00'],
    IN: ['INDISPO', 'indispo', null, 'BFBFBF'],
    V: ['VACANCES', 'indispo', null, 'FFC000'],
    Q: ['RÉCUP', 'indispo', null, 'D9D9D9']
  };
  /** Rôles qu'un code de disponibilité couvre, par famille de mission (avertissement seulement : le Centre décide). */
  const FAMILY_ROLES = {
    COMBAT: ['CHASSE', 'EXERCICE'],
    ISR: ['CHASSE', 'EXERCICE'],
    COMMAND: ['CHASSE', 'EXERCICE'],
    AAR: ['TRANSPORT', 'EXERCICE'],
    AIRLIFT: ['TRANSPORT'],
    AIRBORNE: ['TRANSPORT'],
    HADR: ['TRANSPORT', 'SECU'],
    FIRE: ['SECU'],
    HEMS: ['SECU'],
    SAR: ['SECU', 'FNY'],
    MARITIME: ['FNY'],
    LE: ['SECU']
  };
  const DAYS = [
    ['Lun', 'Mon', 'Mo', 'Lun'],
    ['Mar', 'Tue', 'Di', 'Mar'],
    ['Mer', 'Wed', 'Mi', 'Mié'],
    ['Jeu', 'Thu', 'Do', 'Jue'],
    ['Ven', 'Fri', 'Fr', 'Vie'],
    ['Sam', 'Sat', 'Sa', 'Sáb'],
    ['Dim', 'Sun', 'So', 'Dom']
  ];
  const emptyGrid = () => DAYS.map(() => Array(24).fill(''));
  /** Grille normalisée : codes de la légende ('' : non renseigné) ; true → O, false → ''. */
  const normGrid = g => DAYS.map((_, d) => Array.from({
    length: 24
  }, (_, h) => {
    const v = g?.[d]?.[h];
    return v === true ? 'O' : typeof v === 'string' && LEGEND[v] ? v : '';
  }));
  /** Disponibilités d'un pilote : locales (son poste), sinon data/disponibilites/<TRI>.json (fetch) ; null si aucune. */
  async function availability(tri) {
    tri = String(tri || '').toUpperCase();
    const local = json(AVAIL, {})[tri];
    let doc = local?.grid ? local : null;
    if (!doc) try {
      const r = await fetch(new URL(`data/disponibilites/${encodeURIComponent(tri)}.json`, root()).href, {
        cache: 'no-store'
      });
      doc = r.ok ? await r.json() : null;
    } catch {
      doc = null;
    }
    return doc ? {
      ...doc,
      grid: normGrid(doc.grid)
    } : null;
  }
  /** Mémorise la grille (local) et, si demandé, l'écrit dans data/disponibilites/<TRI>.json (dossier des données). */
  async function saveAvailability(tri, grid, {
    toFolder = false
  } = {}) {
    tri = String(tri || '').toUpperCase();
    const doc = {
      pilot: tri,
      granularity_min: 60,
      timezone: 'UTC',
      legend: 'ODV (Code couleur)',
      updated_at: new Date().toISOString(),
      grid: normGrid(grid)
    };
    const all = json(AVAIL, {});
    all[tri] = doc;
    setJson(AVAIL, all);
    if (!toFolder) return '';
    const FA = window.FileAccess;
    const st = FA ? await FA.status('__data') : null;
    let dir = st?.handle;
    if (dir && st.permission !== 'granted' && (await dir.requestPermission({
        mode: 'readwrite'
      })) !== 'granted') dir = null;
    if (!dir) throw new Error(t(['Dossier des données non autorisé : le choisir dans Paramètres › Maintenance › Sources et dossiers.', 'Data folder not authorised: choose it in Settings › Maintenance › Sources and folders.']));
    const sub = await dir.getDirectoryHandle('disponibilites', {
      create: true
    });
    const w = await (await sub.getFileHandle(`${tri}.json`, {
      create: true
    })).createWritable();
    await w.write(JSON.stringify(doc, null, 2));
    await w.close();
    return `data/disponibilites/${tri}.json`;
  }
  /** Couleur d'un code : famille de l'ODV accordée au design (RepositoryNav.chartColor) ; encre lisible dessus. */
  const colorOf = code => {
    const c = '#' + (LEGEND[code]?.[3] || 'D9D9D9');
    return window.RepositoryNav?.chartColor?.(c) || c;
  };
  const inkOf = code => {
    const L = K?.color?.luminance?.(colorOf(code));
    return L != null && L < .35 ? '#fff' : '#1b1b1b';
  };
  /** Grille éditable (jours × heures UTC), peinte avec les codes de l'ODV : un code choisi dans la palette, clic ou
   *  glisser sur les cases ; second clic sur une case de ce code : elle est effacée (glisser efface alors aussi). */
  function gridEditor(host, grid, onChange, {
    code = 'O'
  } = {}) {
    grid = normGrid(grid);
    let brush = LEGEND[code] ? code : 'O';
    // couleur de la case : valeur propre à la case, posée avec !important (les designs rendent les cases de tableau
    // transparentes avec !important ; seul un style en ligne !important l'emporte)
    const cell = (d, h, v) => `<td data-d="${d}" data-h="${h}" title="${K.esc(t(DAYS[d]))} ${h}h–${h + 1}h UTC${v ? ' · ' + K.esc(LEGEND[v][0]) : ''}"${v ? ` data-code="${v}" style="background-color:${colorOf(v)} !important;color:${inkOf(v)} !important"` : ''}>${v}</td>`;
    host.classList.add('pa-grid');
    host.innerHTML = `<div class="pa-palette" role="radiogroup" aria-label="${K.esc(t(['Code à poser', 'Code to paint', 'Zu setzender Code', 'Código a pintar']))}">${Object.entries(LEGEND).map(([k, [label]]) => `<button type="button" class="repo-plain pa-code" data-code="${k}" role="radio" aria-checked="${k === brush}" title="${K.esc(label)}" style="background:${colorOf(k)};color:${inkOf(k)}">${k}<small>${K.esc(label)}</small></button>`).join('')}</div>
      <table><thead><tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${DAYS.map((d, i) => `<tr><th>${K.esc(t(d))}</th>${grid[i].map((v, h) => cell(i, h, v)).join('')}</tr>`).join('')}</tbody></table>`;
    host.querySelector('.pa-palette').onclick = e => {
      const b = e.target.closest('.pa-code');
      if (!b) return;
      brush = b.dataset.code;
      host.querySelectorAll('.pa-code').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    };
    let paint = null; // code posé pendant le geste ('' : effacement)
    const set = td => {
      const d = +td.dataset.d,
        h = +td.dataset.h;
      grid[d][h] = paint;
      td.outerHTML = cell(d, h, paint);
    };
    host.onpointerdown = e => {
      const td = e.target.closest('td[data-d]');
      if (!td) return;
      e.preventDefault();
      paint = grid[+td.dataset.d][+td.dataset.h] === brush ? '' : brush; // second clic sur ce code : effacer
      set(td);
    };
    host.onpointerover = e => {
      const td = e.target.closest('td[data-d]');
      if (td && paint !== null && grid[+td.dataset.d][+td.dataset.h] !== paint) set(td);
    };
    const stop = () => {
      if (paint === null) return;
      paint = null;
      onChange?.(grid);
    };
    host.onpointerup = stop;
    host.onpointerleave = stop;
    // design ou ton changé : couleurs réaccordées
    window.addEventListener('repository-design-change', () => setTimeout(() => host.isConnected && gridEditor(host, grid, onChange, {
      code: brush
    })), {
      once: true
    });
    return grid;
  }
  /** Disponibilité à une heure UTC (grille semaine type) : { code, label, category, role, ok } ; null si non renseignée.
   *  ok : code « dispo » qui couvre la famille de la mission (rôle ; O : tout rôle). */
  function availabilityAt(av, ms, family) {
    if (!av?.grid || !ms) return null;
    const d = new Date(ms),
      code = normGrid(av.grid)[(d.getUTCDay() + 6) % 7]?.[d.getUTCHours()];
    if (!code) return null;
    const [label, category, role] = LEGEND[code];
    const roles = FAMILY_ROLES[String(family || '').toUpperCase()];
    return {
      code,
      label,
      category,
      role,
      ok: category === 'dispo' && (!role || !roles || roles.includes(role))
    };
  }
  /** Disponible à une heure UTC (code « dispo ») ; null si non renseigné. */
  function availableAt(av, ms) {
    const a = availabilityAt(av, ms);
    return a ? a.category === 'dispo' : null;
  }

  // ---- Centre : écriture d'une affectation (dossier de la mission + index)
  /** Écrit affectations.yaml dans le dossier de la mission et met à jour data/missions/affectations.json (index, une ligne
   *  par participant). mission : entrée du registre { id, type, title, folder, files, images } ; participants : [{ pilot,
   *  callsign, aircraft:{ registration, type, base }, departure, takeoff, ferry, status }] ; extra : { h_hour, alert, by }. */
  async function writeAssignment(mission, participants, extra = {}) {
    const C = window.MissionRegistryCore;
    if (!C) throw new Error('MissionRegistryCore absent');
    const dir = await C.missionsDir(true);
    const at = new Date().toISOString();
    const doc = {
      mission: mission.id,
      updated_at: at,
      by: extra.by || trigram() || 'CPCO',
      h_hour: extra.h_hour || null,
      participants,
      alert: extra.alert || null
    };
    const mh = await C.missionHandle(mission.id, mission.type, {
      request: true,
      folder: mission.folder
    });
    if (!mh) throw new Error(t(['Dossier de la mission introuvable', 'Mission folder not found']));
    const w = await (await mh.h.getFileHandle('affectations.yaml', {
      create: true
    })).createWritable();
    await w.write(`# Affectations de la mission ${mission.id} — docs/AFFECTATION_MISSIONS.md\n` + window.jsyaml.dump(doc, {
      lineWidth: -1,
      noRefs: true
    }));
    await w.close();
    // index : lignes de cette mission remplacées
    let idx = {
      assignments: []
    };
    try {
      idx = JSON.parse(await (await (await dir.getFileHandle('affectations.json')).getFile()).text());
    } catch {
      /* premier index */ }
    idx.assignments = (idx.assignments || []).filter(a => a.mission !== mission.id);
    for (const p of participants) idx.assignments.push({
      mission: mission.id,
      title: mission.title || '',
      type: mission.type || '',
      folder: mh.folder,
      files: {
        yaml: (mission.files || []).find(f => /\.ya?ml$/i.test(f)) || `mission${mission.id}.yaml`,
        md: (mission.files || []).find(f => /\.md$/i.test(f)) || '',
        maps: (mission.images || mission.maps || []).map(x => typeof x === 'string' ? x : x?.name || x?.file).filter(Boolean)
      },
      h_hour: doc.h_hour,
      alert: doc.alert,
      updated_at: at,
      by: doc.by,
      ...p
    });
    idx.updatedAt = at;
    const wi = await (await dir.getFileHandle('affectations.json', {
      create: true
    })).createWritable();
    await wi.write(JSON.stringify(idx, null, 2));
    await wi.close();
    cache = idx;
    envelope();
    return `${mh.folder}/affectations.yaml`;
  }

  window.MissionAssignments = {
    PAGE,
    trigram,
    index,
    mine,
    key,
    when,
    isRead,
    markRead,
    envelope,
    DAYS,
    LEGEND,
    emptyGrid,
    availabilityAt,
    availability,
    availableAt,
    saveAvailability,
    gridEditor,
    writeAssignment
  };
  // en-tête prêt après repository_nav.js : pli cacheté posé dès que possible, puis rafraîchi au retour sur l'onglet
  const start = () => envelope().catch(() => {});
  if (document.querySelector('.repo-header-tools')) start();
  else window.addEventListener('load', start);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) index({
      fresh: true
    }).then(envelope).catch(() => {});
  });
})();
