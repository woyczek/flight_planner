(() => {
  'use strict';
  // Mission Report Core — modèle de données (§E.1 de docs/mission_report_core_audit.md).
  // Une mission est un objet arborescent versionné (schemaVersion) ; les familles ajoutent
  // leurs données sous `missionData` sans toucher au tronc commun.
  const SCHEMA_VERSION = 2;

  const emptyAircraft = () => ({ category: '', type: '', variant: '', registration: '', tacticalNumber: '', callsign: '', baseDeparture: '', baseReturn: '', massTakeoff: null, massLanding: null, enduranceMinutes: null, configuration: '', equipment: [] });
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
  const minutes = text => { const m = /^(\d{1,2}):(\d{2})/.exec(String(text || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
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
  function migrate(input, family = '') {
    if (!input || typeof input !== 'object') throw new Error('Mission illisible');
    if (Number(input.schemaVersion) >= 2) return fillDefaults(structuredClone(input), emptyMission(input.family || family));
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

  window.MissionModel = { SCHEMA_VERSION, emptyMission, emptyAircraft, get, set, fillDefaults, minutes, between, num, computeStatistics, migrate, toYaml, parse };
})();
