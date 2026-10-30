// Maquette « Atmosphère de la route » (labs/atmosphere/README.md) — calculs purs : demandes Open-Meteo par niveaux de
// pression (route et grille de la carte), colonnes d'atmosphère à une heure, lecture à une altitude pression
// (interpolation en ln p, sol compris), densité et altitude-densité, inversions, isothermes 0 °C, givrage indicatif,
// trajectoire du vol (niveau demandé, paliers planifiés, montée et descente calculées), courbes de niveau d'une grille
// (marching squares). Reprend les conversions et l'échantillonnage de modules/fuel/winds.js. Ni page, ni réseau.

import {
  LEVELS,
  paFt,
  hPaOf,
  isaC,
  modelFor,
  samples
} from '../fuel/winds.js';
import {
  wrapLon,
  nearLon,
  unwrapLons
} from '../../frame/lib/geo.js';

export {
  LEVELS,
  paFt,
  hPaOf,
  isaC,
  modelFor,
  samples
};

const FT = 0.3048,
  R = Math.PI / 180;

// longitudes autour de la ligne de changement de date : l'aide partagée du cadre (frame/lib/geo.js, même logique)
export {
  wrapLon,
  nearLon,
  unwrapLons
};

/** Variables par niveau de pression : route (coupe complète) et grille de la carte (sans nébulosité : tirée de RH). */
export const ROUTE_LEVEL_VARS = ['temperature', 'relative_humidity', 'cloud_cover', 'geopotential_height', 'wind_speed', 'wind_direction'];
export const GRID_LEVEL_VARS = ['temperature', 'relative_humidity', 'geopotential_height', 'wind_speed', 'wind_direction'];
/** Variables de surface (route, puis grille). */
export const ROUTE_SURFACE_VARS = ['temperature_2m', 'dew_point_2m', 'pressure_msl', 'surface_pressure', 'cloud_cover', 'cloud_cover_low',
  'cloud_cover_mid', 'cloud_cover_high', 'freezing_level_height', 'cape', 'visibility', 'precipitation', 'wind_speed_10m',
  'wind_direction_10m'
];
export const GRID_SURFACE_VARS = ['temperature_2m', 'pressure_msl', 'surface_pressure', 'cloud_cover_low', 'cloud_cover_mid',
  'cloud_cover_high', 'wind_speed_10m', 'wind_direction_10m'
];

/** Niveaux utiles jusqu'à une altitude pression (ft) : ceux d'en dessous et le premier au-dessus (la coupe s'arrête là). */
export const levelsUpTo = ft => {
  const i = LEVELS.findIndex(l => paFt(l) >= ft);
  return i < 0 ? LEVELS.slice() : LEVELS.slice(0, i + 1);
};

/** Niveaux qui encadrent des altitudes pression (ft) : pour chacune, le niveau juste en dessous et celui juste au-dessus
 *  (la lecture en ln p n'a besoin que d'eux) ; triés du sol vers le haut. Allège la grille de la carte. */
export function bracketLevels(fts) {
  const out = new Set();
  for (const ft of fts) {
    const i = LEVELS.findIndex(l => paFt(l) >= ft);
    if (i < 0) out.add(LEVELS.at(-1));
    else {
      out.add(LEVELS[i]);
      if (i > 0) out.add(LEVELS[i - 1]);
    }
  }
  return LEVELS.filter(l => out.has(l));
}

/** Adresse d'une demande Open-Meteo pour des lieux [{ lat, lon }] : variables par niveau × niveaux, variables de surface
 *  (ou la liste vars telle quelle), vent en nœuds, heures Unix, deux jours ; avec une clé, le service client
 *  (customer-api). */
export function forecastUrl(places, {
  model,
  levels = LEVELS,
  levelVars = ROUTE_LEVEL_VARS,
  surfaceVars = ROUTE_SURFACE_VARS,
  vars = null,
  key = '',
  days = 2
} = {}) {
  const f = v => (+v).toFixed(3),
    hourly = (vars || [...surfaceVars, ...levels.flatMap(l => levelVars.map(v => `${v}_${l}hPa`))]).join(',');
  return `https://${key ? 'customer-api' : 'api'}.open-meteo.com/v1/forecast` +
    `?latitude=${places.map(p => f(p.lat)).join(',')}&longitude=${places.map(p => f(p.lon)).join(',')}` +
    `&hourly=${hourly}&wind_speed_unit=kn&timeformat=unixtime&forecast_days=${days}` +
    (model ? `&models=${encodeURIComponent(model)}` : '') + (key ? `&apikey=${encodeURIComponent(key)}` : '');
}

