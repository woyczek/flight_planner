(() => {
  'use strict';
  // Catalogue d'aéronefs commun aux trois applications (CR DEFA, Landing Performance
  // Dashboard, Flight Planner) — chargé juste après AircraftDB/aircraft_db.js :
  //   · types : base OACI (aircraft_db.js, avec les modifications de la page Paramétrage plus
  //     récentes que le fichier), types militaires absents de la base (SUPPLEMENT), types ajoutés
  //     localement dans les CR (missionAircraftTypes:v1) — fusionnés dans window.AIRCRAFT_DB :
  //     toutes les pages voient les mêmes types ;
  //   · appareils DEFA : flotte (aircraft_fleet.js), référence DEFA anonymisée (defa_reference.js),
  //     appareils des missions enregistrées, journal DEFA chargé — base « lâche » : aide à la
  //     saisie, jamais une contrainte (un appareil absent reste saisissable).
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Types de la flotte DEFA absents de la base OACI importée.
  const SUPPLEMENT = {
    H160: { tdesig: 'H160', model: 'Airbus Helicopters H160', category: 'rotary', wtc: 'L' },
    CL2T: { tdesig: 'CL2T', model: 'Canadair CL-415 / CL-215T', category: 'amphibious', wtc: 'M' },
    AS32: { tdesig: 'AS32', model: 'AS332 Super Puma / H215', category: 'rotary', wtc: 'M' },
    AS55: { tdesig: 'AS55', model: 'AS555 Fennec', category: 'rotary', wtc: 'L' },
    CP10: { tdesig: 'CP10', model: 'Mudry CAP 10', category: 'fixed', wtc: 'L' },
    E121: { tdesig: 'E121', model: 'Embraer EMB-121 Xingu', category: 'fixed', wtc: 'L' },
    E2C: { tdesig: 'E2C', model: 'Northrop Grumman E-2C Hawkeye', category: 'fixed', wtc: 'M' },
    E3CF: { tdesig: 'E3CF', model: 'Boeing E-3F Sentry', category: 'fixed', wtc: 'H' },
    EC20: { tdesig: 'EC20', model: 'EC120 Colibri', category: 'rotary', wtc: 'L' },
    EC25: { tdesig: 'EC25', model: 'EC225 / H225 Caracal', category: 'rotary', wtc: 'M' },
    GAZL: { tdesig: 'GAZL', model: 'SA341 / SA342 Gazelle', category: 'rotary', wtc: 'L' },
    MIR2: { tdesig: 'MIR2', model: 'Dassault Mirage 2000', category: 'fixed', wtc: 'M' },
    NH90: { tdesig: 'NH90', model: 'NH Industries NH90 Caïman', category: 'rotary', wtc: 'M' },
    PC21: { tdesig: 'PC21', model: 'Pilatus PC-21', category: 'fixed', wtc: 'L' },
    PC6T: { tdesig: 'PC6T', model: 'Pilatus PC-6 Turbo Porter', category: 'fixed', wtc: 'L' },
    PUMA: { tdesig: 'PUMA', model: 'SA330 Puma', category: 'rotary', wtc: 'M' },
    RFAL: { tdesig: 'RFAL', model: 'Dassault Rafale', category: 'fixed', wtc: 'M' },
    RQ9P: { tdesig: 'RQ9P', model: 'General Atomics MQ-9 Reaper (drone)', category: 'fixed', wtc: 'L' },
    TBM7: { tdesig: 'TBM7', model: 'Daher TBM 700', category: 'fixed', wtc: 'L' },
    TIGR: { tdesig: 'TIGR', model: 'Airbus Helicopters Tigre', category: 'rotary', wtc: 'L' }
  };

  // ---- types : base commune enrichie (en place : les pages gardent leur lecture de AIRCRAFT_DB)
  const file = window.AIRCRAFT_DB || (window.AIRCRAFT_DB = {});
  const override = read('dataOverride:aircraftDb:v1');
  if (override?.data && override.updatedAt > String(file.__meta?.admin_saved || '')) Object.assign(file, override.data);
  const addType = (code, entry, local) => {
    const k = key(code); if (!k || file[k] || file.__aliases?.[k]) return;
    file[k] = { tdesig: k, model: entry.model || '', category: entry.category || '', wtc: entry.wtc || '', description: entry.category === 'rotary' ? 'H' : entry.category === 'amphibious' ? 'A' : entry.category === 'fixed' ? 'L' : '', local };
  };
  Object.entries(SUPPLEMENT).forEach(([code, entry]) => addType(code, entry, 'supplement'));
  Object.entries(read('missionAircraftTypes:v1') || {}).forEach(([code, entry]) => addType(code, entry || {}, 'local'));

  // ---- appareils DEFA (par immatriculation ; la donnée la plus récente l'emporte)
  function defaAircraft() {
    const out = new Map();
    // Fusions mémorisées (fiche appareil › fusionner) : A → B.
    const map = (read('missionMergeMap:v1') || {}).aircraft || {};
    const mapped = reg => { let k = key(reg); for (let i = 0; i < 5 && map[k]; i++) k = map[k]; return k; };
    const merge = (r, date = '') => {
      const k = mapped(r.registration); if (!k) return;
      const cur = out.get(k) || { registration: k === key(r.registration) ? r.registration : (/^[A-Z]{5}$/.test(k) ? `${k[0]}-${k.slice(1)}` : k), callsigns: [], sources: [] };
      const newer = String(date) >= String(cur.date || '');
      ['type', 'variant', 'operator', 'base', 'homeAd', 'fleetId', 'category'].forEach(f => { if (r[f] && (newer || !cur[f])) cur[f] = r[f]; });
      if (r.lastAd && newer) cur.lastAd = r.lastAd;
      [r.callsign, ...(r.callsigns || [])].filter(Boolean).forEach(c => { const u = String(c).toUpperCase(); if (!cur.callsigns.includes(u)) cur.callsigns.push(u); });
      if (date > String(cur.date || '')) cur.date = date;
      if (r.source && !cur.sources.includes(r.source)) cur.sources.push(r.source);
      out.set(k, cur);
    };
    (window.DEFA_FLEET || []).forEach(r => merge({ ...r, homeAd: r.base, source: 'fleet' }, '0000'));
    (window.DEFA_REFERENCE?.aircraft || []).forEach(r => merge({ ...r, source: 'reference' }, r.last || ''));
    Object.values(read('missionAircraftRegistry:v1') || {}).forEach(r => merge({ ...r, source: 'missions' }, r.date || ''));
    ((read('defaFlightLog:v1') || {}).records || []).forEach(r => merge({ registration: r.registration, type: r.type, variant: r.variant, callsign: r.callsign, lastAd: r.arr || r.dep, source: 'log' }, `${r.date} ${r.time || ''}`));
    return [...out.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }
  // Types employés par la DEFA (avec leurs appareils) : Planner, Landing, reportings.
  function defaTypes() {
    const out = new Map();
    defaAircraft().forEach(a => {
      const code = key(a.type); if (!code) return;
      const resolved = key(file.__aliases?.[code] || code), t = out.get(resolved) || { type: resolved, model: file[resolved]?.model || '', registrations: [] };
      t.registrations.push(a.registration); out.set(resolved, t);
    });
    return [...out.values()].sort((a, b) => a.type.localeCompare(b.type));
  }
  const pilots = () => window.DEFA_REFERENCE?.pilots || [];

  window.AircraftCatalog = { SUPPLEMENT, defaAircraft, defaTypes, pilots, key };
})();
