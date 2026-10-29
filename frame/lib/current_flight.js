// V3 frame/lib (propriétaire : fuel ; report, maps et le cadre s'en servent) — écriture du vol courant
// (pilot/<trigramme>/current_flight.json) à plusieurs mains, en calcul pur : chaque module relit l'enregistrement et n'y
// remplace que ses propres champs ; progress est partagé, chacun n'y remplace que ses clés (progress.actual appartient
// au cadre). Ni page, ni stockage, ni réseau.
//
// API :
//   FUEL_FIELDS : champs de premier niveau écrits par fuel ; FUEL_PROGRESS : clés de progress écrites par fuel.
//   merge(stored, mine, { fields, progressKeys, by }) → l'enregistrement à écrire : stored (relu juste avant), avec les
//     champs fields de mine (un champ absent de mine n'est pas touché ; null efface) et, dans progress, les clés
//     progressKeys de mine.progress ; progress: null de mine n'efface que ces clés-là (la position réelle du cadre,
//     progress.actual, reste ; progress devient null s'il ne reste rien) ; schema, by et updated_at posés.
//   isStarted(f), refTime(f), legTimes(f, { path }), etaOf(f, now, { path }), plannedPositionAt(f, now, { path }), TAXI_MIN :
//     le vol dans le temps, dérivé de started.at / planned_at, quote et profile (voir plus bas ; modules/maps/SPEC.md § 13).
//   proceduresOf(f), loadProcedures(aerodb, f) (sans doublon : dedupProcs), expandedPath(f, procs), flownPath(path) : la route et ses procédures choisies
//     (SID, STAR, approche : V3_SPECIFICATION § 10.20), un seul chemin pour le profil, les marques, les heures et le devis.
//   routingChain(f, procs, points) : les points du routage des voies (« Auto »), fin de SID et début d'arrivée choisies insérés.
//   altitudeAt(f, nm, { cruiseFt, flown, total }), routeNmToFlown(f, flown, points) : l'altitude prévue le long du chemin volé
//     (profile.path, sinon montée / croisière / descente), et les distances de la route ramenées sur ce chemin.

import {
  unwrapLons,
  wrapLon
} from './geo.js';

export const FUEL_FIELDS = ['aircraft', 'route', 'level', 'wind', 'windSource', 'isaDev', 'profile', 'quote', 'weather', 'ofp',
  'started', 'planned_at'
];
export const FUEL_PROGRESS = ['at', 'plannedPos', 'eta', 'fuelRemainingKg', 'remainingNm', 'phase'];

/** Enregistrement à écrire (voir l'en-tête). */
export function merge(stored, mine, {
  fields = [],
  progressKeys = [],
  by = ''
} = {}) {
  const cur = stored && typeof stored === 'object' ? stored : {},
    out = {
      ...cur
    };
  for (const k of fields)
    if (mine && Object.prototype.hasOwnProperty.call(mine, k)) out[k] = mine[k];
  if (mine && Object.prototype.hasOwnProperty.call(mine, 'progress') && progressKeys.length) {
    const p = {
      ...(cur.progress && typeof cur.progress === 'object' ? cur.progress : {})
    };
    if (mine.progress === null) {
      for (const k of progressKeys) delete p[k];
      out.progress = Object.keys(p).length ? p : null;
    } else if (mine.progress && typeof mine.progress === 'object') {
      for (const k of progressKeys)
        if (Object.prototype.hasOwnProperty.call(mine.progress, k)) p[k] = mine.progress[k];
      out.progress = p;
    }
  }
  out.schema = 1;
  if (by) out.by = by;
  out.updated_at = new Date().toISOString();
  return out;
}

// ---------------------------------------------------------------- le vol dans le temps (heures et position prévues)
// Dérivées, jamais lues dans progress (modules/maps/SPEC.md § 13) : tous les lecteurs (la Carte, le bloc d'état du
// cadre, Vols) en tirent les mêmes valeurs. Heure de référence : started.at d'un vol démarré, sinon planned_at, sinon
// aucune. Temps : le roulage (quote.taxiMin, 10 min sans lui), puis quote.legs [{ id, min }] (minutes depuis le lâcher des
// freins à chaque point, origin du point de flownPath) ; sans quote.legs, la montée à profile.climbKt jusqu'à tocNm, la descente à descentKt depuis
// todNm et la croisière au temps qui reste de quote.minutes ; sans devis, rien.

