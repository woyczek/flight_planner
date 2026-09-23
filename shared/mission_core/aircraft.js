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
  const db = () => window.AIRCRAFT_DB || {};
  // Classe OACI (Doc 8643) : H2T → hélicoptère, L2J → avion, A/S → amphibie / hydravion.
  const categoryOf = description => ({ H: 'rotary', G: 'rotary', T: 'rotary', L: 'fixed', A: 'amphibious', S: 'amphibious' })[String(description || '').charAt(0).toUpperCase()] || '';
  const localTypes = () => read(TYPES_KEY) || {};
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
  const FIELDS = ['registration', 'type', 'variant', 'category', 'callsign', 'tacticalNumber', 'configuration', 'equipment'];
  // Fusion par immatriculation, du plus ancien au plus récent : chaque champ non vide
  // écrase la valeur précédente → « la dernière en date ».
  function known() {
    const byReg = new Map();
    sources().filter(r => regKey(r.registration)).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach(record => {
      const key = regKey(record.registration), current = byReg.get(key) || { registration: String(record.registration).toUpperCase(), callsigns: [] };
      FIELDS.forEach(field => {
        const value = record[field];
        if (Array.isArray(value) ? value.length : value !== undefined && value !== null && String(value).trim() !== '') current[field] = field === 'registration' || field === 'callsign' ? String(value).toUpperCase() : value;
      });
      if (record.callsign && !current.callsigns.includes(String(record.callsign).toUpperCase())) current.callsigns.push(String(record.callsign).toUpperCase());
      current.date = record.date || current.date;
      if (!current.category && current.type) current.category = lookupType(current.type)?.category || '';
      byReg.set(key, current);
    });
    return [...byReg.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }
  const find = registration => known().find(a => regKey(a.registration) === regKey(registration)) || null;
  const findByCallsign = callsign => { const key = regKey(callsign); const hits = known().filter(a => a.callsigns.some(c => regKey(c) === key)); return hits.length === 1 ? hits[0] : null; };

  // Mémorise les appareils d'une mission enregistrée (équipements compris) et enrichit
  // la base de types avec les types inconnus.
  function recordMission(mission) {
    const registry = read(REGISTRY_KEY) || {}, date = mission?.metadata?.date || new Date().toISOString().slice(0, 10);
    (mission?.aircraft || []).forEach(a => {
      if (!regKey(a.registration)) return;
      registry[regKey(a.registration)] = { registration: String(a.registration).toUpperCase(), type: a.type || '', variant: a.variant || '', category: a.category || '', callsign: String(a.callsign || '').toUpperCase(), tacticalNumber: a.tacticalNumber || '', configuration: a.configuration || '', equipment: a.equipment || [], date, updatedAt: new Date().toISOString() };
      if (a.type) enrichType(a.type, { model: a.variant || a.type, category: a.category });
    });
    write(REGISTRY_KEY, registry);
  }

  window.MissionAircraft = { regKey, categoryOf, lookupType, listTypes, enrichType, known, find, findByCallsign, recordMission };
})();
