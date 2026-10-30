// V3 frame/lib (propriétaire : fuel ; report, maps et le cadre s'en servent) — le vol dans le temps : heures et position
// prévues, dérivées de started.at / planned_at, quote et profile (modules/maps/SPEC.md § 13). Sorti de current_flight.js le
// 29 octobre 2026 (V3_SPECIFICATION § 10.29 b), qui le ré-exporte pendant la transition. Calcul pur.
// API : TAXI_MIN, isStarted(f), refTime(f), legTimes(f, { path }), etaOf(f, now, { path }), plannedPositionAt(f, now, { path }) ;
//   aides partagées avec flight_path.js : gcNm, num.

import {
  unwrapLons,
  wrapLon
} from './geo.js';

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
export const gcNm = (a, b) => {
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
export const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
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
