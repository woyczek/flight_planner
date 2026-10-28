// V3 frame/lib (propriétaire : frame ; fuel, Atmosphère et la Carte le lisent par ctx.weather) — couche météo unique de
// l'appareil (V3_SPECIFICATION.md § 8, frame/INTEGRATION.md § 14). Écrite à neuf d'après la spécification ; le comportement
// suit la réserve qu'Atmosphère s'était faite (modules/atmosphere/weather_store.js), que celle-ci remplace.
//   · une seule réserve : cache/weather/<modèle>/<case>/<jour UTC>.json (politique cache : jamais synchronisée, hors des
//     sauvegardes de l'appareil) ; case à la résolution du modèle, 0,1° au moins (GFS 0,25°), nommée par son centre ;
//     un fichier tient les heures d'un jour UTC, variable par variable, pour un seul run (remplacé entier quand le run
//     change) ; valable 6 h pour un run connu, 30 min sinon ; jours passés effacés, une fois par jour ;
//   · lecture : la réserve d'abord ; Open-Meteo (net.fetch) seulement pour ce qui manque (cases, jours, variables), groupé
//     en aussi peu de demandes que possible ; deux lectures des mêmes cases s'attendent au lieu de demander deux fois ;
//   · décompte : cache/weather/ledger.json, 24 h glissantes, au poids d'Open-Meteo (un lieu jusqu'à 10 variables = un
//     appel, au prorata au-delà) ; attente avant 600 par minute, arrêt avant 10 000 par jour, marge de 10 % ;
//   · METAR et TAF gardés 30 min (cache/weather/metar|taf/<OACI>.json) : aviationweather.gov par le relais du lanceur,
//     sinon metar.vatsim.net (METAR bruts décodés par frame/lib/metar.js) et avwx.rest (clé de l'appareil, ajoutée par le
//     cadre) ;
//   · synoptique monde : la publication des pages (même origine, <racine>/weather/world/), index gardé 6 h dans
//     cache/weather/world/ ; l'appareil n'appelle jamais Open-Meteo hors de la grille du vol (aloft et grid seulement).
// Ni page ni stockage propre : la couche de données (data : get, put, remove, cached) et les appels sortants (net.fetch,
// qui ne lève jamais : 503 marqué x-sog-offline / x-sog-unreachable) sont donnés.
// API : weatherStore({ data, net, root, now, onSpend }) → { aloft, grid, metar, taf, world, run, spent, spentToday,
//   prune, modelFor, cellOf, QUOTA } ; fonctions pures exportées : modelFor, cellOf, cellSize, callWeight, aloftVars,
//   profilesAt, LEVELS, paFt.

import {
  wrapLon
} from './geo.js';
import {
  decodeMetars,
  fromAvwxTaf
} from './metar.js';

export const PREFIX = 'cache/weather/';
/** Niveaux de pression des vents et températures en altitude (hPa), du sol vers le haut. */
export const LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200];
/** Altitude pression (ft) d'une pression (hPa), atmosphère type. */
export const paFt = hPa => (1 - (hPa / 1013.25) ** 0.190263) / 6.87559e-6;
/** Limites d'Open-Meteo (appels pondérés) et marge gardée : attente au-delà de 540 / min, arrêt au-delà de 9 000 / jour. */
export const QUOTA = {
  minute: 600,
  day: 10000,
  margin: 0.1
};
const MINUTE_CAP = QUOTA.minute * (1 - QUOTA.margin),
  DAY_CAP = QUOTA.day * (1 - QUOTA.margin),
  RUN_TTL = 6 * 36e5,
  BLIND_TTL = 30 * 60e3,
  META_TTL = 10 * 60e3,
  OBS_TTL = 30 * 60e3,
  WORLD_TTL = 6 * 36e5,
  WORLD_RETRY = 10 * 60e3,
  MAX_SAMPLES = 24, // lieux d'une route (fuel en lit 24 au plus)
  MAX_PLACES = 400; // lieux d'une grille (Atmosphère) : au-delà, la demande est refusée, jamais coupée en silence

/** Modèles : nom, nom court, taille de case (degrés), modèle dont on lit l'heure du run (un modèle « seamless » n'a pas
 *  de métadonnées : celles du modèle qui porte les premières heures). */
