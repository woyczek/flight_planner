// V3 frame/lib (propriétaire : Features SOG ; modules/missions et Carburant s'en servent) — les missions V2 lues telles qu'elles sont
// (modules/missions/SPEC.md § 2, § 4), en calcul pur : un fichier mission<ID>.yaml déjà lu (objet de js-yaml), une ligne du registre
// missions/mission_registry.yaml, le vol qu'une mission donne à Carburant. Ni page, ni stockage, ni réseau : l'appelant lit les
// fichiers (ctx.data) et le YAML (frame/lib/js-yaml.min.js, le lecteur du cadre).
//
// API :
//   readMission(doc) → mission { id, type, subtype, title, summary, organisation, operation, origin, destination, target, points,
//     routeOrder, aircraft, cruiseLevelFt, cruiseSpeedKt, estimate, notes, constraints, risks } ; null sans mission.id ou
//     mission.type (seuls champs exigés). origin / destination / target : { name, icao, lat, lon } ou null ; points : { id → { id,
//     name, lat, lon, kind } } (tournants, rendez-vous, zones par leur centre, cible).
//   readRegistry(doc) → [ligne { id, family, title, operation, types, origin, destination, originIcao, destinationIcao, blockMin,
//     folder, file, organisation }] : les lignes du registre, les organisations (…Z) marquées.
//   icaoOf(name) : le code OACI entre parenthèses à la fin d'un nom (« BA 118 Mont-de-Marsan (LFBM) » → « LFBM ») ; '' sinon.
//   levelFt(text) : « FL240 » → 24000, « 1500 ft » → 1500, un nombre tel quel ; null sinon.
//   missionFlight(mission, assignment) → { route: { dep, arr, points }, aircraft: { type, registration }, levelFt, speedKt, mission }
//     (le vol que Carburant pose ; § 4 de la SPEC) ; null sans mission.

/** Un texte nettoyé (blancs repliés), '' pour rien. */
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
/** Un nombre fini, ou null. */
const num = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v;

/** Le code OACI à la fin d'un nom (voir l'en-tête). */
export function icaoOf(name) {
  const m = /\(([A-Z]{4})\)\s*$/.exec(clean(name).toUpperCase());
  return m ? m[1] : '';
}

/** Un niveau écrit (voir l'en-tête). */
export function levelFt(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  const s = clean(text).toUpperCase().replace(/\s/g, '');
  let m = /^FL(\d{2,3})$/.exec(s);
  if (m) return +m[1] * 100;
  m = /^(\d+(?:\.\d+)?)(FT)?$/.exec(s);
  return m ? Math.round(+m[1]) : null;
}

/** Un lieu de la mission (origine, destination, cible…) : { name, icao, lat, lon }, ou null sans nom ni position. */
const placeOf = p => {
  if (!p || typeof p !== 'object') return null;
  const name = clean(p.name),
    lat = num(p.lat),
    lon = num(p.lon);
  return name || lat !== null ? {
    name,
    icao: icaoOf(name),
    lat,
    lon
  } : null;
};

/** Le centre d'une zone : son centre écrit, sinon la moyenne de ses sommets ; null sinon. */
const centreOf = z => {
  const c = z?.centre || z?.center;
  if (c && num(c.lat) !== null) return [num(c.lat), num(c.lon)];
  if (num(z?.lat) !== null) return [num(z.lat), num(z.lon)];
  const pts = (z?.points || z?.polygon || z?.vertices || []).filter(p => num(p?.lat) !== null && num(p?.lon) !== null);
  return pts.length ? [pts.reduce((a, p) => a + +p.lat, 0) / pts.length, pts.reduce((a, p) => a + +p.lon, 0) / pts.length] : null;
};

/** Une liste de textes (une chaîne, une liste, ou rien). */
const texts = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => typeof x === 'string' ? clean(x) : clean(x?.text || x?.description || ''))
  .filter(Boolean);

