(() => {
  'use strict';
  // Page « Ordres de vols » du Centre (apps/cpco/odv_orders.html, docs/technique/ODV_ORDRES.md) : ordre de vol de la
  // semaine sur une frise horaire (heures z), plaquettes glissées depuis les modèles, membres glissés sur les plaquettes,
  // conflits de dispo (shared/odv_orders_store.js, OdvOrders), zones et activations (shared/odv_airspace.js,
  // OdvAirspace ; shared/odv_activations_editor.js), états repris des CR (shared/odv_reports.js, OdvReports), vue de la
  // semaine (dispos par membre, modifications), statistiques, briefing plein écran.
  // Données : celles de la suite (dispos, affectations, CR) et data/odv/<semaine>.json ; pas d'autre export.
  // Édition : Centre déverrouillé et, en mode production, admin_centre ; sinon lecture seule.
  // État de la page (onglet, jour, zoom) : odvOrdersView:v1 ; prises en compte des dispos : odvOrdersSeen:v1.
  const K = window.RepositoryKit,
    esc = K.esc,
    t = row => K.t(row),
    tf = (row, v) => K.tf(row, v);
  const O = () => window.OdvOrders,
    SD = () => window.SuiteDispos,
    AS = () => window.OdvAirspace,
    REP = () => window.OdvReports,
    MA = () => window.MissionAssignments;
  const notify = (m, k = 'info') => window.AppFramework?.notify?.(m, k);
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const VIEW = 'odvOrdersView:v1',
    SEEN = 'odvOrdersSeen:v1';
  const ZOOMS = [0.6, 0.8, 1, 1.3, 1.7],
    PPH = 96; // pixels par heure au zoom 1
  const L4 = (fr, en, de, es) => [fr, en, de, es];
  const TX = {
    days: [L4('Lun', 'Mon', 'Mo', 'Lun'), L4('Mar', 'Tue', 'Di', 'Mar'), L4('Mer', 'Wed', 'Mi', 'Mié'), L4('Jeu', 'Thu', 'Do', 'Jue'), L4('Ven', 'Fri', 'Fr', 'Vie'), L4('Sam', 'Sat', 'Sa', 'Sáb'), L4('Dim', 'Sun', 'So', 'Dom')],
    tranches: {
      matin: L4('Matin', 'Morning', 'Morgen', 'Mañana'),
      apres_midi: L4('Après-midi', 'Afternoon', 'Nachmittag', 'Tarde'),
      soir: L4('Soir', 'Evening', 'Abend', 'Noche')
    },
    sections: {
      ll: L4('RTBA · LL', 'RTBA · LL', 'RTBA · LL', 'RTBA · LL'),
      zones: L4('Zones', 'Areas', 'Gebiete', 'Zonas'),
      ensemble: L4('Dispos ensemble', 'Available together', 'Gemeinsam verfügbar', 'Disponibles juntos'),
      vol: L4('Vols', 'Flights', 'Flüge', 'Vuelos'),
      controle: L4('Contrôle', 'Control', 'Lotsendienst', 'Control'),
      divers: L4('Divers', 'Miscellaneous', 'Sonstiges', 'Varios'),
      note: L4('Notes', 'Notes', 'Notizen', 'Notas')
    },
    etats: {
      prevu: L4('Prévu', 'Planned', 'Geplant', 'Previsto'),
      fait: L4('Fait', 'Done', 'Erledigt', 'Hecho'),
      non_fait: L4('Non fait', 'Not done', 'Nicht erledigt', 'No hecho'),
      annule: L4('Annulé', 'Cancelled', 'Abgesagt', 'Cancelado')
    },
    cr: {
      ME: L4('ME — mission effectuée', 'ME — mission flown', 'ME — Mission durchgeführt', 'ME — misión efectuada'),
      BACHE: L4('Bâché — mission annulée', 'Bâché — mission cancelled', 'Bâché — Mission abgesagt', 'Bâché — misión cancelada'),
      MNE: L4('MNE — non effectuée ou partielle', 'MNE — not flown or partial', 'MNE — nicht oder teilweise durchgeführt', 'MNE — no efectuada o parcial')
    },
    conflicts: {
      non_declare: L4('{tri} : semaine non déclarée', '{tri}: week not declared', '{tri}: Woche nicht angegeben', '{tri}: semana no declarada'),
      non_couvert: L4('{tri} : pas disponible sur toute la durée', '{tri}: not available for the whole duration', '{tri}: nicht für die ganze Dauer verfügbar', '{tri}: no disponible durante toda la duración'),
      non_affectable: L4('{tri} : non affectable ({cat})', '{tri}: not assignable ({cat})', '{tri}: nicht einsetzbar ({cat})', '{tri}: no asignable ({cat})'),
      chevauchement: L4('{tri} : déjà pris à cette heure', '{tri}: already busy at that time', '{tri}: zu dieser Zeit schon eingeteilt', '{tri}: ya ocupado a esa hora'),
      doublon: L4('{tri} : deux fois sur l’élément', '{tri}: twice on the item', '{tri}: zweimal im Element', '{tri}: dos veces en el elemento'),
      zone: L4('Zone {z} : {e}', 'Area {z}: {e}', 'Gebiet {z}: {e}', 'Zona {z}: {e}')
    },
    ptaTip: L4('PTA — principal training audience : membre que l’élément entraîne en priorité (entouré)', 'PTA — principal training audience: member the item trains first (circled)', 'PTA — principal training audience: Mitglied, das das Element vorrangig trainiert (eingekreist)', 'PTA — principal training audience: miembro al que el elemento entrena en prioridad (rodeado)'),
    types: {
      vol: L4('Vol', 'Flight', 'Flug', 'Vuelo'),
      divers: L4('Divers', 'Miscellaneous', 'Sonstiges', 'Varios'),
      controle: L4('Contrôle', 'Control', 'Lotsendienst', 'Control'),
      note: L4('Note', 'Note', 'Notiz', 'Nota')
    },
    durWarn: L4('⚠ Durée estimée de la mission différente de la durée demandée', '⚠ Estimated mission duration differs from the requested duration', '⚠ Geschätzte Missionsdauer weicht von der gewünschten Dauer ab', '⚠ Duración estimada de la misión distinta de la solicitada'),
    zoneEtats: {
      active: L4('active', 'active', 'aktiv', 'activa'),
      demandee: L4('demandée', 'requested', 'beantragt', 'solicitada'),
      absente: L4('non activée', 'not activated', 'nicht aktiviert', 'no activada'),
      interdite: L4('interdite (P)', 'prohibited (P)', 'verboten (P)', 'prohibida (P)')
    }
  };

  // ---- état
  const S = {
    week: '',
    day: 0,
    view: 'jour',
    zoom: 2,
    cfg: null,
    doc: null,
    dispos: {},
    disposDocs: {},
    affect: [],
    members: [],
    conf: new Map(),
    zoneConf: new Map(),
    zoneRows: [],
    llRows: [],
    sun: null,
    editable: false,
    timer: null,
    airMissing: null
  };
  const readView = () => K.store.json(VIEW, {}) || {};
  const keepView = () => K.store.setJson(VIEW, {
    view: S.view,
    zoom: S.zoom
  });
  const min = s => O().min(s),
    hhmm = n => O().hhmm(n);
  const snap = n => Math.round(n / 5) * 5;
  const dates = () => O().weekDates(S.week, S.cfg?.nbJours || 7);
  const curDate = () => dates()[S.day] || dates()[0];
  const dow = date => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7 + 1;
  const ink = c => (K.color?.luminance?.(c) ?? 1) < .45 ? '#fff' : '#111';
  const tint = c => window.RepositoryNav?.chartColor?.(c) || c;
  const memberName = tri => S.members.find(m => m.tri === tri)?.nom || tri;

  function canEdit() {
    if (!window.RepositoryNav?.cpco?.enabled?.()) return false;
    const U = window.SuiteUsers;
    return U?.mode?.() !== 'production' || !!U?.isAdmin?.();
  }

  // ---- chargement
  async function membersList() {
    const out = new Map();
    const users = await Promise.resolve(window.SuiteUsers?.list?.()).catch(() => []) || [];
    for (const u of users)
      if (u?.trigramme && u.actif !== false) out.set(u.trigramme.toUpperCase(), {
        tri: u.trigramme.toUpperCase(),
        nom: u.nom || ''
      });
    const idx = await MA()?.readData?.('disponibilites/_index.json').catch(() => null);
    for (const tri of Object.keys(idx?.pilots || {})) if (!out.has(tri)) out.set(tri, {
      tri,
      nom: ''
    });
    for (const tri of Object.keys(S.cfg?.personnel || {})) if (!out.has(tri)) out.set(tri, {
      tri,
      nom: ''
    });
    const pers = S.cfg?.personnel || {};
    return [...out.values()].map(m => ({
      ...m,
      groupe: pers[m.tri]?.groupe === 'staff' ? 'staff' : 'autre',
      couleur: pers[m.tri]?.couleur || '',
      ordre: pers[m.tri]?.ordre ?? 999
    })).sort((a, b) => a.ordre - b.ordre || a.tri.localeCompare(b.tri));
  }
  async function load(week, {
    fresh = false
  } = {}) {
    S.week = week;
    S.cfg = await O().loadConfig({
      fresh
    });
    S.members = await membersList();
    // relecture pendant une modification (glisser, fenêtre…) : la semaine modifiée l'emporte sur celle lue avant
    const rev0 = S.rev || 0;
    const doc = await O().readWeek(week, {
      fresh,
      config: S.cfg
    });
    if ((S.rev || 0) === rev0 || S.doc?.semaine !== week) S.doc = doc;
    const tris = S.members.map(m => m.tri);
    S.disposDocs = {};
    await Promise.all(tris.map(async tri => {
      const w = await SD()?.readPilot?.(tri, {
        weeks: [week],
        fresh
      }).catch(() => null);
      if (w?.[week]) S.disposDocs[tri] = w[week];
    }));
    S.dispos = Object.fromEntries(Object.entries(S.disposDocs).map(([k, v]) => [k, v.dispos || {}]));
    const idx = await MA()?.index?.({
      fresh
    }).catch(() => null);
    S.affect = idx?.assignments || [];
    S.registry = await registryList();
    const tr = await window.OdvAirspace?.aarTracks?.().catch(() => []);
    S.tracks = [...new Set([...(Array.isArray(tr) ? tr.map(x => x.nom || x.id) : []), ...S.registry.filter(isTankerMission).map(trackOf).filter(Boolean)])].sort();
    syncCallsigns();
    fillTracks();
    fillExercises();
    await applyReports();
    recompute();
    render();
    refreshAirspace();
    loadSun();
  }
  /** Indicatif des vols de mission tenu à jour : celui que la mission donne à sa patrouille (registre), s'il a changé. */
  function syncCallsigns() {
    let changed = false;
    for (const e of S.doc.elements) {
      const m = e.type === 'vol' && e.mission ? S.registry.find(x => x.id === e.mission) : null;
      const cs = ownCs(m);
      if (!cs || e.equipe === cs) continue;
      if (!e.indicatif || e.indicatif === e.equipe) e.indicatif = cs;
      e.equipe = cs;
      changed = true;
    }
    if (changed && canEdit()) queueSave();
  }
  /** États repris des CR (le CR fait foi) ; enregistré si quelque chose change et que la page peut écrire. */
  async function applyReports() {
    if (!REP()?.etatsFromLedger) return;
    const vols = S.doc.elements.filter(e => e.type === 'vol' && e.mission);
    if (!vols.length) return;
    const res = await REP().etatsFromLedger(vols, {
      delaiH: S.cfg.crDelaiHeures ?? 48
    }).catch(() => null);
    let changed = false;
    for (const e of vols) {
      const r = res?.get?.(e.id);
      if (!r) continue;
      const next = {
        etat: r.etat,
        cr: r.cr,
        partiel: !!r.partiel,
        causes: r.causes || [],
        motif: r.motif || e.motif
      };
      if (Object.entries(next).some(([k, v]) => JSON.stringify(e[k]) !== JSON.stringify(v))) {
        Object.assign(e, next);
        changed = true;
      }
    }
    if (changed && S.editable) queueSave();
  }
  function recompute() {
    S.conf = O().conflicts(S.doc, {
      dispos: S.dispos,
      affectations: S.affect
    });
  }
  function queueSave() {
    if (!S.editable) return;
    clearTimeout(S.timer);
    setStatus(t(L4('Modifications en attente…', 'Changes pending…', 'Änderungen ausstehend…', 'Cambios pendientes…')));
    S.timer = setTimeout(save, 500);
  }
  async function save() {
    clearTimeout(S.timer);
    S.timer = null;
    const rev0 = S.rev || 0;
    S.savedAt = Date.now();
    const r = await O().saveWeek(S.doc).catch(e => ({
      error: e
    }));
    S.savedAt = Date.now();
    // modifié pendant l'écriture : la page garde sa version (réenregistrée ensuite)
    if ((S.rev || 0) !== rev0) return queueSave();
    if (r.doc) S.doc = {
      ...r.doc,
      elements: r.doc.elements.map(O().normalize)
    };
    setStatus(r.where === 'folder' ? t(L4('Enregistré', 'Saved', 'Gespeichert', 'Guardado')) : t(L4('Enregistré dans ce navigateur', 'Saved in this browser', 'In diesem Browser gespeichert', 'Guardado en este navegador')));
    if (r.error && r.where !== 'local') notify(String(r.error?.message || r.error), 'error');
  }
  const setStatus = s => {
    const el = $('#odvoStatus');
    if (el) el.textContent = s;
  };
  function mutate(fn) {
    if (!S.editable) return notify(t(L4('Lecture seule : déverrouillez le Centre (et connectez-vous en admin_centre en mode production).', 'Read only: unlock the Centre (and log in as admin_centre in production mode).', 'Nur lesen: Zentrum entsperren (im Produktionsmodus als admin_centre anmelden).', 'Solo lectura: desbloquee el Centro (y conéctese como admin_centre en modo producción).')), 'warn');
    fn(S.doc);
    S.rev = (S.rev || 0) + 1;
    delete S.doc._nouveau;
    recompute();
    render();
    refreshAirspace();
    queueSave();
  }

  // ---- zones (OdvAirspace, facultatif)
  async function refreshAirspace() {
    const date = curDate();
    const A = AS();
    S.zoneConf = new Map();
    S.zoneRows = [];
    S.llRows = [];
    // repli : créneaux LL saisis dans les réglages (sans module de zones, ou base absente)
    const fallback = () => (S.cfg.ll || []).filter(l => !l.jours?.length || l.jours.includes(dow(date))).map(l => ({
      nom: l.nom,
      couleur: l.couleur,
      creneaux: [{
        debut: l.debut,
        fin: l.fin
      }],
      etat: 'active'
    }));
    if (!A) {
      S.llRows = fallback();
      return paintZones();
    }
    const rt = await A.rtba(date, {
      ll: S.cfg.ll || []
    }).catch(() => []);
    if (rt?.missing) {
      S.llRows = fallback();
      return missingBase(rt);
    }
    S.llRows = (rt || []).map(r => ({
      ...r,
      couleur: (S.cfg.ll || []).find(l => l.nom === r.nom)?.couleur || '#4ADE80'
    }));
    const vols = S.doc.elements.filter(e => e.type === 'vol' && e.date === date && e.etat !== 'annule');
    for (const v of vols) {
      let zones = v.zones || [];
      if (v.mission) {
        const aff = O().missionCrew(v, S.affect)[0] || S.affect.find(a => a.mission === v.mission);
        const mz = aff ? await A.missionZones(aff).catch(() => null) : null;
        if (mz?.missing) return missingBase(mz);
        if (mz?.zones?.length) zones = [...mz.zones, ...zones.filter(z => !mz.zones.some(m => m.id === z.id))];
      }
      if (!zones.length) continue;
      const checked = await A.check(zones, {
        date,
        debut: v.debut,
        duree: v.duree,
        reseau: v.reseau || S.cfg.reseau
      }).catch(() => null);
      if (checked?.missing) return missingBase(checked);
      const list = Array.isArray(checked) ? checked : zones.map(z => ({
        ...z,
        etat: 'absente',
        conflit: true
      }));
      S.zoneRows.push({
        vol: v,
        zones: list
      });
      const bad = list.filter(z => z.conflit);
      if (bad.length) S.zoneConf.set(v.id, bad);
    }
    paintZones();
  }
  function missingBase(r) {
    if (!S.airMissing) {
      S.airMissing = r;
      notify(t(L4('Zones : base aéronautique absente ou zone France inactive — Paramètres › Maintenance › Données aéronautiques.', 'Areas: aeronautical database missing or France zone inactive — Settings › Maintenance › Aeronautical data.', 'Gebiete: Luftfahrtdatenbank fehlt oder Zone Frankreich inaktiv — Einstellungen › Wartung › Luftfahrtdaten.', 'Zonas: base aeronáutica ausente o zona Francia inactiva — Ajustes › Mantenimiento › Datos aeronáuticos.')), 'warn');
    }
    paintZones();
  }
  async function loadSun() {
    S.sun = null;
    const icao = S.cfg.terrain;
    if (!icao || !window.MissionAssist?.sunTimes) return;
    const c = await MA()?.coordsOf?.(icao).catch(() => null);
    if (!c || !Number.isFinite(c.lat)) return;
    S.sun = {
      lat: c.lat,
      lon: c.lon
    };
    if (S.view === 'jour') renderDay();
  }

  // ---- rendu
  function render() {
    S.editable = canEdit();
    document.documentElement.classList.toggle('odvo-ro', !S.editable);
    renderBar();
    $('#odvoDay').hidden = S.view !== 'jour';
    $('#odvoWeekView').hidden = S.view !== 'semaine';
    $('#odvoStats').hidden = S.view !== 'stats';
    if (S.view === 'jour') renderDay();
    if (S.view === 'semaine') renderWeekView();
    if (S.view === 'stats') renderStats();
  }
  function confCount(date) {
    let n = 0;
    for (const e of S.doc.elements)
      if (e.date === date && ((S.conf.get(e.id)?.length) || S.zoneConf.get(e.id)?.length)) n++;
    return n;
  }
  function renderBar() {
    const ds = dates();
    const fmt = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const perm = S.doc.permanence || '';
    $('#odvoBar').innerHTML = `
      <div class="row">
        <button type="button" data-act="prev" title="${esc(t(L4('Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior')))}">◀</button>
        <b class="odvo-week">${esc(S.week.replace('-W', ' · S'))}</b>
        <span class="mut">${esc(fmt(ds[0] || ''))} – ${esc(fmt(ds[ds.length - 1] || ''))}</span>
        <button type="button" data-act="next" title="${esc(t(L4('Semaine suivante', 'Next week', 'Nächste Woche', 'Semana siguiente')))}">▶</button>
        <button type="button" data-act="today">${esc(t(L4('Cette semaine', 'This week', 'Diese Woche', 'Esta semana')))}</button>
        <span class="odvo-sep"></span>
        ${['jour', 'semaine', 'stats'].map(v => `<button type="button" data-view="${v}" class="${S.view === v ? 'on' : ''}">${esc(t({
          jour: L4('Jour', 'Day', 'Tag', 'Día'),
          semaine: L4('Semaine', 'Week', 'Woche', 'Semana'),
          stats: L4('Statistiques', 'Statistics', 'Statistik', 'Estadísticas')
        }[v]))}</button>`).join('')}
        <span class="odvo-sep"></span>
        <label>${esc(t(L4('Permanence', 'Duty officer', 'Dienst', 'Guardia')))} <select data-act="perm"${S.editable ? '' : ' disabled'}><option value="">—</option>${S.members.map(m => `<option${m.tri === perm ? ' selected' : ''}>${esc(m.tri)}</option>`).join('')}</select></label>
        <button type="button" data-act="brief" title="${esc(t(L4('Plein écran (F), jours : ← →', 'Full screen (F), days: ← →', 'Vollbild (F), Tage: ← →', 'Pantalla completa (F), días: ← →')))}">${esc(t(L4('Briefing', 'Briefing', 'Briefing', 'Briefing')))}</button>
        <span class="mut" id="odvoStatus">${S.editable ? '' : esc(t(L4('Lecture seule', 'Read only', 'Nur lesen', 'Solo lectura')))}</span>
      </div>
      <div class="row odvo-days">${ds.map((d, i) => {
        const n = confCount(d);
        return `<button type="button" data-day="${i}" class="${i === S.day ? 'on' : ''}">${esc(t(TX.days[i]))} ${esc(fmt(d))}${n ? ` <span class="odvo-badge" title="${esc(t(L4('Éléments en conflit', 'Items in conflict', 'Elemente im Konflikt', 'Elementos en conflicto')))}">${n}</span>` : ''}</button>`;
      }).join('')}</div>`;
  }

  // frise du jour
  function dayRange(date) {
    const h = S.cfg.jours?.[dow(date)] || {};
    let s = min(h.debut) ?? 360,
      e = min(h.fin) ?? 1380;
    for (const el of S.doc.elements)
      if (el.date === date) {
        s = Math.min(s, min(el.debut));
        e = Math.max(e, min(el.debut) + el.duree);
      }
    return [Math.floor(s / 60) * 60, Math.min(1440, Math.ceil(e / 60) * 60)];
  }
  const ppm = () => PPH * ZOOMS[S.zoom] / 60;
  /** Couloirs : éléments d'une section rangés sans recouvrement (premier couloir libre). */
  function lanes(list) {
    const ends = [];
    return list.sort((a, b) => min(a.debut) - min(b.debut) || b.duree - a.duree).map(e => {
      const s = min(e.debut);
      let i = ends.findIndex(x => x <= s);
      if (i < 0) i = ends.push(0) - 1;
      ends[i] = s + e.duree;
      return [e, i];
    });
  }
  function renderDay() {
    const date = curDate();
    const [s0, e0] = dayRange(date);
    const P = ppm(),
      W = (e0 - s0) * P;
    const X = m => (m - s0) * P;
    const host = $('#odvoGrid');
    const hours = [];
    for (let h = s0; h <= e0; h += 60) hours.push(`<span style="left:${X(h)}px">${esc(hhmm(h).slice(0, 2))}</span>`);
    const tr = O().tranches().map(x => `<div class="odvo-tr" style="left:${X(Math.max(s0, min(x.debut)))}px;width:${Math.max(0, (Math.min(e0, min(x.fin)) - Math.max(s0, min(x.debut))) * P)}px"><span>${esc(t(TX.tranches[x.id]))}</span></div>`).join('');
    const now = new Date();
    const nowLine = now.toISOString().slice(0, 10) === date ? `<div class="odvo-now" style="left:${X(now.getUTCHours() * 60 + now.getUTCMinutes())}px" title="${esc(now.toISOString().slice(11, 16))}z"></div>` : '';
    let night = '';
    if (S.sun) {
      const st = window.MissionAssist.sunTimes(date, S.sun.lat, S.sun.lon, -6);
      const toMin = v => v instanceof Date && Number.isFinite(+v) ? v.getUTCHours() * 60 + v.getUTCMinutes() : null;
      const dawn = toMin(st?.rise),
        dusk = toMin(st?.set);
      if (dawn != null && dawn > s0) night += `<div class="odvo-night" style="left:0;width:${X(Math.min(dawn, e0))}px" title="${esc(t(L4('Nuit aéronautique', 'Aeronautical night', 'Luftfahrtnacht', 'Noche aeronáutica')))}"></div>`;
      if (dusk != null && dusk < e0) night += `<div class="odvo-night" style="left:${X(Math.max(dusk, s0))}px;width:${(e0 - Math.max(dusk, s0)) * P}px" title="${esc(t(L4('Nuit aéronautique', 'Aeronautical night', 'Luftfahrtnacht', 'Noche aeronáutica')))}"></div>`;
    }
    const sect = (key, body, h, extra = '') => `<div class="odvo-row odvo-sec-${key}" data-sec="${key}"${extra}><div class="odvo-lbl">${esc(t(TX.sections[key]))}</div><div class="odvo-lane" data-lane="${key}" style="width:${W}px;height:${h}px">${body}</div></div>`;
    // sections d'éléments
    const secOf = {
      vol: 'vol',
      controle: 'controle',
      divers: 'divers',
      note: 'note'
    };
    const H = {
      vol: 86,
      controle: 40,
      divers: 40,
      note: 30
    };
    const blocks = {};
    for (const key of Object.keys(secOf)) {
      const list = lanes(S.doc.elements.filter(e => e.date === date && e.type === key));
      const n = Math.max(1, ...list.map(([, i]) => i + 1));
      blocks[key] = {
        html: list.map(([e, i]) => itemHtml(e, X, P, i * H[key], H[key] - 4)).join(''),
        h: n * H[key] + 4
      };
    }
    const together = O().together(date, S.members.map(m => m.tri), S.dispos, {
      kind: 'vol',
      min: 2
    }).map(x => `<div class="odvo-tog" style="left:${X(Math.max(s0, min(x.debut)))}px;width:${(Math.min(e0, min(x.fin)) - Math.max(s0, min(x.debut))) * P}px" title="${esc(x.debut + '–' + x.fin + 'z · ' + x.membres.join(' '))}">${x.membres.map(tri => `<span>${esc(tri)}</span>`).join('')}</div>`).join('');
    host.innerHTML = `<div class="odvo-frise" style="--w:${W}px">
      <div class="odvo-row odvo-ruler"><div class="odvo-lbl mut">z</div><div class="odvo-lane" style="width:${W}px">${hours.join('')}</div></div>
      <div class="odvo-overlay" style="width:${W}px">${tr}${night}${nowLine}</div>
      ${sect('ll', '<div id="odvoLL"></div>', 24)}
      ${sect('zones', '<div id="odvoZones"></div>', 30)}
      ${sect('ensemble', together, 26)}
      ${sect('vol', blocks.vol.html, blocks.vol.h)}
      ${sect('controle', blocks.controle.html, blocks.controle.h)}
      ${sect('divers', blocks.divers.html, blocks.divers.h)}
      ${sect('note', blocks.note.html, blocks.note.h)}
    </div>`;
    host.dataset.s0 = s0;
    renderPalette(date);
    renderProblems(date);
    paintZones();
  }
  function crewChip(tri, e, locked = false) {
    const c = (S.conf.get(e.id) || []).find(x => x.tri === tri);
    const col = S.members.find(m => m.tri === tri)?.couleur;
    const pta = (e.pta || []).includes(tri),
      dlo = e.dlo?.[tri];
    const tip = [memberName(tri), pta ? 'PTA' : '', dlo ? `DLO : ${dlo}` : '', c ? conflictText(c) : ''].filter(Boolean).join(' — ');
    return `<span class="odvo-tri${c ? ' bad' : ''}${pta ? ' pta' : ''}" data-tri="${esc(tri)}" draggable="${S.editable && !locked}" title="${esc(tip)}"${col ? ` style="border-color:${esc(tint(col))}"` : ''}>${esc(tri)}${dlo ? '<i class="odvo-dlo">◎</i>' : ''}</span>`;
  }
  /** Configurations chargées d'un avion (KNON, TALIOS…), couleurs des réglages. */
  const cfgChips = list => (list || []).map(x => {
    const c = (S.cfg.configs || []).find(k => k.texte === x)?.couleur;
    return `<span class="odvo-cfg"${c ? ` style="border-color:${esc(tint(c))};color:${esc(tint(c))}"` : ''}>${esc(x)}</span>`;
  }).join('');
  function itemHtml(e, X, P, top, h) {
    const s = min(e.debut),
      w = Math.max(18, e.duree * P);
    const conf = [...(S.conf.get(e.id) || []), ...(S.zoneConf.get(e.id) || []).map(z => ({
      code: 'zone',
      z
    }))];
    const cs = e.type === 'vol' ? O().colorFor(e.indicatif, S.cfg) : null;
    const col = tint(cs?.fond || e.fond || e.couleur || '#64748b');
    const fill = e.fond || cs?.fond ? col : 'transparent';
    const border = tint(cs?.contour || e.couleur || '#64748b');
    const fg = fill === 'transparent' ? 'inherit' : ink(col);
    const state = e.etat && e.etat !== 'prevu' ? ` odvo-${e.etat}` : '';
    const tip = [e.libelle || e.texte || '', `${e.debut}z · ${e.duree} min`, ...conf.map(conflictText)].filter(Boolean).join('\n');
    let body = '';
    if (e.type === 'vol') {
      const aff = O().missionCrew(e, S.affect);
      const crew = aff.length ? aff.map(a => a.pilot) : e.avions.filter(a => a.pilote || a.nav).flatMap(a => [a.pilote, a.nav].filter(Boolean));
      // un avion : pilote, navigateur, configurations ; vol de mission : pilotes des affectations, configurations saisies
      const planes = aff.length ? aff.map(a => ({
        locked: true,
        tris: [a.pilot],
        config: e.avions.find(x => x.pilote === a.pilot)?.config || []
      })) : e.avions.filter(a => a.pilote || a.nav || a.appareil).map(a => ({
        tris: [a.pilote, a.nav].filter(Boolean),
        config: a.config,
        ac: a.appareil?.immat || a.appareil?.type || ''
      }));
      const prep = O().prepReady(e, {
        dispos: S.dispos,
        affectations: S.affect
      });
      // détails de la mission : titre, famille, terrain ; axe tenu (ravitailleur) ; ravitaillements (receveur)
      const mis = reg(e.mission);
      const axe = e.axe || (isTankerMission(mis) ? trackOf(mis) : '');
      const rvs = (e.ravitaillements || []).map(r => {
        const tv = S.doc.elements.find(x => x.id === r.vol),
          tm = reg(r.mission || tv?.mission);
        return `⛽ ${esc(tv?.indicatif || ownCs(tm) || r.mission || '?')}${r.axe || trackOf(tm) ? ' ' + esc(r.axe || trackOf(tm)) : ''}${r.heure ? ' ' + esc(r.heure) + 'z' : ''}${tv ? '' : ' (' + esc(t(L4('en réserve', 'in the pool', 'im Vorrat', 'en reserva'))) + ')'}`;
      }).join(' ');
      body = `<div class="odvo-it-h"><b>${esc(e.libelle || '—')}</b>${e.indicatif ? ` <span>${esc(e.indicatif)}</span>` : ''}${e.mission ? ` <span class="odvo-mis" title="${esc(t(L4('Mission du registre', 'Registry mission', 'Mission des Registers', 'Misión del registro')))}">${esc(e.mission)}</span>` : ` <span class="odvo-mis">${esc(t(L4('entr.', 'train.', 'Übung', 'entr.')))}</span>`}${aff.length ? ` <span class="odvo-om" title="${esc(t(L4('Ordre de mission émis : affectations de la mission (Mes missions)', 'Mission order issued: mission assignments (My missions)', 'Missionsbefehl erteilt: Zuweisungen der Mission (Meine Missionen)', 'Orden de misión emitida: asignaciones de la misión (Mis misiones)')))}">OM</span>` : ''}${e.cr ? ` <span class="odvo-cr odvo-cr-${esc(e.cr)}">${esc(e.cr === 'BACHE' ? 'Bâché' : e.cr)}${e.partiel ? '½' : ''}</span>` : ''}${!prep && crew.length && e.etat === 'prevu' ? ` <span class="odvo-p" title="${esc(t(L4('P — aucun équipier disponible dans l’heure et demie avant le vol', 'P — no crew member available in the hour and a half before the flight', 'P — kein Besatzungsmitglied in den 90 Minuten vor dem Flug verfügbar', 'P — ningún tripulante disponible en la hora y media previa al vuelo')))}">P</span>` : ''}</div>
        ${mis ? `<div class="odvo-it-m">${esc([mis.title, [mis.family, mis.subtype].filter(Boolean).join('/'), mis.origin].filter(Boolean).join(' · '))}</div>` : ''}
        <div class="odvo-it-t">${esc(e.debut)}z · ${esc(String(e.duree))}′${e.zones?.length ? ' · ' + esc(e.zones.map(z => z.nom).join(', ')) : ''}${axe ? ` · <b>AAR ${esc(axe)}</b>` : ''}${rvs ? ' · ' + rvs : ''}</div>
        <div class="odvo-it-c">${planes.map(p => `<span class="odvo-plane">${p.ac ? `<span class="odvo-ac">${esc(p.ac)}</span>` : ''}${p.tris.map(x => crewChip(x, e, p.locked)).join('')}${cfgChips(p.config)}</span>`).join('')}</div>`;
    } else if (e.type === 'note') body = `<div class="odvo-it-n">${esc(e.texte || '…')}</div>`;
    else body = `<div class="odvo-it-h"><b>${esc(e.libelle || '—')}</b>${e.position ? ` <span>${esc(e.position)}</span>` : ''}</div><div class="odvo-it-c">${e.equipage.map(x => crewChip(x, e)).join('')}</div>`;
    return `<div class="odvo-it odvo-${e.type}${state}${conf.length ? ' conflit' : ''}" data-id="${esc(e.id)}" style="left:${X(s)}px;top:${top}px;width:${w}px;height:${h}px;background:${fill};border-color:${border};color:${fg}" title="${esc(tip)}">${conf.length ? `<span class="odvo-warn">⚠ ${conf.length}</span>` : ''}${e.recurrence ? '<span class="odvo-rec" title="↻">↻</span>' : ''}${body}<span class="odvo-rsz" data-rsz></span></div>`;
  }
  function conflictText(c) {
    if (c.code === 'zone') return tf(TX.conflicts.zone, {
      z: c.z.nom || c.z.id,
      e: t(TX.zoneEtats[c.z.etat] || TX.zoneEtats.absente)
    });
    const cat = c.categorie ? SD()?.label?.(SD()?.category?.(c.categorie)?.label || c.categorie) : '';
    return tf(TX.conflicts[c.code] || [c.code, c.code, c.code, c.code], {
      tri: c.tri,
      cat
    });
  }
  function paintZones() {
    const host = $('#odvoGrid'),
      s0 = +host?.dataset.s0;
    if (!host || !Number.isFinite(s0)) return;
    const P = ppm(),
      X = m => (m - s0) * P;
    const ll = $('#odvoLL'),
      zn = $('#odvoZones');
    if (ll) ll.innerHTML = S.llRows.flatMap(r => (r.creneaux || []).map(c => `<div class="odvo-ll${r.etat && r.etat !== 'active' ? ' odvo-ll-' + esc(r.etat) : ''}" style="left:${X(min(c.debut))}px;width:${(min(c.fin) - min(c.debut)) * P}px;background:${esc(tint(r.couleur || '#4ADE80'))}" title="${esc(`${r.nom} ${c.debut}–${c.fin}z${r.reseau ? ' · ' + r.reseau : ''}${r.etat ? ' · ' + t(TX.zoneEtats[r.etat] || [r.etat, r.etat, r.etat, r.etat]) : ''}`)}">${esc(r.nom)}</div>`)).join('') || (S.airMissing ? `<a class="mut" href="${esc(S.airMissing.url || '#')}">${esc(t(L4('Base aéronautique à installer', 'Aeronautical database to install', 'Luftfahrtdatenbank installieren', 'Base aeronáutica por instalar')))}</a>` : '');
    if (zn) zn.innerHTML = S.zoneRows.map(({
      vol,
      zones
    }) => `<div class="odvo-zn" style="left:${X(min(vol.debut))}px;width:${Math.max(18, vol.duree * P)}px">${zones.map(z => `<span class="odvo-z odvo-z-${esc(z.etat || 'absente')}" title="${esc(`${z.nom || z.id} · ${t(TX.zoneEtats[z.etat] || TX.zoneEtats.absente)}${z.ou?.length ? ' · ' + z.ou.join(', ') : ''}`)}">${esc(z.nom || z.id)}</span>`).join('')}</div>`).join('');
  }
  function renderProblems(date) {
    const items = S.doc.elements.filter(e => e.date === date && (S.conf.get(e.id)?.length || S.zoneConf.get(e.id)?.length));
    $('#odvoProblems').innerHTML = items.length ? `<b>${esc(t(L4('Problèmes d’affectation', 'Assignment problems', 'Einteilungsprobleme', 'Problemas de asignación')))}</b> ${items.map(e => `<button type="button" class="odvo-prob" data-goto="${esc(e.id)}">${esc(e.indicatif || e.libelle || e.texte || t(TX.types[e.type] || TX.types.note))} ${esc(e.debut)}z : ${esc([...(S.conf.get(e.id) || []), ...(S.zoneConf.get(e.id) || []).map(z => ({
      code: 'zone',
      z
    }))].map(conflictText).join(' ; '))}</button>`).join('')}` : '';
  }
  function renderPalette(date) {
    const M = S.cfg.modeles || {};
    const tpl = (type, list) => (list || []).map(m => `<div class="odvo-tpl" draggable="${S.editable}" data-tpl="${esc(type)}:${esc(m.id)}" style="border-color:${esc(tint(m.couleur || '#64748b'))}${m.fond ? `;background:${esc(tint(m.fond))};color:${ink(tint(m.fond))}` : ''}" title="${esc(t(L4('Glisser sur la frise', 'Drag onto the timeline', 'Auf die Zeitleiste ziehen', 'Arrastrar a la cronología')))}">${esc(m.libelle)} <small>${esc(String(m.duree))}′</small></div>`).join('');
    const note = `<div class="odvo-tpl" draggable="${S.editable}" data-tpl="note:note">${esc(t(L4('Note', 'Note', 'Notiz', 'Nota')))}</div>`;
    const mem = grp => S.members.filter(m => m.groupe === grp).map(m => {
      const day = S.dispos[m.tri]?.[date];
      const bar = dispoBar(day, 0, 1440);
      return `<div class="odvo-mem" draggable="${S.editable}" data-mem="${esc(m.tri)}" title="${esc(m.nom || m.tri)}"><b${m.couleur ? ` style="color:${esc(tint(m.couleur))}"` : ''}>${esc(m.tri)}</b>${bar}</div>`;
    }).join('') || `<p class="mut">—</p>`;
    const gen = generated(date).map(g => {
      const tm = g.m ? ownTeam(g.m) : g.team;
      const v = g.m ? `gen:${g.m.id}` : `genteam:${tm.name}|${typeCode(tm.type)}`;
      const c = O().colorFor(tm.name, S.cfg);
      const sub = [typeCode(tm.type), g.m?.id, g.m && blockOf(g.m) ? `${blockOf(g.m)}′` : '', g.why].filter(Boolean).join(' · ');
      return `<div class="odvo-tpl odvo-gen" draggable="${S.editable}" data-tpl="${esc(v)}" style="border-color:${esc(tint(c?.contour || c?.fond || '#787808'))}" title="${esc([g.m?.title, tm.role].filter(Boolean).join(' — '))}">${esc(tm.name || g.m?.id)} <small>${esc(sub)}</small></div>`;
    }).join('');
    const res = (S.doc.reserve || []).map(r => `<div class="odvo-tpl odvo-res" draggable="${S.editable}" data-tpl="res:${esc(r.id)}" style="border-color:${esc(tint(r.couleur || '#64748b'))}" title="${esc(t(L4('Glisser sur la frise pour la reposer', 'Drag onto the timeline to place it again', 'Auf die Zeitleiste ziehen, um ihn wieder zu setzen', 'Arrastrar a la cronología para volver a colocarla')))}">${esc(r.indicatif || r.libelle || r.texte || t(TX.types[r.type] || TX.types.note))} <small>${esc([r.mission, `${r.duree}′`].filter(Boolean).join(' · '))}</small></div>`).join('');
    $('#odvoPalette').innerHTML = `
      ${res ? `<h3>${esc(t(L4('Réserve des vols', 'Flight pool', 'Flugvorrat', 'Reserva de vuelos')))}</h3>${res}` : ''}
      <h3>${esc(t(TX.sections.vol))}</h3>${tpl('vol', M.vols)}
      ${gen ? `<h3>${esc(t(L4('Formations des missions', 'Mission formations', 'Formationen der Missionen', 'Formaciones de las misiones')))}</h3>${gen}` : ''}
      <h3>${esc(t(TX.sections.controle))}</h3>${tpl('controle', M.controle)}
      <h3>${esc(t(TX.sections.divers))}</h3>${tpl('divers', M.divers)}${note}
      <h3>${esc(t(L4('Staff', 'Staff', 'Stab', 'Staff')))}</h3>${mem('staff')}
      <h3>${esc(t(L4('Membres', 'Members', 'Mitglieder', 'Miembros')))}</h3>${mem('autre')}`;
  }
  /** Barre de dispo d'un jour (plages colorées par catégorie) entre s0 et e0 (minutes). */
  function dispoBar(plages, s0, e0) {
    if (!plages) return `<span class="odvo-bar odvo-bar-none" title="${esc(t(L4('Pas de déclaration', 'No declaration', 'Keine Angabe', 'Sin declaración')))}"></span>`;
    const W = e0 - s0;
    return `<span class="odvo-bar">${plages.map(p => {
      const a = Math.max(s0, p.debut ? min(p.debut) : 0),
        b = Math.min(e0, p.fin ? min(p.fin) : 1440);
      if (b <= a) return '';
      const c = SD()?.category?.(p.categorie);
      return `<i style="left:${(a - s0) / W * 100}%;width:${(b - a) / W * 100}%;background:${esc(SD()?.color?.(c) || '#bbb')}" title="${esc(`${SD()?.label?.(c?.label || p.categorie)} ${p.debut || '00:00'}–${p.fin || '24:00'}z`)}"></i>`;
    }).join('')}</span>`;
  }

  // ---- glisser-déposer
  let drag = null;
  function minuteAt(lane, clientX) {
    const s0 = +$('#odvoGrid').dataset.s0;
    return Math.max(0, Math.min(1435, snap(s0 + (clientX - lane.getBoundingClientRect().left) / ppm())));
  }
  function fromTemplate(type, id, date, debut) {
    if (type === 'gen' || type === 'genteam') {
      // plaquette générée : patrouille d'une mission (indicatif, type, durée estimée), ou patrouille sans mission
      const m = type === 'gen' ? reg(id) : null;
      const [name, tcode] = type === 'genteam' ? id.split('|') : [ownCs(m), typeCode(ownTeam(m).type)];
      const c = O().colorFor(name, S.cfg);
      return O().normalize({
        type: 'vol',
        date,
        debut: hhmm(debut),
        duree: blockOf(m) || 105,
        mission: m?.id || null,
        equipe: m ? name : null,
        indicatif: name,
        libelle: m ? (isTankerMission(m) ? 'AAR' : m.subtype || m.family || '') : '',
        axe: isTankerMission(m) ? trackOf(m) || null : null,
        couleur: c?.contour || '#787808',
        fond: c?.fond || null,
        reseau: S.cfg.reseau || null,
        avions: [{
          appareil: tcode ? {
            type: tcode,
            immat: ''
          } : null
        }, {
          appareil: tcode ? {
            type: tcode,
            immat: ''
          } : null
        }]
      });
    }
    if (type === 'note') return O().normalize({
      type: 'note',
      date,
      debut: hhmm(debut),
      duree: 60,
      texte: ''
    });
    const key = type === 'vol' ? 'vols' : type;
    const m = (S.cfg.modeles?.[key] || []).find(x => x.id === id) || {};
    return O().normalize({
      type,
      date,
      debut: hhmm(debut),
      duree: m.duree || 60,
      libelle: m.libelle === 'INDICATIF' ? '' : m.libelle || '',
      couleur: m.couleur,
      fond: m.fond,
      reseau: type === 'vol' ? S.cfg.reseau || null : undefined
    });
  }
  // ---- heures d'exercice : décalages par rapport à H des missions d'une opération (organisation : exercise.participants
  // et exercise.tracks jouées, takeoff « H-20mn »), lus dans le yaml de l'organisation, gardés en mémoire
  async function fillExercises(extra = []) {
    S.exOff ||= {};
    const ops = new Set([...S.doc.elements, ...extra].map(e => reg(e.mission)?.operation?.id).filter(Boolean));
    await Promise.all((S.orgs || []).filter(o => ops.has(o.operation?.id) && !(o.operation.id in S.exOff)).map(async o => {
      S.exOff[o.operation.id] = {};
      const file = (o.files || []).find(f => /\.ya?ml$/i.test(f) && !/^affectations/i.test(f)) || `mission${o.id}.yaml`;
      const found = await MA()?.missionFirst?.(o.folder, [file]).catch(() => null);
      let y = null;
      try {
        y = found && window.jsyaml ? window.jsyaml.load(found.value.replace(/^#.*\n/, '')) : null;
      } catch {
        y = null;
      }
      const ex = y?.exercise || {};
      for (const p of [...(ex.participants || []), ...(ex.tracks || []).filter(x => x?.played && x.mission)]) {
        const off = K.hOffset?.(p.takeoff ?? p.start ?? '');
        if (p?.mission && Number.isFinite(off)) S.exOff[o.operation.id][String(p.mission).toUpperCase()] = off;
      }
    }));
  }
  /** Décalage (minutes, par rapport à H) d'une mission dans l'exercice de son opération ; null si inconnu. */
  const exOffset = m => {
    const v = S.exOff?.[m?.operation?.id]?.[m?.id];
    return Number.isFinite(v) ? v : null;
  };

  // ---- pose automatique (double clic sur une carte de la palette)
  /** Position de synchro d'une plaquette de mission : ravitailleur → 30 min avant le ravitaillement d'un vol qui l'attend ;
   *  autre équipage de la formation (même opération, ou patrouille citée par l'une ou l'autre mission) → heure de la
   *  patrouille liée déjà posée ; null sinon. */
  function syncStart(el, date) {
    const m = reg(el.mission);
    if (!m) return null;
    const vols = S.doc.elements.filter(v => v.type === 'vol' && v.date === date && v.id !== el.id);
    for (const v of vols)
      for (const r of v.ravitaillements || [])
        if (r.mission === m.id && r.heure) return Math.max(0, min(r.heure) - 30);
    // même opération avec exercice : H déduite de la patrouille posée (son décalage), puis le décalage de celle-ci
    const off = exOffset(m);
    if (off != null)
      for (const v of vols) {
        const vo = exOffset(reg(v.mission));
        if (vo != null && reg(v.mission)?.operation?.id === m.operation?.id) return Math.max(0, min(v.debut) - vo + off);
      }
    const rel = vols.find(v => {
      const vm = reg(v.mission);
      if (!vm) return false;
      return (m.operation?.id && vm.operation?.id === m.operation.id) || (vm.teams || []).some(x => x.name === ownCs(m)) || (m.teams || []).some(x => x.name === ownCs(vm) || x.name === v.indicatif);
    });
    if (!rel) return null;
    // ravitailleur sans ravitaillement saisi : 30 min avant la patrouille qu'il sert
    return Math.max(0, min(rel.debut) - (isTankerMission(m) && !isTankerMission(reg(rel.mission)) ? 30 : 0));
  }
  /** Premier créneau cohérent du jour (pas de 5 min, heures de service, pas avant maintenant) : équipage affectable et
   *  libre sur toute la durée ; sans équipage, assez de membres affectables ensemble (une place par avion) ; à défaut,
   *  le début des heures de service. */
  function firstSlot(el, date) {
    const kind = O().kindOf(el);
    const h = S.cfg.jours?.[dow(date)] || {};
    const now = new Date();
    let s0 = min(h.debut) ?? 360;
    const e0 = min(h.fin) ?? 1380;
    if (now.toISOString().slice(0, 10) === date) s0 = Math.max(s0, Math.ceil((now.getUTCHours() * 60 + now.getUTCMinutes()) / 5) * 5);
    if (!kind) return s0;
    const crew = O().crewOf(el, S.affect);
    const need = crew.length ? 0 : el.type === 'vol' ? Math.max(1, el.avions.length) : 1;
    const busy = (tri, a, b) => S.doc.elements.some(x => x.id !== el.id && x.date === date && x.etat !== 'annule' && O().kindOf(x) && O().crewOf(x, S.affect).includes(tri) && min(x.debut) < b && a < min(x.debut) + x.duree);
    const free = (tri, a, b) => S.dispos[tri] && O().memberState(S.dispos[tri][date] || [], kind, a, b).ok && !busy(tri, a, b);
    for (let a = s0; a + el.duree <= Math.max(e0, s0 + el.duree); a += 5) {
      const b = a + el.duree;
      if (crew.length ? crew.every(tri => free(tri, a, b)) : S.members.filter(m => free(m.tri, a, b)).length >= need) return a;
    }
    return s0;
  }
  /** Pose une carte de la palette (modèle, formation, réserve) au créneau de synchro, sinon au premier cohérent. */
  async function autoPlace(v) {
    const [ty, ...rest] = String(v).split(':'),
      id = rest.join(':'),
      date = curDate();
    const src = ty === 'res' ? (S.doc.reserve || []).find(x => x.id === id) : null;
    const el = src ? O().normalize({
      ...src,
      date
    }) : fromTemplate(ty, id, date, 0);
    if (!el) return;
    // heures d'exercice de l'opération lues avant le calcul (première pose d'une formation)
    await fillExercises([el]).catch(() => {});
    const start = Math.min(1440 - el.duree, syncStart(el, date) ?? firstSlot(el, date));
    mutate(doc => {
      if (src) doc.reserve = doc.reserve.filter(x => x.id !== id);
      el.debut = hhmm(Math.max(0, start));
      doc.elements.push(O().normalize(el));
      if (el.mission)
        for (const x of doc.elements)
          if (x.type === 'vol' && x.date === date)
            for (const r of x.ravitaillements || [])
              if (r.mission === el.mission && !r.vol) r.vol = el.id;
    });
    const it = $(`.odvo-it[data-id="${CSS.escape(el.id)}"]`);
    it?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth'
    });
    it?.classList.add('flash');
    setTimeout(() => it?.classList.remove('flash'), 1600);
  }
  /** Remet une plaquette dans la réserve des vols (palette) : elle garde ses réglages ; un vol qui s'y ravitaillait
   *  garde la mission ravitailleur, sans plaquette. */
  function toReserve(id) {
    mutate(doc => {
      const i = doc.elements.findIndex(x => x.id === id);
      if (i < 0) return;
      const [el] = doc.elements.splice(i, 1);
      doc.reserve = [...(doc.reserve || []), el];
      for (const v of doc.elements)
        for (const r of v.ravitaillements || [])
          if (r.vol === id) r.vol = null;
    });
  }
  /** Ajoute le membre à l'élément ; vrai s'il y est ajouté (faux : refusé ou déjà présent). */
  function addMember(e, tri) {
    if (e.type === 'vol') {
      if (e.mission && O().missionCrew(e, S.affect).length) {
        notify(t(L4('Vol de mission : l’équipage se modifie par « Affecter… » (affectations de la mission).', 'Mission flight: the crew is changed with “Assign…” (mission assignments).', 'Missionsflug: Besatzung über „Zuweisen…“ ändern (Zuweisungen der Mission).', 'Vuelo de misión: la tripulación se cambia con «Asignar…» (asignaciones de la misión).')), 'warn');
        return false;
      }
      if (e.avions.some(a => a.pilote === tri || a.nav === tri)) return false;
      const free = e.avions.find(a => !a.pilote);
      if (free) free.pilote = tri;
      else if (e.avions.length < 8) e.avions.push({
        pilote: tri,
        nav: null,
        annule: false
      });
      else {
        notify(t(L4('Huit avions au plus', 'Eight aircraft at most', 'Höchstens acht Luftfahrzeuge', 'Ocho aeronaves como máximo')), 'warn');
        return false;
      }
      return true;
    }
    if ((e.type === 'divers' || e.type === 'controle') && !e.equipage.includes(tri)) {
      e.equipage.push(tri);
      return true;
    }
    return false;
  }
  function wireGrid() {
    const host = $('#odvoDay');
    host.addEventListener('dragstart', ev => {
      const tp = ev.target.closest('[data-tpl]'),
        mb = ev.target.closest('[data-mem]'),
        tr = ev.target.closest('.odvo-tri');
      if (!S.editable) return ev.preventDefault();
      drag = tp ? {
        k: 'tpl',
        v: tp.dataset.tpl
      } : mb ? {
        k: 'mem',
        v: mb.dataset.mem
      } : tr ? {
        k: 'mem',
        v: tr.dataset.tri,
        from: tr.closest('[data-id]')?.dataset.id
      } : null;
      if (drag) ev.dataTransfer.setData('text/plain', drag.v);
    });
    host.addEventListener('dragover', ev => {
      if (!drag) return;
      const lane = ev.target.closest('[data-lane]'),
        it = ev.target.closest('.odvo-it');
      if (drag.k === 'tpl' && lane && laneAccepts(lane.dataset.lane, tplType(drag.v))) ev.preventDefault();
      if (drag.k === 'mem' && it) ev.preventDefault();
    });
    host.addEventListener('drop', ev => {
      if (!drag) return;
      ev.preventDefault();
      const d = drag;
      drag = null;
      const lane = ev.target.closest('[data-lane]'),
        it = ev.target.closest('.odvo-it');
      // frise et palette redessinées après la fin du glisser : redessiner pendant le dépôt retire la carte glissée de la
      // page, le navigateur ne termine pas le glisser et l'écran reste grisé jusqu'au glisser suivant
      const later = fn => setTimeout(fn, 30);
      const target = it?.dataset.id;
      if (d.k === 'tpl' && lane && d.v.startsWith('res:')) {
        if (!laneAccepts(lane.dataset.lane, tplType(d.v))) return;
        const id = d.v.slice(4),
          debut = hhmm(minuteAt(lane, ev.clientX)),
          date = curDate();
        later(() => mutate(doc => {
          const i = (doc.reserve || []).findIndex(x => x.id === id);
          if (i < 0) return;
          const [el] = doc.reserve.splice(i, 1);
          Object.assign(el, O().normalize({
            ...el,
            date,
            debut
          }));
          doc.elements.push(el);
          if (el.mission)
            for (const v of doc.elements)
              if (v.type === 'vol' && v.date === el.date)
                for (const r of v.ravitaillements || [])
                  if (r.mission === el.mission && !r.vol) r.vol = el.id;
        }));
      } else if (d.k === 'tpl' && lane) {
        const [type, id] = d.v.split(':');
        const el = fromTemplate(type, id, curDate(), minuteAt(lane, ev.clientX));
        later(() => {
          mutate(doc => {
            doc.elements.push(el);
            if (el.mission)
              for (const v of doc.elements)
                if (v.type === 'vol' && v.date === el.date)
                  for (const r of v.ravitaillements || [])
                    if (r.mission === el.mission && !r.vol) r.vol = el.id;
          });
          openEdit(el.id);
        });
      } else if (d.k === 'mem' && it) later(() => mutate(doc => {
        const e = doc.elements.find(x => x.id === target);
        // même plaquette : rien ; plaquette qui refuse (vol de mission, huit avions, déjà à bord) : le trigramme reste
        // sur la plaquette d'origine — retiré de celle-ci seulement une fois ajouté à la cible
        if (!e || d.from === e.id || !addMember(e, d.v)) return;
        if (d.from) removeMember(doc.elements.find(x => x.id === d.from), d.v);
      }));
    });
    host.addEventListener('dragend', () => (drag = null));
    // double clic sur une carte de la palette : pose automatique (synchro, sinon premier créneau cohérent)
    host.addEventListener('dblclick', ev => {
      const tp = ev.target.closest('#odvoPalette [data-tpl]');
      if (tp && S.editable) autoPlace(tp.dataset.tpl);
    });
    // déplacement et durée à la souris
    host.addEventListener('pointerdown', ev => {
      const it = ev.target.closest('.odvo-it');
      if (!it || !S.editable || ev.button !== 0 || ev.target.closest('.odvo-tri')) return;
      const e = S.doc.elements.find(x => x.id === it.dataset.id);
      if (!e) return;
      const rsz = !!ev.target.closest('[data-rsz]');
      const x0 = ev.clientX,
        s = min(e.debut),
        d = e.duree,
        P = ppm();
      let moved = false,
        ghost = null;
      const y0 = ev.clientY,
        box = it.getBoundingClientRect(),
        pal = $('#odvoPalette');
      const overPalette = m => {
        const r = pal.getBoundingClientRect();
        return m.clientX >= r.left && m.clientX <= r.right && m.clientY >= r.top && m.clientY <= r.bottom;
      };
      it.setPointerCapture(ev.pointerId);
      const move = m => {
        const dm = snap((m.clientX - x0) / P);
        if (Math.abs(m.clientX - x0) > 3 || Math.abs(m.clientY - y0) > 3) moved = true;
        if (!moved) return;
        it.classList.add('odvo-dragging');
        if (rsz) return void(it.style.width = `${Math.max(5, d + dm) * P}px`);
        // copie flottante au premier plan (hors de la frise, qui rogne son contenu) : suit le pointeur jusqu'à la palette
        if (!ghost) {
          ghost = it.cloneNode(true);
          ghost.classList.add('odvo-ghost');
          // plaquette sans fond (couleur en contour seulement) : fond et encre de la page, lisible au-dessus de la palette
          if (/transparent|rgba\(0, 0, 0, 0\)/.test(getComputedStyle(it).backgroundColor)) Object.assign(ghost.style, {
            background: 'var(--odvo-surface)',
            color: 'var(--odvo-ink)'
          });
          Object.assign(ghost.style, {
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`
          });
          document.body.append(ghost);
        }
        const onPal = overPalette(m);
        pal.classList.toggle('odvo-drop', onPal);
        ghost.style.transform = onPal ? `translate(${m.clientX - x0}px, ${m.clientY - y0}px)` : `translate(${dm * P}px, ${m.clientY - y0}px)`;
        it.style.transform = `translateX(${dm * P}px)`;
      };
      const stop = () => {
        ghost?.remove();
        ghost = null;
        pal.classList.remove('odvo-drop');
        it.classList.remove('odvo-dragging');
        it.removeEventListener('pointermove', move);
        it.removeEventListener('pointerup', up);
        it.removeEventListener('pointercancel', cancel);
      };
      // geste interrompu (défilement tactile, perte de la capture) : plaquette remise en place, rien d'enregistré
      const cancel = () => {
        stop();
        it.style.transform = '';
        it.style.width = '';
      };
      const up = m => {
        stop();
        if (!moved) return openEdit(e.id);
        if (!rsz && overPalette(m)) return toReserve(e.id);
        const dm = snap((m.clientX - x0) / P);
        mutate(() => {
          if (rsz) e.duree = Math.max(5, Math.min(1440 - s, d + dm));
          else {
            const ns = Math.max(0, Math.min(1440 - e.duree, s + dm));
            e.debut = hhmm(ns);
          }
        });
      };
      it.addEventListener('pointermove', move);
      it.addEventListener('pointerup', up);
      it.addEventListener('pointercancel', cancel);
    });
    host.addEventListener('click', ev => {
      const g = ev.target.closest('[data-goto]');
      if (g) {
        const it = $(`.odvo-it[data-id="${CSS.escape(g.dataset.goto)}"]`);
        it?.scrollIntoView({
          block: 'center',
          inline: 'center',
          behavior: 'smooth'
        });
        it?.classList.add('flash');
        setTimeout(() => it?.classList.remove('flash'), 1600);
      }
      const ze = ev.target.closest('.odvo-tri');
      if (ze && !S.editable) return;
    });
  }
  /** Genre d'élément d'une carte de la palette (plaquette de réserve : son propre type). */
  const tplType = v => {
    const [ty, id] = String(v).split(':');
    return ty === 'res' ? (S.doc.reserve || []).find(x => x.id === id)?.type : ty;
  };
  const laneAccepts = (lane, type) => lane === type || (lane === 'vol' && (type === 'gen' || type === 'genteam'));
  function removeMember(e, tri) {
    if (!e) return;
    if (e.type === 'vol') {
      for (const a of e.avions) {
        if (a.pilote === tri) a.pilote = null;
        if (a.nav === tri) a.nav = null;
      }
      e.taches = e.taches.filter(x => x.pilote !== tri);
    } else if (e.equipage) e.equipage = e.equipage.filter(x => x !== tri);
  }

  // ---- registre des missions (choix d'une mission ou d'un ravitailleur)
  /** Missions du registre (index du navigateur, sinon data/missions/mission_registry.yaml servi), organisations exclues. */
  async function registryList() {
    await window.MissionIndex?.ready;
    let list = window.MissionIndex?.all?.() || [];
    if (!list.length && window.jsyaml) try {
      const r = await fetch(new URL('../../data/missions/mission_registry.yaml', location.href));
      if (r.ok) list = window.jsyaml.load(await r.text())?.missions || [];
    } catch {
      list = [];
    }
    // organisations d'exercice (A-001Z…) gardées à part : heures relatives des équipages (H-20mn…)
    S.orgs = list.filter(m => m?.id && m.organisation);
    return list.filter(m => m?.id && !m.organisation);
  }
  // une mission = une patrouille : son indicatif (callsigns[0]) et son type (aircraftTypes[0]) ; teams = toute la
  // formation du scénario (autres patrouilles, ravitailleur, équipes au sol)
  const ownCs = m => (m?.callsigns || [])[0] || '';
  const ownTeam = m => (m?.teams || []).find(x => x.name === ownCs(m)) || {
    name: ownCs(m),
    type: (m?.aircraftTypes || [])[0] || '',
    role: ''
  };
  const typeCode = s => String(s || '').trim().split(/\s+/)[0].toUpperCase();
  const isTankerMission = m => !!m && (m.aarRole === 'tanker' || /tanker|ravitaill|refuel/i.test(ownTeam(m).role || '') || /tanker|MRTT/i.test((m.aircraftTypes || []).join(' ')));
  const reg = id => (S.registry || []).find(m => m.id === id) || null;
  const trackOf = m => m ? m.aarTrack || S.trackCache?.[m.id] || /\bsur\s+([A-Z][A-Z0-9-]{1,15})\s*$/.exec(m.title || '')?.[1] || '' : '';
  /** Axes des missions ravitailleur de la semaine lus par OdvReports.trackOf (yaml de la mission), s'il existe. */
  async function fillTracks() {
    if (!REP()?.trackOf) return;
    S.trackCache ||= {};
    const ids = new Set();
    for (const e of [...S.doc.elements, ...(S.doc.reserve || [])]) {
      if (e.mission && isTankerMission(reg(e.mission))) ids.add(e.mission);
      for (const r of e.ravitaillements || []) if (r.mission) ids.add(r.mission);
    }
    let found = false;
    await Promise.all([...ids].filter(id => !(id in S.trackCache)).map(async id => {
      const tr = await REP().trackOf(id).catch(() => '');
      S.trackCache[id] = tr || '';
      found ||= !!tr;
    }));
    if (found && S.view === 'jour') renderDay();
  }
  /** Mission qui fait voler une patrouille de ce nom : de la même opération d'abord. */
  const ownerOf = (name, near) => (S.registry || []).find(x => (x.callsigns || []).includes(name) && near?.operation?.id && x.operation?.id === near.operation.id) || (S.registry || []).find(x => (x.callsigns || []).includes(name)) || null;
  /** Types d'aéronefs connus (flotte, table des indicatifs) : une équipe d'un autre type (VSAV, navire…) est au sol. */
  const knownTypes = () => new Set([...(window.DEFA_FLEET || []).map(f => typeCode(f.type)), ...(window.MISSION_CALLSIGNS?.table || []).flatMap(x => x.types || []).map(typeCode)]);
  const isAirTeam = tm => !!ownerOf(tm.name) || isTanker(tm) || knownTypes().has(typeCode(tm.type));
  /** Plaquettes générées pour un jour : formation complémentaire des vols de mission posés (patrouilles des autres
   *  missions, ravitailleurs qui les servent, chiffons de l'opération, patrouilles sans mission), et missions
   *  ravitailleur choisies sur un axe mais pas encore posées ; rien de ce qui est déjà posé ce jour. */
  function generated(date) {
    const vols = S.doc.elements.filter(e => e.type === 'vol' && e.date === date);
    const placed = new Set([...vols, ...(S.doc.reserve || [])].map(e => e.mission).filter(Boolean));
    const out = new Map();
    const add = (k, v) => !out.has(k) && out.set(k, v);
    for (const v of vols) {
      for (const r of v.ravitaillements || [])
        if (r.mission && !placed.has(r.mission) && reg(r.mission)) add(r.mission, {
          m: reg(r.mission),
          why: tf(L4('ravitaille {cs}', 'refuels {cs}', 'betankt {cs}', 'reabastece a {cs}'), {
            cs: v.indicatif || v.libelle
          })
        });
      const m = reg(v.mission);
      if (!m) continue;
      for (const tm of m.teams || []) {
        if (tm.name === ownCs(m)) continue;
        const ow = ownerOf(tm.name, m);
        if (ow && ow.id !== m.id) {
          if (!placed.has(ow.id)) add(ow.id, {
            m: ow,
            why: m.id
          });
        } else if (!ow && isAirTeam(tm) && !vols.some(x => x.indicatif === tm.name)) add(`cs:${tm.name}`, {
          team: tm,
          why: m.id
        });
      }
      for (const x of S.registry || []) {
        if (x.id === m.id || placed.has(x.id)) continue;
        const serves = isTankerMission(x) && (x.teams || []).some(tm => tm.name === ownCs(m));
        const chiffon = m.operation?.id && x.operation?.id === m.operation.id && /CHIFFON/i.test(x.subtype || '');
        if (serves || chiffon) add(x.id, {
          m: x,
          why: m.id
        });
      }
    }
    return [...out.values()];
  }
  const blockOf = m => Math.round(m?.estimate?.block ?? m?.estimate?.flight ?? 0) || null;
  const isTanker = team => /tanker|ravitaill|refuel/i.test(team?.role || '');
  /** Durée de la mission compatible avec la durée demandée (écart ≤ 15 min ou 15 %) ; null si la mission n'en a pas. */
  const fits = (m, duree) => {
    const b = blockOf(m);
    return b == null ? null : Math.abs(b - duree) <= Math.max(15, duree * .15);
  };
  /** Lignes de choix : une par équipe (indicatif) de chaque mission, ravitailleurs ou non ; liées, puis compatibles,
   *  puis par écart de durée. */
  function missionRows(duree, {
    tankers = false,
    linked = {}
  } = {}) {
    const rows = [];
    for (const m of S.registry || []) {
      if (tankers && !isTankerMission(m) && !linked[m.id]) continue;
      rows.push({
        key: m.id,
        m,
        team: ownTeam(m),
        block: blockOf(m),
        fit: tankers ? null : fits(m, duree),
        duree,
        lien: linked[m.id] || ''
      });
    }
    const gap = r => r.block == null ? 1e6 : Math.abs(r.block - duree);
    return rows.sort((a, b) => (!!b.lien - !!a.lien) || ((a.fit === false) - (b.fit === false)) || gap(a) - gap(b) || a.key.localeCompare(b.key));
  }
  /** Estimation de la mission (registre : estimate) en clair, avec la durée demandée. */
  function estText(m, duree) {
    const x = m?.estimate || {};
    if (blockOf(m) == null) return '';
    const parts = [x.flight != null ? tf(L4('vol {n} min', 'flight {n} min', 'Flug {n} min', 'vuelo {n} min'), {
      n: Math.round(x.flight)
    }) : '', x.onStation ? tf(L4('sur zone {n} min', 'on station {n} min', 'im Einsatzgebiet {n} min', 'en zona {n} min'), {
      n: Math.round(x.onStation)
    }) : '', x.transitOut || x.transitIn ? tf(L4('transits {a} + {b} min', 'transits {a} + {b} min', 'Transit {a} + {b} min', 'tránsitos {a} + {b} min'), {
      a: Math.round(x.transitOut || 0),
      b: Math.round(x.transitIn || 0)
    }) : '', x.min && x.max ? tf(L4('fourchette {a}–{b} min', 'range {a}–{b} min', 'Spanne {a}–{b} min', 'horquilla {a}–{b} min'), {
      a: Math.round(x.min),
      b: Math.round(x.max)
    }) : '', x.label || ''].filter(Boolean).join(', ');
    return tf(L4('Estimation : bloc {b} min ({p}) ; demandée : {d} min', 'Estimate: block {b} min ({p}); requested: {d} min', 'Schätzung: Block {b} min ({p}); gewünscht: {d} min', 'Estimación: bloque {b} min ({p}); solicitada: {d} min'), {
      b: blockOf(m),
      p: parts || '—',
      d: duree
    });
  }
  function mpRow(r) {
    const m = r.m,
      tm = r.team;
    const where = [m.origin, m.destination].filter(Boolean).join(' → ');
    const lien = r.lien === 'operation' ? t(L4('même opération', 'same operation', 'gleiche Operation', 'misma operación')) : r.lien === 'axe' ? t(L4('même axe', 'same track', 'gleiche Strecke', 'mismo eje')) : '';
    const avec = (m.teams || []).filter(x => x.name !== tm?.name && isAirTeam(x)).map(x => x.name);
    const line2 = [tm?.name ? [tm.name, tm.type, tm.role].filter(Boolean).join(' · ') : '', [m.family, m.subtype].filter(Boolean).join(' / '), where, m.operation?.name ? `op. ${m.operation.name}` : '', trackOf(m) ? `AAR ${trackOf(m)}` : m.aar ? 'AAR' : '', avec.length ? `${t(L4('avec', 'with', 'mit', 'con'))} ${avec.join(', ')}` : '', lien, m.status || ''].filter(Boolean).join(' · ');
    return `<button type="button" class="odvo-mp-row${r.fit === false ? ' warn' : ''}" data-est="${esc(estText(m, r.duree))}" data-v="${esc(r.key)}" data-axe="${esc(trackOf(m))}" data-q="${esc(`${m.id} ${m.title} ${line2}`.toLowerCase())}"><span><b>${esc(m.id)}</b> ${esc(m.title || '')}</span><span class="odvo-mp-d" title="${esc(t(L4('Durée bloc estimée de la mission', 'Estimated block time of the mission', 'Geschätzte Blockzeit der Mission', 'Tiempo bloque estimado de la misión')))}">${r.block != null ? `${r.block} min` : '—'}${r.fit === false ? ' ⚠' : ''}</span><small>${esc(line2)}</small></button>`;
  }
  /** Liste de choix déroulante (champ caché name) : lignes détaillées, filtre. */
  function pickerHtml(name, rows, cur, emptyLabel, extraRows = '') {
    const sel = rows.find(r => r.key === cur);
    const label = sel ? `${sel.m.id}${sel.team?.name ? ' · ' + sel.team.name : ''} — ${sel.m.title || ''}` : cur ? cur.replace(/^vol:/, '') : emptyLabel;
    // registre vide (jamais lu dans ce navigateur, pas de mission_registry.yaml servi) : le dire, avec le chemin
    const empty = S.registry?.length ? '' : `<p class="odvo-mp-warn">${esc(t(L4('Registre des missions vide dans ce navigateur : ouvrez le Registre des missions du Centre et lisez le dossier des missions.', 'Mission registry empty in this browser: open the Centre’s Mission registry and read the missions folder.', 'Missionsregister in diesem Browser leer: Missionsregister des Zentrums öffnen und den Missionsordner einlesen.', 'Registro de misiones vacío en este navegador: abra el Registro de misiones del Centro y lea la carpeta de misiones.')))} <a href="mission_registry.html" target="_blank" rel="noopener">${esc(t(L4('Registre des missions', 'Mission registry', 'Missionsregister', 'Registro de misiones')))}</a></p>`;
    return `<div class="odvo-mp" data-mp="${esc(name)}">${empty}<input type="hidden" name="${esc(name)}" value="${esc(cur || '')}"><button type="button" class="odvo-mp-btn">${esc(label)} ▾</button><div class="odvo-mp-pop" hidden><input type="search" placeholder="${esc(t(L4('Filtrer…', 'Filter…', 'Filtern…', 'Filtrar…')))}"><div class="odvo-mp-list"><button type="button" class="odvo-mp-row" data-v="" data-q=""><span>${esc(emptyLabel)}</span></button>${extraRows}${rows.map(mpRow).join('')}</div></div><div class="odvo-mp-warn">${sel ? esc((sel.fit === false ? '⚠ ' : '') + estText(sel.m, sel.duree)) : ''}</div></div>`;
  }
  function wirePicker(dlg, name, onPick) {
    const box = dlg.querySelector(`[data-mp="${CSS.escape(name)}"]`);
    if (!box) return;
    const pop = box.querySelector('.odvo-mp-pop'),
      inp = box.querySelector(`input[name="${CSS.escape(name)}"]`);
    box.querySelector('.odvo-mp-btn').addEventListener('click', () => {
      pop.hidden = !pop.hidden;
      if (!pop.hidden) pop.querySelector('input[type=search]').focus();
    });
    pop.querySelector('input[type=search]').addEventListener('input', ev => {
      const q = ev.target.value.trim().toLowerCase();
      pop.querySelectorAll('.odvo-mp-row').forEach(b => (b.hidden = !!q && !b.dataset.q.includes(q)));
    });
    pop.addEventListener('click', ev => {
      const b = ev.target.closest('.odvo-mp-row');
      if (!b) return;
      inp.value = b.dataset.v;
      box.querySelector('.odvo-mp-btn').textContent = `${b.querySelector('span')?.textContent || ''} ▾`;
      pop.hidden = true;
      box.querySelector('.odvo-mp-warn').textContent = (b.classList.contains('warn') ? '⚠ ' : '') + (b.dataset.est || '');
      onPick?.(b.dataset.v);
    });
  }

  // ---- fenêtre d'édition
  function dialog(title, body, {
    onOk,
    onDelete,
    extra = ''
  } = {}) {
    const d = document.createElement('dialog');
    d.className = 'odvo-dlg';
    d.innerHTML = `<form method="dialog"><header><b>${esc(title)}</b></header><div class="odvo-dlg-b">${body}</div><footer>${onDelete && S.editable ? `<button type="button" data-del class="danger">${esc(t(L4('Supprimer', 'Delete', 'Löschen', 'Eliminar')))}</button>` : ''}${extra}<span style="flex:1"></span><button value="cancel">${esc(t(L4('Fermer', 'Close', 'Schließen', 'Cerrar')))}</button>${onOk && S.editable ? `<button value="ok" class="primary">${esc(t(L4('Enregistrer', 'Save', 'Speichern', 'Guardar')))}</button>` : ''}</footer></form>`;
    document.body.append(d);
    // validation lue à l'envoi du formulaire (synchrone), fermeture ensuite
    d.querySelector('form').addEventListener('submit', ev => {
      if (ev.submitter?.value === 'ok') onOk?.(d);
    });
    d.addEventListener('close', () => d.remove());
    d.querySelector('[data-del]')?.addEventListener('click', () => {
      onDelete();
      d.close('cancel');
    });
    if (!S.editable) d.querySelectorAll('input,select,textarea').forEach(x => (x.disabled = true));
    d.showModal();
    return d;
  }
  const opt = (v, cur, label = v) => `<option value="${esc(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(label)}</option>`;
  const memOpts = cur => `<option value="">—</option>${S.members.map(m => opt(m.tri, cur, m.tri + (m.nom ? ' — ' + m.nom : ''))).join('')}`;
  const field = (label, html, wide = false) => `<label class="${wide ? 'wide' : ''}"><span>${esc(t(label))}</span>${html}</label>`;
  async function openEdit(id) {
    const e = S.doc.elements.find(x => x.id === id);
    if (!e) return;
    const common = field(L4('Début (z)', 'Start (z)', 'Beginn (z)', 'Inicio (z)'), `<input name="debut" type="time" step="300" value="${esc(e.debut)}">`) + field(L4('Durée (min)', 'Duration (min)', 'Dauer (min)', 'Duración (min)'), `<input name="duree" type="number" min="5" step="5" value="${e.duree}">`);
    const etat = (e.type !== 'note') ? field(L4('État', 'Status', 'Status', 'Estado'), `<select name="etat">${O().ETATS.map(x => opt(x, e.etat, t(TX.etats[x]))).join('')}</select>`) + field(L4('Motif', 'Reason', 'Grund', 'Motivo'), `<input name="motif" value="${esc(e.motif || '')}">`) : '';
    const colors = e.type !== 'note' ? field(L4('Couleur', 'Colour', 'Farbe', 'Color'), `<input name="couleur" type="color" value="${esc(e.couleur || '#64748b')}">`) + field(L4('Fond plein', 'Solid fill', 'Gefüllt', 'Relleno'), `<input name="fondOn" type="checkbox"${e.fond ? ' checked' : ''}>`) : '';
    let body = '',
      extra = '';
    if (e.type === 'vol') {
      const aff = O().missionCrew(e, S.affect);
      // ravitailleurs : vols ravitailleurs posés ce jour, puis missions ravitailleur, celles liées à la mission (même
      // opération, même axe : OdvReports.tankersFor) en tête
      const tankerFlights = S.doc.elements.filter(x => x.type === 'vol' && x.id !== e.id && x.date === e.date && (x.axe || isTankerMission(reg(x.mission))));
      const linked = Object.fromEntries((e.mission && REP()?.tankersFor ? await REP().tankersFor(e.mission).catch(() => []) : []).map(x => [x.id, x.lien || 'operation']));
      const causes = REP()?.CAUSES || {};
      body = `<div class="odvo-grid2">
        ${field(L4('Libellé', 'Label', 'Bezeichnung', 'Etiqueta'), `<input name="libelle" value="${esc(e.libelle)}">`)}
        ${field(L4('Indicatif (mission, sinon indicatifs du type d’appareil)', 'Callsign (mission, otherwise callsigns of the aircraft type)', 'Rufzeichen (Mission, sonst Rufzeichen des Luftfahrzeugtyps)', 'Indicativo (misión, si no indicativos del tipo de aeronave)'), `<input name="indicatif" list="odvoCs" value="${esc(e.indicatif)}"><datalist id="odvoCs">${csOptions(e.mission, planeType(e))}</datalist>`)}
        ${field(L4('Mission du registre et équipe (triées par durée)', 'Registry mission and team (sorted by duration)', 'Mission des Registers und Team (nach Dauer sortiert)', 'Misión del registro y equipo (ordenadas por duración)'), pickerHtml('mission', missionRows(e.duree), e.mission || '', t(L4('Entraînement (sans mission)', 'Training (no mission)', 'Übung (ohne Mission)', 'Entrenamiento (sin misión)'))), true)}
        ${field(L4('Réseau', 'Network', 'Netzwerk', 'Red'), `<select name="reseau">${['', 'IVAO', 'VATSIM'].map(x => opt(x, e.reseau, x || t(L4('par défaut', 'default', 'Standard', 'por defecto')))).join('')}</select>`)}
        ${common}${colors}
        ${field(L4('Zones (entraînement, séparées par des virgules)', 'Areas (training, comma-separated)', 'Gebiete (Übung, durch Kommas getrennt)', 'Zonas (entrenamiento, separadas por comas)'), `<input name="zones" value="${esc(e.zones.map(z => z.nom).join(', '))}">`, true)}
        ${field(L4('Axe AAR (vol ravitailleur)', 'AAR track (tanker flight)', 'AAR-Strecke (Tankerflug)', 'Eje AAR (vuelo cisterna)'), `<input name="axe" value="${esc(e.axe || '')}">`)}
        ${field(L4('Offload (t)', 'Offload (t)', 'Abgabe (t)', 'Descarga (t)'), `<input name="offload" type="number" step="0.5" value="${esc(e.offload ?? '')}">`)}
        ${field(L4('Ravitaillement : axe', 'Refuelling: track', 'Betankung: Strecke', 'Reabastecimiento: eje'), `<select name="rvAxe"><option value="">${esc(t(L4('tous les axes', 'all tracks', 'alle Strecken', 'todos los ejes')))}</option>${(S.tracks || []).map(x => opt(x, e.ravitaillements[0]?.axe)).join('')}</select>`)}
        ${field(L4('Ravitaillement : mission ravitailleur de l’axe (sa plaquette rejoint la réserve des vols), ou vol ravitailleur du jour', 'Refuelling: tanker mission on the track (its strip joins the flight pool), or tanker flight of the day', 'Betankung: Tankermission der Strecke (ihr Streifen kommt in den Flugvorrat) oder Tankerflug des Tages', 'Reabastecimiento: misión cisterna del eje (su ficha pasa a la reserva de vuelos), o vuelo cisterna del día'), pickerHtml('rv', missionRows(e.duree, {
          tankers: true,
          linked
        }), e.ravitaillements[0]?.vol ? `vol:${e.ravitaillements[0].vol}` : e.ravitaillements[0]?.mission || '', t(L4('Pas de ravitaillement', 'No refuelling', 'Keine Betankung', 'Sin reabastecimiento')), tankerFlights.map(x => `<button type="button" class="odvo-mp-row" data-v="vol:${esc(x.id)}" data-q="${esc(`${x.libelle} ${x.indicatif} ${x.mission || ''} ${x.axe || ''}`.toLowerCase())}"><span><b>${esc(x.indicatif || x.libelle)}</b> ${esc(x.debut)}z · ${esc(x.axe || '')}</span><span class="odvo-mp-d">${esc(t(L4('vol du jour', 'flight of the day', 'Flug des Tages', 'vuelo del día')))}</span><small>${esc([x.mission, x.libelle].filter(Boolean).join(' · '))}</small></button>`).join('')), true)}
        ${field(L4('Heure du ravitaillement (z)', 'Refuelling time (z)', 'Betankungszeit (z)', 'Hora del reabastecimiento (z)'), `<input name="rvHeure" type="time" step="300" value="${esc(e.ravitaillements[0]?.heure || '')}">`)}
      </div>
      <h4>${esc(t(L4('Avions', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves')))}</h4>
      ${aff.length ? `<p class="mut">${esc(t(L4('Équipage tiré des affectations de la mission :', 'Crew taken from the mission assignments:', 'Besatzung aus den Zuweisungen der Mission:', 'Tripulación tomada de las asignaciones de la misión:')))} ${esc(aff.map(a => `${a.pilot} ${a.callsign || ''} ${a.aircraft?.type || ''}`).join(' · '))}</p>` : ''}
      <datalist id="odvoCfg">${(S.cfg.configs || []).map(k => `<option value="${esc(k.texte)}">`).join('')}</datalist>
      <table class="odvo-av"><thead><tr><th>#</th><th>${esc(t(L4('Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave')))}</th><th>${esc(t(L4('Pilote', 'Pilot', 'Pilot', 'Piloto')))}</th><th title="${esc(t(TX.ptaTip))}">PTA</th><th>${esc(t(L4('Navigateur', 'Navigator', 'Navigator', 'Navegante')))}</th><th title="${esc(t(TX.ptaTip))}">PTA</th><th>${esc(t(L4('Configuration', 'Configuration', 'Konfiguration', 'Configuración')))}</th><th>${esc(t(L4('Annulé', 'Cancelled', 'Abgesagt', 'Cancelado')))}</th></tr></thead><tbody>${Array.from({
        length: 8
      }, (_, i) => {
        const a = e.avions[i] || {};
        const chk = (n, tri) => `<input type="checkbox" name="${n}${i}"${tri && e.pta.includes(tri) ? ' checked' : ''}>`;
        return `<tr${i >= Math.max(2, e.avions.length) ? ' hidden data-more' : ''}><td>${i + 1}</td><td><select name="a${i}">${planeOptions(e, a)}</select></td><td><select name="p${i}">${memOpts(a.pilote)}</select></td><td>${chk('tp', a.pilote)}</td><td><select name="n${i}">${memOpts(a.nav)}</select></td><td>${chk('tn', a.nav)}</td><td><input name="c${i}" list="odvoCfg" value="${esc((a.config || []).join(' '))}" placeholder="KNON TALIOS" style="width:9em"></td><td><input type="checkbox" name="x${i}"${a.annule ? ' checked' : ''}></td></tr>`;
      }).join('')}</tbody></table>
      <button type="button" data-wing>${esc(t(L4('+ Ailier', '+ Wingman', '+ Flügelmann', '+ Punto')))}</button>
      ${dloField(e)}
      ${field(L4('Tâches (une par ligne : nom = TRI)', 'Tasks (one per line: name = TRI)', 'Aufgaben (eine pro Zeile: Name = TRI)', 'Tareas (una por línea: nombre = TRI)'), `<textarea name="taches" rows="2">${esc(e.taches.map(x => `${x.nom} = ${x.pilote || ''}`).join('\n'))}</textarea>`, true)}
      ${field(L4('Infos', 'Info', 'Infos', 'Información'), `<textarea name="infos" rows="2">${esc(e.infos)}</textarea>`, true)}
      <div class="odvo-grid2">${etat}
        ${field(L4('CR', 'Report', 'Bericht', 'Informe'), `<select name="cr"><option value="">—</option>${O().CR.map(x => opt(x, e.cr, t(TX.cr[x]))).join('')}</select>`)}
        ${field(L4('Partielle', 'Partial', 'Teilweise', 'Parcial'), `<input name="partiel" type="checkbox"${e.partiel ? ' checked' : ''}>`)}
      </div>
      ${Object.keys(causes).length ? `<fieldset class="odvo-causes"><legend>${esc(t(L4('Causes (MNE)', 'Causes (MNE)', 'Ursachen (MNE)', 'Causas (MNE)')))}</legend>${Object.entries(causes).filter(([k]) => k !== 'NO_REPORT' || e.causes.includes(k)).map(([k, row]) => `<label><input type="checkbox" name="cause" value="${esc(k)}"${e.causes.includes(k) ? ' checked' : ''}> ${esc(t(row))}</label>`).join('')}</fieldset>` : ''}
      ${e.mission ? `<p class="mut">${esc(t(L4('Le CR de la mission fait foi : état et CR sont repris à l’ouverture de la semaine.', 'The mission report is authoritative: status and report are taken over when the week is opened.', 'Der Missionsbericht ist maßgeblich: Status und Bericht werden beim Öffnen der Woche übernommen.', 'El informe de la misión es la referencia: estado e informe se recogen al abrir la semana.')))}</p>` : ''}
      ${repeatFields(e)}`;
      if (e.mission && window.AssignDialog) extra = `<button type="button" data-assign title="${esc(t(L4('Affectations de l’équipage (appareil, indicatif, décollage) : l’ordre de mission que les pilotes reçoivent dans Mes missions', 'Crew assignments (aircraft, callsign, take-off): the mission order the pilots receive in My missions', 'Zuweisungen der Besatzung (Luftfahrzeug, Rufzeichen, Start): der Missionsbefehl, den die Piloten in Meine Missionen erhalten', 'Asignaciones de la tripulación (aeronave, indicativo, despegue): la orden de misión que los pilotos reciben en Mis misiones')))}">${esc(t(L4('Ordre de mission…', 'Mission order…', 'Missionsbefehl…', 'Orden de misión…')))}</button>`;
      if (S.editable) extra += `<button type="button" data-order title="${esc(t(L4('Commander une mission au générateur : durée, avions et ravitaillement de la plaquette préremplis', 'Order a mission from the generator: duration, aircraft and refuelling of the strip prefilled', 'Mission beim Generator bestellen: Dauer, Luftfahrzeuge und Betankung des Streifens vorausgefüllt', 'Encargar una misión al generador: duración, aeronaves y reabastecimiento de la ficha prerrellenados')))}">${esc(t(L4('Commander une mission…', 'Order a mission…', 'Mission bestellen…', 'Encargar una misión…')))}</button>`;
      if (S.editable) extra += `<button type="button" data-reserve title="${esc(t(L4('Retirer de la frise, garder dans la réserve des vols', 'Remove from the timeline, keep in the flight pool', 'Von der Zeitleiste nehmen, im Flugvorrat behalten', 'Quitar de la cronología, guardar en la reserva de vuelos')))}">${esc(t(L4('↩ Réserve', '↩ Pool', '↩ Vorrat', '↩ Reserva')))}</button>`;
    } else if (e.type === 'note') body = `<div class="odvo-grid2">${common}</div>${field(L4('Texte', 'Text', 'Text', 'Texto'), `<textarea name="texte" rows="4">${esc(e.texte)}</textarea>`, true)}`;
    else body = `<div class="odvo-grid2">
        ${field(L4('Libellé', 'Label', 'Bezeichnung', 'Etiqueta'), `<input name="libelle" value="${esc(e.libelle)}">`)}
        ${e.type === 'controle' ? field(L4('Position', 'Position', 'Position', 'Posición'), `<input name="position" value="${esc(e.position || '')}" placeholder="LFOA_TWR">`) : ''}
        ${common}${colors}${etat}</div>
      <fieldset class="odvo-crew"><legend>${esc(t(L4('Équipage', 'Crew', 'Besatzung', 'Tripulación')))}</legend>${S.members.map(m => `<label><input type="checkbox" name="eq" value="${esc(m.tri)}"${e.equipage.includes(m.tri) ? ' checked' : ''}> ${esc(m.tri)}</label>`).join('')}</fieldset>
      <fieldset class="odvo-crew"><legend title="${esc(t(TX.ptaTip))}">PTA</legend>${S.members.map(m => `<label><input type="checkbox" name="pta" value="${esc(m.tri)}"${e.pta.includes(m.tri) ? ' checked' : ''}> ${esc(m.tri)}</label>`).join('')}</fieldset>
      ${dloField(e)}
      ${e.type === 'divers' ? field(L4('Notes', 'Notes', 'Notizen', 'Notas'), `<textarea name="notes" rows="2">${esc(e.notes || '')}</textarea>`, true) : ''}
      ${repeatFields(e)}`;
    const title = {
      vol: L4('Vol', 'Flight', 'Flug', 'Vuelo'),
      divers: L4('Divers', 'Miscellaneous', 'Sonstiges', 'Varios'),
      controle: L4('Contrôle', 'Control', 'Lotsendienst', 'Control'),
      note: L4('Note', 'Note', 'Notiz', 'Nota')
    }[e.type];
    const d = dialog(`${t(title)} · ${t(TX.days[S.day])} ${e.date}`, body, {
      extra,
      onOk: dl => applyEdit(e.id, new FormData(dl.querySelector('form'))),
      onDelete: () => mutate(doc => {
        doc.elements = doc.elements.filter(x => x.id !== e.id);
        for (const v of doc.elements) if (v.type === 'vol') v.ravitaillements = v.ravitaillements.filter(r => r.vol !== e.id);
      })
    });
    d.querySelector('[data-assign]')?.addEventListener('click', () => assignMission(e));
    d.querySelector('[data-order]')?.addEventListener('click', () => {
      d.close('cancel');
      orderMission(e);
    });
    d.querySelector('[data-reserve]')?.addEventListener('click', () => {
      d.close('cancel');
      toReserve(e.id);
    });
    wirePicker(d, 'mission', v => {
      // mission choisie : indicatif de sa patrouille, indicatifs de son type, type proposé aux places libres
      const m = reg(v),
        ind = d.querySelector('[name=indicatif]');
      if (m && ind && (!ind.value || ind.value === e.indicatif)) ind.value = ownCs(m);
      d.querySelector('#odvoCs').innerHTML = csOptions(v, typeCode(ownTeam(m).type));
      d.querySelectorAll('select[name^=a]').forEach(s => {
        if (m && !s.value) s.innerHTML = planeOptions({
          mission: v
        }, {});
      });
    });
    wirePicker(d, 'rv');
    d.querySelector('[data-wing]')?.addEventListener('click', () => d.querySelector('tr[data-more][hidden]')?.removeAttribute('hidden'));
    // axe choisi : seules ses missions ravitailleur restent dans la liste
    d.querySelector('[name=rvAxe]')?.addEventListener('change', ev => d.querySelectorAll('[data-mp=rv] .odvo-mp-row[data-axe]').forEach(b => (b.hidden = !!ev.target.value && b.dataset.axe !== ev.target.value)));
    // indicatif saisi : proposer la mission de l'affectation (même indicatif, ce jour-là)
    d.querySelector('[name=indicatif]')?.addEventListener('change', async ev => {
      const box = d.querySelector('[name=mission]');
      if (box.value || !REP()?.missionFor) return;
      const m = await REP().missionFor({
        indicatif: ev.target.value,
        date: e.date
      }).catch(() => '');
      if (m) d.querySelector(`[data-mp=mission] .odvo-mp-row[data-v="${CSS.escape(m)}"]`)?.click();
    });
  }
  /** Type d'appareil d'un vol : celui de la mission, sinon celui du premier avion. */
  const planeType = e => typeCode(ownTeam(reg(e.mission)).type) || e.avions?.find(a => a.appareil?.type)?.appareil.type || '';
  /** Indicatifs proposés : celui de la mission, puis ceux de la table dont la série vole ce type (sinon tous). */
  function csOptions(mission, type) {
    const tab = window.MISSION_CALLSIGNS?.table || [];
    const own = ownCs(reg(mission));
    const byType = type ? tab.filter(x => (x.types || []).map(typeCode).includes(typeCode(type))) : [];
    const list = [...new Set([own, ...(byType.length ? byType : tab).map(x => x.prefix)].filter(Boolean))];
    return list.map(c => `<option value="${esc(c)}">`).join('');
  }
  /** Appareils proposés pour une place : appareils de la flotte du type de la mission d'abord, puis les autres. */
  function planeOptions(e, a) {
    const want = typeCode(ownTeam(reg(e.mission)).type);
    const curV = a?.appareil ? `${a.appareil.type}|${a.appareil.immat || ''}` : want ? `${want}|` : '';
    const fleet = [...(window.DEFA_FLEET || [])].filter(f => f.operational !== false).sort((x, y) => (typeCode(y.type) === want) - (typeCode(x.type) === want) || String(x.type).localeCompare(String(y.type)) || String(x.registration).localeCompare(String(y.registration)));
    const types = [...new Set([want, a?.appareil?.type, ...fleet.map(f => typeCode(f.type))].filter(Boolean))];
    return `<option value="">—</option>${types.map(ty => opt(`${ty}|`, curV, `${ty}${ty === want ? ' ★' : ''}`)).join('')}${fleet.map(f => opt(`${typeCode(f.type)}|${f.registration}`, curV, `${f.registration} · ${f.variant || f.type}${f.base ? ' · ' + f.base : ''}${typeCode(f.type) === want ? ' ★' : ''}`)).join('')}`;
  }
  const dloField = e => field(L4('DLO — objectifs de chaque membre sur cet élément (une ligne par membre : TRI = objectifs)', 'DLO — objectives of each member on this item (one line per member: TRI = objectives)', 'DLO — Ziele jedes Mitglieds für dieses Element (eine Zeile pro Mitglied: TRI = Ziele)', 'DLO — objetivos de cada miembro en este elemento (una línea por miembro: TRI = objetivos)'), `<textarea name="dlo" rows="2" placeholder="RBR = FULL COMMS no L16">${esc(Object.entries(e.dlo || {}).map(([k, v]) => `${k} = ${v}`).join('\n'))}</textarea>`, true);
  /** Lignes « TRI = texte » → { TRI → texte }. */
  const parseDlo = txt => Object.fromEntries(String(txt || '').split('\n').map(l => {
    const i = l.indexOf('=');
    return i < 0 ? ['', ''] : [l.slice(0, i).trim().toUpperCase(), l.slice(i + 1).trim()];
  }).filter(([k, v]) => k && v));
  function repeatFields(e) {
    const r = (S.cfg.recurrences || []).find(x => x.id === e.recurrence);
    return `<div class="odvo-grid2">${field(L4('Répéter', 'Repeat', 'Wiederholen', 'Repetir'), `<select name="rythme">${[['', L4('non', 'no', 'nein', 'no')], ['quotidien', L4('chaque jour', 'every day', 'täglich', 'cada día')], ['hebdo', L4('chaque semaine', 'every week', 'wöchentlich', 'cada semana')], ['bimensuel', L4('une semaine sur deux', 'every other week', 'alle zwei Wochen', 'cada dos semanas')]].map(([v, l]) => opt(v, r?.rythme || '', t(l))).join('')}</select>`)}${field(L4('Jusqu’au', 'Until', 'Bis', 'Hasta'), `<input name="rfin" type="date" value="${esc(r?.fin || '')}">`)}</div>`;
  }
  function applyEdit(id, f) {
    mutate(doc => {
      const e = doc.elements.find(x => x.id === id);
      if (!e) return;
      const g = k => f.get(k);
      if (f.has('debut')) e.debut = g('debut') || e.debut;
      if (f.has('duree')) e.duree = Math.max(5, +g('duree') || e.duree);
      for (const k of ['libelle', 'indicatif', 'position', 'notes', 'texte', 'infos', 'motif'])
        if (f.has(k)) e[k] = String(g(k) || '').trim();
      if (f.has('couleur')) {
        e.couleur = g('couleur');
        e.fond = f.get('fondOn') ? g('couleur') : null;
      }
      if (f.has('etat')) e.etat = g('etat');
      if (e.type === 'vol') {
        const mid = String(g('mission') || '').split('|')[0];
        const mis = reg(mid);
        e.mission = mid || null;
        e.equipe = ownCs(mis) || null;
        if (e.equipe && !e.indicatif) e.indicatif = e.equipe;
        if (mis && fits(mis, e.duree) === false) notify(`${mid} — ${estText(mis, e.duree)}`, 'warn');
        e.reseau = g('reseau') || null;
        e.zones = String(g('zones') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map(nom => ({
          id: e.zones.find(z => z.nom === nom)?.id || '',
          nom
        }));
        e.axe = String(g('axe') || '').trim() || null;
        e.offload = g('offload') === '' ? null : +g('offload');
        e.avions = Array.from({
          length: 8
        }, (_, i) => ({
          appareil: (() => {
            const [ty, im] = String(g(`a${i}`) || '').split('|');
            return ty || im ? {
              type: ty,
              immat: im || ''
            } : null;
          })(),
          pilote: g(`p${i}`) || null,
          nav: g(`n${i}`) || null,
          annule: !!g(`x${i}`),
          config: String(g(`c${i}`) || '').split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean)
        })).filter((a, i) => i < 2 || a.pilote || a.nav || a.appareil?.immat);
        e.pta = Array.from({
          length: 8
        }, (_, i) => [g(`tp${i}`) && g(`p${i}`), g(`tn${i}`) && g(`n${i}`)]).flat().filter(Boolean);
        e.taches = String(g('taches') || '').split('\n').map(l => l.split('=')).filter(([n]) => n?.trim()).map(([n, p]) => ({
          nom: n.trim(),
          pilote: (p || '').trim().toUpperCase() || null
        }));
        // ravitaillement : vol ravitailleur du jour, ou mission ravitailleur choisie sur l'axe — posée ce jour : accrochée ;
        // sinon sa plaquette rejoint la réserve de la palette (formations des missions), à poser à la main
        const rv = String(g('rv') || ''),
          heure = g('rvHeure') || e.debut;
        let tankId = rv.startsWith('vol:') ? rv.slice(4) : null;
        const tankMission = tankId ? doc.elements.find(x => x.id === tankId)?.mission || null : rv || null;
        if (!tankId && tankMission) tankId = doc.elements.find(x => x.type === 'vol' && x.date === e.date && x.mission === tankMission)?.id || null;
        const tank = doc.elements.find(x => x.id === tankId);
        e.ravitaillements = rv ? [{
          mission: tankMission,
          axe: g('rvAxe') || trackOf(reg(tankMission)) || tank?.axe || null,
          vol: tankId,
          heure,
          offload: tank?.offload ?? null
        }] : [];
        e.cr = g('cr') || null;
        e.partiel = !!g('partiel');
        e.causes = f.getAll('cause');
        // un CR pose l'état s'il était « prévu »
        if (e.cr && e.etat === 'prevu') e.etat = {
          ME: 'fait',
          BACHE: 'annule',
          MNE: e.partiel ? 'fait' : 'non_fait'
        }[e.cr];
        resolveZones(e);
      } else if (e.type !== 'note') {
        e.equipage = f.getAll('eq');
        e.pta = f.getAll('pta');
      }
      if (f.has('dlo')) e.dlo = parseDlo(g('dlo'));
      Object.assign(e, O().normalize(e));
      setRecurrence(e, g('rythme'), g('rfin'));
    });
  }
  /** Identifiants de base des zones saisies par leur nom (OdvAirspace.match), en tâche de fond. */
  async function resolveZones(e) {
    if (!AS()?.match || !e.zones.some(z => !z.id)) return;
    let changed = false;
    for (const z of e.zones)
      if (!z.id) {
        const id = await AS().match(z.nom).catch(() => '');
        if (id && typeof id === 'string') {
          z.id = id;
          changed = true;
        }
      }
    if (changed) {
      queueSave();
      refreshAirspace();
    }
  }
  /** Récurrence d'un élément dans les réglages (à partir de sa date) ; rythme vide : retirée pour la suite. */
  function setRecurrence(e, rythme, fin) {
    const cfg = S.cfg;
    const list = [...(cfg.recurrences || [])];
    const i = list.findIndex(r => r.id === e.recurrence);
    if (!rythme) {
      if (i < 0) return;
      list.splice(i, 1);
      e.recurrence = null;
    } else {
      const {
        id,
        date,
        etat,
        cr,
        partiel,
        causes,
        motif,
        recurrence,
        ...rest
      } = e;
      // la récurrence reprend l'élément sans son équipage (avions vides, pas de PTA ni de DLO)
      const element = {
        ...rest,
        avions: (rest.avions || []).map(a => ({
          ...a,
          pilote: null,
          nav: null,
          annule: false
        })),
        taches: (rest.taches || []).map(x => ({
          ...x,
          pilote: null
        })),
        equipage: rest.equipage ? [] : undefined,
        pta: [],
        dlo: {}
      };
      const r = {
        id: i >= 0 ? list[i].id : O().uid(),
        element,
        rythme,
        jour: dow(e.date),
        debut: i >= 0 ? list[i].debut : e.date,
        fin: fin || null
      };
      if (i >= 0) list[i] = r;
      else list.push(r);
      e.recurrence = r.id;
    }
    O().saveConfig({
      ...cfg,
      recurrences: list
    }).then(() => (S.cfg = {
      ...cfg,
      recurrences: list
    })).catch(err => notify(String(err?.message || err), 'error'));
  }
  // commande d'une mission (générateur, MissionOrder) préremplie d'après la plaquette ; scripts chargés à la demande
  const SELF = document.currentScript?.src || location.href;
  const loadScript = src => new Promise((ok, ko) => {
    const url = new URL(src, SELF).href.split('?')[0];
    if ([...document.scripts].some(x => x.src.split('?')[0] === url)) return ok();
    const s = document.createElement('script');
    s.src = new URL(src, SELF).href;
    s.onload = ok;
    s.onerror = () => ko(new Error(src));
    document.head.append(s);
  });
  async function orderMission(e) {
    try {
      for (const src of ['mission_store.js?v=bc7f59ef', 'mission_prompt.js?v=8774038d', '../../shared/mission_order.js?v=ac4119b1']) await loadScript(src);
    } catch (err) {
      return notify(String(err?.message || err), 'error');
    }
    if (!window.MissionOrder?.mount) return notify('MissionOrder ?', 'error');
    const planes = e.avions.filter(a => a.pilote || a.appareil);
    const n = Math.max(1, Math.min(5, planes.length || 1)),
      d = e.duree;
    const preset = {
      teams: n,
      teamSlots: planes.slice(0, n).map(a => a.appareil?.type || ''),
      duration: d < 45 ? 'XS' : d <= 90 ? 'S' : d <= 180 ? 'M' : d <= 300 ? 'L' : 'XL',
      aar: e.ravitaillements?.length ? 'oui' : 'non'
    };
    const dl = document.createElement('dialog');
    dl.className = 'odvo-dlg';
    dl.innerHTML = `<header><b>${esc(t(L4('Commander une mission', 'Order a mission', 'Mission bestellen', 'Encargar una misión')))}</b></header><div class="odvo-dlg-b"><p class="mut">${esc(tf(L4('Préréglée d’après la plaquette {p} : {n} équipe(s), durée {d}, ravitaillement {a}. Une fois la mission générée et le dossier relu dans le Registre, liez-la à la plaquette.', 'Preset from strip {p}: {n} team(s), duration {d}, refuelling {a}. Once the mission is generated and the folder read again in the Registry, link it to the strip.', 'Voreingestellt nach Streifen {p}: {n} Team(s), Dauer {d}, Betankung {a}. Sobald die Mission erzeugt und der Ordner im Register neu gelesen ist, mit dem Streifen verknüpfen.', 'Preajustada según la ficha {p}: {n} equipo(s), duración {d}, reabastecimiento {a}. Una vez generada la misión y releída la carpeta en el Registro, vincúlela a la ficha.'), {
      p: e.indicatif || e.libelle || e.debut,
      n,
      d: preset.duration,
      a: t(preset.aar === 'oui' ? L4('oui', 'yes', 'ja', 'sí') : L4('non', 'no', 'nein', 'no'))
    }))}</p><div id="odvoOrder"></div></div><footer><span style="flex:1"></span><button type="button" data-close>${esc(t(L4('Fermer', 'Close', 'Schließen', 'Cerrar')))}</button></footer>`;
    document.body.append(dl);
    dl.querySelector('[data-close]').addEventListener('click', () => dl.close());
    dl.addEventListener('close', () => dl.remove());
    window.MissionOrder.mount(dl.querySelector('#odvoOrder'), {
      preset,
      hint: t(L4('Enregistrez les fichiers dans le dossier des missions, puis « Relire le dossier » dans le Registre.', 'Save the files in the missions folder, then “Read the folder again” in the Registry.', 'Dateien im Missionsordner speichern, dann im Register „Ordner neu lesen“.', 'Guarde los archivos en la carpeta de misiones y luego «Releer la carpeta» en el Registro.')),
      onOrdered: () => notify(t(L4('Mission commandée : elle apparaît au registre (« commandée »).', 'Mission ordered: it appears in the registry (“ordered”).', 'Mission bestellt: sie erscheint im Register („bestellt“).', 'Misión encargada: aparece en el registro («encargada»).')), 'info')
    });
    dl.showModal();
  }
  async function assignMission(e) {
    const m = reg(e.mission) || (window.MissionIndex?.all?.() || []).find(x => x.id === e.mission);
    if (!m) return notify(tf(L4('Mission {m} absente du registre', 'Mission {m} not in the registry', 'Mission {m} nicht im Register', 'Misión {m} ausente del registro'), {
      m: e.mission
    }), 'warn');
    const file = (m.files || []).find(f => /\.ya?ml$/i.test(f) && !/^affectations/i.test(f));
    const found = await MA().missionFirst(m.folder, [file, `mission${m.id}.yaml`]).catch(() => null);
    let y = {};
    try {
      y = found ? window.jsyaml.load(found.value.replace(/^#.*\n/, '')) || {} : {};
    } catch {
      y = {};
    }
    // un avion de la plaquette = une ligne : pilote, immatriculation, indicatif (patrouille : MERCURE31, MERCURE32…)
    const next = (cs, n) => String(cs || '').replace(/(\d+)(?!.*\d)/, x => String(+x + n).padStart(x.length, '0'));
    const planes = e.avions.filter(a => a.pilote);
    const crew = planes.map(a => a.pilote);
    const dlg = await window.AssignDialog.open(m, y, {
      maps: m.images || [],
      pilots: crew,
      takeoff: Date.parse(`${e.date}T${e.debut}:00Z`),
      rows: planes.length ? planes.map((a, i) => ({
        pilot: a.pilote,
        registration: a.appareil?.immat || '',
        callsign: e.indicatif ? next(e.indicatif, i) : ''
      })) : null
    });
    dlg?.addEventListener('assigned', async () => {
      S.affect = (await MA().index({
        fresh: true
      }).catch(() => null))?.assignments || S.affect;
      recompute();
      render();
      refreshAirspace();
    }, {
      once: true
    });
  }

  // ---- vue de la semaine : dispos par membre et modifications
  function renderWeekView() {
    const ds = dates();
    const occ = (tri, date) => S.doc.elements.filter(e => e.date === date && e.etat !== 'annule' && O().crewOf(e, S.affect).includes(tri));
    const row = m => `<tr><th title="${esc(m.nom)}">${esc(m.tri)}</th>${ds.map((d, i) => {
      const o = occ(m.tri, d);
      return `<td data-cell="${esc(m.tri)}|${esc(d)}" title="${esc(o.map(e => `${e.debut}z ${e.indicatif || e.libelle || t(TX.types[e.type] || TX.types.note)}`).join('\n'))}">${dispoBar(S.dispos[m.tri]?.[d] ?? (S.dispos[m.tri] ? [] : null), 0, 1440)}${o.length ? `<span class="odvo-occ">${o.length}</span>` : ''}</td>`;
    }).join('')}</tr>`;
    const seen = K.store.json(SEEN, {}) || {};
    const changes = Object.entries(S.disposDocs).filter(([tri, d]) => d.updated_at && String(d.updated_at) > String(seen[`${tri}|${S.week}`] || '')).sort((a, b) => String(b[1].updated_at).localeCompare(String(a[1].updated_at)));
    $('#odvoWeekView').innerHTML = `
      <table class="odvo-wk"><thead><tr><th></th>${ds.map((d, i) => `<th>${esc(t(TX.days[i]))} ${esc(d.slice(8, 10))}/${esc(d.slice(5, 7))}</th>`).join('')}</tr></thead>
      <tbody>${['staff', 'autre'].map(g => S.members.filter(m => m.groupe === g).map(row).join('')).join('')}</tbody></table>
      <p class="mut">${esc(t(L4('Clic sur une case : plages déclarées du membre ce jour-là (récup comprise).', 'Click a cell: the member’s declared ranges that day (time off included).', 'Klick auf eine Zelle: angegebene Zeiträume des Mitglieds an diesem Tag (Ausgleich inklusive).', 'Clic en una casilla: franjas declaradas por el miembro ese día (descanso incluido).')))}</p>
      <h3>${esc(t(L4('Modifications de dispo', 'Availability changes', 'Verfügbarkeitsänderungen', 'Cambios de disponibilidad')))}</h3>
      ${changes.length ? `<ul class="odvo-chg">${changes.map(([tri, d]) => `<li><b>${esc(tri)}</b> ${esc(String(d.updated_at).slice(0, 16).replace('T', ' '))}z ${d.by && d.by !== tri ? `(${esc(d.by)})` : ''} <button type="button" data-seen="${esc(tri)}">${esc(t(L4('Pris en compte', 'Noted', 'Berücksichtigt', 'Tenido en cuenta')))}</button></li>`).join('')}</ul><button type="button" data-seen="*">${esc(t(L4('Tout prendre en compte', 'Note all', 'Alle berücksichtigen', 'Tener todo en cuenta')))}</button>` : `<p class="mut">${esc(t(L4('Aucune modification depuis la dernière prise en compte.', 'No change since last noted.', 'Keine Änderung seit der letzten Berücksichtigung.', 'Ningún cambio desde la última vez.')))}</p>`}`;
  }
  function openDispos(tri, date) {
    const cats = SD()?.categories?.() || [];
    const plages = [...(S.dispos[tri]?.[date] || [])];
    const rowHtml = (p, i) => `<tr data-i="${i}"><td><select name="c${i}">${cats.map(c => opt(c.id, p.categorie, SD().label(c.label))).join('')}</select></td><td><input name="d${i}" type="time" step="900" value="${esc(p.debut || '')}"></td><td><input name="f${i}" type="time" step="900" value="${esc(p.fin || '')}"></td></tr>`;
    const body = `<p class="mut">${esc(tf(L4('{tri}, {d} — heures z ; vide = journée entière ; ligne sans catégorie : supprimée.', '{tri}, {d} — z hours; empty = whole day; row without category: removed.', '{tri}, {d} — Stunden z; leer = ganzer Tag; Zeile ohne Kategorie: gelöscht.', '{tri}, {d} — horas z; vacío = día entero; fila sin categoría: eliminada.'), {
      tri,
      d: date
    }))}</p><table class="odvo-av"><thead><tr><th>${esc(t(L4('Catégorie', 'Category', 'Kategorie', 'Categoría')))}</th><th>${esc(t(L4('Début', 'Start', 'Beginn', 'Inicio')))}</th><th>${esc(t(L4('Fin', 'End', 'Ende', 'Fin')))}</th></tr></thead><tbody>${[...plages, {}, {}].map(rowHtml).join('').replace(/<select name="c(\d+)">/g, (m, i) => +i >= plages.length ? `<select name="c${i}"><option value="">—</option>` : m)}</tbody></table>
      <div class="row">${field(L4('Récup à partir de (z)', 'Time off from (z)', 'Ausgleich ab (z)', 'Descanso desde (z)'), `<input name="recup" type="time" step="900">`)}</div>`;
    dialog(t(L4('Disponibilités', 'Availability', 'Verfügbarkeit', 'Disponibilidad')), body, {
      onOk: async dl => {
        const f = new FormData(dl.querySelector('form'));
        const out = [];
        for (let i = 0; i < plages.length + 2; i++) {
          const c = f.get(`c${i}`);
          if (c) out.push({
            debut: f.get(`d${i}`) || null,
            fin: f.get(`f${i}`) || null,
            categorie: c
          });
        }
        if (f.get('recup')) out.push({
          debut: f.get('recup'),
          fin: '24:00',
          categorie: 'recup'
        });
        const r = await O().setDispos(tri, S.week, date, out).catch(err => ({
          error: err
        }));
        if (r?.error && r.where !== 'local') return notify(String(r.error?.message || r.error), 'error');
        S.dispos[tri] = {
          ...(S.dispos[tri] || {}),
          [date]: out
        };
        if (r?.doc) S.disposDocs[tri] = r.doc;
        recompute();
        render();
      }
    });
  }

  // ---- statistiques
  function renderStats() {
    const st = O().stats(S.doc, {
      dispos: S.dispos,
      affectations: S.affect,
      config: S.cfg
    });
    const card = (v, l) => `<div class="odvo-card"><b>${esc(String(v))}</b><span>${esc(t(l))}</span></div>`;
    const h = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
    const rows = S.members.map(m => {
      const x = st.membres[m.tri] || {
        dispo: 0,
        vol: 0,
        charge: 0
      };
      const pct = Number.isFinite(x.charge) ? Math.round(x.charge * 100) + ' %' : t(L4('sans dispo !', 'no availability!', 'keine Verfügbarkeit!', '¡sin disponibilidad!'));
      const cls = !Number.isFinite(x.charge) || x.charge > 1 ? 'bad' : x.charge > .7 ? 'warn' : '';
      return `<tr><th>${esc(m.tri)}</th><td>${h(x.dispo)}</td><td>${h(x.vol)}</td><td class="${cls}">${esc(pct)}</td></tr>`;
    }).join('');
    $('#odvoStats').innerHTML = `<div class="odvo-cards">${card(st.vols, L4('Vols prévus', 'Planned flights', 'Geplante Flüge', 'Vuelos previstos'))}${card(h(st.duree), L4('Durée cumulée', 'Total duration', 'Gesamtdauer', 'Duración total'))}${card(st.faits, L4('Faits', 'Done', 'Erledigt', 'Hechos'))}${card(st.nonFaits, L4('Non faits', 'Not done', 'Nicht erledigt', 'No hechos'))}${card(st.annules, L4('Annulés', 'Cancelled', 'Abgesagt', 'Cancelados'))}${card(st.aar, L4('AAR', 'AAR', 'AAR', 'AAR'))}${card(st.ME, L4('ME', 'ME', 'ME', 'ME'))}${card(st.BACHE, L4('Bâchés', 'Bâchés', 'Bâchés', 'Bâchés'))}${card(st.MNE, L4('MNE', 'MNE', 'MNE', 'MNE'))}</div>
      <table class="odvo-wk"><thead><tr><th></th><th>${esc(t(L4('Disponible (heures de service)', 'Available (duty hours)', 'Verfügbar (Dienstzeiten)', 'Disponible (horas de servicio)')))}</th><th>${esc(t(L4('Vol', 'Flight', 'Flug', 'Vuelo')))}</th><th>${esc(t(L4('Charge', 'Load', 'Auslastung', 'Carga')))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---- interactions générales
  function wireBar() {
    $('#odvoBar').addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.day != null) {
        S.day = +b.dataset.day;
        S.view = 'jour';
        keepView();
        render();
        refreshAirspace();
        return;
      }
      if (b.dataset.view) {
        S.view = b.dataset.view;
        keepView();
        return render();
      }
      const act = b.dataset.act;
      if (act === 'prev' || act === 'next') return gotoWeek(SD().addWeek(S.week, act === 'prev' ? -1 : 1));
      if (act === 'today') return gotoWeek(SD().weekId(Date.now()), todayIndex());
      if (act === 'brief') return briefing();
    });
    $('#odvoBar').addEventListener('change', ev => {
      if (ev.target.dataset.act === 'perm') mutate(doc => (doc.permanence = ev.target.value));
    });
    $('#odvoWeekView').addEventListener('click', ev => {
      const c = ev.target.closest('[data-cell]'),
        sn = ev.target.closest('[data-seen]');
      if (sn) {
        const seen = K.store.json(SEEN, {}) || {};
        for (const [tri, d] of Object.entries(S.disposDocs))
          if (sn.dataset.seen === '*' || sn.dataset.seen === tri) seen[`${tri}|${S.week}`] = d.updated_at;
        K.store.setJson(SEEN, seen);
        return renderWeekView();
      }
      if (c && S.editable) {
        const [tri, date] = c.dataset.cell.split('|');
        openDispos(tri, date);
      }
    });
    $('#odvoZoom').addEventListener('input', ev => {
      S.zoom = +ev.target.value;
      keepView();
      renderDay();
    });
    document.addEventListener('keydown', ev => {
      if (ev.target.closest('input,textarea,select,dialog')) return;
      if (ev.key === 'f' || ev.key === 'F') briefing();
      if (document.fullscreenElement && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
        S.day = Math.max(0, Math.min(dates().length - 1, S.day + (ev.key === 'ArrowLeft' ? -1 : 1)));
        render();
        refreshAirspace();
      }
    });
    window.addEventListener('cpco-access-change', render);
    window.addEventListener('repository-language-change', render);
    window.addEventListener('defa-data-change', ev => {
      const p = ev.detail?.path || ev.detail?.rel || '';
      // écriture de cette page (son propre enregistrement) : pas de relecture
      if (/odv\/|disponibilites\/|affectations/.test(p) && !S.timer && Date.now() - (S.savedAt || 0) > 3000) load(S.week, {
        fresh: true
      });
    });
  }
  const todayIndex = () => Math.max(0, Math.min((S.cfg?.nbJours || 7) - 1, (new Date().getUTCDay() + 6) % 7));
  async function gotoWeek(w, day = 0) {
    if (S.timer) await save();
    S.day = day;
    S.airMissing = null;
    history.replaceState(null, '', `?semaine=${encodeURIComponent(w)}`);
    await load(w);
    mountActivations();
  }
  function briefing() {
    const sec = $('#odvoDaySection');
    if (document.fullscreenElement) return document.exitFullscreen();
    S.view = 'jour';
    render();
    sec.requestFullscreen?.().catch(() => {});
  }
  let activations = null;
  function mountActivations() {
    const host = $('#odvoActivations');
    if (!window.OdvActivationsEditor) {
      host.innerHTML = `<p class="mut">${esc(t(L4('Éditeur des activations indisponible.', 'Activation editor unavailable.', 'Aktivierungseditor nicht verfügbar.', 'Editor de activaciones no disponible.')))}</p>`;
      return;
    }
    if (activations) return activations.set({
      semaine: S.week,
      readOnly: !S.editable
    });
    activations = window.OdvActivationsEditor.mount(host, {
      semaine: S.week,
      readOnly: !S.editable,
      onChange: () => refreshAirspace()
    });
  }

  async function init() {
    const v = readView();
    S.view = ['jour', 'semaine', 'stats'].includes(v.view) ? v.view : 'jour';
    S.zoom = Number.isInteger(v.zoom) ? Math.max(0, Math.min(ZOOMS.length - 1, v.zoom)) : 2;
    $('#odvoZoom').value = S.zoom;
    const q = new URLSearchParams(location.search).get('semaine');
    const w = /^\d{4}-W\d{2}$/.test(q || '') ? q : SD().weekId(Date.now());
    S.day = q ? 0 : todayIndex();
    S.editable = canEdit();
    wireBar();
    wireGrid();
    await load(w);
    mountActivations();
    window.AppFramework?.guardUnsavedChanges?.(() => !!S.timer);
  }
  window.OdvOrdersPage = {
    state: S,
    load,
    save,
    render,
    mutate,
    openEdit
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
