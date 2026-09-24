(() => {
  'use strict';
  // Mission Report Core — appareils connus et types d'aéronef.
  //
  // Types : base OACI (AircraftDB/aircraft_db.js, alias compris) + types ajoutés
  // localement (enrichissement souple : un type inconnu saisi dans une mission est
  // ajouté à la base locale lors de l'enregistrement au registre).
  //
  // Appareils connus (registre par immatriculation), sources par ordre d'ancienneté :
  // flotte DEFA (shared/aircraft_fleet.js), associations des CR HEMS/FIRE
  // (missionAircraftDirectory:v1), registres HEMS/FIRE en cache, missions enregistrées
  // avec le Core (missionAircraftRegistry:v1, équipements compris). En cas de conflit,
  // la donnée la plus récente l'emporte, champ par champ.
  const TYPES_KEY = 'missionAircraftTypes:v1', REGISTRY_KEY = 'missionAircraftRegistry:v1';
  const regKey = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ } };

  // ---- types
  // Base OACI ; modifications de la page Paramétrage plus récentes que le fichier
  // (dataOverride:aircraftDb:v1, pas encore enregistrées dans le dépôt) : prioritaires.
  let overrideCache = { raw: undefined, value: null };
  const db = () => {
    const file = window.AIRCRAFT_DB || {};
    let raw = null; try { raw = localStorage.getItem('dataOverride:aircraftDb:v1'); } catch { /* stockage indisponible */ }
    if (raw !== overrideCache.raw) { let value = null; try { value = JSON.parse(raw || 'null'); } catch { value = null; } overrideCache = { raw, value }; }
    const override = overrideCache.value;
    return override?.data && override.updatedAt > String(file.__meta?.admin_saved || '') ? override.data : file;
  };
  // Classe OACI (Doc 8643) : H2T → hélicoptère, L2J → avion, A/S → amphibie / hydravion.
  const categoryOf = description => ({ H: 'rotary', G: 'rotary', T: 'rotary', L: 'fixed', A: 'amphibious', S: 'amphibious' })[String(description || '').charAt(0).toUpperCase()] || '';
  // Types de la flotte DEFA absents de la base OACI importée : catalogue commun
  // (shared/aircraft_catalog.js, aussi utilisé par le Landing Dashboard et le Planner).
  const SUPPLEMENT = window.AircraftCatalog?.SUPPLEMENT || {};
  const localTypes = () => ({ ...SUPPLEMENT, ...(read(TYPES_KEY) || {}) });
  // Libellés parasites présents dans la base OACI importée (texte de pages web récupéré
  // à la place du modèle) : traités comme un modèle absent.
  const JUNK_MODELS = new Set(['Aircraft Performance Database', 'Skip to aircraft details']);
  const cleanModel = model => JUNK_MODELS.has(String(model || '').trim()) ? '' : model || '';
  function lookupType(value) {
    const code = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return null;
    const base = db(), resolved = base.__aliases?.[code] || code;
    const entry = base[resolved] || localTypes()[resolved] || localTypes()[code];
    if (!entry) return null;
    return { tdesig: entry.tdesig || resolved, model: cleanModel(entry.model), category: entry.category || categoryOf(entry.description), wtc: entry.wtc || '', local: !base[resolved] };
  }
  function listTypes() {
    const base = db(), out = new Map();
    Object.entries(base).forEach(([key, entry]) => { if (!key.startsWith('__')) out.set(key, { tdesig: key, model: cleanModel(entry.model), category: categoryOf(entry.description) }); });
    Object.entries(localTypes()).forEach(([key, entry]) => out.set(key, { tdesig: key, model: entry.model || '', category: entry.category || '', local: true }));
    return [...out.values()].sort((a, b) => a.tdesig.localeCompare(b.tdesig));
  }
  function enrichType(type, { model = '', category = '' } = {}) {
    const code = String(type || '').trim().toUpperCase();
    if (!code || lookupType(code)) return false;
    const types = localTypes(); types[code] = { tdesig: code, model: model || code, category, addedAt: new Date().toISOString() };
    write(TYPES_KEY, types); return true;
  }

  // ---- registre des appareils connus
  function sources() {
    const records = [];
    (window.DEFA_FLEET || []).forEach(e => records.push({ ...e, date: '0000-00-00' }));
    (read('missionAircraftDirectory:v1') || []).forEach(e => records.push({ ...e, date: String(e.updatedAt || '').slice(0, 10) || '0000-00-01' }));
    // Registres HEMS / FIRE (CSV en cache) : colonnes aircraft / registration / callsign / date.
    ['ledgerName', 'gaarLedgerName'].forEach(key => {
      const text = (read(`missionReportingData:v1:${key}`) || {}).text; if (!text) return;
      const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean), head = splitCsv(lines.shift() || '');
      const at = name => head.indexOf(name);
      lines.forEach(line => {
        const cells = splitCsv(line), registration = cells[at('registration')];
        if (registration) records.push({ registration, callsign: cells[at('callsign')] || '', type: cells[at('aircraft')] || '', date: cells[at('date')] || '' });
      });
    });
    // Base DEFA (journal des vols réalisés, Paramétrage › Base DEFA) : type, variante et
    // indicatifs utilisés par immatriculation — sans indicatif par défaut (numéro propre au vol).
    ((read('defaFlightLog:v1') || {}).records || []).forEach(r => { if (r.registration) records.push({ registration: r.registration, type: r.type, variant: r.variant, callsigns: r.callsign ? [r.callsign] : [], date: r.date }); });
    // Référence DEFA anonymisée (defa_reference.js) : type, indicatifs utilisés, terrains.
    (window.DEFA_REFERENCE?.aircraft || []).forEach(r => records.push({ registration: r.registration, type: r.type, variant: r.variant, callsigns: r.callsigns || [], base: r.homeAd || '', date: r.last || '0000-00-01' }));
    Object.values(read(REGISTRY_KEY) || {}).forEach(e => records.push(e));
    return records;
  }
  function splitCsv(line) {
    const out = []; let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted && c === '"' && line[i + 1] === '"') { value += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === ';' && !quoted) { out.push(value); value = ''; } else value += c;
    }
    out.push(value); return out.map(v => v.trim());
  }
  // base / operator / number : flotte DEFA (base d'attache, opérateur, numéro de l'appareil).
  const FIELDS = ['registration', 'type', 'variant', 'category', 'callsign', 'tacticalNumber', 'configuration', 'equipment', 'base', 'operator', 'number'];
  // Fusion par immatriculation, du plus ancien au plus récent : chaque champ non vide
  // écrase la valeur précédente → « la dernière en date ».
  function known() {
    const byReg = new Map();
    sources().filter(r => regKey(r.registration)).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(record => {
      const key = regKey(record.registration), current = byReg.get(key) || { registration: window.MissionModel.formatRegistration(record.registration), callsigns: [] };
      FIELDS.forEach(field => {
        const value = record[field];
        if (Array.isArray(value) ? value.length : value !== undefined && value !== null && String(value).trim() !== '') current[field] = field === 'registration' ? window.MissionModel.formatRegistration(value) : field === 'callsign' ? String(value).toUpperCase() : value;
      });
      [record.callsign, ...(Array.isArray(record.callsigns) ? record.callsigns : [])].forEach(c => { if (c && !current.callsigns.includes(String(c).toUpperCase())) current.callsigns.push(String(c).toUpperCase()); });
      current.date = record.date || current.date;
      if (!current.category && current.type) current.category = lookupType(current.type)?.category || '';
      byReg.set(key, current);
    });
    return [...byReg.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }
  // Type normalisé (alias OACI : H145 → EC45) pour comparer les séries d'appareils.
  const typeKey = value => { const code = String(value || '').trim().toUpperCase(); return lookupType(code)?.tdesig || code; };
  // ---- indicatifs : forme plan de vol
  // Plan de vol OACI (Doc 4444, app. 2, case 7) : identification de 7 caractères
  // alphanumériques au plus, sans tiret. D'où des formes abrégées (DRAGON76 → DRAGO76).
  // Ordre de priorité : table de correspondance (vocab.js : PELICAN ↔ PCAN, BENGALE ↔
  // BENGA…, puis formes corrigées par le pilote, mémorisées), abréviations apprises de la
  // base (un indicatif qui commence un autre indicatif connu : DRAGO / DRAGON), troncature.
  const FPL_MAX = 7, LEARNED_KEY = 'missionCallsignTable:v1';
  const up = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const clean = v => up(v).replace(/[^A-Z0-9]/g, '');
  function table() {
    const out = new Map();
    (window.MissionVocab?.callsignTable || []).forEach(e => out.set(e.prefix, { ...e }));
    (read(LEARNED_KEY) || []).forEach(e => out.set(e.prefix, { types: [], operator: '', designator: '', ...(out.get(e.prefix) || {}), fpl: e.fpl, learned: true }));
    return [...out.values()];
  }
  // Forme plan de vol corrigée à la main (ex. KETOUPA12 → KETOU12) : mémorisée pour la suite.
  function learnFpl(prefix, fplPrefix) {
    const p = clean(prefix), f = clean(fplPrefix);
    if (!p || !f || f.length >= p.length && f !== p) return false;
    const list = (read(LEARNED_KEY) || []).filter(e => e.prefix !== p);
    list.push({ prefix: p, fpl: f, updatedAt: new Date().toISOString() });
    write(LEARNED_KEY, list); return true;
  }
  function abbreviations() {
    const split = window.MissionModel.splitCallsign, prefixes = new Set(), map = new Map(); // abrégé → complet
    table().forEach(e => {
      if (clean(e.fpl) && clean(e.fpl) !== e.prefix) map.set(clean(e.fpl), e.prefix);
      // Autres formes vues (fautes, formes longues / courtes : RAYAK / RYAK, PELIC / PELICAN).
      (e.aliases || []).forEach(alias => { if (clean(alias) && clean(alias) !== e.prefix) map.set(clean(alias), e.prefix); });
    });
    known().forEach(a => a.callsigns.forEach(c => { const p = split(c).prefix; if (p) prefixes.add(p); }));
    prefixes.forEach(short => prefixes.forEach(full => {
      if (map.has(short) || [...map.values()].includes(short)) return;
      if (short.length >= 3 && full.length > short.length && full.startsWith(short)) map.set(short, map.get(full) || full);
    }));
    return map;
  }
  // Désignateur OACI de l'exploitant (OPR/ de la case 18) d'après l'organisme.
  const designatorOf = operator => {
    const key = up(operator).replace(/[’`]/g, "'");
    return Object.entries(window.MissionVocab?.operatorDesignators || {}).find(([name]) => up(name).replace(/[’`]/g, "'") === key)?.[1] || '';
  };
  const operatorOfDesignator = code => Object.entries(window.MissionVocab?.operatorDesignators || {}).find(([, d]) => d === clean(code))?.[0] || '';
  const canonicalPrefix = (prefix, map = abbreviations()) => map.get(up(prefix)) || up(prefix);
  const canonicalCallsign = (callsign, map = abbreviations()) => { const s = window.MissionModel.splitCallsign(callsign); return clean(canonicalPrefix(s.prefix, map) + s.number); };
  function fplCallsign(prefix, number, map = abbreviations()) {
    const p = clean(canonicalPrefix(prefix, map)), n = clean(number);
    // Table de correspondance : forme plan de vol de la série, toujours (PCAN31, DRAGO74).
    const entry = table().find(e => e.prefix === p);
    if (entry && clean(entry.fpl)) { const short = clean(entry.fpl); return ((short + n).length <= FPL_MAX ? short : short.slice(0, Math.max(1, FPL_MAX - n.length))) + n; }
    if ((p + n).length <= FPL_MAX) return p + n;
    const known = [...map].filter(([, full]) => full === p).map(([short]) => clean(short)).filter(s => (s + n).length <= FPL_MAX).sort((a, b) => b.length - a.length)[0];
    return (known || p.slice(0, Math.max(1, FPL_MAX - n.length))) + n;
  }

  // Base des indicatifs connus : indicatif (DRAGON, PELICAN, SAMU…) → numéros, appareils,
  // types et opérateurs associés (flotte DEFA + appareils des missions enregistrées) ;
  // les formes abrégées de plan de vol (DRAGO) sont rattachées à leur indicatif complet.
  function callsignSeries() {
    const split = window.MissionModel.splitCallsign, series = new Map(), map = abbreviations();
    known().forEach(a => a.callsigns.forEach(callsign => {
      const parts = split(callsign); if (!parts.prefix) return;
      const prefix = canonicalPrefix(parts.prefix, map), number = parts.number;
      const s = series.get(prefix) || { prefix, numbers: [], types: new Set(), operators: new Set(), abbreviations: new Set() };
      if (parts.prefix !== prefix) s.abbreviations.add(parts.prefix);
      if (s.numbers.some(n => n.number === number && n.registration === a.registration)) return; // DRAGON76 et DRAGO76 : un seul
      s.numbers.push({ number, callsign: prefix + number, fpl: fplCallsign(prefix, number, map), registration: a.registration, type: typeKey(a.type), operator: a.operator || '' });
      if (a.type) s.types.add(typeKey(a.type)); if (a.operator) s.operators.add(a.operator);
      series.set(prefix, s);
    }));
    // Séries de la table sans appareil connu (BENGALE, KETOUPA, FAF…).
    table().forEach(e => {
      const s = series.get(e.prefix) || { prefix: e.prefix, numbers: [], types: new Set(), operators: new Set(), abbreviations: new Set() };
      e.types.forEach(t => s.types.add(typeKey(t))); if (e.operator) s.operators.add(e.operator);
      if (clean(e.fpl) !== e.prefix) s.abbreviations.add(clean(e.fpl));
      Object.assign(s, { table: e }); series.set(e.prefix, s);
    });
    return [...series.values()].sort((a, b) => a.prefix.localeCompare(b.prefix));
  }
  const find = registration => known().find(a => regKey(a.registration) === regKey(registration)) || null;
  // Indicatif complet ou forme plan de vol (DRAGON76 / DRAGO76) : même appareil.
  const findByCallsign = callsign => { const map = abbreviations(), key = canonicalCallsign(callsign, map); const hits = known().filter(a => a.callsigns.some(c => canonicalCallsign(c, map) === key)); return hits.length === 1 ? hits[0] : null; };

  // Mémorise les appareils d'une mission enregistrée (équipements compris) et enrichit
  // la base de types avec les types inconnus.
  function recordMission(mission) {
    const registry = read(REGISTRY_KEY) || {}, date = mission?.metadata?.date || new Date().toISOString().slice(0, 10);
    (mission?.aircraft || []).forEach((a, index) => {
      if (!regKey(a.registration)) return;
      registry[regKey(a.registration)] = { registration: window.MissionModel.formatRegistration(a.registration), type: a.type || '', variant: a.variant || '', category: a.category || '', callsign: String(a.callsign || '').toUpperCase(), tacticalNumber: a.tacticalNumber || '', configuration: a.configuration || '', equipment: a.equipment || [], operator: (index === 0 && mission.organisation?.organisation) || registry[regKey(a.registration)]?.operator || '', date, updatedAt: new Date().toISOString() };
      if (a.type) enrichType(a.type, { model: a.variant || a.type, category: a.category });
    });
    write(REGISTRY_KEY, registry);
  }

  window.MissionAircraft = { regKey, categoryOf, lookupType, listTypes, enrichType, known, find, findByCallsign, recordMission, callsignSeries, typeKey, abbreviations, canonicalPrefix, canonicalCallsign, fplCallsign, FPL_MAX, table, learnFpl, designatorOf, operatorOfDesignator };
})();
