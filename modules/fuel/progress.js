// V3 fuel — progression prévue d'un vol démarré, en calcul pur (modules/fuel/SPEC.md § 12) : à partir de l'heure de
// départ (mise en route) et du devis, l'horaire prévu le long de la route — roulage, montée, croisière tronçon par
// tronçon (vitesse vraie de croisière + composante du vent du tronçon, durées ramenées au temps de croisière du devis),
// descente —, l'heure estimée de passage à chaque point, le point prévu à un instant donné, la distance restante et le
// carburant restant prévu. Ni page, ni stockage, ni réseau.
//
// API :
//   plan({ points, distanceNm, taxiMin, q, legWinds, wind, windComponent }) → { segs, total (min), D (NM), cum (NM des
//     points) } ou null — legWinds : vent de chaque tronçon { dirDeg, kt } (ou null), wind : vent du devis en repli,
//     windComponent(track, dir, speed) : composante sur la route (positive : arrière), celle de FuelModel.
//   etas(P, startMs) → [{ i, at (ms) }] : heure prévue de passage à chaque point (le départ : après le roulage).
//   at(P, elapsedMin) → { nmFromDep, remainingNm, fuelUsed, phase ('taxi' | 'climb' | 'cruise' | 'descent' | 'arrived') }.
//   position(points, cum, nm) → { lat, lon, legIndex } : le point de la route à nm NM du départ.

const R = Math.PI / 180;
/** Distance orthodromique (NM). */
const gc = (a, b) => {
  const d = Math.sin((b.lat - a.lat) * R / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin((b.lon - a.lon) * R / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(d)));
};
/** Route vraie initiale (°) de a vers b. */
const brg = (a, b) => {
  const y = Math.sin((b.lon - a.lon) * R) * Math.cos(b.lat * R),
    x = Math.cos(a.lat * R) * Math.sin(b.lat * R) - Math.sin(a.lat * R) * Math.cos(b.lat * R) * Math.cos((b.lon - a.lon) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
};

/** Horaire prévu (voir l'en-tête). Segments { d0, d1 (NM), t0, t1 (min depuis la mise en route), f0, f1 (carburant
 *  consommé, unité du devis), phase }. */
export function plan({
  points,
  distanceNm,
  taxiMin = 0,
  q,
  legWinds = [],
  wind = null,
  windComponent = () => 0
}) {
  const pts = (points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon));
  if (!q?.hasFuel || pts.length < 2) return null;
  const raw = [0];
  for (let i = 1; i < pts.length; i++) raw.push(raw[i - 1] + gc(pts[i - 1], pts[i]));
  const D = +distanceNm > 0 ? +distanceNm : raw.at(-1),
    k = raw.at(-1) > 0 ? D / raw.at(-1) : 1,
    cum = raw.map(x => x * k),
    taxi = Math.max(0, +taxiMin || 0),
    climbNm = Math.min(D, q.climb?.nm || 0),
    descNm = Math.min(D - climbNm, q.descent?.nm || 0),
    c0 = climbNm,
    c1 = D - descNm,
    segs = [];
  let t = 0,
    f = 0;
  const push = (d0, d1, dt, df, phase) => {
    segs.push({
      d0,
      d1,
      t0: t,
      t1: t + dt,
      f0: f,
      f1: f + df,
      phase
    });
    t += dt;
    f += df;
  };
  push(0, 0, taxi, +q.taxi || 0, 'taxi');
  push(0, c0, q.climb?.min || 0, q.climb?.fuel || 0, 'climb');
  // croisière : morceaux de tronçons entre c0 et c1, vitesse sol par tronçon, durées ramenées au temps du devis
  const tas = +q.cruise?.tas || 0,
    cruiseMin = (q.cruise?.min || 0) + (q.steps?.min || 0),
    cruiseFuel = (q.cruise?.fuel || 0) + (q.steps?.fuel || 0),
    pieces = [];
  for (let i = 1; i < pts.length; i++) {
    const a = Math.max(c0, cum[i - 1]),
      b = Math.min(c1, cum[i]);
    if (b <= a) continue;
    const w = legWinds[i - 1] || (Number.isFinite(+wind?.dirDeg) && Number.isFinite(+wind?.speedKt) ? {
        dirDeg: +wind.dirDeg,
        kt: +wind.speedKt
      } : null),
      wc = w ? windComponent(brg(pts[i - 1], pts[i]), w.dirDeg, w.kt) : 0,
      gs = Math.max(80, tas + wc);
    pieces.push({
      a,
      b,
      raw: (b - a) / gs * 60
    });
  }
  const rawSum = pieces.reduce((s, x) => s + x.raw, 0),
    scale = rawSum > 0 ? cruiseMin / rawSum : 0;
  for (const p of pieces) {
    const dt = p.raw * scale;
    push(p.a, p.b, dt, cruiseMin > 0 ? cruiseFuel * dt / cruiseMin : 0, 'cruise');
  }
  push(c1, D, q.descent?.min || 0, q.descent?.fuel || 0, 'descent');
  return {
    segs,
    total: t,
    D,
    cum
  };
}

/** Heure prévue de passage à chaque point (ms) : le premier instant où la distance du point est atteinte en vol. */
export function etas(P, startMs) {
  if (!P) return [];
  return P.cum.map((d, i) => {
    const s = P.segs.find(x => x.phase !== 'taxi' && d <= x.d1 + 1e-6) || P.segs.at(-1),
      f = s.d1 > s.d0 ? (d - s.d0) / (s.d1 - s.d0) : 1;
    return {
      i,
      at: Math.round(startMs + (s.t0 + Math.max(0, Math.min(1, f)) * (s.t1 - s.t0)) * 60000)
    };
  });
}

/** État prévu après elapsedMin minutes depuis la mise en route. */
export function at(P, elapsedMin) {
  if (!P) return null;
  const e = Math.max(0, elapsedMin);
  if (e >= P.total) return {
    nmFromDep: P.D,
    remainingNm: 0,
    fuelUsed: P.segs.at(-1)?.f1 || 0,
    phase: 'arrived'
  };
  const s = P.segs.find(x => e <= x.t1) || P.segs.at(-1),
    f = s.t1 > s.t0 ? (e - s.t0) / (s.t1 - s.t0) : 1,
    d = s.d0 + (s.d1 - s.d0) * f;
  return {
    nmFromDep: d,
    remainingNm: Math.max(0, P.D - d),
    fuelUsed: s.f0 + (s.f1 - s.f0) * f,
    phase: s.phase
  };
}

/** Point de la route à nm NM du départ (distances des points cum, ramenées à celle du vol). */
export function position(points, cum, nm) {
  const pts = (points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon));
  if (!pts.length) return null;
  for (let i = 1; i < pts.length; i++)
    if (nm <= cum[i] + 1e-6) {
      const f = cum[i] > cum[i - 1] ? (nm - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
      return {
        lat: +pts[i - 1].lat + (+pts[i].lat - +pts[i - 1].lat) * f,
        lon: +pts[i - 1].lon + (+pts[i].lon - +pts[i - 1].lon) * f,
        legIndex: i - 1
      };
    }
  return {
    lat: +pts.at(-1).lat,
    lon: +pts.at(-1).lon,
    legIndex: pts.length - 2
  };
}