/** Poids approximatif d'une demande dans le décompte d'Open-Meteo (un appel par lieu et par tranche de 10 variables). */
export const callWeight = (nPlaces, nVars) => nPlaces * Math.max(1, nVars / 10);

/** Point de rosée (°C), formule de Magnus. */
export const dewPoint = (tC, rh) => {
  if (!Number.isFinite(tC) || !Number.isFinite(rh) || rh <= 0) return null;
  const g = Math.log(Math.min(rh, 100) / 100) + 17.62 * tC / (243.12 + tC);
  return 243.12 * g / (17.62 - g);
};
/** Humidité relative (%) d'une température et d'un point de rosée (°C). */
export const relHum = (tC, tdC) => Number.isFinite(tC) && Number.isFinite(tdC) ? Math.min(100, 100 * Math.exp(17.62 * tdC / (243.12 + tdC) -
  17.62 * tC / (243.12 + tC))) : null;
/** Nébulosité (%) tirée de l'humidité relative quand le modèle n'en donne pas (Sundqvist, seuil 80 % au sol, 70 % en altitude). */
export const cloudFromRh = (rh, hPa = 850) => {
  if (!Number.isFinite(rh)) return null;
  const rhc = hPa >= 700 ? 0.8 : 0.7,
    x = Math.min(rh, 100) / 100;
  return x <= rhc ? 0 : Math.round(100 * (1 - Math.sqrt((1 - x) / (1 - rhc))));
};

/** Masse volumique de l'air (kg/m³) à une pression (hPa), une température et un point de rosée (°C) : température
 *  virtuelle comprise. */
export function density(hPa, tC, tdC = null) {
  const e = Number.isFinite(tdC) ? 6.112 * Math.exp(17.67 * tdC / (tdC + 243.5)) : 0,
    q = 0.622 * e / Math.max(1, hPa - 0.378 * e),
    tv = (tC + 273.15) * (1 + 0.608 * q);
  return hPa * 100 / (287.05 * tv);
}
/** Altitude-densité (ft) d'une masse volumique (kg/m³), atmosphère type. */
export const densityAltFt = rho => 145442.16 * (1 - (rho / 1.225) ** 0.234969);

/** Réponse d'Open-Meteo (objet ou tableau) → lieux [{ lat, lon, elevFt, times, h (séries horaires) }]. */
export const locations = json => [].concat(json || []).map(loc => ({
  lat: +loc?.latitude,
  lon: +loc?.longitude,
  elevFt: Number.isFinite(+loc?.elevation) ? +loc.elevation / FT : 0,
  times: loc?.hourly?.time || [],
  h: loc?.hourly || {}
}));

/** Indice de l'heure la plus proche de t (secondes). */
export function hourIndex(times, t) {
  let k = 0;
  for (let i = 1; i < times.length; i++)
    if (Math.abs(times[i] - t) < Math.abs(times[k] - t)) k = i;
  return k;
}

/** Colonne d'atmosphère d'un lieu à l'heure d'indice k : surface { tC, tdC, rh, mslp, psfc, pa (altitude pression du
 *  sol, ft), cc, ccL, ccM, ccH, fzlFt, cape, visM, precip, dir, kt } et niveaux au-dessus du sol, du bas vers le haut
 *  [{ hPa, ft (altitude pression), zFt (altitude vraie), tC, tdC, rh, cc, dir, kt }] ; le sol en tête (sfc: true). */
