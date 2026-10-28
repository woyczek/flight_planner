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
//   verticalPath(path, q) → [{ nm, ft }] : le chemin vertical prévu le long de flownPath (profile.path), contraintes de procédure comprises.
//   nmAlong(path, pos) → NM : la distance du départ du point du chemin le plus proche d'une position (le départ est-il passé ?).

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

// ---------------------------------------------------------------- chemin vertical prévu et position sur le chemin (§ 10.20)
// Calcul pur sur flownPath (frame/lib/current_flight.js) : ses points portent nm (distance cumulée depuis le départ, la seule
// mesure des distances) et, pour ceux d'une procédure, alt { type: 'at' | 'min' | 'max' | 'between', ft, ft2? }.

/** Plafond et plancher (ft) que la contrainte d'un point impose au chemin : { cap, floor }, null pour l'un ou l'autre quand il n'y en a
 *  pas (at → les deux ; max → plafond ; min → plancher ; between → les deux bornes) ; le seuil d'une piste (rwy) vaut son altitude
 *  quand elle est connue. */
function limitsOf(p) {
  const none = {
    cap: null,
    floor: null
  };
  if (!p) return none;
  if (p.rwy && Number.isFinite(+p.elev)) return {
    cap: +p.elev,
    floor: +p.elev
  };
  const a = p.alt;
  if (!a || !Number.isFinite(+a.ft)) return none;
  const ft = +a.ft;
  if (a.type === 'at') return {
    cap: ft,
    floor: ft
  };
  if (a.type === 'max') return {
    cap: ft,
    floor: null
  };
  if (a.type === 'min') return {
    cap: null,
    floor: ft
  };
  if (a.type === 'between' && Number.isFinite(+a.ft2)) return {
    cap: Math.max(ft, +a.ft2),
    floor: Math.min(ft, +a.ft2)
  };
  return none;
}

/** Chemin vertical prévu [{ nm, ft }] le long de flownPath : la montée, la croisière (et ses paliers) et la descente du devis q
 *  comme le modèle les compte (la base), puis les contraintes d'altitude des points (at, max, min, between), sans jamais de saut
 *  vertical : une contrainte plafond placée dans la descente ne tire le chemin vers le bas qu'à partir de l'endroit où la pente de
 *  descente du modèle, remontée depuis elle, rejoint la base (avant, la croisière est gardée) ; une contrainte plafond placée dans la
 *  montée tient le chemin à plat jusqu'à elle, la montée reprenant à la pente du modèle ensuite. Une fois passé le sommet de
 *  montée, dès que la descente est commencée le chemin ne remonte plus : une contrainte plus haute que le chemin (le plancher d'une
 *  procédure, la remise de gaz d'une approche) ne le relève pas. Le départ et l'arrivée sont à l'altitude du seuil de piste choisie
 *  quand elle est connue, sinon à 0 ft. nm arrondi au dixième, ft à la dizaine ; nm strictement croissant ; [] sans devis chiffré ni
 *  chemin de deux points. */
