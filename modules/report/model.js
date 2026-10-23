// V3 report — modèle d'un compte rendu, recopié de la V2 (shared/mission_core/model.js) le 23/10/2026 sans changement :
// mission vide au schéma 2 (la même entrée que le registre V2 cr/missions.yaml), accès par chemin, durées, statistiques,
// contrôles de cohérence (avertissements, jamais bloquants). Module ES pur.
const SCHEMA_VERSION = 2;
const emptyAircraft = () => ({
  category: '',
  type: '',
  variant: '',
  registration: '',
  tacticalNumber: '',
  callsign: '',
  callsignPrefix: '',
  callsignNumber: '',
  callsignFpl: '',
  operatorCode: '',
  landingAd: '', // terrain d'atterrissage réel (OACI), jamais prérempli : déplace l'appareil si le CR vient d'un ordre de mission
  baseDeparture: '',
  baseReturn: '',
  massTakeoff: null,
  massLanding: null,
  enduranceMinutes: null,
  configuration: '',
  equipment: []
});
/** Mission vide au schéma courant (métadonnées, chronologie, appareils, carburant, collections de la famille). */
const emptyMission = (family = '') => ({
  schemaVersion: SCHEMA_VERSION,
  family,
  series: '',
  subtype: '',
  metadata: {
    missionId: '',
    missionNumber: '',
    formerMissionId: '', // ancien n° de CR (HEMS-001…) après tools/renumber_reports.py
    serial: '',
    date: '',
    timeLocal: '',
    timeUtc: '',
    classification: 'UNCLASSIFIED',
    context: 'EXERCISE',
    operationName: '',
    orderRef: '',
    reportedBy: '' // trigramme de qui a rédigé le CR (posé à l'enregistrement)
  },
  organisation: {
    organisation: '',
    unit: '',
    detachment: '',
    requestingAuthority: '',
    controllingAuthority: ''
  },
  aircraft: [emptyAircraft()],
  crew: [],
  tasking: {
    objective: '',
    instructions: '',
    priority: ''
  },
  environment: {
    metar: '',
    taf: '',
    wind: '',
    temperature: null,
    qnh: null,
    visibility: '',
    ceiling: '',
    precipitation: '',
    turbulence: '',
    icing: '',
    seaState: '',
    illumination: '',
    sunrise: '',
    sunset: '',
    dayNight: ''
  },
  navigation: {
    dep: '',
    arr: '',
    altn: '',
    route: '',
    waypoints: '',
    coordinates: '',
    altitude: '',
    minAltitude: '',
    speed: null,
    distanceNm: null,
    area: '',
    radiusNm: null,
    corridor: '',
    orbit: ''
  },
  capabilities: [],
  timeline: {
    briefing: '',
    engineStart: '',
    offBlock: '',
    takeoff: '',
    zoneEntry: '',
    missionStart: '',
    missionEnd: '',
    zoneExit: '',
    landing: '',
    onBlock: '',
    shutdown: ''
  },
  fuel: {
    unit: 'kg',
    start: null,
    taxi: null,
    takeoff: null,
    onTaskArrival: null,
    onStation: null,
    taskDeparture: null,
    landing: null,
    block: null,
    reserve: null,
    diversion: null
  },
  legs: [],
  events: [],
  missionData: {},
  results: {
    outcome: '',
    detail: '',
    interruptionReason: '',
    incidents: '',
    anomalies: ''
  },
  remarks: {
    observations: '',
    lessonsLearned: ''
  },
  network: {
    onlineNetwork: '',
    ivaoId: '',
    vatsimId: '',
    trackerUrl: ''
  },
  statistics: {}
});
// ---- accès par chemin « a.b.0.c »
/** Chemin « a.b.0.c » → liste de clés. */
const split = path => String(path).split('.').filter(Boolean);
/** Valeur au chemin donné ; undefined si un maillon manque. */
const get = (obj, path) => split(path).reduce((node, key) => node == null ? undefined : node[key], obj);
/** Écrit une valeur au chemin donné, en créant objets et tableaux intermédiaires. */
const set = (obj, path, value) => {
  const keys = split(path);
  let node = obj;
  keys.slice(0, -1).forEach((key, i) => {
    if (node[key] == null || typeof node[key] !== 'object') node[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    node = node[key];
  });
  node[keys[keys.length - 1]] = value;
  return obj;
};
// Complète récursivement `target` avec les clés manquantes de `defaults` (tableaux conservés).
const fillDefaults = (target, defaults) => {
  Object.entries(defaults).forEach(([key, value]) => {
    if (target[key] === undefined) target[key] = structuredClone(value);
    else if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !
      Array.isArray(target[key])) fillDefaults(target[key], value);
  });
  return target;
};

