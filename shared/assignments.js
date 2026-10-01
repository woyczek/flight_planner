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
.pa-grid td.on{background:#2e9d5b;border-color:#1f6e3f}.pa-grid td:nth-child(7n+1){border-left-width:2px}
html[data-design="field"] .pa-grid td.on{background:#7fd65e;border-color:#3f7a25}`;
    document.head.append(s);
  }

  // ---- disponibilités du pilote : semaine type, 7 jours × 24 heures (true : disponible), lundi en premier
  const DAYS = [
    ['Lun', 'Mon', 'Mo', 'Lun'],
    ['Mar', 'Tue', 'Di', 'Mar'],
    ['Mer', 'Wed', 'Mi', 'Mié'],
    ['Jeu', 'Thu', 'Do', 'Jue'],
    ['Ven', 'Fri', 'Fr', 'Vie'],
    ['Sam', 'Sat', 'Sa', 'Sáb'],
    ['Dim', 'Sun', 'So', 'Dom']
  ];
  const emptyGrid = () => DAYS.map(() => Array(24).fill(false));
  /** Disponibilités d'un pilote : locales (son poste), sinon data/disponibilites/<TRI>.json (fetch) ; null si aucune. */
  async function availability(tri) {
    tri = String(tri || '').toUpperCase();
    const local = json(AVAIL, {})[tri];
    if (local?.grid) return local;
    try {
      const r = await fetch(new URL(`data/disponibilites/${encodeURIComponent(tri)}.json`, root()).href, {
        cache: 'no-store'
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
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
      updated_at: new Date().toISOString(),
      grid
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
  /** Grille éditable (jours × heures UTC) : clic ou glisser sur les cases pour basculer disponible / indisponible. */
  function gridEditor(host, grid, onChange) {
    grid = grid || emptyGrid();
    host.classList.add('pa-grid');
    host.innerHTML = `<table><thead><tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${DAYS.map((d, i) => `<tr><th>${K.esc(t(d))}</th>${grid[i].map((v, h) => `<td data-d="${i}" data-h="${h}" class="${v ? 'on' : ''}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    let paint = null;
    const set = td => {
      const d = +td.dataset.d,
        h = +td.dataset.h;
      grid[d][h] = paint;
      td.classList.toggle('on', paint);
    };
    host.onpointerdown = e => {
      const td = e.target.closest('td[data-d]');
      if (!td) return;
      e.preventDefault();
      paint = !grid[+td.dataset.d][+td.dataset.h];
      set(td);
    };
    host.onpointerover = e => {
      const td = e.target.closest('td[data-d]');
      if (td && paint !== null) set(td);
    };
    const stop = () => {
      if (paint === null) return;
      paint = null;
      onChange?.(grid);
    };
    host.onpointerup = stop;
    host.onpointerleave = stop;
    return grid;
  }
  /** Disponible à une heure UTC donnée (grille semaine type) ; null si inconnu. */
  function availableAt(av, ms) {
    if (!av?.grid || !ms) return null;
    const d = new Date(ms),
      day = (d.getUTCDay() + 6) % 7; // lundi = 0
    return !!av.grid[day]?.[d.getUTCHours()];
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
    emptyGrid,
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
