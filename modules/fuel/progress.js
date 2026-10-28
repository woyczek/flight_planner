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

/** Altitude d'un point du chemin après sa contrainte de procédure (ft) : at → ft ; max → au plus ft ; min → au moins ft ;
 *  between → dans l'intervalle ; le seuil d'une piste (rwy) vaut son altitude quand elle est connue ; sans contrainte, base. */
function constrained(p, base) {
  if (p.rwy && Number.isFinite(+p.elev)) return +p.elev;
  const a = p.alt;
  if (!a || !Number.isFinite(+a.ft)) return base;
  const ft = +a.ft;
  if (a.type === 'at') return ft;
  if (a.type === 'max') return Math.min(base, ft);
  if (a.type === 'min') return Math.max(base, ft);
  if (a.type === 'between' && Number.isFinite(+a.ft2)) return Math.min(Math.max(base, Math.min(ft, +a.ft2)), Math.max(ft, +a.ft2));
  return base;
}

/** Chemin vertical prévu [{ nm, ft }] le long de flownPath : la montée, la croisière (et ses paliers) et la descente du devis q
 *  comme le modèle les compte, puis la contrainte d'altitude de chaque point appliquée là où elle est plus serrée (at → ft,
 *  max → au plus, min → au moins, between → dans l'intervalle), linéaire par morceaux entre les points. Le départ et l'arrivée
 *  sont à l'altitude du seuil de piste choisie quand elle est connue, sinon à 0 ft. nm arrondi au dixième, ft à la dizaine ;
 *  [] sans devis chiffré ni chemin de deux points. */
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
    dnGrad = descNm > 0 ? last / descNm : 300;
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
  // les ruptures de la base et chaque point du chemin, dans l'ordre ; la contrainte d'un point prend le dessus quand elle est plus
  // serrée. Une fois passé le sommet de montée, dès qu'une contrainte fait descendre le chemin sous la base, la descente est
  // commencée : le chemin ne remonte plus vers la croisière de la base (la base et sa descente n'y suivent que s'ils sont plus bas).
  const at = new Map(); // nm (au dixième) → { base, p }
  for (const b of base) at.set(Math.round(b.nm * 10) / 10, {
    p: null
  });
  for (const p of pts) at.set(Math.round(+p.nm * 10) / 10, {
    p
  });
  const out = [];
  let descending = false,
    prev = depFt;
  for (const nm of [...at.keys()].sort((a, b) => a - b)) {
    const p = at.get(nm).p,
      b = baseAt(nm),
      ref = descending ? Math.min(b, prev) : b,
      v = p ? constrained(p, ref) : ref;
    if (!descending && p && nm >= toc && v < b - 100) descending = true;
    prev = v;
    out.push({
      nm,
      ft: Math.round(v / 10) * 10
    });
  }
  return out;
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
