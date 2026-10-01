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
  //   · appareils du pilote : types de la flotte possédés et maîtrisés (même déclaration que ses disponibilités) ;
  //   · outils communs au Centre (dialogue « Affecter… »), au planning ODV et à la page pilote : géographie (distances,
  //     terrains, convoyage), qualification, créneaux, conflits, écriture d'une affectation.
  //
  // API (window.MissionAssignments) : identité et index — trigram(), index({ fresh }), mine(liste?, { all }), key(a),
  //   when(a), isRead(a), markRead(a), envelope() ; déclaration du pilote — LEGEND, availability(TRI),
  //   availabilityAt(décl, ms, famille), saveAvailability(TRI, grille, { toFolder }), saveAircraft(TRI, { owned, mastered }), saveSims(TRI, [sim…]), simulators(),
  //   gridEditor(hôte, grille, onChange) ; outils — geo { nm, brg, icaoOf, coord }, typeOf, cruiseKt, coordsOf(OACI),
  //   ferryOf({ base, departure, type, takeoff, pilot }), fleetTypes(), qualification(décl, TRI, type), slotRange(date, h0, h1),
  //   declaredOver(décl, début, fin), busyRange(a), assignedOver(liste, TRI, début, fin), conflicts(liste, {…}) ;
  //   écriture — writeAssignment(mission, participants, extra).
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
  let warned = false; // dossier autorisé ≠ fichiers servis : signalé une fois
  async function index({
    fresh = false
  } = {}) {
    if (cache && !fresh) return cache;
    // source : le dossier des missions autorisé (celui où l'on écrit), sinon la copie servie (fetch) ; si les deux
    // diffèrent, le dossier autorisé l'emporte et un avertissement dit que la page ne sert pas ce dossier
    let served = null,
      local = null;
    try {
      const r = await fetch(new URL('data/missions/affectations.json', root()).href, {
        cache: 'no-store'
      });
      served = r.ok ? await r.json() : null;
    } catch {
      served = null;
    }
    try {
      const st = await window.FileAccess?.status?.('__missions');
      if (st?.handle && st.permission === 'granted') local = JSON.parse(await (await (await st.handle.getFileHandle('affectations.json')).getFile()).text());
    } catch {
      local = null; // pas d'index dans le dossier autorisé, ou dossier déplacé
    }
    if (local && served && (local.updatedAt || '') !== (served.updatedAt || '') && !warned) {
      warned = true;
      window.AppFramework?.notify?.(t(['Affectations : le dossier des missions autorisé et les fichiers servis par la page diffèrent (autre copie ?) — le dossier autorisé fait foi.', 'Assignments: the authorised missions folder and the files served by the page differ (another copy?) — the authorised folder prevails.']), 'warn');
    }
    cache = local || served || {
      assignments: []
    };
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
  /** Remet une mission « non lue » (scellée) : outil du canal develop. */
  function markUnread(a) {
    const r = json(READ, {});
    delete r[key(a)];
    setJson(READ, r);
    envelope();
  }
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
    // barre latérale : pastille du nombre de missions non lues sur l'entrée « Mes missions »
    document.querySelectorAll(`.repo-sidenav-item[href$="${PAGE}"]`).forEach(item => {
      let n = item.querySelector('.repo-assign-badge');
      if (!list.length) return n?.remove();
      if (!n) item.append(n = Object.assign(document.createElement('b'), {
        className: 'repo-assign-badge'
      }));
      n.textContent = list.length;
    });
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
.repo-sidenav-item{position:relative}.repo-assign-badge{position:absolute;top:2px;right:6px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#c62828;color:#fff;font:700 9.5px/15px system-ui,sans-serif;text-align:center}html[data-skeuo] .repo-assign-badge{border-radius:0}
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
  // ---- semaines : une grille par semaine (weeks, clé : lundi ISO UTC) ; une déclaration de l'ancien format (grid seule)
  // vaut pour la semaine où elle a été saisie (updated_at), et rejoint weeks à la première retouche
  /** Lundi (date ISO, UTC) de la semaine d'un instant. */
  const weekKey = ms => {
    const d = new Date(ms);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7)).toISOString().slice(0, 10);
  };
  /** Semaine décalée de n semaines (clé lundi ISO). */
  const addWeeks = (week, n) => new Date(Date.parse(`${week}T00:00:00Z`) + n * 7 * 864e5).toISOString().slice(0, 10);
  const hasWeeks = av => !!av?.weeks && Object.keys(av.weeks).length > 0;
  /** Semaine d'une déclaration de l'ancien format : celle de sa saisie. */
  const legacyWeek = av => weekKey(Date.parse(av?.updated_at || '') || Date.now());
  /** Semaines d'une déclaration : weeks, ou l'ancienne grille rattachée à sa semaine. */
  const weeksOf = av => hasWeeks(av) ? av.weeks : av?.grid && normGrid(av.grid).some(r => r.some(Boolean)) ? {
    [legacyWeek(av)]: av.grid
  } : {};
  /** Grille d'une semaine (normalisée ; vide si la semaine n'est pas renseignée). */
  const weekGrid = (av, week) => normGrid(weeksOf(av)[week]);
  /** Grille qui vaut à un instant ; null si rien n'est déclaré pour cette semaine. */
  const gridAt = (av, ms) => weeksOf(av)[weekKey(ms)] || null;
  /** Disponibilités d'un pilote : locales (son poste), sinon data/disponibilites/<TRI>.json (fetch) ; null si aucune. */
  async function availability(tri) {
    tri = String(tri || '').toUpperCase();
    const local = json(AVAIL, {})[tri];
    let doc = local?.grid || hasWeeks(local) ? local : null;
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
    toFolder = false,
    week = '', // semaine (lundi ISO) : grille de cette semaine ; sinon semaine type (ancien format)
    base = null // déclaration lue (fichier) : ses semaines sont gardées si ce poste n'en a pas de copie
  } = {}) {
    tri = String(tri || '').toUpperCase();
    const prev = json(AVAIL, {})[tri] || base || {};
    // semaines gardées : douze semaines passées au plus
    const keepFrom = addWeeks(weekKey(Date.now()), -12),
      weeks = Object.fromEntries(Object.entries({
        ...weeksOf(prev), // ancienne grille : rejoint sa semaine
        ...(week ? {
          [week]: normGrid(grid)
        } : {})
      }).filter(([k]) => k >= keepFrom));
    const doc = {
      pilot: tri,
      granularity_min: 60,
      timezone: 'UTC',
      legend: 'ODV (Code couleur)',
      updated_at: new Date().toISOString(),
      grid: week ? normGrid(prev.grid) : normGrid(grid),
      weeks,
      aircraft: prev.aircraft || null,
      sims: prev.sims || null
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
  /** Types d'appareils du pilote (désignateurs OACI) : { owned, mastered } — gardés avec ses disponibilités (même
   *  déclaration, même fichier) ; enregistrés dans le dossier des données avec la grille. */
  function saveAircraft(tri, aircraft) {
    tri = String(tri || '').toUpperCase();
    const all = json(AVAIL, {});
    all[tri] = {
      pilot: tri,
      granularity_min: 60,
      timezone: 'UTC',
      grid: emptyGrid(),
      ...(all[tri] || {}),
      aircraft: {
        owned: [...new Set(aircraft?.owned || [])].sort(),
        mastered: [...new Set(aircraft?.mastered || [])].sort()
      },
      updated_at: new Date().toISOString()
    };
    setJson(AVAIL, all);
    return all[tri];
  }
  // Simulateurs et outils : colonnes de la feuille FLOTTE du classeur ODV (S39), complétées par celles des classeurs lus
  // sur la page ODV (simulateurs des profils, mémorisés dans odvSimulators:v1).
  const SIMULATORS = ['P3D', 'MSFS 2020', 'MSFS 2024', 'X-PLANE 11', 'X-PLANE 12', 'DCS SRS RADIO', 'vPAR', 'JOIN FS', 'HAMACHI'];
  const SIMS_SEEN = 'odvSimulators:v1';
  /** Liste des simulateurs proposés (classeur ODV), avec ceux vus dans les classeurs lus ; learn : à ajouter. */
  function simulators(learn = []) {
    const seen = json(SIMS_SEEN, []),
      add = learn.filter(s => s && !SIMULATORS.includes(s) && !seen.includes(s));
    if (add.length) setJson(SIMS_SEEN, [...seen, ...add]);
    return [...SIMULATORS, ...seen, ...add];
  }
  // abréviation et couleur de chaque simulateur (pastilles denses : ODV, Mes missions) ; inconnu : initiales, teinte
  // tirée du nom ; couleurs accordées au design comme les codes de l'ODV
  const SIM_TAGS = [
    [/^P3D|PREPAR3D/i, 'P3D', '#6b4fa0'],
    [/MSFS.*2020|FS\s*2020/i, 'FS20', '#1f6fb2'],
    [/MSFS.*2024|FS\s*2024/i, 'FS24', '#0d8ab8'],
    [/X-?PLANE\s*11|XP\s*11/i, 'XP11', '#2f8f3a'],
    [/X-?PLANE\s*12|XP\s*12/i, 'XP12', '#5aae3c'],
    [/^DCS/i, 'DCS', '#b2402f'],
    [/^VPAR/i, 'vPAR', '#c27c0e'],
    [/JOIN\s*FS/i, 'JFS', '#8a5a2b'],
    [/HAMACHI/i, 'HAM', '#d4a100']
  ];
  /** { abbr, color, name } d'un simulateur. */
  function simTag(name) {
    const s = String(name || '').trim(),
      hit = SIM_TAGS.find(([re]) => re.test(s));
    if (hit) return { abbr: hit[1], color: window.RepositoryNav?.chartColor?.(hit[2]) || hit[2], name: s };
    const abbr = (s.match(/[A-Z0-9]+/gi) || [s]).map(w => /\d/.test(w) ? w : w[0]).join('').slice(0, 4).toUpperCase();
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
    return { abbr, color: `hsl(${h} 45% 42%)`, name: s };
  }
  /** Pastilles des simulateurs (abréviation colorée, nom complet au survol). */
  function simChips(list) {
    if (!document.getElementById('simChipCss')) document.head.insertAdjacentHTML('beforeend', '<style id="simChipCss">.sim-chip{display:inline-block;margin:0 3px 2px 0;padding:0 5px;border-radius:3px;font:700 10.5px/1.6 system-ui,sans-serif;letter-spacing:.03em;color:#fff;background:var(--sim);vertical-align:middle;white-space:nowrap}</style>');
    return (list || []).map(simTag).map(t => `<span class="sim-chip" style="--sim:${t.color}" title="${K.esc(t.name)}">${K.esc(t.abbr)}</span>`).join('');
  }
  /** Simulateurs du pilote (liste de la feuille FLOTTE) : gardés avec ses disponibilités, comme ses appareils. */
  function saveSims(tri, sims) {
    tri = String(tri || '').toUpperCase();
    const all = json(AVAIL, {});
    all[tri] = {
      pilot: tri,
      granularity_min: 60,
      timezone: 'UTC',
      grid: emptyGrid(),
      ...(all[tri] || {}),
      sims: [...new Set(sims || [])],
      updated_at: new Date().toISOString()
    };
    setJson(AVAIL, all);
    return all[tri];
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
    code = 'O',
    onBrush = null, // code choisi dans la palette (pour le garder)
    days = null // libellés des lignes (ex. « Lun 28/09 ») ; sinon jours de la semaine
  } = {}) {
    grid = normGrid(grid);
    const dayLabel = i => days?.[i] || t(DAYS[i]);
    let brush = LEGEND[code] ? code : 'O';
    // couleur de la case : valeur propre à la case, posée avec !important (les designs rendent les cases de tableau
    // transparentes avec !important ; seul un style en ligne !important l'emporte)
    const cell = (d, h, v) => `<td data-d="${d}" data-h="${h}" title="${K.esc(dayLabel(d))} ${h}h–${h + 1}h UTC${v ? ' · ' + K.esc(LEGEND[v][0]) : ''}"${v ? ` data-code="${v}" style="background-color:${colorOf(v)} !important;color:${inkOf(v)} !important"` : ''}>${v}</td>`;
    const rows = () => DAYS.map((_, i) => `<tr><th>${K.esc(dayLabel(i))}</th>${grid[i].map((v, h) => cell(i, h, v)).join('')}</tr>`).join('');
    host.classList.add('pa-grid');
    host.innerHTML = `<div class="pa-palette" role="radiogroup" aria-label="${K.esc(t(['Code à poser', 'Code to paint', 'Zu setzender Code', 'Código a pintar']))}">${Object.entries(LEGEND).map(([k, [label]]) => `<button type="button" class="repo-plain pa-code" data-code="${k}" role="radio" aria-checked="${k === brush}" title="${K.esc(label)}" style="background:${colorOf(k)};color:${inkOf(k)}">${k}<small>${K.esc(label)}</small></button>`).join('')}</div>
      <table><thead><tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows()}</tbody></table>`;
    host.querySelector('.pa-palette').onclick = e => {
      const b = e.target.closest('.pa-code');
      if (!b) return;
      brush = b.dataset.code;
      host.querySelectorAll('.pa-code').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      onBrush?.(brush);
    };
    // geste : rectangle entre la case de départ et la case survolée (jours × heures), recalculé à chaque case
    let paint = null, // code posé pendant le geste ('' : effacement)
      anchor = null,
      before = null; // grille au début du geste
    const fill = (d1, h1) => {
      const [da, db] = [Math.min(anchor[0], d1), Math.max(anchor[0], d1)],
        [ha, hb] = [Math.min(anchor[1], h1), Math.max(anchor[1], h1)];
      grid.forEach((row, d) => row.forEach((_, h) => {
        row[h] = d >= da && d <= db && h >= ha && h <= hb ? paint : before[d][h];
      }));
      host.querySelector('tbody').innerHTML = rows();
    };
    host.onpointerdown = e => {
      const td = e.target.closest('td[data-d]');
      if (!td) return;
      e.preventDefault();
      anchor = [+td.dataset.d, +td.dataset.h];
      before = grid.map(r => [...r]);
      paint = grid[anchor[0]][anchor[1]] === brush ? '' : brush; // second clic sur ce code : effacer
      fill(...anchor);
    };
    host.onpointerover = e => {
      const td = e.target.closest('td[data-d]');
      if (td && paint !== null) fill(+td.dataset.d, +td.dataset.h);
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
      code: brush,
      onBrush,
      days
    })), {
      once: true
    });
    return grid;
  }
  /** Disponibilité à une heure UTC (grille semaine type) : { code, label, category, role, ok } ; null si non renseignée.
   *  ok : code « dispo » qui couvre la famille de la mission (rôle ; O : tout rôle). */
  function availabilityAt(av, ms, family) {
    const g = ms ? gridAt(av, ms) : null;
    if (!g) return null;
    const d = new Date(ms),
      code = normGrid(g)[(d.getUTCDay() + 6) % 7]?.[d.getUTCHours()];
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

  // ---- géographie et appareils (communs au Centre, à l'ODV et à la page pilote)
  const TURN_MIN = 30, // remise en œuvre d'un appareil entre deux vols
    FERRY_SETUP_MIN = 20; // mise en œuvre d'un convoyage (en plus du vol)
  const rad = x => x * Math.PI / 180;
  const geo = {
    /** Distance orthodromique (NM). */
    nm: (a, b) => {
      const dl = rad(b.lat - a.lat),
        dg = rad(b.lon - a.lon),
        h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2;
      return 2 * 3440.065 * Math.asin(Math.sqrt(h));
    },
    /** Route vraie initiale (degrés). */
    brg: (a, b) => {
      const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat)),
        x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    },
    /** Code OACI d'un point « Nom (LFBM) » ; '' sinon. */
    icaoOf: p => /\(([A-Z]{4})\)/.exec(p?.name || '')?.[1] || '',
    /** Position en degrés et minutes pour une route de plan de vol : 4422N00052W. */
    coord: p => {
      const f = (v, w, pos, neg) => {
        const a = Math.abs(v),
          d = Math.floor(a),
          m = Math.round((a - d) * 60);
        return String(d + (m === 60 ? 1 : 0)).padStart(w, '0') + String(m === 60 ? 0 : m).padStart(2, '0') + (v >= 0 ? pos : neg);
      };
      return f(p.lat, 2, 'N', 'S') + f(p.lon, 3, 'E', 'W');
    }
  };
  /** Désignateur OACI d'un texte de type (« RFAL Rafale » → RFAL). */
  const typeOf = s => String(s || '').trim().split(/\s+/)[0].toUpperCase();
  /** Vitesse de croisière d'un type (kt) : performances de la base d'appareils, sinon valeurs d'usage. */
  const cruiseKt = type => +window.AIRCRAFT_PERF?.[type]?.cruise?.tasKt || ({
    RFAL: 480,
    MIR2: 450,
    A332: 460,
    A400: 340,
    C30J: 300,
    PC21: 300
  })[type] || 250;
  // coordonnées des terrains : base SIA du navigateur, aérodromes des missions du registre, cache des terrains de la
  // suite (missionAirports:v1), puis base mondiale des aérodromes (source « airports », chargée une fois à la demande)
  const AP_KEY = 'missionAirports:v1';
  let airports = null,
    worldLoad = null;
  async function knownAirports() {
    if (airports) return airports;
    airports = {};
    try {
      const base = await window.SiaBase?.get?.({
        any: true
      });
      for (const ad of base?.aero?.aerodromes || []) {
        const code = ad.icao || ad.code || ad.id;
        if (code && Number.isFinite(+ad.lat)) airports[code] = {
          lat: +ad.lat,
          lon: +ad.lon
        };
      }
    } catch {
      /* base SIA absente */ }
    for (const m of json('missionRegistry:v1', {})?.missions || [])
      for (const p of [m.origin, m.destination])
        if (p && typeof p === 'object' && geo.icaoOf(p) && Number.isFinite(+p.lat)) airports[geo.icaoOf(p)] ||= {
          lat: +p.lat,
          lon: +p.lon
        };
    return airports;
  }
  /** Position d'un terrain (OACI) ; null si introuvable. */
  async function coordsOf(code) {
    if (!code) return null;
    const ap = await knownAirports();
    if (ap[code]) return ap[code];
    const cache = json(AP_KEY, {});
    if (Number.isFinite(+cache[code]?.lat)) return ap[code] = {
      lat: +cache[code].lat,
      lon: +cache[code].lon
    };
    const url = window.RepositoryNav?.source?.('airports') || 'https://cdn.jsdelivr.net/gh/mwgg/Airports@master/airports.json';
    const w = (await (worldLoad ||= fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)))?.[code];
    if (!w || !Number.isFinite(+w.lat)) return null;
    cache[code] = {
      ...(cache[code] || {}),
      icao: code,
      name: w.name,
      country: w.country,
      lat: +w.lat,
      lon: +w.lon,
      elevation: w.elevation,
      tz: w.tz
    };
    setJson(AP_KEY, cache);
    return ap[code] = {
      lat: +w.lat,
      lon: +w.lon
    };
  }
  /** Terrain connu (registre, base SIA) : à appeler avec l'origine d'une mission pour éviter une recherche. */
  const rememberAirport = (code, p) => {
    if (code && p && Number.isFinite(+p.lat)) (airports ||= {})[code] ||= {
      lat: +p.lat,
      lon: +p.lon
    };
  };
  /** Convoyage d'un appareil basé hors du terrain de départ : { from, to, minutes, takeoff, pilot } ; null s'il est sur
   *  place. minutes null : distance inconnue. Décollage du convoyage = décollage de la mission − durée − remise en œuvre. */
  async function ferryOf({
    base,
    departure,
    type,
    takeoff,
    pilot = ''
  }) {
    if (!base || !departure || base === departure) return null;
    const a = await coordsOf(base),
      b = await coordsOf(departure),
      minutes = a && b ? Math.round(geo.nm(a, b) / cruiseKt(typeOf(type)) * 60 + FERRY_SETUP_MIN) : null;
    return {
      from: base,
      to: departure,
      minutes,
      takeoff: minutes && takeoff ? new Date(takeoff - (minutes + TURN_MIN) * 6e4).toISOString() : null,
      pilot
    };
  }

  // ---- appareils du pilote : types de la flotte possédés (dans son simulateur) et maîtrisés, déclarés dans « Mes
  // missions », rangés avec ses disponibilités (même fichier : data/disponibilites/<TRI>.json, champ aircraft)
  /** Catégorie d'un type d'après sa description OACI (Doc 8643 : L2J = avion terrestre biréacteur, H1T = hélicoptère
   *  monoturbine…) : clé et libellé. */
  const CATEGORY = {
    H: ['helico', ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros']],
    J: ['jet', ['Avions à réaction', 'Jet aircraft', 'Strahlflugzeuge', 'Aviones a reacción']],
    T: ['turboprop', ['Avions à turbopropulseurs', 'Turboprop aircraft', 'Turboprop-Flugzeuge', 'Aviones turbohélice']],
    P: ['piston', ['Avions à pistons', 'Piston aircraft', 'Kolbenmotorflugzeuge', 'Aviones de pistón']],
    '?': ['other', ['Autres', 'Other', 'Andere', 'Otros']]
  };
  const categoryOf = desc => {
    const d = String(desc || '').toUpperCase();
    return CATEGORY[d.startsWith('H') || d.startsWith('G') ? 'H' : d.charAt(2)] || CATEGORY['?'];
  };
  /** Nom lisible d'un modèle de la base OACI : « DASSAULT Rafale » → « Dassault Rafale ». */
  // (mots entiers de lettres seulement : « AS-365 », « EC135 » gardés en capitales)
  const modelName = s => String(s || '').replace(/(^|[\s(])([A-Z]{3,})(?=$|[\s),])/g, (_, b, w) => b + w.charAt(0) + w.slice(1).toLowerCase());
  /** Types de la flotte, détaillés : désignateur OACI, modèle (base OACI), catégorie, variantes, nombre d'appareils
   *  (opérationnels), bases, opérateurs — pour le choix du pilote et le Centre. */
  function fleetTypes() {
    const out = new Map();
    for (const f of window.DEFA_FLEET || []) {
      const k = typeOf(f.type);
      if (!k) continue;
      const e = out.get(k) || {
        type: k,
        variants: new Set(),
        bases: new Map(),
        operators: new Set(),
        count: 0,
        operational: 0
      };
      if (f.variant) e.variants.add(f.variant);
      if (f.base) e.bases.set(f.base, (e.bases.get(f.base) || 0) + 1);
      if (f.operator) e.operators.add(f.operator);
      e.count++;
      if (f.operational !== false) e.operational++;
      out.set(k, e);
    }
    const db = window.AIRCRAFT_DB || {};
    return [...out.values()].map(e => {
      const info = db[e.type] || db[db.__aliases?.[e.type]] || {},
        [category, categoryLabel] = categoryOf(info.description);
      return {
        type: e.type,
        model: modelName(info.model) || [...e.variants][0] || e.type,
        description: info.description || '',
        category,
        categoryLabel: t(categoryLabel),
        variants: [...e.variants].sort(),
        count: e.count,
        operational: e.operational,
        bases: [...e.bases].sort((a, b) => b[1] - a[1]).map(([b]) => b),
        operators: [...e.operators].sort()
      };
    }).sort((a, b) => a.model.localeCompare(b.model));
  }
  /** Qualification d'un pilote sur un type : déclaration (maîtrisé, possédé), sinon vols connus de la référence DEFA.
   *  { level: 'mastered' | 'owned' | 'flown' | 'none' | 'unknown', text } */
  function qualification(decl, tri, type) {
    if (type && typeof type === 'object') {
      if (type.type) type = type.type;
      else {
        // poste générique : meilleur type de la catégorie déclaré par le pilote
        const spec = type,
          lbl = specLabel(spec),
          ac = decl?.aircraft,
          ms = (ac?.mastered || []).filter(x => fits(spec, x)),
          ow = (ac?.owned || []).filter(x => fits(spec, x));
        if (!spec.kind) return {
          level: 'unknown',
          text: ''
        };
        if (ms.length) return {
          level: 'mastered',
          text: t([`${lbl} maîtrisé (${ms.join(', ')})`, `${lbl} mastered (${ms.join(', ')})`])
        };
        if (ow.length) return {
          level: 'owned',
          text: t([`${lbl} possédé (${ow.join(', ')})`, `${lbl} owned (${ow.join(', ')})`])
        };
        return {
          level: ac ? 'none' : 'unknown',
          text: ac ? t([`aucun ${lbl} déclaré`, `no ${lbl} declared`]) : t([`appareils non déclarés`, `aircraft not declared`])
        };
      }
    }
    type = typeOf(type);
    if (!type) return {
      level: 'unknown',
      text: ''
    };
    const ac = decl?.aircraft;
    if (ac?.mastered?.includes(type)) return {
      level: 'mastered',
      text: t([`${type} maîtrisé`, `${type} mastered`])
    };
    if (ac?.owned?.includes(type)) return {
      level: 'owned',
      text: t([`${type} possédé, non maîtrisé`, `${type} owned, not mastered`])
    };
    const p = (window.DEFA_REFERENCE?.pilots || []).find(x => x.trigram === tri);
    if (p && (p.types || []).some(x => typeOf(x) === type)) return {
      level: 'flown',
      text: t([`vols connus sur ${type}`, `known flights on ${type}`])
    };
    return {
      level: ac ? 'none' : 'unknown',
      text: ac ? t([`${type} non déclaré`, `${type} not declared`]) : t([`pas de vol connu sur ${type}`, `no known flight on ${type}`])
    };
  }

  // ---- créneaux (ODV : jour × matin / après-midi / soir ; affectations)
  /** Plage d'un créneau : date ISO du jour, heures z de début et de fin → [début, fin] (ms). */
  const slotRange = (date, h0, h1) => [Date.parse(`${date}T${String(h0).padStart(2, '0')}:00:00Z`), Date.parse(`${date}T00:00:00Z`) + h1 * 36e5];
  /** Déclaration d'un pilote sur une plage : code dominant (les « dispo » d'abord), dispo, codes rencontrés. */
  function declaredOver(av, start, end) {
    if (!av || !start || !end) return null;
    const codes = {};
    for (let ms = start; ms < end; ms += 36e5) {
      const a = availabilityAt(av, ms);
      if (a) codes[a.code] = (codes[a.code] || 0) + 1;
    }
    const list = Object.entries(codes).sort((x, y) => (LEGEND[y[0]][1] === 'dispo') - (LEGEND[x[0]][1] === 'dispo') || y[1] - x[1]);
    if (!list.length) return null;
    const code = list[0][0];
    return {
      code,
      label: LEGEND[code][0],
      dispo: LEGEND[code][1] === 'dispo',
      codes
    };
  }
  /** Plage occupée par une affectation : du décollage (ou du convoyage, ou de l'astreinte) à l'atterrissage estimé,
   *  remise en œuvre comprise. */
  function busyRange(a) {
    const t0 = Date.parse(a.takeoff || a.alert?.ready_at_utc || '') || 0,
      from = Math.min(t0 || Infinity, Date.parse(a.ferry?.takeoff || '') || Infinity, Date.parse(a.alert?.ready_at_utc || '') || Infinity),
      to = Math.max(t0 + ((+a.block_min || 120) + TURN_MIN) * 6e4, Date.parse(a.alert?.window_end_utc || '') || 0);
    return Number.isFinite(from) ? [from, to] : [0, 0];
  }
  /** Affectations d'un pilote (ou d'un convoyeur) qui recouvrent une plage. */
  const assignedOver = (list, tri, start, end) => (list || []).filter(a => a.status !== 'annulée' && (a.pilot === tri || a.ferry?.pilot === tri) && (([f, l]) => f < end && l > start)(busyRange(a)));
  /** Conflits d'un participant (pilote, appareil, convoyeur) avec les autres affectations : textes. */
  function conflicts(list, {
    mission,
    pilot,
    registration,
    ferryPilot,
    from,
    to
  }) {
    const out = [];
    for (const o of (list || []).filter(o => o.mission !== mission && o.status !== 'annulée')) {
      const [os, oe] = busyRange(o);
      if (!os || os >= to || oe <= from) continue;
      const at = new Date(os).toISOString().slice(11, 16) + 'Z';
      for (const who of [pilot, ferryPilot].filter(Boolean))
        if (o.pilot === who || o.ferry?.pilot === who) out.push(t([`${who} déjà affecté : ${o.mission} ${at}`, `${who} already assigned: ${o.mission} ${at}`]));
      if (registration && o.aircraft?.registration === registration) out.push(t([`${registration} déjà pris : ${o.mission} ${at}`, `${registration} already taken: ${o.mission} ${at}`]));
    }
    return [...new Set(out)];
  }

  // ---- vivier : pilotes disponibles et qualifiés (déclarations), proposition de missions pour un créneau
  const declCache = {};
  /** Déclarations de plusieurs pilotes (TRI → déclaration ou null), gardées pour la page. */
  async function declarations(tris) {
    await Promise.all([...new Set(tris)].filter(Boolean).filter(tr => !(tr in declCache)).map(async tr => {
      declCache[tr] = await availability(tr);
    }));
    return Object.fromEntries([...new Set(tris)].map(tr => [tr, declCache[tr] ?? null]));
  }
  /** Possède l'appareil (déclaré possédé ou maîtrisé) ; null si le pilote n'a rien déclaré. */
  // ---- postes d'une mission : un par équipage aérien, chacun son type (désignateur) ou, type générique du schéma
  // hélico (« Hélicoptère »), une catégorie et un service (« Gendarmerie » → appareils de la Gendarmerie nationale)
  /** Catégorie d'un désignateur (base OACI) : helico, jet, turboprop, piston, other. */
  const catOfType = ty => {
    const db = window.AIRCRAFT_DB || {};
    return categoryOf((db[ty] || db[db.__aliases?.[ty]] || {}).description)[0];
  };
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const kindOf = s => /h[ée]lico|helicopter|rotor/i.test(s) ? 'helico' : /avion|aircraft|airplane|plane|jet/i.test(s) ? 'avion' : '';
  /** Poste : { callsign, type ('' si générique), kind (helico | avion | ''), service, label }. */
  function post(callsign, rawType, service = '') {
    const ty = typeOf(rawType),
      known = !!ty && (fleetTypes().some(x => x.type === ty) || !!(window.AIRCRAFT_DB || {})[ty]);
    return {
      callsign: String(callsign || ''),
      type: known ? ty : '',
      kind: known ? (catOfType(ty) === 'helico' ? 'helico' : 'avion') : kindOf(rawType),
      service: String(service || ''),
      label: String(rawType || '')
    };
  }
  const isTeam = x => x && x.name && !/^[-\s]*$/.test(x.name) && !/^[-\s]*$/.test(String(x.type || ''));
  /** Postes d'une mission : yaml (aircraft[], ou teams[] du schéma hélico), sinon entrée du registre (teams,
   *  aircraftTypes) ; équipes au sol (type ni appareil ni hélicoptère/avion) écartées. */
  function postsOf(entry, y = {}) {
    let out = [];
    if (Array.isArray(y?.aircraft) && y.aircraft.length) out = y.aircraft.map(a => post(a.callsign, a.type, a.operator || a.service));
    else if (Array.isArray(y?.teams) && y.teams.length) out = y.teams.filter(isTeam).map(x => post(x.name, x.type, x.service));
    else if (entry?.teams?.length) out = entry.teams.filter(isTeam).map(x => post(x.name, x.type, x.service));
    out = out.filter(p => p.type || p.kind);
    if (!out.length) out = (entry?.aircraftTypes || []).map((ty, i) => post(entry.callsigns?.[i], ty));
    return out.length ? out : [post('', '')];
  }
  /** Un type d'appareil convient-il au poste (désignateur, ou poste générique : sa catégorie) ? spec : poste ou type. */
  const fits = (spec, ty) => {
    const k = typeOf(ty);
    if (!spec || typeof spec === 'string') return !typeOf(spec) || k === typeOf(spec);
    if (spec.type) return k === spec.type;
    return spec.kind === 'helico' ? catOfType(k) === 'helico' : spec.kind === 'avion' ? catOfType(k) !== 'helico' : true;
  };
  const specLabel = spec => typeof spec === 'string' ? typeOf(spec) : spec?.type || (spec?.kind === 'helico' ? t(['hélicoptère', 'helicopter']) : spec?.kind === 'avion' ? t(['avion', 'aircraft']) : '');
  /** Appareils de la flotte pour un poste : du type (ou de la catégorie), service du poste puis terrain de départ d'abord. */
  function planesFor(spec, departure = '') {
    const svc = fold(spec?.service || '');
    return (window.DEFA_FLEET || []).filter(f => fits(spec, f.type) || (spec?.type && typeOf(f.variant) === spec.type))
      .sort((a, b) => (!!svc && fold(b.operator).startsWith(svc)) - (!!svc && fold(a.operator).startsWith(svc)) || (b.base === departure) - (a.base === departure) || (b.operational !== false) - (a.operational !== false) || String(a.base).localeCompare(String(b.base)));
  }
  /** Le pilote a-t-il un appareil pour ce poste (type, ou catégorie d'un poste générique) ? null : appareils non déclarés. */
  const ownsType = (decl, spec) => decl?.aircraft ? [...(decl.aircraft.owned || []), ...(decl.aircraft.mastered || [])].some(ty => fits(spec, ty)) : null;
  /** Vivier pour un type et une heure : pilotes qui possèdent l'appareil et sont disponibles (code dispo) d'abord —
   *  maîtrisé avant possédé —, puis les autres (non déclarés, indisponibles), pour choisir quand même en connaissance de
   *  cause. [{ tri, qual, avail, owns, ok }] ; ok : possède le type et disponible. */
  function pool(tris, decls, {
    type,
    at,
    family = '',
    exclude = []
  }) {
    const rank = c => (c.ok ? 0 : 10) + (c.qual.level === 'mastered' ? 0 : c.qual.level === 'owned' ? 1 : c.qual.level === 'flown' ? 2 : 3) + (c.avail ? (c.avail.ok ? 0 : 4) : 2);
    return [...new Set(tris)].filter(tr => tr && !exclude.includes(tr)).map(tr => {
      const d = decls[tr],
        qual = qualification(d, tr, type),
        avail = at ? availabilityAt(d, at, family) : null,
        owns = ownsType(d, type);
      return {
        tri: tr,
        qual,
        avail,
        owns,
        ok: !!owns && !!avail?.ok
      };
    }).sort((a, b) => rank(a) - rank(b) || a.tri.localeCompare(b.tri));
  }
  /** Libellé court d'un pilote du vivier : « RBR — maîtrisé · C dispo ». */
  const poolLabel = c => `${c.tri} — ${c.qual.level === 'mastered' ? t(['maîtrisé', 'mastered']) : c.qual.level === 'owned' ? t(['possédé', 'owned']) : c.qual.level === 'flown' ? t(['vols connus', 'known flights']) : t(['type non déclaré', 'type not declared'])} · ${c.avail ? `${c.avail.code}${c.avail.ok ? '' : ' (' + c.avail.label + ')'}` : t(['dispo. non renseignée', 'availability unknown'])}`;
  /** Proposition pour un créneau : missions du registre (entrées) × pilotes libres. Chaque mission demande autant de
   *  pilotes que d'appareils (indicatifs), du type de ses appareils ; une opération (missions A, B, C…) est une
   *  proposition complémentaire d'un seul tenant. Retour : { options: [{ missions, pairs: [{ mission, tri }], covered,
   *  need, mastered }], proposal: [option…], left: [TRI non couverts] } ; focus : pilote mis en avant (case cliquée). */
  function planSlot(free, entries, decls, {
    focus = ''
  } = {}) {
    const usable = entries.filter(m => m.id && m.status !== 'ordered' && !/Z$/.test(m.id) && !m.organisation);
    // unités : opérations (missions de même opération) ou missions seules
    const units = new Map();
    for (const m of usable) {
      const k = m.operation?.id ? `op:${m.operation.id}` : `m:${m.id}`;
      if (!units.has(k)) units.set(k, []);
      units.get(k).push(m);
    }
    const options = [];
    for (const missions of units.values()) {
      const slots = missions.flatMap(m => postsOf(m).map(p => ({
        mission: m,
        post: p
      })));
      const masters = (tr, s) => (decls[tr]?.aircraft?.mastered || []).some(ty => fits(s.post, ty));
      // affectation gloutonne : postes les plus rares d'abord (moins de pilotes éligibles), maîtrisé avant possédé
      const elig = s => free.filter(tr => !(s.post.type || s.post.kind) || ownsType(decls[tr], s.post));
      const order = [...slots].sort((a, b) => elig(a).length - elig(b).length);
      const used = new Set(),
        pairs = [];
      let mastered = 0;
      for (const s of order) {
        const cands = elig(s).filter(tr => !used.has(tr)).sort((x, y) => (y === focus) - (x === focus) || masters(y, s) - masters(x, s));
        if (!cands.length) continue;
        used.add(cands[0]);
        if (masters(cands[0], s)) mastered++;
        pairs.push({
          mission: s.mission.id,
          tri: cands[0],
          post: s.post
        });
      }
      if (!pairs.length) continue;
      options.push({
        missions,
        pairs,
        covered: pairs.length,
        need: slots.length,
        full: pairs.length === slots.length,
        mastered,
        focus: !!focus && pairs.some(p => p.tri === focus)
      });
    }
    // tri : mission complète d'abord, puis la plus grande couverture, maîtrise, pilote de la case cliquée
    options.sort((a, b) => b.full - a.full || b.covered - a.covered || b.focus - a.focus || b.mastered - a.mastered);
    // proposition « pour tout le monde » : options complètes, sans pilote commun, jusqu'à couvrir les pilotes libres
    const proposal = [],
      taken = new Set();
    for (const o of options.filter(o => o.full).sort((a, b) => b.focus - a.focus || b.covered - a.covered || b.mastered - a.mastered)) {
      if (o.pairs.some(p => taken.has(p.tri))) continue;
      proposal.push(o);
      o.pairs.forEach(p => taken.add(p.tri));
      if (taken.size >= free.length) break;
    }
    return {
      options,
      proposal,
      left: free.filter(tr => !taken.has(tr))
    };
  }

  // ---- Centre : écriture d'une affectation (dossier de la mission + index), sans dépendre du registre : dossier des
  // missions autorisé (FileAccess, « __missions »), dossier de la mission d'après son entrée de registre (folder) ou
  // la règle <lettre>_<FAMILLE>/<ID>
  async function missionsDir() {
    const FA = window.FileAccess;
    if (!FA) throw new Error(t(['Module d’accès aux dossiers absent', 'Folder access module missing']));
    const st = await FA.status('__missions');
    if (st.handle && st.permission === 'granted') return st.handle;
    if (st.handle) try {
      if ((await st.handle.requestPermission({
          mode: 'readwrite'
        })) === 'granted') return st.handle;
    } catch {
      /* dossier déplacé */ }
    try {
      return await FA.pickFolder('__missions');
    } catch (e) {
      throw new Error(t([`Dossier des missions non autorisé (${e?.name || ''} ${e?.message || ''})`, `Missions folder not authorised (${e?.name || ''} ${e?.message || ''})`]));
    }
  }
  /** Dossier d'une mission (créé au besoin) : { h, folder }. */
  async function missionFolder(dir, mission) {
    let folder = mission.folder;
    if (!folder) {
      const letter = String(mission.id || '').charAt(0),
        fam = [];
      for await (const [n, x] of dir.entries())
        if (x.kind === 'directory' && n.startsWith(letter + '_')) fam.push(n);
      folder = `${fam[0] || `${letter}_${String(mission.type || 'MISSION').toUpperCase()}`}/${mission.id}`;
    }
    let h = dir;
    for (const part of folder.split('/').filter(Boolean)) h = await h.getDirectoryHandle(part, {
      create: true
    });
    return {
      h,
      folder
    };
  }
  /** Participants d'une affectation, comme les calcule le dialogue : appareil de la flotte, convoyage depuis sa base,
   *  heures (décalées d'une minute par équipier). rows : [{ pilot, registration, callsign, ferryPilot }] ; y : yaml. */
  async function buildParticipants(y, rows, takeoff) {
    const departure = geo.icaoOf(y?.origin) || '',
      blockMin = +y?.timing?.estimated_block_min || +y?.timing?.estimated_flight_min || 120,
      out = [];
    for (const [i, r] of rows.entries()) {
      const plane = (window.DEFA_FLEET || []).find(f => f.registration === r.registration),
        tk = takeoff + i * 6e4;
      const ferry = plane ? await ferryOf({
        base: plane.base,
        departure,
        type: plane.type,
        takeoff: tk,
        pilot: r.ferryPilot || r.pilot
      }) : null;
      out.push({
        pilot: r.pilot,
        callsign: r.callsign || '',
        aircraft: plane ? {
          registration: plane.registration,
          type: plane.type,
          variant: plane.variant || '',
          base: plane.base || ''
        } : null,
        departure,
        takeoff: new Date(tk).toISOString(),
        ferry: ferry?.minutes ? ferry : null,
        block_min: blockMin,
        status: 'affectée'
      });
    }
    return out;
  }
  // ---- journal des affectations : data/missions/affectations_log.json { entries: [{ at, by, action, mission, title,
  // pilot, aircraft, callsign, takeoff, role }] } ; action : affecte, modifie, retire, convoyage
  const LOG_FILE = 'affectations_log.json';
  /** Entrées du journal pour une écriture : différence entre les affectations d'avant et les participants écrits. */
  function logEntries(mission, before, participants, by, at) {
    const out = [],
      line = (action, p, role = 'mission') => ({
        at,
        by,
        action,
        mission: mission.id,
        title: mission.title || '',
        pilot: p.pilot,
        aircraft: p.aircraft ? [p.aircraft.type, p.aircraft.registration].filter(Boolean).join(' ') : '',
        callsign: p.callsign || '',
        takeoff: p.takeoff || '',
        role
      });
    for (const p of participants) {
      const old = before.find(a => a.pilot === p.pilot);
      if (!old) out.push(line('affecte', p));
      else if ((old.aircraft?.registration || '') !== (p.aircraft?.registration || '') || (old.callsign || '') !== (p.callsign || '') || old.takeoff !== p.takeoff) out.push(line('modifie', p));
      if (p.ferry?.pilot && p.ferry.pilot !== p.pilot && p.ferry.takeoff && !(old?.ferry?.pilot === p.ferry.pilot)) out.push({
        ...line('convoyage', { ...p, pilot: p.ferry.pilot, takeoff: p.ferry.takeoff, callsign: '' }, 'convoyage'),
        for_pilot: p.pilot
      });
    }
    for (const a of before)
      if (!participants.some(p => p.pilot === a.pilot)) out.push(line('retire', a));
    return out;
  }
  async function appendLog(dir, entries) {
    if (!entries.length) return;
    let log = {
      entries: []
    };
    try {
      log = JSON.parse(await (await (await dir.getFileHandle(LOG_FILE)).getFile()).text());
    } catch {
      /* premier journal */ }
    log.entries = [...(log.entries || []), ...entries];
    log.updatedAt = entries[entries.length - 1].at;
    const w = await (await dir.getFileHandle(LOG_FILE, {
      create: true
    })).createWritable();
    await w.write(JSON.stringify(log, null, 1));
    await w.close();
  }
  /** Journal des affectations (dossier autorisé, sinon copie servie) ; entrées les plus récentes d'abord. */
  async function readLog() {
    let log = null;
    try {
      const st = await window.FileAccess?.status?.('__missions');
      if (st?.handle && st.permission === 'granted') log = JSON.parse(await (await (await st.handle.getFileHandle(LOG_FILE)).getFile()).text());
    } catch {
      log = null;
    }
    if (!log) try {
      const r = await fetch(new URL(`data/missions/${LOG_FILE}`, root()).href, {
        cache: 'no-store'
      });
      log = r.ok ? await r.json() : null;
    } catch {
      log = null;
    }
    return [...(log?.entries || [])].sort((x, y) => String(y.at).localeCompare(String(x.at)));
  }
  /** Phrase d'une entrée : « 01/10 10:35 · DCP affecte M-002 à RBR (H145 F-ZBPO, DRAGON05, décollage 30/09 08:00Z) ». */
  function logText(e) {
    const d = s => s ? new Date(s).toISOString().slice(5, 16).replace(/(\d\d)-(\d\d)T/, '$2/$1 ') : '';
    const what = { affecte: 'affecte', modifie: 'modifie', retire: 'retire', convoyage: 'confie le convoyage de' }[e.action] || e.action;
    const detail = [e.aircraft, e.callsign, e.takeoff && `décollage ${d(e.takeoff)}Z`].filter(Boolean).join(', ');
    if (e.action === 'retire') return `${d(e.at)} · ${e.by || '?'} retire ${e.pilot} de ${e.mission}`;
    return `${d(e.at)} · ${e.by || '?'} ${what} ${e.mission} à ${e.pilot}${e.for_pilot ? ` (pour ${e.for_pilot})` : ''}${detail ? ` (${detail})` : ''}`;
  }
  /** Écrit affectations.yaml dans le dossier de la mission et met à jour data/missions/affectations.json (index : une
   *  ligne par participant, et une ligne « convoyage » pour un convoyeur autre que le pilote). mission : entrée du
   *  registre { id, type, title, folder, files, maps } ; participants : [{ pilot, callsign, aircraft:{ registration, type,
   *  base }, departure, takeoff, ferry:{ from, to, minutes, takeoff, pilot }, block_min, status }] ; extra : { h_hour,
   *  alert, by }. Retour : chemin du fichier de la mission. */
  async function writeAssignment(mission, participants, extra = {}) {
    const dir = await missionsDir(),
      at = new Date().toISOString();
    const doc = {
      mission: mission.id,
      updated_at: at,
      by: extra.by || trigram() || 'CPCO',
      h_hour: extra.h_hour || null,
      participants,
      alert: extra.alert || null
    };
    const mh = await missionFolder(dir, mission);
    const w = await (await mh.h.getFileHandle('affectations.yaml', {
      create: true
    })).createWritable();
    await w.write(`# Affectations de la mission ${mission.id} — docs/AFFECTATION_MISSIONS.md\n` + (window.jsyaml ? window.jsyaml.dump(doc, {
      lineWidth: -1,
      noRefs: true
    }) : JSON.stringify(doc, null, 2)));
    await w.close();
    let idx = {
      assignments: []
    };
    try {
      idx = JSON.parse(await (await (await dir.getFileHandle('affectations.json')).getFile()).text());
    } catch {
      /* premier index */ }
    const common = {
      mission: mission.id,
      title: mission.title || '',
      type: mission.type || '',
      folder: mh.folder,
      files: {
        yaml: (mission.files || []).find(f => /\.ya?ml$/i.test(f)) || `mission${mission.id}.yaml`,
        md: (mission.files || []).find(f => /\.md$/i.test(f)) || '',
        maps: (mission.maps || mission.images || []).map(x => typeof x === 'string' ? x : x?.name || x?.file).filter(Boolean)
      },
      h_hour: doc.h_hour,
      alert: doc.alert,
      updated_at: at,
      by: doc.by
    };
    const before = (idx.assignments || []).filter(a => a.mission === mission.id && a.role !== 'convoyage');
    idx.assignments = (idx.assignments || []).filter(a => a.mission !== mission.id);
    for (const p of participants) {
      idx.assignments.push({
        ...common,
        ...p,
        role: 'mission'
      });
      // convoyeur autre que le pilote : sa propre ligne (il voit le convoyage dans « Mes missions »)
      if (p.ferry?.pilot && p.ferry.pilot !== p.pilot && p.ferry.takeoff) idx.assignments.push({
        ...common,
        role: 'convoyage',
        pilot: p.ferry.pilot,
        callsign: '',
        aircraft: p.aircraft,
        departure: p.ferry.from,
        destination: p.ferry.to,
        takeoff: p.ferry.takeoff,
        block_min: p.ferry.minutes,
        ferry: null,
        for_pilot: p.pilot,
        status: p.status
      });
    }
    idx.updatedAt = at;
    const wi = await (await dir.getFileHandle('affectations.json', {
      create: true
    })).createWritable();
    await wi.write(JSON.stringify(idx, null, 2));
    await wi.close();
    cache = idx; // l'index écrit fait foi pour les relectures (même si la page sert une autre copie)
    await appendLog(dir, logEntries(mission, before, participants, doc.by, at));
    envelope();
    return `${mh.folder}/affectations.yaml`;
  }

  window.MissionAssignments = {
    PAGE,
    TURN_MIN,
    trigram,
    index,
    mine,
    key,
    when,
    isRead,
    markRead,
    markUnread,
    envelope,
    DAYS,
    LEGEND,
    emptyGrid,
    availability,
    availabilityAt,
    availableAt,
    saveAvailability,
    saveAircraft,
    saveSims,
    simTag,
    simChips,
    weekKey,
    addWeeks,
    weekGrid,
    simulators,
    SIMULATORS,
    gridEditor,
    geo,
    typeOf,
    cruiseKt,
    coordsOf,
    rememberAirport,
    ferryOf,
    fleetTypes,
    qualification,
    slotRange,
    declaredOver,
    busyRange,
    assignedOver,
    conflicts,
    declarations,
    ownsType,
    postsOf,
    planesFor,
    fits,
    specLabel,
    pool,
    poolLabel,
    planSlot,
    writeAssignment,
    readLog,
    logText,
    buildParticipants,
    missionsDir
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