/** Minutes de roulage quand le devis ne les donne pas. */
export const TAXI_MIN = 10;
const RAD = Math.PI / 180;
/** Distance orthodromique (NM) ; la différence de longitude passe par un sinus : une route qui passe 180° est juste. */
const gcNm = (a, b) => {
  const d = Math.sin((b.lat - a.lat) * RAD / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin((b.lon - a.lon) * RAD /
    2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(d)));
};
/** Point du grand cercle de a vers b à la fraction k de la distance (degrés ; longitude continue, sans repli). */
function gcPoint(a, b, k) {
  const d = gcNm(a, b) / 3440.065;
  if (!(d > 1e-9) || k <= 0) return {
    lat: a.lat,
    lon: a.lon
  };
  if (k >= 1) return {
    lat: b.lat,
    lon: b.lon
  };
  const A = Math.sin((1 - k) * d) / Math.sin(d),
    B = Math.sin(k * d) / Math.sin(d),
    [la1, lo1, la2, lo2] = [a.lat * RAD, a.lon * RAD, b.lat * RAD, b.lon * RAD],
    x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2),
    y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2),
    z = A * Math.sin(la1) + B * Math.sin(la2),
    lon = Math.atan2(y, x) / RAD;
  return {
    lat: Math.atan2(z, Math.hypot(x, y)) / RAD,
    lon: lon + 360 * Math.round((a.lon - lon) / 360) // la copie du monde du point de départ
  };
}
/** Nombre fini lu strictement (un texte, null ou un booléen ne sont pas des minutes) ; sinon null. */
const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
/** Instant (ms) d'une date ISO, ou null. */
const msOf = v => {
  const t = Date.parse(v || '');
  return Number.isFinite(t) ? t : null;
};
/** Vrai si le vol est démarré : started.at posé (jamais la seule présence de progress). */
export const isStarted = f => msOf(f?.started?.at) != null;
/** Heure de référence du vol (ms) : started.at d'un vol démarré, sinon planned_at ; null sans l'une ni l'autre. */
export const refTime = f => isStarted(f) ? msOf(f.started.at) : msOf(f?.planned_at);

/** Horaire du vol : { pts (points lus, longitudes continues), cum (NM depuis le départ à chaque point), min (minutes depuis
 *  le lâcher des freins à chaque point), taxi (min), total (min), tocNm, todNm, D (NM) } ; null sans deux points ou sans
 *  devis. opts.path : le chemin volé (flownPath d'expandedPath, procédures comprises) au lieu de route.points. */
export function legTimes(f, opts = {}) {
  // longitudes continues (frame/lib/geo.js) : une route qui passe 180° va de 177° à 195°
  const pts = unwrapLons((opts.path || f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
    id: String(p.id || ''),
    lat: +p.lat,
    lon: +p.lon,
    nm: num(p.nm)
  })));
  const q = f?.quote;
  if (pts.length < 2 || !q) return null;
  // les distances du chemin (flownPath, une seule mesure pour tous) ; sinon le grand cercle point à point
  const cum = opts.path && pts.every(p => p.nm != null) ? pts.map(p => p.nm) : [0];
  for (let i = cum.length; i < pts.length; i++) cum.push(cum[i - 1] + gcNm(pts[i - 1], pts[i]));
  for (const p of pts) delete p.nm;
  const D = cum.at(-1),
    taxi = num(q.taxiMin) != null && q.taxiMin >= 0 ? q.taxiMin : TAXI_MIN,
    P = f.profile || {},
    tocNm = Math.max(0, +P.tocNm || 0),
    todNm = Math.max(0, +P.todNm || 0);
  let min = null;
  // quote.legs [{ id, min, origin }] suit flownPath ; sur route.points (sans path), seuls les points de la route comptent (un
  // leg sans origin, écrit avant les procédures, en est un)
  const legs = Array.isArray(q.legs) ? opts.path ? q.legs : q.legs.filter(l => !l?.origin || l.origin === 'route') : null;
  if (legs?.length) {
    // les minutes du devis, point par point (par son rang, sinon par son nom) ; un point sans minute n'en a pas
    min = pts.map((p, i) => {
      const l = legs[i]?.id === p.id || legs[i]?.id == null ? legs[i] : legs.find(x => x?.id === p.id);
      return num(l?.min);
    });
    if (min[0] == null) min[0] = 0;
    if (min.some(v => v == null)) min = null;
  }
  if (!min) {
    const total = +q.minutes;
    if (!(total > 0) || !(D > 0)) return null;
    // montée et descente à leurs vitesses quand le profil les donne, la croisière au temps qui reste du devis ; sinon une
    // seule vitesse moyenne
    const k = tocNm + todNm > D ? D / (tocNm + todNm) : 1,
      c0 = tocNm * k,
      c1 = D - todNm * k,
      tc = +P.climbKt > 0 && c0 > 0 ? c0 / +P.climbKt * 60 : 0,
      td = +P.descentKt > 0 && D - c1 > 0 ? (D - c1) / +P.descentKt * 60 : 0,
      split = tc + td < total && (tc > 0 || td > 0),
      vc = split ? (c1 - c0) / (total - tc - td) : D / total, // NM par minute en croisière
      at = d => {
        if (!split) return d / vc;
        if (d <= c0) return tc ? d / c0 * tc : 0;
        if (d <= c1) return tc + (d - c0) / (vc || 1e-9);
        return total - td + (td ? (d - c1) / (D - c1) * td : 0);
      };
    min = cum.map(at);
  }
  return {
    pts,
    cum,
    min,
    taxi,
    total: min.at(-1),
    tocNm,
    todNm,
    D
  };
}

