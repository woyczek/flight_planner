// V3 report — « mon dernier vol » IVAO et VATSIM, porté du lanceur V2 (tools/launch.py : ivao_last_flight,
// vatsim_last_flight, _fpl_text, _ivao_same_flight, _vatsim_level) en JavaScript pur : les appels passent par getJson
// (ctx.net du module ; avec un lanceur, IVAO reçoit sa clé et VATSIM son relais, sans que la page voie la clé). Même
// sortie que la route du lanceur : liste des vols des 7 derniers jours (un vol coupé par des déconnexions = une entrée),
// puis le détail d'un vol au format de text_import.js (kind 'ivao-details' : indicatif, terrains, connexion,
// déconnexion, trace, plan de vol OACI). Ni page, ni stockage.
const IVAO = 'https://api.ivao.aero/v2',
  VATSIM = 'https://api.vatsim.net/v2',
  DAYS = 7;

/** Fenêtre glissante des 7 derniers jours (UTC) : [début, fin] en ISO à la seconde. */
function since(days = DAYS) {
  const now = new Date(),
    iso = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return [iso(new Date(now - days * 864e5)), iso(now)];
}
/** Durée ou heure en secondes → « HHMM » ; '' sans valeur. */
function hhmm(seconds) {
  const m = Math.floor(Number(seconds) / 60);
  return Number.isFinite(m) && m >= 0 ? `${String(Math.floor(m / 60) % 100).padStart(2, '0')}${String(m % 60).padStart(2, '0')}` : '';
}
/** Champ de plan de vol sans tiret (séparateur des cases OACI), parenthèse ni retour à la ligne. */
const clean = v => String(v ?? '').replace(/[-()]/g, ' ').replace(/\s+/g, ' ').trim();
/** Plan de vol au format OACI « (FPL-…) », lu ensuite par text_import.js › parseFpl (comme un plan collé). */
function fplText({
  callsign,
  rules,
  ftype,
  acft,
  count = 1,
  wake = '',
  equip = '',
  dep = '',
  eobt = '',
  speed = '',
  level = '',
  route = '',
  arr = '',
  eet = '',
  altn = '',
  altn2 = '',
  item18 = '',
  endurance = '',
  pob = null
}) {
  const c = clean,
    item9 = `${(count || 1) > 1 ? `${count}/` : ''}${c(acft) || 'ZZZZ'}${wake ? `/${c(wake)}` : ''}`,
    item19 = [endurance ? `E/${endurance}` : '', pob ? `P/${pob}` : ''].filter(Boolean).join(' '),
    parts = [`FPL-${c(callsign)}`, `${c(rules).slice(0, 1) || 'I'}${c(ftype).slice(0, 1)}`, item9, c(equip) || 'Z/Z',
      `${c(dep) || 'ZZZZ'}${eobt}`, `${c(speed)}${c(level)} ${c(route)}`.trim(), [`${c(arr) || 'ZZZZ'}${eet}`, c(altn), c(altn2)]
      .filter(Boolean).join(' '), c(item18) || '0'
    ];
  if (item19) parts.push(item19);
  return '(' + parts.join(' -') + ')';
}
/** Distance en milles nautiques entre deux points de trace IVAO. */
function nm(a, b) {
  const r = Math.PI / 180,
    h = Math.sin((b.latitude - a.latitude) * r / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin((b.longitude -
      a.longitude) * r / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Lecteur IVAO : getJson(url) → objet ; traces des sessions terminées gardées le temps de la lecture. */
function ivaoReader(getJson) {
  const tracks = new Map();
  /** Points d'une session dans l'ordre (timestamp, latitude, longitude, altitude, groundSpeed, onGround, state). */
  const points = async sid => {
    if (tracks.has(sid)) return tracks.get(sid);
    const got = await getJson(`${IVAO}/tracker/sessions/${sid}/tracks`),
      pts = (Array.isArray(got) ? got : []).filter(t => t.timestamp && t.latitude != null).sort((a, b) => String(a.timestamp)
        .localeCompare(
          String(b.timestamp)));
    tracks.set(sid, pts);
    return pts;
  };
  /** Sessions consécutives a puis b : même vol coupé par une déconnexion ? (même indicatif, b ouverte au plus 30 min
   *  après la fin de a, a qui ne finit pas au parking, b qui reprend là où a s'est arrêtée à 600 kt au plus). */
  const sameFlight = async (a, b) => {
    if (!a.completedAt || a.callsign !== b.callsign) return false;
    const gap = (Date.parse(b.createdAt) - Date.parse(a.completedAt)) / 1000;
    if (!(gap >= -60 && gap <= 1800)) return false;
    const pa = await points(String(a.id)),
      pb = await points(String(b.id));
    if (!pa.length || !pb.length || String(pa.at(-1).state || '') === 'On Blocks') return false;
    return nm(pa.at(-1), pb[0]) <= 5 + Math.max(gap, 0) / 3600 * 600;
  };
  return {
    points,
    sameFlight
  };
}

/** Vols IVAO des 7 derniers jours du VID : { flights: [{ id ('a,b,c' : ses sessions), sessions, callsign, dep, arr,
 *  start, end, open, trackerUrl }], id, from, to } ; le plus récent d'abord. */
export async function ivaoFlights(getJson, vid) {
  const [from, to] = since(),
    items = [],
    R = ivaoReader(getJson);
  for (let page = 1; page <= 5; page++) {
    const got = await getJson(`${IVAO}/tracker/sessions?${new URLSearchParams({ userId: vid, connectionType: 'PILOT', perPage: 50, page, from, to })}`) || {};
    items.push(...(got.items || []));
    if (page >= Number(got.pages || 1)) break;
  }
  const groups = [];
  for (const s of items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))))
    if (groups.length && await R.sameFlight(groups.at(-1).at(-1), s)) groups.at(-1).push(s);
    else groups.push([s]);
  const flights = groups.map(g => {
    const last = g.at(-1),
      fp = [...(last.flightPlans || [])].sort((a, b) => (a.revision || 0) - (b.revision || 0)).at(-1) || {};
    return {
      id: g.map(x => x.id).join(','),
      sessions: g.length,
      callsign: last.callsign || '',
      dep: fp.departureId || '',
      arr: fp.arrivalId || '',
      start: g[0].createdAt,
      end: last.completedAt,
      open: !last.completedAt,
      trackerUrl: `https://tracker.ivao.aero/sessions/${last.id}`
    };
  });
  return {
    flights: flights.sort((a, b) => String(b.start || '').localeCompare(String(a.start || ''))),
    id: vid,
    from,
    to
  };
}