export function verticalPath(path, q) {
  const pts = (path || []).filter(p => Number.isFinite(+p?.nm));
  if (pts.length < 2 || !q || !(q.levelFt > 0)) return [];
  const D = +pts.at(-1).nm,
    th = pts.filter(p => p.rwy && Number.isFinite(+p.elev)),
    depFt = th.length && th[0].origin === 'sid' ? +th[0].elev : 0,
    arrFt = th.length && th.at(-1).origin !== 'sid' ? +th.at(-1).elev : 0,
    levels = q.steps?.levels?.length ? q.steps.levels : [{
      nm: 0,
      ft: q.levelFt
    }],
    climbNm = Math.max(0, +q.climb?.nm || 0),
    descNm = Math.max(0, +q.descent?.nm || 0),
    k = climbNm + descNm > D && climbNm + descNm > 0 ? D / (climbNm + descNm) : 1,
    toc = climbNm * k,
    tod = D - descNm * k,
    first = levels[0].ft,
    last = levels.at(-1).ft,
    upGrad = climbNm > 0 ? first / climbNm : 300, // ft par NM de la montée du modèle, pour les changements de niveau
    dnGrad = descNm > 0 ? last / descNm : 300,
    // pentes bornant le chemin : celles du modèle (au besoin raccourcies pour tenir dans la distance)
    up = Math.max(upGrad, toc > 0 ? first / toc : 0),
    dn = Math.max(dnGrad, D - tod > 1e-6 ? last / (D - tod) : 0),
    peak = Math.max(...levels.map(l => l.ft));
  // points de rupture de la base : le sol, le sommet de montée, chaque changement de niveau (rampe à la pente de la montée ou
  // de la descente), le sommet de descente, le sol
  const base = [{
    nm: 0,
    ft: depFt
  }, {
    nm: toc,
    ft: first
  }];
  for (let i = 1; i < levels.length; i++) {
    const a = levels[i - 1].ft,
      b = levels[i].ft,
      len = Math.abs(b - a) / (b > a ? upGrad : dnGrad),
      nm = Math.min(Math.max(+levels[i].nm, toc), tod);
    base.push({
      nm,
      ft: a
    }, {
      nm: Math.min(nm + len, tod),
      ft: b
    });
  }
  base.push({
    nm: tod,
    ft: last
  }, {
    nm: D,
    ft: arrFt
  });
  const baseAt = nm => {
    for (let i = 1; i < base.length; i++)
      if (nm <= base[i].nm + 1e-9) {
        const a = base[i - 1],
          b = base[i];
        return b.nm > a.nm ? a.ft + (b.ft - a.ft) * (nm - a.nm) / (b.nm - a.nm) : b.ft;
      }
    return base.at(-1).ft;
  };
  // nœuds du chemin (nm au dixième, strictement croissants) : les ruptures de la base et chaque point du chemin, plus, pour chaque
  // plafond, l'endroit où la pente du modèle le rejoint (descente : remontée depuis lui jusqu'au niveau le plus haut ; montée :
  // reprise de la montée après lui), pour que le chemin y change de pente et non plus loin
  const r1 = nm => Math.round(nm * 10) / 10,
    at = new Map();
  for (const b of base) at.set(r1(b.nm), {
    p: null
  });
  for (const p of pts) at.set(r1(+p.nm), {
    p
  });
  for (const p of pts) {
    const c = limitsOf(p).cap;
    if (c === null) continue;
    const x = +p.nm,
      s = x > toc ? x - (peak - c) / dn : x + (first - c) / up;
    if (s > 0 && s < D && !at.has(r1(s)) && (x > toc ? s > toc : s > x && s < tod)) at.set(r1(s), {
      p: null
    });
  }
  const nodes = [...at.keys()].sort((a, b) => a - b).map(nm => ({
      nm,
      p: at.get(nm).p,
      b: baseAt(nm)
    })),
    n = nodes.length,
    lim = nodes.map(x => limitsOf(x.p)),
    v = nodes.map(x => x.b),
    // plafonds : à plat dans la montée (jusqu'à lui), en pente de descente remontée depuis lui après le sommet de montée
    flat = Array(n).fill(Infinity),
    slope = Array(n).fill(Infinity);
  for (let i = n - 1; i >= 0; i--) {
    const x = nodes[i].nm,
      c = lim[i].cap ?? Infinity;
    flat[i] = x <= toc + 1e-9 ? Math.min(c, i + 1 < n ? flat[i + 1] : Infinity) : Infinity;
    slope[i] = Math.min(x > toc + 1e-9 ? c : Infinity, i + 1 < n ? slope[i + 1] + dn * (nodes[i + 1].nm - x) : Infinity);
  }
  for (let i = 0; i < n; i++) {
    v[i] = Math.min(v[i], flat[i], slope[i]);
    if (lim[i].floor !== null) v[i] = Math.max(v[i], Math.min(lim[i].floor, lim[i].cap ?? Infinity));
  }
  // la descente est commencée au premier nœud, passé le sommet de montée, que la pente d'un plafond tire sous la base
  let from = nodes.findIndex((x, i) => x.nm >= toc - 1e-9 && slope[i] < x.b - 100);
  if (from < 0) from = n;
  // bornes de pente (descente, montée) et descente qui ne remonte pas, jusqu'à ce que plus rien ne bouge
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    const lower = (i, ft) => {
      if (ft < v[i] - 1e-6) {
        v[i] = ft;
        moved = true;
      }
    };
    for (let i = n - 2; i >= 0; i--) lower(i, v[i + 1] + dn * (nodes[i + 1].nm - nodes[i].nm));
    for (let i = 1; i < n; i++) lower(i, v[i - 1] + up * (nodes[i].nm - nodes[i - 1].nm));
    for (let i = from + 1; i < n; i++) lower(i, v[i - 1]);
    if (!moved) break;
  }
  v[n - 1] = Math.max(v[n - 1], arrFt);
  return nodes.map((x, i) => ({
    nm: x.nm,
    ft: Math.round(v[i] / 10) * 10
  }));
}

/** Distance du départ (NM, sur le chemin) du point du chemin le plus proche de la position pos { lat, lon } : projection sur le
 *  tronçon le plus proche (plan local, assez exact sur un tronçon) ; null sans chemin de deux points ni position. */
export function nmAlong(path, pos) {
  const pts = (path || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon) && Number.isFinite(+p?.nm));
  if (pts.length < 2 || !Number.isFinite(+pos?.lat) || !Number.isFinite(+pos?.lon)) return null;
  const kx = Math.cos(+pos.lat * R);
  let best = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      lon = x => {
        let d = +x - +pos.lon; // longitude relative à la position, dans [-180, 180[ (une route qui passe 180°)
        d -= 360 * Math.round(d / 360);
        return d * kx;
      },
      ax = lon(a.lon),
      ay = +a.lat - +pos.lat,
      bx = lon(b.lon),
      by = +b.lat - +pos.lat,
      dx = bx - ax,
      dy = by - ay,
      len2 = dx * dx + dy * dy,
      t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0,
      d2 = (ax + dx * t) ** 2 + (ay + dy * t) ** 2;
    if (!best || d2 < best.d2) best = {
      d2,
      nm: +a.nm + (+b.nm - +a.nm) * t
    };
  }
  return best.nm;
}