// ---- temps (§4.4) : minutes entre deux heures HH:MM, passage de minuit inclus
// Heure invalide (ex. « 90:25 ») ignorée plutôt que de fausser les durées.
const minutes = text => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(text || ''));
  return m && +m[1] < 24 && +m[2] < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};
/** Durée en minutes entre deux heures « HH:MM » (passage de minuit compris) ; null si une heure manque ou est invalide. */
const between = (a, b) => {
  a = minutes(a);
  b = minutes(b);
  if (a == null || b == null) return null;
  return b >= a ? b - a : b - a + 1440;
};
/** Nombre d'une saisie ; null si vide ou invalide. */
const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/** Statistiques d'une mission : durées (vol, transit, sur zone, bloc…), carburant consommé, etc. ; segments jamais plus longs que le vol (heure inversée = erreur, pas un passage de minuit). Sortie : { nom : valeur } sans les valeurs nulles. */
function computeStatistics(m) {
  const t = m.timeline || {},
    f = m.fuel || {};
  const fuelEnd = num(f.block) ?? num(f.landing);
  // Segments du vol (transit, sur zone) : jamais plus longs que le vol lui-même — une heure
  // inversée (sortie de zone avant l'entrée) n'est pas un passage de minuit mais une erreur.
  const flight = between(t.takeoff, t.landing),
    part = (a, b) => {
      const v = between(a, b);
      return v != null && flight != null && v > flight ? null : v;
    };
  const stats = {
    // Durée « déclarée » (modifiée depuis un reporting, sans les heures) : à défaut des heures.
    blockMinutes: between(t.offBlock, t.onBlock) ?? between(t.engineStart, t.shutdown) ?? num(t.declared?.blockMinutes),
    flightMinutes: flight ?? num(t.declared?.flightMinutes),
    declared: t.declared && (flight == null && num(t.declared.flightMinutes) != null || between(t.offBlock, t.onBlock) == null &&
      between(t.engineStart, t.shutdown) == null && num(t.declared.blockMinutes) != null) ? true : null,
    transitOutMinutes: part(t.takeoff, t.zoneEntry),
    timeOnStationMinutes: part(t.zoneEntry, t.zoneExit),
    transitInMinutes: part(t.zoneExit, t.landing),
    missionMinutes: between(t.missionStart, t.missionEnd),
    fuelUsed: num(f.start) != null && fuelEnd != null && num(f.start) >= fuelEnd ? num(f.start) - fuelEnd : null,
    fuelOnStation: num(f.onTaskArrival) != null && num(f.taskDeparture) != null ? num(f.onTaskArrival) - num(f.taskDeparture) : null,
    aircraftCount: (m.aircraft || []).filter(a => a.type || a.registration).length,
    crewCount: (m.crew || []).filter(c => c.role || c.name).length,
    eventCount: (m.events || []).filter(e => e.type || e.description).length,
    legCount: (m.legs || []).filter(l => l.from || l.to).length
  };
  return Object.fromEntries(Object.entries(stats).filter(([, v]) => v != null));
}

// ---- contrôle de cohérence (saisie, reporting) : heures invalides, chronologie inversée,
// carburant qui augmente. Résultat structuré ; libellés : MissionBlocks.describeIssues.
// Chronologie : chaque heure suit la précédente (passage de minuit admis), aucun écart d'au
// moins 12 h entre deux étapes, 20 h au plus du premier au dernier événement.
const SEQUENCE = ['engineStart', 'offBlock', 'takeoff', 'zoneEntry', 'zoneExit', 'landing', 'onBlock', 'shutdown'];
const TIME_FIELDS = ['briefing', ...SEQUENCE, 'missionStart', 'missionEnd'];

/** Contrôles de cohérence d'une mission (date plausible et non future, heures dans l'ordre, carburant cohérent…). Sortie : liste d'anomalies { kind, … } affichées dans le CR. */
function checkMission(m) {
  const t = m.timeline || {},
    issues = [];
  // Date : un CR porte sur un vol réalisé (pas de date future ; année plausible).
  const date = m.metadata?.date || '',
    today = new Date(),
    iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01')) issues.push({
    kind: 'dateInvalid',
    path: 'metadata.date',
    value: date
  });
  else if (date > iso) issues.push({
    kind: 'future',
    path: 'metadata.date',
    value: date
  });
  TIME_FIELDS.forEach(k => {
    if (t[k] && minutes(t[k]) == null) issues.push({
      kind: 'invalid',
      path: `timeline.${k}`,
      value: t[k]
    });
  });
  const steps = SEQUENCE.filter(k => minutes(t[k]) != null);
  let span = 0;
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1],
      b = steps[i],
      d = between(t[a], t[b]);
    if (d >= 720) issues.push({
      kind: 'order',
      path: `timeline.${b}`,
      before: `timeline.${a}`,
      value: t[b],
      other: t[a]
    });
    else span += d;
  }
  if (span > 1200) issues.push({
    kind: 'span',
    path: `timeline.${steps[steps.length - 1]}`,
    minutes: span
  });
  if (minutes(t.missionStart) != null && minutes(t.missionEnd) != null && between(t.missionStart, t.missionEnd) >= 1200)
    issues.push({
      kind: 'order',
      path: 'timeline.missionEnd',
      before: 'timeline.missionStart',
      value: t.missionEnd,
      other: t.missionStart
    });
  // Durées déclarées sans heures (modification depuis un reporting) : à compléter dans le CR.
  ['flightMinutes', 'blockMinutes'].forEach(k => {
    if (t.declared?.[k] != null) issues.push({
      kind: 'declared',
      path: k === 'flightMinutes' ? 'timeline.takeoff' : 'timeline.offBlock',
      value: t.declared[k],
      measure: k
    });
  });
  const f = m.fuel || {},
    end = num(f.block) ?? num(f.landing);
  if (num(f.start) != null && end != null && end > num(f.start)) issues.push({
    kind: 'fuel',
    path: num(f.block) != null ? 'fuel.block' : 'fuel.landing',
    value: end,
    other: num(f.start)
  });
  return issues;
}

