(() => {
  'use strict';
  // Fiches « appareil » et « membre d'équipage » (CR DEFA/appareil.html, equipage.html).
  // Base « lâche » : tout ce qui est connu est repris (catalogue commun — flotte, référence DEFA,
  // missions, journal DEFA —, missions du registre, journal alternatif, profil du Flight Planner),
  // rien n'est obligatoire ; ce qui est saisi ici (statut, rattachement, mise en service,
  // événements, qualifications…) est gardé dans le navigateur (missionAircraftSheets:v1,
  // missionCrewSheets:v1 — inclus dans la sauvegarde locale).
  const M = window.MissionModel,
    V = window.MissionVocab,
    L = V.L,
    C = window.MissionCharts;
  /** Échappe un texte pour HTML. */
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));
  /** Rang (0–3) de la langue de la page. */
  const idx = () => Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
  /** Texte d'une ligne [fr, en, de, es] dans la langue de la page. */
  const tr = row => Array.isArray(row) ? row[idx()] || row[0] : String(row ?? '');
  /** Clé : majuscules, lettres et chiffres seulement. */
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Valeur JSON d'une clé du localStorage ; null sinon. */
  const read = k => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null');
    } catch {
      return null;
    }
  };
  /** Écrit une valeur JSON dans le localStorage. */
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  /** Minutes → « 1h05 ». */
  const duration = v => {
    v = Math.round(v || 0);
    return v >= 60 ? `${Math.floor(v / 60)}h${String(v % 60).padStart(2, '0')}` : `${v} min`;
  };
  /** Minutes → heures décimales « 12,5 h ». */
  const hours = v => `${((v || 0) / 60).toFixed(v >= 6000 ? 0 : 1).replace('.', ',')} h`;
  const COLORS = {
    HEMS: '#ef4444',
    FIRE: '#f97316',
    SAR: '#eab308',
    AIRLIFT: '#3b82f6',
    AAR: '#0f766e',
    MARITIME: '#06b6d4',
    HADR: '#22c55e',
    AIRBORNE: '#84cc16',
    FI: '#a855f7',
    SURVEY: '#14b8a6',
    LE: '#6366f1',
    ISR: '#94a3b8',
    COMMAND: '#0ea5e9',
    SOF: '#a8a29e',
    SPECIAL: '#ec4899'
  };
  const UI = {
    aircraft: L('Fiche appareil', 'Aircraft sheet', 'Luftfahrzeugblatt', 'Ficha de aeronave'),
    crew: L('Fiche équipage', 'Crew sheet', 'Besatzungsblatt', 'Ficha de tripulante'),
    identity: L('Identité', 'Identity', 'Identität', 'Identidad'),
    activity: L('Activité', 'Activity', 'Aktivität', 'Actividad'),
    events: L('Vie de l’appareil (maintenance, inspections, incidents…)', 'Aircraft life (maintenance, inspections, incidents…)', 'Lebenslauf (Wartung, Inspektionen, Vorfälle…)', 'Vida de la aeronave (mantenimiento, inspecciones, incidentes…)'),
    perf: L('Performances et consommation (Flight Planner)', 'Performance and fuel burn (Flight Planner)', 'Leistung und Verbrauch (Flight Planner)', 'Rendimiento y consumo (Flight Planner)'),
    missions: L('Missions et vols', 'Missions and flights', 'Einsätze und Flüge', 'Misiones y vuelos'),
    status: L('Statut', 'Status', 'Status', 'Estado'),
    home: L('Terrain de rattachement', 'Home aerodrome', 'Heimatflugplatz', 'Aeródromo de base'),
    now: L('Actuellement à', 'Currently at', 'Derzeit in', 'Actualmente en'),
    commissioned: L('Mise en service', 'Commissioned', 'Indienststellung', 'Puesta en servicio'),
    type: L('Type', 'Type', 'Muster', 'Tipo'),
    variant: L('Variante', 'Variant', 'Variante', 'Variante'),
    category: L('Voilure', 'Wing', 'Flügel', 'Ala'),
    wtc: L('Turbulence de sillage', 'Wake turbulence', 'Wirbelschleppe', 'Estela'),
    operator: L('Opérateur', 'Operator', 'Betreiber', 'Operador'),
    fleet: L('Fiche flotte DEFA', 'DEFA fleet sheet', 'DEFA-Flottenblatt', 'Ficha de flota DEFA'),
    callsigns: L('Indicatifs utilisés', 'Callsigns used', 'Verwendete Rufzeichen', 'Indicativos usados'),
    equipment: L('Équipements', 'Equipment', 'Ausrüstung', 'Equipamiento'),
    notes: L('Notes', 'Notes', 'Notizen', 'Notas'),
    save: L('Enregistrer la fiche', 'Save sheet', 'Blatt speichern', 'Guardar ficha'),
    saved: L('Fiche enregistrée dans ce navigateur', 'Sheet saved in this browser', 'Blatt im Browser gespeichert', 'Ficha guardada en este navegador'),
    flights: L('Missions / vols', 'Missions / flights', 'Einsätze / Flüge', 'Misiones / vuelos'),
    flightTime: L('Heures de vol', 'Flight hours', 'Flugstunden', 'Horas de vuelo'),
    blockTime: L('Heures bloc', 'Block hours', 'Blockstunden', 'Horas calzo'),
    first: L('Premier vol', 'First flight', 'Erster Flug', 'Primer vuelo'),
    last: L('Dernier vol', 'Last flight', 'Letzter Flug', 'Último vuelo'),
    date: L('Date', 'Date', 'Datum', 'Fecha'),
    kind: L('Nature', 'Kind', 'Art', 'Tipo'),
    description: L('Description', 'Description', 'Beschreibung', 'Descripción'),
    ad: L('Terrain', 'Aerodrome', 'Flugplatz', 'Aeródromo'),
    addEvent: L('+ Ajouter un événement', '+ Add event', '+ Ereignis hinzufügen', '+ Añadir evento'),
    none: L('—', '—'),
    noProfile: L('Pas encore de profil de performance pour ce type : le créer dans le Flight Planner.', 'No performance profile for this type yet: create it in the Flight Planner.', 'Noch kein Leistungsprofil für dieses Muster: im Flight Planner anlegen.', 'Aún no hay perfil de rendimiento para este tipo: créelo en el Flight Planner.'),
    openPlanner: L('Ouvrir dans le Flight Planner', 'Open in the Flight Planner', 'Im Flight Planner öffnen', 'Abrir en el Flight Planner'),
    source: L('Source', 'Source', 'Quelle', 'Fuente'),
    ledger: L('registre', 'ledger', 'Register', 'registro'),
    log: L('journal DEFA', 'DEFA log', 'DEFA-Journal', 'diario DEFA'),
    family: L('Famille', 'Family', 'Familie', 'Familia'),
    callsign: L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'),
    route: L('Départ → arrivée', 'Departure → arrival', 'Abflug → Ankunft', 'Salida → llegada'),
    pilot: L('Équipage', 'Crew', 'Besatzung', 'Tripulación'),
    aircraftCol: L('Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'),
    name: L('Nom', 'Name', 'Name', 'Nombre'),
    qualifications: L('Qualifications (une par ligne)', 'Qualifications (one per line)', 'Qualifikationen (eine pro Zeile)', 'Calificaciones (una por línea)'),
    roles: L('Fonctions tenues', 'Roles held', 'Ausgeübte Funktionen', 'Funciones ejercidas'),
    byType: L('Par type', 'By type', 'Nach Muster', 'Por tipo'),
    unknown: L('Inconnu dans les bases : la fiche se remplira au fil des CR (base « lâche »).', 'Unknown in the bases: the sheet will fill as reports come in (loose base).', 'In den Datenbanken unbekannt: das Blatt füllt sich mit den Berichten.', 'Desconocido en las bases: la ficha se completará con los informes.'),
    merge: L('Fusionner avec… / renommer', 'Merge with… / rename', 'Zusammenführen mit… / umbenennen', 'Fusionar con… / renombrar'),
    mergeHint: L('Les missions du registre qui portent cette valeur prennent la nouvelle (trace dans chaque mission) ; cette fiche complète celle de la cible ; le journal DEFA rechargé suivra.', 'Ledger missions carrying this value take the new one (traced in each mission); this sheet completes the target one; the reloaded DEFA log will follow.', 'Einsätze mit diesem Wert übernehmen den neuen (Spur im Einsatz); dieses Blatt ergänzt das Ziel.', 'Las misiones con este valor toman el nuevo (traza en cada misión); esta ficha completa la de destino.'),
    mergeGo: L('Fusionner', 'Merge', 'Zusammenführen', 'Fusionar'),
    mergeConfirm: L('{n} mission(s) du registre passeront de {a} à {b}. Continuer ?', '{n} ledger mission(s) will change from {a} to {b}. Continue?', '{n} Einsatz/Einsätze wechseln von {a} zu {b}. Fortfahren?', '{n} misión(es) pasarán de {a} a {b}. ¿Continuar?'),
    back: L('← Reporting missions', '← Mission reporting', '← Einsatzauswertung', '← Informe de misiones')
  };
  const STATUS = [
    ['', '—'],
    ['DISPONIBLE', L('Disponible', 'Available', 'Verfügbar', 'Disponible')],
    ['INDISPONIBLE', L('Indisponible', 'Unavailable', 'Nicht verfügbar', 'No disponible')],
    ['MAINTENANCE', L('En maintenance', 'In maintenance', 'In Wartung', 'En mantenimiento')],
    ['RETIRÉ', L('Retiré du service', 'Retired', 'Außer Dienst', 'Retirado')]
  ];
  const STATUS_COLOR = {
    DISPONIBLE: '#16a34a',
    INDISPONIBLE: '#dc2626',
    MAINTENANCE: '#d97706',
    'RETIRÉ': '#6b7280'
  };
  const EVENT_KINDS = ['MAINTENANCE', 'INSPECTION', 'INCIDENT', 'MODIFICATION', 'CONVOYAGE', 'AUTRE'];

  // ---- missions connues (registre + journal DEFA chargé)
  /** Missions connues pour les fiches : registre des missions et journal DEFA chargé. */
  async function missions() {
    try {
      await window.MissionLedger?.load();
    } catch {
      /* registre illisible */ }
    const ledger = (window.MissionLedger?.store?.missions || []).map((m, i, all) => ({
      m,
      src: 'ledger',
      index: all.slice(0, i).filter(x => x.family === m.family).length
    }));
    const log = window.DefaFlightLog?.records?.().length ? window.DefaFlightLog.toMissions().map(m => ({
      m,
      src: 'log'
    })) : [];
    return ledger.concat(log).map(x => ({
      ...x,
      s: M.computeStatistics(x.m)
    }));
  }
  /** Lien vers la mission dans la page de CR de sa famille. */
  const crPage = (family, index, id) => {
    const f = V.families.find(x => x.id === family);
    return f ? `${f.cr}?edit=${index}&id=${encodeURIComponent(id || '')}` : '';
  };
  /** Pastille colorée d'une famille. */
  const tag = id => `<span class="sh-tag" style="--c:${COLORS[id] || '#64748b'}">${esc(id)}</span>`;

  /** Tableau triable des missions d'une fiche (SortedTable), clic = ouvrir la mission. */
  function missionsTable(host, list, columns) {
    window.SortedTable.render(host, {
      rows: list.map(x => ({
        x,
        date: x.m.metadata?.date || '',
        time: x.m.metadata?.timeLocal || '',
        family: x.m.family,
        missionId: x.m.metadata?.missionId || '',
        callsign: x.m.aircraft?.[0]?.callsign || '',
        registration: x.m.aircraft?.[0]?.registration || '',
        type: x.m.aircraft?.[0]?.type || '',
        route: `${x.m.navigation?.dep || x.m.aircraft?.[0]?.baseDeparture || '…'} → ${x.m.navigation?.arr || '…'}`,
        flight: x.s.flightMinutes,
        crew: (x.m.crew || []).map(c => c.name).filter(Boolean).join(', '),
        src: x.src
      })),
      columns,
      defaultSortKey: 'date',
      defaultDir: -1,
      emptyText: '—',
      onRowClick: r => {
        if (r.src === 'ledger') {
          const url = crPage(r.family, r.x.index, r.missionId);
          if (url) location.href = url;
        }
      }
    });
  }
  /** Colonnes communes du tableau des missions (date, famille, n°, appareil, durées…). */
  const commonColumns = () => [{
    key: 'date',
    label: tr(UI.date),
    format: (v, r) => `${v} ${r.time || ''}`
  }, {
    key: 'family',
    label: tr(UI.family),
    html: v => tag(v)
  }, {
    key: 'missionId',
    label: 'N°'
  }, {
    key: 'callsign',
    label: tr(UI.callsign)
  }, {
    key: 'route',
    label: tr(UI.route)
  }, {
    key: 'flight',
    label: tr(UI.flightTime),
    type: 'number',
    format: v => v == null ? '—' : duration(v)
  }, {
    key: 'src',
    label: tr(UI.source),
    format: v => tr(v === 'log' ? UI.log : UI.ledger)
  }];
  // Période : même composant et même état que les reportings (en-tête de la fiche) ; le
  // graphique, les cartes et le tableau suivent ; l'identité reste calculée sur tout l'historique.
  let periodCtrl = null,
    periodPaint = null;

  /** Composant de période des fiches (TimePeriod), borné aux missions, repeint à chaque changement. */
  function period(all, paint) {
    periodPaint = paint;
    if (!periodCtrl && window.TimePeriod) {
      const header = document.querySelector('header.mc-header'),
        bar = document.createElement('div');
      bar.className = 'mc-report-tools';
      bar.innerHTML = '<div class="sh-period"></div>';
      (header || document.body).append(bar);
      periodCtrl = window.TimePeriod.mount(bar.querySelector('.sh-period'), {
        onChange: () => periodPaint?.()
      });
    }
    const dates = all.map(x => x.m.metadata?.date).filter(Boolean).sort();
    periodCtrl?.setBounds(dates[0] || null, dates[dates.length - 1] || null);
  }
  /** Missions de la période courante. */
  const inPeriod = list => window.TimePeriod ? window.TimePeriod.filterRows(list.map(x => ({
    x,
    date: x.m.metadata?.date || ''
  })), 'date').map(o => o.x) : list;

  /** Graphique d'activité (heures par période et par famille) d'une fiche. */
  function activityChart(host, list) {
    if (!C || !list.length) {
      host.innerHTML = '';
      return;
    }
    const range = window.TimePeriod?.range() || {};
    const b = C.buckets(list.map(x => x.m.metadata?.date).filter(Boolean), {
      start: range.start || '',
      end: range.end || '',
      unit: 'auto',
      lang: ['fr', 'en', 'de', 'es'][idx()]
    });
    const fams = [...new Set(list.map(x => x.m.family))],
      grid = {};
    list.forEach(x => {
      const d = x.m.metadata?.date;
      if (!d) return;
      const k = b.keyOf(d);
      (grid[k] ||= {})[x.m.family] = (grid[k]?.[x.m.family] || 0) + (x.s.flightMinutes || 0) / 60;
    });
    host.innerHTML = C.stackedBars({
        buckets: b.list,
        series: fams.map(f => ({
          id: f,
          label: f,
          color: COLORS[f] || '#64748b'
        })),
        value: (k, id) => grid[k]?.[id] || 0,
        format: v => `${v.toFixed(v >= 10 ? 0 : 1)} h`,
        height: 200
      }) +
      `<div class="mcg-series-legend">${fams.map(f => `<span><i style="background:${COLORS[f] || '#64748b'}"></i>${esc(f)}</span>`).join('')}</div>`;
    C.enableZoom?.(host); // glisser / clic : zoom ; double-clic : zoom arrière
  }
  /** Cartes de synthèse [libellé, valeur, sous-titre]. */
  const cards = items => `<div class="mc-cards">${items.map(([label, value, sub = '']) => `<div class="card"><span class="small">${esc(tr(label))}</span><b>${esc(value)}</b><span class="small">${esc(sub)}</span></div>`).join('')}</div>`;

  // Fusion / renommage (appareil : immatriculation ; équipage : trigramme ou nom).
  function mergeBox(kind, current, candidates, urlOf) {
    const id = `sh-cands-${kind}`;
    return {
      html: `<details class="sh-merge"><summary>${esc(tr(UI.merge))}</summary><p class="small">${esc(tr(UI.mergeHint))}</p><div class="row"><input list="${id}" data-merge-target placeholder="${kind === 'aircraft' ? 'F-XXXX' : 'ABC'}"><datalist id="${id}">${candidates.filter(c => key(c) !== key(current)).map(c => `<option value="${esc(c)}">`).join('')}</datalist><button type="button" data-merge-go>${esc(tr(UI.mergeGo))}</button></div></details>`,
      bind(root) {
        root.querySelector('[data-merge-go]').onclick = async () => {
          const target = root.querySelector('[data-merge-target]').value.trim();
          if (!target) return;
          const G = window.MissionGridEdit,
            n = G.affected(kind, current).length;
          if (!confirm(tr(UI.mergeConfirm).replace('{n}', n).replace('{a}', current).replace('{b}', target.toUpperCase()))) return;
          const result = await G.rename(kind, current, target);
          location.href = urlOf(result.target || target);
        };
      }
    };
  }

  // ---- fiche appareil
  const AIRCRAFT_SHEETS = 'missionAircraftSheets:v1';
  /** Fiche d'un appareil (appareil.html?reg=) : identité, statut, terrain, profil de performances, courbe RPM, événements, activité et missions de la période, fusion / renommage. */
  async function mountAircraft(root, registration) {
    const reg = key(registration),
      catalog = window.AircraftCatalog?.defaAircraft?.() || [];
    const known = catalog.find(a => key(a.registration) === reg) || {
      registration: M.formatRegistration(registration || ''),
      callsigns: []
    };
    const sheets = read(AIRCRAFT_SHEETS) || {},
      sheet = {
        status: '',
        homeAd: known.homeAd || '',
        commissioned: '',
        notes: '',
        events: [],
        ...(sheets[reg] || {})
      };
    const typeInfo = window.MissionAircraft?.lookupType?.(known.type) || (window.AIRCRAFT_DB || {})[key(known.type)] || null;
    const all = (await missions()).filter(x => (x.m.aircraft || []).some(a => key(a.registration) === reg)).sort((a, b) => String(b.m.metadata?.date).localeCompare(String(a.m.metadata?.date)));
    const lastMission = all[0]?.m,
      nowAt = lastMission ? (lastMission.navigation?.arr || lastMission.aircraft?.[0]?.baseReturn || lastMission.navigation?.dep) : known.lastAd;
    const flight = all.reduce((a, x) => a + (x.s.flightMinutes || 0), 0),
      block = all.reduce((a, x) => a + (x.s.blockMinutes || 0), 0);
    const callsigns = new Map();
    all.forEach(x => {
      const c = String(x.m.aircraft?.find(a => key(a.registration) === reg)?.callsign || '').toUpperCase();
      if (c) callsigns.set(c, (callsigns.get(c) || 0) + 1);
    });
    (known.callsigns || []).forEach(c => {
      if (!callsigns.has(c)) callsigns.set(c, 0);
    });
    const equipment = new Set();
    all.forEach(x => (x.m.aircraft || []).filter(a => key(a.registration) === reg).forEach(a => (a.equipment || []).forEach(e => equipment.add(e))));
    const category = typeInfo?.category || known.category || '',
      catLabel = (V.aircraftCategories || []).find(o => o.value === category);
    document.title = `${known.registration} — ${tr(UI.aircraft)}`;
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = `${known.registration} — ${[known.type, typeInfo?.model].filter(Boolean).join(' · ') || tr(UI.aircraft)}`;
    const status = sheet.status || known.status || '';
    const regs = [...new Set(catalog.map(a => a.registration).concat((window.MissionLedger?.store?.missions || []).flatMap(m => (m.aircraft || []).map(a => a.registration)).filter(Boolean)))].sort();
    const merger = mergeBox('aircraft', known.registration, regs, target => `appareil.html?reg=${encodeURIComponent(target)}`);
    root.innerHTML = `
      <section class="sh-head"><div class="sh-badges">
          <span class="sh-status" style="--c:${STATUS_COLOR[status] || '#94a3b8'}">${esc(tr((STATUS.find(s => s[0] === status) || STATUS[0])[1]))}</span>
          <span class="sh-now">📍 ${esc(tr(UI.now))} <b>${esc(nowAt || '—')}</b></span>
          <span class="sh-home">🏠 ${esc(tr(UI.home))} <b>${esc(sheet.homeAd || known.homeAd || '—')}</b></span></div>
        ${!catalog.some(a => key(a.registration) === reg) && !all.length ? `<p class="small">${esc(tr(UI.unknown))}</p>` : ''}</section>
      <section data-icon="hash"><h2>${esc(tr(UI.identity))}</h2><div class="sh-grid">
        <label>${esc(tr(UI.status))}<select data-sheet="status">${STATUS.map(([v, l]) => `<option value="${esc(v)}"${v === status ? ' selected' : ''}>${esc(tr(l))}</option>`).join('')}</select></label>
        <label>${esc(tr(UI.home))}<input data-sheet="homeAd" value="${esc(sheet.homeAd)}" placeholder="${esc(known.homeAd || 'LFxx')}"></label>
        <label>${esc(tr(UI.commissioned))}<input type="date" data-sheet="commissioned" value="${esc(sheet.commissioned || known.commissioned || '')}"></label>
        <div><span class="small">${esc(tr(UI.type))}</span><b>${esc(known.type || '—')}</b> ${esc(typeInfo?.model || '')}</div>
        <div><span class="small">${esc(tr(UI.variant))}</span><b>${esc(known.variant || '—')}</b></div>
        <div><span class="small">${esc(tr(UI.category))}</span><b>${esc(catLabel ? tr(catLabel.label) : category || '—')}</b>${typeInfo?.wtc ? ` · ${esc(tr(UI.wtc))} ${esc(typeInfo.wtc)}` : ''}</div>
        <div><span class="small">${esc(tr(UI.operator))}</span><b>${esc(known.operator || '—')}</b></div>
        <div><span class="small">${esc(tr(UI.fleet))}</span>${known.fleetId ? `<a href="${esc(window.RepositoryNav?.source?.('defa') || 'https://flotte.defa-virtual.fr')}/appareil.php?id=${esc(known.fleetId)}" target="_blank" rel="noopener">#${esc(known.fleetId)} ↗</a>` : '—'}</div>
        <div class="sh-wide"><span class="small">${esc(tr(UI.callsigns))}</span><div class="sh-chips">${[...callsigns].sort((a, b) => b[1] - a[1]).map(([c, n]) => `<span class="sh-chip">${esc(c)}${n ? ` <em>${n}</em>` : ''}</span>`).join('') || '—'}</div></div>
        <div class="sh-wide"><span class="small">${esc(tr(UI.equipment))}</span><div class="sh-chips">${[...equipment].map(e => `<span class="sh-chip">${esc(e)}</span>`).join('') || '—'}</div></div>
        <label class="sh-wide">${esc(tr(UI.notes))}<textarea data-sheet="notes" rows="2">${esc(sheet.notes)}</textarea></label>
      </div><div class="row"><button type="button" class="primary" data-save>${esc(tr(UI.save))}</button><span class="small sh-saved"></span></div>${merger.html}</section>
      <section data-icon="calendar"><h2>${esc(tr(UI.activity))}</h2><div class="sh-activity"></div><div class="sh-chart"></div></section>
      <section data-icon="pin"><h2>${esc(tr(UI.events))} <button type="button" class="mc-head-add" data-add-event title="${esc(tr(UI.addEvent))}">+</button></h2><div class="sh-events"></div></section>
      <section data-icon="chart"><h2>${esc(tr(UI.perf))}</h2><div class="sh-perf"></div></section>
      <section data-icon="list"><h2>${esc(tr(UI.missions))}</h2><div class="sh-missions"></div><div class="sh-edges" hidden></div></section>`;
    window.AppFramework?.refresh?.();   // blocs du framework (masquer, déplacer) et icônes de blocs (block_icons.js)
    // Enregistrement de la fiche (navigateur).
    const saveSheet = () => {
      root.querySelectorAll('[data-sheet]').forEach(el => {
        sheet[el.dataset.sheet] = el.dataset.sheet === 'homeAd' ? el.value.trim().toUpperCase() : el.value;
      });
      sheet.updatedAt = new Date().toISOString();
      const all2 = read(AIRCRAFT_SHEETS) || {};
      all2[reg] = {
        ...sheet,
        registration: known.registration
      };
      write(AIRCRAFT_SHEETS, all2);
      root.querySelector('.sh-saved').textContent = `${tr(UI.saved)} · ${new Date().toLocaleTimeString()}`;
    };
    root.querySelector('[data-save]').onclick = () => {
      saveSheet();
      mountAircraft(root, registration);
    };
    merger.bind(root);
    // Événements de la vie de l'appareil.
    const paintEvents = () => {
      const host = root.querySelector('.sh-events');
      host.innerHTML = sheet.events.length ? `<table class="sh-table"><thead><tr><th>${esc(tr(UI.date))}</th><th>${esc(tr(UI.kind))}</th><th>${esc(tr(UI.ad))}</th><th>${esc(tr(UI.description))}</th><th></th></tr></thead><tbody>${sheet.events.map((e, i) => `<tr>
        <td><input type="date" data-ev="${i}" data-k="date" value="${esc(e.date)}"></td><td><select data-ev="${i}" data-k="kind">${EVENT_KINDS.map(k => `<option${k === e.kind ? ' selected' : ''}>${k}</option>`).join('')}</select></td>
        <td><input data-ev="${i}" data-k="ad" value="${esc(e.ad || '')}" size="6"></td><td><input data-ev="${i}" data-k="description" value="${esc(e.description || '')}"></td><td><button type="button" class="mc-remove" data-del="${i}">×</button></td></tr>`).join('')}</tbody></table>` : `<p class="small">—</p>`;
      host.querySelectorAll('[data-ev]').forEach(el => el.onchange = () => {
        sheet.events[el.dataset.ev][el.dataset.k] = el.dataset.k === 'ad' ? el.value.toUpperCase() : el.value;
        saveSheet();
      });
      host.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        sheet.events.splice(Number(b.dataset.del), 1);
        saveSheet();
        paintEvents();
      });
    };
    root.querySelector('[data-add-event]').onclick = () => {
      sheet.events.unshift({
        date: new Date().toISOString().slice(0, 10),
        kind: 'MAINTENANCE',
        ad: nowAt || '',
        description: ''
      });
      saveSheet();
      paintEvents();
    };
    paintEvents();
    // Performances : profil du Flight Planner pour ce type (même stockage : flightPerfState).
    const perf = root.querySelector('.sh-perf'),
      state = read('flightPerfState') || {},
      t = key(known.type),
      resolved = key(typeInfo?.tdesig || t);
    const profile = Object.values(state.profiles || {}).find(p => [p.id, p.icao, p.type].map(key).some(k => k && (k === t || k === resolved)));
    const planner = new URL(`../flight_performance_planner.html?aircraft=${encodeURIComponent(profile?.id || resolved || t)}`, location.href).href;
    if (!profile) perf.innerHTML = `<p class="small">${esc(tr(UI.noProfile))}</p><a class="mc-button" href="${esc(planner)}">${esc(tr(UI.openPlanner))} ↗</a>`;
    else {
      // Valeurs du profil : 1 chiffre après la virgule.
      const d1 = v => v == null || v === '' || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      const u = profile.unit || 'kg',
        phase = (label, p) => p ? `<div class="card"><span class="small">${label}</span><b>${d1(p.fuelFlowPerHour)} ${esc(u)}/h</b><span class="small">TAS ${d1(p.tasKt)} kt${p.rateFpm ? ` · ${d1(p.rateFpm)} ft/min` : ''}</span></div>` : '';
      const curve = Array.isArray(profile.rpmFuelCurve) ? profile.rpmFuelCurve : [];
      perf.innerHTML = `<p class="small">${esc(profile.name || profile.id)}${profile.calibration ? ` · calibration ${esc(profile.calibration.createdAt || '')}` : ''}</p><div class="mc-cards">${phase('Montée', profile.climb)}${phase('Croisière', profile.cruise)}${phase('Descente', profile.descent)}${profile.reserveFuelFlowPerHour ? `<div class="card"><span class="small">Réserve</span><b>${d1(profile.reserveFuelFlowPerHour)} ${esc(u)}/h</b></div>` : ''}</div>
        ${curve.length ? `<div class="sh-curve">${curveSvg(curve)}</div>` : ''}<a class="mc-button" href="${esc(planner)}">${esc(tr(UI.openPlanner))} ↗</a>`;
    }
    const paint = () => {
      const list = inPeriod(all),
        f = list.reduce((a, x) => a + (x.s.flightMinutes || 0), 0),
        b = list.reduce((a, x) => a + (x.s.blockMinutes || 0), 0);
      root.querySelector('.sh-activity').innerHTML = cards([
        [UI.flights, list.length],
        [UI.flightTime, hours(f)],
        [UI.blockTime, hours(b)],
        [UI.first, list[list.length - 1]?.m.metadata?.date || known.first || '—'],
        [UI.last, list[0]?.m.metadata?.date || known.last || '—']
      ]);
      activityChart(root.querySelector('.sh-chart'), list);
      missionsTable(root.querySelector('.sh-missions'), list, [...commonColumns().slice(0, 5), {
        key: 'crew',
        label: tr(UI.pilot)
      }, ...commonColumns().slice(5)]);
      window.TimePeriod?.edges?.(root.querySelector('.sh-edges'), all.map(x => ({
        date: x.m.metadata?.date || ''
      })));
    };
    period(all, paint);
    paint();
    window.RepositoryContentI18n?.(Object.values(UI));
  }
  // Courbe RPM / puissance → consommation (points du profil).
  /** Courbe RPM / puissance → consommation (SVG) des points du profil. */
  function curveSvg(points) {
    const pts = points.map(p => ({
      x: Number(p.rpm ?? p.power ?? p.x),
      y: Number(p.fuelFlowPerHour ?? p.fuel ?? p.y)
    })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x);
    if (pts.length < 2) return '';
    const W = 600,
      H = 180,
      m = 36,
      xs = pts.map(p => p.x),
      ys = pts.map(p => p.y),
      x0 = Math.min(...xs),
      x1 = Math.max(...xs),
      y1 = Math.max(...ys) * 1.1;
    const X = v => m + (v - x0) / (x1 - x0 || 1) * (W - 2 * m),
      Y = v => H - m + 10 - v / (y1 || 1) * (H - 2 * m);
    return `<svg viewBox="0 0 ${W} ${H}" class="mcg-chart"><polyline fill="none" stroke="#67b6ff" stroke-width="2.5" points="${pts.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>${pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.5" fill="#67b6ff"><title>${p.x} → ${Number(p.y).toFixed(1)}</title></circle>`).join('')}<text x="${m}" y="${H - 4}" class="mcg-axis">${x0}</text><text x="${W - m}" y="${H - 4}" text-anchor="end" class="mcg-axis">${x1}</text><text x="4" y="${Y(Math.max(...ys)) + 4}" class="mcg-axis">${Math.max(...ys).toFixed(1)}</text></svg>`;
  }

  // ---- fiche membre d'équipage
  const CREW_SHEETS = 'missionCrewSheets:v1';
  /** Fiche d'un membre d'équipage (equipage.html?name=) : activité, appareils, missions de la période, fusion / renommage. */
  async function mountCrew(root, person) {
    const id = String(person || '').trim().toUpperCase(),
      sheets = read(CREW_SHEETS) || {},
      sheet = {
        name: '',
        homeBase: '',
        qualifications: '',
        notes: '',
        ...(sheets[id] || {})
      };
    const ref = (window.DEFA_REFERENCE?.pilots || []).find(p => p.trigram === id);
    const all = (await missions()).filter(x => (x.m.crew || []).some(c => String(c.name || '').trim().toUpperCase() === id)).sort((a, b) => String(b.m.metadata?.date).localeCompare(String(a.m.metadata?.date)));
    const flight = all.reduce((a, x) => a + (x.s.flightMinutes || 0), 0);
    const byType = new Map(),
      roles = new Map();
    all.forEach(x => {
      const t = x.m.aircraft?.[0]?.type || '—';
      byType.set(t, (byType.get(t) || 0) + (x.s.flightMinutes || 0));
      (x.m.crew || []).filter(c => String(c.name || '').trim().toUpperCase() === id).forEach(c => {
        if (c.role) roles.set(c.role, (roles.get(c.role) || 0) + 1);
      });
    });
    const names = [...new Set((window.DEFA_REFERENCE?.pilots || []).map(p => p.trigram).concat((window.MissionLedger?.store?.missions || []).flatMap(m => (m.crew || []).map(c => String(c.name || '').trim().toUpperCase())).filter(Boolean)))].sort();
    const merger = mergeBox('crew', id, names, target => `equipage.html?name=${encodeURIComponent(target)}`);
    document.title = `${id} — ${tr(UI.crew)}`;
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = `${id}${sheet.name ? ` — ${sheet.name}` : ''} — ${tr(UI.crew)}`;
    root.innerHTML = `
      <section data-icon="hash"><h2>${esc(tr(UI.identity))}</h2><div class="sh-grid">
        <label>${esc(tr(UI.name))}<input data-sheet="name" value="${esc(sheet.name)}"></label>
        <label>${esc(tr(UI.home))}<input data-sheet="homeBase" value="${esc(sheet.homeBase)}"></label>
        <div><span class="small">${esc(tr(UI.roles))}</span><div class="sh-chips">${[...roles].map(([r, n]) => `<span class="sh-chip">${esc(tr((V.crewRoles.find(o => o.value === r) || {}).label || r))} <em>${n}</em></span>`).join('') || '—'}</div></div>
        <label class="sh-wide">${esc(tr(UI.qualifications))}<textarea data-sheet="qualifications" rows="3">${esc(sheet.qualifications)}</textarea></label>
        <label class="sh-wide">${esc(tr(UI.notes))}<textarea data-sheet="notes" rows="2">${esc(sheet.notes)}</textarea></label>
      </div><div class="row"><button type="button" class="primary" data-save>${esc(tr(UI.save))}</button><span class="small sh-saved"></span></div>${merger.html}</section>
      <section data-icon="calendar"><h2>${esc(tr(UI.activity))}</h2><div class="sh-activity"></div><div class="sh-chart"></div></section>
      <section data-icon="list"><h2>${esc(tr(UI.missions))}</h2><div class="sh-missions"></div><div class="sh-edges" hidden></div></section>`;
    window.AppFramework?.refresh?.();   // blocs du framework (masquer, déplacer) et icônes de blocs (block_icons.js)
    root.querySelector('[data-save]').onclick = () => {
      root.querySelectorAll('[data-sheet]').forEach(el => {
        sheet[el.dataset.sheet] = el.value;
      });
      sheet.updatedAt = new Date().toISOString();
      const s2 = read(CREW_SHEETS) || {};
      s2[id] = sheet;
      write(CREW_SHEETS, s2);
      root.querySelector('.sh-saved').textContent = `${tr(UI.saved)} · ${new Date().toLocaleTimeString()}`;
    };
    merger.bind(root);
    const paint = () => {
      const list = inPeriod(all),
        f = list.reduce((a, x) => a + (x.s.flightMinutes || 0), 0),
        types = new Map();
      list.forEach(x => {
        const t = x.m.aircraft?.[0]?.type || '—';
        types.set(t, (types.get(t) || 0) + (x.s.flightMinutes || 0));
      });
      root.querySelector('.sh-activity').innerHTML = cards([
          [UI.flights, list.length || (all.length ? 0 : ref?.flights || 0)],
          [UI.flightTime, hours(f)],
          [UI.first, list[list.length - 1]?.m.metadata?.date || ref?.first || '—'],
          [UI.last, list[0]?.m.metadata?.date || ref?.last || '—']
        ]) +
        `<h3>${esc(tr(UI.byType))}</h3><div class="sh-chips">${[...types].sort((a, b) => b[1] - a[1]).map(([t, m]) => `<span class="sh-chip">${esc(t)} <em>${hours(m)}</em></span>`).join('') || (all.length ? '—' : (ref?.types || []).map(t => `<span class="sh-chip">${esc(t)}</span>`).join('') || '—')}</div>`;
      activityChart(root.querySelector('.sh-chart'), list);
      missionsTable(root.querySelector('.sh-missions'), list, [...commonColumns().slice(0, 4), {
        key: 'registration',
        label: 'Immat.',
        html: v => v ? `<a href="appareil.html?reg=${encodeURIComponent(v)}">${esc(v)}</a>` : '—'
      }, {
        key: 'type',
        label: tr(UI.type)
      }, ...commonColumns().slice(4)]);
      window.TimePeriod?.edges?.(root.querySelector('.sh-edges'), all.map(x => ({
        date: x.m.metadata?.date || ''
      })));
    };
    period(all, paint);
    paint();
    window.RepositoryContentI18n?.(Object.values(UI));
  }

  /** Lien vers la fiche d'un appareil. */
  const aircraftUrl = (base, reg) => `${base}appareil.html?reg=${encodeURIComponent(reg)}`;
  /** Lien vers la fiche d'un membre d'équipage. */
  const crewUrl = (base, name) => `${base}equipage.html?name=${encodeURIComponent(name)}`;
  window.MissionSheets = {
    mountAircraft,
    mountCrew,
    aircraftUrl,
    crewUrl,
    AIRCRAFT_SHEETS,
    CREW_SHEETS
  };
})();