export function column(loc, k) {
  const h = loc.h,
    v = name => {
      const x = h[name]?.[k];
      return x === null || x === undefined || !Number.isFinite(+x) ? null : +x;
    },
    psfc = v('surface_pressure') ?? hPaOf(loc.elevFt),
    t2 = v('temperature_2m'),
    td2 = v('dew_point_2m'),
    sfc = {
      tC: t2,
      tdC: td2,
      rh: relHum(t2, td2),
      mslp: v('pressure_msl'),
      psfc,
      pa: paFt(psfc),
      zFt: loc.elevFt,
      cc: v('cloud_cover'),
      ccL: v('cloud_cover_low'),
      ccM: v('cloud_cover_mid'),
      ccH: v('cloud_cover_high'),
      fzlFt: v('freezing_level_height') == null ? null : v('freezing_level_height') / FT,
      cape: v('cape'),
      visM: v('visibility'),
      precip: v('precipitation'),
      dir: v('wind_direction_10m'),
      kt: v('wind_speed_10m')
    },
    levels = LEVELS.map(l => {
      const tC = v(`temperature_${l}hPa`),
        rh = v(`relative_humidity_${l}hPa`),
        gh = v(`geopotential_height_${l}hPa`);
      return {
        hPa: l,
        ft: paFt(l),
        zFt: gh == null ? null : gh / FT,
        tC,
        rh,
        tdC: dewPoint(tC, rh),
        cc: v(`cloud_cover_${l}hPa`) ?? cloudFromRh(rh, l),
        dir: v(`wind_direction_${l}hPa`),
        kt: v(`wind_speed_${l}hPa`)
      };
    }).filter(x => x.tC != null && x.hPa < psfc - 1);
  const ground = {
    hPa: psfc,
    ft: sfc.pa,
    zFt: loc.elevFt,
    tC: t2 ?? levels[0]?.tC ?? null,
    rh: sfc.rh ?? levels[0]?.rh ?? null,
    tdC: td2 ?? levels[0]?.tdC ?? null,
    cc: levels[0]?.cc ?? null,
    dir: sfc.dir,
    kt: sfc.kt,
    sfc: true
  };
  return {
    lat: loc.lat,
    lon: loc.lon,
    time: loc.times[k] ?? null,
    elevFt: loc.elevFt,
    sfc,
    levels: ground.tC == null ? levels : [ground, ...levels]
  };
}

const vec = (dir, kt) => [kt * Math.sin(dir * R), kt * Math.cos(dir * R)];
const lerp = (a, b, k) => a == null || b == null ? (a ?? b) : a + (b - a) * k;

/** Atmosphère d'une colonne à une altitude pression ft (interpolation en ln p entre les deux niveaux qui l'encadrent ;
 *  sous le sol : null ; au-dessus du dernier niveau : le dernier). { ft, hPa, zFt, tC, tdC, rh, cc, dirDeg, kt, isaDev,
 *  rho, daFt, below } ; below : sous le sol. */
export function at(col, ft) {
  const L = col?.levels || [];
  if (!L.length) return null;
  if (ft < L[0].ft - 1) return {
    ft,
    below: true
  };
  const p = Math.log(hPaOf(ft));
  let a = L.at(-1),
    b = a;
  for (let i = 1; i < L.length; i++)
    if (p >= Math.log(L[i].hPa)) {
      a = L[i - 1];
      b = L[i];
      break;
    }
  const k = a === b ? 0 : Math.max(0, Math.min(1, (Math.log(a.hPa) - p) / (Math.log(a.hPa) - Math.log(b.hPa)))),
    tC = lerp(a.tC, b.tC, k),
    tdC = lerp(a.tdC, b.tdC, k),
    hPa = hPaOf(ft);
  let dirDeg = null,
    kt = null;
  if (a.dir != null && b.dir != null) {
    const va = vec(a.dir, a.kt),
      vb = vec(b.dir, b.kt),
      x = lerp(va[0], vb[0], k),
      y = lerp(va[1], vb[1], k);
    dirDeg = (Math.atan2(x, y) / R + 360) % 360;
    kt = Math.hypot(x, y);
  }
  const rho = tC == null ? null : density(hPa, tC, tdC);
  return {
    ft,
    hPa,
    zFt: lerp(a.zFt, b.zFt, k),
    tC,
    tdC,
    rh: lerp(a.rh, b.rh, k),
    cc: lerp(a.cc, b.cc, k),
    dirDeg,
    kt,
    isaDev: tC == null ? null : tC - isaC(ft),
    rho,
    daFt: rho == null ? null : densityAltFt(rho),
    below: false
  };
}