// Indicatif radio = indicatif (série : DRAGON, PELICAN, SAMU…) + numéro (76, 41, 74-1…).
// Champ libre : ce qui ne suit pas ce schéma reste entièrement dans l'indicatif.
function splitCallsign(value) {
  // Accents et points ignorés (PÉLICAN = PELICAN, F.M.N. = FMN).
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f.]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
  const m = /^([A-Z]+(?: [A-Z]+)*)[ -]?(\d[0-9A-Z-]*)$/.exec(text);
  return m ? {
    prefix: m[1],
    number: m[2]
  } : {
    prefix: text,
    number: ''
  };
}
/** Indicatif complet à partir de la série et du numéro (majuscules, sans espaces). */
const joinCallsign = (prefix, number) => `${String(prefix ?? '').trim().toUpperCase()}${String(number ?? '').trim().toUpperCase()}`.replace(/\s+/g, '');
// Immatriculation affichée et enregistrée avec le tiret de la marque de nationalité :
// FZBMM → F-ZBMM, HBJVE → HB-JVE, 9HABC → 9H-ABC ; N123AB (États-Unis) et saisies déjà
// tirées inchangées. La recherche ignore le tiret (MissionAircraft.regKey).
const TWO_LETTER_MARKS = new Set((
  'HB OO OE OK OM PH EC EI ES LX LY LZ SE SP SX TC UR YL YR YU OH OY LN CS TF HA S5 9A 9H 4X VH ZS ZK VT HS PK RP 9M 9V A6 A7 HZ SU CN EP YI JY OD 5B 5Y ZP LV CC HK YV OB CX HP TG TI XA XB XC EW ER UK UN EX EY EZ 4K 4L EK RA RF PP PR PT PU HI T7 3A HL'
).split(' '));

/** Immatriculation normalisée (majuscules, tiret après la marque de nationalité : F-HABC). */
function formatRegistration(value) {
  const s = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s || s.includes('-')) return s.replace(/-+/g, '-');
  if (/^N\d/.test(s)) return s;
  if (TWO_LETTER_MARKS.has(s.slice(0, 2)) && s.length > 3) return `${s.slice(0, 2)}-${s.slice(2)}`;
  if (/^[A-Z]{5}$/.test(s)) return `${s[0]}-${s.slice(1)}`;
  return s;
}

// Contexte d'affichage d'une mission (mêmes règles que le formulaire) : famille, série,
// capacités employées, catégories d'appareil, drapeaux de famille. Sert au formulaire,
// au compte rendu, aux résumés et aux statistiques (un bloc masqué n'est jamais compté).
function context(mission, family = {}) {
  const categories = (mission.aircraft || []).map(a => a.category).filter(Boolean);
  if (!categories.length && family.defaultCategory) categories.push(family.defaultCategory);
  const flags = typeof family.flags === 'function' ? family.flags(mission) || {} : family.flags || {};
  return {
    family: family.id,
    series: mission.series || '',
    mission,
    flags,
    capabilities: new Set(mission.capabilities || []),
    categories: new Set(categories)
  };
}
/** Vrai si le bloc id de la famille est affiché pour cette mission (condition when du bloc). */
const blockVisible = (mission, family, id) => {
  const block = (family.blocks || []).find(b => b.id === id);
  return !!block && (!block.when || block.when(context(mission, family)));
};

export {
  context,
  blockVisible,
  splitCallsign,
  joinCallsign,
  formatRegistration,
  SCHEMA_VERSION,
  emptyAircraft,
  emptyMission,
  get,
  set,
  fillDefaults,
  minutes,
  between,
  num,
  computeStatistics,
  checkMission
};