/** Heures estimées de passage : [{ id, at (ISO UTC) }], la première au décollage (référence + roulage) ; null sans heure
 *  de référence ni horaire, et pour un vol non démarré dont l'arrivée est passée. */
export function etaOf(f, now = Date.now(), opts = {}) {
  const t0 = refTime(f),
    T = t0 == null ? null : legTimes(f, opts);
  if (!T) return null;
  const out = T.pts.map((p, i) => ({
    id: p.id,
    at: new Date(t0 + (T.taxi + T.min[i]) * 60e3).toISOString()
  }));
  return !isStarted(f) && Date.parse(out.at(-1).at) <= now ? null : out;
}

/** Position prévue à l'instant now : { lat, lon (dans [-180, 180[), legIndex, nmFromDep, phase ('taxi', 'climb', 'cruise',
 *  'descent', 'arrived') }, interpolée sur l'horaire le long du grand cercle de chaque tronçon ; au terrain de départ
 *  pendant le roulage. null sans heure de référence ni horaire, avant la mise en route, et, comme etaOf, pour un vol non
 *  démarré dont l'arrivée est passée. */
export function plannedPositionAt(f, now = Date.now(), opts = {}) {
  const t0 = refTime(f),
    T = t0 == null ? null : legTimes(f, opts);
  if (!T || now < t0) return null;
  const t = (now - t0) / 60e3 - T.taxi,
    n = T.pts.length;
  if (t >= T.total && !isStarted(f)) return null; // la même règle que etaOf
  const at = (i, k) => {
    const a = T.pts[i],
      b = T.pts[Math.min(n - 1, i + 1)],
      nm = T.cum[i] + (T.cum[Math.min(n - 1, i + 1)] - T.cum[i]) * k,
      g = gcPoint(a, b, k);
    return {
      lat: g.lat,
      lon: wrapLon(g.lon),
      legIndex: i,
      nmFromDep: nm,
      phase: nm < T.tocNm ? 'climb' : nm > T.D - T.todNm ? 'descent' : 'cruise'
    };
  };
  if (t < 0) return {
    ...at(0, 0),
    phase: 'taxi'
  };
  if (t >= T.total) return {
    ...at(n - 1, 0),
    nmFromDep: T.D,
    phase: 'arrived'
  };
  let i = 0;
  while (i < n - 2 && t >= T.min[i + 1]) i++;
  const span = T.min[i + 1] - T.min[i];
  return at(i, span > 0 ? Math.min(1, Math.max(0, (t - T.min[i]) / span)) : 0);
}

// ---------------------------------------------------------------- la route et ses procédures choisies (§ 10.20)
// route.procedures v2 = { dep: { rwy, sid, trans }, arr: { rwy, star, trans, app, appTrans }, by, at } : identifiants du schéma
// commun d'aerodb (§ 5 quinquies) ; null = « aucune » (choix du pilote), absent = pas encore choisi. Écrit par fuel seul ; les
// lecteurs vérifient l'aérodrome de chaque côté. Un seul chemin « route + procédures » sert au profil, aux marques, au
// curseur, aux heures et au devis : expandedPath, et flownPath (avec nm) pour les distances.

/** Aérodrome d'un identifiant de procédure (« LFBD.SID.ROYAN6P.RW23.NONE » → « LFBD »). */
const icaoOfId = id => typeof id === 'string' ? id.split('.')[0].trim().toUpperCase() : '';
/** Identifiant d'une entrée de l'ancien schéma { sid, star } (objet OFP ou texte) ; null gardé, sinon undefined. */
const idOf = x => x === null ? null : typeof x === 'string' ? x : x && typeof x === 'object' && typeof x.id === 'string' ? x.id :
  undefined;

/** Vue v2 des procédures du vol : { dep, arr, by, at } ; dep / arr valent null pour « aucune », sinon un objet dont les champs
 *  absents ne sont pas choisis. Un côté dont un identifiant nomme un autre aérodrome que route.dep / route.arr (la route a
 *  changé depuis) est rendu vide, {} : pas choisi, l'OFP peut le reproposer (fuel le retire à sa prochaine écriture). Un
 *  ancien { sid, star } (OFP) donne les identifiants de ses enregistrements, et la piste seulement quand l'enregistrement
 *  n'en a qu'une. */