/** Pression (hPa) à une altitude vraie zFt dans une colonne (isobares à altitude constante), par les hauteurs
 *  géopotentielles ; null hors des niveaux. */
export function pressureAtZ(col, zFt) {
  const L = (col?.levels || []).filter(x => x.zFt != null);
  for (let i = 1; i < L.length; i++)
    if (zFt >= L[i - 1].zFt && zFt <= L[i].zFt) {
      const k = (zFt - L[i - 1].zFt) / ((L[i].zFt - L[i - 1].zFt) || 1);
      return Math.exp(Math.log(L[i - 1].hPa) + (Math.log(L[i].hPa) - Math.log(L[i - 1].hPa)) * k);
    }
  return null;
}

/** Couches d'inversion d'une colonne (sol compris), contiguës fusionnées : [{ fromFt, toFt, dT, ground }]. Un
 *  isotherme (écart < 0,3 °C sur la couche) n'en est pas une. */
export function inversions(col) {
  const L = col?.levels || [],
    out = [];
  for (let i = 1; i < L.length; i++) {
    const dT = L[i].tC - L[i - 1].tC;
    if (!(dT > 0.3)) continue;
    const last = out.at(-1);
    if (last && Math.abs(last.toFt - L[i - 1].ft) < 1) {
      last.toFt = L[i].ft;
      last.dT += dT;
    } else out.push({
      fromFt: L[i - 1].ft,
      toFt: L[i].ft,
      dT,
      ground: !!L[i - 1].sfc
    });
  }
  return out.map(x => ({
    ...x,
    dT: Math.round(x.dT * 10) / 10
  }));
}

/** Altitudes pression (ft) où la température passe 0 °C (plusieurs avec une inversion), du bas vers le haut. */
export function zeroIsotherms(col) {
  const L = col?.levels || [],
    out = [];
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1],
      b = L[i];
    if ((a.tC > 0) !== (b.tC > 0)) out.push(a.ft + (b.ft - a.ft) * a.tC / ((a.tC - b.tC) || 1));
  }
  return out;
}

/** Risque de givrage indicatif : 2 (probable : −12 à 0 °C dans un nuage ≥ 60 % ou RH ≥ 90 %), 1 (possible : −20 à +1 °C,
 *  nuage ≥ 30 % ou RH ≥ 80 %), 0 sinon. Ni eau surfondue ni taille des gouttes : une alerte, pas une prévision. */
export function icing(x) {
  if (!x || x.tC == null) return 0;
  const wet2 = (x.cc ?? 0) >= 60 || (x.rh ?? 0) >= 90,
    wet1 = (x.cc ?? 0) >= 30 || (x.rh ?? 0) >= 80;
  if (x.tC <= 0 && x.tC >= -12 && wet2) return 2;
  if (x.tC <= 1 && x.tC >= -20 && wet1) return 1;
  return 0;
}

/** Base des cumulus (ft, altitude pression) : niveau de condensation (≈ 400 ft par degré d'écart au point de rosée,
 *  au-dessus du sol) ; null sans point de rosée. */
export const cumulusBaseFt = col => col?.sfc?.tC != null && col.sfc.tdC != null ? col.sfc.pa + 400 * Math.max(0, col.sfc.tC - col.sfc.tdC) :
  null;

