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
//   isStarted(f), refTime(f), legTimes(f), etaOf(f, now), plannedPositionAt(f, now), TAXI_MIN : le vol dans le temps,
//     dérivé de started.at / planned_at, quote et profile (voir plus bas ; modules/maps/SPEC.md § 13).

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
// freins à chaque point) ; sans quote.legs, la montée à profile.climbKt jusqu'à tocNm, la descente à descentKt depuis
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
 *  devis. */
export function legTimes(f) {
  // longitudes continues (frame/lib/geo.js) : une route qui passe 180° va de 177° à 195°
  const pts = unwrapLons((f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
    id: String(p.id || ''),
    lat: +p.lat,
    lon: +p.lon
  })));
  const q = f?.quote;
  if (pts.length < 2 || !q) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcNm(pts[i - 1], pts[i]));
  const D = cum.at(-1),
    taxi = num(q.taxiMin) != null && q.taxiMin >= 0 ? q.taxiMin : TAXI_MIN,
    P = f.profile || {},
    tocNm = Math.max(0, +P.tocNm || 0),
    todNm = Math.max(0, +P.todNm || 0);
  let min = null;
  const legs = Array.isArray(q.legs) ? q.legs : null;
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
export function etaOf(f, now = Date.now()) {
  const t0 = refTime(f),
    T = t0 == null ? null : legTimes(f);
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
export function plannedPositionAt(f, now = Date.now()) {
  const t0 = refTime(f),
    T = t0 == null ? null : legTimes(f);
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
