// Synoptique monde du module Atmosphère (SPEC.md § 4) : le fichier publié avec les pages par
// tools/build_world_weather.py (GFS, maille de 15°, toutes les 3 h jusqu'à +24 h), lu sur la même origine — jamais
// d'appel à Open-Meteo depuis l'appareil hors de la grille du vol, quoi que montre la carte. Gardé dans la réserve de
// l'appareil (cache/weather/world.json, policy cache) pour le hors ligne.
// API : worldReader({ data, net, now }) → () → promesse du fichier ou null ; valid(w), stepAt(w, t), worldGrid(w, k),
// worldAt(w, k, lat, lon). Fonctions pures hors de worldReader (pas de DOM).

/** Adresse du fichier publié : /v3/weather/world.json sur les pages (même origine que le module). */
export const WORLD_URL = new URL('../../weather/world.json', import.meta.url).href;
/** Copie de l'appareil (réserve partagée de la météo : la Carte et le cadre pourront la lire). */
export const WORLD_FILE = 'cache/weather/world.json';
const FRESH = 6 * 36e5, // un run de GFS toutes les 6 h : la copie de l'appareil vaut 6 h
  RETRY = 10 * 60e3; // fichier absent (lanceur, première publication) : pas de nouvel essai avant 10 min

/** Fichier lisible : schéma 1, grille et pas cohérents, les cinq variables à chaque pas. */
export function valid(w) {
  const n = w?.lats?.length * w?.lons?.length;
  return !!(w && w.schema === 1 && n > 0 && Array.isArray(w.times) && w.times.length && ['p', 't', 'cc', 'ws', 'wd'].every(k =>
    w.vars?.[k]?.length === w.times.length && w.vars[k].every(s => s.length === n)));
}

/** Lecteur : la copie de l'appareil si elle a moins de 6 h, sinon le fichier publié (gardé à son tour), sinon la copie
 *  plus ancienne tant que son dernier pas est à venir ; null sinon. Une lecture du réseau en cours à la fois, un nouvel
 *  essai après 10 min seulement. */
export function worldReader({
  data,
  net,
  now = () => Date.now()
}) {
  let p = null,
    tried = 0;
  const read = async () => {
    const mine = await data.get(WORLD_FILE).catch(() => null),
      ok = valid(mine) ? mine : null;
    if (ok && now() - ok.built * 1000 < FRESH) return ok;
    let got = null;
    if (now() - tried > RETRY) {
      tried = now();
      const r = await net.fetch(WORLD_URL, {
        cache: 'no-cache'
      });
      if (r.ok) got = await r.json().catch(() => null);
    }
    if (valid(got) && (!ok || got.built > ok.built)) {
      await data.put(WORLD_FILE, got).catch(() => {});
      return got;
    }
    return ok && ok.times.at(-1) * 1000 > now() ? ok : null;
  };
  return () => p ||= read().finally(() => setTimeout(() => p = null, RETRY));
}

/** Pas du fichier le plus proche d'un instant (secondes), borné aux pas publiés. */
export function stepAt(w, t) {
  let k = 0;
  for (let i = 1; i < w.times.length; i++)
    if (Math.abs(w.times[i] - t) < Math.abs(w.times[k] - t)) k = i;
  return k;
}

/** Grille d'un pas pour le dessin, à la forme de la grille du vol : G = { nx, ny, bbox [w, s, e, n], places [{ lat, lon,
 *  i, j }] } et les champs F = { p, t, cc, wind [[dir, kt]], pStep, ft: null } (rangées du sud au nord). Une colonne de
 *  plus à +180° (copie de -180°) ferme le tour du monde. */
export function worldGrid(w, k) {
  const nl = w.lons.length,
    lons = [...w.lons, w.lons[0] + 360],
    nx = lons.length,
    ny = w.lats.length,
    at = (name, j, i) => w.vars[name][k][j * nl + (i % nl)],
    places = [],
    F = {
      p: [],
      t: [],
      cc: [],
      wind: [],
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

/** Valeurs d'un pas en un point (bilinéaire, longitude bouclée ; latitude bornée à la grille) : { p, t, cc, dir, kt }. */
export function worldAt(w, k, lat, lon) {
  const nl = w.lons.length,
    st = w.step || (w.lons[1] - w.lons[0]),
    x = ((((lon - w.lons[0]) % 360) + 360) % 360) / st,
    y = Math.max(0, Math.min(w.lats.length - 1, (lat - w.lats[0]) / st)),
    i0 = Math.floor(x),
    j0 = Math.min(w.lats.length - 2, Math.floor(y)),
    fx = x - i0,
    fy = y - j0,
    idx = (j, i) => j * nl + (i % nl),
    mix = name => {
      const v = w.vars[name][k],
        a = v[idx(j0, i0)],
        b = v[idx(j0, i0 + 1)],
        c = v[idx(j0 + 1, i0)],
        d = v[idx(j0 + 1, i0 + 1)];
      if ([a, b, c, d].some(z => z == null)) return null;
      return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    };
  // le vent : moyenne des composantes (une direction ne se moyenne pas)
  let u = 0,
    v = 0,
    n = 0;
  for (const [j, i, f] of [
      [j0, i0, (1 - fx) * (1 - fy)],
      [j0, i0 + 1, fx * (1 - fy)],
      [j0 + 1, i0, (1 - fx) * fy],
      [j0 + 1, i0 + 1, fx * fy]
    ]) {
    const d = w.vars.wd[k][idx(j, i)],
      s = w.vars.ws[k][idx(j, i)];
    if (d == null || s == null) continue;
    u += f * s * Math.sin(d * Math.PI / 180);
    v += f * s * Math.cos(d * Math.PI / 180);
    n += f;
  }
  return {
    p: mix('p'),
    t: mix('t'),
    cc: mix('cc'),
    dir: n ? ((Math.atan2(u, v) * 180 / Math.PI) + 360) % 360 : null,
    kt: n ? Math.hypot(u, v) / n : null
  };
}