/** Distance orthodromique (NM) et route vraie (°). */
export const gcNm = (a, b) => {
  const d = Math.sin((b.lat - a.lat) * R / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin((b.lon - a.lon) * R / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(d)));
};
export const bearing = (a, b) => {
  const y = Math.sin((b.lon - a.lon) * R) * Math.cos(b.lat * R),
    x = Math.cos(a.lat * R) * Math.sin(b.lat * R) - Math.sin(a.lat * R) * Math.cos(b.lat * R) * Math.cos((b.lon - a.lon) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
};

/** Vitesse de croisière (kt) lue dans le texte de route (groupe N0236F270), sinon null. */
export const cruiseKtOf = text => {
  const m = /\bN(\d{4})(?:F\d{3}|A\d{3})?\b/.exec(String(text || ''));
  return m ? +m[1] : null;
};

/** Trajectoire du vol : points [{ id, lat, lon, alt_ft }], niveau demandé levelFt, profil de Carburant (climbFpm,
 *  climbKt, descentFpm, descentKt, tocNm, todNm ; manquant : 1 200 ft/min à 220 kt et 1 500 ft/min à 250 kt, règles de
 *  modules/fuel/SPEC.md § 3), altitudes pression du départ et de l'arrivée (ft), vitesse de croisière (kt). Sortie :
 *  { total, nmOf (distance de chaque point), requested(nm), planned(nm), computed(nm), phase(nm), minutesAt(nm),
 *    toc, tod, steps [{ nm, ft, id }] }. */
export function trajectory(points, {
  levelFt,
  profile = {},
  depFt = 0,
  arrFt = 0,
  cruiseKt = 180,
  // chemin vertical de Carburant (profile.path [{ nm, ft }], distances du chemin volé, procédures comprises) : suivi exactement,
  // ramené au prorata sur la route (utilisateur, 29 octobre : « la coupe ignore les altitudes imposées »)
  path = null,
  // vent de face (kt, négatif : arrière) à une distance et une altitude : le temps suit la vitesse sol (30 kt de face = 30 kt de
  // vitesse sol en moins)
  headAt = null
} = {}) {
  const pts = points || [],
    nmOf = [0];
  for (let i = 1; i < pts.length; i++) nmOf.push(nmOf[i - 1] + gcNm(pts[i - 1], pts[i]));
  const total = nmOf.at(-1) || 0,
    climbFpm = +profile?.climbFpm || 1200,
    climbKt = +profile?.climbKt || 220,
    descFpm = +profile?.descentFpm || 1500,
    descKt = +profile?.descentKt || 250,
    // pentes (ft par NM) : celles du profil de Carburant quand il donne TOC / TOD, sinon taux ÷ vitesse
    upG = +profile?.tocNm > 0 ? Math.max(1, (levelFt - depFt) / profile.tocNm) : climbFpm / (climbKt / 60),
    downG = +profile?.todNm > 0 ? Math.max(1, (levelFt - arrFt) / profile.todNm) : descFpm / (descKt / 60),
    steps = [{
      nm: 0,
      ft: levelFt,
      id: pts[0]?.id || ''
    }];
  pts.forEach((p, i) => {
    if (i > 0 && i < pts.length - 1 && +p.alt_ft > 0) steps.push({
      nm: nmOf[i],
      ft: +p.alt_ft,
      id: p.id || ''
    });
  });
  const planned = nm => {
    let ft = levelFt;
    for (const s of steps)
      if (s.nm <= nm + 1e-6) ft = s.ft;
    return ft;
  };
  // trajectoire avant (montées et descentes vers chaque palier), échantillonnée tous les 0,5 NM, bornée par la descente
  const d = 0.5,
    n = Math.max(2, Math.ceil(total / d)),
    fwd = new Float64Array(n + 1);
  let alt = depFt;
  for (let i = 0; i <= n; i++) {
    const nm = Math.min(total, i * d),
      target = planned(nm);
    if (i) alt = alt < target ? Math.min(target, alt + upG * d) : Math.max(target, alt - downG * d);
    fwd[i] = alt;
  }
  const descent = nm => arrFt + (total - nm) * downG,
    vp = Array.isArray(path) ? path.filter(p => Number.isFinite(+p?.nm) && Number.isFinite(+p?.ft)) : [],
    scale = vp.length >= 2 && total > 0 ? +vp.at(-1).nm / total : 0,
    onPath = nm => {
      const x = nm * scale;
      if (x <= +vp[0].nm) return +vp[0].ft;
      for (let i = 1; i < vp.length; i++)
        if (x <= +vp[i].nm) {
          const a = vp[i - 1],
            b = vp[i],
            k = +b.nm - +a.nm;
          return k > 0 ? +a.ft + (x - +a.nm) / k * (+b.ft - +a.ft) : +b.ft;
        }
      return +vp.at(-1).ft;
    },
    computed = nm => {
      if (scale > 0) return onPath(Math.max(0, Math.min(total, nm)));
      const x = Math.max(0, Math.min(n, nm / d)),
        i = Math.floor(x),
        f = x - i,
        v = i >= n ? fwd[n] : fwd[i] + (fwd[i + 1] - fwd[i]) * f;
      return Math.max(Math.min(v, descent(nm)), Math.min(depFt, arrFt) - 1e3);
    };
  if (scale > 0)
    for (let i = 0; i <= n; i++) fwd[i] = computed(Math.min(total, i * d));
  let toc = null,
    tod = null;
  // TOC : premier palier atteint (le niveau demandé, ou un palier planifié pris pendant la montée)
  if (scale > 0) {
    // sur le chemin de Carburant : TOC et TOD au premier et au dernier point du niveau le plus haut
    const hi = Math.max(...fwd);
    for (let i = 0; i <= n; i++)
      if (toc == null && fwd[i] >= hi - 1) toc = Math.min(total, i * d);
    for (let i = n; i >= 0; i--)
      if (fwd[i] >= hi - 1) {
        tod = Math.min(total, i * d);
        break;
      }
  } else {
    for (let i = 0; i <= n; i++)
      if (toc == null && Math.abs(fwd[i] - planned(Math.min(total, i * d))) < 1) toc = i * d;
    for (let i = n; i >= 0; i--)
      if (descent(i * d) >= fwd[i] - 1) {
        tod = Math.min(total, i * d);
        break;
      }
  }
  const phase = nm => {
    if (tod != null && nm >= tod) return 'descent';
    const a = computed(Math.max(0, nm - 1)),
      b = computed(Math.min(total, nm + 1));
    return b - a > 50 ? 'climb' : a - b > 50 ? 'descent' : 'cruise';
  };
  // temps (min) : vitesse vraie de la phase, moins le vent de face quand headAt le donne (vitesse sol, jamais sous 40 kt)
  const minutesAt = nm => {
    let m = 0;
    for (let x = 0; x < nm; x += 1) {
      const ph = phase(x + 0.5),
        tas = ph === 'climb' ? climbKt : ph === 'descent' ? descKt : cruiseKt,
        head = headAt ? +headAt(x + 0.5, computed(x + 0.5)) || 0 : 0;
      m += Math.min(1, nm - x) / Math.max(40, tas - head) * 60;
    }
    return m;
  };
  return {
    total,
    nmOf,
    requested: () => levelFt,
    planned,
    computed,
    phase,
    minutesAt,
    toc,
    tod,
    steps,
    grads: {
      upG,
      downG
    }
  };
}

/** Lieu à une distance le long de la route (interpolation linéaire par tronçon). */
export function posAt(points, nmOf, nm) {
  for (let i = 1; i < points.length; i++)
    if (nm <= nmOf[i] || i === points.length - 1) {
      const f = Math.max(0, Math.min(1, (nm - nmOf[i - 1]) / ((nmOf[i] - nmOf[i - 1]) || 1)));
      return {
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * f,
        lon: points[i - 1].lon + (points[i].lon - points[i - 1].lon) * f,
        leg: i - 1,
        track: bearing(points[i - 1], points[i])
      };
    }
  return {
    ...points[0],
    leg: 0,
    track: 0
  };
}

/** Composantes du vent sur une route vraie : { head (face, kt ; négatif : arrière), cross (traversier, kt, + de la
 *  droite) }. */
export const windComponents = (dirDeg, kt, trackDeg) => {
  if (dirDeg == null || kt == null) return null;
  const a = (dirDeg - trackDeg) * R;
  return {
    head: kt * Math.cos(a),
    cross: kt * Math.sin(a)
  };
};

/** Grille de la carte autour de la route : emprise élargie (au moins 1,5° ou un quart de l'étendue), nx × ny lieux
 *  au plus max ; { bbox: [w, s, e, n], nx, ny, places [{ lat, lon, i, j }] } (i : colonne d'ouest en est, j : ligne du
 *  sud au nord). */
export function grid(points, max = 48) {
  points = unwrapLons(points); // la ligne de changement de date passée : une grille d'un seul tenant
  const lats = points.map(p => +p.lat),
    lons = points.map(p => +p.lon);
  let s = Math.min(...lats),
    n = Math.max(...lats),
    w = Math.min(...lons),
    e = Math.max(...lons);
  const mLat = Math.max(1.5, (n - s) * 0.25),
    mLon = Math.max(1.5 / Math.cos((s + n) / 2 * R), (e - w) * 0.25);
  s = Math.max(-80, s - mLat); // Mercator : pas au-delà de 80°
  n = Math.min(80, n + mLat);
  w -= mLon;
  e += mLon;
  const aspect = (e - w) * Math.cos((s + n) / 2 * R) / (n - s),
    ny = Math.max(3, Math.round(Math.sqrt(max / aspect))),
    nx = Math.max(3, Math.floor(max / ny)),
    places = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) places.push({
      lat: s + (n - s) * j / (ny - 1),
      lon: w + (e - w) * i / (nx - 1),
      i,
      j
    });
  return {
    bbox: [w, s, e, n],
    nx,
    ny,
    places
  };
}