export function proceduresOf(f) {
  const r = f?.route || {},
    pr = r.procedures && typeof r.procedures === 'object' ? r.procedures : null,
    depIcao = String(r.dep || r.points?.[0]?.id || '').trim().toUpperCase(),
    arrIcao = String(r.arr || r.points?.at?.(-1)?.id || '').trim().toUpperCase();
  if (!pr) return {
    dep: {},
    arr: {},
    by: null,
    at: null
  };
  let dep, arr;
  if ('dep' in pr || 'arr' in pr) {
    dep = pr.dep === null ? null : {
      ...(pr.dep || {})
    };
    arr = pr.arr === null ? null : {
      ...(pr.arr || {})
    };
  } else {
    dep = {};
    arr = {};
    const v1 = (o, k, rec) => {
      const id = idOf(rec);
      if (id === undefined) return;
      o[k] = id;
      if (Array.isArray(rec?.runways) && rec.runways.length === 1) o.rwy = String(rec.runways[0]);
    };
    if ('sid' in pr) v1(dep, 'sid', pr.sid);
    if ('star' in pr) v1(arr, 'star', pr.star);
  }
  const check = (o, icao, keys) => !o || !icao || keys.every(k => typeof o[k] !== 'string' || icaoOfId(o[k]) === icao) ? o : {};
  return {
    dep: check(dep, depIcao, ['sid', 'trans']),
    arr: check(arr, arrIcao, ['star', 'trans', 'app', 'appTrans']),
    by: pr.by ?? null,
    at: pr.at ?? null
  };
}

/** Procédures du vol résolues par aerodb : { sid, sidTrans, star, starTrans, app, appTrans, depRwy, arrRwy } — chaque
 *  identifiant par aerodb.procedure(id) (null s'il est introuvable ou pas choisi), les pistes choisies par
 *  aerodb.runways(icao) (seuil, élévation, QFU ; approx quand elles sont déduites). Un seul code pour fuel et la Carte. */
export async function loadProcedures(aerodb, f) {
  const v = proceduresOf(f),
    d = v.dep || {},
    a = v.arr || {},
    r = f?.route || {},
    get = id => typeof id === 'string' && id && aerodb?.procedure ? Promise.resolve().then(() => aerodb.procedure(id)).catch(() =>
      null) : null,
    rwKey = x => String(x ?? '').trim().toUpperCase().replace(/^RW/, ''),
    rw = async (icao, id) => {
      if (!id || !icao || !aerodb?.runways) return null;
      const list = await Promise.resolve().then(() => aerodb.runways(String(icao).toUpperCase())).catch(() => []);
      return (list || []).find(x => rwKey(x?.id) === rwKey(id)) || null;
    };
  const [sid, sidTrans, star, starTrans, app, appTrans, depRwy, arrRwy] = await Promise.all([get(d.sid), get(d.trans), get(a.star), get(
    a.trans), get(a.app), get(a.appTrans), rw(r.dep || r.points?.[0]?.id, d.rwy), rw(r.arr || r.points?.at?.(-1)?.id, a.rwy)]);
  return dedupProcs({
    sid: sid || null,
    sidTrans: sidTrans || null,
    star: star || null,
    starTrans: starTrans || null,
    app: app || null,
    appTrans: appTrans || null,
    depRwy,
    arrRwy
  });
}
/** Procédures lues sans doublon : une transition identique à sa procédure (un ancien choix, ou venu d'ailleurs) est ignorée, la
 *  chaîne de ses points serait volée deux fois. Reprise de Carburant (§ 10.29 a) : Carburant et la Carte voient les mêmes
 *  enregistrements ; elle ira dans frame/lib/procedures.js avec la sortie du bloc procédures de Carburant. */
export function dedupProcs(p) {
  const out = {
    ...p
  };
  for (const [main, tr] of [
      ['sid', 'sidTrans'],
      ['star', 'starTrans'],
      ['app', 'appTrans']
    ])
    if (out[main] && out[tr] && out[main].id === out[tr].id) out[tr] = null;
  return out;
}

/** Champs d'un point de procédure repris dans le chemin, tels qu'aerodb les donne (alt { type: 'at' | 'min' | 'max' |
 *  'between', ft, ft2? }, kt = vitesse indiquée maximale, forme du tronçon ; nm devient legNm). */
const LEG_KEYS = ['alt', 'kt', 'leg', 'crs', 'nm', 'arc', 'turn', 'over', 'vpa', 'rnp'];
/** Coordonnée lue, ou null (un tronçon sans point : VA, CA, VM, FM). */
const coord = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v;
/** Point du chemin d'après un point de procédure (sa phase, sinon celle de l'enregistrement ; missed → origin 'missed'). */
function procPoint(p, origin, phase) {
  const o = {
    id: String(p?.id ?? ''),
    lat: coord(p?.lat),
    lon: coord(p?.lon),
    origin,
    phase: p?.phase || phase
  };
  for (const k of LEG_KEYS)
    if (p?.[k] !== undefined && p[k] !== null) o[`p_${k}`] = p[k];
  if (o.phase === 'missed') o.origin = 'missed';
  return o;
}
/** Même point : même nom et positions proches (moins de 3 NM), ou sans nom à moins de 0,3 NM. */
const samePoint = (a, b) => {
  if (!a || !b || a.lat === null || b.lat === null || a.lon === null || b.lon === null) return false;
  const d = gcNm(a, b);
  return a.id && b.id && a.id.toUpperCase() === b.id.toUpperCase() ? d < 3 : d < .3;
};
/** Points de plusieurs procédures bout à bout ; le point partagé par deux d'entre elles (fin de transition, début de
 *  procédure) une seule fois, avec les contraintes de la seconde ; au-delà de ce point, la fin du premier est écartée. */
