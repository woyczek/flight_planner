// V3 fuel — vents et températures en altitude en calcul pur (modules/fuel/SPEC.md § 11) : prévision par niveaux de
// pression d'Open-Meteo (api.open-meteo.com/v1/forecast, sans clé), lue aux points de la route ; vent et température
// au niveau planifié (un niveau de vol est une pression : interpolation en logarithme de la pression), vent moyen le
// long de la route pondéré par la longueur des tronçons, et profil de l'atmosphère au départ (température par
// niveau, inversions, altitude-densité). Ni page, ni stockage, ni réseau : module.js appelle et garde.

import {
  wrapLon,
  unwrapLons
} from '../../frame/lib/geo.js';

/** Niveaux de pression demandés (hPa), du sol vers le haut. */
export const LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200];

/** Altitude pression (ft) d'une pression (hPa), atmosphère type (troposphère). */
export const paFt = hPa => (1 - (hPa / 1013.25) ** 0.190263) / 6.87559e-6;
/** Pression (hPa) d'une altitude pression (ft). */
export const hPaOf = ft => 1013.25 * (1 - 6.87559e-6 * ft) ** 5.25588;
/** Température type (°C) à une altitude pression (ft), troposphère. */
export const isaC = ft => 15 - 0.0019812 * ft;

/** Modèle de prévision selon le lieu (milieu de la route) : AROME / ARPEGE de Météo-France sur la France et ses
 *  abords, ICON (DWD) sur le reste de l'Europe, GFS (NOAA) ailleurs. { id (paramètre models d'Open-Meteo), name, short }. */
export function modelFor(lat, lon) {
  if (lat >= 38 && lat <= 55 && lon >= -10 && lon <= 16) return {
    id: 'meteofrance_seamless',
    name: 'Météo-France AROME / ARPEGE',
    short: 'ARPEGE'
  };
  if (lat >= 30 && lat <= 72 && lon >= -30 && lon <= 45) return {
    id: 'icon_seamless',
    name: 'DWD ICON',
    short: 'ICON'
  };
  return {
    id: 'gfs_seamless',
    name: 'NOAA GFS',
    short: 'GFS'
  };
}

/** Variables horaires demandées : température, vent (force, direction) à chaque niveau de LEVELS. */
export const hourlyVars = () => LEVELS.flatMap(l => [`temperature_${l}hPa`, `wind_speed_${l}hPa`, `wind_direction_${l}hPa`]).join(',');

/** Adresse d'une demande pour des lieux [{ lat, lon }] (une seule demande, lieux séparés par des virgules) : vent en
 *  nœuds, heures en secondes Unix, deux jours. */
