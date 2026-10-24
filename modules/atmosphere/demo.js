// Maquette « Atmosphère de la route » — jeu de démonstration hors ligne : une réponse au format d'Open-Meteo
// (mêmes noms de variables, mêmes unités) tirée d'une situation inventée et plausible — dépression atlantique qui se
// creuse et avance vers l'est avec son front, anticyclone sur le sud-est et son inversion de basse couche, courant-jet
// d'ouest en altitude, relief schématique (Massif central, Alpes, Pyrénées). Sert à essayer la page sans réseau :
// la page l'affiche comme « démonstration », jamais comme une prévision.

import {
  LEVELS
} from '../fuel/winds.js';

const R = Math.PI / 180,
  G = 9.80665,
  RD = 287.05;

const gauss = (lat, lon, c, sLat, sLon) => Math.exp(-(((lat - c[0]) / sLat) ** 2 + ((lon - c[1]) / sLon) ** 2) / 2);

/** Relief schématique (m). */
export function elevation(lat, lon) {
  const hills = [
    [45.2, 2.8, 0.9, 1.1, 900],
    [45.6, 6.9, 0.7, 0.9, 2200],
    [46.6, 7.8, 0.5, 1.2, 1800],
    [42.8, 0.6, 0.35, 1.6, 1700],
    [44.2, 5.6, 0.5, 0.6, 700],
    [48.3, 7.1, 0.4, 0.3, 700]
  ];
  // la mer reste à 0 (golfe de Gascogne, Manche, Méditerranée)
  const sea = lon < -1.5 && lat < 47.5 || lat > 49.4 && lon < 1.5 || lat < 43.3 && lon > 3 && lon < 9;
  return sea ? 0 : Math.round(80 + hills.reduce((s, [a, b, sa, sb, h]) => s + h * gauss(lat, lon, [a, b], sa, sb), 0));
}

/** État de l'atmosphère inventée en un lieu à l'heure h (heures depuis le début). */
function state(lat, lon, h) {
  const low = [50 + 0.02 * h, -4 + 0.25 * h],
    high = [43.2, 7.5 - 0.02 * h],
    dLow = gauss(lat, lon, low, 4.5, 6.5),
    dHigh = gauss(lat, lon, high, 4, 6),
    mslp = 1016 - 22 * dLow + 9 * dHigh,
    // front froid : ligne qui part de la dépression vers le sud-sud-ouest
    fx = (lon - (low[1] + 6 - (low[0] - lat) * 0.5)),
    front = Math.exp(-((fx / 1.1) ** 2)) * (lat < low[0] + 2 ? 1 : 0.3),
    warm = fx > 0 ? 1 : 0,
    diurnal = Math.sin(((h % 24) - 9) / 24 * 2 * Math.PI);
  return {
    mslp,
    front,
    warm,
    dLow,
    dHigh,
    low,
    t2: 21 - 0.75 * (lat - 42) + 2.5 * warm - 1.5 * front + 4 * diurnal * (1 - 0.6 * front),
    diurnal
  };
}

/** Profil vertical (température °C, humidité %, vent) à une pression p (hPa). */
function level(lat, lon, h, p, s, elevM) {
  const zKm = 44.33 * (1 - (p / 1013.25) ** 0.19026),
    zAgl = Math.max(0, zKm - elevM / 1000);
  let t = s.t2 - 6.5 * zAgl;
  // inversion de basse couche sous l'anticyclone, la nuit et le matin surtout
  const inv = s.dHigh * (1 - 0.5 * Math.max(0, s.diurnal));
  if (zAgl > 0.25 && zAgl < 1.3) t += 7 * inv * Math.sin((zAgl - 0.25) / 1.05 * Math.PI);
  // tropopause vers 11 km
  if (zKm > 11) t = s.t2 - 6.5 * (11 - elevM / 1000);
  // humidité : forte dans la bande frontale (épaisse), nappe de stratus sous l'inversion, sec ailleurs
  let rh = 55 + 20 * Math.cos(zKm / 3) - 25 * s.dHigh;
  rh += 55 * s.front * Math.exp(-(((zKm - 3.5) / 3.2) ** 2));
  rh += 40 * inv * Math.exp(-(((zAgl - 0.35) / 0.25) ** 2));
  rh += 20 * s.dLow * Math.exp(-(((zKm - 2) / 2) ** 2));
  rh = Math.max(5, Math.min(100, rh));
  // vent : rotation cyclonique autour de la dépression, courant-jet d'ouest vers 9-10 km
  const dy = lat - s.low[0],
    dx = (lon - s.low[1]) * Math.cos(lat * R),
    ang = Math.atan2(dx, dy),
    rot = 30 * s.dLow * (0.6 + zKm / 6),
    jet = 25 + 85 * Math.exp(-(((zKm - 9.5) / 2.5) ** 2)) * Math.exp(-(((lat - 47) / 4) ** 2)),
    u = jet * Math.min(1, 0.25 + zKm / 6) + rot * Math.cos(ang),
    v = -rot * Math.sin(ang) + 6;
  return {
    t,
    rh,
    kt: Math.hypot(u, v),
    dir: (Math.atan2(-u, -v) / R + 360) % 360
  };
}

const cloud = (rh, p) => {
  const rhc = p >= 700 ? 0.8 : 0.7,
    x = rh / 100;
  return x <= rhc ? 0 : Math.round(100 * (1 - Math.sqrt((1 - x) / (1 - rhc))));
};