/** Une mission lue (voir l'en-tête). */
export function readMission(doc) {
  const d = doc && typeof doc === 'object' ? doc : {},
    m = d.mission || {},
    id = clean(m.id),
    type = clean(m.type);
  if (!id || !type) return null;
  const points = {},
    add = (p, kind) => {
      const pid = clean(p?.id);
      if (!pid || num(p?.lat) === null || num(p?.lon) === null) return;
      points[pid] = {
        id: pid,
        name: clean(p.name),
        lat: +p.lat,
        lon: +p.lon,
        kind
      };
    };
  (d.turning_points || []).forEach(p => add(p, 'turn'));
  (Array.isArray(d.rendezvous) ? d.rendezvous : d.rendezvous ? [d.rendezvous] : []).forEach(p => add(p, 'rdv'));
  (d.zones || []).forEach(z => {
    const c = centreOf(z);
    if (c) add({
      id: z.id,
      name: z.name,
      lat: c[0],
      lon: c[1]
    }, 'zone');
  });
  if (d.target) add(d.target, 'target');
  // l'appareil : le bloc aircraft ; sinon (forme minimale, comme M-001) les équipes dont le type a la forme d'un indicatif OACI (« H135 »)
  let ac = (Array.isArray(d.aircraft) ? d.aircraft : d.aircraft ? [d.aircraft] : []).filter(a => a && typeof a === 'object');
  if (!ac.length) ac = (Array.isArray(d.teams) ? d.teams : []).filter(t => /^[A-Z][A-Z0-9]{1,3}$/.test(clean(t?.type).split(' ')[0])).map(
    t => ({
      type: t.type,
      callsign: t.name
    }));
  return {
    id,
    type,
    subtype: clean(m.subtype),
    title: clean(d.title),
    summary: String(d.summary ?? '').trim(),
    organisation: m.role === 'organisation' || /Z$/.test(id),
    operation: d.operation && typeof d.operation === 'object' ? {
      id: clean(d.operation.id),
      name: clean(d.operation.name)
    } : null,
    origin: placeOf(d.origin),
    destination: placeOf(d.destination),
    target: placeOf(d.target),
    points,
    routeOrder: (Array.isArray(d.route_order) ? d.route_order : []).map(x => clean(typeof x === 'object' ? x?.id : x)).filter(Boolean),
    aircraft: ac.map(a => ({
      type: clean(a.type || a.icao).split(' ')[0].toUpperCase(),
      role: clean(a.role),
      callsign: clean(a.callsign)
    })),
    cruiseLevelFt: levelFt(d.cruise_level ?? ac[0]?.cruise_level),
    cruiseSpeedKt: num(d.cruise_speed_kt ?? ac[0]?.cruise_speed_kt),
    estimate: {
      flightMin: num(d.timing?.estimated_flight_min),
      blockMin: num(d.timing?.estimated_block_min)
    },
    notes: texts(d.notes),
    constraints: texts(d.payload?.constraints),
    risks: texts(d.risks)
  };
}

/** Les lignes du registre (voir l'en-tête). */
export function readRegistry(doc) {
  return (Array.isArray(doc?.missions) ? doc.missions : []).filter(x => x && clean(x.id)).map(x => {
    const id = clean(x.id);
    return {
      id,
      family: clean(x.family || x.type),
      title: clean(x.title),
      operation: clean(x.operation?.name),
      types: (x.aircraftTypes || x.teamTypes || []).map(clean).filter(Boolean),
      origin: clean(x.origin),
      destination: clean(x.destination),
      originIcao: icaoOf(x.origin),
      destinationIcao: icaoOf(x.destination),
      blockMin: num(x.estimate?.block),
      folder: clean(x.folder),
      file: clean((x.files || [])[0]) || `mission${id}.yaml`,
      organisation: x.organisation === true || /Z$/.test(id)
    };
  });
}

/** Le vol qu'une mission donne à Carburant (voir l'en-tête). */
export function missionFlight(mission, assignment = null) {
  if (!mission) return null;
  const a = assignment || {},
    dep = mission.origin?.icao || clean(a.departure).toUpperCase() || '',
    arr = mission.destination?.icao || mission.origin?.icao || '',
    order = mission.routeOrder.length ? mission.routeOrder : Object.keys(mission.points),
    points = order.map(id => mission.points[id]).filter(Boolean).map(p => ({
      id: p.id,
      lat: p.lat,
      lon: p.lon,
      name: p.name
    }));
  return {
    route: {
      dep,
      arr,
      points
    },
    aircraft: {
      type: mission.aircraft[0]?.type || clean(a.aircraft?.type).toUpperCase() || '',
      registration: clean(a.aircraft?.registration).toUpperCase()
    },
    levelFt: mission.cruiseLevelFt,
    speedKt: mission.cruiseSpeedKt,
    mission: mission.id
  };
}