/** Détail d'un vol IVAO (sessions 'a,b,c' dans l'ordre) au format de text_import.js : traces mises bout à bout, plan
 *  complet de la dernière révision de la dernière session. */
export async function ivaoFlight(getJson, session) {
  const sids = String(session).split(','),
    R = ivaoReader(getJson),
    metas = [];
  for (const sid of sids) metas.push(await getJson(`${IVAO}/tracker/sessions/${sid}`));
  const s = metas.at(-1),
    first = metas[0],
    fps = await getJson(`${IVAO}/tracker/sessions/${sids.at(-1)}/flightPlans`),
    fp = (Array.isArray(fps) ? fps : []).sort((a, b) => (a.revision || 0) - (b.revision || 0)).at(-1) || null,
    samples = [];
  for (const m of metas)
    for (const t of await R.points(String(m.id))) samples.push({
      time: new Date(t.timestamp),
      lat: t.latitude,
      lon: t.longitude,
      alt: t.altitude,
      gs: t.groundSpeed,
      onGround: t.onGround,
      state: t.state
    });
  const ids = xs => (xs || []).map(x => x && typeof x === 'object' ? String(x.id || '') : String(x)).join(''),
    equip = fp ? [ids(fp.aircraftEquipments), ids(fp.aircraftTransponderTypes)].filter(Boolean).join('/') : '',
    url = m => `https://tracker.ivao.aero/sessions/${m.id}`;
  return {
    kind: 'ivao-details',
    source: 'IVAO',
    network: 'IVAO',
    sessionIds: metas.map(m => m.id),
    callsign: s.callsign || '',
    dep: fp?.departureId || '',
    arr: fp?.arrivalId || '',
    connected: first.createdAt ? new Date(first.createdAt) : null,
    disconnected: s.completedAt ? new Date(s.completedAt) : null,
    open: !s.completedAt,
    samples,
    equipKnown: !!equip,
    trackerUrl: url(s),
    fplText: fp ? fplText({
      callsign: s.callsign,
      rules: fp.flightRules,
      ftype: fp.flightType,
      acft: fp.aircraftId,
      count: fp.aircraftNumber || 1,
      wake: String(fp.aircraft?.wakeTurbulence || '').slice(0, 1),
      equip,
      dep: fp.departureId,
      eobt: hhmm(fp.departureTime),
      speed: fp.speed,
      level: fp.level,
      route: fp.route,
      arr: fp.arrivalId,
      eet: hhmm(fp.eet),
      altn: fp.alternativeId,
      altn2: fp.alternative2Id,
      item18: fp.remarks,
      endurance: hhmm(fp.endurance),
      pob: fp.peopleOnBoard
    }) : ''
  };
}

