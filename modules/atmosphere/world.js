// Synoptique monde (SPEC.md § 5) : la publication des pages faite par tools/build_world_weather.py (GFS de la NOAA, maille
// de 5°, toutes les 3 h jusqu'à +72 h ; un index et un fichier par échéance). La lecture (même origine, réserve de
// l'appareil) est celle de la couche météo du cadre, ctx.weather.world (frame/INTEGRATION.md § 14) ; ce fichier n'a que
// les fonctions pures qui en tirent la grille, les champs et les valeurs d'un point (pas de DOM, pas de réseau) :
// valid(index), validStep(index, s), stepAt(index, t), worldGrid(index, s), worldLocs(index, s, alt), worldAt(index, s,
// lat, lon).

/** Les cinq variables que tout fichier porte ; les autres (nuages par étage, CAPE, isotherme 0 °C, tropopause, jet,
 *  précipitations, visibilité) s'y ajoutent selon la source. */
export const BASE_VARS = ['p', 't', 'cc', 'ws', 'wd'];

/** Index lisible : schéma 1, grille, instants et noms d'échéances cohérents. */
export function valid(w) {
  return !!(w && w.schema === 1 && w.lats?.length && w.lons?.length && Array.isArray(w.times) && w.times.length && w.files
    ?.length === w.times.length);
}
/** Échéance lisible pour un index : les cinq variables de base, une valeur par lieu. */
export function validStep(w, s) {
  const n = w.lats.length * w.lons.length;
  return !!(s && s.schema === 1 && BASE_VARS.every(k => s.vars?.[k]?.length === n));
}

/** Échéance la plus proche d'un instant (secondes), bornée à celles publiées. */
export function stepAt(w, t) {
  let k = 0;
  for (let i = 1; i < w.times.length; i++)
    if (Math.abs(w.times[i] - t) < Math.abs(w.times[k] - t)) k = i;
  return k;
}

/** Grille d'une échéance pour le dessin, à la forme de la grille du vol : G = { nx, ny, bbox [w, s, e, n], places [{ lat,
 *  lon, i, j }] } et les champs F = { p, t, cc, wind [[dir, kt]], js, cape, pStep, ft: null } (rangées du sud au nord).
 *  Une colonne de plus à +180° (copie de -180°) ferme le tour du monde. */
export function worldGrid(w, s) {
  const nl = w.lons.length,
    lons = [...w.lons, w.lons[0] + 360],
    nx = lons.length,
    ny = w.lats.length,
    v = s.vars,
    at = (name, j, i) => v[name]?.[j * nl + (i % nl)] ?? null,
    places = [],
    F = {
      p: [],
      t: [],
      cc: [],
      wind: [],
      js: [],
      cape: [],
      pStep: 4,
      ft: null
    };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      places.push({
        lat: w.lats[j],
        lon: lons[i],
        i,
        j
      });
      F.p.push(at('p', j, i));
      F.t.push(at('t', j, i));
      F.cc.push(at('cc', j, i));
      F.wind.push([at('wd', j, i), at('ws', j, i)]);
      F.js.push(at('js', j, i));
      F.cape.push(at('cape', j, i));
    }
  return {
    G: {
      nx,
      ny,
      bbox: [lons[0], w.lats[0], lons.at(-1), w.lats.at(-1)],
      places
    },
    F
  };
}

/** Les lieux d'une échéance à la forme des lieux d'Open-Meteo lus par atmo.js (locations : { lat, lon, elevFt, times, h
 *  }), dans l'ordre de worldGrid (colonne de +180° comprise) : le module calcule le monde exactement comme la grille du
 *  vol (A.column, A.at, A.pressureAtZ), d'où un même rendu des deux côtés. a : le fichier des niveaux de pression (null :
 *  la surface seule). */
export function worldLocs(w, s, a = null) {
  const nl = w.lons.length,
    lons = [...w.lons, w.lons[0] + 360],
    sv = s.vars,
    av = a?.vars || {},
    levels = a ? w.levels || [] : [],
    out = [];
  for (let j = 0; j < w.lats.length; j++)
    for (let i = 0; i < lons.length; i++) {
      const n = j * nl + (i % nl),
        one = v => [v?.[n] ?? null],
        h = {
          time: [s.time],
          temperature_2m: one(sv.t),
          pressure_msl: one(sv.p),
          surface_pressure: one(sv.ps),
          cloud_cover: one(sv.cc),
          cloud_cover_low: one(sv.ccl),
          cloud_cover_mid: one(sv.ccm),
          cloud_cover_high: one(sv.cch),
          wind_speed_10m: one(sv.ws),
          wind_direction_10m: one(sv.wd)
        };
      for (const l of levels) {
        h[`temperature_${l}hPa`] = one(av[`t${l}`]);
        h[`relative_humidity_${l}hPa`] = one(av[`rh${l}`]);
        h[`geopotential_height_${l}hPa`] = one(av[`z${l}`]);
        h[`wind_speed_${l}hPa`] = one(av[`ws${l}`]);
        h[`wind_direction_${l}hPa`] = one(av[`wd${l}`]);
      }
      out.push({
        lat: w.lats[j],
        lon: lons[i],
        elevFt: (sv.zs?.[n] ?? 0) / 0.3048,
        times: h.time,
        h
      });
    }
  return out;
}

/** Valeurs d'une échéance en un point (bilinéaire, longitude bouclée ; latitude bornée à la grille) : chaque variable
 *  du fichier, les directions (wd, jd) moyennées par leurs composantes avec leur vitesse (ws, js). */
export function worldAt(w, s, lat, lon) {
  const nl = w.lons.length,
    st = w.step || (w.lons[1] - w.lons[0]),
    x = ((((lon - w.lons[0]) % 360) + 360) % 360) / st,
    y = Math.max(0, Math.min(w.lats.length - 1, (lat - w.lats[0]) / st)),
    i0 = Math.floor(x),
    j0 = Math.min(w.lats.length - 2, Math.floor(y)),
    fx = x - i0,
    fy = y - j0,
    corners = [
      [j0, i0, (1 - fx) * (1 - fy)],
      [j0, i0 + 1, fx * (1 - fy)],
      [j0 + 1, i0, (1 - fx) * fy],
      [j0 + 1, i0 + 1, fx * fy]
    ],
    idx = (j, i) => j * nl + (i % nl),
    out = {},
    mix = name => {
      let sum = 0,
        wt = 0;
      for (const [j, i, f] of corners) {
        const z = s.vars[name][idx(j, i)];
        if (z == null) continue;
        sum += f * z;
        wt += f;
      }
      return wt > 0.5 ? sum / wt : null;
    },
    // un vent : moyenne des composantes (une direction ne se moyenne pas)
    vec = (dk, sk) => {
      let u = 0,
        v = 0,
        n = 0;
      for (const [j, i, f] of corners) {
        const d = s.vars[dk][idx(j, i)],
          sp = s.vars[sk][idx(j, i)];
        if (d == null || sp == null) continue;
        u += f * sp * Math.sin(d * Math.PI / 180);
        v += f * sp * Math.cos(d * Math.PI / 180);
        n += f;
      }
      return n ? [((Math.atan2(u, v) * 180 / Math.PI) + 360) % 360, Math.hypot(u, v) / n] : [null, null];
    };
  for (const name of Object.keys(s.vars))
    if (name !== 'wd' && name !== 'ws' && name !== 'jd' && name !== 'js') out[name] = mix(name);
  [out.wd, out.ws] = vec('wd', 'ws');
  if (s.vars.jd && s.vars.js)[out.jd, out.js] = vec('jd', 'js');
  return out;
}
