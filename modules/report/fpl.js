// V3 report — plan de vol déposé, recopié de la V2 (shared/mission_core/fpl.js, routePoints de assist.js) le
// 23/10/2026 : codes d'équipement OACI (cases 10a / 10b), appareil d'un plan, niveau, vitesse ; sources SimBrief (dernier
// OFP), IVAO (vol en cours, whazzup), VATSIM (vol en cours ou prefile) ; application aux champs vides de la mission.
// Seules les globales de la V2 changent : les appels réseau passent par ENV.getJson (ctx.net du module), la base des
// appareils connus par ENV.aircraft (find, canonicalPrefix, lookupType, operatorOfDesignator).
import * as M from './model.js';

const ENV = {
  getJson: async () => {
    throw new Error('offline');
  },
  remember: null,
  aircraft: {
    find: () => null,
    canonicalPrefix: p => String(p ?? '').trim().toUpperCase(),
    lookupType: () => null,
    operatorOfDesignator: () => ''
  }
};
const A = new Proxy({}, {
  get: (_, k) => ENV.aircraft[k]
});
/** Règle l'environnement : getJson (url → objet, lève une erreur sans réponse), aircraft, remember. */
const configure = (o = {}) => Object.assign(ENV, o);
const AIRWAY = /^(?:[A-Z]{1,2}\d{1,4}[A-Z]?|DCT|SID|STAR)$/,
  PROCEDURE = /^[A-Z]{3,6}\d[A-Z]?$/;
// Points d'une route : sans voies aériennes, procédures ni vitesses / niveaux.
const routePoints = route => String(route || '').toUpperCase().split(/\s+/).map(t => t.split('/')[0]).filter(t => t && !AIRWAY.test(
  t) && !PROCEDURE.test(t) && /^[A-Z0-9]{2,11}$/.test(t));
/** Texte en majuscules sans blancs de bord. */
const up = v => String(v ?? '').trim().toUpperCase();
/** Nombre d'une valeur ; null si vide ou invalide. */
const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
/** Valeur ramenée à un tableau (élément seul, ou vide). */
const arr = v => (Array.isArray(v) ? v : v ? [v] : []);

// Case 10a (équipements radio / navigation) et 10b (surveillance) → codes FPL_*.
function equipmentCodes(equip, transponder, rules) {
  const out = new Set(),
    a = up(equip),
    b = up(transponder);
  const items = a.match(/[A-Z]\d?/g) || [];
  items.forEach(code => {
    const c = code[0];
    if (c === 'S') {
      out.add('FPL_VOR_ILS');
    }
    if (c === 'L' || c === 'O') out.add('FPL_VOR_ILS');
    if (c === 'D') out.add('FPL_DME');
    if (c === 'F') out.add('FPL_ADF');
    if (c === 'G') out.add('FPL_GNSS');
    if (c === 'R') out.add('FPL_PBN');
    if (c === 'W') out.add('FPL_RVSM');
    if (c === 'Y') out.add('FPL_833');
    if (c === 'H') out.add('FPL_HF');
    if (c === 'U') out.add('FPL_UHF');
    if (c === 'J') out.add('FPL_CPDLC');
    if (c === 'E') out.add('FPL_ACARS');
    if (c === 'M') out.add('FPL_SATCOM');
  });
  (b.match(/[A-Z]\d?/g) || []).forEach(code => {
    if (/^[EHILPSX]$/.test(code)) out.add('FPL_MODE_S');
    if (/^[BUV][12]$/.test(code)) out.add('FPL_ADSB');
    if (/^[DG]1$/.test(code)) out.add('FPL_ADSC');
  });
  if (/^[IYZ]$/.test(up(rules))) out.add('IFR');
  return [...out];
}
// « A359/H-SDE2E3…/LB1D1 » (VATSIM) ou « -A320/M-SDFG…/LB1 » (texte OACI).
function splitAircraft(text) {
  const m = /([A-Z0-9]{2,4})\/([LMHJ])-([A-Z0-9]+)\/([A-Z0-9]*)/.exec(up(text));
  return m ? {
    type: m[1],
    wake: m[2],
    equip: m[3],
    transponder: m[4]
  } : {
    type: up(text).split('/')[0]
  };
}
/** Valeur d'un indicateur de la case 18 (ex. REG/, OPR/) dans les remarques. */
const remark = (remarks, key) => {
  const m = new RegExp(`(?:^|\\s)${key}/(\\S+)`).exec(up(remarks));
  return m ? m[1] : '';
};
// Niveau : F340 → FL340, A045 → 4500 ft, 33000 (VATSIM) → FL330.
function level(value) {
  const v = up(value);
  let m;
  if ((m = /^F(\d{3})$/.exec(v)) || (m = /^FL(\d{3})$/.exec(v))) return `FL${m[1]}`;
  if ((m = /^A(\d{3})$/.exec(v))) return `${Number(m[1]) * 100} ft`;
  if ((m = /^(\d{3,5})$/.exec(v))) {
    const n = Number(m[1]);
    return n >= 10000 ? `FL${String(Math.round(n / 100)).padStart(3, '0')}` : `${n} ft`;
  }
  return v === 'VFR' ? 'VFR' : v;
}
/** Vitesse de plan de vol en nœuds : N0450 → 450, K0800 → 432 ; sinon valeur numérique. */
const speed = value => {
  const v = up(value);
  let m;
  if ((m = /^N(\d{4})$/.exec(v))) return Number(m[1]);
  if ((m = /^K(\d{4})$/.exec(v))) return Math.round(Number(m[1]) / 1.852);
  return num(v);
};
/** Durée en secondes → « HH:MM ». */
const hhmm = seconds => seconds == null ? '' : `${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`;