/** Altitude d'un plan VATSIM (« 24000 », « FL240 », « A045 », « VFR ») → niveau OACI (F240, A045, VFR). */
function vatsimLevel(v) {
  v = String(v ?? '').trim().toUpperCase();
  if (/^(FL|F)\d{2,3}$/.test(v)) return 'F' + v.replace(/^FL?/, '').padStart(3, '0');
  if (/^\d{3,5}$/.test(v)) {
    const n = +v;
    return n >= 1000 ? `F${String(Math.floor(n / 100)).padStart(3, '0')}` : `F${String(n).padStart(3, '0')}`;
  }
  return v;
}
/** Connexions de pilote VATSIM des 7 derniers jours et plans déposés du CID. */
async function vatsimHistory(getJson, cid) {
  const [from, to] = since(),
    got = await getJson(`${VATSIM}/members/${cid}/history?limit=50`) || {},
    items = (got.items || []).filter(h => h.type === 1 && String(h.start || '') >= from),
    fps = items.length ? await getJson(`${VATSIM}/members/${cid}/flightplans`) : [];
  return {
    items,
    fps: Array.isArray(fps) ? fps : [],
    from,
    to
  };
}
/** Plan d'une connexion : lié à la connexion, sinon déposé pour cet indicatif entre 12 h avant son début et sa fin. */
function planOf(hist, h) {
  const end = String(h.end || '9999'),
    start = String(h.start || ''),
    lo = start ? new Date(Date.parse(start) - 12 * 36e5).toISOString().replace(/\.\d{3}Z$/, 'Z') : '';
  let c = hist.fps.filter(f => f.connection_id === h.id);
  if (!c.length) c = hist.fps.filter(f => f.callsign === h.callsign && lo <= String(f.filed || '') && String(f.filed || '') <= end);
  return c.sort((a, b) => String(a.filed || '').localeCompare(String(b.filed || ''))).at(-1) || {};
}
/** Vols VATSIM des 7 derniers jours (comme ivaoFlights). */
export async function vatsimFlights(getJson, cid) {
  const hist = await vatsimHistory(getJson, cid);
  return {
    flights: hist.items.sort((a, b) => String(b.start || '').localeCompare(String(a.start || ''))).map(h => ({
      id: String(h.id),
      callsign: h.callsign || '',
      dep: planOf(hist, h).dep || '',
      arr: planOf(hist, h).arr || '',
      start: h.start,
      end: h.end,
      open: !h.end
    })),
    id: cid,
    from: hist.from,
    to: hist.to
  };
}
/** Détail d'une connexion VATSIM au format de text_import.js (pas de trace : connexion et déconnexion). */
export async function vatsimFlight(getJson, cid, connection) {
  const hist = await vatsimHistory(getJson, cid),
    h = hist.items.find(x => String(x.id) === String(connection));
  if (!h) throw new Error('connection');
  const fp = planOf(hist, h),
    acft = String(fp.aircraft || ''),
    [a9, ...rest] = acft.split('-'),
    equip = rest.join('-'),
    [typ, wake = ''] = a9.split('/'),
    hm = (hrs, mins) => hrs || mins ? `${String(+hrs || 0).padStart(2, '0')}${String(+mins || 0).padStart(2, '0')}` : '';
  return {
    kind: 'ivao-details',
    source: 'VATSIM',
    network: 'VATSIM',
    callsign: h.callsign || '',
    dep: fp.dep || '',
    arr: fp.arr || '',
    connected: h.start ? new Date(h.start) : null,
    disconnected: h.end ? new Date(h.end) : null,
    open: !h.end,
    samples: [],
    equipKnown: !!equip,
    fplText: fp.aircraft || fp.dep ? fplText({
      callsign: h.callsign,
      rules: String(fp.flight_type || 'I').slice(0, 1),
      acft: typ,
      wake: wake.slice(0, 1),
      equip,
      dep: fp.dep,
      eobt: fp.deptime ? String(fp.deptime).padStart(4, '0').slice(0, 4) : '',
      speed: /^\d+$/.test(String(fp.cruisespeed || '')) ? `N${String(+fp.cruisespeed).padStart(4, '0')}` : '',
      level: vatsimLevel(fp.altitude),
      route: fp.route,
      arr: fp.arr,
      eet: hm(fp.hrsenroute, fp.minenroute),
      altn: fp.alt,
      item18: fp.rmks,
      endurance: hm(fp.hrsfuel, fp.minsfuel)
    }) : ''
  };
}