export function forecastUrl(places, model) {
  const f = v => (+v).toFixed(3);
  return 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${places.map(p => f(p.lat)).join(',')}&longitude=${places.map(p => f(p.lon)).join(',')}` +
    `&hourly=${hourlyVars()}&wind_speed_unit=kn&timeformat=unixtime&forecast_days=2&models=${encodeURIComponent(model)}`;
}

/** Réponse d'Open-Meteo (un objet ou un tableau, un par lieu) → profils à l'heure la plus proche de t (secondes) :
 *  [{ lat, lon, time, levels: [{ hPa, ft, tC, dir, kt }] }] (niveaux sans valeur écartés). */
export function profiles(json, t) {
  return [].concat(json || []).map(loc => {
    const h = loc?.hourly || {},
      times = h.time || [];
    let k = 0;
    for (let i = 1; i < times.length; i++)
      if (Math.abs(times[i] - t) < Math.abs(times[k] - t)) k = i;
    const levels = LEVELS.map(l => ({
      hPa: l,
      ft: paFt(l),
      tC: h[`temperature_${l}hPa`]?.[k],
      dir: h[`wind_direction_${l}hPa`]?.[k],
      kt: h[`wind_speed_${l}hPa`]?.[k]
    })).filter(x => Number.isFinite(x.tC) && Number.isFinite(x.dir) && Number.isFinite(x.kt));
    return {
      lat: +loc?.latitude,
      lon: +loc?.longitude,
      time: times[k] ?? null,
      levels
    };
  });
}

/** Vent et température d'un profil à une altitude pression ft : interpolation en ln(p) entre les deux niveaux qui
 *  l'encadrent, le vent en vecteur ; au-delà des niveaux, le plus proche. { dirDeg, kt, tC, isaDev } ou null. */
export function atLevel(profile, ft) {
  const L = profile?.levels || [];
  if (!L.length) return null;
  const p = Math.log(hPaOf(Math.max(0, ft)));
  let a = L[0],
    b = L[0];
  if (p >= Math.log(L[0].hPa)) a = b = L[0];
  else if (p <= Math.log(L.at(-1).hPa)) a = b = L.at(-1);
  else
    for (let i = 1; i < L.length; i++)
      if (p >= Math.log(L[i].hPa)) {
        a = L[i - 1];
        b = L[i];
        break;
      }
  const k = a === b ? 0 : (Math.log(a.hPa) - p) / (Math.log(a.hPa) - Math.log(b.hPa)),
    vec = x => {
      const r = x.dir * Math.PI / 180;
      return [x.kt * Math.sin(r), x.kt * Math.cos(r)];
    },
    va = vec(a),
    vb = vec(b),
    x = va[0] + (vb[0] - va[0]) * k,
    y = va[1] + (vb[1] - va[1]) * k,
    tC = a.tC + (b.tC - a.tC) * k;
  return {
    dirDeg: Math.round((Math.atan2(x, y) * 180 / Math.PI + 360) % 360),
    kt: Math.round(Math.hypot(x, y)),
    tC: Math.round(tC * 10) / 10,
    isaDev: Math.round(tC - isaC(ft))
  };
}

/** Distance orthodromique (NM). */
const gc = (a, b) => {
  const r = Math.PI / 180,
    d = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(d)));
};

/** Lieux de lecture le long de la route : chaque point, plus des points intermédiaires tous les stepNm environ ;
 *  au plus max lieux (le pas grandit). [{ lat, lon, nm (depuis le départ), point (indice du point de route ou -1) }].
 *  Les longitudes sont interpolées sur la route déroulée (frame/lib/geo.js : une route qui passe la ligne de changement de
 *  date, 177° puis −165°, va de 177° à 195° : sans cela, les lieux intermédiaires feraient le tour du monde) ; les lieux
 *  rendus sont enroulés dans [-180, 180[ (une longitude déjà dans cet intervalle est rendue telle quelle). */
export function samples(points, stepNm = 50, max = 24) {
  const raw = (points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    pts = unwrapLons(raw);
  if (!pts.length) return [];
  const wrap = lon => lon >= -180 && lon < 180 ? lon : wrapLon(lon),
    total = pts.slice(1).reduce((s, p, i) => s + gc(pts[i], p), 0);
  let step = Math.max(stepNm, total / Math.max(1, max - pts.length));
  const out = [];
  let cum = 0;
  pts.forEach((p, i) => {
    if (i) {
      const a = pts[i - 1],
        len = gc(a, p),
        n = Math.floor(len / step);
      for (let k = 1; k <= n; k++) {
        const f = k / (n + 1);
        out.push({
          lat: a.lat + (p.lat - a.lat) * f,
          lon: wrap(+a.lon + (+p.lon - +a.lon) * f),
          nm: cum + len * f,
          point: -1
        });
      }
      cum += len;
    }
    out.push({
      lat: +p.lat,
      lon: wrap(+raw[i].lon), // le point tel qu'il est écrit (sans le bruit d'un aller-retour par la route déroulée)
      nm: cum,
      point: i
    });
  });
  return out;
}

/** Niveau en vigueur à une distance du départ (ft) : niveau du plan, puis ceux des points (alt_ft) à partir d'eux. */
export function levelAt(points, nmOf, planFt, nm) {
  let ft = planFt;
  (points || []).forEach((p, i) => {
    if (i > 0 && i < points.length - 1 && p.alt_ft > 0 && nmOf[i] <= nm + 1e-6) ft = p.alt_ft;
  });
  return ft;
}

/** Vent moyen le long de la route : vents [{ dirDeg, kt }] aux lieux, distances des lieux (NM) ; chaque tronçon prend
 *  la moyenne vectorielle de ses deux bouts, pondérée par sa longueur. { dirDeg, speedKt } ou null. */
export function meanWind(winds, nms) {
  const vec = w => {
    const r = w.dirDeg * Math.PI / 180;
    return [w.kt * Math.sin(r), w.kt * Math.cos(r)];
  };
  let x = 0,
    y = 0,
    total = 0;
  for (let i = 1; i < winds.length; i++) {
    if (!winds[i] || !winds[i - 1]) continue;
    const len = Math.max(0, nms[i] - nms[i - 1]) || 0;
    if (!len) continue;
    const a = vec(winds[i - 1]),
      b = vec(winds[i]);
    x += (a[0] + b[0]) / 2 * len;
    y += (a[1] + b[1]) / 2 * len;
    total += len;
  }
  if (!total) return null;
  return {
    dirDeg: Math.round((Math.atan2(x / total, y / total) * 180 / Math.PI + 360) % 360),
    speedKt: Math.round(Math.hypot(x / total, y / total))
  };
}

/** Couches d'inversion d'un profil : tronçons entre deux niveaux où la température monte avec l'altitude.
 *  [{ fromFt, toFt, dT }]. */
export function inversions(profile) {
  const L = profile?.levels || [],
    out = [];
  for (let i = 1; i < L.length; i++)
    if (L[i].tC > L[i - 1].tC) out.push({
      fromFt: Math.round(L[i - 1].ft),
      toFt: Math.round(L[i].ft),
      dT: Math.round((L[i].tC - L[i - 1].tC) * 10) / 10
    });
  return out;
}