function chainOf(parts) {
  const out = [];
  for (const [rec, origin, phase] of parts) {
    // jonction : le premier point de cet enregistrement déjà dans la chaîne (une transition qui reprend le début de
    // l'approche, une STAR qui va au-delà de son point de sortie) : la chaîne est coupée à ce point, la fin propre du
    // précédent n'est jamais volée et aucun tronçon ne l'est deux fois
    const first = rec?.points?.length ? procPoint(rec.points[0], origin, phase) : null;
    if (first && first.origin !== 'missed') {
      let k = -1;
      for (let i = out.length - 1; i >= 0; i--)
        if (out[i].origin !== 'missed' && samePoint(out[i], first)) {
          k = i;
          break;
        }
      if (k >= 0) out.length = k + 1;
    }
    for (const p of rec?.points || []) {
      const q = procPoint(p, origin, phase),
        last = out.at(-1);
      if (last && last.origin !== 'missed' && q.origin !== 'missed' && samePoint(last, q)) {
        out[out.length - 1] = {
          ...last,
          ...q
        };
        continue;
      }
      out.push(q);
    }
  }
  return out;
}
/** Seuil d'une piste choisie en point de chemin (« RW23 », rwy: true), ou null. */
const thresholdPoint = (rw, origin) => rw && coord(rw.lat) !== null && coord(rw.lon) !== null ? {
  id: `RW${String(rw.id).replace(/^RW/i, '')}`,
  lat: +rw.lat,
  lon: +rw.lon,
  origin,
  phase: 'main',
  rwy: true,
  ...(coord(rw.elev) !== null ? {
    elev: +rw.elev
  } : {}),
  ...(rw.approx ? {
    approx: true
  } : {})
} : null;
/** Les champs p_* d'un point de procédure, rendus sous leur nom (le point de la route garde les siens : alt_ft, wind, via…). */
// la longueur publiée du tronçon devient legNm : nm est la distance cumulée de flownPath
const legFields = p => Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('p_')).map(([k, v]) => [k === 'p_nm' ? 'legNm' :
  k.slice(2), v
]));
const bare = p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('p_')));
const finish = p => ({
  ...bare(p),
  ...legFields(p)
});

/** Chemin « route + procédures » dans l'ordre de vol (V3_SPECIFICATION § 10.20) : [{ id, lat, lon, origin ('route' | 'sid' |
 *  'star' | 'app' | 'missed'), phase ('main' | 'trans' | 'missed'), alt?, kt?, leg?, crs?, legNm?, arc?, turn?, over?, rwy?,
 *  elev? }] ; les points de la route gardent tous leurs champs (alt_ft, wind, via, awy…). Départ : le terrain, le seuil de la
 *  piste choisie s'il est connu, la SID puis sa transition ; la route reprend au PREMIER point de cette chaîne qui est aussi
 *  un de ses points (une route d'OFP porte déjà ses points de SID : ils ne sont pas doublés, et le point commun prend les
 *  contraintes de la procédure), sinon après la chaîne entière, à route[1]. Arrivée, symétrique : transition de STAR, STAR,
 *  transition d'approche, approche jusqu'au seuil ; la route s'arrête au premier point de cette chaîne qu'elle contient,
 *  sinon à son avant-dernier point ; le terrain ferme le chemin. Un tronçon sans point (lat / lon null) reste dans le tableau
 *  pour le dessin ; l'approche interrompue vient à la fin (origin 'missed'), jamais volée. Longitudes dans [-180, 180[.
 *  procs : loadProcedures ; un enregistrement d'un autre aérodrome est ignoré. */