/** Grille plus fine par interpolation bilinéaire (facteur f) : values (nx × ny, ligne par ligne, null permis) →
 *  { nx, ny, v }. */
export function refine(values, nx, ny, f = 4) {
  const NX = (nx - 1) * f + 1,
    NY = (ny - 1) * f + 1,
    v = new Array(NX * NY);
  const g = (i, j) => values[j * nx + i];
  for (let J = 0; J < NY; J++)
    for (let I = 0; I < NX; I++) {
      const x = I / f,
        y = J / f,
        i = Math.min(nx - 2, Math.floor(x)),
        j = Math.min(ny - 2, Math.floor(y)),
        fx = x - i,
        fy = y - j,
        q = [g(i, j), g(i + 1, j), g(i, j + 1), g(i + 1, j + 1)];
      v[J * NX + I] = q.some(z => z == null) ? null : q[0] * (1 - fx) * (1 - fy) + q[1] * fx * (1 - fy) + q[2] * (1 - fx) * fy + q[3] * fx *
        fy;
    }
  return {
    nx: NX,
    ny: NY,
    v
  };
}

/** Courbes de niveau d'une grille régulière (marching squares) : values (nx × ny), seuils → [{ level, segs: [[x1, y1,
 *  x2, y2], …] }] en coordonnées de grille (0 … nx − 1, 0 … ny − 1). */
