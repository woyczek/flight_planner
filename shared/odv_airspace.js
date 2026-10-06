// Ordres de vols (ODV) : espaces de la base aéronautique (shared/sia_base.js) pour la section « Zones » de la grille.
// Chargé en option par la page des ordres de vols (après sia_base.js) : rien ne casse si ce module ou la base manquent.
// Quatre familles, toutes asynchrones (window.OdvAirspace) :
//  1. RTBA (et toute zone) activé par réseau, avec ses plages : aucun flux public (IVAO : demandes sous connexion,
//     https://www.ivao.fr/fr/so/special_areas/activations/requests) → activations saisies à la main, une par zone,
//     réseau et plage, dans data/atc/activations/<AAAA>-W<nn>.json (pool synchronisé, MissionAssignments) :
//       activations(semaine) → [{ id, zone (id de la base), nom, reseau "VATSIM" | "IVAO", etat "active" | "demandee"
//                                 | "refusee", date "AAAA-MM-JJ", debut "HH:MM", fin "HH:MM" (UTC), texte, by }]
//       saveActivations(semaine, liste) → retour de writeData ({ where, error })
//       importIvao(semaine) → { ajoutees, total, error } : zones spéciales IVAO de France actives dans la semaine (par le
//                            lanceur, tools/launch.py /__setup/ivao-activations : NOTAM de la division liés à une zone,
//                            horaires publiés — RTBA « DIRCAM 3050 ») ; remplacent les activations IVAO importées avant
//                            (source « ivao »), les saisies à la main restent
//       rtba(date, { ll }) → activations du jour [{ zone, nom, reseau, etat, creneaux: [{ debut, fin }], rtba }], plus
//                            le repli ll de data/odv/config.json ([{ nom, debut, fin, jours: [1..7], sia? }], reseau null)
//  2. Zones requises par une mission (MissionAirspaces : route probable et zones de travail) et leur état :
//       missionZones(ref) → { mission, zones: [{ id, nom, type, plancher, plafond, act, admin, ou: [texte] }] } ;
//                            ref = affectation ({ mission, folder, files }) ou yaml de mission déjà lu
//       check(zones, { date, debut, duree | fin, reseau }, activations?) → zones + { etat "active" | "demandee"
//                            | "absente" | "interdite", conflit: bool } (zone P : interdite ; R, D, TRA, RTBA… : conflit
//                            sans activation « active » du réseau couvrant le vol)
//  3. Contrôle ouvert : atcOpen(date, { live }) → [{ position, reseau, source "en_ligne" | "reservation", type, debut,
//     fin, icao, espaces: [noms] }] : réservations (shared/atc_sessions.js, data/atc/<semaine>.json) et, le jour même,
//     positions en ligne (flux publics VATSIM data v3, IVAO whazzup) ; périmètre réglé (SuiteAtc.inPerimeter : pays préféré)
//  4. Zones en conflit : conflicts(date) → examens et trainings du jour, avec les CTR / TMA de leur terrain
// Repli et utilitaires : zones(date, { ll }) (espaces activables de la base, plaquettes saisies à la main),
// aarTracks() (axes ENR 5.7), zonesToAvoid(dep, arr) (CTR / TMA des terrains), match(nom) (id de base d'un nom local).
// Base absente, ou zone France inactive (Paramètres › Maintenance › Données aéronautiques) : { missing, raison, url }.
(() => {
  'use strict';
  if (window.OdvAirspace) return;
  const SCRIPT = document.currentScript?.src || location.href;
  // espaces activables (R, D, zones temporaires, militaires d'ailleurs) ; les zones du RTBA sont repérées par azba
  const TYPES = new Set(['R', 'D', 'TRA', 'TSA', 'MOA', 'W', 'A']);
  const NETWORKS = ['VATSIM', 'IVAO'];
  const ETATS = ['active', 'demandee', 'refusee'];
  const settingsUrl = () => window.RepositoryNav?.settingsUrl?.('sia', 'mt-aero-base') || new URL('../apps/settings/maintenance.html?m=sia#mt-aero-base', SCRIPT).href;
  const missing = raison => ({
    missing: true,
    raison,
    url: settingsUrl()
  });
  const loadScript = src => new Promise(res => {
    const sc = document.createElement('script');
    sc.src = new URL(src, SCRIPT).href;
    sc.onload = () => res(true);
    sc.onerror = () => res(false);
    document.head.append(sc);
  });
  const need = async (name, src) => window[name] || (await loadScript(src), window[name]);

  // ---- base, lue une fois, relue si elle change (relecture ici ou dans un autre onglet : siaBaseInfo:v1)
  let baseLoad = null;
  const base = () => baseLoad ||= (async () => {
    try {
      return await window.SiaBase?.get?.({
        any: true
      }) || null;
    } catch {
      return null;
    }
  })();
  window.addEventListener('storage', e => {
    if (e.key === 'siaBaseInfo:v1') baseLoad = null;
  });
  /** Base utilisable pour la France (RTBA, axes ENR 5.7), ou { missing }. */
  async function frBase() {
    const b = await base();
    if (!b) return missing('base');
    const zones = b.sources?.zones;
    if (Array.isArray(zones) && !zones.includes('fr')) return missing('zone-fr');
    return b;
  }

  const norm = s => String(s || '').toUpperCase().replace(/^LF[-\s]*/, '').replace(/[^A-Z0-9]/g, '');
  /** Id (clé AIXM) de l'espace qui porte ce nom local : clé ou nom exacts, puis forme réduite (« T43 » ↔ « LF-T43 »). */
  function matchIn(list, nom) {
    const n = String(nom || '').trim().toUpperCase();
    if (!n) return '';
    const exact = list.find(a => String(a.key || '').toUpperCase() === n || String(a.name || '').toUpperCase() === n);
    if (exact) return exact.key || exact.name;
    const r = norm(n),
      near = list.find(a => norm(a.key) === r || norm(a.name) === r);
    return near ? near.key || near.name : '';
  }
  const activables = b => {
    const seen = new Set;
    return (b.airspaces || []).filter(a => {
      if (!(a.azba || TYPES.has(a.type))) return false;
      const k = a.key || a.name;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const zoneOf = a => ({
    id: a.key || a.name,
    nom: a.name || a.key,
    type: a.azba ? 'RTBA' : a.type,
    act: a.act || (a.azba ? 'AZBA' : ''),
    info: a.info || '',
    admin: a.admin || '',
    plancher: a.lower || '',
    plafond: a.upper || '',
    azba: !!a.azba
  });
  /** Jour ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
  const isoDay = d => {
    const w = new Date(`${d}T12:00:00Z`).getUTCDay();
    return w === 0 ? 7 : w;
  };
  const pad = n => String(n).padStart(2, '0');
  const minutes = hm => {
    const [h, m] = String(hm || '').split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (m || 0) : null;
  };
  const hhmm = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const weekOf = date => window.SuiteAtc?.weekId?.(Date.parse(`${date}T12:00:00Z`)) || window.SuiteDispos?.weekId?.(Date.parse(`${date}T12:00:00Z`)) || '';
  /** Créneaux du repli ll pour un jour : Map id de base → [{ debut, fin }]. */
  function llSlots(list, ll, date) {
    const day = date ? isoDay(date) : 0,
      slots = new Map;
    for (const s of ll || []) {
      if (day && Array.isArray(s.jours) && s.jours.length && !s.jours.includes(day)) continue;
      const id = s.sia || matchIn(list, s.nom);
      if (!id) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id).push({
        debut: s.debut,
        fin: s.fin
      });
    }
    return slots;
  }

  // ===== 1. activations par réseau (saisies), RTBA du jour
  const activationsFile = week => `atc/activations/${week}.json`;
  async function activations(week) {
    const d = await window.MissionAssignments?.readData?.(activationsFile(week)).catch(() => null);
    return Array.isArray(d?.activations) ? d.activations : [];
  }
  function saveActivations(week, list) {
    const A = window.MissionAssignments;
    if (!A?.writeData) return Promise.resolve({
      error: 'MissionAssignments absent'
    });
    const clean = (list || []).filter(x => x && x.zone && x.date).map(x => ({
      id: x.id || `${x.zone}-${x.reseau || ''}-${x.date}-${x.debut || ''}`,
      zone: String(x.zone),
      nom: String(x.nom || x.zone),
      reseau: NETWORKS.includes(x.reseau) ? x.reseau : null,
      etat: ETATS.includes(x.etat) ? x.etat : 'demandee',
      date: x.date,
      debut: x.debut || '00:00',
      fin: x.fin || '24:00',
      texte: String(x.texte || ''),
      source: x.source === 'ivao' ? 'ivao' : 'saisie',
      by: x.by || window.SuiteUsers?.by?.() || ''
    })).sort((a, b) => `${a.date} ${a.debut} ${a.zone}`.localeCompare(`${b.date} ${b.debut} ${b.zone}`));
    return A.writeData(activationsFile(week), {
      schema: 1,
      va: window.RepositoryNav?.va?.().short || 'SOG',
      semaine: week,
      updated_at: new Date().toISOString(),
      by: window.SuiteUsers?.by?.() || '',
      activations: clean
    });
  }
  /** Activations IVAO de la semaine par le lanceur, rapprochées des zones de la base (nom « LF R 45 N2 » → id). */
  async function fetchIvao(week) {
    const days = [];
    const wm = /^(\d{4})-W(\d{2})$/.exec(String(week || '')),
      jan4 = wm ? Date.UTC(+wm[1], 0, 4) : NaN,
      m0 = wm ? jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 864e5 + (+wm[2] - 1) * 6048e5 : NaN;
    if (!Number.isFinite(m0)) return {
      error: 'semaine ?'
    };
    for (let i = 0; i < 7; i++) days.push(new Date(m0 + i * 864e5).toISOString().slice(0, 10));
    let r;
    try {
      r = await (await fetch(new URL(`../__setup/ivao-activations?from=${days[0]}&to=${days[6]}`, SCRIPT).href, {
        headers: {
          'X-SOG-Setup': '1'
        },
        cache: 'no-store'
      })).json();
    } catch {
      return {
        error: 'lanceur absent (tools/launch.py)'
      };
    }
    if (!Array.isArray(r?.activations)) return {
      error: r?.error || 'réponse IVAO illisible'
    };
    const b = await base(),
      list = b ? activables(b) : [];
    return {
      activations: r.activations.map(a => ({
        zone: matchIn(list, a.zone) || a.zone,
        nom: a.zone,
        reseau: 'IVAO',
        etat: 'active',
        date: a.date,
        debut: a.debut,
        fin: a.fin,
        texte: `${a.source === 'notam' ? 'NOTAM IVAO' : 'horaire IVAO'}${a.texte ? ' — ' + a.texte : ''}`.slice(0, 240),
        source: 'ivao'
      }))
    };
  }
  async function importIvao(week) {
    const r = await fetchIvao(week);
    if (r.error) return r;
    const keep = (await activations(week)).filter(x => x.source !== 'ivao'),
      w = await saveActivations(week, [...keep, ...r.activations]);
    return {
      ajoutees: r.activations.length,
      total: keep.length + r.activations.length,
      // gardées dans ce navigateur (where « local ») : enregistrées quand même, alerte donnée par writeData
      error: w?.where === 'local' ? '' : String(w?.error?.message || w?.error || ''),
      where: w?.where || ''
    };
  }
  async function rtba(date, {
    ll = []
  } = {}) {
    const b = await frBase();
    if (b.missing) return b;
    const list = activables(b),
      byId = new Map(list.map(a => [a.key || a.name, a]));
    const out = [];
    const groups = new Map;
    for (const x of (await activations(weekOf(date))).filter(x => x.date === date)) {
      const k = `${x.zone}|${x.reseau}|${x.etat}`;
      if (!groups.has(k)) groups.set(k, {
        zone: x.zone,
        nom: byId.get(x.zone)?.name || x.nom || x.zone,
        reseau: x.reseau,
        etat: x.etat,
        creneaux: [],
        rtba: !!byId.get(x.zone)?.azba,
        source: 'saisie'
      });
      groups.get(k).creneaux.push({
        debut: x.debut,
        fin: x.fin
      });
    }
    out.push(...groups.values());
    for (const [id, creneaux] of llSlots(list, ll, date)) out.push({
      zone: id,
      nom: byId.get(id)?.name || id,
      reseau: null,
      etat: 'active',
      creneaux,
      rtba: !!byId.get(id)?.azba,
      source: 'config'
    });
    return out;
  }

  // ===== 2. zones requises par une mission, état d'activation
  async function missionYaml(ref) {
    if (ref && typeof ref === 'object' && (ref.mission?.id || ref.aircraft || ref.zones) && !ref.folder) return ref;
    const A = window.MissionAssignments;
    if (!ref?.mission || !ref?.folder || !A?.missionFirst) return null;
    const yl = await need('jsyaml', 'mission_core/vendor/js-yaml.min.js');
    if (!yl) return null;
    const id = String(ref.mission),
      bare = id.replace('-', '');
    const f = await A.missionFirst(ref.folder, [ref.files?.yaml, `mission${id}.yaml`, `mission${bare}.yaml`]);
    try {
      return f ? yl.load(f.value.replace(/^#.*\n/, '')) : null;
    } catch {
      return null;
    }
  }
  async function missionZones(ref) {
    const b = await base();
    if (!b) return missing('base');
    const y = await missionYaml(ref);
    if (!y) return {
      mission: String(ref?.mission || ''),
      zones: [],
      note: 'mission introuvable (dossier des missions non autorisé ?)'
    };
    await need('MissionEstimate', 'mission_estimate.js');
    const X = await need('MissionAirspaces', 'mission_airspaces.js');
    if (!X) return {
      mission: String(y.mission?.id || ''),
      zones: [],
      note: 'shared/mission_airspaces.js absent'
    };
    return {
      mission: String(y.mission?.id || ref?.mission || ''),
      zones: X.crossed(y, b.airspaces || []).map(h => ({
        id: h.key,
        nom: h.name,
        type: h.type,
        plancher: h.lower || '',
        plafond: h.upper || '',
        act: h.act || '',
        admin: h.admin || '',
        ou: h.where || []
      }))
    };
  }
  /** État de chaque zone requise pour un vol (date, debut, duree ou fin, reseau) d'après les activations saisies. */
  async function check(zones, {
    date,
    debut,
    duree,
    fin,
    reseau
  } = {}, acts) {
    const list = acts || (date ? (await activations(weekOf(date))).filter(x => x.date === date) : []);
    const t0 = minutes(debut),
      t1 = fin ? minutes(fin) : t0 != null && duree ? t0 + Number(duree) : null;
    const covers = x => t0 == null || (minutes(x.debut) ?? 0) <= t0 && (minutes(x.fin) ?? 1440) >= (t1 ?? t0);
    return (zones || []).map(z => {
      if (z.type === 'P') return {
        ...z,
        etat: 'interdite',
        conflit: true
      };
      const mine = list.filter(x => x.zone === z.id && (!reseau || !x.reseau || x.reseau === reseau));
      const etat = mine.some(x => x.etat === 'active' && covers(x)) ? 'active' : mine.some(x => x.etat === 'demandee') ? 'demandee' : 'absente';
      return {
        ...z,
        etat,
        conflit: etat !== 'active'
      };
    });
  }

  // ===== 3 et 4. contrôle ouvert, examens et trainings (CTR / TMA du terrain de la position)
  /** Espaces d'une position : CTR (DEL, GND, TWR), CTR + TMA (APP, DEP), secteur entier (CTR, FSS). */
  function espacesOf(b, position) {
    const p = String(position || '').toUpperCase(),
      icao = p.slice(0, 4),
      suffix = p.split('_').pop();
    if (/^(CTR|FSS)$/.test(suffix)) return {
      icao,
      espaces: [`secteur ${p.replace(/_(CTR|FSS)$/, '')}`]
    };
    const ad = (b?.aero?.aerodromes || []).find(a => String(a.icao || '').toUpperCase() === icao);
    if (!ad || !window.SiaBase?.inRing) return {
      icao,
      espaces: []
    };
    const types = /^(APP|DEP)$/.test(suffix) ? ['CTR', 'TMA'] : ['CTR'];
    return {
      icao,
      espaces: (b.airspaces || []).filter(a => types.includes(a.type) && (a.rings || []).some(r => window.SiaBase.inRing(r, ad.lat, ad.lon))).map(a => a.name || a.key)
    };
  }
  const metro = pos => window.SuiteAtc?.inPerimeter ? window.SuiteAtc.inPerimeter(pos) : /^LF(?!V)[A-Z]{2}_/.test(String(pos || '').toUpperCase());
  /** Positions en ligne maintenant (flux publics, CORS ouvert) : [{ position, reseau, debut }]. */
  async function online() {
    const out = [];
    const get = url => fetch(url, {
      cache: 'no-store'
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    const [v, i] = await Promise.all([get('https://data.vatsim.net/v3/vatsim-data.json'), get('https://api.ivao.aero/v2/tracker/whazzup')]);
    for (const c of v?.controllers || [])
      if (metro(c.callsign)) out.push({
        position: String(c.callsign).toUpperCase(),
        reseau: 'VATSIM',
        debut: String(c.logon_time || '').slice(11, 16)
      });
    for (const c of i?.clients?.atcs || [])
      if (metro(c.callsign)) out.push({
        position: String(c.callsign).toUpperCase(),
        reseau: 'IVAO',
        debut: String(c.createdAt || c.lastTrack?.timestamp || '').slice(11, 16)
      });
    return out;
  }
  async function sessionsOf(date) {
    const S = window.SuiteAtc || await need('SuiteAtc', 'atc_sessions.js');
    return S ? (await S.read(weekOf(date))).filter(s => s.date === date) : [];
  }
  async function atcOpen(date, {
    live = true
  } = {}) {
    const b = await base();
    const out = (await sessionsOf(date)).map(s => ({
      position: s.position,
      reseau: s.reseau,
      source: 'reservation',
      type: s.type,
      debut: s.debut,
      fin: s.fin,
      ...espacesOf(b, s.position)
    }));
    if (live && date === new Date().toISOString().slice(0, 10))
      for (const o of await online()) out.push({
        ...o,
        source: 'en_ligne',
        type: 'en_ligne',
        fin: '',
        ...espacesOf(b, o.position)
      });
    return out;
  }
  async function conflicts(date) {
    const b = await base();
    return (await sessionsOf(date)).filter(s => s.type === 'examen' || s.type === 'training').map(s => ({
      position: s.position,
      reseau: s.reseau,
      type: s.type,
      debut: s.debut,
      fin: s.fin,
      texte: s.texte || '',
      ...espacesOf(b, s.position)
    }));
  }

  // ===== repli et utilitaires
  async function zones(dateISO, {
    ll = []
  } = {}) {
    const b = await frBase();
    if (b.missing) return b;
    const list = activables(b),
      slots = llSlots(list, ll, dateISO);
    return list.map(a => ({
      ...zoneOf(a),
      creneaux: slots.get(a.key || a.name) || null
    }));
  }
  async function aarTracks() {
    const b = await frBase();
    if (b.missing) return b;
    const T = await need('AarTracks', 'aar_tracks.js');
    if (!T || !b.aarXml) return [];
    return T.parseTrackXml(b.aarXml).filter(t => t.kind === 'track' && t.ip && t.cp).map(t => ({
      id: t.name,
      nom: t.name,
      kind: t.kind,
      heading: t.heading,
      lengthNm: t.lengthNm,
      ip: t.ip,
      cp: t.cp
    }));
  }
  async function zonesToAvoid(dep, arr) {
    const b = await base();
    if (!b) return missing('base');
    const ads = b.aero?.aerodromes || [];
    const one = code => {
      const icao = String(code || '').toUpperCase().trim();
      if (!icao) return null;
      if (!ads.some(a => String(a.icao || '').toUpperCase() === icao)) return {
        icao,
        ctr: [],
        tma: [],
        note: `terrain ${icao} inconnu de la base aéronautique`
      };
      const inside = t => espacesOf({
        ...b,
        airspaces: (b.airspaces || []).filter(a => a.type === t)
      }, `${icao}_APP`).espaces;
      return {
        icao,
        ctr: inside('CTR'),
        tma: inside('TMA')
      };
    };
    return {
      dep: one(dep),
      arr: one(arr)
    };
  }
  async function match(nom) {
    const b = await base();
    return b ? matchIn(activables(b), nom) : '';
  }

  window.OdvAirspace = {
    NETWORKS,
    ETATS,
    activations,
    saveActivations,
    fetchIvao,
    importIvao,
    rtba,
    missionZones,
    check,
    atcOpen,
    conflicts,
    zones,
    aarTracks,
    zonesToAvoid,
    match,
    hhmm
  };
})();