const MODELS = {
  meteofrance_seamless: {
    name: 'Météo-France AROME / ARPEGE',
    short: 'ARPEGE',
    cell: 0.1,
    meta: 'meteofrance_arome_france_hd'
  },
  icon_seamless: {
    name: 'DWD ICON',
    short: 'ICON',
    cell: 0.1,
    meta: 'dwd_icon'
  },
  gfs_seamless: {
    name: 'NOAA GFS',
    short: 'GFS',
    cell: 0.25,
    meta: 'ncep_gfs013'
  }
};
const infoOf = id => ({
  id,
  name: MODELS[id]?.name || id,
  short: MODELS[id]?.short || id
});
/** Modèle selon le lieu : Météo-France sur la France et ses abords, ICON sur le reste de l'Europe, GFS ailleurs ;
 *  { id (paramètre models d'Open-Meteo), name, short }. */
export function modelFor(lat, lon) {
  const lo = wrapLon(+lon);
  if (lat >= 38 && lat <= 55 && lo >= -10 && lo <= 16) return infoOf('meteofrance_seamless');
  if (lat >= 30 && lat <= 72 && lo >= -30 && lo <= 45) return infoOf('icon_seamless');
  return infoOf('gfs_seamless');
}
/** Taille de case d'un modèle (degrés) : 0,1° au moins. */
export const cellSize = model => Math.max(0.1, MODELS[model]?.cell || 0.1);
/** Case d'un lieu : { id (« 47.15_-1.65 »), lat, lon } (centre ; longitude ramenée dans [-180, 180[ par geo.js). */
export function cellOf(lat, lon, size = 0.1) {
  const c = v => +(Math.floor(+(v / size).toFixed(9)) * size + size / 2).toFixed(3),
    la = c(Math.max(-89.999, Math.min(89.999, +lat))),
    lo = c(wrapLon(+lon));
  return {
    id: `${la}_${lo >= 180 ? +(lo - 360).toFixed(3) : lo}`,
    lat: la,
    lon: lo >= 180 ? +(lo - 360).toFixed(3) : lo
  };
}
/** Poids d'une demande dans le décompte d'Open-Meteo : un appel par lieu et par tranche de 10 variables, au prorata. */
export const callWeight = (nPlaces, nVars) => nPlaces * Math.max(1, nVars / 10);
/** Variables des vents et températures en altitude : température, vent (force, direction) à chaque niveau. */
export const aloftVars = () => LEVELS.flatMap(l => [`temperature_${l}hPa`, `wind_speed_${l}hPa`, `wind_direction_${l}hPa`]);
/** Lieux à la forme d'Open-Meteo → profils à l'heure la plus proche de t (secondes) : [{ lat, lon, time, levels: [{ hPa, ft,
 *  tC, dir, kt }] }] (niveaux sans valeur écartés) — la forme que fuel lisait (modules/fuel/winds.js, profiles). */
export function profilesAt(locs, t) {
  return [].concat(locs || []).map(loc => {
    const h = loc?.hourly || {},
      times = h.time || [];
    let k = 0;
    for (let i = 1; i < times.length; i++)
      if (Math.abs(times[i] - t) < Math.abs(times[k] - t)) k = i;
    return {
      lat: +loc?.latitude,
      lon: +loc?.longitude,
      time: times[k] ?? null,
      levels: LEVELS.map(l => ({
        hPa: l,
        ft: paFt(l),
        tC: h[`temperature_${l}hPa`]?.[k],
        dir: h[`wind_direction_${l}hPa`]?.[k],
        kt: h[`wind_speed_${l}hPa`]?.[k]
      })).filter(x => Number.isFinite(x.tC) && Number.isFinite(x.dir) && Number.isFinite(x.kt))
    };
  });
}

/** Jour UTC (AAAA-MM-JJ) d'un instant en ms. */
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
/** Instant en secondes : un nombre en secondes ou en ms, une date ISO, une Date ; null : maintenant. */
const secOf = (when, now) => {
  if (when == null) return Math.round(now / 1000);
  const v = when instanceof Date ? when.getTime() : typeof when === 'string' ? Date.parse(when) : +when;
  return Number.isFinite(v) ? Math.round(v > 1e11 ? v / 1000 : v) : Math.round(now / 1000);
};
/** Jours UTC à lire pour un instant : d'aujourd'hui au jour de l'instant (trois heures de plus), deux au moins, seize au
 *  plus (Open-Meteo compte les lieux et les variables, pas les jours). */