export function expandedPath(f, procs = {}) {
  const R = (f?.route?.points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null).map(p => ({
      ...p,
      id: String(p.id ?? ''),
      lat: +p.lat,
      lon: wrapLon(+p.lon),
      origin: 'route',
      phase: 'main'
    })),
    n = R.length;
  if (n < 2) return R;
  const P = procs || {},
    ofIcao = (rec, icao) => rec && (!rec.icao || String(rec.icao).toUpperCase() === icao) ? rec : null,
    depIcao = String(f.route?.dep || R[0].id).toUpperCase(),
    arrIcao = String(f.route?.arr || R[n - 1].id).toUpperCase(),
    depChain = chainOf([
      [ofIcao(P.sid, depIcao), 'sid', 'main'],
      [ofIcao(P.sidTrans, depIcao), 'sid', 'trans']
    ]).filter(p => p.origin !== 'missed'),
    arrAll = chainOf([
      [ofIcao(P.starTrans, arrIcao), 'star', 'trans'],
      [ofIcao(P.star, arrIcao), 'star', 'main'],
      [ofIcao(P.appTrans, arrIcao), 'app', 'trans'],
      [ofIcao(P.app, arrIcao), 'app', 'main']
    ]),
    missed = arrAll.filter(p => p.origin === 'missed'),
    arrChain = arrAll.filter(p => p.origin !== 'missed'),
    th0 = depChain.length ? thresholdPoint(P.depRwy, 'sid') : null,
    th1 = arrChain.length ? thresholdPoint(P.arrRwy, arrChain.at(-1).origin) : null;
  if (th0 && !samePoint(th0, depChain[0])) depChain.unshift(th0);
  if (th1 && !samePoint(th1, arrChain.at(-1))) arrChain.push(th1);
  // raccords : où la route reprend après la SID, où elle s'arrête avant la STAR ; jamais un tronçon deux fois
  const routeIndex = (p, from, to) => {
    for (let j = from; j <= to; j++)
      if (samePoint(R[j], p)) return j;
    return -1;
  };
  let start = 1,
    head = depChain;
  for (let i = 0; i < depChain.length; i++) {
    const j = routeIndex(depChain[i], 1, n - 2);
    if (j > 0) {
      start = j;
      head = depChain.slice(0, i);
      R[j] = {
        ...R[j],
        ...legFields(depChain[i])
      };
      break;
    }
  }
  let end = n - 2,
    tail = arrChain;
  for (let i = 0; i < arrChain.length; i++) {
    const j = routeIndex(arrChain[i], start, n - 2);
    if (j > 0) {
      end = j;
      tail = arrChain.slice(i + 1);
      R[j] = {
        ...R[j],
        ...legFields(arrChain[i])
      };
      break;
    }
  }
  const out = [R[0], ...head.map(finish), ...R.slice(start, end + 1), ...tail.map(finish), R[n - 1], ...missed.map(finish)].map(p =>
    p.lon === null ? p : {
      ...p,
      lon: wrapLon(p.lon)
    });
  // un même point deux fois de suite (le terrain et un seuil confondus…) : une fois
  return out.filter((p, i) => !i || p.origin === 'missed' || !samePoint(p, out[i - 1]) || p.id !== out[i - 1].id);
}

/** Points volés du chemin, avec leur position, et nm : distance cumulée depuis le départ (grand cercle point à point ; un arc
 *  RF compté par sa corde) — la seule mesure des distances, pour le profil (profile.path), les marques, les heures
 *  (legTimes / etaOf / plannedPositionAt { path }) et quote.legs. Ni l'approche interrompue ni les tronçons sans point. */
export function flownPath(path) {
  const pts = (path || []).filter(p => p && p.origin !== 'missed' && coord(p.lat) !== null && coord(p.lon) !== null),
    out = [];
  for (const p of pts) out.push({
    ...p,
    nm: out.length ? out.at(-1).nm + gcNm(out.at(-1), p) : 0
  });
  return out;
}

/** Points entre lesquels le routage (« Auto » de Carburant, frame/lib/routing.js) cherche les voies, procédures comprises : ceux de
 *  la route (points, par défaut route.points), avec la fin de la SID choisie (sa transition comprise) juste après le départ et le
 *  début de l'arrivée choisie (transition de STAR, sinon STAR, sinon transition d'approche, sinon approche) juste avant
 *  l'arrivée, quand la route ne les a pas déjà ; un point inséré porte inserted: true et son origin ('sid' | 'star' | 'app').
 *  Sans procédure : les points tels quels. Calcul pur ; procs : loadProcedures. Un départ FINOT de LFBO et une route qui
 *  commence à GOSAD donnent LFBO FINOT GOSAD… : le routage trouve G36 de FINOT à GOSAD, qu'il ne voyait pas depuis le terrain. */
export function routingChain(f, procs = {}, points = f?.route?.points) {
  const pts = (points || []).slice();
  if (pts.length < 2) return pts;
  const P = procs || {},
    n = pts.length,
    depIcao = String(f?.route?.dep || pts[0]?.id || '').toUpperCase(),
    arrIcao = String(f?.route?.arr || pts[n - 1]?.id || '').toUpperCase(),
    ofIcao = (rec, icao) => rec && (!rec.icao || String(rec.icao).toUpperCase() === icao) ? rec : null,
    fixes = chain => chain.filter(p => p.origin !== 'missed' && p.lat !== null && p.lon !== null && p.id && !/^RW\d{2}[LRC]?$/i.test(p.id)),
    sid = fixes(chainOf([
      [ofIcao(P.sid, depIcao), 'sid', 'main'],
      [ofIcao(P.sidTrans, depIcao), 'sid', 'trans']
    ])),
    arr = fixes(chainOf([
      [ofIcao(P.starTrans, arrIcao), 'star', 'trans'],
      [ofIcao(P.star, arrIcao), 'star', 'main'],
      [ofIcao(P.appTrans, arrIcao), 'app', 'trans'],
      [ofIcao(P.app, arrIcao), 'app', 'main']
    ])),
    inRoute = q => pts.slice(1, -1).some(p => coord(p?.lat) !== null && coord(p?.lon) !== null && samePoint({
      id: String(p.id ?? ''),
      lat: +p.lat,
      lon: +p.lon
    }, q)),
    mk = q => ({
      id: q.id,
      lat: q.lat,
      lon: q.lon,
      origin: q.origin,
      inserted: true
    });
  const out = [pts[0]],
    end = sid.at(-1),
    start = arr[0];
  if (end && !inRoute(end)) out.push(mk(end));
  out.push(...pts.slice(1, -1));
  if (start && !inRoute(start) && !(end && samePoint(end, start))) out.push(mk(start));
  out.push(pts[n - 1]);
  return out;
}