// ------------------------------------------------------------------ sources
/** Plan de vol du dernier OFP SimBrief (identifiant numérique ou nom d'utilisateur) : départ, destination, dégagement, route, niveau, vitesse, appareil, équipements, heures. Lève une erreur sans identifiant ou si SimBrief ne répond pas. */
async function fromSimbrief(user) {
  const id = String(user || '').trim();
  if (!id) throw new Error('simbrief-id');
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=1`;
  const d = await ENV.getJson(url);
  if (!d?.origin) throw new Error(d?.fetch?.status || 'SimBrief');
  const text = d.atc?.flightplan_text || '',
    ac = splitAircraft(text),
    g = d.general || {};
  const alternate = arr(d.alternate)[0] || {};
  const fixes = arr(d.navlog?.fix).filter(f => f.ident && !['apt'].includes(f.type) && f.ident !== 'TOC' && f.ident !== 'TOD');
  const unit = /lb/i.test(d.params?.units) ? 'lb' : 'kg';
  /** Aérodrome d'un OFP SimBrief → { icao, name, lat, lon, … } ; null sans code OACI. */
  const port = p => p?.icao_code ? {
    icao: up(p.icao_code),
    name: p.name || '',
    lat: num(p.pos_lat),
    lon: num(p.pos_long),
    elevation: num(p.elevation)
  } : null;
  return {
    source: 'SimBrief',
    callsign: up(d.atc?.callsign || `${g.icao_airline || ''}${g.flight_number || ''}`),
    type: up(d.aircraft?.icaocode || d.aircraft?.icao_code || ac.type),
    registration: up(d.aircraft?.reg),
    operatorCode: up(d.general?.icao_airline),
    variant: d.aircraft?.name || '',
    equipment: equipmentCodes(d.aircraft?.equip || ac.equip, d.aircraft?.transponder || ac.transponder, 'I'),
    dep: up(d.origin?.icao_code),
    arr: up(d.destination?.icao_code),
    altn: up(alternate.icao_code),
    route: up(g.route),
    waypoints: fixes.map(f => up(f.ident)),
    altitude: level(g.initial_altitude),
    speed: num(g.cruise_tas),
    distanceNm: num(g.route_distance || g.air_distance),
    metar: d.origin?.metar || '',
    taf: d.origin?.taf || '',
    massTakeoff: num(d.weights?.est_tow),
    massLanding: num(d.weights?.est_ldw),
    fuel: {
      unit,
      start: num(d.fuel?.plan_ramp),
      taxi: num(d.fuel?.taxi),
      takeoff: num(d.fuel?.plan_takeoff),
      landing: num(d.fuel?.plan_landing),
      reserve: num(d.fuel?.reserve),
      diversion: num(d.fuel?.alternate_burn)
    },
    airports: [port(d.origin), port(d.destination), port(alternate)].filter(Boolean)
  };
}
/** Plan de vol en cours d'un pilote IVAO (flux public whazzup) ; null s'il n'est pas connecté avec un plan. */
async function fromIvao(vid) {
  const id = String(vid || '').trim();
  if (!id) throw new Error('ivao-id');
  const data = await ENV.getJson('https://api.ivao.aero/v2/tracker/whazzup');
  const pilot = (data?.clients?.pilots || []).find(p => String(p.userId) === id);
  if (!pilot?.flightPlan) return null;
  const fp = pilot.flightPlan;
  return {
    source: 'IVAO',
    network: 'IVAO',
    callsign: up(pilot.callsign),
    type: up(fp.aircraft?.icaoCode || fp.aircraftId),
    variant: fp.aircraft?.model || '',
    registration: remark(fp.remarks, 'REG'),
    operatorCode: remark(fp.remarks, 'OPR'),
    equipment: equipmentCodes(fp.aircraftEquipments, fp.aircraftTransponderTypes, fp.flightRules),
    dep: up(fp.departureId),
    arr: up(fp.arrivalId),
    altn: up(fp.alternativeId),
    route: up(fp.route).trim(),
    altitude: level(fp.level),
    speed: speed(fp.speed),
    pob: num(fp.peopleOnBoard),
    endurance: fp.endurance ? Math.round(fp.endurance / 60) : null,
    departureTime: hhmm(fp.departureTime),
    remarks: fp.remarks || ''
  };
}
/** Plan de vol d'un pilote VATSIM (flux public : vol en cours, sinon plan déposé) ; null sans plan. Lève une erreur sans identifiant. */
async function fromVatsim(cid) {
  const id = String(cid || '').trim();
  if (!id) throw new Error('vatsim-id');
  const data = await ENV.getJson('https://data.vatsim.net/v3/vatsim-data.json');
  const pilot = (data.pilots || []).find(p => String(p.cid) === id && p.flight_plan) || (data.prefiles || []).find(p => String(p
    .cid) === id);
  if (!pilot?.flight_plan) return null;
  const fp = pilot.flight_plan,
    ac = splitAircraft(fp.aircraft);
  /** Heure « HHMM » du plan VATSIM → « HH:MM ». */
  const hm = v => {
    const s = String(v || '').padStart(4, '0');
    return /^\d{4}$/.test(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(2)) : null;
  };
  return {
    source: `VATSIM${data.pilots?.includes(pilot) ? '' : ' (prefile)'}`,
    network: 'VATSIM',
    callsign: up(pilot.callsign),
    type: up(fp.aircraft_short || ac.type),
    registration: remark(fp.remarks, 'REG'),
    operatorCode: remark(fp.remarks, 'OPR'),
    equipment: equipmentCodes(ac.equip, ac.transponder, fp.flight_rules),
    dep: up(fp.departure),
    arr: up(fp.arrival),
    altn: up(fp.alternate),
    route: up(fp.route),
    altitude: level(fp.altitude),
    speed: num(fp.cruise_tas),
    endurance: hm(fp.fuel_time),
    remarks: fp.remarks || ''
  };
}

// ------------------------------------------------------------ application
// Remplit les champs vides de la mission (replace : les champs déjà saisis aussi ; kept : liste où noter les champs
// déjà saisis gardés qui différaient) ; renvoie la liste des chemins renseignés.
function apply(mission, fpl, {
  replace = false,
  kept = null
} = {}) {
  const done = [];
  /** Écrit une valeur du plan de vol dans un champ vide de la mission et le note comme renseigné. */
  const set = (path, value) => {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
    const cur = M.get(mission, path);
    if (!replace && cur != null && cur !== '' && !(Array.isArray(cur) && !cur.length)) {
      if (kept && JSON.stringify(cur) !== JSON.stringify(value)) kept.push(path);
      return
    }
    M.set(mission, path, value);
    done.push(path);
  };
  const item = mission.aircraft[0] || (mission.aircraft[0] = M.emptyAircraft());
  // Immatriculation du plan de vol (REG/FZBMM) → forme connue (F-ZBMM) si l'appareil existe.
  const known = fpl.registration ? A.find(fpl.registration) : null;
  set('aircraft.0.registration', known?.registration || M.formatRegistration(fpl.registration));
  set('aircraft.0.callsign', fpl.callsign);
  set('aircraft.0.type', fpl.type);
  // Indicatif déposé (forme plan de vol, ex. DRAGO76) → DRAGON / 76, forme plan de vol conservée.
  if (done.includes('aircraft.0.callsign')) {
    const parts = M.splitCallsign(item.callsign),
      prefix = A.canonicalPrefix(parts.prefix);
    item.callsignPrefix = prefix;
    item.callsignNumber = parts.number;
    item.callsign = M.joinCallsign(prefix, parts.number);
    item.callsignFpl = String(fpl.callsign).replace(/[^A-Z0-9]/g, '');
  }
  const type = A.lookupType(item.type || fpl.type);
  set('aircraft.0.variant', type?.model || fpl.variant);
  set('aircraft.0.category', type?.category);
  // Exploitant (OPR/) et organisme correspondant (FRU → Sécurité civile).
  set('aircraft.0.operatorCode', fpl.operatorCode);
  set('organisation.organisation', A.operatorOfDesignator(fpl.operatorCode));
  set('aircraft.0.baseDeparture', fpl.dep);
  set('aircraft.0.baseReturn', fpl.arr);
  set('aircraft.0.massTakeoff', fpl.massTakeoff);
  set('aircraft.0.massLanding', fpl.massLanding);
  set('aircraft.0.enduranceMinutes', fpl.endurance);
  if (fpl.equipment?.length) {
    const before = (item.equipment || []).length;
    item.equipment = [...new Set([...(item.equipment || []), ...fpl.equipment])];
    if (item.equipment.length !== before) done.push('aircraft.0.equipment');
  }
  set('navigation.dep', fpl.dep);
  set('navigation.arr', fpl.arr);
  set('navigation.altn', fpl.altn);
  set('navigation.route', fpl.route);
  // points tournants : ceux du plan de vol (navlog SimBrief), sinon tirés de la route ; ils suivent la route reprise
  // (remplacés avec elle), sinon ceux d'un vol précédent restaient
  {
    const wp = (fpl.waypoints?.length ? fpl.waypoints : routePoints(fpl.route) || []).join('\n');
    if (wp && done.includes('navigation.route') && M.get(mission, 'navigation.waypoints') !== wp) {
      M.set(mission, 'navigation.waypoints', wp);
      done.push('navigation.waypoints');
    } else set('navigation.waypoints', wp);
  }
  set('navigation.altitude', fpl.altitude);
  set('navigation.speed', fpl.speed);
  set('navigation.distanceNm', fpl.distanceNm);
  set('environment.metar', fpl.metar);
  set('environment.taf', fpl.taf);
  if (fpl.fuel && (mission.fuel.start == null)) {
    set('fuel.unit', fpl.fuel.unit);
    mission.fuel.unit = fpl.fuel.unit;
    ['start', 'taxi', 'takeoff', 'landing', 'reserve', 'diversion'].forEach(k => set(`fuel.${k}`, fpl.fuel[k]));
  }
  if (fpl.network) set('network.onlineNetwork', fpl.network);
  (fpl.airports || []).forEach(a => ENV.remember?.(a));
  return done;
}

export {
  configure,
  routePoints,
  equipmentCodes,
  splitAircraft,
  level,
  fromSimbrief,
  fromIvao,
  fromVatsim,
  apply
};
