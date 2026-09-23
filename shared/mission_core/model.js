(() => {
  'use strict';
  // Mission Report Core — modèle de données (§E.1 de docs/mission_report_core_audit.md).
  // Une mission est un objet arborescent versionné (schemaVersion) ; les familles ajoutent
  // leurs données sous `missionData` sans toucher au tronc commun.
  const SCHEMA_VERSION = 2;

  const emptyAircraft = () => ({ category: '', type: '', variant: '', registration: '', tacticalNumber: '', callsign: '', callsignPrefix: '', callsignNumber: '', callsignFpl: '', operatorCode: '', baseDeparture: '', baseReturn: '', massTakeoff: null, massLanding: null, enduranceMinutes: null, configuration: '', equipment: [] });
  const emptyMission = (family = '') => ({
    schemaVersion: SCHEMA_VERSION,
    family, series: '', subtype: '',
    metadata: { missionId: '', missionNumber: '', serial: '', date: '', timeLocal: '', timeUtc: '', classification: 'UNCLASSIFIED', context: 'EXERCISE', operationName: '', orderRef: '' },
    organisation: { organisation: '', unit: '', detachment: '', requestingAuthority: '', controllingAuthority: '' },
    aircraft: [emptyAircraft()],
    crew: [],
    tasking: { objective: '', instructions: '', priority: '' },
    environment: { metar: '', taf: '', wind: '', temperature: null, qnh: null, visibility: '', ceiling: '', precipitation: '', turbulence: '', icing: '', seaState: '', illumination: '', sunrise: '', sunset: '', dayNight: '' },
    navigation: { dep: '', arr: '', altn: '', route: '', waypoints: '', coordinates: '', altitude: '', minAltitude: '', speed: null, distanceNm: null, area: '', radiusNm: null, corridor: '', orbit: '' },
    capabilities: [],
    timeline: { briefing: '', engineStart: '', offBlock: '', takeoff: '', zoneEntry: '', missionStart: '', missionEnd: '', zoneExit: '', landing: '', onBlock: '', shutdown: '' },
    fuel: { unit: 'kg', start: null, taxi: null, takeoff: null, onTaskArrival: null, onStation: null, taskDeparture: null, landing: null, block: null, reserve: null, diversion: null },
    legs: [],
    events: [],
    missionData: {},
    results: { outcome: '', detail: '', interruptionReason: '', incidents: '', anomalies: '' },
    remarks: { observations: '', lessonsLearned: '' },
    network: { onlineNetwork: '', ivaoId: '', vatsimId: '', trackerUrl: '' },
    statistics: {}
  });

  // ---- accès par chemin « a.b.0.c »
  const split = path => String(path).split('.').filter(Boolean);
  const get = (obj, path) => split(path).reduce((node, key) => node == null ? undefined : node[key], obj);
  const set = (obj, path, value) => {
    const keys = split(path); let node = obj;
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
      else if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) fillDefaults(target[key], value);
    });
    return target;
  };

  // ---- temps (§4.4) : minutes entre deux heures HH:MM, passage de minuit inclus
  // Heure invalide (ex. « 90:25 ») ignorée plutôt que de fausser les durées.
  const minutes = text => { const m = /^(\d{1,2}):(\d{2})/.exec(String(text || '')); return m && +m[1] < 24 && +m[2] < 60 ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const between = (a, b) => { a = minutes(a); b = minutes(b); if (a == null || b == null) return null; return b >= a ? b - a : b - a + 1440; };
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

  function computeStatistics(m) {
    const t = m.timeline || {}, f = m.fuel || {};
    const fuelEnd = num(f.block) ?? num(f.landing);
    const stats = {
      blockMinutes: between(t.offBlock, t.onBlock) ?? between(t.engineStart, t.shutdown),
      flightMinutes: between(t.takeoff, t.landing),
      transitOutMinutes: between(t.takeoff, t.zoneEntry),
      timeOnStationMinutes: between(t.zoneEntry, t.zoneExit),
      transitInMinutes: between(t.zoneExit, t.landing),
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

  // ---- anciens formats (HEMS / GAAR plats, sans schemaVersion) → modèle commun.
  // Correspondance des champs communs ; le reste est conservé sous missionData.legacy
  // (reprise complète par les modules HEMS / FIRE à l'étape 2).
  const LEGACY_MAP = {
    missionId: 'metadata.missionId', date: 'metadata.date', aircraft: 'aircraft.0.type', registration: 'aircraft.0.registration',
    callsign: 'aircraft.0.callsign', baseDeparture: 'aircraft.0.baseDeparture', baseReturn: 'aircraft.0.baseReturn',
    weather: 'environment.wind', engineStart: 'timeline.engineStart', takeoff: 'timeline.takeoff', onScene: 'timeline.zoneEntry',
    landing: 'timeline.landing', engineStop: 'timeline.shutdown', fuelStart: 'fuel.start', fuelEnd: 'fuel.landing', fuelUnit: 'fuel.unit',
    opsNotes: 'remarks.observations', lessons: 'remarks.lessonsLearned', techNotes: 'results.anomalies', outcome: 'results.detail',
    onlineNetwork: 'network.onlineNetwork', ivaoId: 'network.ivaoId', vatsimId: 'network.vatsimId', trackerUrl: 'network.trackerUrl'
  };
  const LEGACY_ROLES = { captain: 'PIC', fo: 'COPILOT', doctor: 'DOCTOR', nurse: 'NURSE', rescuer: 'WINCH_OPERATOR', observer: 'OBSERVER' };
  // Indicatif radio = indicatif (série : DRAGON, PELICAN, SAMU…) + numéro (76, 41, 74-1…).
  // Champ libre : ce qui ne suit pas ce schéma reste entièrement dans l'indicatif.
  function splitCallsign(value) {
    // Accents et points ignorés (PÉLICAN = PELICAN, F.M.N. = FMN).
    const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f.]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
    const m = /^([A-Z]+(?: [A-Z]+)*)[ -]?(\d[0-9A-Z-]*)$/.exec(text);
    return m ? { prefix: m[1], number: m[2] } : { prefix: text, number: '' };
  }
  const joinCallsign = (prefix, number) => `${String(prefix ?? '').trim().toUpperCase()}${String(number ?? '').trim().toUpperCase()}`.replace(/\s+/g, '');
  // Appareils : indicatif / numéro déduits de l'indicatif complet s'ils manquent.
  function callsignParts(mission) {
    (mission.aircraft || []).forEach(a => {
      ['callsignPrefix', 'callsignNumber', 'callsignFpl', 'operatorCode'].forEach(k => { if (a[k] == null) a[k] = ''; });
      if (a.callsign && !a.callsignPrefix && !a.callsignNumber) { const s = splitCallsign(a.callsign); a.callsignPrefix = s.prefix; a.callsignNumber = s.number; }
    });
    return mission;
  }
  const migrate = (input, family = '') => callsignParts(migrateRecord(input, family));
  function migrateRecord(input, family = '') {
    if (!input || typeof input !== 'object') throw new Error('Mission illisible');
    if (Number(input.schemaVersion) >= 2) return fillDefaults(structuredClone(input), emptyMission(input.family || family));
    // Famille avec convertisseur dédié (HEMS, FIRE : anciens CSV / JSON plats) : prioritaire.
    const def = window.MissionCore?.families?.get?.(family);
    if (def?.legacy?.fromRecord) return fillDefaults(def.legacy.fromRecord(input, { emptyMission, set, num }), emptyMission(family));
    const mission = emptyMission(family), legacy = {};
    Object.entries(input).forEach(([key, value]) => {
      if (key === 'events' && Array.isArray(value)) mission.events = value.map(e => ({ timeLocal: e.time || '', timeUtc: '', type: 'OTHER', position: e.position || '', altitude: null, speed: null, heading: null, fuel: null, description: [e.type, e.note].filter(Boolean).join(' — '), result: '' }));
      else if (LEGACY_MAP[key]) set(mission, LEGACY_MAP[key], ['fuelStart', 'fuelEnd'].includes(key) ? num(value) : value ?? '');
      else if (LEGACY_ROLES[key]) { if (value) mission.crew.push({ role: LEGACY_ROLES[key], name: value, aircraft: 1, notes: '' }); }
      else if (key !== 'kpi') legacy[key] = value;
    });
    if (Object.keys(legacy).length) mission.missionData.legacy = legacy;
    return mission;
  }

  // ---- YAML : écriture sûre (toutes les chaînes entre guillemets : heures, dates, immat.)
  // et lecture en schéma YAML 1.2 « core » (aucune conversion implicite de date).
  function toYaml(mission, header = 'Mission Report — DEFA Virtual') {
    if (!window.jsyaml) throw new Error('Bibliothèque YAML absente');
    const body = window.jsyaml.dump(mission, { forceQuotes: true, quotingType: '"', lineWidth: -1, noRefs: true, sortKeys: false });
    return `# ${header}\n# schemaVersion ${mission.schemaVersion} — ${new Date().toISOString()}\n${body}`;
  }
  function parse(text, family = '') {
    const source = String(text || '').replace(/^﻿/, '');
    const data = /^\s*[{[]/.test(source) ? JSON.parse(source) : window.jsyaml.load(source, { schema: window.jsyaml.CORE_SCHEMA });
    return migrate(data, family);
  }

  // Contexte d'affichage d'une mission (mêmes règles que le formulaire) : famille, série,
  // capacités employées, catégories d'appareil, drapeaux de famille. Sert au formulaire,
  // au compte rendu, aux résumés et aux statistiques (un bloc masqué n'est jamais compté).
  function context(mission, family = {}) {
    const categories = (mission.aircraft || []).map(a => a.category).filter(Boolean);
    if (!categories.length && family.defaultCategory) categories.push(family.defaultCategory);
    const flags = typeof family.flags === 'function' ? family.flags(mission) || {} : family.flags || {};
    return { family: family.id, series: mission.series || '', mission, flags, capabilities: new Set(mission.capabilities || []), categories: new Set(categories) };
  }
  const blockVisible = (mission, family, id) => { const block = (family.blocks || []).find(b => b.id === id); return !!block && (!block.when || block.when(context(mission, family))); };

  // Version publique (§7) : copie de la mission sans les champs marqués `sensitive` par la
  // famille (champ, ou bloc entier avec `sensitive: true`), collections comprises.
  function redact(mission, family = {}) {
    const copy = structuredClone(mission);
    (family.blocks || []).forEach(block => {
      if (block.collection) {
        const list = get(copy, block.collection.path) || [];
        block.collection.fields.filter(f => block.sensitive || f.sensitive).forEach(f => list.forEach(item => set(item, f.path, null)));
      } else (block.fields || []).filter(f => block.sensitive || f.sensitive).forEach(f => { if (get(copy, f.path) !== undefined) set(copy, f.path, null); });
    });
    copy.publicVersion = true;
    return copy;
  }
  const hasSensitive = (family = {}) => (family.blocks || []).some(b => b.sensitive || (b.collection ? b.collection.fields : b.fields || []).some(f => f.sensitive));

  // Lecture d'un CSV « ; » (guillemets doublés) en objets { colonne: valeur }.
  function parseCsv(text) {
    const out = []; let row = [], value = '', quoted = false; text = String(text || '').replace(/^﻿/, '');
    const push = () => { row.push(value); if (row.some(v => v !== '') && !String(row[0]).startsWith('#')) out.push(row); row = []; value = ''; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (quoted && c === '"' && n === '"') { value += '"'; i++; } else if (c === '"') quoted = !quoted;
      else if (!quoted && c === ';') { row.push(value); value = ''; } else if (!quoted && (c === '\n' || c === '\r')) { if (c === '\r' && n === '\n') i++; push(); } else value += c;
    }
    if (value || row.length) push();
    const head = (out.shift() || []).map(h => String(h).trim());
    return out.map(values => Object.fromEntries(head.map((h, i) => [h, values[i] ?? ''])));
  }

  window.MissionModel = { parseCsv, redact, hasSensitive, context, blockVisible, SCHEMA_VERSION, emptyMission, emptyAircraft, splitCallsign, joinCallsign, get, set, fillDefaults, minutes, between, num, computeStatistics, migrate, toYaml, parse };
})();