// ---------------------------------------------------------------- l'altitude du vol le long du chemin
/** Distances de la route (grand cercle point à point sur points, par défaut route.points) ramenées sur le chemin volé
 *  (flownPath) : une fonction nm de la route → nm du chemin. Les points de la route que le chemin garde font les repères ;
 *  entre deux repères, au prorata ; au-delà, décalé du dernier repère. Sans chemin (ou sans repère) : l'identité. */
export function routeNmToFlown(f, flown, points = f?.route?.points) {
  const pts = (points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null),
    fp = (flown || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null && Number.isFinite(+p.nm));
  if (pts.length < 2 || fp.length < 2) return nm => nm;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcNm({
    lat: +pts[i - 1].lat,
    lon: +pts[i - 1].lon
  }, {
    lat: +pts[i].lat,
    lon: +pts[i].lon
  }));
  // repères : un point de la route retrouvé (même nom, à moins de 3 NM) sur le chemin, dans l'ordre
  const marks = [];
  let j0 = 0;
  pts.forEach((p, i) => {
    const q = {
        id: String(p.id ?? ''),
        lat: +p.lat,
        lon: +p.lon
      },
      j = fp.findIndex((x, k) => k >= j0 && x.origin === 'route' && samePoint(x, q));
    if (j < 0) return;
    marks.push([cum[i], +fp[j].nm]);
    j0 = j;
  });
  if (!marks.length) return nm => nm;
  return nm => {
    if (nm <= marks[0][0]) return marks[0][1] - (marks[0][0] - nm);
    for (let k = 1; k < marks.length; k++) {
      const [r0, f0] = marks[k - 1], [r1, f1] = marks[k];
      if (nm <= r1) return r1 > r0 ? f0 + (nm - r0) / (r1 - r0) * (f1 - f0) : f1;
    }
    const [r, fl] = marks.at(-1);
    return fl + (nm - r);
  };
}
/** Altitude prévue (ft) à nm du départ sur le chemin volé : le chemin vertical de fuel (profile.path [{ nm, ft }], interpolé) ;
 *  sans lui, la croisière (opts.cruiseFt, sinon level.ft, sinon le niveau du devis) avec la montée jusqu'à profile.tocNm et la
 *  descente sur les derniers profile.todNm du chemin (opts.total, sinon le dernier nm de opts.flown, sinon la route) ; null
 *  sans niveau. Utilisateur, 29 octobre : les vents de la route et la coupe d'Atmosphère sont pris à cette altitude, pas au
 *  niveau de croisière partout ; le routage des voies l'emploie pour les tronçons de montée et de descente. */
export function altitudeAt(f, nm, opts = {}) {
  const path = Array.isArray(f?.profile?.path) ? f.profile.path.filter(p => Number.isFinite(+p?.nm) && Number.isFinite(+p?.ft)) : [];
  if (path.length >= 2) {
    if (nm <= +path[0].nm) return +path[0].ft;
    for (let i = 1; i < path.length; i++)
      if (nm <= +path[i].nm) {
        const a = path[i - 1],
          b = path[i],
          d = +b.nm - +a.nm;
        return d > 0 ? +a.ft + (nm - +a.nm) / d * (+b.ft - +a.ft) : +b.ft;
      }
    return +path.at(-1).ft;
  }
  const L = num(opts.cruiseFt) ?? num(f?.level?.ft) ?? num(f?.quote?.levelFt);
  if (!(L > 0)) return null;
  const P = f?.profile || {},
    fl = (opts.flown || []).filter(p => Number.isFinite(+p?.nm)),
    D = num(opts.total) ?? (fl.length ? +fl.at(-1).nm : (() => {
      const pts = (f?.route?.points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null);
      let s = 0;
      for (let i = 1; i < pts.length; i++) s += gcNm({
        lat: +pts[i - 1].lat,
        lon: +pts[i - 1].lon
      }, {
        lat: +pts[i].lat,
        lon: +pts[i].lon
      });
      return s;
    })()),
    toc = Math.max(0, +P.tocNm || 0),
    tod = Math.max(0, +P.todNm || 0);
  let ft = L;
  if (toc > 0 && nm < toc) ft = Math.min(ft, L * Math.max(0, nm) / toc);
  if (tod > 0 && D > 0 && nm > D - tod) ft = Math.min(ft, L * Math.max(0, D - nm) / tod);
  return ft;
}

// ---------------------------------------------------------------- conflits et ordre des listes de procédures (V3_SPECIFICATION § 10.23)
// Une règle, deux fonctions pures (ni état du module, ni texte) : celles de Carburant (ses listes et ses notifications) et celles de la
// Carte (le mode choix) ne divergent jamais.