const daysFor = (tSec, now, min = 2) => {
  const today = Date.parse(dayOf(now));
  return Math.max(min, Math.min(16, Math.floor((tSec * 1000 + 3 * 36e5 - today) / 864e5) + 1));
};
/** Variables qu'un modèle peut refuser (nébulosité par niveau, surface hors de l'essentiel) : sur un refus (400), la
 *  demande est refaite sans elles, et elles sont notées absentes pour ce jour et cette case. */
const CORE_SURFACE = new Set(['temperature_2m', 'dew_point_2m', 'pressure_msl', 'surface_pressure', 'cloud_cover_low',
  'cloud_cover_mid', 'cloud_cover_high'
]);
const optional = v => /^cloud_cover_\d+hPa$/.test(v) || !/hPa$/.test(v) && !CORE_SURFACE.has(v);
/** Erreur marquée (offline, status, quota, stale, tooMany) : le lecteur dit pourquoi dans ses propres mots. */
const fail = (message, mark) => Object.assign(new Error(message), mark);

export function weatherStore({
  data,
  net,
  root = '',
  now = () => Date.now(),
  onSpend = () => {}
}) {
  const runs = new Map(), // modèle → { at, run } (heure du run, relue toutes les 10 min)
    pending = new Map(); // fichier → lecture en cours qui l'écrira
  let lock = Promise.resolve();
  /** Une planification à la fois (fichiers relus, manques calculés, demandes lancées et marquées « en cours ») : deux
   *  lectures simultanées des mêmes cases ne demandent pas deux fois ; les demandes, elles, courent ensemble. */
  const exclusive = fn => {
    const p = lock.then(fn, fn);
    lock = p.catch(() => {});
    return p;
  };
  const path = (model, cell, day) => `${PREFIX}${model}/${cell}/${day}.json`;
  /** Réponse d'un appel sortant ; hors ligne, injoignable ou refusé : erreur marquée. */
  async function call(url, init) {
    const r = await net.fetch(url, init);
    if (r.headers?.get?.('x-sog-offline')) throw fail('offline', {
      offline: true
    });
    if (r.headers?.get?.('x-sog-unreachable')) throw fail('unreachable', {
      unreachable: true
    });
    if (!r.ok) {
      let reason = '';
      try {
        reason = (await r.clone().json()).reason || '';
      } catch {
        /* corps illisible */
      }
      throw fail(reason || `HTTP ${r.status}`, {
        status: r.status
      });
    }
    return r;
  }

  // ---------------------------------------------------------------- décompte
  const LEDGER = `${PREFIX}ledger.json`;
  const ledger = async () => ((await data.get(LEDGER).catch(() => null))?.entries || []).filter(([t]) => now() - t < 864e5);
  /** Appels pondérés dépensés sur cet appareil depuis ms (24 h par défaut). */
  async function spent(ms = 864e5) {
    return Math.round((await ledger()).filter(([t]) => now() - t < ms).reduce((s, [, w]) => s + w, 0) * 10) / 10;
  }
  /** Appels pondérés du jour UTC. */
  async function spentToday() {
    const start = Date.parse(dayOf(now()));
    return Math.round((await ledger()).filter(([t]) => t >= start).reduce((s, [, w]) => s + w, 0) * 10) / 10;
  }
  /** Réserve w appels : attend sous la limite par minute (onWait(secondes) à chaque attente), refuse au-delà de la limite
   *  du jour (24 h glissantes), marges comprises. */
  async function spend(w, {
    stale = () => false,
    onWait = () => {}
  } = {}) {
    if ((await spent()) + w > DAY_CAP) throw fail('day quota', {
      quota: true,
      spent: await spent()
    });
    for (;;) {
      const minute = (await ledger()).filter(([t]) => now() - t < 6e4),
        used = minute.reduce((s, [, x]) => s + x, 0);
      if (used + w <= MINUTE_CAP || w > MINUTE_CAP || !minute.length) break;
      if (stale()) throw fail('stale', {
        stale: true
      });
      onWait(Math.max(1, Math.ceil((minute[0][0] + 6e4 - now()) / 1e3)));
      await new Promise(r => setTimeout(r, 2000));
    }
    await data.put(LEDGER, {
      entries: [...(await ledger()), [now(), Math.round(w * 10) / 10]]
    });
    try {
      onSpend(await spentToday());
    } catch {
      /* lecteur du compteur en panne : le décompte, lui, est écrit */
    }
  }

  // ---------------------------------------------------------------- jours passés
  let pruned = '';
  /** Efface les prévisions des jours avant aujourd'hui (UTC) et les METAR / TAF de plus d'un jour ; une fois par jour au
   *  plus (repère cache/weather/pruned.json). Rend le nombre effacé. */
  async function prune() {
    const today = dayOf(now());
    if (pruned === today || !data.cached || !data.remove) return 0;
    pruned = today;
    const mark = `${PREFIX}pruned.json`;
    if ((await data.get(mark).catch(() => null))?.day === today) return 0;
    let n = 0;
    for (const d of await data.cached(PREFIX).catch(() => [])) {
      const day = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(d.path)?.[1],
        obs = /^cache\/weather\/(metar|taf)\//.test(d.path);
      if (day && day < today && !d.path.startsWith(`${PREFIX}world/`) || obs && now() - (+d.at || 0) > 864e5) {
        await data.remove(d.path).catch(() => {});
        n++;
      }
    }
    await data.put(mark, {
      day: today,
      removed: n
    });
    return n;
  }

  // ---------------------------------------------------------------- run du modèle
  /** Heure du dernier run d'un modèle (secondes Unix ; métadonnées statiques d'Open-Meteo, hors décompte), gardée 10 min ;
   *  null sans réponse. */
  async function run(model) {
    const k = MODELS[model]?.meta || model,
      m = runs.get(k);
    if (m && now() - m.at < META_TTL) return m.run;
    const file = `${PREFIX}${model}/meta.json`,
      c = await data.get(file).catch(() => null);
    if (c && now() - c.at < META_TTL) {
      runs.set(k, c);
      return c.run;
    }
    try {
      const j = await (await call(`https://api.open-meteo.com/data/${k}/static/meta.json`)).json(),
        v = {
          at: now(),
          run: Number.isFinite(+j?.last_run_initialisation_time) ? +j.last_run_initialisation_time : null
        };
      runs.set(k, v);
      await data.put(file, v);
      return v.run;
    } catch {
      return c?.run ?? null;
    }
  }
  /** Un fichier vaut pour le run où il a été lu (6 h au plus) ; 30 min si l'un des deux runs est inconnu. */
  const fresh = (f, curRun) => !!f && (curRun && f.run ? f.run === curRun && now() - f.at < RUN_TTL : now() - f.at < BLIND_TTL);

  // ---------------------------------------------------------------- prévision (cœur)
  /** Prévision de lieux [{ lat, lon }] pour des variables horaires, depuis la réserve, Open-Meteo pour ce qui manque.
   *  opts : model (requis), days, cacheOnly (rien demandé : null s'il manque quelque chose), stale, onWait. Rend { locs
   *  (un par lieu, à la forme d'Open-Meteo), run, weight, requests, cells }. */
  async function forecast(places, vars, {
    model,
    days = 2,
    cacheOnly = false,
    stale = () => false,
    onWait
  }) {
    prune().catch(() => {});
    const curRun = await run(model),
      size = cellSize(model),
      first = Date.parse(dayOf(now())),
      dayList = Array.from({
        length: days
      }, (_, k) => dayOf(first + k * 864e5)),
      cells = new Map(),
      files = new Map();
    for (const p of places) {
      const c = cellOf(p.lat, p.lon, size);
      cells.set(c.id, c);
    }
    const keyOf = (cell, day) => path(model, cell, day);
    let weight = 0,
      requests = 0;
    const jobs = await exclusive(plan);
    if (!jobs) return null;
    try {
      await Promise.all(jobs);
    } finally {
      for (const [k, j] of [...pending])
        if (jobs.includes(j)) pending.delete(k);
    }

    async function plan() {
      // lectures en cours des mêmes fichiers : attendues d'abord
      for (;;) {
        const busy = [...cells.keys()].flatMap(c => dayList.map(d => pending.get(keyOf(c, d)))).filter(Boolean);
        if (!busy.length) break;
        await Promise.allSettled(busy);
      }
      await Promise.all([...cells.keys()].flatMap(c => dayList.map(async d => {
        const f = await data.get(keyOf(c, d)).catch(() => null);
        files.set(keyOf(c, d), fresh(f, curRun) ? f : null);
      })));
      // ce qui manque : par case, les jours et les variables absents ; groupé par (premier jour, dernier jour, variables)
      const groups = new Map();
      for (const c of cells.values()) {
        const need = dayList.map(d => {
          const f = files.get(keyOf(c.id, d)),
            have = new Set([...Object.keys(f?.vars || {}), ...(f?.refused || [])]);
          return [d, vars.filter(v => !have.has(v))];
        }).filter(([, m]) => m.length);
        if (!need.length) continue;
        const missing = [...new Set(need.flatMap(([, m]) => m))].sort(),
          ds = need.map(([d]) => d),
          g = `${ds[0]}|${ds.at(-1)}|${missing.join(',')}`;
        if (!groups.has(g)) groups.set(g, {
          from: ds[0],
          to: ds.at(-1),
          vars: missing,
          cells: []
        });
        groups.get(g).cells.push(c);
      }
      if (groups.size && cacheOnly) return null;
      const gs = [...groups.values()],
        started = gs.map(g => fetchGroup(g));
      started.forEach((j, k) => {
        j.catch(() => {});
        for (const c of gs[k].cells)
          for (const d of dayList) pending.set(keyOf(c.id, d), j);
      });
      return started;
    }

    async function fetchGroup(g) {
      const ask = async list => {
        const w = callWeight(g.cells.length, list.length);
        await spend(w, {
          stale,
          onWait
        });
        weight += w;
        requests++;
        const f = v => (+v).toFixed(3);
        return [].concat(await (await call('https://api.open-meteo.com/v1/forecast' +
          `?latitude=${g.cells.map(c => f(c.lat)).join(',')}&longitude=${g.cells.map(c => f(c.lon)).join(',')}` +
          `&hourly=${list.join(',')}&wind_speed_unit=kn&timeformat=unixtime&start_date=${g.from}&end_date=${g.to}` +
          `&models=${encodeURIComponent(model)}`, {
            headers: {
              accept: 'application/json'
            }
          })).json());
      };
      let list = g.vars,
        refused = [],
        out;
      try {
        out = await ask(list);
      } catch (e) {
        if (e.status !== 400 || !list.some(optional)) throw e;
        refused = list.filter(optional);
        list = list.filter(v => !optional(v));
        out = list.length ? await ask(list) : g.cells.map(() => ({
          hourly: {
            time: []
          }
        }));
      }
      if (out.length !== g.cells.length) throw fail('incomplete', {
        incomplete: true
      });
      // une réponse par case, découpée par jour UTC, fusionnée avec ce qui était gardé pour le même run
      await Promise.all(g.cells.map(async (c, i) => {
        const loc = out[i],
          time = loc?.hourly?.time || [];
        for (const d of dayList) {
          const k = keyOf(c.id, d),
            idx = time.map((t, n) => dayOf(t * 1000) === d ? n : -1).filter(n => n >= 0),
            old = files.get(k);
          if (!idx.length && (!refused.length || !old)) continue;
          const vs = {
            ...(old?.vars || {})
          };
          for (const v of list)
            if (loc.hourly?.[v]) vs[v] = idx.map(n => loc.hourly[v][n] ?? null);
          const f = {
            schema: 1,
            model,
            cell: c.id,
            size,
            lat: c.lat,
            lon: c.lon,
            elevation: Number.isFinite(+loc?.elevation) ? +loc.elevation : old?.elevation ?? null,
            day: d,
            times: idx.length ? idx.map(n => time[n]) : old?.times || [],
            vars: vs,
            refused: [...new Set([...(old?.refused || []), ...refused])],
            run: old ? old.run : curRun,
            at: old ? old.at : now()
          };
          files.set(k, f);
          await data.put(k, f);
        }
      }));
    }

    const locs = places.map(p => {
      const c = cellOf(p.lat, p.lon, size),
        fs = dayList.map(d => files.get(keyOf(c.id, d))).filter(Boolean),
        hourly = {
          time: fs.flatMap(f => f.times)
        };
      for (const v of vars)
        if (fs.some(f => f.vars[v])) hourly[v] = fs.flatMap(f => f.vars[v] || f.times.map(() => null));
      return {
        latitude: c.lat,
        longitude: c.lon,
        elevation: fs.find(f => f.elevation != null)?.elevation ?? null,
        hourly
      };
    });
    return {
      locs,
      run: curRun,
      weight: Math.round(weight * 10) / 10,
      requests,
      cells: cells.size
    };
  }

  const placeOk = p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon);
  // ---------------------------------------------------------------- lecteurs
  /** Vents et températures en altitude aux lieux d'une route (samples, 24 au plus) à l'instant when : le modèle selon le
   *  lieu du milieu (ou opts.model) ; { model { id, name, short }, run, time, profiles (un par lieu, dans l'ordre), weight,
   *  requests, cells } ; null (cacheOnly) s'il manque quelque chose. */
  async function aloft(samples, when, {
    model,
    cacheOnly = false,
    stale,
    onWait
  } = {}) {
    const pts = (samples || []).filter(placeOk).slice(0, MAX_SAMPLES);
    if (!pts.length) return null;
    const mid = pts[Math.floor(pts.length / 2)],
      m = model ? infoOf(model) : modelFor(+mid.lat, +mid.lon),
      t = secOf(when, now()),
      r = await forecast(pts, aloftVars(), {
        model: m.id,
        days: daysFor(t, now()),
        cacheOnly,
        stale,
        onWait
      });
    if (!r) return null;
    const profiles = profilesAt(r.locs, t);
    return {
      model: m,
      run: r.run,
      time: profiles[0]?.time ?? t,
      profiles,
      weight: r.weight,
      requests: r.requests,
      cells: r.cells
    };
  }
  /** Prévision d'une grille de lieux (Atmosphère) pour des variables horaires, jusqu'à when (jours compris) ; modèle selon
   *  le centre (ou opts.model) ; plus de 400 lieux : refusé (tooMany). { locs, model, run, weight, requests, cells } ; null
   *  (cacheOnly) s'il manque quelque chose. */
  async function grid(places, when, vars, {
    model,
    days,
    cacheOnly = false,
    stale,
    onWait
  } = {}) {
    const pts = (places || []).filter(placeOk);
    if (!pts.length || !vars?.length) return null;
    if (pts.length > MAX_PLACES) throw fail('too many places', {
      tooMany: true,
      max: MAX_PLACES
    });
    const lat = pts.reduce((s, p) => s + +p.lat, 0) / pts.length,
      lon = pts[Math.floor(pts.length / 2)].lon,
      m = model ? infoOf(model) : modelFor(lat, +lon),
      r = await forecast(pts, [...new Set(vars)], {
        model: m.id,
        days: days || daysFor(secOf(when, now()), now()),
        cacheOnly,
        stale,
        onWait
      });
    return r && {
      ...r,
      model: m
    };
  }

  // ---------------------------------------------------------------- METAR et TAF
  /** Observations (kind metar | taf) de terrains, gardées 30 min : { items { OACI: forme JSON d'aviationweather }, source
   *  (launcher | direct | cache), noTaf (TAF sans lanceur ni clé météo), offline } ; cacheOnly : seulement la réserve. */
  async function obs(kind, ids, {
    cacheOnly = false
  } = {}) {
    const list = [...new Set([].concat(ids || []).map(x => String(x || '').trim().toUpperCase()).filter(x => /^[A-Z0-9]{3,4}$/.test(x)))],
      items = {},
      file = id => `${PREFIX}${kind}/${id}.json`;
    let missing = [];
    for (const id of list) {
      const f = await data.get(file(id)).catch(() => null);
      if (f?.data) items[id] = f.data;
      if (!f || now() - f.at > OBS_TTL) missing.push(id);
    }
    const out = {
      items,
      source: 'cache',
      noTaf: false,
      offline: false
    };
    if (!missing.length || cacheOnly) return out;
    const keep = async (x, source) => {
      if (!x?.icaoId) return;
      items[x.icaoId] = x;
      await data.put(file(x.icaoId), {
        at: now(),
        source,
        data: x
      });
    };
    try {
      // 1. aviationweather.gov (forme JSON décodée), relayé par le lanceur quand la page est servie par un
      for (let i = 0; i < missing.length; i += 40) {
        const r = await call(`https://aviationweather.gov/api/data/${kind}?ids=${encodeURIComponent(missing.slice(i, i + 40).join(','))}&format=json`);
        for (const x of r.status === 204 ? [] : await r.json()) await keep(x, 'launcher');
      }
      out.source = 'launcher';
      return out;
    } catch (e) {
      if (e.offline) return {
        ...out,
        offline: true
      };
      if (!e.unreachable) throw e;
    }
    // 2. sans lanceur : METAR bruts de metar.vatsim.net ; TAF d'avwx.rest avec la clé de l'appareil, terrain par terrain
    try {
      if (kind === 'metar') {
        for (let i = 0; i < missing.length; i += 40) {
          const r = await call(`https://metar.vatsim.net/metar.php?id=${encodeURIComponent(missing.slice(i, i + 40).join(','))}`, {
            headers: {
              accept: 'text/plain'
            }
          });
          for (const x of decodeMetars(await r.text(), now())) await keep(x, 'direct');
        }
      } else
        for (const id of missing.slice(0, 12)) {
          try {
            await keep(fromAvwxTaf(await (await call(`https://avwx.rest/api/taf/${encodeURIComponent(id)}`)).json()), 'direct');
          } catch (e) {
            if (e.unreachable) { // pas de clé météo sur l'appareil : inutile d'insister
              out.noTaf = true;
              break;
            }
            if (e.offline) throw e;
          }
        }
      out.source = 'direct';
    } catch (e) {
      if (!e.offline) throw e;
      out.offline = true;
    }
    return out;
  }

  // ---------------------------------------------------------------- synoptique monde
  const WORLD_DIR = `${PREFIX}world/`,
    worldUrl = f => new URL(`weather/world/${f}`, root || 'http://invalid/').href;
  let worldIdx = null,
    worldTried = 0;
  const worldSteps = new Map();
  const validIndex = w => !!(w && w.schema === 1 && w.lats?.length && w.lons?.length && Array.isArray(w.times) && w.times
    .length && w.files?.length === w.times.length);
  /** Index du synoptique : celui de l'appareil s'il a moins de 6 h, sinon celui des pages (gardé à son tour ; pas de nouvel
   *  essai avant 10 min), sinon le plus ancien tant que sa dernière échéance est à venir ; null sans publication. */
  async function worldIndex() {
    const mine = await data.get(`${WORLD_DIR}index.json`).catch(() => null),
      ok = validIndex(mine) ? mine : null;
    if (ok && now() - ok.built * 1000 < WORLD_TTL) return ok;
    let got = null;
    if (root && now() - worldTried > WORLD_RETRY) {
      worldTried = now();
      try {
        got = await (await call(worldUrl('index.json'), {
          cache: 'no-cache'
        })).json();
      } catch {
        got = null;
      }
    }
    if (validIndex(got) && (!ok || got.built > ok.built)) {
      await data.put(`${WORLD_DIR}index.json`, got).catch(() => {});
      worldSteps.clear();
      // échéances d'un index précédent : retirées de l'appareil
      const keep = new Set([...got.files, ...(got.altFiles || [])].map(f => WORLD_DIR + f));
      for (const d of await data.cached?.(WORLD_DIR).catch(() => []) || [])
        if (!d.path.endsWith('/index.json') && !keep.has(d.path)) await data.remove?.(d.path).catch(() => {});
      return got;
    }
    return ok && ok.times.at(-1) * 1000 > now() ? ok : null;
  }
  /** Synoptique monde : sans k, l'index (ou null) ; avec k, l'échéance k de l'index courant (alt : son fichier des niveaux
   *  de pression), de l'appareil d'abord ; null si elle manque. */
  async function world(k = null, {
    alt = false
  } = {}) {
    if (!worldIdx) {
      worldIdx = worldIndex();
      worldIdx.finally(() => setTimeout(() => worldIdx = null, WORLD_RETRY)).catch(() => {});
    }
    const w = await worldIdx;
    if (k == null || !w) return w;
    const f = alt ? w.altFiles?.[k] : w.files[k];
    if (!f) return null;
    const key = `${w.built}:${f}`;
    if (!worldSteps.has(key)) worldSteps.set(key, (async () => {
      const p = WORLD_DIR + f,
        mine = await data.get(p).catch(() => null);
      if (mine?.vars) return mine;
      try {
        const s = await (await call(worldUrl(f))).json();
        if (s?.vars) await data.put(p, s).catch(() => {});
        return s?.vars ? s : null;
      } catch {
        return null;
      }
    })());
    return worldSteps.get(key);
  }

  return {
    aloft,
    grid,
    metar: (ids, opts) => obs('metar', ids, opts),
    taf: (ids, opts) => obs('taf', ids, opts),
    world,
    run,
    spent,
    spentToday,
    prune,
    modelFor,
    cellOf: (lat, lon, model) => cellOf(lat, lon, cellSize(model)),
    QUOTA
  };
}
