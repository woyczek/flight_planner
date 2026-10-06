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
    S.doc = await O().readWeek(week, {
      fresh,
      config: S.cfg
    });
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
    await applyReports();
    recompute();
    render();
    refreshAirspace();
    loadSun();
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
    const r = await O().saveWeek(S.doc).catch(e => ({
      error: e
    }));
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
      vol: 74,
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
  function crewChip(tri, e) {
    const c = (S.conf.get(e.id) || []).find(x => x.tri === tri);
    const col = S.members.find(m => m.tri === tri)?.couleur;
    return `<span class="odvo-tri${c ? ' bad' : ''}" data-tri="${esc(tri)}" title="${esc(memberName(tri) + (c ? ' — ' + conflictText(c) : ''))}"${col ? ` style="border-color:${esc(tint(col))}"` : ''}>${esc(tri)}</span>`;
  }
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
      const prep = O().prepReady(e, {
        dispos: S.dispos,
        affectations: S.affect
      });
      body = `<div class="odvo-it-h"><b>${esc(e.libelle || '—')}</b>${e.indicatif ? ` <span>${esc(e.indicatif)}</span>` : ''}${e.mission ? ` <span class="odvo-mis" title="${esc(t(L4('Mission du registre', 'Registry mission', 'Mission des Registers', 'Misión del registro')))}">${esc(e.mission)}</span>` : ` <span class="odvo-mis">${esc(t(L4('entr.', 'train.', 'Übung', 'entr.')))}</span>`}${e.cr ? ` <span class="odvo-cr odvo-cr-${esc(e.cr)}">${esc(e.cr === 'BACHE' ? 'Bâché' : e.cr)}${e.partiel ? '½' : ''}</span>` : ''}${!prep && crew.length && e.etat === 'prevu' ? ` <span class="odvo-p" title="${esc(t(L4('P — aucun équipier disponible dans l’heure et demie avant le vol', 'P — no crew member available in the hour and a half before the flight', 'P — kein Besatzungsmitglied in den 90 Minuten vor dem Flug verfügbar', 'P — ningún tripulante disponible en la hora y media previa al vuelo')))}">P</span>` : ''}</div>
        <div class="odvo-it-t">${esc(e.debut)}z · ${esc(String(e.duree))}′${e.zones?.length ? ' · ' + esc(e.zones.map(z => z.nom).join(', ')) : ''}${e.axe ? ' · AAR ' + esc(e.axe) : ''}${e.ravitaillements?.length ? ' · ⛽' + e.ravitaillements.length : ''}</div>
        <div class="odvo-it-c">${crew.map(x => crewChip(x, e)).join('')}</div>`;
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
    $('#odvoProblems').innerHTML = items.length ? `<b>${esc(t(L4('Problèmes d’affectation', 'Assignment problems', 'Einteilungsprobleme', 'Problemas de asignación')))}</b> ${items.map(e => `<button type="button" class="odvo-prob" data-goto="${esc(e.id)}">${esc(e.libelle || e.texte || e.type)} ${esc(e.debut)}z : ${esc([...(S.conf.get(e.id) || []), ...(S.zoneConf.get(e.id) || []).map(z => ({
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
    $('#odvoPalette').innerHTML = `
      <h3>${esc(t(TX.sections.vol))}</h3>${tpl('vol', M.vols)}
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
      if (drag.k === 'tpl' && lane && laneAccepts(lane.dataset.lane, drag.v.split(':')[0])) ev.preventDefault();
      if (drag.k === 'mem' && it) ev.preventDefault();
    });
    host.addEventListener('drop', ev => {
      if (!drag) return;
      ev.preventDefault();
      const d = drag;
      drag = null;
      const lane = ev.target.closest('[data-lane]'),
        it = ev.target.closest('.odvo-it');
      if (d.k === 'tpl' && lane) {
        const [type, id] = d.v.split(':');
        const el = fromTemplate(type, id, curDate(), minuteAt(lane, ev.clientX));
        mutate(doc => doc.elements.push(el));
        openEdit(el.id);
      } else if (d.k === 'mem' && it) mutate(doc => {
        const e = doc.elements.find(x => x.id === it.dataset.id);
        // même plaquette : rien ; plaquette qui refuse (vol de mission, huit avions, déjà à bord) : le trigramme reste
        // sur la plaquette d'origine — retiré de celle-ci seulement une fois ajouté à la cible
        if (!e || d.from === e.id || !addMember(e, d.v)) return;
        if (d.from) removeMember(doc.elements.find(x => x.id === d.from), d.v);
      });
    });
    host.addEventListener('dragend', () => (drag = null));
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
      let moved = false;
      it.setPointerCapture(ev.pointerId);
      const move = m => {
        const dm = snap((m.clientX - x0) / P);
        if (Math.abs(m.clientX - x0) > 3) moved = true;
        if (!moved) return;
        if (rsz) it.style.width = `${Math.max(5, d + dm) * P}px`;
        else it.style.transform = `translateX(${dm * P}px)`;
      };
      const stop = () => {
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
  const laneAccepts = (lane, type) => lane === type || (lane === 'note' && type === 'note');
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
  function openEdit(id) {
    const e = S.doc.elements.find(x => x.id === id);
    if (!e) return;
    const common = field(L4('Début (z)', 'Start (z)', 'Beginn (z)', 'Inicio (z)'), `<input name="debut" type="time" step="300" value="${esc(e.debut)}">`) + field(L4('Durée (min)', 'Duration (min)', 'Dauer (min)', 'Duración (min)'), `<input name="duree" type="number" min="5" step="5" value="${e.duree}">`);
    const etat = (e.type !== 'note') ? field(L4('État', 'Status', 'Status', 'Estado'), `<select name="etat">${O().ETATS.map(x => opt(x, e.etat, t(TX.etats[x]))).join('')}</select>`) + field(L4('Motif', 'Reason', 'Grund', 'Motivo'), `<input name="motif" value="${esc(e.motif || '')}">`) : '';
    const colors = e.type !== 'note' ? field(L4('Couleur', 'Colour', 'Farbe', 'Color'), `<input name="couleur" type="color" value="${esc(e.couleur || '#64748b')}">`) + field(L4('Fond plein', 'Solid fill', 'Gefüllt', 'Relleno'), `<input name="fondOn" type="checkbox"${e.fond ? ' checked' : ''}>`) : '';
    let body = '',
      extra = '';
    if (e.type === 'vol') {
      const aff = O().missionCrew(e, S.affect);
      const mids = (window.MissionIndex?.all?.() || []).map(m => m.id);
      const css = window.MISSION_CALLSIGNS?.table?.map(x => x.prefix) || [];
      const causes = REP()?.CAUSES || {};
      body = `<div class="odvo-grid2">
        ${field(L4('Libellé', 'Label', 'Bezeichnung', 'Etiqueta'), `<input name="libelle" value="${esc(e.libelle)}">`)}
        ${field(L4('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), `<input name="indicatif" list="odvoCs" value="${esc(e.indicatif)}"><datalist id="odvoCs">${css.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`)}
        ${field(L4('Mission du registre (vide : entraînement)', 'Registry mission (empty: training)', 'Mission des Registers (leer: Übung)', 'Misión del registro (vacío: entrenamiento)'), `<input name="mission" list="odvoMis" value="${esc(e.mission || '')}"><datalist id="odvoMis">${mids.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`)}
        ${field(L4('Réseau', 'Network', 'Netzwerk', 'Red'), `<select name="reseau">${['', 'IVAO', 'VATSIM'].map(x => opt(x, e.reseau, x || t(L4('par défaut', 'default', 'Standard', 'por defecto')))).join('')}</select>`)}
        ${common}${colors}
        ${field(L4('Zones (entraînement, séparées par des virgules)', 'Areas (training, comma-separated)', 'Gebiete (Übung, durch Kommas getrennt)', 'Zonas (entrenamiento, separadas por comas)'), `<input name="zones" value="${esc(e.zones.map(z => z.nom).join(', '))}">`, true)}
        ${field(L4('Axe AAR (vol ravitailleur)', 'AAR track (tanker flight)', 'AAR-Strecke (Tankerflug)', 'Eje AAR (vuelo cisterna)'), `<input name="axe" value="${esc(e.axe || '')}">`)}
        ${field(L4('Offload (t)', 'Offload (t)', 'Abgabe (t)', 'Descarga (t)'), `<input name="offload" type="number" step="0.5" value="${esc(e.offload ?? '')}">`)}
        ${field(L4('Ravitailleur (vol du jour)', 'Tanker (flight of the day)', 'Tanker (Flug des Tages)', 'Cisterna (vuelo del día)'), `<select name="rvVol"><option value="">—</option>${S.doc.elements.filter(x => x.type === 'vol' && x.axe && x.id !== e.id && x.date === e.date).map(x => opt(x.id, e.ravitaillements[0]?.vol, `${x.libelle || x.indicatif} ${x.debut}z · ${x.axe}`)).join('')}</select>`)}
        ${field(L4('Heure du ravitaillement (z)', 'Refuelling time (z)', 'Betankungszeit (z)', 'Hora del reabastecimiento (z)'), `<input name="rvHeure" type="time" step="300" value="${esc(e.ravitaillements[0]?.heure || '')}">`)}
      </div>
      <h4>${esc(t(L4('Avions', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves')))}</h4>
      ${aff.length ? `<p class="mut">${esc(t(L4('Équipage tiré des affectations de la mission :', 'Crew taken from the mission assignments:', 'Besatzung aus den Zuweisungen der Mission:', 'Tripulación tomada de las asignaciones de la misión:')))} ${esc(aff.map(a => `${a.pilot} ${a.callsign || ''} ${a.aircraft?.type || ''}`).join(' · '))}</p>` : ''}
      <table class="odvo-av"><thead><tr><th>#</th><th>${esc(t(L4('Pilote', 'Pilot', 'Pilot', 'Piloto')))}</th><th>${esc(t(L4('Navigateur', 'Navigator', 'Navigator', 'Navegante')))}</th><th>${esc(t(L4('Annulé', 'Cancelled', 'Abgesagt', 'Cancelado')))}</th></tr></thead><tbody>${Array.from({
        length: 8
      }, (_, i) => {
        const a = e.avions[i] || {};
        return `<tr><td>${i + 1}</td><td><select name="p${i}">${memOpts(a.pilote)}</select></td><td><select name="n${i}">${memOpts(a.nav)}</select></td><td><input type="checkbox" name="x${i}"${a.annule ? ' checked' : ''}></td></tr>`;
      }).join('')}</tbody></table>
      ${field(L4('Tâches (une par ligne : nom = TRI)', 'Tasks (one per line: name = TRI)', 'Aufgaben (eine pro Zeile: Name = TRI)', 'Tareas (una por línea: nombre = TRI)'), `<textarea name="taches" rows="2">${esc(e.taches.map(x => `${x.nom} = ${x.pilote || ''}`).join('\n'))}</textarea>`, true)}
      ${field(L4('Infos', 'Info', 'Infos', 'Información'), `<textarea name="infos" rows="2">${esc(e.infos)}</textarea>`, true)}
      <div class="odvo-grid2">${etat}
        ${field(L4('CR', 'Report', 'Bericht', 'Informe'), `<select name="cr"><option value="">—</option>${O().CR.map(x => opt(x, e.cr, t(TX.cr[x]))).join('')}</select>`)}
        ${field(L4('Partielle', 'Partial', 'Teilweise', 'Parcial'), `<input name="partiel" type="checkbox"${e.partiel ? ' checked' : ''}>`)}
      </div>
      ${Object.keys(causes).length ? `<fieldset class="odvo-causes"><legend>${esc(t(L4('Causes (MNE)', 'Causes (MNE)', 'Ursachen (MNE)', 'Causas (MNE)')))}</legend>${Object.entries(causes).filter(([k]) => k !== 'NO_REPORT' || e.causes.includes(k)).map(([k, row]) => `<label><input type="checkbox" name="cause" value="${esc(k)}"${e.causes.includes(k) ? ' checked' : ''}> ${esc(t(row))}</label>`).join('')}</fieldset>` : ''}
      ${e.mission ? `<p class="mut">${esc(t(L4('Le CR de la mission fait foi : état et CR sont repris à l’ouverture de la semaine.', 'The mission report is authoritative: status and report are taken over when the week is opened.', 'Der Missionsbericht ist maßgeblich: Status und Bericht werden beim Öffnen der Woche übernommen.', 'El informe de la misión es la referencia: estado e informe se recogen al abrir la semana.')))}</p>` : ''}
      ${repeatFields(e)}`;
      if (e.mission && window.AssignDialog) extra = `<button type="button" data-assign>${esc(t(L4('Affecter…', 'Assign…', 'Zuweisen…', 'Asignar…')))}</button>`;
    } else if (e.type === 'note') body = `<div class="odvo-grid2">${common}</div>${field(L4('Texte', 'Text', 'Text', 'Texto'), `<textarea name="texte" rows="4">${esc(e.texte)}</textarea>`, true)}`;
    else body = `<div class="odvo-grid2">
        ${field(L4('Libellé', 'Label', 'Bezeichnung', 'Etiqueta'), `<input name="libelle" value="${esc(e.libelle)}">`)}
        ${e.type === 'controle' ? field(L4('Position', 'Position', 'Position', 'Posición'), `<input name="position" value="${esc(e.position || '')}" placeholder="LFOA_TWR">`) : ''}
        ${common}${colors}${etat}</div>
      <fieldset class="odvo-crew"><legend>${esc(t(L4('Équipage', 'Crew', 'Besatzung', 'Tripulación')))}</legend>${S.members.map(m => `<label><input type="checkbox" name="eq" value="${esc(m.tri)}"${e.equipage.includes(m.tri) ? ' checked' : ''}> ${esc(m.tri)}</label>`).join('')}</fieldset>
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
    // indicatif saisi : proposer la mission de l'affectation (même indicatif, ce jour-là)
    d.querySelector('[name=indicatif]')?.addEventListener('change', async ev => {
      const box = d.querySelector('[name=mission]');
      if (box.value || !REP()?.missionFor) return;
      const m = await REP().missionFor({
        indicatif: ev.target.value,
        date: e.date
      }).catch(() => '');
      if (m) box.value = m;
    });
  }
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
        e.mission = String(g('mission') || '').trim() || null;
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
          pilote: g(`p${i}`) || null,
          nav: g(`n${i}`) || null,
          annule: !!g(`x${i}`)
        })).filter((a, i) => i === 0 || a.pilote || a.nav);
        e.taches = String(g('taches') || '').split('\n').map(l => l.split('=')).filter(([n]) => n?.trim()).map(([n, p]) => ({
          nom: n.trim(),
          pilote: (p || '').trim().toUpperCase() || null
        }));
        const rv = g('rvVol');
        const tank = doc.elements.find(x => x.id === rv);
        e.ravitaillements = rv ? [{
          vol: rv,
          heure: g('rvHeure') || e.debut,
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
      } else if (e.type !== 'note') e.equipage = f.getAll('eq');
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
        ...element
      } = e;
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
  async function assignMission(e) {
    const m = (window.MissionIndex?.all?.() || []).find(x => x.id === e.mission);
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
    const crew = e.avions.flatMap(a => [a.pilote]).filter(Boolean);
    const dlg = await window.AssignDialog.open(m, y, {
      maps: m.images || [],
      pilots: crew,
      takeoff: Date.parse(`${e.date}T${e.debut}:00Z`)
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
      return `<td data-cell="${esc(m.tri)}|${esc(d)}" title="${esc(o.map(e => `${e.debut}z ${e.libelle || e.type}`).join('\n'))}">${dispoBar(S.dispos[m.tri]?.[d] ?? (S.dispos[m.tri] ? [] : null), 0, 1440)}${o.length ? `<span class="odvo-occ">${o.length}</span>` : ''}</td>`;
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
      if (/odv\/|disponibilites\/|affectations/.test(p) && !S.timer) load(S.week, {
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