/** Piste sans « RW » ni espaces, en majuscules (« RW23 » → « 23 »). */
const rwNum = x => String(x ?? '').trim().toUpperCase().replace(/^RW/, '');
/** Même piste : « 24 » et « RW24 » se valent ; un numéro sans côté (« 14 ») vaut ses pistes parallèles (« 14L », « 14R »). */
const sameRw = (a, b) => {
  const x = rwNum(a),
    y = rwNum(b);
  return !!x && !!y && (x === y || /^\d\d$/.test(x) && y.startsWith(x) || /^\d\d$/.test(y) && x.startsWith(y));
};
/** Une fiche qui dessert toutes les pistes : aucune piste nommée, ou « ALL » / « RWALL ». */
const rwAll = rec => !(rec?.runways || []).length || rec.runways.some(x => rwNum(x) === 'ALL');
/** La fiche dessert-elle la piste ? Vrai sans piste donnée ou quand la fiche les dessert toutes. */
const rwServes = (rec, rwy) => !rwNum(rwy) || rwAll(rec) || rec.runways.some(x => sameRw(x, rwy));
/** Ordre naturel des pistes : par numéro, puis par côté (« 02 », « 06 », « 14L », « 14R »). */
const rwCompare = (a, b) => String(a).localeCompare(String(b), undefined, {
  numeric: true
});
/** Fiche d'un identifiant, que byId soit une Map, un objet { id: fiche } ou une fonction ; null sinon. */
const recById = (byId, id) => typeof id !== 'string' || !id ? null : (typeof byId === 'function' ? byId(id) : byId instanceof Map ? byId
  .get(id) :
  byId?.[id]) || null;

/** Conflits d'une fiche avec le choix courant de son côté, en données : [] sans conflit, sinon
 *  [{ kind: 'rwy', rwy }] (une SID, une STAR ou une approche qui ne dessert pas la piste choisie) et/ou
 *  [{ kind: 'starApp', app, appId }] (sans piste choisie, une STAR qui ne dessert aucune piste de l'approche choisie ; app : son nom).
 *  key : 'sid' | 'star' | 'app' | 'trans' | 'appTrans' (les transitions n'ont pas de conflit) ; rec : la fiche d'aerodb ; choice : le
 *  côté de route.procedures v2 ({ rwy, sid, star, app… }) ; byId : les fiches par identifiant (Map, objet ou fonction), pour
 *  choice.app. La continuité des points entre STAR et approche n'est jamais un conflit (§ 10.23) : les STAR finissent en attente ou en
 *  guidage radar, la Carte raccorde en tireté. Le texte est celui de l'appelant. */
export function conflictsOf(key, rec, choice, byId) {
  const out = [],
    o = choice || {};
  if (!rec) return out;
  if (['sid', 'star', 'app'].includes(key) && !rwServes(rec, o.rwy)) out.push({
    kind: 'rwy',
    rwy: o.rwy
  });
  const app = recById(byId, o.app);
  if (key === 'star' && !rwNum(o.rwy) && app && !rwAll(app) && !rwAll(rec) && !app.runways.some(x => rwServes(rec, x))) out.push({
    kind: 'starApp',
    app: app.name || null,
    appId: app.id
  });
  return out;
}

/** Liste de procédures (ou de pistes) dans l'ordre où le pilote les cherche, nouveau tableau : d'abord ce qui est compatible avec le
 *  choix courant, puis ce qui est en conflit (⚠, toujours choisissable) ; dans chaque groupe, le repli X-Plane local en dernier, puis
 *  par piste (celles qui les desservent toutes d'abord), par nom, par transition. Toujours plate. key : 'rwy' pour une liste de pistes
 *  (chaînes ou { id }) : celles que dessert la SID (côté Départ) ou l'approche (côté Arrivée) déjà choisie viennent en tête, puis les
 *  autres par ordre naturel ; sinon 'sid' | 'star' | 'app' | 'trans' | 'appTrans' (conflictsOf). choice et byId comme conflictsOf. */
export function orderProcedures(list, key, choice, byId) {
  const arr = [...(list || [])];
  if (key === 'rwy') {
    const rec = recById(byId, choice?.sid) || recById(byId, choice?.app),
      id = r => typeof r === 'string' ? r : r?.id,
      first = r => rec && !rwAll(rec) && rwServes(rec, id(r)) ? 0 : 1;
    return arr.sort((a, b) => first(a) - first(b) || rwCompare(rwNum(id(a)), rwNum(id(b))));
  }
  const bad = r => conflictsOf(key, r, choice, byId).length ? 1 : 0,
    xp = r => r?.status === 'xplane' || r?.local ? 1 : 0,
    rw = r => rwAll(r) ? '' : r.runways.map(rwNum).sort(rwCompare).join('/');
  return arr.sort((a, b) => bad(a) - bad(b) || xp(a) - xp(b) || rwCompare(rw(a), rw(b)) || String(a?.name ?? '').localeCompare(String(b
      ?.name ?? '')) ||
    String(a?.transition ?? '').localeCompare(String(b?.transition ?? '')));
}
