// Réserve météo de l'appareil (V3_SPECIFICATION.md § 8, lot frame/weather à venir) : prévisions Open-Meteo par niveaux
// de pression gardées par modèle, case de grille et heure, sous cache/weather/ (politique « cache », jamais
// synchronisée), partagées par tous ceux qui lisent Open-Meteo. Écrite pour passer telle quelle dans frame/weather :
// elle ne connaît que la couche de données (get / put) et les appels sortants (net.fetch) qu'on lui donne.
//   · case : à la résolution du modèle, 0,1° au moins (Météo-France et ICON ramenés à 0,1°, GFS 0,25° ; décision du relais
//     du 24 oct 2026), nommée par son centre (« 47.15_-1.65 ») ; un lieu est lu au centre de sa case : la case est la clé
//     de dédoublonnage entre lecteurs et entre routes ; un modèle plus fin servirait un second préfixe ;
//   · fichier : cache/weather/<modèle>/<case>/<AAAA-MM-JJ>.json — les heures d'un jour UTC, variable par variable :
//     { schema, model, cell, size, lat, lon, elevation, day, times[24], vars { nom: [24] }, refused [], run, at } ;
//   · valable pour le run du modèle où il a été lu (6 h au plus), 30 min si le run est inconnu ; un fichier d'un autre run
//     est remplacé entier (jamais deux runs dans un même fichier) ;
//   · une lecture ne demande que les cases, jours et variables qui manquent (start_date / end_date), groupés en le moins
//     de demandes possible, et fusionne ; deux lectures des mêmes cases s'attendent ;
//   · décompte des appels (poids d'Open-Meteo : lieux × variables / 10) dans cache/weather/ledger.json, 24 h glissantes :
//     attente plutôt que dépasser 600 / min, arrêt avant 10 000 / jour ;
//   · les jours passés sont effacés de l'appareil (au plus une fois par jour, data.cached puis data.remove : une copie
//     « cache » n'est effacée qu'ici), pour que la réserve ne grossisse pas sans fin.
// API : weatherStore({ data, net }) → { cellOf, run(model), forecast(places, vars, opts), spent(ms), prune(), QUOTA }.

export const PREFIX = 'cache/weather/';
/** Taille de la case (degrés) par modèle ; 0,1° pour un modèle inconnu. */
export const CELL_OF = {
  meteofrance_seamless: 0.1,
  icon_seamless: 0.1,
  gfs_seamless: 0.25
};
export const cellSize = model => Math.max(0.1, CELL_OF[model] || 0.1);
export const QUOTA = {
  min: 600,
  day: 10000
};
const RUN_TTL = 6 * 36e5,
  BLIND_TTL = 30 * 60e3,
  META_TTL = 10 * 60e3;

/** Modèle dont on lit l'heure du run : un modèle « seamless » n'a pas de métadonnées, on lit celles du modèle qui porte
 *  ses niveaux de pression — les mêmes que la couche météo du cadre (frame/lib/weather_store.js), qui lit et écrit les mêmes
 *  fichiers cache/weather/ : deux heures de run différentes faisaient juger périmés les fichiers de l'autre (la Carte, qui
 *  relit par le cadre, ne trouvait rien ; chaque réserve réécrivait les fichiers avec ses seules variables ; 29 octobre). */
const RUN_OF = {
  meteofrance_seamless: 'meteofrance_arpege_europe',
  icon_seamless: 'dwd_icon',
  gfs_seamless: 'ncep_gfs025'
};

/** Poids d'une demande dans le décompte d'Open-Meteo (un appel par lieu et par tranche de 10 variables, au prorata). */
export const callWeight = (nPlaces, nVars) => nPlaces * Math.max(1, nVars / 10);

/** Case d'un lieu pour une taille (degrés) : { id, lat, lon } (centre de la case ; id à trois décimales au plus). */
export function cellOf(lat, lon, size = 0.1) {
  const c = v => +(Math.floor(+(v / size).toFixed(9)) * size + size / 2).toFixed(3),
    la = c(+lat),
    lo = c(((+lon + 540) % 360) - 180);
  return {
    id: `${la}_${lo}`,
    lat: la,
    lon: lo
  };
}
/** Jour UTC (AAAA-MM-JJ) d'un instant en ms. */
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
/** Jours UTC de la prévision : aujourd'hui et les suivants (days au total). */
export const forecastDays = (now, days = 2) => Array.from({
  length: days
}, (_, k) => dayOf(Date.parse(dayOf(now)) + k * 864e5));