/** Réponse au format d'Open-Meteo pour des lieux [{ lat, lon }] et une liste de variables horaires (48 heures à
 *  partir de l'heure entière en cours). Un objet pour un lieu, un tableau sinon. */
export function forecast(places, hourlyVars, now = Date.now()) {
  const t0 = Math.floor(now / 36e5) * 3600,
    times = Array.from({
      length: 48
    }, (_, i) => t0 + i * 3600),
    want = new Set(hourlyVars);
  const out = places.map(pl => {
    const lat = +pl.lat,
      lon = +pl.lon,
      elevM = elevation(lat, lon),
      hourly = {
        time: times
      };
    want.forEach(v => hourly[v] = []);
    times.forEach((_, h) => {
      const s = state(lat, lon, h),
        tK = s.t2 + 273.15,
        psfc = s.mslp * Math.exp(-G * elevM / (RD * (tK + 0.0065 * elevM / 2))),
        prof = LEVELS.map(p => ({
          p,
          ...level(lat, lon, h, p, s, elevM)
        }));
      // hauteurs géopotentielles par intégration hypsométrique depuis le niveau de la mer
      let z = 0,
        pPrev = s.mslp,
        tPrev = tK + 0.0065 * elevM;
      const gh = {};
      for (const L of prof) {
        const tm = (tPrev + L.t + 273.15) / 2;
        z += RD * tm / G * Math.log(pPrev / L.p);
        gh[L.p] = z;
        pPrev = L.p;
        tPrev = L.t + 273.15;
      }
      const td2 = s.t2 - (100 - Math.min(98, prof[1].rh)) / 5,
        ccAt = lo => Math.max(...prof.filter(L => L.p <= lo[0] && L.p >= lo[1] && L.p < psfc).map(L => cloud(L.rh, L.p)), 0),
        fzl = (() => {
          for (let i = 1; i < prof.length; i++)
            if (prof[i - 1].t > 0 && prof[i].t <= 0) return gh[prof[i - 1].p] + (gh[prof[i].p] - gh[prof[i - 1].p]) * prof[i - 1]
              .t / (prof[i - 1].t -
                prof[i].t);
          return 0;
        })(),
        sfcWind = level(lat, lon, h, Math.min(1000, psfc), s, elevM),
        put = (k, x) => {
          if (want.has(k)) hourly[k].push(x == null ? null : Math.round(x * 10) / 10);
        };
      put('temperature_2m', s.t2);
      put('dew_point_2m', td2);
      put('pressure_msl', s.mslp);
      put('surface_pressure', psfc);
      put('cloud_cover_low', ccAt([1050, 800]));
      put('cloud_cover_mid', ccAt([800, 450]));
      put('cloud_cover_high', ccAt([450, 150]));
      put('cloud_cover', Math.min(100, Math.max(ccAt([1050, 800]), ccAt([800, 450]), ccAt([450, 150]))));
      put('freezing_level_height', fzl);
      put('cape', Math.max(0, 900 * s.front * s.warm + 300 * s.front + 400 * Math.max(0, s.diurnal) * (1 - s.dHigh) - 200));
      put('visibility', 24000 - 18000 * s.front - 14000 * s.dHigh * (1 - Math.max(0, s.diurnal)));
      put('precipitation', Math.max(0, 4 * s.front - 0.8));
      put('wind_speed_10m', sfcWind.kt * 0.35);
      put('wind_direction_10m', (sfcWind.dir + 25) % 360);
      for (const L of prof) {
        const below = L.p >= psfc;
        put(`temperature_${L.p}hPa`, below ? null : L.t);
        put(`relative_humidity_${L.p}hPa`, below ? null : L.rh);
        put(`cloud_cover_${L.p}hPa`, below ? null : cloud(L.rh, L.p));
        put(`geopotential_height_${L.p}hPa`, gh[L.p]);
        put(`wind_speed_${L.p}hPa`, below ? null : L.kt);
        put(`wind_direction_${L.p}hPa`, below ? null : L.dir);
      }
    });
    return {
      latitude: lat,
      longitude: lon,
      elevation: elevM,
      utc_offset_seconds: 0,
      hourly
    };
  });
  return out.length === 1 ? out[0] : out;
}

/** METAR inventés au départ et à l'arrivée (texte brut, comme metar.vatsim.net). */
export function metars(ids, places, now = Date.now()) {
  const d = new Date(now),
    stamp = `${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}00Z`;
  return ids.map((id, i) => {
    const p = places[i],
      s = state(p.lat, p.lon, 0),
      t = Math.round(s.t2),
      td = Math.round(s.t2 - 3 - 4 * (1 - s.front)),
      q = Math.round(s.mslp),
      vis = s.front > 0.4 ? '6000 -RA' : s.dHigh > 0.5 ? '4000 BR' : '9999',
      cl = s.front > 0.4 ? 'BKN012 OVC030' : s.dHigh > 0.5 ? 'BKN006' : 'FEW040',
      w = level(p.lat, p.lon, 0, 1000, s, 0);
    return `${id} ${stamp} ${String(Math.round(w.dir / 10) * 10 || 360).padStart(3, '0')}${String(Math.round(w.kt * 0.35)).padStart(2, '0')}KT ` +
      `${vis} ${cl} ${t < 0 ? 'M' : ''}${String(Math.abs(t)).padStart(2, '0')}/${td < 0 ? 'M' : ''}${String(Math.abs(td)).padStart(2, '0')} Q${q}`;
  }).join('\n');
}