export function contours(values, nx, ny, thresholds) {
  return thresholds.map(level => {
    const segs = [];
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = values[j * nx + i],
          b = values[j * nx + i + 1],
          c = values[(j + 1) * nx + i + 1],
          d = values[(j + 1) * nx + i];
        if (a == null || b == null || c == null || d == null) continue;
        const idx = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const t = (p, q) => (level - p) / ((q - p) || 1e-9),
          bot = [i + t(a, b), j],
          rgt = [i + 1, j + t(b, c)],
          top = [i + t(d, c), j + 1],
          lft = [i, j + t(a, d)],
          add = (p, q) => segs.push([p[0], p[1], q[0], q[1]]);
        switch (idx) {
          case 1:
          case 14:
            add(lft, bot);
            break;
          case 2:
          case 13:
            add(bot, rgt);
            break;
          case 3:
          case 12:
            add(lft, rgt);
            break;
          case 4:
          case 11:
            add(rgt, top);
            break;
          case 6:
          case 9:
            add(bot, top);
            break;
          case 7:
          case 8:
            add(lft, top);
            break;
          case 5:
            add(lft, bot);
            add(rgt, top);
            break;
          case 10:
            add(bot, rgt);
            add(lft, top);
            break;
        }
      }
    return {
      level,
      segs
    };
  });
}

/** Seuils réguliers d'un pas couvrant [min, max]. */
export const thresholdsOf = (vals, step) => {
  const v = vals.filter(Number.isFinite);
  if (!v.length) return [];
  const out = [];
  for (let x = Math.ceil(Math.min(...v) / step) * step; x <= Math.max(...v); x += step) out.push(Math.round(x * 1000) / 1000);
  return out;
};