/** Variables qu'un modèle peut refuser (nébulosité par niveau, surface hors de l'essentiel) : sur un refus (400), la
 *  demande est refaite sans elles, et elles sont notées absentes pour ce jour et cette case. */
const CORE_SURFACE = new Set(['temperature_2m', 'dew_point_2m', 'pressure_msl', 'surface_pressure', 'cloud_cover_low',
  'cloud_cover_mid', 'cloud_cover_high'
]);
const optional = v => /^cloud_cover_\d+hPa$/.test(v) || !/hPa$/.test(v) && !CORE_SURFACE.has(v);

/** Erreur marquée (offline, status, quota, stale) : l'appelant dit pourquoi dans ses propres mots. */
const fail = (message, mark) => Object.assign(new Error(message), mark);

export function weatherStore({
  data,
  net,
  now = () => Date.now()
}) {
  const runs = new Map(),
    pending = new Map();
  // planification d'une lecture (fichiers relus, manques calculés, demandes lancées et marquées « en cours ») : une à la
  // fois, pour que deux lectures simultanées des mêmes cases ne demandent pas deux fois ; les demandes, elles, courent
  let lock = Promise.resolve();
  const exclusive = fn => {
    const p = lock.then(fn, fn);
    lock = p.catch(() => {});
    return p;
  };
  const path = (model, cell, day) => `${PREFIX}${model}/${cell}/${day}.json`;

  /** JSON d'un appel sortant (net.fetch ne lève jamais : 503 marqué hors ligne ou injoignable). */
  async function json(url, init) {
    const r = await net.fetch(url, init);
    if (r.headers?.get?.('x-sog-offline') || r.headers?.get?.('x-sog-unreachable')) throw fail('offline', {
      offline: true
    });
    if (!r.ok) {
      let reason = '';
      try {
        reason = (await r.json()).reason || '';
      } catch {}
      throw fail(reason || `HTTP ${r.status}`, {
        status: r.status
      });
    }
    return r.json();
  }

  // ---------------------------------------------------------------- décompte
  const LEDGER = `${PREFIX}ledger.json`;
  async function ledger() {
    const l = (await data.get(LEDGER))?.entries || [];
    return l.filter(([t]) => now() - t < 864e5);
  }
  /** Appels du décompte dépensés sur cet appareil depuis ms (24 h par défaut). */
  async function spent(ms = 864e5) {
    return (await ledger()).filter(([t]) => now() - t < ms).reduce((s, [, w]) => s + w, 0);
  }
  /** Réserve w appels : attend sous 600 / min (onWait(secondes) à chaque attente), refuse au-delà de 10 000 / jour. */
  async function spend(w, {
    stale = () => false,
    onWait = () => {}
  }) {
    if ((await spent()) + w > QUOTA.day) throw fail('day quota', {
      quota: true,
      spent: Math.round(await spent())
    });
    for (;;) {
      const l = (await ledger()).filter(([t]) => now() - t < 6e4),
        used = l.reduce((s, [, x]) => s + x, 0);
      if (used + w <= QUOTA.min || w > QUOTA.min || !l.length) break;
      if (stale()) throw fail('stale', {
        stale: true
      });
      onWait(Math.ceil((l[0][0] + 6e4 - now()) / 1e3));
      await new Promise(r => setTimeout(r, 2000));
    }
    await data.put(LEDGER, {
      entries: [...(await ledger()), [now(), Math.round(w * 10) / 10]]
    });
  }

  // ---------------------------------------------------------------- jours passés
  let pruned = '';
  /** Efface les fichiers des jours avant aujourd'hui (UTC) ; une fois par jour au plus. Rend le nombre effacé. */
  async function prune() {
    const today = dayOf(now());
    if (pruned === today || !data.cached || !data.remove) return 0;
    pruned = today;
    const mark = `${PREFIX}pruned.json`;
    if ((await data.get(mark))?.day === today) return 0;
    let n = 0;
    for (const d of await data.cached(PREFIX)) {
      const m = /\/(\d{4}-\d{2}-\d{2})\.json$/.exec(d.path);
      if (m && m[1] < today) {
        await data.remove(d.path);
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
  /** Heure du dernier run d'un modèle (secondes Unix ; métadonnées d'Open-Meteo, fichier statique hors de l'API de
   *  prévision), gardée 10 min ; null sans réponse. */
  async function run(model) {
    const k = RUN_OF[model] || model,
      m = runs.get(k);
    if (m && now() - m.at < META_TTL) return m.run;
    const file = `${PREFIX}${model}/meta.json`,
      c = await data.get(file);
    if (c && now() - c.at < META_TTL) {
      runs.set(k, c);
      return c.run;
    }
    try {
      const j = await json(`https://api.open-meteo.com/data/${k}/static/meta.json`, {
        signal: AbortSignal.timeout(8000)
      });
      const v = {
        at: now(),
        run: j?.last_run_initialisation_time || null
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

  // ---------------------------------------------------------------- lecture
  /** Prévision de lieux [{ lat, lon }] pour des variables horaires : depuis la réserve, Open-Meteo pour ce qui manque.
   *  opts : model (requis), days (2), cacheOnly (rien demandé : null s'il manque quelque chose), stale () → vrai si la
   *  lecture est dépassée, onWait (attente du quota minute), noQuota (clé client : pas de décompte). Résultat :
   *  { locs (un par lieu, à la forme d'Open-Meteo : latitude, longitude, elevation, hourly { time, … }), weight
   *  (appels dépensés), requests, cells }. */
  async function forecast(places, vars, {
    model,
    days = 2,
    from = null, // premier jour (ms) quand il est passé : le jour du départ d'un vol daté d'avant aujourd'hui
    cacheOnly = false,
    stale = () => false,
    onWait,
    noQuota = false
  } = {}) {
    prune().catch(() => {});
    const curRun = await run(model),
      dayList = forecastDays(Number.isFinite(from) ? Math.min(now(), from) : now(), days),
      cells = new Map(),
      size = cellSize(model);
    for (const p of places) {
      const c = cellOf(p.lat, p.lon, size);
      cells.set(c.id, c);
    }
    const keyOf = (cell, day) => path(model, cell, day),
      files = new Map();
    let weight = 0,
      requests = 0;
    const jobs = await exclusive(() => plan());
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
        const f = await data.get(keyOf(c, d));
        files.set(keyOf(c, d), fresh(f, curRun) ? f : null);
      })));
      // ce qui manque : par case, les jours et les variables absents ; groupé par (jours, variables)
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
      // les fichiers que ces demandes écriront : marqués « en cours » pour une lecture voisine
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
        if (!noQuota) await spend(w, {
          stale,
          onWait
        });
        weight += w;
        requests++;
        const f = v => (+v).toFixed(2);
        return [].concat(await json('https://api.open-meteo.com/v1/forecast' +
          `?latitude=${g.cells.map(c => f(c.lat)).join(',')}&longitude=${g.cells.map(c => f(c.lon)).join(',')}` +
          `&hourly=${list.join(',')}&wind_speed_unit=kn&timeformat=unixtime&start_date=${g.from}&end_date=${g.to}` +
          `&models=${encodeURIComponent(model)}`));
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
      // une réponse par case, découpée par jour UTC, fusionnée avec ce qui était déjà gardé pour le même run
      await Promise.all(g.cells.map(async (c, i) => {
        const loc = out[i],
          time = loc.hourly?.time || [];
        for (const d of dayList) {
          const k = keyOf(c.id, d),
            idx = time.map((t, n) => dayOf(t * 1000) === d ? n : -1).filter(n => n >= 0);
          const old = files.get(k);
          if (!idx.length && (!refused.length || !old)) continue;
          const
            vs = {
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
            elevation: Number.isFinite(+loc.elevation) ? +loc.elevation : old?.elevation ?? null,
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

    // lieux à la forme d'Open-Meteo : les jours bout à bout, les variables demandées
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
      weight,
      requests,
      cells: cells.size
    };
  }

  return {
    cellOf: (lat, lon, model) => cellOf(lat, lon, cellSize(model)),
    run,
    forecast,
    spent,
    prune,
    QUOTA
  };
}
