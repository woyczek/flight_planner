(() => {
  'use strict';
  // Ordres de vols (docs/technique/ODV_ORDRES.md) : données et règles, sans interface.
  //   · réglages partagés data/config/odv.json (terrain, réseau par défaut, délai des CR, heures de service, personnel,
  //     modèles de plaquettes, couleurs des indicatifs, repli LL, récurrences) ; sans fichier : DEFAULT_CONFIG ;
  //   · ordre de vol d'une semaine data/odv/<AAAA>-W<nn>.json { schema: 1, va, semaine, updated_at, by, permanence,
  //     elements: [{ id, type: vol | divers | controle | note, date, debut "HH:MM" (UTC), duree (min), … }] } ; semaine
  //     absente : semaine vide garnie par les récurrences (écrite à la première modification) ;
  //   · disponibilités : celles de la suite (SuiteDispos, data/disponibilites/<TRI>/<semaine>.json), jamais copiées ;
  //     équipage d'un vol de mission : affectations de la suite (MissionAssignments.index).
  // Règle d'affectation : un membre est affectable à un élément s'il est couvert, sur toute sa durée, par des plages de
  // catégories affectables à ce genre d'élément (SuiteDispos.affectable : vol, controle, divers) et qu'aucune plage d'une
  // autre catégorie ne recoupe ce temps (contrôle, vol hors SOG, sol seulement, récup… l'emportent).
  // API (window.OdvOrders) : DEFAULT_CONFIG, TYPES, ETATS, CR, min(hh:mm), hhmm(min), uid(), loadConfig({ fresh }),
  //   saveConfig(réglages), weekDates(semaine, nbJours), emptyWeek(semaine), recurrencesFor(réglages, semaine),
  //   readWeek(semaine, { fresh, config }), saveWeek(document), normalize(élément), kindOf(élément), crewOf(élément,
  //   affectations), missionCrew(vol, affectations), disposOf(TRI[], semaine, { fresh }), setDispos(TRI, semaine, date,
  //   plages), memberState(plages, genre, début, fin), conflicts(document, { dispos, affectations }), prepReady(élément,
  //   { dispos, affectations }), together(date, TRI[], dispos, { genre, min }), tranches(), colorFor(indicatif, réglages),
  //   stats(document, { dispos, affectations, config }).
  if (window.OdvOrders) return;
  const A = () => window.MissionAssignments,
    D = () => window.SuiteDispos;
  const CONFIG = 'config/odv.json',
    fileOf = week => `odv/${week}.json`;
  const VA = () => window.RepositoryNav?.va?.().short || 'SOG',
    by = () => window.SuiteUsers?.by?.() || A()?.trigram?.() || 'CPCO';
  const clone = o => JSON.parse(JSON.stringify(o));
  const pad = n => String(n).padStart(2, '0');
  const TYPES = ['vol', 'divers', 'controle', 'note'],
    ETATS = ['prevu', 'fait', 'non_fait', 'annule'],
    CR = ['ME', 'BACHE', 'MNE'];
  const day = (h, m = 0) => ({
    debut: `${pad(h)}:${pad(m)}`,
    fin: '23:00'
  });
  const DEFAULT_CONFIG = {
    schema: 1,
    terrain: '',
    reseau: 'IVAO',
    crDelaiHeures: 48,
    nbJours: 7,
    jours: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(d => [d, day(6)])),
    personnel: {},
    modeles: {
      vols: [
        { id: 'blue', libelle: 'BLUE', duree: 105, couleur: '#1a5898', fond: '#1a5898', parIndicatif: false },
        { id: 'red', libelle: 'RED', duree: 105, couleur: '#9a3010', fond: '#9a3010', parIndicatif: false },
        { id: 'indicatif', libelle: 'INDICATIF', duree: 105, couleur: '#64748b', fond: null, parIndicatif: true }
      ],
      divers: [
        { id: 'cours', libelle: 'COURS AU SOL', duree: 60, couleur: '#8a6010', fond: null },
        { id: 'reunion', libelle: 'RÉUNION', duree: 60, couleur: '#787808', fond: null }
      ],
      controle: [{ id: 'controle', libelle: 'CONTRÔLE', duree: 120, couleur: '#7300ff', fond: '#7300ff' }]
    },
    indicatifs: {},
    // configurations d'avion affichées sur la plaquette (KNON : canon chargé, TALIOS : pod de désignation…)
    configs: [{
      texte: 'KNON',
      couleur: '#9a3010'
    }, {
      texte: 'TALIOS',
      couleur: '#1a5898'
    }],
    ll: [],
    recurrences: []
  };

  // ---- heures (UTC) : « HH:MM » ↔ minutes depuis minuit ; « 24:00 » = 1440
  const min = s => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? ''));
    return m ? Math.min(1440, +m[1] * 60 + +m[2]) : null;
  };
  const hhmm = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---- réglages partagés
  let cfg = null;
  async function loadConfig({
    fresh = false
  } = {}) {
    if (cfg && !fresh) return cfg;
    const v = await A()?.readData?.(CONFIG, {
      fresh
    }).catch(() => null);
    const d = clone(DEFAULT_CONFIG);
    cfg = v ? {
      ...d,
      ...v,
      jours: {
        ...d.jours,
        ...(v.jours || {})
      },
      modeles: {
        ...d.modeles,
        ...(v.modeles || {})
      }
    } : d;
    return cfg;
  }
  /** Enregistre les réglages (datés, signés) ; retour de writeData ({ where, error }). */
  async function saveConfig(next) {
    const doc = {
      ...next,
      schema: 1,
      va: VA(),
      updated_at: new Date().toISOString(),
      by: by()
    };
    const r = await A().writeData(CONFIG, doc);
    cfg = doc;
    window.dispatchEvent(new CustomEvent('odv-orders-config', {
      detail: doc
    }));
    return r;
  }

  // ---- semaine
  /** Dates « AAAA-MM-JJ » des nbJours premiers jours de la semaine ISO (lundi d'abord). */
  function weekDates(week, n = 7) {
    const mon = D()?.weekMonday?.(week);
    if (!Number.isFinite(mon)) return [];
    return Array.from({
      length: Math.max(1, Math.min(7, n))
    }, (_, i) => new Date(mon + i * 864e5).toISOString().slice(0, 10));
  }
  const emptyWeek = week => ({
    schema: 1,
    va: VA(),
    semaine: week,
    permanence: '',
    elements: []
  });
  /** Éléments que les récurrences posent sur une semaine (jamais avant leur date de début, ni après leur fin). */
  function recurrencesFor(conf, week) {
    const dates = weekDates(week, conf?.nbJours || 7),
      out = [];
    const mon = D()?.weekMonday?.(week);
    for (const r of conf?.recurrences || []) {
      if (!r?.element || !r.debut) continue;
      const wanted = r.rythme === 'quotidien' ? dates.map((_, i) => i + 1) : [+r.jour];
      if (r.rythme === 'bimensuel') {
        // une semaine sur deux à partir de la semaine de début
        const start = D()?.weekMonday?.(D()?.weekId?.(Date.parse(`${r.debut}T12:00:00Z`)));
        if (!Number.isFinite(start) || Math.round((mon - start) / 6048e5) % 2) continue;
      }
      for (const j of wanted) {
        const date = dates[j - 1];
        if (!date || date < r.debut || (r.fin && date > r.fin)) continue;
        out.push(normalize({
          ...clone(r.element),
          id: uid(),
          date,
          recurrence: r.id
        }));
      }
    }
    return out;
  }
  /** Ordre de vol d'une semaine ; absent : semaine vide garnie par les récurrences, marquée nouvelle (_nouveau). */
  async function readWeek(week, {
    fresh = false,
    config = null
  } = {}) {
    const conf = config || await loadConfig();
    const v = await A()?.readData?.(fileOf(week), {
      fresh
    }).catch(() => null);
    if (v && Array.isArray(v.elements)) return {
      ...emptyWeek(week),
      ...v,
      elements: v.elements.map(normalize)
    };
    return {
      ...emptyWeek(week),
      elements: recurrencesFor(conf, week),
      _nouveau: true
    };
  }
  /** Enregistre l'ordre de vol (daté, signé ; éléments triés par date et heure) ; retour de writeData. */
  async function saveWeek(doc) {
    const {
      _nouveau,
      ...rest
    } = doc;
    const out = {
      ...rest,
      schema: 1,
      va: VA(),
      updated_at: new Date().toISOString(),
      by: by(),
      elements: [...(doc.elements || [])].map(normalize).sort((a, b) => `${a.date} ${a.debut}`.localeCompare(`${b.date} ${b.debut}`))
    };
    const r = await A().writeData(fileOf(doc.semaine), out);
    window.dispatchEvent(new CustomEvent('odv-orders-week', {
      detail: out
    }));
    return {
      ...r,
      doc: out
    };
  }

  // ---- éléments
  /** Élément complété de ses champs par défaut ; ne passe pas minuit. */
  function normalize(e) {
    const t = TYPES.includes(e?.type) ? e.type : 'note';
    const base = {
      id: e?.id || uid(),
      type: t,
      date: e?.date || '',
      debut: min(e?.debut) != null ? hhmm(min(e.debut)) : '08:00',
      duree: Math.max(5, Math.round(+e?.duree || 60))
    };
    base.duree = Math.min(base.duree, 1440 - min(base.debut));
    if (t === 'vol') return {
      ...base,
      mission: e.mission || null,
      equipe: e.equipe || null,
      libelle: e.libelle || '',
      indicatif: e.indicatif || '',
      reseau: e.reseau || null,
      couleur: e.couleur || '#64748b',
      fond: e.fond ?? null,
      avions: (Array.isArray(e.avions) && e.avions.length ? e.avions : [{}]).slice(0, 8).map(a => ({
        pilote: a?.pilote || null,
        nav: a?.nav || null,
        annule: !!a?.annule,
        config: (Array.isArray(a?.config) ? a.config : []).map(x => String(x).trim().toUpperCase()).filter(Boolean)
      })),
      taches: (e.taches || []).map(x => ({
        nom: x?.nom || '',
        pilote: x?.pilote || null
      })),
      zones: (e.zones || []).slice(0, 5).map(z => typeof z === 'string' ? {
        id: '',
        nom: z
      } : {
        id: z?.id || '',
        nom: z?.nom || ''
      }),
      axe: e.axe || null,
      offload: e.offload ?? null,
      ravitaillements: (e.ravitaillements || []).map(x => ({
        vol: x?.vol || null,
        heure: x?.heure || null,
        offload: x?.offload ?? null
      })),
      infos: e.infos || '',
      ...training(e),
      etat: ETATS.includes(e.etat) ? e.etat : 'prevu',
      cr: CR.includes(e.cr) ? e.cr : null,
      partiel: !!e.partiel,
      causes: Array.isArray(e.causes) ? e.causes : [],
      motif: e.motif || '',
      recurrence: e.recurrence || null
    };
    if (t === 'divers' || t === 'controle') return {
      ...base,
      libelle: e.libelle || '',
      ...(t === 'controle' ? {
        position: e.position || ''
      } : {
        notes: e.notes || ''
      }),
      couleur: e.couleur || (t === 'controle' ? '#7300ff' : '#8a6010'),
      fond: e.fond ?? null,
      equipage: [...new Set((e.equipage || []).filter(Boolean))],
      ...training(e),
      etat: ETATS.includes(e.etat) ? e.etat : 'prevu',
      motif: e.motif || '',
      recurrence: e.recurrence || null
    };
    return {
      ...base,
      texte: String(e?.texte || '')
    };
  }
  /** Entraînement d'un élément : PTA (principal training audience : membres que l'élément entraîne en priorité, entourés
   *  sur l'ordre) et DLO (desired learning objectives : objectifs de chaque membre sur cet élément, { TRI → texte }). */
  function training(e) {
    const tri = x => String(x || '').trim().toUpperCase();
    return {
      pta: [...new Set((e?.pta || []).map(tri).filter(Boolean))],
      dlo: Object.fromEntries(Object.entries(e?.dlo || {}).map(([k, v]) => [tri(k), String(v || '').trim()]).filter(([k, v]) => k && v))
    };
  }
  /** Genre d'affectation d'un élément (SuiteDispos.affectable) ; null pour une note. */
  const kindOf = e => ({
    vol: 'vol',
    divers: 'divers',
    controle: 'controle'
  })[e?.type] || null;
  /** Affectations d'un vol de mission : même mission, décollage le jour du vol. */
  function missionCrew(vol, affectations = []) {
    if (!vol?.mission) return [];
    return affectations.filter(a => a.mission === vol.mission && String(a.takeoff || '').slice(0, 10) === vol.date);
  }
  /** Membres d'un élément (trigrammes, doublons gardés : un doublon est un conflit) ; vol de mission : affectations s'il
   *  y en a, sinon les avions saisis ; avions annulés exclus. */
  function crewOf(e, affectations = null) {
    if (e?.type === 'vol') {
      const aff = affectations ? missionCrew(e, affectations) : [];
      const planes = aff.length ? aff.map(a => a.pilot) : (e.avions || []).filter(a => !a.annule).flatMap(a => [a.pilote, a.nav]);
      return [...planes, ...(e.taches || []).map(x => x.pilote)].filter(Boolean).map(x => String(x).toUpperCase());
    }
    if (e?.type === 'divers' || e?.type === 'controle') return (e.equipage || []).map(x => String(x).toUpperCase());
    return [];
  }

  // ---- disponibilités (celles de la suite)
  /** Plages déclarées par membre pour une semaine : { TRI → { date → [{ debut, fin, categorie }] } } ; semaine non
   *  déclarée : absent. */
  async function disposOf(tris, week, {
    fresh = false
  } = {}) {
    const out = {};
    await Promise.all([...new Set(tris)].map(async tri => {
      const w = await D()?.readPilot?.(tri, {
        weeks: [week],
        fresh
      }).catch(() => null);
      if (w?.[week]) out[tri] = w[week].dispos || {};
    }));
    return out;
  }
  /** Remplace les plages d'un jour dans la déclaration d'un membre (appareils et simulateurs gardés). */
  async function setDispos(tri, week, date, plages) {
    const w = await D().readPilot(tri, {
      weeks: [week],
      fresh: true
    });
    const doc = w?.[week] || {};
    const dispos = {
      ...(doc.dispos || {}),
      [date]: plages
    };
    return D().saveWeek(tri, week, dispos, {
      appareils: doc.appareils,
      simulateurs: doc.simulateurs
    });
  }
  const span = x => [x.debut ? min(x.debut) : 0, x.fin ? min(x.fin) : 1440];
  /** État d'un membre sur [début, fin[ (minutes) d'après ses plages du jour : { ok, raison: non_declare | non_couvert |
   *  non_affectable,
   *  categorie } ; plages null : semaine non déclarée. */
  function memberState(plages, kind, s, e) {
    if (!plages) return {
      ok: false,
      raison: 'non_declare'
    };
    const aff = id => D()?.affectable?.(id) || [];
    let block = null;
    const good = [];
    for (const x of plages) {
      const [a, b] = span(x);
      if (b <= s || a >= e) continue;
      if (aff(x.categorie).includes(kind)) good.push([a, b]);
      else block ||= x.categorie;
    }
    if (block) return {
      ok: false,
      raison: 'non_affectable',
      categorie: block
    };
    good.sort((p, q) => p[0] - q[0]);
    let t = s;
    for (const [a, b] of good) {
      if (a > t) break;
      t = Math.max(t, b);
      if (t >= e) break;
    }
    return t >= e ? {
      ok: true
    } : {
      ok: false,
      raison: 'non_couvert'
    };
  }
  const range = e => [min(e.debut), min(e.debut) + e.duree];
  /** Conflits de l'ordre de vol : Map id → [{ code: non_declare (semaine non déclarée) | non_couvert (pas de plage
   *  affectable sur toute la durée) | non_affectable (plage d'une catégorie non affectable) | chevauchement | doublon, tri,
   *  categorie?, avec? }] ; éléments annulés et notes ignorés. Les zones (OdvAirspace.check) sont vérifiées par la page. */
  function conflicts(doc, {
    dispos = {},
    affectations = []
  } = {}) {
    const out = new Map();
    const add = (id, c) => (out.get(id) || out.set(id, []).get(id)).push(c);
    const live = (doc?.elements || []).filter(e => kindOf(e) && e.etat !== 'annule');
    const busy = []; // [tri, date, début, fin, id]
    for (const e of live) {
      const crew = crewOf(e, affectations),
        [s, f] = range(e);
      const seen = new Set();
      for (const tri of crew) {
        if (seen.has(tri)) {
          add(e.id, {
            code: 'doublon',
            tri
          });
          continue;
        }
        seen.add(tri);
        const st = memberState(dispos[tri] ? dispos[tri][e.date] || [] : null, kindOf(e), s, f);
        if (!st.ok) add(e.id, {
          code: st.raison,
          tri,
          categorie: st.categorie
        });
        busy.push([tri, e.date, s, f, e.id]);
      }
    }
    for (let i = 0; i < busy.length; i++)
      for (let j = i + 1; j < busy.length; j++) {
        const [t1, d1, s1, f1, a] = busy[i],
          [t2, d2, s2, f2, b] = busy[j];
        if (t1 !== t2 || d1 !== d2 || a === b || f1 <= s2 || f2 <= s1) continue;
        add(a, {
          code: 'chevauchement',
          tri: t1,
          avec: b
        });
        add(b, {
          code: 'chevauchement',
          tri: t1,
          avec: a
        });
      }
    return out;
  }
  /** Préparation possible (badge P) : au moins un membre affectable à l'élément dans l'heure et demie qui précède. */
  function prepReady(e, {
    dispos = {},
    affectations = []
  } = {}) {
    const s = min(e.debut);
    if (s < 90 || !kindOf(e)) return false;
    return crewOf(e, affectations).some(tri => memberState(dispos[tri] ? dispos[tri][e.date] || [] : null, kindOf(e), s - 90, s).ok);
  }
  /** Plages du jour (pas de 15 min) où au moins min membres sont affectables : [{ debut, fin, membres }]. */
  function together(date, tris, dispos, {
    kind = 'vol',
    min: atLeast = 2
  } = {}) {
    const out = [];
    let cur = null;
    for (let t = 0; t < 1440; t += 15) {
      const who = tris.filter(tri => dispos[tri] && memberState(dispos[tri][date] || [], kind, t, t + 15).ok);
      const key = who.length >= atLeast ? who.join(' ') : '';
      if (cur && cur.key === key) cur.fin = t + 15;
      else {
        if (cur?.key) out.push(cur);
        cur = {
          key,
          debut: t,
          fin: t + 15,
          membres: who
        };
      }
    }
    if (cur?.key) out.push(cur);
    return out.map(({
      debut,
      fin,
      membres
    }) => ({
      debut: hhmm(debut),
      fin: hhmm(fin),
      membres
    }));
  }
  /** Trois tranches matin, après-midi, soir (heures z) : réglages du Planning ODV (odvPlanning:v1), sinon 08-12, 12-18,
   *  18-23. */
  function tranches() {
    const h = window.OdvSettings?.load?.().hours || window.OdvCore?.DEFAULTS?.hours || [
      [8, 12],
      [12, 18],
      [18, 23]
    ];
    return h.map(([a, b], i) => ({
      id: ['matin', 'apres_midi', 'soir'][i],
      debut: hhmm(a * 60),
      fin: hhmm(Math.min(24, b) * 60)
    }));
  }
  /** Couleurs de plaquette d'un indicatif : préfixe le plus long de config.indicatifs contenu dans l'indicatif. */
  function colorFor(indicatif, conf = cfg) {
    const s = String(indicatif || '').toUpperCase();
    let best = null;
    for (const [p, c] of Object.entries(conf?.indicatifs || {}))
      if (p && s.includes(p.toUpperCase()) && (!best || p.length > best[0].length)) best = [p, c];
    return best ? best[1] : null;
  }
  /** Chiffres de la semaine : vols, durée, états, CR ; par membre : minutes disponibles (heures de service), minutes de
   *  vol, charge. */
  function stats(doc, {
    dispos = {},
    affectations = [],
    config = cfg || DEFAULT_CONFIG
  } = {}) {
    const vols = (doc?.elements || []).filter(e => e.type === 'vol');
    const live = vols.filter(e => e.etat !== 'annule');
    const cnt = (l, f) => l.filter(f).length;
    const membres = {};
    for (const [tri, days] of Object.entries(dispos)) {
      let dispo = 0;
      for (const [date, plages] of Object.entries(days)) {
        const j = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7 + 1,
          h = config?.jours?.[j] || {};
        const s0 = min(h.debut) ?? 0,
          e0 = min(h.fin) ?? 1440;
        for (let t = s0; t < e0; t += 15)
          if (memberState(plages, 'vol', t, t + 15).ok) dispo += 15;
      }
      membres[tri] = {
        dispo,
        vol: 0
      };
    }
    for (const e of live)
      for (const tri of new Set(crewOf(e, affectations))) (membres[tri] ||= {
        dispo: 0,
        vol: 0
      }).vol += e.duree;
    for (const m of Object.values(membres)) m.charge = m.dispo ? m.vol / m.dispo : (m.vol ? Infinity : 0);
    return {
      vols: live.length,
      duree: live.reduce((n, e) => n + e.duree, 0),
      faits: cnt(vols, e => e.etat === 'fait'),
      nonFaits: cnt(vols, e => e.etat === 'non_fait'),
      annules: cnt(vols, e => e.etat === 'annule'),
      aar: cnt(live, e => e.axe || e.ravitaillements.length),
      ME: cnt(vols, e => e.cr === 'ME'),
      BACHE: cnt(vols, e => e.cr === 'BACHE'),
      MNE: cnt(vols, e => e.cr === 'MNE'),
      membres
    };
  }

  window.OdvOrders = {
    DEFAULT_CONFIG,
    TYPES,
    ETATS,
    CR,
    min,
    hhmm,
    uid,
    loadConfig,
    saveConfig,
    weekDates,
    emptyWeek,
    recurrencesFor,
    readWeek,
    saveWeek,
    normalize,
    kindOf,
    crewOf,
    missionCrew,
    disposOf,
    setDispos,
    memberState,
    conflicts,
    prepReady,
    together,
    tranches,
    colorFor,
    stats
  };
})();
