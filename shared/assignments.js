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
  //   availabilityAt(décl, ms, famille), saveAvailability(TRI, grille, { toFolder }), saveAircraft(TRI, { owned, mastered }),
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
      grid: normGrid(grid),
      aircraft: json(AVAIL, {})[tri]?.aircraft || null
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
    if (!av?.grid || !start || !end) return null;
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
  const ownsType = (decl, type) => decl?.aircraft ? [...(decl.aircraft.owned || []), ...(decl.aircraft.mastered || [])].includes(typeOf(type)) : null;
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
      const slots = missions.flatMap(m => Array.from({
        length: Math.max(1, (m.callsigns || []).length || 1)
      }, () => ({
        mission: m,
        types: (m.aircraftTypes || []).map(typeOf).filter(Boolean)
      })));
      // affectation gloutonne : postes les plus rares d'abord (moins de pilotes éligibles), maîtrisé avant possédé
      const elig = s => free.filter(tr => !s.types.length || s.types.some(ty => ownsType(decls[tr], ty)));
      const order = [...slots].sort((a, b) => elig(a).length - elig(b).length);
      const used = new Set(),
        pairs = [];
      let mastered = 0;
      for (const s of order) {
        const cands = elig(s).filter(tr => !used.has(tr)).sort((x, y) => (y === focus) - (x === focus) || (s.types.some(ty => decls[y]?.aircraft?.mastered?.includes(ty))) - (s.types.some(ty => decls[x]?.aircraft?.mastered?.includes(ty))));
        if (!cands.length) continue;
        used.add(cands[0]);
        if (s.types.some(ty => decls[cands[0]]?.aircraft?.mastered?.includes(ty))) mastered++;
        pairs.push({
          mission: s.mission.id,
          tri: cands[0]
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
    cache = idx;
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
    envelope,
    DAYS,
    LEGEND,
    emptyGrid,
    availability,
    availabilityAt,
    availableAt,
    saveAvailability,
    saveAircraft,
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
    pool,
    poolLabel,
    planSlot,
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
