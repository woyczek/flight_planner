(() => {
  'use strict';
  // Mission Report Core — import du plan de vol déposé.
  //
  // Sources lisibles depuis une page statique (CORS ouvert, aucune connexion requise) :
  // - SimBrief : dernier OFP de l'utilisateur (identifiant ou n° dans le profil pilote) —
  //   appareil, équipements, route, points tournants, niveaux, METAR / TAF, masses, carburant ;
  // - IVAO : plan de vol du vol en cours (flux public whazzup, par VID) ;
  // - VATSIM : plan de vol du vol en cours ou déposé à l'avance (prefile), par CID.
  // Le plan de vol normalisé ne remplit que les champs vides ; les équipements OACI
  // (cases 10a / 10b) sont ajoutés aux équipements de l'appareil.
  const M = window.MissionModel, A = window.MissionAircraft;
  const up = v => String(v ?? '').trim().toUpperCase();
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const arr = v => (Array.isArray(v) ? v : v ? [v] : []);

  // Case 10a (équipements radio / navigation) et 10b (surveillance) → codes FPL_*.
  function equipmentCodes(equip, transponder, rules) {
    const out = new Set(), a = up(equip), b = up(transponder);
    const items = a.match(/[A-Z]\d?/g) || [];
    items.forEach(code => {
      const c = code[0];
      if (c === 'S') { out.add('FPL_VOR_ILS'); }
      if (c === 'L' || c === 'O') out.add('FPL_VOR_ILS');
      if (c === 'D') out.add('FPL_DME'); if (c === 'F') out.add('FPL_ADF'); if (c === 'G') out.add('FPL_GNSS');
      if (c === 'R') out.add('FPL_PBN'); if (c === 'W') out.add('FPL_RVSM'); if (c === 'Y') out.add('FPL_833');
      if (c === 'H') out.add('FPL_HF'); if (c === 'U') out.add('FPL_UHF'); if (c === 'J') out.add('FPL_CPDLC');
      if (c === 'E') out.add('FPL_ACARS'); if (c === 'M') out.add('FPL_SATCOM');
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
    return m ? { type: m[1], wake: m[2], equip: m[3], transponder: m[4] } : { type: up(text).split('/')[0] };
  }
  const remark = (remarks, key) => { const m = new RegExp(`(?:^|\\s)${key}/(\\S+)`).exec(up(remarks)); return m ? m[1] : ''; };
  // Niveau : F340 → FL340, A045 → 4500 ft, 33000 (VATSIM) → FL330.
  function level(value) {
    const v = up(value); let m;
    if ((m = /^F(\d{3})$/.exec(v)) || (m = /^FL(\d{3})$/.exec(v))) return `FL${m[1]}`;
    if ((m = /^A(\d{3})$/.exec(v))) return `${Number(m[1]) * 100} ft`;
    if ((m = /^(\d{3,5})$/.exec(v))) { const n = Number(m[1]); return n >= 10000 ? `FL${String(Math.round(n / 100)).padStart(3, '0')}` : `${n} ft`; }
    return v === 'VFR' ? 'VFR' : v;
  }
  const speed = value => { const v = up(value); let m; if ((m = /^N(\d{4})$/.exec(v))) return Number(m[1]); if ((m = /^K(\d{4})$/.exec(v))) return Math.round(Number(m[1]) / 1.852); return num(v); };
  const hhmm = seconds => seconds == null ? '' : `${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`;

  // ------------------------------------------------------------------ sources
  async function fromSimbrief(user) {
    const id = String(user || '').trim(); if (!id) throw new Error('simbrief-id');
    const url = `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=1`;
    const d = await (await fetch(url, { cache: 'no-store' })).json();
    if (!d?.origin) throw new Error(d?.fetch?.status || 'SimBrief');
    const text = d.atc?.flightplan_text || '', ac = splitAircraft(text), g = d.general || {};
    const alternate = arr(d.alternate)[0] || {};
    const fixes = arr(d.navlog?.fix).filter(f => f.ident && !['apt'].includes(f.type) && f.ident !== 'TOC' && f.ident !== 'TOD');
    const unit = /lb/i.test(d.params?.units) ? 'lb' : 'kg';
    const port = p => p?.icao_code ? { icao: up(p.icao_code), name: p.name || '', lat: num(p.pos_lat), lon: num(p.pos_long), elevation: num(p.elevation) } : null;
    return {
      source: 'SimBrief', callsign: up(d.atc?.callsign || `${g.icao_airline || ''}${g.flight_number || ''}`), type: up(d.aircraft?.icaocode || d.aircraft?.icao_code || ac.type),
      registration: up(d.aircraft?.reg), variant: d.aircraft?.name || '', equipment: equipmentCodes(d.aircraft?.equip || ac.equip, d.aircraft?.transponder || ac.transponder, 'I'),
      dep: up(d.origin?.icao_code), arr: up(d.destination?.icao_code), altn: up(alternate.icao_code), route: up(g.route),
      waypoints: fixes.map(f => up(f.ident)), altitude: level(g.initial_altitude), speed: num(g.cruise_tas), distanceNm: num(g.route_distance || g.air_distance),
      metar: d.origin?.metar || '', taf: d.origin?.taf || '', massTakeoff: num(d.weights?.est_tow), massLanding: num(d.weights?.est_ldw),
      fuel: { unit, start: num(d.fuel?.plan_ramp), taxi: num(d.fuel?.taxi), takeoff: num(d.fuel?.plan_takeoff), landing: num(d.fuel?.plan_landing), reserve: num(d.fuel?.reserve), diversion: num(d.fuel?.alternate_burn) },
      airports: [port(d.origin), port(d.destination), port(alternate)].filter(Boolean)
    };
  }
  async function fromIvao(vid) {
    const id = String(vid || '').trim(); if (!id) throw new Error('ivao-id');
    const data = await (await fetch('https://api.ivao.aero/v2/tracker/whazzup', { cache: 'no-store' })).json();
    const pilot = (data?.clients?.pilots || []).find(p => String(p.userId) === id);
    if (!pilot?.flightPlan) return null;
    const fp = pilot.flightPlan;
    return {
      source: 'IVAO', network: 'IVAO', callsign: up(pilot.callsign), type: up(fp.aircraft?.icaoCode || fp.aircraftId), variant: fp.aircraft?.model || '',
      registration: remark(fp.remarks, 'REG'), equipment: equipmentCodes(fp.aircraftEquipments, fp.aircraftTransponderTypes, fp.flightRules),
      dep: up(fp.departureId), arr: up(fp.arrivalId), altn: up(fp.alternativeId), route: up(fp.route).trim(), altitude: level(fp.level), speed: speed(fp.speed),
      pob: num(fp.peopleOnBoard), endurance: fp.endurance ? Math.round(fp.endurance / 60) : null, departureTime: hhmm(fp.departureTime), remarks: fp.remarks || ''
    };
  }
  async function fromVatsim(cid) {
    const id = String(cid || '').trim(); if (!id) throw new Error('vatsim-id');
    const data = await (await fetch('https://data.vatsim.net/v3/vatsim-data.json', { cache: 'no-store' })).json();
    const pilot = (data.pilots || []).find(p => String(p.cid) === id && p.flight_plan) || (data.prefiles || []).find(p => String(p.cid) === id);
    if (!pilot?.flight_plan) return null;
    const fp = pilot.flight_plan, ac = splitAircraft(fp.aircraft);
    const hm = v => { const s = String(v || '').padStart(4, '0'); return /^\d{4}$/.test(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(2)) : null; };
    return {
      source: `VATSIM${data.pilots?.includes(pilot) ? '' : ' (prefile)'}`, network: 'VATSIM', callsign: up(pilot.callsign), type: up(fp.aircraft_short || ac.type),
      registration: remark(fp.remarks, 'REG'), equipment: equipmentCodes(ac.equip, ac.transponder, fp.flight_rules),
      dep: up(fp.departure), arr: up(fp.arrival), altn: up(fp.alternate), route: up(fp.route), altitude: level(fp.altitude), speed: num(fp.cruise_tas),
      endurance: hm(fp.fuel_time), remarks: fp.remarks || ''
    };
  }

  // ------------------------------------------------------------ application
  // Remplit les champs vides de la mission ; renvoie la liste des chemins renseignés.
  function apply(mission, fpl) {
    const done = [];
    const set = (path, value) => {
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) return;
      const cur = M.get(mission, path); if (cur != null && cur !== '' && !(Array.isArray(cur) && !cur.length)) return;
      M.set(mission, path, value); done.push(path);
    };
    const item = mission.aircraft[0] || (mission.aircraft[0] = M.emptyAircraft());
    // Immatriculation du plan de vol (REG/FZBMM) → forme connue (F-ZBMM) si l'appareil existe.
    const known = fpl.registration ? A.find(fpl.registration) : null;
    set('aircraft.0.registration', known?.registration || fpl.registration);
    set('aircraft.0.callsign', fpl.callsign); set('aircraft.0.type', fpl.type);
    const type = A.lookupType(item.type || fpl.type);
    set('aircraft.0.variant', type?.model || fpl.variant); set('aircraft.0.category', type?.category);
    set('aircraft.0.baseDeparture', fpl.dep); set('aircraft.0.baseReturn', fpl.arr);
    set('aircraft.0.massTakeoff', fpl.massTakeoff); set('aircraft.0.massLanding', fpl.massLanding);
    set('aircraft.0.enduranceMinutes', fpl.endurance);
    if (fpl.equipment?.length) {
      const before = (item.equipment || []).length;
      item.equipment = [...new Set([...(item.equipment || []), ...fpl.equipment])];
      if (item.equipment.length !== before) done.push('aircraft.0.equipment');
    }
    set('navigation.dep', fpl.dep); set('navigation.arr', fpl.arr); set('navigation.altn', fpl.altn); set('navigation.route', fpl.route);
    set('navigation.waypoints', (fpl.waypoints?.length ? fpl.waypoints : window.MissionAssist?.routePoints(fpl.route) || []).join('\n'));
    set('navigation.altitude', fpl.altitude); set('navigation.speed', fpl.speed); set('navigation.distanceNm', fpl.distanceNm);
    set('environment.metar', fpl.metar); set('environment.taf', fpl.taf);
    if (fpl.fuel && (mission.fuel.start == null)) { set('fuel.unit', fpl.fuel.unit); mission.fuel.unit = fpl.fuel.unit; ['start', 'taxi', 'takeoff', 'landing', 'reserve', 'diversion'].forEach(k => set(`fuel.${k}`, fpl.fuel[k])); }
    if (fpl.network) set('network.onlineNetwork', fpl.network);
    (fpl.airports || []).forEach(a => window.MissionAssist?.remember(a));
    return done;
  }

  window.MissionFpl = { fromSimbrief, fromIvao, fromVatsim, apply, equipmentCodes, splitAircraft, level };
})();
