// Synoptique monde du module Atmosphère (SPEC.md § 4) : la publication des pages faite par tools/build_world_weather.py
// (GFS de la NOAA, maille de 5°, toutes les 3 h jusqu'à +72 h ; un index et un fichier par échéance), lue sur la même
// origine — jamais d'appel à Open-Meteo depuis l'appareil hors de la grille du vol, quoi que montre la carte. Gardée
// dans la réserve de l'appareil (cache/weather/world/, policy cache) pour le hors ligne ; seules les échéances montrées
// sont lues.
// API : worldReader({ data, net, now }) → { index() → promesse de l'index ou null, step(index, k) → promesse de
// l'échéance k ou null } ; valid(index), validStep(index, s), stepAt(index, t), worldGrid(index, s), worldAt(index, s,
// lat, lon). Fonctions pures hors de worldReader (pas de DOM).

/** Dossier publié : /v3/weather/world/ sur les pages (même origine que le module). */
export const WORLD_URL = new URL('../../weather/world/', import.meta.url).href;
/** Copie de l'appareil (réserve partagée de la météo : la Carte et le cadre pourront la lire). */
export const WORLD_DIR = 'cache/weather/world/';
/** Les cinq variables que tout fichier porte ; les autres (nuages par étage, CAPE, isotherme 0 °C, tropopause, jet,
 *  précipitations, visibilité) s'y ajoutent selon la source. */
export const BASE_VARS = ['p', 't', 'cc', 'ws', 'wd'];
const FRESH = 6 * 36e5, // un run de GFS toutes les 6 h : la copie de l'appareil vaut 6 h
  RETRY = 10 * 60e3; // publication absente (lanceur, première construction) : pas de nouvel essai avant 10 min

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

/** Lecteur : l'index de l'appareil s'il a moins de 6 h, sinon celui des pages (gardé à son tour), sinon le plus ancien
 *  tant que sa dernière échéance est à venir ; les échéances une à une, de l'appareil d'abord. Les échéances passées
 *  sont retirées de l'appareil à chaque nouvel index. */
export function worldReader({
  data,
  net,
  now = () => Date.now()
}) {
  let ip = null,
    tried = 0;
  const steps = new Map(),
    getJson = async url => {
        const r = await net.fetch(url, {
          cache: 'no-cache'
        });
        return r.ok ? r.json().catch(() => null) : null;
      },
      prune = async w => {
          if (!data.cached || !data.remove) return;
          const keep = new Set(w.files.map(f => WORLD_DIR + f));
          for (const d of await data.cached(WORLD_DIR).catch(() => []))
            if (!d.path.endsWith('/index.json') && !keep.has(d.path)) await data.remove(d.path).catch(() => {});
        },
        readIndex = async () => {
          const mine = await data.get(`${WORLD_DIR}index.json`).catch(() => null),
            ok = valid(mine) ? mine : null;
          if (ok && now() - ok.built * 1000 < FRESH) return ok;
          let got = null;
          if (now() - tried > RETRY) {
            tried = now();
            got = await getJson(`${WORLD_URL}index.json`);
          }
          if (valid(got) && (!ok || got.built > ok.built)) {
            await data.put(`${WORLD_DIR}index.json`, got).catch(() => {});
            steps.clear();
            prune(got);
            return got;
          }
          return ok && ok.times.at(-1) * 1000 > now() ? ok : null;
        };
  return {
    index: () => ip ||= readIndex().finally(() => setTimeout(() => ip = null, RETRY)),
    step(w, k) {
      const f = w.files[k],
        key = `${w.built}:${f}`;
      if (!steps.has(key)) steps.set(key, (async () => {
        const path = WORLD_DIR + f,
          mine = await data.get(path).catch(() => null);
        if (validStep(w, mine) && mine.time === w.times[k]) return mine;
        const got = await getJson(WORLD_URL + f);
        if (!validStep(w, got) || got.time !== w.times[k]) return null;
        await data.put(path, got).catch(() => {});
        return got;
      })().then(s => {
        if (!s) steps.delete(key); // absente : redemandée au prochain passage
        return s;
      }));
      return steps.get(key);
    }
  };
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
