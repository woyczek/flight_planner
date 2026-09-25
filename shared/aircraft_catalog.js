(() => {
  'use strict';
  // Catalogue d'aéronefs commun aux trois applications (CR DEFA, Landing Performance
  // Dashboard, Flight Planner) — chargé juste après AircraftDB/aircraft_db.js :
  //   · types : base OACI (aircraft_db.js, avec les modifications de la page Paramétrage plus
  //     récentes que le fichier), types ajoutés
  //     localement dans les CR (missionAircraftTypes:v1) — fusionnés dans window.AIRCRAFT_DB :
  //     toutes les pages voient les mêmes types ;
  //   · appareils DEFA : flotte (aircraft_fleet.js), référence DEFA anonymisée (defa_reference.js),
  //     appareils des missions enregistrées, journal DEFA chargé — base « lâche » : aide à la
  //     saisie, jamais une contrainte (un appareil absent reste saisissable).
  const read = key => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  /** Clé de comparaison : majuscules, lettres et chiffres seulement. */
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Plus de types écrits dans le code : les types de la flotte DEFA viennent de la base OACI (aircraft_db.js, liste
  // officielle Doc 8643 via AircraftDB/update_aircraft_db.py), les codes propres à la DEFA (E2C, RQ9P) y sont des
  // alias (aircraft_overrides.json). Objet vide gardé pour les modules qui le lisent encore.
  const SUPPLEMENT = {};

  // ---- types : base commune enrichie (en place : les pages gardent leur lecture de AIRCRAFT_DB)
  const file = window.AIRCRAFT_DB || (window.AIRCRAFT_DB = {});
  const override = read('dataOverride:aircraftDb:v1');
  if (override?.data && override.updatedAt > String(file.__meta?.admin_saved || '')) Object.assign(file, override.data);
  /** Ajoute un type à window.AIRCRAFT_DB s'il n'y est pas déjà (ni en alias) ; local : origine de l'ajout (supplément, type ajouté dans un CR). */
  const addType = (code, entry, local) => {
    const k = key(code);
    if (!k || file[k] || file.__aliases?.[k]) return;
    file[k] = {
      tdesig: k,
      model: entry.model || '',
      category: entry.category || '',
      wtc: entry.wtc || '',
      description: entry.category === 'rotary' ? 'H' : entry.category === 'amphibious' ? 'A' : entry.category === 'fixed' ? 'L' : '',
      local
    };
  };
  Object.entries(read('missionAircraftTypes:v1') || {}).forEach(([code, entry]) => addType(code, entry || {}, 'local'));

  // ---- appareils DEFA (par immatriculation ; la donnée la plus récente l'emporte)
  function defaAircraft() {
    const out = new Map();
    // Fusions mémorisées (fiche appareil › fusionner) : A → B.
    const map = (read('missionMergeMap:v1') || {}).aircraft || {};
    /** Immatriculation normalisée, ramenée à celle de la flotte quand un indicatif la désigne. */
    const mapped = reg => {
      let k = key(reg);
      for (let i = 0; i < 5 && map[k]; i++) k = map[k];
      return k;
    };
    /** Fusionne un appareil (flotte, référence, missions) dans le catalogue : la donnée la plus récente l'emporte, champs vides complétés. */
    const merge = (r, date = '') => {
      const k = mapped(r.registration);
      if (!k) return;
      const cur = out.get(k) || {
        registration: k === key(r.registration) ? r.registration : (/^[A-Z]{5}$/.test(k) ? `${k[0]}-${k.slice(1)}` : k),
        callsigns: [],
        sources: []
      };
      const newer = String(date) >= String(cur.date || '');
      ['type', 'variant', 'operator', 'base', 'homeAd', 'fleetId', 'category'].forEach(f => {
        if (r[f] && (newer || !cur[f])) cur[f] = r[f];
      });
      if (r.lastAd && newer) cur.lastAd = r.lastAd;
      [r.callsign, ...(r.callsigns || [])].filter(Boolean).forEach(c => {
        const u = String(c).toUpperCase();
        if (!cur.callsigns.includes(u)) cur.callsigns.push(u);
      });
      if (date > String(cur.date || '')) cur.date = date;
      if (r.source && !cur.sources.includes(r.source)) cur.sources.push(r.source);
      out.set(k, cur);
    };
    (window.DEFA_FLEET || []).forEach(r => merge({
      ...r,
      homeAd: r.base,
      source: 'fleet'
    }, '0000'));
    (window.DEFA_REFERENCE?.aircraft || []).forEach(r => merge({
      ...r,
      source: 'reference'
    }, r.last || ''));
    Object.values(read('missionAircraftRegistry:v1') || {}).forEach(r => merge({
      ...r,
      source: 'missions'
    }, r.date || ''));
    ((read('defaFlightLog:v1') || {}).records || []).forEach(r => merge({
      registration: r.registration,
      type: r.type,
      variant: r.variant,
      callsign: r.callsign,
      lastAd: r.arr || r.dep,
      source: 'log'
    }, `${r.date} ${r.time || ''}`));
    return [...out.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }
  // Types employés par la DEFA (avec leurs appareils) : Planner, Landing, reportings.
  function defaTypes() {
    const out = new Map();
    defaAircraft().forEach(a => {
      const code = key(a.type);
      if (!code) return;
      const resolved = key(file.__aliases?.[code] || code),
        t = out.get(resolved) || {
          type: resolved,
          model: file[resolved]?.model || '',
          registrations: []
        };
      t.registrations.push(a.registration);
      out.set(resolved, t);
    });
    return [...out.values()].sort((a, b) => a.type.localeCompare(b.type));
  }
  /** Pilotes de la référence DEFA (trigrammes, activité). */
  const pilots = () => window.DEFA_REFERENCE?.pilots || [];

  window.AircraftCatalog = {
    SUPPLEMENT,
    defaAircraft,
    defaTypes,
    pilots,
    key
  };
})();
